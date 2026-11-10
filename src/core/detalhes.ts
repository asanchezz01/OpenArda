import { faseAtual, lugarPorId, statusLugar, tempo } from './data';
import type { Vista } from './types';

export type FaseGondolin = 'construcao' | 'integra' | 'ruinas';

export const GONDOLIN = lugarPorId.get('gondolin')!;
export const VISTA_GONDOLIN: Vista = { x: GONDOLIN.em[0], y: GONDOLIN.em[1], d: 16, rumo: 20, inclinacao: 55 };

/** As datas vêm das fases do lugar, compartilhadas com as fichas e a busca. */
export function faseGondolin(t: number): FaseGondolin | null {
  switch (statusLugar(GONDOLIN, t)[0]) {
    case 'oculto': return 'construcao';
    case 'ativo': return 'integra';
    case 'destruido':
    case 'ruina': return 'ruinas';
    default: return null;
  }
}

/** Na arquitetura, só a Árvore Branca muda entre as épocas de Minas Anor/Minas Tirith. */
export type FaseMinasTirith = 'sem-arvore' | 'arvore-viva' | 'arvore-morta';

export const MINAS_TIRITH = lugarPorId.get('minas-anor')!;
export const VISTA_MINAS_TIRITH: Vista = { x: MINAS_TIRITH.em[0], y: MINAS_TIRITH.em[1], d: 4.5, rumo: 265, inclinacao: 60 };

/** Estado da Árvore em cada fase de data/lugares.json (pela data de início da fase). */
export const ARVORE_MINAS_TIRITH: Record<string, FaseMinasTirith> = {
  'SE:3320': 'sem-arvore',
  'TE:2': 'arvore-viva',
  'TE:1636': 'arvore-morta',
  'TE:1640': 'arvore-viva',
  'TE:2002': 'arvore-viva',
  'TE:2698': 'arvore-viva',
  'TE:2872': 'arvore-morta',
  'TE:3019': 'arvore-viva',
};

export function faseMinasTirith(t: number): FaseMinasTirith | null {
  const f = faseAtual(MINAS_TIRITH, t);
  return f ? ARVORE_MINAS_TIRITH[f.de] : null;
}

/**
 * Edoras: a arquitetura não muda, mas o Longo Inverno cobre a colina de neve e os
 * túmulos dos reis crescem ao lado do caminho, nove da primeira linhagem a oeste
 * e os da segunda a leste (O Senhor dos Anéis, Livro III, cap. 6).
 */
export const EDORAS = lugarPorId.get('edoras')!;
export const VISTA_EDORAS: Vista = { x: EDORAS.em[0], y: EDORAS.em[1], d: 2.6, rumo: 200, inclinacao: 62 };

/** Ano da morte de cada rei (Apêndice A, II). */
export const REIS_ROHAN = {
  primeira: [['Eorl', 2545], ['Brego', 2570], ['Aldor', 2645], ['Fréa', 2659], ['Fréawine', 2680], ['Goldwine', 2699], ['Déor', 2718], ['Gram', 2741], ['Helm', 2759]],
  segunda: [['Fréaláf', 2798], ['Brytta', 2842], ['Walda', 2851], ['Folca', 2864], ['Folcwine', 2903], ['Fengel', 2953], ['Thengel', 2980], ['Théoden', 3019]],
} as const;

export interface EstadoEdoras {
  inverno: boolean;
  oeste: number; // túmulos da primeira linhagem
  leste: number; // túmulos da segunda linhagem
}

export function estadoEdoras(t: number): EstadoEdoras | null {
  const f = faseAtual(EDORAS, t);
  if (!f) return null;
  // na Quarta Era todos os túmulos já existem
  const ano = tempo.eraDe(t).id === 'TE' ? tempo.anoDe(t)! : Infinity;
  const mortos = (linha: readonly (readonly [string, number])[]) => linha.filter(([, a]) => a <= ano).length;
  return { inverno: f.de === 'TE:2758', oeste: mortos(REIS_ROHAN.primeira), leste: mortos(REIS_ROHAN.segunda) };
}

/** Chave do modelo: um por combinação de neve e túmulos. */
export function faseEdoras(t: number): string | null {
  const e = estadoEdoras(t);
  return e ? `${e.inverno ? 'inverno' : 'verao'}-${e.oeste}-${e.leste}` : null;
}

/**
 * Armenelos: Nimloth cresce no pátio do rei até que Sauron convence Ar-Pharazôn a derrubá-la
 * e a erguer o Templo na colina no meio da cidade (Akallabêth; data inferida em se-nimloth).
 */
export type FaseArmenelos = 'nimloth' | 'templo';

