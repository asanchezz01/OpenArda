// Modelo de terreno: transforma as feições vetoriais (costas, cordilheiras,
// rios, florestas...) ativas num período em uma função de altitude contínua.
// A mesma função roda nos workers (malhas) e na thread principal (consultas).

import type { Cadeia, Feicao, Pt } from '../core/types';
import { Noise, hashString, rng, smoothstep, clamp } from './noise';

export interface Amostra {
  h: number; // altitude do terreno (km); negativa = fundo do mar
  agua: number; // nível da água (km) — 0 no mar, nível do lago, -99 sem água (gelo)
  floresta: number;
  especie: number; // 0 folhosa, 1 conífera, 2 dourada, 3 aman, 4 sombria
  pantano: number;
  arido: number;
  cinzas: number;
  neve: number;
  exuberante: number;
  cert: number; // 1 descrito, 0.6 inferido, 0.25 artístico
}

export function novaAmostra(): Amostra {
  return { h: 0, agua: 0, floresta: 0, especie: 0, pantano: 0, arido: 0, cinzas: 0, neve: 0, exuberante: 0, cert: 0.6 };
}

interface Poly {
  pts: Float64Array; // x0,y0,x1,y1,...
  n: number;
  bb: [number, number, number, number];
}

interface MaskPoly extends Poly {
  borda: number;
  valor: number;
  extra: number;
  f: Feicao;
}

interface Linha {
  pts: Float64Array;
  n: number;
  bb: [number, number, number, number];
  f: Feicao;
}

const ESPECIES: Record<string, number> = { folhosa: 0, conifera: 1, dourada: 2, aman: 3, sombria: 4 };
const CERT: Record<string, number> = { descrito: 1, inferido: 0.6, artistico: 0.25 };

export function resolverContorno(f: Feicao, cadeias: Record<string, Cadeia>): { pts: Pt[]; asp: number[] } {
  const out: Pt[] = [];
  const asp: number[] = [];
  const base = f.aspereza ?? 1;
  if (f.circulo) {
    const [cx, cy, r] = f.circulo;
    const n = Math.max(12, Math.round(r / 4));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      asp.push(base);
    }
    return { pts: out, asp };
  }
  for (const item of f.contorno ?? []) {
    if (typeof item === 'string') {
      const rev = item.startsWith('!');
      const nome = rev ? item.slice(1) : item;
      const c = cadeias[nome];
      if (!c) throw new Error(`Cadeia desconhecida: ${nome} em ${f.id}`);
      const pts = rev ? [...c.pts].reverse() : c.pts;
      for (const p of pts) {
        const last = out[out.length - 1];
        if (last && Math.abs(last[0] - p[0]) < 1e-6 && Math.abs(last[1] - p[1]) < 1e-6) continue;
        out.push([p[0], p[1]]);
        asp.push(c.aspereza ?? base);
      }
    } else {
      out.push([item[0], item[1]]);
      asp.push(base);
    }
  }
  const a = out[0];
  const b = out[out.length - 1];
  if (out.length > 1 && Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6) {
    out.pop();
    asp.pop();
  }
  return { pts: out, asp };
}

function area(pts: Pt[]): number {
  let s = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) s += (pts[j][0] - pts[i][0]) * (pts[j][1] + pts[i][1]);
  return s / 2; // > 0 => anti-horário (CCW) com y para cima
}

/** Subdivisão fractal determinística para costas naturais. */
function fractalizar(pts: Pt[], asp: number[], seed: number, minLen: number): Pt[] {
  const rand = rng(seed);
  const out: Pt[] = [];
  const rec = (ax: number, ay: number, bx: number, by: number, rough: number, depth: number) => {
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    if (len < minLen || depth > 9 || rough <= 0) {
      out.push([bx, by]);
      return;
    }
    const amp = Math.min(len * 0.13, 9) * rough * (rand() * 2 - 1);
    const mx = (ax + bx) / 2 - (dy / len) * amp;
    const my = (ay + by) / 2 + (dx / len) * amp;
    rec(ax, ay, mx, my, rough * 0.92, depth + 1);
    rec(mx, my, bx, by, rough * 0.92, depth + 1);
  };
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    if (i === 0) out.push([a[0], a[1]]);
    rec(a[0], a[1], b[0], b[1], asp[i], 0);
  }
  out.pop();
  return out;
}

