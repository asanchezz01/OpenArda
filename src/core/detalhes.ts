import { lugarPorId, statusLugar } from './data';
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
