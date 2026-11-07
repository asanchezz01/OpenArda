// Fichas (painéis de informação) de lugares, reinos, acontecimentos, fontes,
// marcos e da consulta "o que havia aqui?".

import type { App } from '../app';
import type { Evento, Lugar, Reino, StatusLugar } from '../core/types';
import {
  tempo,
  lugares,
  reinos,
  fontes,
  terreno,
  statusLugar,
  textoPeriodo,
  territoriosAtivos,
  lugarContem,
  lugarPorId,
  reinoPorId,
  faseAtual,
  fontePorId,
  nomeEra,
  ativo,
} from '../core/data';
import { pontoNoPoligonoPts } from '../terrain/model';
import { esc, listaFontes, seloCert, NOME_CERT } from './util';

const NOME_STATUS: Record<string, string> = {
  ativo: 'Existe nesta época',
  ruina: 'Em ruínas nesta época',
  destruido: 'Destruído',
  submerso: 'Submerso',
  abandonado: 'Abandonado',
  oculto: 'Oculto (em construção)',
  removido: 'Retirado do mundo',
  futuro: 'Ainda não existe nesta época',
  ausente: 'Já não existe nesta época',
};

const NOME_TIPO: Record<string, string> = {
  cidade: 'Cidade',
  fortaleza: 'Fortaleza',
  porto: 'Porto',
  regiao: 'Região',
  ilha: 'Ilha',
  montanha: 'Montanha',
  rio: 'Rio',
  floresta: 'Floresta',
  colina: 'Colina',
  passo: 'Passo',
  lago: 'Lago',
  mar: 'Mar',
  lugar: 'Lugar',
};

export const NOME_TERR = { dominio: 'Domínio político', ocupacao: 'Ocupação (povoamento)', influencia: 'Influência' } as const;
export const NOME_BORDA = { documentada: 'fronteira documentada', aproximada: 'fronteira aproximada', difusa: 'borda difusa (limites em aberto)' } as const;

function ref(r: string) {
  return esc(r);
}

/** Momento (cursor) dentro do último período em que o lugar existia. */
export function ultimoMomento(l: Lugar): number | null {
  const fim = (() => {
    if (l.fases?.length) {
      for (let i = l.fases.length - 1; i >= 0; i--) {
        const f = l.fases[i];
        if (['submerso', 'removido', 'destruido', 'abandonado', 'ruina'].includes(f.status) && i > 0) {
          const ant = l.fases[i - 1];
          if (['ativo', 'oculto'].includes(ant.status)) return tempo.fronteira(f.de, Infinity);
        }
      }
    }
    return tempo.fronteira(l.ate, Infinity);
  })();
  if (!isFinite(fim)) return null;
  const era = tempo.eraDe(fim + 1e-9);
  return era.datada ? tempo.passoAno(fim + 1e-9, -1) : tempo.passoEvento(fim + 1e-9, -1);
}

/** Cursor no ano (ou acontecimento) que começa na fronteira tf. */
export function momentoEm(tf: number): number {
  return tempo.eraDe(tf + 1e-9).datada ? tempo.passoAno(tf + 1e-9, 0) : tempo.passoEvento(tf - 1e-9, 1);
}

export function primeiroMomento(l: Lugar): number | null {
  const ini = tempo.fronteira(l.de, -Infinity);
  if (!isFinite(ini)) return null;
  return momentoEm(ini);
}

function momentoRotulo(t: number): string {
  const r = tempo.rotulo(t);
  return r.incerto ? `${r.principal} (${r.secundario.replace(/^Sequência \d+\/\d+: /, '')})` : r.principal;
}

function vistaAttrs(l: { em: [number, number]; vista?: Partial<{ d: number; rumo: number; inclinacao: number }> }, padraoD = 160) {
  const v = l.vista ?? {};
  return `data-x="${l.em[0]}" data-y="${l.em[1]}" data-d="${v.d ?? padraoD}" data-rumo="${v.rumo ?? ''}" data-inclinacao="${v.inclinacao ?? ''}"`;
}

function statusChip(st: StatusLugar | 'futuro' | 'ausente', nota?: string) {
  return `<span class="chip st-${st}">${esc(NOME_STATUS[st] ?? st)}</span>${nota ? ` <span class="nota">${esc(nota)}</span>` : ''}`;
}

