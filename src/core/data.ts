// Carrega os dados separados (data/*.json) e oferece consultas por período.

import terrenoJson from '../../data/terreno.json';
import erasJson from '../../data/eras.json';
import eventosJson from '../../data/eventos.json';
import lugaresJson from '../../data/lugares.json';
import reinosJson from '../../data/reinos.json';
import fontesJson from '../../data/fontes.json';
import jornadasJson from '../../data/jornadas.json';
import type { DadosTerreno, Era, Evento, FaseLugar, Feicao, Fonte, Jornada, Lugar, Pt, Reino, StatusLugar, Territorio } from './types';
import { LinhaDoTempo } from './time';
import { resolverContorno, pontoNoPoligonoPts } from '../terrain/model';
import { hashString } from '../terrain/noise';

export const terreno = terrenoJson as unknown as DadosTerreno;
export const eras = erasJson as Era[];
export const eventos = eventosJson as Evento[];
export const lugares = lugaresJson as unknown as Lugar[];
export const reinos = reinosJson as unknown as Reino[];
export const fontes = fontesJson as Fonte[];
export const jornadas = jornadasJson as unknown as Jornada[];

export const tempo = new LinhaDoTempo(eras, eventos);

// Padrões de validade: lugares sem data de origem existem desde os Anos das
// Árvores; feições de detalhe da Terra-média sem data surgem depois da queda das
// Lâmpadas (a geografia dos Anos das Lâmpadas é só esquemática).
for (const l of lugares) if (l.de == null) l.de = 'AA:inicio';

// Destino dos lugares que somem nas duas grandes catástrofes: em vez de "já não
// existe", o atlas diz o que aconteceu (submerso na Guerra da Ira; submerso ou
// retirado do mundo na Queda de Númenor) e aponta o acontecimento.
const CATASTROFES: Record<string, { evento: string; status: (l: Lugar) => StatusLugar }> = {
  'PE:587': { evento: 'pe-ruina-beleriand', status: () => 'submerso' },
  'SE:3319': { evento: 'se-queda', status: (l) => (l.em[0] < -2900 ? 'removido' : 'submerso') },
};
for (const l of lugares) {
  const c = l.ate ? CATASTROFES[l.ate] : undefined;
  if (c && !l.fases?.length) {
    l.fases = [
      { de: l.de!, status: 'ativo' },
      { de: l.ate!, status: c.status(l), evento: c.evento },
    ];
    delete l.ate;
  }
  for (const f of l.fases ?? []) {
    const cf = CATASTROFES[f.de];
    if (cf && !f.evento && (f.status === 'submerso' || f.status === 'removido')) f.evento = cf.evento;
  }
}
const DETALHE = new Set(['rio', 'floresta', 'bioma', 'cordilheira', 'pico', 'planalto', 'lago', 'gelo', 'estrada', 'bacia', 'passo']);
for (const f of terreno.feicoes) if (f.de == null && f.ate == null && DETALHE.has(f.tipo) && f.grupo !== 'aman') f.de = 'AL:#al-aman';

export const lugarPorId = new Map(lugares.map((l) => [l.id, l]));
export const reinoPorId = new Map(reinos.map((r) => [r.id, r]));
export const fontePorId = new Map(fontes.map((f) => [f.id, f]));
export const feicaoPorId = new Map(terreno.feicoes.map((f) => [f.id, f]));

const TIPOS_RELEVO = new Set(['terra', 'lago', 'cordilheira', 'pico', 'passo', 'planalto', 'bacia', 'rio', 'floresta', 'bioma', 'gelo', 'zona']);

// pré-cálculo das fronteiras temporais de cada feição
interface Janela {
  de: number;
  ate: number;
}
const janelas = new Map<string, Janela>();
function janela(id: string, de?: string, ate?: string): Janela {
  let j = janelas.get(id);
  if (!j) {
    j = { de: tempo.fronteira(de, -Infinity), ate: tempo.fronteira(ate, Infinity) };
    janelas.set(id, j);
  }
  return j;
}
export function ativo(id: string, de: string | undefined, ate: string | undefined, t: number): boolean {
  const j = janela(id, de, ate);
  return t >= j.de && t < j.ate;
}

export interface EstadoTerreno {
  assinatura: string;
  feicoes: Feicao[];
}

/** Feições de relevo ativas no instante t, com uma assinatura para cache. */
export function estadoTerreno(t: number, filtro?: (f: Feicao) => boolean): EstadoTerreno {
  const fs = terreno.feicoes.filter((f) => TIPOS_RELEVO.has(f.tipo) && ativo(f.id, f.de, f.ate, t) && (!filtro || filtro(f)));
  const ids = fs.map((f) => f.id).join('|');
  return { assinatura: (filtro ? 'F' : '') + hashString(ids).toString(36), feicoes: fs };
}

