// Linha do tempo unificada. Cada era ocupa o intervalo [i, i+1) do eixo t.
// Eras datadas avançam por ano; eras sem datas (Lâmpadas, Árvores) avançam pela
// sequência dos acontecimentos, sem inventar anos.

import type { Era, Evento, TempoRef } from './types';

export class LinhaDoTempo {
  readonly eras: Era[];
  readonly eventos: Evento[];
  private porId = new Map<string, Evento>();
  private seqPorEra = new Map<string, Evento[]>();
  readonly ordenados: { ev: Evento; t: number }[] = [];

  constructor(eras: Era[], eventos: Evento[]) {
    this.eras = eras;
    this.eventos = eventos;
    for (const e of eventos) this.porId.set(e.id, e);
    for (const era of eras) {
      const lista = eventos.filter((e) => e.era === era.id);
      if (era.datada) {
        lista.sort((a, b) => (a.ano ?? 0) - (b.ano ?? 0) || (a.seq ?? 0) - (b.seq ?? 0));
      } else {
        lista.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
      }
      this.seqPorEra.set(era.id, lista);
    }
    for (const e of eventos) this.ordenados.push({ ev: e, t: this.tEvento(e) });
    this.ordenados.sort((a, b) => a.t - b.t);
  }

  eraIndex(id: string): number {
    const i = this.eras.findIndex((e) => e.id === id);
    if (i < 0) throw new Error(`Era desconhecida: ${id}`);
    return i;
  }

  evento(id: string): Evento | undefined {
    return this.porId.get(id);
  }

  /** t do centro de um ano numa era datada. */
  tAno(eraId: string, ano: number): number {
    const i = this.eraIndex(eraId);
    const era = this.eras[i];
    const len = era.fim! - era.inicio! + 1;
    const a = Math.min(Math.max(ano, era.inicio!), era.fim!);
    return i + (a - era.inicio! + 0.5) / len;
  }

  /** t do início de um ano (fronteira de validade). */
  tInicioAno(eraId: string, ano: number): number {
    const i = this.eraIndex(eraId);
    const era = this.eras[i];
    const len = era.fim! - era.inicio! + 1;
    return i + (ano - era.inicio!) / len;
  }

  private slot(e: Evento): { i: number; n: number; k: number } {
    const i = this.eraIndex(e.era);
    const lista = this.seqPorEra.get(e.era)!;
    return { i, n: lista.length, k: lista.indexOf(e) };
  }

  tEvento(e: Evento): number {
    const era = this.eras[this.eraIndex(e.era)];
    if (era.datada && e.ano != null) return this.tAno(e.era, e.ano);
    const { i, n, k } = this.slot(e);
    return i + (k + 0.5) / Math.max(1, n);
  }

  tInicioEvento(e: Evento): number {
    const era = this.eras[this.eraIndex(e.era)];
    if (era.datada && e.ano != null) return this.tInicioAno(e.era, e.ano);
    const { i, n, k } = this.slot(e);
    return i + k / Math.max(1, n);
  }

