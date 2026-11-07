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