export function fichaLugar(app: App, l: Lugar): string {
  const t = app.t;
  const [st, nota] = statusLugar(l, t);
  const vest = ['submerso', 'removido', 'ausente', 'destruido', 'ruina', 'abandonado'].includes(st);
  const ult = ultimoMomento(l);
  const pri = primeiroMomento(l);
  const evs = (l.eventos ?? []).map((id) => tempo.evento(id)).filter(Boolean) as Evento[];
  evs.sort((a, b) => tempo.tEvento(a) - tempo.tEvento(b));
  const reino = l.reino ? reinoPorId.get(l.reino) : undefined;
  let html = `<header class="ficha-cab">
    <p class="tipo">${esc(NOME_TIPO[l.tipo] ?? l.tipo)}${reino ? ` · <button type="button" class="link" data-acao="sel" data-sel="reino:${reino.id}">${esc(reino.nome)}</button>` : ''}</p>
    <h2>${esc(l.nome)}</h2>
    ${l.outros_nomes?.length ? `<p class="outros">${l.outros_nomes.map(esc).join(' · ')}</p>` : ''}
    <p>${statusChip(st, nota)} ${seloCert(l.cert, true)}</p>
  </header>
  <p class="resumo">${esc(l.resumo)}</p>`;

  if (l.id === 'ezellohar') {
    const f = app.faseArvores();
    html += `<section class="bloco arvores">
      <h3>A luz das Duas Árvores</h3>
      <p>Hora do ciclo: <strong>${app.hora.toFixed(1)}</strong> de 12 — <strong>${esc(f.fase)}</strong>.</p>
      <div class="barras"><span style="--v:${f.telperion}" class="b-telperion">Telperion</span><span style="--v:${f.laurelin}" class="b-laurelin">Laurelin</span></div>
      <div class="acoes">
        <button type="button" data-acao="tempo" data-ref="#aa-silmarils">Ver o florescimento</button>
        <button type="button" data-acao="tempo" data-ref="#aa-escurecimento">Ver o escurecimento</button>
        <button type="button" data-acao="hora" data-h="3.5">Telperion</button>
        <button type="button" data-acao="hora" data-h="6.5">Mistura</button>
        <button type="button" data-acao="hora" data-h="9.5">Laurelin</button>
      </div>
      <p class="nota">O enquadramento é mantido: só a luz muda. A visibilidade da luz em cada ponto é calculada pelo relevo — a luz atravessa a Calacirya e é barrada pelas Pelóri.</p>
    </section>`;
  }

  if (vest || st === 'futuro') {
    html += `<section class="bloco destaque">
      <h3>${st === 'futuro' ? 'Quando este lugar existe?' : 'O que aconteceu com este lugar?'}</h3>
      ${st !== 'futuro' && l.depois ? `<p>${esc(l.depois)}</p>` : ''}
      ${
        st !== 'futuro'
          ? [...new Set([...(faseAtual(l, t)?.evento ? [tempo.evento(faseAtual(l, t)!.evento!)!] : []), ...evs.filter((e) => tempo.tEvento(e) <= t + 1e-9).reverse()])]
              .slice(0, 2)
              .map((e) => `<p><button type="button" class="link" data-acao="evento" data-id="${e.id}">${esc(e.titulo)}</button> <span class="data">${esc(tempo.dataEvento(e))}</span></p>`)
              .join('')
          : `<p>Período: ${esc(textoPeriodo(l.de, l.ate))}.</p>`
      }
      <div class="acoes">
        ${ult != null ? `<button type="button" class="primario" data-acao="visitar" data-id="${l.id}" data-t="${ult}">Visitar ${esc(l.nome)} (${esc(momentoRotulo(ult))})</button>` : ''}
        ${pri != null && st === 'futuro' ? `<button type="button" data-acao="visitar" data-id="${l.id}" data-t="${pri}">Ver o início (${esc(momentoRotulo(pri))})</button>` : ''}
        ${vest && ult != null ? `<button type="button" data-acao="antes" data-t="${ult}">Voltar à mesma vista antes${evs.length ? ' de: ' + esc(evs.filter((e) => tempo.tEvento(e) <= t + 1e-9).slice(-1)[0]?.titulo ?? '') : ''}</button>` : ''}
      </div>
    </section>`;
  }

  if (l.fases?.length) {
    html += `<section class="bloco"><h3>História do lugar</h3><ol class="fases">${l.fases
      .map((f) => {
        const ev = f.evento ? tempo.evento(f.evento) : undefined;
        const tf = tempo.fronteira(f.de, -Infinity);
        const atual = statusLugar(l, t)[0] === f.status && t >= tf;
        return `<li class="${atual ? 'atual' : ''}"><span class="chip st-${f.status}">${esc(NOME_STATUS[f.status] ?? f.status)}</span> <span class="data">${esc(textoPeriodo(f.de, f.ate).replace(/^desde /, 'a partir de '))}</span>${f.nota ? ` — ${esc(f.nota)}` : ''}${
          ev ? ` <button type="button" class="link" data-acao="evento" data-id="${ev.id}">${esc(ev.titulo)}</button>` : ''
        }${isFinite(tf) ? ` <button type="button" class="mini" data-acao="tempo" data-t="${momentoEm(tf)}" title="Ir a este momento">⟲</button>` : ''}</li>`;
      })
      .join('')}</ol></section>`;
  }

  if (evs.length) {
    html += `<section class="bloco"><h3>Acontecimentos</h3><ul class="eventos">${evs
      .map((e) => `<li><button type="button" class="link" data-acao="evento" data-id="${e.id}">${esc(e.titulo)}</button> <span class="data">${esc(tempo.dataEvento(e))}</span></li>`)
      .join('')}</ul></section>`;
  }

  if (l.aspectos?.length) {
    html += `<section class="bloco"><h3>O que se sabe e o que é reconstrução</h3><table class="aspectos"><tbody>${l.aspectos
      .map((a) => `<tr><th>${esc(a.aspecto)}</th><td>${seloCert(a.cert)}${a.nota ? `<div class="nota">${esc(a.nota)}</div>` : ''}${a.fontes?.length ? `<div class="nota">${a.fontes.map((f) => esc(fontePorId.get(f.fonte)?.titulo ?? f.fonte) + (f.local ? ', ' + esc(f.local) : '')).join('; ')}</div>` : ''}</td></tr>`)
      .join('')}</tbody></table></section>`;
  }

  if (l.notas_versoes?.length) {
    html += `<section class="bloco"><h3>Versões e notas</h3>${l.notas_versoes
      .map((n) => `<details><summary>${esc(n.titulo)}</summary><p>${esc(n.texto)}</p>${listaFontes(n.fontes)}</details>`)
      .join('')}</section>`;
  }

  html += `<section class="bloco"><h3>Fontes</h3>${listaFontes(l.fontes)}</section>
  <div class="acoes rodape">
    <button type="button" data-acao="voar" ${vistaAttrs(l)}>Ir para ${esc(l.nome)}</button>
    <button type="button" data-acao="compartilhar">Copiar link desta vista</button>
  </div>`;
  return html;
}

