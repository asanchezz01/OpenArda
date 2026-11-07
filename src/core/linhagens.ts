// Linhagens: parentescos dos principais personagens e quem governava cada
// senhorio em cada instante da linha do tempo do atlas.

import linhagensJson from '../../data/linhagens.json';
import retratosJson from '../../data/retratos.json';
import type { FonteRef, TempoRef } from './types';
import { reinoPorId, tempo } from './data';

export type Povo = 'noldor' | 'sindar' | 'teleri' | 'vanyar' | 'maia' | 'edain' | 'meio' | 'dunedain' | 'hobbit' | 'anao' | 'homem' | 'vala' | 'orc';

export const NOME_POVO: Record<Povo, string> = {
  noldor: 'Noldor',
  sindar: 'Sindar',
  teleri: 'Teleri',
  vanyar: 'Vanyar',
  maia: 'Maia',
  edain: 'Edain',
  meio: 'Meio-Elfo',
  dunedain: 'Dúnedain',
  hobbit: 'Hobbits',
  anao: 'Anões',
  homem: 'Homens',
  vala: 'Valar',
  orc: 'Orcs',
};

export interface Pessoa {
  id: string;
  nome: string;
  epiteto?: string;
  povo: Povo;
  pais?: string[];
  elo?: string; // gerações omitidas entre a pessoa e pais[0]
  fem?: boolean;
  datas?: string;
  casa?: string[]; // cônjuge registrado nas fontes (união sem filhos)
  irmaos?: string[]; // irmãos nomeados sem pais registrados
  servo_de?: string[]; // Valar/Maia a quem o Maia atende
  resumo: string;
  fontes: FonteRef[];
}

export interface Governo {
  de?: TempoRef;
  ate?: TempoRef;
  quem?: string[];
  rotulo?: string; // sucessão sem árvore própria ("Reis de Arthedain")
  nota?: string;
}

export interface Senhorio {
  id: string;
  nome?: string;
  reino?: string; // id em data/reinos.json
  lugares?: string[]; // cidades e fortalezas governadas, além das do reino
  substitui?: boolean; // enquanto governa, a cidade deixa de mostrar o governante do reino (ex.: Minas Morgul)
  onde?: string;
  titulo: string;
  governos: Governo[];
  fontes?: FonteRef[];
}

export interface Retrato {
  id: string;
  imagem: string;
  alt: string;
}

const dados = linhagensJson as unknown as { pessoas: Pessoa[]; senhorios: Senhorio[] };
export const pessoas = dados.pessoas;
export const senhorios = dados.senhorios;
export const pessoaPorId = new Map(pessoas.map((p) => [p.id, p]));
// só retratos aprovados (com imagem) aparecem; os cadastrados aguardando geração ficam de fora
const retratoPorId = new Map((retratosJson as unknown as Retrato[]).filter((r) => r.imagem).map((r) => [r.id, r]));

export const retratoDe = (id: string) => retratoPorId.get(id);
export const nomeSenhorio = (s: Senhorio) => s.nome ?? reinoPorId.get(s.reino ?? '')?.nome ?? s.id;
export const senhorioDoReino = (reinoId: string) => senhorios.find((s) => s.reino === reinoId);

/** Senhorios de uma cidade: os ligados a ela pelo nome e o do reino a que pertence. */
export function senhoriosDoLugar(lugarId: string, reinoId: string | undefined, t: number): Senhorio[] {
  const proprios = senhorios.filter((s) => s.lugares?.includes(lugarId));
  const doReino = reinoId ? senhorioDoReino(reinoId) : undefined;
  const sobrepoe = proprios.some((s) => s.substitui && governoEm(s, t));
  const todos = doReino && !sobrepoe && !proprios.includes(doReino) ? [...proprios, doReino] : proprios;
  // sem governo na época, um senhorio só aparece se não houver outro (para mostrar a sucessão de uma cidade caída)
  const ativos = todos.filter((s) => governoEm(s, t));
  return ativos.length ? ativos : todos;
}

