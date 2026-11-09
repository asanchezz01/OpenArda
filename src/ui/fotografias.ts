// Painel de fotografias: destaque nas fichas, grade em tela cheia e visualizador.

import type { App } from '../app';
import { lugarPorId, tempo } from '../core/data';
import { fotos, fotosEm, momento, validade, type Foto, type FotosDoLugar } from '../core/fotografias';
import { esc, listaFontes, miniatura } from './util';

const SELO = 'Imagem gerada por IA · interpretação a partir de Tolkien';
const quando = (f: Foto) => tempo.rotulo(momento(f)).principal;
const irEpoca = (f: Foto, rotulo = `Ir a ${quando(f)}`) => `<button type="button" data-acao="tempo" data-t="${momento(f)}">${esc(rotulo)}</button>`;

/** Foto de destaque no topo da ficha de um lugar ou reino. */
export function blocoFotoFicha(info: FotosDoLugar): string {
  const f = info.destaque;
  if (!f) return '';
  const outras = info.todas.filter((x) => x !== f);
  return `<section class="foto-ficha">
    <button type="button" class="foto-abrir" data-acao="foto" data-id="${esc(f.id)}" aria-label="Ampliar: ${esc(f.titulo)}">
      <img src="${esc(miniatura(f.imagem!))}" alt="${esc(f.alt)}" width="1536" height="1024" loading="lazy" decoding="async">
    </button>
    <p class="foto-legenda"><strong>${esc(f.titulo)}</strong> · ${esc(quando(f))}<span class="selo-ia">${SELO}</span></p>
    ${info.outraEpoca ? `<p class="nota">Ainda não há foto desta época. <button type="button" class="link" data-acao="tempo" data-t="${momento(f)}">Ver em ${esc(quando(f))}</button></p>` : ''}
    ${outras.length ? `<div class="foto-epocas">${outras.map((x) => `<button type="button" data-acao="foto" data-id="${esc(x.id)}" title="${esc(x.titulo)} · ${esc(quando(x))}"><img src="${esc(miniatura(x.imagem!))}" alt="" width="96" height="64" loading="lazy" decoding="async"><span>${esc(quando(x))}</span></button>`).join('')}</div>` : ''}
  </section>`;
}

const cartaoGrade = (f: Foto) =>
  `<li><button type="button" data-acao="foto" data-id="${esc(f.id)}"><img src="${esc(miniatura(f.imagem!))}" alt="${esc(f.alt)}" width="1536" height="1024" loading="lazy" decoding="async"><span class="fotos-nome">${esc(lugarPorId.get(f.lugar)?.nome ?? f.lugar)}</span><span class="nota">${esc(f.titulo)} · ${esc(quando(f))}</span></button></li>`;

/** Agrupa por era, na ordem da linha do tempo. */
function porEra(lista: Foto[]): [string, Foto[]][] {
  const grupos = new Map<string, Foto[]>();
  for (const f of lista) {
    const era = tempo.eraDe(momento(f)).nome;
    if (!grupos.has(era)) grupos.set(era, []);
    grupos.get(era)!.push(f);
  }
  return [...grupos];
}

/** Grade do painel: os lugares fotografados que existem na época atual (ou todas as épocas). */
export function htmlPainelFotos(app: App, todas: boolean): string {
  const lista = fotosEm(todas ? null : app.t);
  const epoca = tempo.rotulo(app.t).principal;
  return `<header class="tela-cab">
      <div class="tela-titulo"><p class="tipo">Fotografias · ${esc(todas ? 'todas as épocas' : epoca)}</p><h2 id="fotos-tela-titulo">Reinos e lugares</h2></div>
      <label class="fotos-todas"><input type="checkbox" id="fotos-todas" ${todas ? 'checked' : ''}> Todas as épocas</label>
      <button type="button" class="fechar" data-fechar-fotos aria-label="Fechar fotografias (Esc)">×</button>
    </header>
    <p class="nota">${SELO}. Cada foto vale para a época do lugar. Marque <strong>Todas as épocas</strong> para ver o acervo completo.</p>
    ${
      lista.length
        ? porEra(lista)
            .map(([era, fs]) => `${todas ? `<h3 class="fotos-era">${esc(era)}</h3>` : ''}<ul class="fotos-grade">${fs.map(cartaoGrade).join('')}</ul>`)
            .join('')
        : `<p class="fotos-vazio">Nenhum lugar fotografado existe em ${esc(epoca)}. Marque <strong>Todas as épocas</strong> ou mova a linha do tempo.</p>`
    }`;
}

/** Visualizador de uma foto, com o que é descrito por Tolkien e o que é interpretação. */
export function htmlVisualizador(app: App, id: string): string {
  const f = fotos.find((x) => x.id === id);
  if (!f) return '';
  const lista = fotosEm(null);
  const i = lista.indexOf(f);
  const ant = lista[(i - 1 + lista.length) % lista.length];
  const prox = lista[(i + 1) % lista.length];
  const lugar = lugarPorId.get(f.lugar);
  const [a, b] = validade(f);
  const naEpoca = app.t >= a && app.t < b;
  const itens = (titulo: string, xs: string[]) => (xs.length ? `<h3>${titulo}</h3><ul>${xs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
  return `<header class="tela-cab">
      <div class="tela-titulo"><p class="tipo">${esc(lugar?.nome ?? f.lugar)} · ${esc(quando(f))}</p><h2 id="fotos-tela-titulo">${esc(f.titulo)}</h2></div>
      <button type="button" data-acao="fotografias">Todas as fotos</button>
      <button type="button" class="fechar" data-fechar-fotos aria-label="Fechar fotografias (Esc)">×</button>
    </header>
    <div class="foto-palco">
      ${lista.length > 1 ? `<button type="button" class="foto-nav" data-acao="foto" data-id="${esc(ant.id)}" aria-label="Foto anterior">‹</button>` : ''}
      <figure><img src="${esc(f.imagem!)}" alt="${esc(f.alt)}" width="1536" height="1024"><figcaption class="selo-ia">${SELO}</figcaption></figure>
      ${lista.length > 1 ? `<button type="button" class="foto-nav" data-acao="foto" data-id="${esc(prox.id)}" aria-label="Próxima foto">›</button>` : ''}
    </div>
    <div class="foto-info">
      <div>${itens('Descrito por Tolkien', f.documentado)}${itens('Inferido', f.inferido)}${itens('Interpretação artística', f.artistico)}</div>
      <div><h3>Fontes</h3>${listaFontes(f.fontes)}
        <div class="acoes">
          <button type="button" class="primario" data-acao="sel" data-sel="lugar:${esc(f.lugar)}">Ver no mapa</button>
          ${naEpoca ? '' : irEpoca(f)}
        </div>
      </div>
    </div>`;
}
