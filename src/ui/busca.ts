// Busca de lugares, reinos e acontecimentos — inclusive de lugares que já não
// existem na época atual, com destinos em outras épocas.

import type { App } from '../app';
import { lugares, reinos, eventos, tempo, statusLugar, ativo, textoPeriodo } from '../core/data';
import { esc, norm } from './util';
import { primeiroMomento, ultimoMomento } from './fichas';
import { pessoas, pessoaPorId, NOME_POVO } from '../core/linhagens';

interface Item {
  tipo: 'lugar' | 'reino' | 'evento' | 'pessoa';
  id: string;
  nome: string;
  chaves: string[];
  peso: number;
}

const NOME_TIPO_BUSCA = { lugar: 'Lugar', reino: 'Reino', evento: 'Acontecimento', pessoa: 'Personagem' };

export interface Destino {
  rotulo: string;
  acao: string;
  dados: Record<string, string>;
  primario?: boolean;
}

function rotuloMomento(t: number) {
  const r = tempo.rotulo(t);
  if (!r.incerto) return r.principal;
  return r.principal;
}

export function destinosLugar(app: App, id: string): Destino[] {
  const l = lugares.find((x) => x.id === id)!;
  const t = app.t;
  const [st] = statusLugar(l, t);
  const out: Destino[] = [];
  const ult = ultimoMomento(l);
  const pri = primeiroMomento(l);
  const era = (tt: number) => tempo.eraDe(tt).nome;
  if (st === 'futuro') {
    if (ult != null) out.push({ rotulo: `Visitar ${l.nome} — ${rotuloMomento(ult)}`, acao: 'visitar', dados: { id, t: String(ult) }, primario: true });
    if (pri != null) out.push({ rotulo: `Ver o início — ${rotuloMomento(pri)}`, acao: 'visitar', dados: { id, t: String(pri) }, primario: ult == null });
  } else if (st === 'submerso' || st === 'removido' || st === 'ausente') {
    out.push({ rotulo: `Antiga posição (${st === 'submerso' ? 'hoje sob o mar' : st === 'removido' ? 'retirada do mundo' : 'nesta época'})`, acao: 'posicao', dados: { id }, primario: true });
    if (ult != null) out.push({ rotulo: `Visitar ${l.nome} na ${era(ult)} — ${rotuloMomento(ult)}`, acao: 'visitar', dados: { id, t: String(ult) } });
  } else {
    out.push({ rotulo: `Ir para ${l.nome}`, acao: 'ir-lugar', dados: { id }, primario: true });
    if ((st === 'destruido' || st === 'ruina' || st === 'abandonado') && ult != null)
      out.push({ rotulo: `Visitar no auge — ${rotuloMomento(ult)}`, acao: 'visitar', dados: { id, t: String(ult) } });
  }
  return out;
}

export function destinosReino(app: App, id: string): Destino[] {
  const r = reinos.find((x) => x.id === id)!;
  const t = app.t;
  const vivo = ativo('rei-' + r.id, r.de, r.ate, t);
  const out: Destino[] = [{ rotulo: 'Abrir a ficha', acao: 'ir-reino', dados: { id }, primario: true }];
  if (!vivo && r.ultimo_periodo) out.push({ rotulo: `Ver no último período conhecido — ${rotuloMomento(tempo.cursor(r.ultimo_periodo))}`, acao: 'ultimo', dados: { id } });
  if (!vivo && r.evento_fundacao) out.push({ rotulo: 'Ver a fundação', acao: 'fundacao', dados: { id } });
  return out;
}

export class Busca {
  private itens: Item[] = [];
  private campo: HTMLInputElement;
  private lista: HTMLElement;
  private app: App;
  aoAcao?: (acao: string, dados: Record<string, string>) => void;

