// Linha do tempo: eras com larguras próprias, marcas de acontecimentos,
// passos por ano e por acontecimento, reprodução, trava e comparação.

import type { App } from '../app';
import { eras, tempo } from '../core/data';
import { regimeDe } from '../render/lighting';
import { esc, h } from './util';

export class LinhaTempo {
  readonly el: HTMLElement;
  private trilho: HTMLElement;
  private cursor: HTMLElement;
  private dataP: HTMLElement;
  private dataS: HTMLElement;
  private btnPlay: HTMLButtonElement;
  private btnTrava: HTMLButtonElement;
  private btnComparar: HTMLButtonElement;
  private horaBox: HTMLElement;
  private horaInput: HTMLInputElement;
  private horaTxt: HTMLElement;
  private editor: HTMLElement;
  private acumulado: number[] = [];
  private total = 0;
  private app: App;
  private ultimoPlay = 0;
  private pausaAte = 0;
  aoEscolherEra?: (id: string) => void;
  aoComparar?: () => void;

  constructor(app: App, pai: HTMLElement) {
    this.app = app;
    let s = 0;
    for (const e of eras) {
      this.acumulado.push(s);
      s += e.peso;
    }
    this.total = s;
    this.el = h('footer', { id: 'linha-tempo', 'aria-label': 'Linha do tempo' });
    this.el.innerHTML = `
      <div class="lt-topo">
        <button type="button" class="lt-data" aria-label="Escolher data">
          <span class="lt-principal"></span><span class="lt-secundario"></span>
        </button>
        <div class="lt-botoes" role="group" aria-label="Controles de tempo">
          <button type="button" data-k="ev-" title="Acontecimento anterior (,)" aria-label="Acontecimento anterior">⏮</button>
          <button type="button" data-k="ano-" title="Ano anterior ([)" aria-label="Ano anterior">−1</button>
          <button type="button" data-k="play" class="lt-play" title="Reproduzir (espaço)" aria-label="Reproduzir sequência">▶</button>
          <button type="button" data-k="ano+" title="Próximo ano (])" aria-label="Próximo ano">+1</button>
          <button type="button" data-k="ev+" title="Próximo acontecimento (.)" aria-label="Próximo acontecimento">⏭</button>
          <span class="sep"></span>
          <button type="button" data-k="trava" class="lt-trava" title="Fixar enquadramento (L)" aria-pressed="false" aria-label="Fixar enquadramento">🔓<span class="rot">Fixar</span></button>
          <button type="button" data-k="comparar" class="lt-comparar" title="Comparar duas épocas (C)" aria-pressed="false" aria-label="Comparar épocas">⇆<span class="rot">Comparar</span></button>
        </div>
      </div>
      <div class="lt-hora" hidden>
        <label>Hora das Árvores <input type="range" min="0" max="12" step="0.05" aria-label="Hora do ciclo das Duas Árvores"></label>
        <span class="lt-hora-txt"></span>
        <button type="button" data-k="hora-auto" class="mini" title="Ciclo automático">⟳</button>
      </div>
      <div class="lt-trilho" role="slider" tabindex="0" aria-label="Posição no tempo" aria-valuemin="0" aria-valuemax="100">
        <div class="lt-eras"></div>
        <div class="lt-marcas"></div>
        <div class="lt-cursor"><span></span></div>
      </div>
      <div class="lt-chips" role="group" aria-label="Escolher uma era"></div>
      <div class="lt-editor" hidden></div>`;
    pai.appendChild(this.el);
    this.trilho = this.el.querySelector('.lt-trilho')!;
    this.cursor = this.el.querySelector('.lt-cursor')!;
    this.dataP = this.el.querySelector('.lt-principal')!;
    this.dataS = this.el.querySelector('.lt-secundario')!;
    this.btnPlay = this.el.querySelector('.lt-play')!;
    this.btnTrava = this.el.querySelector('.lt-trava')!;
    this.btnComparar = this.el.querySelector('.lt-comparar')!;
    this.horaBox = this.el.querySelector('.lt-hora')!;
    this.horaInput = this.horaBox.querySelector('input')!;
    this.horaTxt = this.horaBox.querySelector('.lt-hora-txt')!;
    this.editor = this.el.querySelector('.lt-editor')!;

    const erasEl = this.el.querySelector('.lt-eras')!;
    const chips = this.el.querySelector('.lt-chips')!;
    eras.forEach((e, i) => {
      const seg = h('div', { class: 'lt-era', style: `left:${(this.acumulado[i] / this.total) * 100}%;width:${(e.peso / this.total) * 100}%;--cor:${e.cor}`, title: e.nome }, `<span>${esc(e.abrev)}</span>`);
      if (!e.datada) seg.classList.add('sem-datas');
      erasEl.appendChild(seg);
      const chip = h('button', { type: 'button', class: 'chip-era', 'data-era': e.id, style: `--cor:${e.cor}` }, esc(e.nome));
      chip.addEventListener('click', () => this.aoEscolherEra?.(e.id));
      chips.appendChild(chip);
    });
    const marcas = this.el.querySelector('.lt-marcas')!;
    for (const o of tempo.ordenados) {
      const era = tempo.eraDe(o.t);
      const m = h('button', {
        type: 'button',
        class: 'lt-marca' + (o.ev.importante ? ' importante' : '') + (era.datada ? '' : ' sequencia') + (o.ev.aprox ? ' aprox' : ''),
        style: `left:${this.fx(o.t) * 100}%`,
        title: `${o.ev.titulo} — ${tempo.dataEvento(o.ev)}`,
        'aria-label': o.ev.titulo,
        tabindex: '-1',
      });
      m.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.app.emitir('abrir-evento:' + o.ev.id);
      });
      marcas.appendChild(m);
    }

    // interação no trilho
    let arrastando = false;
    const mover = (cx: number, final: boolean) => {
      const r = this.trilho.getBoundingClientRect();
      const f = Math.min(1, Math.max(0, (cx - r.left) / r.width));
      const t = this.encaixar(this.tx(f));
      this.app.definirTempo(t, { arrastando: !final });
    };
    this.trilho.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).classList.contains('lt-marca')) return;
      arrastando = true;
      this.trilho.setPointerCapture(e.pointerId);
      mover(e.clientX, false);
    });
    this.trilho.addEventListener('pointermove', (e) => arrastando && mover(e.clientX, false));
    const fim = (e: PointerEvent) => {
      if (!arrastando) return;
      arrastando = false;
      mover(e.clientX, true);
    };
    this.trilho.addEventListener('pointerup', fim);
    this.trilho.addEventListener('pointercancel', fim);
    this.trilho.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') this.app.passoAno(e.shiftKey ? 100 : 1);
      else if (e.key === 'ArrowLeft') this.app.passoAno(e.shiftKey ? -100 : -1);
      else return;
      e.preventDefault();
    });

    this.el.querySelector('.lt-botoes')!.addEventListener('click', (e) => {
      const k = (e.target as HTMLElement).closest('button')?.dataset.k;
      if (!k) return;
      this.acao(k);
    });
    this.horaBox.querySelector('[data-k="hora-auto"]')!.addEventListener('click', () => {
      this.app.horaAuto = !this.app.horaAuto;
    });
    this.horaInput.addEventListener('input', () => {
      this.app.hora = Number(this.horaInput.value);
      this.app.horaAuto = false;
    });
    this.el.querySelector('.lt-data')!.addEventListener('click', () => this.abrirEditor());
    app.ouvir((m) => {
      if (m === 'tempo' || m === 'trava' || m === 'comparar') this.atualizar();
      if (m === 'quadro') this.quadro();
    });
    this.atualizar();
  }

  acao(k: string) {
    const a = this.app;
    if (k === 'ev-') a.passoEvento(-1);
    else if (k === 'ev+') a.passoEvento(1);
    else if (k === 'ano-') a.passoAno(-1);
    else if (k === 'ano+') a.passoAno(1);
    else if (k === 'play') this.alternarPlay();
    else if (k === 'trava') a.travar(!a.travado);
    else if (k === 'comparar') this.aoComparar?.();
  }

  alternarPlay() {
    this.app.tocando = !this.app.tocando;
    this.ultimoPlay = performance.now();
    this.btnPlay.textContent = this.app.tocando ? '❚❚' : '▶';
    this.btnPlay.setAttribute('aria-label', this.app.tocando ? 'Pausar' : 'Reproduzir sequência');
  }

  fx(t: number): number {
    const i = Math.min(eras.length - 1, Math.max(0, Math.floor(t)));
    const frac = Math.min(1, Math.max(0, t - i));
    return (this.acumulado[i] + frac * eras[i].peso) / this.total;
  }

  tx(f: number): number {
    const v = f * this.total;
    for (let i = eras.length - 1; i >= 0; i--) if (v >= this.acumulado[i]) return i + Math.min(0.9999, (v - this.acumulado[i]) / eras[i].peso);
    return 0;
  }

  /** Encaixa no centro do ano (eras datadas) ou do acontecimento (eras sem datas). */
  encaixar(t: number): number {
    const era = tempo.eraDe(t);
    if (era.datada) {
      const i = tempo.eraIndex(era.id);
      const len = era.fim! - era.inicio! + 1;
      const ano = era.inicio! + Math.min(len - 1, Math.floor((t - i) * len));
      return tempo.tAno(era.id, ano);
    }
    let best = t,
      bd = Infinity;
    for (const o of tempo.ordenados) {
      if (tempo.eraDe(o.t).id !== era.id) continue;
      const d = Math.abs(o.t - t);
      if (d < bd) {
        bd = d;
        best = o.t;
      }
    }
    return best;
  }

  atualizar() {
    const a = this.app;
    const t = a.t;
    const r = tempo.rotulo(t);
    this.dataP.textContent = r.principal;
    this.dataS.textContent = r.incerto ? r.secundario : r.secundario + (a.comparando ? ` · lado ${a.ladoAtivo === 'A' ? 'esquerdo' : 'direito'}` : '');
    this.el.classList.toggle('incerto', r.incerto);
    this.cursor.style.left = `${this.fx(t) * 100}%`;
    this.trilho.setAttribute('aria-valuenow', String(Math.round(this.fx(t) * 100)));
    this.trilho.setAttribute('aria-valuetext', `${r.principal} — ${r.secundario}`);
    this.btnTrava.setAttribute('aria-pressed', String(a.travado));
    this.btnTrava.innerHTML = `${a.travado ? '🔒' : '🔓'}<span class="rot">${a.travado ? 'Fixado' : 'Fixar'}</span>`;
    this.btnComparar.setAttribute('aria-pressed', String(a.comparando));
    const era = tempo.eraDe(t);
    this.el.querySelectorAll<HTMLElement>('.chip-era').forEach((c) => c.classList.toggle('ativo', c.dataset.era === era.id));
    this.horaBox.hidden = regimeDe(t) !== 'arvores';
  }

  private quadro() {
    const a = this.app;
    if (!this.horaBox.hidden) {
      this.horaInput.value = String(a.hora);
      const f = a.faseArvores();
      this.horaTxt.textContent = `${f.fase} · ${a.hora.toFixed(1)} h`;
      this.horaBox.style.setProperty('--prata', String(f.telperion));
      this.horaBox.style.setProperty('--ouro', String(f.laurelin));
    }
    if (a.tocando) {
      const agora = performance.now();
      if (agora < this.pausaAte) return;
      const dt = (agora - this.ultimoPlay) / 1000;
      const era = tempo.eraDe(a.t);
      if (era.datada) {
        const len = era.fim! - era.inicio! + 1;
        const anosPorSeg = Math.max(2, len / 45);
        const passos = Math.floor(dt * anosPorSeg);
        if (passos >= 1) {
          const t0 = a.t;
          const t1 = tempo.passoAno(t0, passos);
          const evs = tempo.eventosEntre(t0, t1).filter((e) => e.importante);
          // para no primeiro acontecimento importante
          const alvo = evs.length ? tempo.tEvento(evs[0]) : t1;
          a.definirTempo(alvo);
          this.ultimoPlay = agora;
          if (evs.length) this.pausaAte = agora + 2200;
          if (alvo === t0) this.alternarPlay();
        }
      } else if (dt > 2.4) {
        const t1 = tempo.passoEvento(a.t, 1);
        if (t1 === a.t) this.alternarPlay();
        else a.definirTempo(t1);
        this.ultimoPlay = agora;
      }
    }
  }

  private abrirEditor() {
    const a = this.app;
    const era = tempo.eraDe(a.t);
    const ed = this.editor;
    const opEras = eras.map((e) => `<option value="${e.id}" ${e.id === era.id ? 'selected' : ''}>${esc(e.nome)}</option>`).join('');
    const corpo = (eid: string) => {
      const e = eras.find((x) => x.id === eid)!;
      if (e.datada) {
        const ano = tempo.eraDe(a.t).id === eid ? tempo.anoDe(a.t) : e.inicio;
        return `<label>Ano <input type="number" name="ano" min="${e.inicio}" max="${e.fim}" value="${ano}" inputmode="numeric"></label><span class="nota">${e.inicio}–${e.fim} ${esc(e.abrev)}</span>`;
      }
      const evs = tempo.ordenados.filter((o) => o.ev.era === eid);
      return `<label>Acontecimento <select name="ev">${evs.map((o, k) => `<option value="${o.ev.id}">${k + 1}. ${esc(o.ev.titulo)}</option>`).join('')}</select></label><p class="nota">${esc(e.nota_datas ?? '')}</p>`;
    };
    ed.innerHTML = `<form class="lt-form"><label>Era <select name="era">${opEras}</select></label><div class="lt-corpo">${corpo(era.id)}</div><div class="acoes"><button type="submit" class="primario">Ir</button><button type="button" data-fechar>Fechar</button></div></form>`;
    ed.hidden = false;
    const form = ed.querySelector('form')!;
    const selEra = form.querySelector<HTMLSelectElement>('[name=era]')!;
    selEra.addEventListener('change', () => (form.querySelector('.lt-corpo')!.innerHTML = corpo(selEra.value)));
    form.querySelector('[data-fechar]')!.addEventListener('click', () => (ed.hidden = true));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const eid = selEra.value;
      const er = eras.find((x) => x.id === eid)!;
      if (er.datada) {
        const v = Number((form.querySelector('[name=ano]') as HTMLInputElement).value);
        if (Number.isFinite(v)) a.definirTempo(tempo.tAno(eid, Math.round(v)));
      } else {
        const id = (form.querySelector('[name=ev]') as HTMLSelectElement).value;
        a.definirTempo(tempo.cursor('#' + id));
      }
      ed.hidden = true;
    });
    (form.querySelector('input,select[name=ev]') as HTMLElement | null)?.focus();
  }
}