const valido = (g: Governo, t: number) => tempo.valido(t, g.de, g.ate);
export const governoEm = (s: Senhorio, t: number) => s.governos.find((g) => valido(g, t));

/** Senhorios com governante no instante t, na ordem dos dados. */
export function senhoriosEm(t: number): { s: Senhorio; g: Governo }[] {
  const out: { s: Senhorio; g: Governo }[] = [];
  for (const s of senhorios) {
    const g = governoEm(s, t);
    if (g) out.push({ s, g });
  }
  return out;
}

/** Senhorios que já acabaram (todos os governos terminaram antes de t) e os que ainda vão surgir. */
export function senhoriosFora(t: number): { caidos: Senhorio[]; futuros: Senhorio[] } {
  const caidos: Senhorio[] = [];
  const futuros: Senhorio[] = [];
  for (const s of senhorios) {
    if (governoEm(s, t)) continue;
    if (t < tempo.fronteira(s.governos[0].de, -Infinity)) futuros.push(s);
    else caidos.push(s);
  }
  return { caidos, futuros };
}

/** Todos os governos exercidos por uma pessoa. */
export function reinadosDe(id: string): { s: Senhorio; g: Governo }[] {
  const out: { s: Senhorio; g: Governo }[] = [];
  for (const s of senhorios) for (const g of s.governos) if (g.quem?.includes(id)) out.push({ s, g });
  return out;
}

export const reinaEm = (id: string, t: number) => reinadosDe(id).filter((x) => valido(x.g, t));

const paisDe = (p: Pessoa) => p.pais ?? [];
export const filhosDe = (id: string) => pessoas.filter((p) => paisDe(p).includes(id));

/** Filhos agrupados pelo outro genitor ('' quando desconhecido). */
export function unioesDe(id: string): [string, Pessoa[]][] {
  const m = new Map<string, Pessoa[]>();
  for (const f of filhosDe(id)) {
    const outro = paisDe(f).find((q) => q !== id) ?? '';
    if (!m.has(outro)) m.set(outro, []);
    m.get(outro)!.push(f);
  }
  return [...m];
}

export function totalDescendentes(id: string, vistos = new Set<string>()): number {
  for (const f of filhosDe(id))
    if (!vistos.has(f.id)) {
      vistos.add(f.id);
      totalDescendentes(f.id, vistos);
    }
  return vistos.size;
}

/** Ascendência por geração (pais, avós, bisavós), como casais. */
export function ascendencia(id: string, geracoes = 3): { pais: string[]; elo?: string }[][] {
  const linhas: { pais: string[]; elo?: string }[][] = [];
  let atual = [id];
  for (let i = 0; i < geracoes && atual.length; i++) {
    const casais: { pais: string[]; elo?: string }[] = [];
    const vistos = new Set<string>();
    for (const c of atual) {
      const p = pessoaPorId.get(c);
      if (!p?.pais?.length) continue;
      const chave = p.pais.join('+');
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      casais.push({ pais: p.pais, elo: p.elo });
    }
    if (!casais.length) break;
    linhas.push(casais);
    atual = casais.flatMap((c) => c.pais);
  }
  return linhas;
}

/** Irmãos e meios-irmãos. Ligações com gerações omitidas não contam como irmandade. */
export function irmaosDe(id: string): { p: Pessoa; meio: boolean }[] {
  const eu = pessoaPorId.get(id);
  if (!eu?.pais?.length || eu.elo) return [];
  const meus = eu.pais;
  return pessoas
    .filter((p) => p.id !== id && !p.elo && paisDe(p).some((q) => meus.includes(q)))
    .map((p) => ({ p, meio: !(paisDe(p).length === meus.length && paisDe(p).every((q) => meus.includes(q))) }));
}

/** Maias que atendem ao Vala/Maia indicado (servo_de). */
export const sequitoDe = (id: string) => pessoas.filter((p) => p.servo_de?.includes(id));
