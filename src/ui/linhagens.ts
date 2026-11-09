// Fichas de linhagem: árvore genealógica de uma pessoa e governantes de cada
// senhorio no instante atual da linha do tempo.

import type { App } from '../app';
import { tempo, textoPeriodo } from '../core/data';
import {
  NOME_POVO,
  ascendencia,
  governoEm,
  irmaosDe,
  nomeSenhorio,
  pessoaPorId,
  pessoas,
  reinaEm,
  reinadosDe,
  retratoDe,
  sequitoDe,
  senhorioDoReino,
  senhoriosDoLugar,
  senhoriosEm,
  senhoriosFora,
  totalDescendentes,
  unioesDe,
  type Governo,
  type Pessoa,
  type Povo,
  type Senhorio,
} from '../core/linhagens';
import { esc, listaFontes, miniatura } from './util';

const PROFUNDIDADE = 3; // gerações de descendência abaixo da pessoa em foco
const ICONE_ARVORE = '<svg class="icone-arvore" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5v4M8 5.5H3.5v3M8 5.5h4.5v3M8 5.5v3M3.5 8.5v2M12.5 8.5v2M8 8.5v2" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="2" r="1.6" fill="currentColor"/><circle cx="3.5" cy="12.5" r="1.6" fill="currentColor"/><circle cx="8" cy="12.5" r="1.6" fill="currentColor"/><circle cx="12.5" cy="12.5" r="1.6" fill="currentColor"/></svg>';
const COROA = '<svg class="coroa" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 12.5h12l1.2-7.5-4.2 3.2L8 3 5 8.2.8 5z" fill="currentColor"/></svg>';

const nome = (id: string) => esc(pessoaPorId.get(id)?.nome ?? id);
const abrir = (id: string, rotulo = nome(id), cls = 'link') => `<button type="button" class="${cls}" data-acao="sel" data-sel="linhagem:${esc(id)}">${rotulo}</button>`;
const periodo = (g: Governo) => textoPeriodo(g.de, g.ate);
const botaoArvore = (id: string) =>
  `<button type="button" class="abrir-arvore" data-acao="arvore-tela" data-id="${esc(id)}" title="Abrir árvore genealógica" aria-label="Abrir árvore genealógica de ${nome(id)}">${ICONE_ARVORE}</button>`;

function foto(id: string, tamanho: number, adiar = tamanho === 36): string {
  const r = retratoDe(id);
  if (!r) return '';
  return `<button type="button" class="retrato-ampliar" data-acao="retrato" data-id="${esc(id)}" aria-label="Ampliar retrato de ${nome(id)}" aria-haspopup="dialog" title="Ampliar retrato">
    <img src="${esc(miniatura(r.imagem))}" alt="${tamanho === 36 ? '' : esc(r.alt)}" width="${tamanho}" height="${tamanho}" decoding="async"${adiar ? ' loading="lazy"' : ''}></button>`;
}

/** Quadro ampliado; o dialog nativo cuida do foco e do fechamento por Esc. */
export function htmlRetrato(id: string): string {
  const p = pessoaPorId.get(id);
  const r = retratoDe(id);
  if (!p || !r) return '';
  return `<button type="button" class="retrato-fechar" data-fechar-retrato aria-label="Fechar retrato (Esc)" autofocus>
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></button>
    <figure class="retrato-quadro">
      <div class="retrato-moldura"><img src="${esc(r.imagem)}" alt="${esc(r.alt)}" width="512" height="512"></div>
      <figcaption><h2 id="retrato-nome">${esc(p.nome)}</h2>${p.epiteto ? `<p>${esc(p.epiteto)}</p>` : ''}<small>Interpretação artística</small></figcaption>
    </figure>`;
}

function quem(g: Governo, cls = 'link'): string {
  if (g.quem?.length) return g.quem.map((id) => abrir(id, nome(id), cls)).join(' e ');
  return `<span class="rotulo-sucessao">${esc(g.rotulo ?? '')}</span>`;
}

function nomeComLink(s: Senhorio): string {
  return s.reino ? `<button type="button" class="link" data-acao="sel" data-sel="reino:${esc(s.reino)}" title="Ver no mapa">${esc(nomeSenhorio(s))}</button>` : esc(nomeSenhorio(s));
}