/** Todas as fronteiras de mudança do relevo (para detectar transições). */
export function estradasAtivas(t: number): Feicao[] {
  return terreno.feicoes.filter((f) => f.tipo === 'estrada' && ativo(f.id, f.de, f.ate, t));
}

export function rios(t: number): Feicao[] {
  return terreno.feicoes.filter((f) => f.tipo === 'rio' && ativo(f.id, f.de, f.ate, t));
}

const contornoCache = new Map<string, Pt[]>();
export function contornoFeicao(id: string): Pt[] {
  let c = contornoCache.get(id);
  if (!c) {
    const f = feicaoPorId.get(id);
    if (!f) return [];
    c = f.pts ?? resolverContorno(f, terreno.cadeias).pts;
    contornoCache.set(id, c);
  }
  return c;
}

export function contornoTerritorio(t: Territorio): Pt[] {
  if (t.contorno) return t.contorno;
  if (t.feicao) return contornoFeicao(t.feicao);
  return [];
}

export interface TerritorioAtivo {
  reino: Reino;
  terr: Territorio;
  idx: number;
  pts: Pt[];
}

export function territoriosAtivos(t: number): TerritorioAtivo[] {
  const out: TerritorioAtivo[] = [];
  for (const r of reinos) {
    r.territorios.forEach((terr, idx) => {
      if (ativo(`${r.id}#${idx}`, terr.de, terr.ate, t)) out.push({ reino: r, terr, idx, pts: contornoTerritorio(terr) });
    });
  }
  return out;
}

export function assinaturaPolitica(t: number): string {
  const ids = territoriosAtivos(t).map((a) => `${a.reino.id}#${a.idx}`);
  const st = lugares.map((l) => statusLugar(l, t)[0]).join('');
  return hashString(ids.join('|') + st).toString(36);
}

/** Status de um lugar em t: [status, fase]. 'inexistente' antes da origem. */
/** Fase em que o lugar está no instante t (com o acontecimento que a abriu, se houver). */
export function faseAtual(l: Lugar, t: number): FaseLugar | undefined {
  let atual: FaseLugar | undefined;
  for (const f of l.fases ?? []) if (t >= tempo.fronteira(f.de, -Infinity)) atual = f;
  return atual;
}

export function statusLugar(l: Lugar, t: number): [StatusLugar | 'futuro' | 'ausente', string | undefined] {
  const de = tempo.fronteira(l.de, -Infinity);
  if (t < de) return ['futuro', undefined];
  if (l.fases && l.fases.length) {
    let atual: (typeof l.fases)[number] | undefined;
    for (const f of l.fases) if (t >= tempo.fronteira(f.de, -Infinity)) atual = f;
    if (atual) {
      const fim = tempo.fronteira(atual.ate, Infinity);
      if (t >= fim) return ['ausente', undefined];
      return [atual.status, atual.nota];
    }
  }
  const ate = tempo.fronteira(l.ate, Infinity);
  if (t >= ate) return ['ausente', undefined];
  return ['ativo', undefined];
}

export function areaLugar(l: Lugar): Pt[] | null {
  if (l.area) return l.area;
  if (l.feicao) {
    const f = feicaoPorId.get(l.feicao);
    if (f && (f.tipo === 'terra' || f.tipo === 'floresta' || f.tipo === 'bioma')) return contornoFeicao(l.feicao);
  }
  return null;
}

export function lugarContem(l: Lugar, x: number, y: number): boolean {
  const a = areaLugar(l);
  return !!a && pontoNoPoligonoPts(x, y, a);
}

export function nomeEra(id: string): string {
  return eras.find((e) => e.id === id)?.nome ?? id;
}

/** Texto curto de um período (de–até) usando a linha do tempo. */
export function textoPeriodo(de?: string, ate?: string): string {
  const fmt = (ref: string | undefined, fim: boolean) => {
    if (!ref || ref === '-inf') return fim ? 'hoje' : 'origem incerta';
    if (ref === '+inf') return 'depois';
    try {
      const t = tempo.fronteira(ref, 0) + (fim ? -1e-6 : 1e-6);
      const era = tempo.eraDe(t);
      if (era.datada) return `${tempo.anoDe(t)} ${era.abrev}`;
      const ev = ref.includes('#') ? tempo.evento(ref.split('#')[1]) : undefined;
      return ev ? `${era.nome} (${ev.titulo.toLowerCase()})` : era.nome;
    } catch {
      return ref;
    }
  };
  if (!ate) return `desde ${fmt(de, false)}`;
  if (!de || de === '-inf') return `até ${fmt(ate, true)}`;
  return `${fmt(de, false)} – ${fmt(ate, true)}`;
}