export function fichaReino(app: App, r: Reino): string {
  const t = app.t;
  const vivo = ativo('rei-' + r.id, r.de, r.ate, t);
  const terrs = r.territorios.map((tr, i) => ({ tr, i, on: ativo(`${r.id}#${i}`, tr.de, tr.ate, t) }));
  const ativos = terrs.filter((x) => x.on);
  const caps = r.capitais
    .map((c) => {
      const l = lugarPorId.get(c.lugar);
      return l
        ? `<button type="button" class="link" data-acao="sel" data-sel="lugar:${l.id}">${esc(l.nome)}</button>${c.de || c.ate ? ` <span class="data">(${esc(textoPeriodo(c.de, c.ate))})</span>` : ''}${c.nota ? ` <span class="nota">${esc(c.nota)}</span>` : ''}`
        : esc(c.lugar);
    })
    .join('<br>');
  const fund = r.evento_fundacao ? tempo.evento(r.evento_fundacao) : undefined;
  let html = `<header class="ficha-cab">
    <p class="tipo"><span class="amostra" style="background:${esc(r.cor)}"></span>${esc(r.tipo)}</p>
    <h2>${esc(r.nome)}</h2>
    ${r.outros_nomes?.length ? `<p class="outros">${r.outros_nomes.map(esc).join(' · ')}</p>` : ''}
    <p><span class="chip ${vivo ? 'st-ativo' : 'st-ausente'}">${vivo ? 'Existe nesta época' : 'Não existe nesta época'}</span></p>
  </header>
  <dl class="dados">
    <dt>Capital</dt><dd>${caps || '<span class="nota">sem capital registrada</span>'}</dd>
    <dt>Povos</dt><dd>${r.povos.map(esc).join('; ')}</dd>
    <dt>Período de existência</dt><dd>${esc(r.periodo_texto)}</dd>
    ${r.governantes?.length ? `<dt>Governantes</dt><dd>${r.governantes.map((g) => `${esc(g.nome)}${g.nota ? ` <span class="nota">(${esc(g.nota)})</span>` : ''}`).join('<br>')}</dd>` : ''}
  </dl>
  <section class="bloco"><h3>Origem</h3><p>${esc(r.origem)}</p>${fund ? `<p><button type="button" class="link" data-acao="evento" data-id="${fund.id}">${esc(fund.titulo)}</button> <span class="data">${esc(tempo.dataEvento(fund))}</span></p>` : ''}</section>
  <section class="bloco"><h3>Principais transformações</h3><ol class="fases">${r.transformacoes
    .map((x) => {
      const ev = x.evento ? tempo.evento(x.evento) : undefined;
      const tx = tempo.cursor(x.quando);
      return `<li class="${Math.abs(tx - t) < 1e-6 ? 'atual' : ''}"><button type="button" class="mini" data-acao="tempo" data-t="${tx}" title="Ir a este momento">⟲</button> <span class="data">${esc(momentoRotulo(tx))}</span> — ${esc(x.texto)}${ev ? ` <button type="button" class="link" data-acao="evento" data-id="${ev.id}">ler</button>` : ''}</li>`;
    })
    .join('')}</ol></section>
  <section class="bloco"><h3>Destino</h3><p>${esc(r.destino)}</p></section>
  <section class="bloco"><h3>Território nesta época</h3>${
    ativos.length
      ? `<ul class="territorios">${ativos
          .map((x) => `<li><span class="leg-terr ${x.tr.tipo} ${x.tr.borda}" style="--cor:${esc(r.cor)}"></span><strong>${esc(NOME_TERR[x.tr.tipo])}</strong>${x.tr.rotulo ? ` (${esc(x.tr.rotulo)})` : ''} — ${esc(NOME_BORDA[x.tr.borda])}${x.tr.nota ? `<div class="nota">${esc(x.tr.nota)}</div>` : ''}</li>`)
          .join('')}</ul>`
      : '<p class="nota">Sem território desenhado neste período.</p>'
  }
  <p class="nota">Domínio político: governo efetivo. Ocupação: povoamento sem fronteiras de Estado. Influência: alianças, tributos ou proteção. Borda difusa: a obra situa o povo, mas deixa os limites em aberto.</p></section>
  <div class="acoes">
    ${fund ? `<button type="button" class="primario" data-acao="fundacao" data-id="${r.id}">Ver a fundação</button>` : ''}
    ${r.ultimo_periodo ? `<button type="button" data-acao="ultimo" data-id="${r.id}">Ir ao último período conhecido</button>` : ''}
    <button type="button" data-acao="comparar-reino" data-id="${r.id}">Comparar fronteiras</button>
  </div>`;
  if (r.ligacoes?.length) {
    html += `<section class="bloco destaque"><h3>Ligações na história</h3><ul class="ligacoes">${r.ligacoes
      .map((lg) => {
        const tq = lg.quando ? tempo.cursor(lg.quando) : null;
        if (lg.evento && !lg.lugar && !lg.reino) return `<li><button type="button" class="link" data-acao="evento" data-id="${lg.evento}">${esc(lg.texto)}</button></li>`;
        if (lg.lugar) return `<li><button type="button" class="link" data-acao="visitar" data-id="${lg.lugar}"${tq != null ? ` data-t="${tq}"` : ''}>${esc(lg.texto)}</button>${tq != null ? ` <span class="data">${esc(momentoRotulo(tq))}</span>` : ''}${lg.evento ? ` · <button type="button" class="link" data-acao="evento" data-id="${lg.evento}">o acontecimento</button>` : ''}</li>`;
        return `<li><button type="button" class="link" data-acao="ir-reino" data-id="${lg.reino}"${tq != null ? ` data-t="${tq}"` : ''}>${esc(lg.texto)}</button></li>`;
      })
      .join('')}</ul></section>`;
  }
  if (r.notas_versoes?.length) {
    html += `<section class="bloco"><h3>Versões e notas</h3>${r.notas_versoes.map((n) => `<details><summary>${esc(n.titulo)}</summary><p>${esc(n.texto)}</p>${listaFontes(n.fontes)}</details>`).join('')}</section>`;
  }
  html += `<section class="bloco"><h3>Fontes</h3>${listaFontes(r.fontes)}${r.territorios.flatMap((x) => x.fontes ?? []).length ? listaFontes(r.territorios.flatMap((x) => x.fontes ?? [])) : ''}</section>
  <div class="acoes rodape"><button type="button" data-acao="voar" data-x="${r.em[0]}" data-y="${r.em[1]}" data-d="900">Ir para ${esc(r.nome)}</button><button type="button" data-acao="compartilhar">Copiar link desta vista</button></div>`;
  return html;
}

