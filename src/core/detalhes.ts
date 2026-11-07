import { faseAtual, lugarPorId, statusLugar } from './data';
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
