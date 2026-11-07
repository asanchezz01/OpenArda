/// <reference lib="webworker" />
// Worker que gera as grades de altitude dos ladrilhos do terreno.

import { ModeloTerreno, novaAmostra } from './model';
import type { Cadeia, Feicao } from '../core/types';

interface MsgModelo {
  tipo: 'modelo';
  assinatura: string;
  feicoes: Feicao[];
  cadeias: Record<string, Cadeia>;
  limites: [number, number, number, number];
}
interface MsgTile {
  tipo: 'tile';
  id: number;
  assinatura: string;
  x0: number;
  y0: number;
  tamanho: number;
  res: number;
  luz?: { x: number; y: number; h: number; raio: number } | null;
}

const modelos = new Map<string, ModeloTerreno>();
const ordem: string[] = [];

self.onmessage = (ev: MessageEvent<MsgModelo | MsgTile>) => {
  const m = ev.data;
  if (m.tipo === 'modelo') {
    if (!modelos.has(m.assinatura)) {
      modelos.set(m.assinatura, new ModeloTerreno(m.feicoes, m.cadeias, m.limites));
      ordem.push(m.assinatura);
      while (ordem.length > 6) modelos.delete(ordem.shift()!);
    }
    return;
  }
  const modelo = modelos.get(m.assinatura);
  if (!modelo) {
    (self as unknown as Worker).postMessage({ tipo: 'erro', id: m.id, msg: 'modelo ausente' });
    return;
  }
  const r = gerar(modelo, m);
  (self as unknown as Worker).postMessage(r, [r.h.buffer, r.agua.buffer, r.grad.buffer, r.bio.buffer, r.extra.buffer, r.vis.buffer]);
};

function gerar(modelo: ModeloTerreno, m: MsgTile) {
  const n = m.res + 1;
  const g = n + 2;
  const passo = m.tamanho / m.res;
  const hg = new Float32Array(g * g);
  const a = novaAmostra();
  const h = new Float32Array(n * n);
  const agua = new Float32Array(n * n);
  const bio = new Float32Array(n * n * 4);
  const extra = new Float32Array(n * n * 4);
  for (let j = 0; j < g; j++) {
    const y = m.y0 + (j - 1) * passo;
    for (let i = 0; i < g; i++) {
      const x = m.x0 + (i - 1) * passo;
      modelo.amostrar(x, y, a);
      hg[j * g + i] = a.h;
      if (i >= 1 && i <= n && j >= 1 && j <= n) {
        const k = (j - 1) * n + (i - 1);
        h[k] = a.h;
        agua[k] = a.agua;
        bio[k * 4] = a.floresta;
        bio[k * 4 + 1] = a.pantano;
        bio[k * 4 + 2] = Math.max(a.arido, a.cinzas * 0.001);
        bio[k * 4 + 3] = a.cinzas;
        extra[k * 4] = a.neve;
        extra[k * 4 + 1] = a.especie;
        extra[k * 4 + 2] = a.cert;
        extra[k * 4 + 3] = a.exuberante;
      }
    }
  }
  const grad = new Float32Array(n * n * 2);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const c = (j + 1) * g + (i + 1);
      // superfícies d'água são planas para o sombreamento
      const k = j * n + i;
      const w = agua[k];
      const hx0 = Math.max(hg[c - 1], w > -50 ? w : -99);
      const hx1 = Math.max(hg[c + 1], w > -50 ? w : -99);
      const hy0 = Math.max(hg[c - g], w > -50 ? w : -99);
      const hy1 = Math.max(hg[c + g], w > -50 ? w : -99);
      grad[k * 2] = (hx1 - hx0) / (2 * passo);
      grad[k * 2 + 1] = (hy1 - hy0) / (2 * passo);
    }
  // visibilidade da luz das Duas Árvores (o relevo decide quem a vê)
  const vis = new Float32Array(n * n);
  const L = m.luz;
  let temLuz = 0;
  if (L) {
    const cx = m.x0 + m.tamanho / 2,
      cy = m.y0 + m.tamanho / 2;
    const dc = Math.hypot(cx - L.x, cy - L.y) - m.tamanho * 0.75;
    if (dc < L.raio) {
      temLuz = 1;
      const q = 33;
      const vg = new Float32Array(q * q);
      for (let j = 0; j < q; j++)
        for (let i = 0; i < q; i++) {
          const x = m.x0 + (i / (q - 1)) * m.tamanho;
          const y = m.y0 + (j / (q - 1)) * m.tamanho;
          const ii = Math.round((i / (q - 1)) * m.res),
            jj = Math.round((j / (q - 1)) * m.res);
          const hp = Math.max(h[jj * n + ii], 0) + 0.01;
          vg[j * q + i] = visLuz(modelo, x, y, hp, L);
        }
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          const fx = (i / m.res) * (q - 1),
            fy = (j / m.res) * (q - 1);
          const ix = Math.min(q - 2, Math.floor(fx)),
            iy = Math.min(q - 2, Math.floor(fy));
          const tx = fx - ix,
            ty = fy - iy;
          const v =
            (vg[iy * q + ix] * (1 - tx) + vg[iy * q + ix + 1] * tx) * (1 - ty) +
            (vg[(iy + 1) * q + ix] * (1 - tx) + vg[(iy + 1) * q + ix + 1] * tx) * ty;
          vis[j * n + i] = v;
        }
    }
  }
  // extra = (neve, espécie, certeza, exuberância); vis = luz das Árvores visível
  return { tipo: 'tile' as const, id: m.id, assinatura: m.assinatura, temLuz, h, agua, grad, bio, extra, vis };
}

function visLuz(modelo: ModeloTerreno, x: number, y: number, hp: number, L: { x: number; y: number; h: number; raio: number }): number {
  const dx = L.x - x,
    dy = L.y - y;
  const D = Math.hypot(dx, dy);
  if (D > L.raio) return 0;
  if (D < 8) return 1;
  const passos = Math.min(140, Math.max(24, Math.round(D / 5)));
  let minFolga = Infinity;
  for (let s = 1; s < passos; s++) {
    const f = s / passos;
    const dist = f * D;
    if (dist < 3) continue;
    const px = x + dx * f,
      py = y + dy * f;
    const linha = hp + (L.h - hp) * f;
    const occ = modelo.oclusor(px, py);
    const folga = linha - occ;
    if (folga < minFolga) minFolga = folga;
    if (minFolga < -0.6) return 0;
  }
  const v = Math.min(1, Math.max(0, (minFolga + 0.12) / 0.3));
  return v * v * (3 - 2 * v);
}