function toPoly(pts: Pt[]): Poly {
  const arr = new Float64Array(pts.length * 2);
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  pts.forEach((p, i) => {
    arr[i * 2] = p[0];
    arr[i * 2 + 1] = p[1];
    if (p[0] < x0) x0 = p[0];
    if (p[1] < y0) y0 = p[1];
    if (p[0] > x1) x1 = p[0];
    if (p[1] > y1) y1 = p[1];
  });
  return { pts: arr, n: pts.length, bb: [x0, y0, x1, y1] };
}

function toLinha(pts: Pt[], f: Feicao): Linha {
  const p = toPoly(pts);
  return { pts: p.pts, n: p.n, bb: p.bb, f };
}

export function pontoNoPoligono(x: number, y: number, pts: Float64Array, n: number): boolean {
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = pts[i * 2],
      yi = pts[i * 2 + 1],
      xj = pts[j * 2],
      yj = pts[j * 2 + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function pontoNoPoligonoPts(x: number, y: number, pts: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0],
      yi = pts[i][1],
      xj = pts[j][0],
      yj = pts[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Distância de (x,y) à borda do polígono (sem sinal). */
function distBorda(x: number, y: number, pts: Float64Array, n: number, fechado: boolean): number {
  let best = Infinity;
  const m = fechado ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % n;
    const ax = pts[i * 2],
      ay = pts[i * 2 + 1];
    const bx = pts[j * 2],
      by = pts[j * 2 + 1];
    const dx = bx - ax,
      dy = by - ay;
    const l2 = dx * dx + dy * dy;
    let t = l2 > 0 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = ax + t * dx - x,
      ey = ay + t * dy - y;
    const d = ex * ex + ey * ey;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

const CELL = 20; // km — célula do índice espacial das costas
const MASK_RES = 8; // km — resolução da grade de distância grosseira
const M_EXATO = 48; // km — raio da busca exata

export class ModeloTerreno {
  readonly limites: [number, number, number, number];
  readonly noise = new Noise(7);
  readonly noise2 = new Noise(101);
  // costas
  private sx: Float64Array = new Float64Array(0);
  private sy: Float64Array = new Float64Array(0);
  private sNext: Int32Array = new Int32Array(0);
  private sPrev: Int32Array = new Int32Array(0);
  private cellStart: Int32Array = new Int32Array(0);
  private cellItems: Int32Array = new Int32Array(0);
  private gw = 0;
  private gh = 0;
  private mask: Float32Array = new Float32Array(0);
  private mw = 0;
  private mh = 0;
  readonly costas: Pt[][] = [];
  private lagos: (Poly & { nivel: number; prof: number })[] = [];
  private cordilheiras: Linha[] = [];
  private picos: Feicao[] = [];
  private passos: Linha[] = [];
  private planaltos: MaskPoly[] = [];
  private bacias: MaskPoly[] = [];
  private rios: Linha[] = [];
  private florestas: MaskPoly[] = [];
  private biomas: MaskPoly[] = [];
  private gelos: MaskPoly[] = [];
  private zonas: MaskPoly[] = [];

  constructor(feicoes: Feicao[], cadeias: Record<string, Cadeia>, limites: [number, number, number, number]) {
    this.limites = limites;
    const terras: { pts: Pt[]; orig: Pt[] }[] = [];
    for (const f of feicoes) {
      switch (f.tipo) {
        case 'terra': {
          const { pts, asp } = resolverContorno(f, cadeias);
          let p = pts;
          let a = asp;
          if (area(p) < 0) {
            p = [...p].reverse();
            a = [...a].reverse();
            // a aspereza de cada aresta acompanha o vértice inicial
            a = a.slice(1).concat(a.slice(0, 1));
          }
          const fr = fractalizar(p, a, hashString(f.id), 2.2);
          terras.push({ pts: fr, orig: p });
          this.costas.push(fr);
          break;
        }
        case 'lago': {
          const { pts } = resolverContorno(f, cadeias);
          const fr = fractalizar(pts, pts.map(() => f.aspereza ?? 0.6), hashString(f.id), 1.5);
          this.lagos.push({ ...toPoly(fr), nivel: Number(f.nivel ?? 0.1), prof: f.prof ?? 0.04 });
          break;
        }
        case 'cordilheira': {
          const pts = f.pts ?? [];
          const closed = f.fechada ? [...pts, pts[0]] : pts;
          this.cordilheiras.push(toLinha(closed, f));
          break;
        }
        case 'pico':
          this.picos.push(f);
          break;
        case 'passo':
          this.passos.push(toLinha(f.pts ?? [], f));
          break;
        case 'rio':
          this.rios.push(toLinha(f.pts ?? [], f));
          break;
        case 'planalto':
        case 'bacia':
        case 'floresta':
        case 'bioma':
        case 'gelo':
        case 'zona': {
          const { pts } = resolverContorno(f, cadeias);
          const mp: MaskPoly = {
            ...toPoly(pts),
            borda: f.borda ?? 15,
            valor: f.tipo === 'planalto' ? f.h ?? 0.3 : f.tipo === 'bacia' ? f.piso ?? 0.3 : f.densidade ?? 1,
            extra: f.tipo === 'floresta' ? ESPECIES[f.especie ?? 'folhosa'] : f.tipo === 'zona' ? CERT[(f.nivel as unknown as string) ?? 'inferido'] ?? 0.6 : 0,
            f,
          };
          if (f.tipo === 'planalto') this.planaltos.push(mp);
          else if (f.tipo === 'bacia') this.bacias.push(mp);
          else if (f.tipo === 'floresta') this.florestas.push(mp);
          else if (f.tipo === 'bioma') this.biomas.push(mp);
          else if (f.tipo === 'gelo') this.gelos.push(mp);
          else this.zonas.push(mp);
          break;
        }
        default:
          break;
      }
    }
    this.construirIndice(terras);
  }

  private construirIndice(terras: { pts: Pt[]; orig: Pt[] }[]) {
    const [x0, y0, x1, y1] = this.limites;
    let total = 0;
    for (const t of terras) total += t.pts.length;
    this.sx = new Float64Array(total);
    this.sy = new Float64Array(total);
    this.sNext = new Int32Array(total);
    this.sPrev = new Int32Array(total);
    let k = 0;
    for (const t of terras) {
      const start = k;
      const n = t.pts.length;
      for (let i = 0; i < n; i++) {
        this.sx[k] = t.pts[i][0];
        this.sy[k] = t.pts[i][1];
        this.sNext[k] = start + ((i + 1) % n);
        this.sPrev[k] = start + ((i - 1 + n) % n);
        k++;
      }
    }
    this.gw = Math.ceil((x1 - x0) / CELL);
    this.gh = Math.ceil((y1 - y0) / CELL);
    const counts = new Int32Array(this.gw * this.gh + 1);
    const cellsOf = (i: number, cb: (c: number) => void) => {
      const j = this.sNext[i];
      const ax = this.sx[i],
        ay = this.sy[i],
        bx = this.sx[j],
        by = this.sy[j];
      const cx0 = clamp(Math.floor((Math.min(ax, bx) - x0) / CELL), 0, this.gw - 1);
      const cx1 = clamp(Math.floor((Math.max(ax, bx) - x0) / CELL), 0, this.gw - 1);
      const cy0 = clamp(Math.floor((Math.min(ay, by) - y0) / CELL), 0, this.gh - 1);
      const cy1 = clamp(Math.floor((Math.max(ay, by) - y0) / CELL), 0, this.gh - 1);
      for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) cb(cy * this.gw + cx);
    };
    for (let i = 0; i < total; i++) cellsOf(i, (c) => counts[c + 1]++);
    for (let c = 0; c < this.gw * this.gh; c++) counts[c + 1] += counts[c];
    this.cellStart = counts;
    this.cellItems = new Int32Array(counts[this.gw * this.gh]);
    const fill = new Int32Array(this.gw * this.gh);
    for (let i = 0; i < total; i++)
      cellsOf(i, (c) => {
        this.cellItems[counts[c] + fill[c]++] = i;
      });

    // grade grosseira: terra/mar via varredura, depois distância por chanfro
    this.mw = Math.ceil((x1 - x0) / MASK_RES);
    this.mh = Math.ceil((y1 - y0) / MASK_RES);
    const inside = new Uint8Array(this.mw * this.mh);
    const polys = terras.map((t) => toPoly(t.orig));
    for (let row = 0; row < this.mh; row++) {
      const y = y0 + (row + 0.5) * MASK_RES;
      const xs: number[] = [];
      for (const p of polys) {
        if (y < p.bb[1] || y > p.bb[3]) continue;
        for (let i = 0, j = p.n - 1; i < p.n; j = i++) {
          const yi = p.pts[i * 2 + 1],
            yj = p.pts[j * 2 + 1];
          if (yi > y !== yj > y) {
            const xi = p.pts[i * 2],
              xj = p.pts[j * 2];
            xs.push(((xj - xi) * (y - yi)) / (yj - yi) + xi);
          }
        }
      }
      xs.sort((a, b) => a - b);
      for (let q = 0; q + 1 < xs.length; q += 2) {
        const c0 = Math.max(0, Math.ceil((xs[q] - x0) / MASK_RES - 0.5));
        const c1 = Math.min(this.mw - 1, Math.floor((xs[q + 1] - x0) / MASK_RES - 0.5));
        for (let c = c0; c <= c1; c++) inside[row * this.mw + c] = 1;
      }
    }
    // chanfro 3-4 em duas passagens para terra e mar
    const INF = 1e9;
    const dIn = new Float32Array(this.mw * this.mh);
    const dOut = new Float32Array(this.mw * this.mh);
    for (let i = 0; i < dIn.length; i++) {
      dIn[i] = inside[i] ? INF : 0;
      dOut[i] = inside[i] ? 0 : INF;
    }
    const chamfer = (d: Float32Array) => {
      const w = this.mw,
        h = this.mh;
      const a = 1,
        b = Math.SQRT2;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          let v = d[i];
          if (v === 0) continue;
          if (x > 0) v = Math.min(v, d[i - 1] + a);
          if (y > 0) {
            v = Math.min(v, d[i - w] + a);
            if (x > 0) v = Math.min(v, d[i - w - 1] + b);
            if (x < w - 1) v = Math.min(v, d[i - w + 1] + b);
          }
          d[i] = v;
        }
      for (let y = h - 1; y >= 0; y--)
        for (let x = w - 1; x >= 0; x--) {
          const i = y * w + x;
          let v = d[i];
          if (v === 0) continue;
          if (x < w - 1) v = Math.min(v, d[i + 1] + a);
          if (y < h - 1) {
            v = Math.min(v, d[i + w] + a);
            if (x < w - 1) v = Math.min(v, d[i + w + 1] + b);
            if (x > 0) v = Math.min(v, d[i + w - 1] + b);
          }
          d[i] = v;
        }
    };
    chamfer(dIn);
    chamfer(dOut);
    this.mask = new Float32Array(this.mw * this.mh);
    for (let i = 0; i < this.mask.length; i++) {
      this.mask[i] = inside[i] ? (dIn[i] - 0.5) * MASK_RES : -(dOut[i] - 0.5) * MASK_RES;
    }
  }

  private distGrosseira(x: number, y: number): number {
    const [x0, y0] = this.limites;
    const fx = clamp((x - x0) / MASK_RES - 0.5, 0, this.mw - 1.001);
    const fy = clamp((y - y0) / MASK_RES - 0.5, 0, this.mh - 1.001);
    const ix = Math.floor(fx),
      iy = Math.floor(fy);
    const tx = fx - ix,
      ty = fy - iy;
    const w = this.mw;
    const a = this.mask[iy * w + ix],
      b = this.mask[iy * w + ix + 1];
    const c = this.mask[(iy + 1) * w + ix],
      d = this.mask[(iy + 1) * w + ix + 1];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  }

  /** Distância com sinal até a costa (km): positiva em terra. */
  distCosta(x: number, y: number): number {
    const [x0, y0] = this.limites;
    const cx = Math.floor((x - x0) / CELL);
    const cy = Math.floor((y - y0) / CELL);
    let best = Infinity;
    let bi = -1;
    let bt = 0;
    const maxRing = Math.ceil(M_EXATO / CELL) + 1;
    for (let ring = 0; ring <= maxRing; ring++) {
      for (let gy = cy - ring; gy <= cy + ring; gy++) {
        if (gy < 0 || gy >= this.gh) continue;
        const edge = gy === cy - ring || gy === cy + ring;
        for (let gx = cx - ring; gx <= cx + ring; gx += edge ? 1 : 2 * ring || 1) {
          if (gx < 0 || gx >= this.gw) continue;
          const c = gy * this.gw + gx;
          for (let k = this.cellStart[c]; k < this.cellStart[c + 1]; k++) {
            const i = this.cellItems[k];
            const j = this.sNext[i];
            const ax = this.sx[i],
              ay = this.sy[i];
            const dx = this.sx[j] - ax,
              dy = this.sy[j] - ay;
            const l2 = dx * dx + dy * dy;
            let t = l2 > 0 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            const ex = ax + t * dx - x,
              ey = ay + t * dy - y;
            const d = ex * ex + ey * ey;
            if (d < best) {
              best = d;
              bi = i;
              bt = t;
            }
          }
        }
      }
      if (bi >= 0 && Math.sqrt(best) <= ring * CELL) break;
    }
    if (bi < 0 || Math.sqrt(best) > M_EXATO) {
      return this.distGrosseira(x, y);
    }
    const dist = Math.sqrt(best);
    const left = (i: number) => {
      const j = this.sNext[i];
      return (this.sx[j] - this.sx[i]) * (y - this.sy[i]) - (this.sy[j] - this.sy[i]) * (x - this.sx[i]) > 0;
    };
    let dentro: boolean;
    if (bt > 1e-6 && bt < 1 - 1e-6) dentro = left(bi);
    else {
      const v = bt <= 1e-6 ? bi : this.sNext[bi];
      const e1 = this.sPrev[v];
      const e2 = v;
      const u = e1,
        w = this.sNext[v];
      const convexo =
        (this.sx[v] - this.sx[u]) * (this.sy[w] - this.sy[v]) - (this.sy[v] - this.sy[u]) * (this.sx[w] - this.sx[v]) > 0;
      dentro = convexo ? left(e1) && left(e2) : left(e1) || left(e2);
    }
    return dentro ? dist : -dist;
  }

  private mascara(m: MaskPoly, x: number, y: number): number {
    const b = m.borda;
    if (x < m.bb[0] - 1 || x > m.bb[2] + 1 || y < m.bb[1] - 1 || y > m.bb[3] + 1) return 0;
    if (!pontoNoPoligono(x, y, m.pts, m.n)) return 0;
    const d = distBorda(x, y, m.pts, m.n, true);
    return smoothstep(0, b, d);
  }

  /** Máscara com bordas irregulares: deformação proporcional ao tamanho do polígono. */
  private mascaraOrganica(m: MaskPoly, x: number, y: number, semente: number): number {
    const tam = Math.max(m.bb[2] - m.bb[0], m.bb[3] - m.bb[1]);
    const a = Math.min(55, Math.max(5, tam * 0.1));
    const lim = a * 1.6;
    if (x < m.bb[0] - lim || x > m.bb[2] + lim || y < m.bb[1] - lim || y > m.bb[3] + lim) return 0;
    const f = Math.max(20, tam * 0.28);
    const N = this.noise2;
    const wx = x + N.fbm(x / f + semente, y / f, 3) * a + N.simplex(x / (f * 0.25), y / (f * 0.25) + semente) * a * 0.3;
    const wy = y + N.fbm(x / f, y / f - semente, 3) * a + N.simplex(x / (f * 0.25) - semente, y / (f * 0.25)) * a * 0.3;
    const v = this.mascara(m, wx, wy);
    if (v <= 0) return 0;
    const n = N.fbm(x / 9 + semente, y / 9, 3);
    return smoothstep(0.28, 0.62, v * 0.95 + n * 0.32);
  }

  private distLinha(l: Linha, x: number, y: number, maxD: number): number {
    if (x < l.bb[0] - maxD || x > l.bb[2] + maxD || y < l.bb[1] - maxD || y > l.bb[3] + maxD) return Infinity;
    return distBorda(x, y, l.pts, l.n, false);
  }

  /** Altura apenas das montanhas (sem ruído) — usada para calcular sombras de luz. */
  oclusor(x: number, y: number): number {
    let mont = 0;
    for (const c of this.cordilheiras) {
      const w = c.f.w ?? 30;
      const d = this.distLinha(c, x, y, w);
      if (d >= w) continue;
      const t = d / w;
      const v = (c.f.h ?? 2) * (1 - t * t) * (1 - t * t);
      if (v > mont) mont = v;
    }
    for (const p of this.picos) {
      const [px, py] = p.em!;
      const r = p.r ?? 10;
      const dd = Math.hypot(x - px, y - py);
      if (dd > r * 1.6) continue;
      const v = (p.h ?? 1) * Math.exp(-3 * (dd / r) * (dd / r));
      if (v > mont) mont = v;
    }
    for (const c of this.passos) {
      const w = c.f.w ?? 10;
      const d = this.distLinha(c, x, y, w);
      if (d >= w) continue;
      const m = 1 - smoothstep(w * 0.45, w, d);
      mont = mont * (1 - m) + Math.min(mont, c.f.piso ?? 0.3) * m;
    }
    return Math.max(0.25, mont);
  }

  /** Amostra completa do terreno no ponto (x, y). */
  amostrar(x: number, y: number, o: Amostra): Amostra {
    const N = this.noise;
    const n1 = N.fbm(x / 520, y / 520, 3);
    const n2 = N.fbm(x / 70, y / 70, 4);
    // certeza cartográfica
    let cert = 0.6;
    let zmax = 0;
    for (const z of this.zonas) {
      const m = this.mascara(z, x, y);
      if (m > zmax) {
        zmax = m;
        cert = 0.6 + (z.extra - 0.6) * m;
      }
    }
    const detalhe = 0.35 + 0.65 * cert;
    const d = this.distCosta(x, y);
    let h: number;
    let agua = 0;
    let gelo = 0;
    if (d > 0) {
      const ramp = smoothstep(0, 55, d);
      const nd = N.fbm(x / 9, y / 9, 3) * detalhe;
      let base = 0.008 + ramp * (0.09 + 0.11 * (n1 * 0.5 + 0.5)) + 0.05 * n2 * ramp + 0.012 * nd * smoothstep(0, 6, d);
      // planaltos (soma) e bacias (achatamento)
      for (const p of this.planaltos) {
        const m = this.mascara(p, x + n2 * 6, y - n2 * 6);
        if (m > 0) base += m * p.valor * (0.75 + 0.35 * (N.fbm(x / 22, y / 22, 3) * 0.5 + 0.5));
      }
      for (const b of this.bacias) {
        const m = this.mascara(b, x, y);
        if (m > 0) base = base * (1 - m) + (b.valor + 0.015 * nd) * m;
      }
      // cordilheiras e picos
      let mont = 0;
      const wx = x + N.simplex(x / 60, y / 60) * 9;
      const wy = y + N.simplex(x / 60 + 40, y / 60 - 17) * 9;
      for (const c of this.cordilheiras) {
        const w = c.f.w ?? 30;
        const dd = this.distLinha(c, wx, wy, w);
        if (dd >= w) continue;
        const t = dd / w;
        const prof = (1 - t * t) * (1 - t * t);
        const rid = N.ridged(x / (w * 0.42), y / (w * 0.42), 5);
        const var1 = 0.78 + 0.32 * this.noise2.fbm(x / (w * 4), y / (w * 4), 2);
        const v = (c.f.h ?? 2) * prof * var1 * (0.42 + 0.58 * rid * (0.55 + 0.45 * detalhe));
        mont = Math.max(mont, v);
      }
      for (const p of this.picos) {
        const [px, py] = p.em!;
        const r = p.r ?? 10;
        const dd = Math.hypot(x - px, y - py);
        if (dd > r * 1.8) continue;
        const q = dd / r;
        const forma = p.forma === 'cone' ? Math.pow(Math.max(0, 1 - q), 1.35) : Math.exp(-3 * q * q);
        const v = (p.h ?? 1) * forma * (0.9 + 0.1 * N.ridged(x / 4, y / 4, 3));
        mont = Math.max(mont, v);
      }
      for (const c of this.passos) {
        const w = c.f.w ?? 10;
        const dd = this.distLinha(c, x, y, w);
        if (dd >= w) continue;
        const m = 1 - smoothstep(w * 0.4, w, dd);
        const piso = (c.f.piso ?? 0.3) + 0.04 * n2;
        mont = mont * (1 - m) + Math.min(mont, piso) * m;
        base = base * (1 - m) + Math.min(base, piso) * m;
      }
      h = base + mont * smoothstep(0, 5, d);
      // rios escavam vales
      for (const r of this.rios) {
        const ordem = r.f.ordem ?? 2;
        const rw = ordem === 1 ? 7 : ordem === 2 ? 4.5 : 3;
        const dd = this.distLinha(r, x, y, rw);
        if (dd >= rw) continue;
        const m = 1 - smoothstep(0, rw, dd);
        const carve = m * Math.min(h * 0.55, 0.02 + 0.22 * Math.min(h, 0.5));
        h -= carve;
      }
      h = Math.max(h, 0.002);
      // lagos
      for (const l of this.lagos) {
        if (x < l.bb[0] || x > l.bb[2] || y < l.bb[1] || y > l.bb[3]) continue;
        if (!pontoNoPoligono(x, y, l.pts, l.n)) continue;
        const db = distBorda(x, y, l.pts, l.n, true);
        const fundo = l.nivel - 0.004 - l.prof * smoothstep(0, 12, db);
        // ilhas dentro de lagos surgem de montanhas/picos
        h = Math.min(h, fundo) + Math.max(0, mont - l.nivel);
        agua = l.nivel;
      }
    } else {
      const dd = -d;
      const shelf = 0.025 + 0.14 * smoothstep(0, 45, dd);
      const deep = 3.6 * smoothstep(25, 380, dd);
      h = -(shelf + deep * (0.8 + 0.25 * n1)) + 0.03 * n2;
      h = Math.min(h, -0.004);
    }
    // gelo marinho
    for (const g of this.gelos) {
      const m = this.mascara(g, x + n2 * 10, y);
      if (m > 0.02 && h < 0.03) {
        gelo = Math.max(gelo, m);
      }
    }
    if (gelo > 0.5) {
      h = Math.max(h, 0.006 + 0.03 * N.ridged(x / 7, y / 7, 3) * gelo);
      agua = -99;
    }
    o.h = h;
    o.agua = agua;
    o.cert = cert;
    // vegetação e biomas
    o.floresta = 0;
    o.especie = 0;
    o.pantano = 0;
    o.arido = 0;
    o.cinzas = 0;
    o.neve = gelo;
    o.exuberante = 0;
    if (h > 0 && agua !== -99) {
      let k = 0;
      for (const f of this.florestas) {
        const m = this.mascaraOrganica(f, x, y, 3.7 * ++k);
        if (m <= 0) continue;
        const dens = m * f.valor * (0.65 + 0.45 * (N.fbm(x / 5, y / 5, 2) * 0.5 + 0.5));
        if (dens > o.floresta) {
          o.floresta = Math.min(1, dens);
          o.especie = f.extra;
        }
      }
      for (const b of this.biomas) {
        const m = this.mascaraOrganica(b, x, y, 5.3 * ++k) * b.valor;
        if (m <= 0) continue;
        switch (b.f.bioma) {
          case 'pantano':
            o.pantano = Math.max(o.pantano, m);
            break;
          case 'arido':
            o.arido = Math.max(o.arido, m);
            break;
          case 'cinzas':
            o.cinzas = Math.max(o.cinzas, m);
            break;
          case 'neve':
            o.neve = Math.max(o.neve, m);
            break;
          case 'exuberante':
            o.exuberante = Math.max(o.exuberante, m);
            break;
        }
      }
      if (o.cinzas > 0.3) o.floresta *= 1 - o.cinzas;
    }
    return o;
  }

  /** Altura rápida para consultas na thread principal. */
  altura(x: number, y: number): number {
    const a = this.amostrar(x, y, tmp);
    return Math.max(a.h, a.agua === -99 ? a.h : a.agua);
  }
}

const tmp = novaAmostra();