export function fichaEvento(app: App, e: Evento): string {
  const t = app.t;
  const te = tempo.tEvento(e);
  const era = tempo.eras[tempo.eraIndex(e.era)];
  const ls = (e.lugares ?? []).map((id) => lugarPorId.get(id)).filter(Boolean) as Lugar[];
  const rs = (e.reinos ?? []).map((id) => reinoPorId.get(id)).filter(Boolean) as Reino[];
  const k = tempo.ordenados.findIndex((o) => o.ev.id === e.id);
  const tAntes = era.datada && e.ano != null ? tempo.passoAno(tempo.tInicioEvento(e) + 1e-9, -1) : k > 0 ? tempo.ordenados[k - 1].t : te;
  return `<header class="ficha-cab">
    <p class="tipo">Acontecimento · ${esc(nomeEra(e.era))}</p>
    <h2>${esc(e.titulo)}</h2>
    <p><span class="chip data-chip">${esc(tempo.dataEvento(e))}</span> ${seloCert(e.cert, true)} ${t >= tempo.tInicioEvento(e) ? '<span class="chip st-ativo">já aconteceu nesta data</span>' : '<span class="chip st-futuro">ainda não aconteceu</span>'}</p>
  </header>
  <p class="resumo">${esc(e.resumo)}</p>
  ${e.nota_data ? `<p class="nota"><strong>Sobre a data:</strong> ${esc(e.nota_data)}</p>` : ''}
  ${e.datas_alternativas ? `<p class="nota"><strong>Datas alternativas:</strong> ${esc(e.datas_alternativas)}</p>` : ''}
  ${!era.datada ? `<p class="nota">${esc(era.nota_datas ?? '')}</p>` : ''}
  <div class="acoes">
    <button type="button" class="primario" data-acao="ir-evento" data-id="${e.id}">Ir a este momento</button>
    <button type="button" data-acao="antes" data-t="${tAntes}" data-ev="${e.id}">Ver logo antes</button>
  </div>
  ${ls.length ? `<section class="bloco"><h3>Lugares</h3><p>${ls.map((l) => `<button type="button" class="link" data-acao="sel" data-sel="lugar:${l.id}">${esc(l.nome)}</button>`).join(' · ')}</p></section>` : ''}
  ${rs.length ? `<section class="bloco"><h3>Reinos</h3><p>${rs.map((r) => `<button type="button" class="link" data-acao="sel" data-sel="reino:${r.id}">${esc(r.nome)}</button>`).join(' · ')}</p></section>` : ''}
  <section class="bloco"><h3>Referência</h3>${listaFontes(e.fontes)}</section>`;
}