function sucessao(s: Senhorio, t: number): string {
  if (s.governos.length < 2) return '';
  return `<ol class="sucessao">${s.governos
    .map((g) => {
      const atual = governoEm(s, t) === g;
      const ir = g.de ? `<button type="button" class="mini" data-acao="tempo" data-t="${tempo.cursor(g.de)}" title="Ir a ${esc(periodo(g))}">⟲</button> ` : '';
      return `<li class="${atual ? 'atual' : ''}">${ir}${quem(g)} <span class="data">${esc(periodo(g))}</span></li>`;
    })
    .join('')}</ol>`;
}

/** Bloco "Governante nesta época" para a ficha de um reino do mapa. */
export function blocoGovernoReino(app: App, reinoId: string): string | null {
  const s = senhorioDoReino(reinoId);
  if (!s) return null;
  const g = governoEm(s, app.t);
  const ePoder = g?.quem?.some((id) => {
    const p = pessoaPorId.get(id);
    return p ? p.povo === 'vala' || p.povo === 'maia' : false;
  });
  return `<section class="bloco"><h3>Governante nesta época</h3>
    ${g ? `<p class="governante">${COROA}${quem(g, 'link forte')} <span class="nota">${esc(s.titulo)} · ${esc(periodo(g))}${g.nota ? ` · ${esc(g.nota)}` : ''}</span></p>` : `<p class="nota">Ninguém governava ${esc(nomeSenhorio(s))} em ${esc(tempo.rotulo(app.t).principal)}.</p>`}
    ${sucessao(s, app.t)}
    ${ePoder ? `<p><button type="button" class="link" data-acao="sel" data-sel="valar">Ver os Valar e Maiar</button></p>` : ''}
    <p class="nota">Toque num nome para abrir a ficha completa do personagem.</p>
  </section>`;
}

/** Quem governa uma cidade ou fortaleza nesta época, com a sucessão e links para as árvores. */
export function blocoGovernoLugar(app: App, lugarId: string, reinoId?: string): string | null {
  const t = app.t;
  const lista = senhoriosDoLugar(lugarId, reinoId, t);
  if (!lista.length) return null;
  return `<section class="bloco"><h3>Quem governa nesta época</h3><ul class="senhorios">${lista
    .map((s) => {
      const g = governoEm(s, t);
      return `<li><div class="senhorio-cab"><strong>${nomeComLink(s)}</strong><span class="nota">${esc(s.titulo)}</span></div>
        ${g ? `<p class="governante">${COROA}${quem(g, 'link forte')} <span class="nota">${esc(periodo(g))}${g.nota ? ` · ${esc(g.nota)}` : ''}</span></p>` : `<p class="nota">Ninguém governava em ${esc(tempo.rotulo(t).principal)}.</p>`}
        ${s.governos.length > 1 ? `<details><summary>Sucessão</summary>${sucessao(s, t)}</details>` : ''}</li>`;
    })
    .join('')}</ul><p class="nota">Toque num nome para abrir a ficha completa do personagem.</p></section>`;
}

/** Lista de senhorios com seus governantes no instante atual. */
export function fichaSenhorios(app: App): string {
  const t = app.t;
  const vivos = senhoriosEm(t);
  const { caidos, futuros } = senhoriosFora(t);
  return `<header class="ficha-cab"><p class="tipo">Linhagens · ${esc(tempo.rotulo(t).principal)}</p><h2>Quem governava</h2>
    <p class="nota">Mova a linha do tempo para ver a sucessão. Toque num governante para abrir sua ficha completa.</p></header>
    ${
      vivos.length
        ? `<ul class="senhorios">${vivos
            .map(
              ({ s, g }) => `<li><div class="senhorio-cab"><strong>${nomeComLink(s)}</strong><span class="nota">${esc(s.onde ?? '')}</span></div>
              <p class="governante">${COROA}${quem(g, 'link forte')} <span class="nota">${esc(s.titulo)}${g.nota ? ` · ${esc(g.nota)}` : ''}</span></p>
              ${s.governos.length > 1 ? `<details><summary>Sucessão</summary>${sucessao(s, t)}</details>` : ''}</li>`,
            )
            .join('')}</ul>`
        : '<p class="nota">Nenhum dos senhorios registrados tem governante neste momento.</p>'
    }
    ${caidos.length ? `<p class="nota"><strong>Já caídos ou extintos:</strong> ${caidos.map((s) => esc(nomeSenhorio(s))).join(', ')}</p>` : ''}
    ${futuros.length ? `<p class="nota"><strong>Ainda por surgir:</strong> ${futuros.map((s) => esc(nomeSenhorio(s))).join(', ')}</p>` : ''}
    <section class="bloco"><h3>Consultar um personagem</h3><p>${abrir('feanor', 'Fëanor')} · ${abrir('finwe', 'Finwë')} · ${abrir('thingol', 'Elu Thingol')} · ${abrir('elendil', 'Elendil')} · ${abrir('aragorn', 'Aragorn')}</p></section>
    <section class="bloco"><h3>Valar e Maiar</h3>
      <p class="nota">Os Poderes que ampararam Arda desde o Primeiro Dia, com seus retratos e laços: cônjuge, irmãos, senhor e séquito.</p>
      <p><button type="button" class="link forte" data-acao="sel" data-sel="valar">Ver os Valar e Maiar</button></p>
    </section>`;
}