  /** Converte uma referência temporal numa fronteira do eixo t. */
  fronteira(ref: TempoRef | undefined, padrao: number): number {
    if (ref == null) return padrao;
    if (ref === '-inf') return -Infinity;
    if (ref === '+inf') return Infinity;
    const m = ref.match(/^(?:([A-Z]{2}):)?(#?)(.+)$/);
    if (!m) throw new Error(`Referência temporal inválida: ${ref}`);
    const [, eraId, hash, resto] = m;
    if (hash) {
      const ev = this.porId.get(resto);
      if (!ev) throw new Error(`Evento desconhecido na referência ${ref}`);
      return this.tInicioEvento(ev);
    }
    if (!eraId) throw new Error(`Referência sem era: ${ref}`);
    if (resto === 'inicio') return this.eraIndex(eraId);
    if (resto === 'fim') return this.eraIndex(eraId) + 1;
    return this.tInicioAno(eraId, Number(resto));
  }

  /** Converte uma referência num cursor (centro do ano/evento). */
  cursor(ref: TempoRef): number {
    const m = ref.match(/^(?:([A-Z]{2}):)?(#?)(.+)$/);
    if (!m) throw new Error(`Referência temporal inválida: ${ref}`);
    const [, eraId, hash, resto] = m;
    if (hash) {
      const ev = this.porId.get(resto);
      if (!ev) throw new Error(`Evento desconhecido: ${resto}`);
      return this.tEvento(ev);
    }
    if (resto === 'inicio') {
      const i = this.eraIndex(eraId);
      const era = this.eras[i];
      return era.datada ? this.tAno(eraId, era.inicio!) : this.primeiroDaEra(i);
    }
    if (resto === 'fim') {
      const i = this.eraIndex(eraId);
      const era = this.eras[i];
      return era.datada ? this.tAno(eraId, era.fim!) : this.ultimoDaEra(i);
    }
    return this.tAno(eraId, Number(resto));
  }

  primeiroDaEra(i: number): number {
    const lista = this.seqPorEra.get(this.eras[i].id)!;
    return lista.length ? this.tEvento(lista[0]) : i + 0.5;
  }
  ultimoDaEra(i: number): number {
    const lista = this.seqPorEra.get(this.eras[i].id)!;
    return lista.length ? this.tEvento(lista[lista.length - 1]) : i + 0.5;
  }

  valido(t: number, de?: TempoRef, ate?: TempoRef): boolean {
    return t >= this.fronteira(de, -Infinity) && t < this.fronteira(ate, Infinity);
  }

  eraDe(t: number): Era {
    const i = Math.min(this.eras.length - 1, Math.max(0, Math.floor(t)));
    return this.eras[i];
  }

  /** Ano (inteiro) numa era datada, ou null. */
  anoDe(t: number): number | null {
    const era = this.eraDe(t);
    if (!era.datada) return null;
    const i = this.eraIndex(era.id);
    const len = era.fim! - era.inicio! + 1;
    return era.inicio! + Math.min(len - 1, Math.max(0, Math.floor((t - i) * len + 1e-7)));
  }

  /** Último acontecimento com início ≤ t. */
  eventoAtual(t: number): Evento | undefined {
    let best: Evento | undefined;
    for (const o of this.ordenados) {
      if (this.tInicioEvento(o.ev) <= t + 1e-9) best = o.ev;
      else break;
    }
    return best;
  }

  rotulo(t: number): { principal: string; secundario: string; incerto: boolean } {
    const era = this.eraDe(t);
    if (era.datada) {
      const ano = this.anoDe(t)!;
      return { principal: `${ano} ${era.abrev}`, secundario: era.nome, incerto: false };
    }
    const i = this.eraIndex(era.id);
    const lista = this.seqPorEra.get(era.id)!;
    const n = Math.max(1, lista.length);
    const k = Math.min(n - 1, Math.max(0, Math.floor((t - i) * n)));
    const ev = lista[k];
    return {
      principal: era.nome,
      secundario: ev ? `Sequência ${k + 1}/${n}: ${ev.titulo}` : 'sem acontecimentos registrados',
      incerto: true,
    };
  }

  passoAno(t: number, delta: number): number {
    const era = this.eraDe(t);
    const i = this.eraIndex(era.id);
    if (!era.datada) return this.passoEvento(t, delta > 0 ? 1 : -1);
    const ano = this.anoDe(t)! + delta;
    if (ano > era.fim!) {
      if (i + 1 >= this.eras.length) return this.tAno(era.id, era.fim!);
      const prox = this.eras[i + 1];
      return prox.datada ? this.tAno(prox.id, prox.inicio! + (ano - era.fim! - 1)) : this.primeiroDaEra(i + 1);
    }
    if (ano < era.inicio!) {
      if (i === 0) return this.tAno(era.id, era.inicio!);
      const ant = this.eras[i - 1];
      return ant.datada ? this.tAno(ant.id, ant.fim! - (era.inicio! - ano - 1)) : this.ultimoDaEra(i - 1);
    }
    return this.tAno(era.id, ano);
  }

  /** Salta para o próximo (+1) ou anterior (−1) acontecimento. */
  passoEvento(t: number, dir: 1 | -1): number {
    if (dir > 0) {
      for (const o of this.ordenados) if (o.t > t + 1e-7) return o.t;
      return t;
    }
    for (let k = this.ordenados.length - 1; k >= 0; k--) if (this.ordenados[k].t < t - 1e-7) return this.ordenados[k].t;
    return t;
  }

  eventosEntre(t0: number, t1: number): Evento[] {
    const lo = Math.min(t0, t1),
      hi = Math.max(t0, t1);
    return this.ordenados.filter((o) => this.tInicioEvento(o.ev) > lo && this.tInicioEvento(o.ev) <= hi).map((o) => o.ev);
  }

  /** Texto de data de um evento, sem inventar anos. */
  dataEvento(e: Evento): string {
    const era = this.eras[this.eraIndex(e.era)];
    if (era.datada && e.ano != null) return `${e.aprox ? 'c. ' : ''}${e.ano} ${era.abrev}`;
    const lista = this.seqPorEra.get(e.era)!;
    return `${era.nome} — ${lista.indexOf(e) + 1}º na sequência (sem ano no relato)`;
  }

  /** Serializa t como referência curta para links. */
  serializar(t: number): string {
    const era = this.eraDe(t);
    if (era.datada) return `${era.id}.${this.anoDe(t)}`;
    const ev = this.eventoAtual(t);
    return ev ? `${era.id}.${ev.id}` : `${era.id}.inicio`;
  }

  desserializar(s: string): number | null {
    const m = s.match(/^([A-Z]{2})\.(.+)$/);
    if (!m) return null;
    try {
      const era = this.eras[this.eraIndex(m[1])];
      if (era.datada && /^-?\d+$/.test(m[2])) return this.tAno(m[1], Number(m[2]));
      if (m[2] === 'inicio') return this.cursor(`${m[1]}:inicio`);
      return this.cursor(`#${m[2]}`);
    } catch {
      return null;
    }
  }
}