export function fichaAqui(app: App, x: number, y: number, raio: number): { html: string; unico?: string } {
  const t = app.t;
  const m = app.modeloDe(app.ladoAtual());
  const a = m ? m.amostrar(x, y, { h: 0, agua: 0, floresta: 0, especie: 0, pantano: 0, arido: 0, cinzas: 0, neve: 0, exuberante: 0, cert: 0.6 }) : null;
  const terra = a ? a.h > 0 || a.agua === -99 : true;
  const certNome = a ? (a.cert > 0.8 ? 'descrito' : a.cert > 0.45 ? 'inferido' : 'artistico') : 'inferido';
  // reinos neste ponto
  const terrs = territoriosAtivos(t).filter((ta) => ta.pts.length > 2 && pontoNoPoligonoPts(x, y, ta.pts));
  // lugares próximos existentes agora
  const perto = lugares
    .filter((l) => !l.regiao && Math.hypot(l.em[0] - x, l.em[1] - y) < raio)
    .map((l) => ({ l, st: statusLugar(l, t)[0], d: Math.hypot(l.em[0] - x, l.em[1] - y) }))
    .sort((p, q) => p.d - q.d);
  const agora = perto.filter((p) => !['futuro', 'ausente', 'submerso', 'removido'].includes(p.st));
  // lugares desaparecidos (áreas que contêm o ponto ou pontos próximos)
  const sumidos = lugares
    .filter((l) => {
      const st = statusLugar(l, t)[0];
      if (!['submerso', 'removido', 'ausente'].includes(st)) return false;
      return lugarContem(l, x, y) || Math.hypot(l.em[0] - x, l.em[1] - y) < raio * 0.7;
    })
    .sort((p, q) => q.posto - p.posto);
  const futuros = perto.filter((p) => p.st === 'futuro').slice(0, 3);
  const ativoAgora = (l: Lugar) => ['ativo', 'oculto', 'ruina', 'destruido', 'abandonado'].includes(statusLugar(l, t)[0]);
  const regioes = lugares.filter((l) => l.regiao && ativoAgora(l) && (lugarContem(l, x, y) || Math.hypot(l.em[0] - x, l.em[1] - y) < raio * 2.2));
  // o lugar desaparecido mais específico: um ponto próximo vence uma ilha, que vence uma região inteira
  const dist = (l: Lugar) => Math.hypot(l.em[0] - x, l.em[1] - y);
  const pontoAtivo = agora.length && agora[0].d < raio * 0.45 ? agora[0] : null;
  const pontoSumido = sumidos.filter((l) => !l.regiao && !lugarContem(l, x, y) && dist(l) < raio * 0.45).sort((p, q) => dist(p) - dist(q))[0];
  const principalSumido =
    (pontoSumido && !(pontoAtivo && pontoAtivo.d <= dist(pontoSumido) + 1) ? pontoSumido : undefined) ??
    sumidos.find((l) => !l.regiao && lugarContem(l, x, y)) ??
    // uma região inteira desaparecida só é o assunto principal se não houver lugar vivo no ponto
    (pontoAtivo ? undefined : sumidos.find((l) => lugarContem(l, x, y))) ??
    null;
  const ilhaOuRegiao = lugares.find((l) => (l.tipo === 'ilha' || l.regiao) && l.posto <= 2 && ['ativo', 'oculto'].includes(statusLugar(l, t)[0]) && lugarContem(l, x, y));
  const principal = principalSumido ?? (agora.length && agora[0].d < raio * 0.5 ? agora[0].l : null) ?? ilhaOuRegiao ?? null;
  let html = `<header class="ficha-cab"><p class="tipo">Consulta no mapa · GA ${Math.round(x)} L, ${Math.round(y)} N km</p>
  <h2>${principal ? esc(principal.nome) : terrs.length ? esc(terrs[0].reino.nome) : terra ? 'Neste ponto' : 'Mar aberto'}</h2>
  <p><span class="chip data-chip">${esc(momentoRotulo(t))}</span> ${seloCert(certNome as 'descrito', true)}</p></header>`;
  if (principalSumido) {
    const l = principalSumido;
    const evs = (l.eventos ?? []).map((id) => tempo.evento(id)!).filter((e) => e && tempo.tEvento(e) <= t + 1e-9);
    const evFase = faseAtual(l, t)?.evento;
    const fim = (evFase ? tempo.evento(evFase) : undefined) ?? evs.slice(-1)[0];
    const ult = ultimoMomento(l);
    html += `<section class="bloco destaque"><h3>O que aconteceu com este lugar?</h3>
      <p><strong>Aqui ficava ${esc(l.nome)}.</strong> ${esc(l.depois ?? '')}</p>
      ${fim ? `<p><button type="button" class="link" data-acao="evento" data-id="${fim.id}">${esc(fim.titulo)}</button> <span class="data">${esc(tempo.dataEvento(fim))}</span></p><div class="ref-box">${listaFontes(fim.fontes.slice(0, 2))}</div>` : ''}
      <div class="acoes">
        ${ult != null ? `<button type="button" class="primario" data-acao="antes" data-t="${ult}"${fim ? ` data-ev="${fim.id}"` : ''}>Voltar à mesma vista antes${fim ? ' — ' + esc(momentoRotulo(ult)) : ''}</button>` : ''}
        <button type="button" data-acao="sel" data-sel="lugar:${l.id}">Ficha de ${esc(l.nome)}</button>
      </div></section>`;
  }
  html += `<section class="bloco"><h3>O que havia aqui nesta época?</h3>`;
  if (!terra && !terrs.length && !agora.length) html += `<p>${a && a.agua > 0 ? 'Águas de um lago' : 'Mar'}${regioes.length ? ' — ' + regioes.map((r) => esc(r.nome)).join(', ') : ''}.</p>`;
  if (terra && regioes.length) html += `<p>Região: ${regioes.map((r) => `<button type="button" class="link" data-acao="sel" data-sel="lugar:${r.id}">${esc(r.nome)}</button>`).join(', ')}</p>`;
  if (terrs.length)
    html += `<ul class="territorios">${terrs
      .map((ta) => `<li><span class="leg-terr ${ta.terr.tipo} ${ta.terr.borda}" style="--cor:${esc(ta.reino.cor)}"></span><button type="button" class="link" data-acao="sel" data-sel="reino:${ta.reino.id}">${esc(ta.reino.nome)}</button> — ${esc(NOME_TERR[ta.terr.tipo])}, ${esc(NOME_BORDA[ta.terr.borda])}</li>`)
      .join('')}</ul>`;
  else if (terra) html += `<p class="nota">Nenhum reino com território desenhado neste ponto nesta época.</p>`;
  if (agora.length)
    html += `<ul class="eventos">${agora
      .slice(0, 6)
      .map((p) => `<li><button type="button" class="link" data-acao="sel" data-sel="lugar:${p.l.id}">${esc(p.l.nome)}</button> <span class="chip st-${p.st}">${esc(NOME_STATUS[p.st])}</span></li>`)
      .join('')}</ul>`;
  html += `</section>`;
  const outrosSumidos = sumidos.filter((l) => l !== principalSumido);
  if (outrosSumidos.length || futuros.length) {
    html += `<section class="bloco"><h3>Em outras épocas, aqui</h3><ul class="eventos">${[...outrosSumidos.map((l) => ({ l, st: statusLugar(l, t)[0] })), ...futuros]
      .map((p) => {
        const tv = p.st === 'futuro' ? primeiroMomento(p.l) : ultimoMomento(p.l);
        return `<li><button type="button" class="link" data-acao="sel" data-sel="lugar:${p.l.id}">${esc(p.l.nome)}</button> <span class="chip st-${p.st}">${esc(NOME_STATUS[p.st])}</span>${tv != null ? ` <button type="button" class="mini-txt" data-acao="visitar" data-id="${p.l.id}" data-t="${tv}">ver em ${esc(momentoRotulo(tv))}</button>` : ''}</li>`;
      })
      .join('')}</ul></section>`;
  }
  html += `<p class="nota">Certeza cartográfica neste ponto: ${esc(NOME_CERT[certNome as 'descrito'])}.</p>`;
  return { html, unico: !principalSumido && principal && principal !== ilhaOuRegiao && agora.length === 1 && !terrs.length ? 'lugar:' + principal.id : undefined };
}