function cartaoPoder(p: Pessoa): string {
  const r = retratoDe(p.id);
  const com = p.casa?.map((q) => chip(q)).join(' ');
  const servico = p.servo_de?.map((q) => chip(q)).join(' ');
  return `<div class="valar-cartao povo-${p.povo}">
    ${r ? foto(p.id, 96, true) : `<button type="button" class="valar-sem-retrato" data-acao="sel" data-sel="linhagem:${esc(p.id)}" aria-label="Abrir ficha de ${esc(p.nome)}"><i class="povo-sinal" aria-hidden="true"></i>${esc(p.nome[0] ?? '')}</button>`}
    <div class="valar-cartao-corpo">
      ${abrir(p.id, p.nome, 'pessoa-nome')}
      ${p.epiteto ? `<span class="pessoa-ep">${esc(p.epiteto)}</span>` : ''}
      ${(com || servico) ? `<span class="valar-lacos">${com}${servico}</span>` : ''}
    </div>
    <div class="valar-cartao-acoes"><button type="button" class="mini" data-acao="sel" data-sel="linhagem:${esc(p.id)}">Ficha</button>${botaoArvore(p.id)}</div>
  </div>`;
}

/** Galeria dos Valar e Maiar: os retratos, casais, séquito e caminho para as árvores. */
export function fichaValar(app: App): string {
  const grupo = (povo: Povo) => pessoas.filter((p) => p.povo === povo);
  const unico = grupo('ainu');
  const valar = grupo('vala');
  const maior = grupo('maia');
  const cartoes = (lista: Pessoa[]) => `<div class="valar-grade">${lista.map(cartaoPoder).join('')}</div>`;
  return `<header class="ficha-cab"><p class="tipo">Linhagens · ${esc(NOME_POVO.ainu)}, ${esc(NOME_POVO.vala)} e ${esc(NOME_POVO.maia)}</p><h2>Valar e Maiar</h2>
    <p class="nota">Eru, o Único, pai dos Valar; os Valar, que ampararam a Terra desde o Primeiro Dia; e os Maiar, seus servos. Toque num retrato para ampliá-lo, num nome para abrir a ficha.</p></header>
    <section class="bloco"><h3>Eru, o Único</h3>${cartoes(unico)}</section>
    <section class="bloco"><h3>Valar</h3>${cartoes(valar)}</section>
    <section class="bloco"><h3>Maiar</h3>${cartoes(maior)}</section>
    <section class="bloco"><h3>Fontes</h3><p class="nota">As ligações de casa, irmãos, senhor e séquito seguem a Valaquenta, em O Silmarillion. Os retratos são interpretações artísticas.</p></section>
    <div class="acoes rodape"><button type="button" data-acao="linhagens">Quem governava</button></div>`;
}

function cartao(app: App, id: string, foco: string, conjuge: string | null, extra: string): string {
  const p = pessoaPorId.get(id)!;
  const r = retratoDe(id);
  const agora = reinaEm(id, app.t);
  return `<div class="pessoa povo-${p.povo}${id === foco ? ' foco' : ''}">
    <div class="pessoa-cab">${r ? foto(id, 36) : '<i class="povo-sinal" aria-hidden="true"></i>'}
      <div>${abrir(id, nome(id), 'pessoa-nome')}${p.epiteto ? `<span class="pessoa-ep">${esc(p.epiteto)}</span>` : ''}</div>${botaoArvore(id)}</div>
    ${p.datas ? `<span class="data">${esc(p.datas)}</span>` : ''}
    ${agora.map((x) => `<span class="reina">${COROA}${esc(nomeSenhorio(x.s))}</span>`).join('')}
    ${conjuge ? `<span class="conjuge">com ${abrir(conjuge)}</span>` : ''}${extra}</div>`;
}