  constructor(app: App, campo: HTMLInputElement, lista: HTMLElement) {
    this.app = app;
    this.campo = campo;
    this.lista = lista;
    for (const l of lugares) this.itens.push({ tipo: 'lugar', id: l.id, nome: l.nome, chaves: [l.nome, ...(l.outros_nomes ?? [])].map(norm), peso: 6 - l.posto });
    for (const r of reinos) this.itens.push({ tipo: 'reino', id: r.id, nome: r.nome, chaves: [r.nome, ...(r.outros_nomes ?? [])].map(norm), peso: 4.5 });
    for (const e of eventos) this.itens.push({ tipo: 'evento', id: e.id, nome: e.titulo, chaves: [norm(e.titulo)], peso: e.importante ? 2 : 1 });
    for (const p of pessoas) this.itens.push({ tipo: 'pessoa', id: p.id, nome: p.nome, chaves: [norm(p.nome), norm(p.epiteto ?? '')], peso: 3 });
    campo.addEventListener('input', () => this.render());
    campo.addEventListener('focus', () => this.render());
    campo.addEventListener('keydown', (e) => {
      const botoes = [...this.lista.querySelectorAll<HTMLButtonElement>('button.destino')];
      if (e.key === 'ArrowDown') {
        botoes[0]?.focus();
        e.preventDefault();
      } else if (e.key === 'Enter') {
        (botoes.find((b) => b.classList.contains('primario')) ?? botoes[0])?.click();
        e.preventDefault();
      } else if (e.key === 'Escape') {
        this.fechar();
        e.preventDefault();
      }
    });
    this.lista.addEventListener('keydown', (e) => {
      const botoes = [...this.lista.querySelectorAll<HTMLButtonElement>('button.destino')];
      const i = botoes.indexOf(document.activeElement as HTMLButtonElement);
      if (e.key === 'ArrowDown') botoes[Math.min(botoes.length - 1, i + 1)]?.focus();
      else if (e.key === 'ArrowUp') (i <= 0 ? this.campo : botoes[i - 1]).focus();
      else if (e.key === 'Escape') {
        this.campo.focus();
        this.fechar();
      }
      else return;
      e.preventDefault();
    });
    this.lista.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button.destino');
      if (!b) return;
      e.stopPropagation();
      const dados = { ...b.dataset } as Record<string, string>;
      const acao = dados.acao;
      delete dados.acao;
      this.campo.focus({ preventScroll: true });
      this.fechar();
      this.aoAcao?.(acao, dados);
    });
    document.addEventListener('pointerdown', (e) => {
      if (!(e.target as HTMLElement).closest('#busca')) this.fechar();
    });
    campo.parentElement!.addEventListener('focusout', (e) => {
      if (!campo.parentElement!.contains(e.relatedTarget as Node | null)) this.fechar();
    });
  }

  focar() {
    this.campo.focus();
    this.campo.select();
  }

  fechar() {
    this.lista.hidden = true;
  }

  buscar(q: string): Item[] {
    const n = norm(q);
    if (!n) return [];
    const res: { it: Item; s: number }[] = [];
    for (const it of this.itens) {
      let s = 0;
      for (const k of it.chaves) {
        if (k === n) s = Math.max(s, 100);
        else if (k.startsWith(n)) s = Math.max(s, 60);
        else if (k.split(' ').some((w) => w.startsWith(n))) s = Math.max(s, 40);
        else if (n.length >= 3 && k.includes(n)) s = Math.max(s, 20);
      }
      if (s) res.push({ it, s: s + it.peso });
    }
    res.sort((a, b) => b.s - a.s);
    return res.slice(0, 8).map((r) => r.it);
  }

  private render() {
    const q = this.campo.value;
    const sugerindo = !q.trim();
    const itens = sugerindo ? ['gondolin', 'numenor', 'minas-anor'].map((id) => this.itens.find((it) => it.tipo === 'lugar' && it.id === id)!).filter(Boolean) : this.buscar(q);
    const status = document.getElementById('busca-status');
    if (status) status.textContent = sugerindo ? 'Destinos para começar. Use a seta para baixo para percorrer as ações.' : `${itens.length} resultado${itens.length === 1 ? '' : 's'}. Use a seta para baixo para percorrer as ações.`;
    if (!itens.length) {
      this.lista.innerHTML = `<p class="vazio">Nada encontrado para “${esc(q)}”. Tente outro nome, como Gondolin, Númenor ou Galadriel.</p>`;
      this.lista.hidden = false;
      return;
    }
    const t = this.app.t;
    this.lista.innerHTML = (sugerindo ? '<p class="busca-dica">Por onde começar?</p>' : '') + itens
      .map((it) => {
        let destinos: Destino[] = [];
        let extra = '';
        if (it.tipo === 'lugar') {
          const l = lugares.find((x) => x.id === it.id)!;
          const [st] = statusLugar(l, t);
          destinos = destinosLugar(this.app, it.id);
          const est = { futuro: 'ainda não existe nesta época', submerso: 'submerso nesta época', removido: 'retirado do mundo nesta época', ausente: 'não existe nesta época', destruido: 'destruído nesta época', ruina: 'em ruínas nesta época' }[st as string];
          extra = `${esc(textoPeriodo(l.de, l.ate))}${est ? ` · <em>${esc(est)}</em>` : ''}`;
        } else if (it.tipo === 'reino') {
          const r = reinos.find((x) => x.id === it.id)!;
          destinos = destinosReino(this.app, it.id);
          extra = esc(r.periodo_texto);
        } else if (it.tipo === 'pessoa') {
          const p = pessoaPorId.get(it.id)!;
          destinos = [{ rotulo: `Ver linhagem de ${p.nome}`, acao: 'sel', dados: { sel: 'linhagem:' + p.id }, primario: true }];
          extra = esc([NOME_POVO[p.povo], p.epiteto, p.datas].filter(Boolean).join(' · '));
        } else {
          const e = eventos.find((x) => x.id === it.id)!;
          destinos = [{ rotulo: 'Ir a este momento', acao: 'ir-evento', dados: { id: it.id }, primario: true }];
          extra = esc(tempo.dataEvento(e));
        }
        return `<div class="resultado">
          <div class="r-cab"><span class="r-tipo">${NOME_TIPO_BUSCA[it.tipo]}</span><strong>${esc(it.nome)}</strong></div>
          <div class="r-extra">${extra}</div>
          <div class="r-destinos">${destinos
            .map((d) => `<button type="button" class="destino${d.primario ? ' primario' : ''}" data-acao="${d.acao}" ${Object.entries(d.dados).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')}>${esc(d.rotulo)}</button>`)
            .join('')}</div>
        </div>`;
      })
      .join('');
    this.lista.hidden = false;
  }
}