export function fichaFontes(): string {
  const grupos: Record<string, string> = {
    'primaria': 'Obras de Tolkien',
    'primaria-postuma': 'Obras de Tolkien editadas postumamente',
    'mapa': 'Mapas',
    'secundaria': 'Estudos cartográficos',
    'indice': 'Índices especializados',
    'institucional': 'Instituições',
  };
  const ACESSO = { consultado: 'consultado nesta versão', indireto: 'referência de conhecimento prévio; cotejar com a edição', lacuna: 'LACUNA: não consultado' };
  let html = `<header class="ficha-cab"><p class="tipo">Método</p><h2>Fontes e origem das reconstruções</h2></header>
  <section class="bloco"><h3>Três graus de certeza</h3>
  <p>${seloCert('descrito')} o elemento foi descrito ou desenhado por Tolkien (texto ou mapa).</p>
  <p>${seloCert('inferido')} o atlas deduziu o elemento cruzando referências (posições relativas, distâncias, datas de anais póstumos).</p>
  <p>${seloCert('artistico')} reconstrução artística: necessária para desenhar a paisagem, mas sem apoio direto nas fontes.</p>
  <p class="nota">Cada ficha pode separar aspectos: um rio pode ter o curso descrito e a profundidade em reconstrução.</p></section>
  <section class="bloco"><h3>Grade de Arda</h3><p>${esc(terreno.grade.descricao)}</p>
  <p>Marcos usados para alinhar os mapas: ${terreno.marcos.map((m) => `<button type="button" class="link" data-acao="sel" data-sel="marco:${m.id}">${esc(m.nome)}</button>`).join(', ')}.</p></section>
  <section class="bloco"><h3>Versões do legendário</h3><p>Os mapas e textos de Tolkien pertencem a fases diferentes. O atlas adota a versão publicada em <cite>O Silmarillion</cite> como narrativa principal, inclusive a Akallabêth para a Queda de Númenor. Os mapas da Ambarkanta (anos 1930) só servem para as proporções do mundo plano. Versões alternativas aparecem em notas identificadas nas fichas.</p></section>`;
  for (const [tipo, nome] of Object.entries(grupos)) {
    const fs = fontes.filter((f) => f.tipo === tipo);
    if (!fs.length) continue;
    html += `<section class="bloco"><h3>${esc(nome)}</h3><ul class="lista-fontes">${fs
      .map(
        (f) => `<li id="fonte-${f.id}"><strong>${esc(f.titulo)}</strong>${f.titulo_original ? ` <span class="outros">(${esc(f.titulo_original)})</span>` : ''} — ${esc(f.autor)}, ${esc(f.ano)}.
        <span class="selo acesso-${f.acesso}">${esc(ACESSO[f.acesso])}</span>
        ${f.edicao_br ? `<div class="nota">${esc(f.edicao_br)}</div>` : ''}
        ${f.versao_legendario ? `<div class="nota"><strong>Versão:</strong> ${esc(f.versao_legendario)}</div>` : ''}
        <div class="nota">${esc(f.nota)}</div>
        ${f.url ? `<div class="nota"><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.url)}</a></div>` : ''}</li>`,
      )
      .join('')}</ul></section>`;
  }
  html += `<section class="bloco"><h3>Direitos</h3><p class="nota">Os textos do atlas são resumos próprios. Relevo, texturas e cores são gerados por código a partir dos dados vetoriais deste projeto; nenhum mapa ou ilustração foi copiado.</p></section>`;
  return html;
}