function no(app: App, id: string, foco: string, nivel: number, pai: string | null, profundidade = PROFUNDIDADE): string {
  const p = pessoaPorId.get(id)!;
  const unioes = unioesDe(id);
  const elo = pai && p.elo && p.pais?.[0] === pai ? `<div class="elo">${esc(p.elo)}</div>` : '';
  const ramos = (fs: { id: string }[]) => fs.map((f) => no(app, f.id, foco, nivel + 1, id, profundidade)).join('');
  let dentro = '';
  let extra = '';
  const conjuge = unioes.length === 1 && unioes[0][0] ? unioes[0][0] : null;
  if (unioes.length && nivel >= profundidade) {
    const n = totalDescendentes(id);
    extra = `<span class="mais">+${n} descendente${n > 1 ? 's' : ''}</span>`;
  } else if (unioes.length === 1) dentro = `<ul>${ramos(unioes[0][1])}</ul>`;
  else if (unioes.length > 1)
    dentro = `<ul>${unioes.map(([o, fs]) => `<li><div class="uniao">${o ? `com ${abrir(o)}` : 'outra união'}</div><ul>${ramos(fs)}</ul></li>`).join('')}</ul>`;
  return `<li>${elo}${cartao(app, id, foco, conjuge, extra)}${dentro}</li>`;
}

function chip(id: string, tag = ''): string {
  const p = pessoaPorId.get(id)!;
  return `<button type="button" class="chip-pessoa povo-${p.povo}" data-acao="sel" data-sel="linhagem:${esc(id)}"><i class="povo-sinal" aria-hidden="true"></i>${nome(id)}${tag ? ` <em>${esc(tag)}</em>` : ''}</button>`;
}

function htmlAscendencia(id: string): string {
  const asc = ascendencia(id);
  const ROT = ['Pais', 'Avós', 'Bisavós'];
  if (!asc.length) return `<p class="nota">As fontes registradas não nomeiam os pais de ${nome(id)}.</p>`;
  return asc
    .map((casais, i) => ({ casais, rot: ROT[i] }))
    .reverse()
    .map(({ casais, rot }) => `<div class="geracao"><span class="nota">${rot}</span><div class="chips">${casais.map((c) => `<span class="casal">${c.pais.map((q) => chip(q)).join('<i>e</i>')}${c.elo ? `<span class="nota">… ${esc(c.elo)}</span>` : ''}</span>`).join('')}</div></div>`)
    .join('');
}

const legendaPovos = () => `<ul class="legenda-povos">${Object.entries(NOME_POVO).map(([k, v]) => `<li class="povo-${k}"><i class="povo-sinal" aria-hidden="true"></i>${v}</li>`).join('')}</ul>`;

/** Casa, irmãos, senhor e séquito nomeados fora da ascendência (Valar e Maiar). */
function blocosFamilia(id: string): string {
  const p = pessoaPorId.get(id);
  if (!p) return '';
  const blocos: string[] = [];
  if (p.casa?.length) blocos.push(`<section class="bloco"><h3>Casa</h3><div class="chips">${p.casa.map((q) => chip(q)).join('')}</div></section>`);
  if (p.irmaos?.length) blocos.push(`<section class="bloco"><h3>Irmãos</h3><div class="chips">${p.irmaos.map((q) => chip(q)).join('<i>e</i>')}</div></section>`);
  if (p.servo_de?.length) blocos.push(`<section class="bloco"><h3>A serviço de</h3><div class="chips">${p.servo_de.map((q) => chip(q)).join('<i>e</i>')}</div></section>`);
  const sequito = sequitoDe(id).map((s) => chip(s.id)).join('<i>e</i>');
  if (sequito) blocos.push(`<section class="bloco"><h3>Séquito</h3><div class="chips">${sequito}</div></section>`);
  return blocos.join('');
}