export const ARMENELOS = lugarPorId.get('armenelos')!;
/** A visita olha de lés-sudeste para o paço sob o penhasco, com o Meneltarma ao fundo. */
export const VISTA_ARMENELOS: Vista = { x: ARMENELOS.em[0] - 0.04, y: ARMENELOS.em[1] - 0.06, d: 1.25, rumo: 295, inclinacao: 66 };
export const FASES_ARMENELOS: Record<string, FaseArmenelos> = { 'SE:32': 'nimloth', 'SE:3263': 'templo' };

export function faseArmenelos(t: number): FaseArmenelos | null {
  const f = faseAtual(ARMENELOS, t);
  return f ? FASES_ARMENELOS[f.de] ?? null : null;
}

/** Rómenna: barcos de pesca; navios de alto-mar a partir de 600 S.E.; os nove navios dos Fiéis no fim. */
export type FaseRomenna = 'barcos' | 'navios' | 'fieis';

export const ROMENNA = lugarPorId.get('romenna')!;
/** O marcador do atlas fica ~12 km terra adentro; o porto é assentado no fundo da baía, junto à água. */
export const CAIS_ROMENNA: [number, number] = [-2125.15, -732];
export const VISTA_ROMENNA: Vista = { x: CAIS_ROMENNA[0] + 0.28, y: CAIS_ROMENNA[1] - 0.12, d: 1.4, rumo: 262, inclinacao: 76 };
export const FASES_ROMENNA: Record<string, FaseRomenna> = { 'SE:32': 'barcos', 'SE:600': 'navios', 'SE:3310': 'fieis' };

export function faseRomenna(t: number): FaseRomenna | null {
  const f = faseAtual(ROMENNA, t);
  return f ? FASES_ROMENNA[f.de] ?? null : null;
}

/**
 * Menegroth: os salões de Thingol, saqueados pelos Anões (c. 503), restaurados por Dior e
 * destruídos pelos filhos de Fëanor em 506; afundam com Beleriand em 587.
 */
export type FaseMenegroth = 'integra' | 'saqueada' | 'destruida';

export const MENEGROTH = lugarPorId.get('menegroth')!;
/** O marcador fica ~5 km do traçado do Esgalduin; o modelo é assentado na margem sul, junto à curva do rio. */
export const COLINA_MENEGROTH: [number, number] = [-168.7, -114.42];
export const VISTA_MENEGROTH: Vista = { x: COLINA_MENEGROTH[0] - 0.02, y: COLINA_MENEGROTH[1] + 0.06, d: 1.3, rumo: 250, inclinacao: 58 };
export const FASES_MENEGROTH: Record<string, FaseMenegroth> = { 'AA:#aa-menegroth': 'integra', 'PE:503': 'saqueada', 'PE:504': 'integra', 'PE:506': 'destruida' };

export function faseMenegroth(t: number): FaseMenegroth | null {
  const f = faseAtual(MENEGROTH, t);
  return f ? FASES_MENEGROTH[f.de] ?? null : null;
}

/**
 * Nargothrond: as cavernas de Finrod na margem oeste do Narog. A ponte é construída a conselho
 * de Túrin (c. 490); Glaurung entra por ela em 495 e se deita sobre o tesouro até partir para
 * Brethil (501). Os salões afundam com Beleriand em 587.
 */
export type FaseNargothrond = 'integra' | 'ponte' | 'glaurung' | 'abandonada';

export const NARGOTHROND = lugarPorId.get('nargothrond')!;
/**
 * O marcador fica ~3 km do traçado do Narog; o modelo é assentado na margem oeste, sob Taur-en-Faroth.
 * No modelo, o rio corre ao longo do eixo X local (rio abaixo), em y = 0,2 km; o grupo é girado
 * para que esse eixo siga o trecho do traçado do atlas.
 */
export const MARGEM_NARGOTHROND: [number, number] = [-420.8933, -211.4096];
export const GIRO_NARGOTHROND = Math.atan2(-11, 14);
/** A visita olha rio acima, pela garganta, para a ponte e as Portas de Felagund. */
export const VISTA_NARGOTHROND: Vista = { x: MARGEM_NARGOTHROND[0] + 0.202, y: MARGEM_NARGOTHROND[1] + 0.095, d: 0.8, rumo: 308, inclinacao: 70 };
export const FASES_NARGOTHROND: Record<string, FaseNargothrond> = { 'PE:102': 'integra', 'PE:490': 'ponte', 'PE:495': 'glaurung', 'PE:501': 'abandonada' };

export function faseNargothrond(t: number): FaseNargothrond | null {
  const f = faseAtual(NARGOTHROND, t);
  return f ? FASES_NARGOTHROND[f.de] ?? null : null;
}
