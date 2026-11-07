// Fotografias dos lugares: imagens geradas a partir das descrições de Tolkien
// (docs/ROADMAP-FOTOGRAFIAS-LUGARES.md), cada uma válida num intervalo da linha do tempo.

import fotografiasJson from '../../data/fotografias.json';
import type { FonteRef, TempoRef } from './types';
import { faseAtual, lugarPorId, reinoPorId, tempo } from './data';

export interface Foto {
  id: string;
  lugar: string;
  quando: TempoRef; // momento retratado
  de?: TempoRef; // validade; por padrão, a fase do lugar que contém "quando"
  ate?: TempoRef;
  titulo: string;
  documentado: string[];
  inferido: string[];
  artistico: string[];
  fontes: FonteRef[];
  alt: string;
  imagem?: string; // só existe depois de aprovada (scripts/gerar-fotografias.py)
  geracao?: Record<string, unknown>;
}

/** Só as fotos aprovadas aparecem na interface. */
export const fotos = (fotografiasJson as Foto[]).filter((f) => f.imagem);

/** Intervalo [de, ate) em que a foto representa o lugar. */
export function validade(f: Foto): [number, number] {
  const l = lugarPorId.get(f.lugar)!;
  const tq = tempo.cursor(f.quando);
  const fase = faseAtual(l, tq);
  const fases = l.fases ?? [];
  const seguinte = fase ? fases[fases.indexOf(fase) + 1] : undefined;
  const de = f.de ?? fase?.de ?? l.de;
  const ate = f.ate ?? seguinte?.de ?? fase?.ate ?? l.ate;
  return [tempo.fronteira(de, -Infinity), tempo.fronteira(ate, Infinity)];
}

export const momento = (f: Foto) => tempo.cursor(f.quando);
const vale = (f: Foto, t: number) => {
  const [a, b] = validade(f);
  return t >= a && t < b;
};

export interface FotosDoLugar {
  /** A foto da época atual ou, sem ela, a de época mais próxima. */
  destaque?: Foto;
  /** O destaque é de outra época (a interface oferece "Ir a esta época"). */
  outraEpoca: boolean;
  todas: Foto[];
}

export function fotosDoLugar(lugarId: string, t: number): FotosDoLugar {
  const todas = fotos.filter((f) => f.lugar === lugarId).sort((a, b) => momento(a) - momento(b));
  const atual = todas.find((f) => vale(f, t));
  if (atual) return { destaque: atual, outraEpoca: false, todas };
  const perto = [...todas].sort((a, b) => Math.abs(momento(a) - t) - Math.abs(momento(b) - t))[0];
  return { destaque: perto, outraEpoca: !!perto, todas };
}

/** Fotos de um reino: as da capital vigente; sem capital nesta época, as da primeira capital. */
export function fotosDoReino(reinoId: string, t: number): FotosDoLugar & { lugar?: string } {
  const r = reinoPorId.get(reinoId);
  const caps = r?.capitais ?? [];
  const vigente = caps.find((c) => tempo.valido(t, c.de, c.ate)) ?? caps[0];
  return vigente ? { ...fotosDoLugar(vigente.lugar, t), lugar: vigente.lugar } : { outraEpoca: false, todas: [] };
}

/** Fotos válidas no instante t (ou todas), na ordem da linha do tempo. */
export function fotosEm(t: number | null): Foto[] {
  return fotos.filter((f) => t == null || vale(f, t)).sort((a, b) => momento(a) - momento(b));
}