export function fichaFonte(id: string): string {
  const f = fontePorId.get(id);
  if (!f) return '<p>Fonte desconhecida.</p>';
  const usos = [
    ...lugares.filter((l) => l.fontes?.some((r) => r.fonte === id)).map((l) => `<button type="button" class="link" data-acao="sel" data-sel="lugar:${l.id}">${esc(l.nome)}</button>`),
    ...reinos.filter((r) => r.fontes.some((x) => x.fonte === id)).map((r) => `<button type="button" class="link" data-acao="sel" data-sel="reino:${r.id}">${esc(r.nome)}</button>`),
  ];
  return `<header class="ficha-cab"><p class="tipo">Fonte</p><h2>${esc(f.titulo)}</h2>${f.titulo_original ? `<p class="outros">${esc(f.titulo_original)}</p>` : ''}</header>
  <dl class="dados"><dt>Autor</dt><dd>${esc(f.autor)}</dd><dt>Ano</dt><dd>${esc(f.ano)}</dd><dt>Acesso nesta versão</dt><dd><span class="selo acesso-${f.acesso}">${esc(f.acesso)}</span></dd>
  ${f.versao_legendario ? `<dt>Versão do legendário</dt><dd>${esc(f.versao_legendario)}</dd>` : ''}
  ${f.edicao_br ? `<dt>Edição brasileira</dt><dd>${esc(f.edicao_br)}</dd>` : ''}</dl>
  <p>${esc(f.nota)}</p>${f.url ? `<p><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.url)}</a></p>` : ''}
  ${usos.length ? `<section class="bloco"><h3>Usada em</h3><p>${usos.slice(0, 40).join(' · ')}</p></section>` : ''}
  <div class="acoes"><button type="button" data-acao="fontes">Todas as fontes e o método</button></div>`;
}

export function fichaMarco(id: string): string {
  const m = terreno.marcos.find((x) => x.id === id);
  if (!m) return '';
  return `<header class="ficha-cab"><p class="tipo">Marco de alinhamento · GA ${m.em[0]}, ${m.em[1]}</p><h2>${esc(m.nome)}</h2></header>
  <p class="resumo">${esc(m.descricao)}</p>
  <section class="bloco"><h3>Como aparece em cada mapa</h3><ul>${m.aparece_em.map((a) => `<li><strong>${esc(fontePorId.get(a.mapa)?.titulo ?? a.mapa)}:</strong> ${esc(a.como)}</li>`).join('')}</ul></section>
  <div class="acoes"><button type="button" data-acao="comparar" data-a="${ref('PE:400')}" data-b="${ref('SE:1')}">Comparar Primeira e Segunda Era</button><button type="button" data-acao="voar" data-x="${m.em[0]}" data-y="${m.em[1]}" data-d="260">Ir para o marco</button></div>
  <section class="bloco"><h3>Fontes</h3>${listaFontes(m.fontes)}</section>`;
}