/** Árvore em tela cheia: mais gerações e espaço para percorrer a família. */
export function htmlArvoreTela(app: App, id: string): string {
  const p = pessoaPorId.get(id);
  if (!p) return '';
  const r = retratoDe(id);
  return `<header class="arvore-tela-cab">
      ${r ? foto(id, 56) : ''}
      <div class="arvore-tela-titulo"><p class="tipo">Árvore genealógica · ${esc(NOME_POVO[p.povo])} · ${esc(tempo.rotulo(app.t).principal)}</p><h2 id="arvore-tela-nome">${esc(p.nome)}</h2>${p.epiteto ? `<p class="outros">${esc(p.epiteto)}</p>` : ''}</div>
      <button type="button" class="fechar" data-fechar-arvore aria-label="Fechar árvore genealógica (Esc)">×</button>
    </header>
    <div class="arvore-tela-asc">${htmlAscendencia(id)}</div>
    ${blocosFamilia(id)}
    ${legendaPovos()}
    <div class="arvore-rolagem arvore-tela-rolagem"><div class="arvore"><ul>${no(app, id, id, 0, null, 6)}</ul></div></div>
    <p class="nota arvore-tela-nota">Toque num nome para abrir a ficha completa do personagem. Use o ícone de árvore para explorar a família dele. A coroa marca quem governa em ${esc(tempo.rotulo(app.t).principal)}.</p>`;
}

/** Ficha completa do personagem, com os dados e relações cadastrados. */
export function fichaLinhagem(app: App, id: string): string {
  const p = pessoaPorId.get(id);
  if (!p) return '';
  const t = app.t;
  const r = retratoDe(id);
  const reinados = reinadosDe(id);
  const irmaos = irmaosDe(id);
  const opcoes = [...pessoas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt')).map((x) => `<option value="${esc(x.id)}"${x.id === id ? ' selected' : ''}>${esc(x.nome)}</option>`).join('');
  return `<header class="ficha-cab linhagem-cab">
      ${r ? `<figure>${foto(id, 96)}<figcaption>interpretação artística</figcaption></figure>` : ''}
      <div><p class="tipo"><i class="povo-sinal povo-${p.povo}" aria-hidden="true"></i>Personagem · ${esc(NOME_POVO[p.povo])}</p>
      <h2>${esc(p.nome)}</h2>
      ${p.epiteto || p.datas ? `<p class="outros">${[p.epiteto, p.datas].filter(Boolean).map((x) => esc(x!)).join(' · ')}</p>` : ''}
      <button type="button" class="abrir-arvore com-texto" data-acao="arvore-tela" data-id="${esc(id)}">${ICONE_ARVORE}Abrir árvore genealógica</button></div>
    </header>
    <p class="resumo">${esc(p.resumo)}</p>
    <section class="bloco"><h3>Reinos que governou</h3>${
      reinados.length
        ? `<ul class="reinados">${reinados
            .map(({ s, g }) => `<li class="${governoEm(s, t) === g ? 'atual' : ''}">${COROA}<strong>${nomeComLink(s)}</strong> <span class="nota">${esc(s.titulo)} · ${esc(periodo(g))}${g.nota ? ` · ${esc(g.nota)}` : ''}</span>${governoEm(s, t) === g ? ' <span class="chip st-ativo">reina nesta época</span>' : ''}</li>`)
            .join('')}</ul>`
        : '<p class="nota">Não governou nenhum dos senhorios registrados.</p>'
    }</section>
    <section class="bloco"><h3>Ascendência</h3>${htmlAscendencia(id)}</section>
    ${irmaos.length ? `<section class="bloco"><h3>Irmãos</h3><div class="chips">${irmaos.map(({ p: x, meio }) => chip(x.id, meio ? (x.fem ? 'meia-irmã' : 'meio-irmão') : '')).join('')}</div></section>` : ''}
    ${blocosFamilia(id)}
    <section class="bloco"><h3>Descendência</h3>
      ${legendaPovos()}
      <div class="arvore-rolagem"><div class="arvore"><ul>${no(app, id, id, 0, null)}</ul></div></div>
      <p class="nota">A coroa marca quem governa em ${esc(tempo.rotulo(t).principal)}. Mova a linha do tempo para ver a sucessão mudar.</p>
    </section>
    <section class="bloco"><h3>Fontes</h3>${listaFontes(p.fontes)}</section>
    <div class="acoes rodape">
      <label class="ir-para">Ir para <select id="linhagem-ir">${opcoes}</select></label>
      <button type="button" data-acao="linhagens">Quem governava</button>
    </div>`;
}
