// Camadas vetoriais desenhadas sobre o relevo, ladrilho por ladrilho: rios,
// estradas, reinos (domínio, ocupação, influência), certeza, vestígios e rotas.

import * as THREE from 'three';
import type { Pt } from '../core/types';
import { ativo, areaLugar, lugares, rios, estradasAtivas, statusLugar, terreno, territoriosAtivos, assinaturaPolitica } from '../core/data';
import type { Tile } from '../terrain/tiles';
import { hashString } from '../terrain/noise';

export interface Camadas {
  reinos: boolean;
  rios: boolean;
  estradas: boolean;
  certeza: boolean;
  vestigios: boolean;
  rotas: boolean;
  nomes: boolean;
  marcos: boolean;
  grade: boolean;
  detalhes: boolean;
}

export const CAMADAS_PADRAO: Camadas = { reinos: true, rios: true, estradas: true, certeza: false, vestigios: true, rotas: true, nomes: true, marcos: false, grade: false, detalhes: true };

const PX = 256;

interface Rota {
  id: string;
  de: string;
  ate: string;
  pts: Pt[];
  cor: string;
  rotulo: string;
}

export const ROTAS: Rota[] = [
  { id: 'armada', de: 'SE:3310', ate: 'SE:3319', cor: '#c0504d', rotulo: 'Rota da Grande Armada (Akallabêth)', pts: [[-2565, -581], [-2565, -517], [-2700, -420], [-2950, -230], [-3150, -40], [-3300, 30], [-3440, 0]] },
  { id: 'elendil', de: 'SE:3319', ate: 'SE:3330', cor: '#e7d9a8', rotulo: 'Navios de Elendil até Lindon', pts: [[-2133, -737], [-2006, -780], [-1860, -800], [-1500, -600], [-700, -420], [96, -467], [183, -437], [373, -418]] },
  { id: 'filhos', de: 'SE:3319', ate: 'SE:3330', cor: '#e7d9a8', rotulo: 'Navios de Isildur e Anárion até o Anduin', pts: [[-2133, -737], [-2006, -780], [-1860, -800], [-1200, -1200], [-300, -1700], [500, -1800], [1100, -1800], [1470, -1660], [1546, -1583], [1605, -1575], [1659, -1540]] },
  { id: 'interdicao', de: 'SE:32', ate: 'SE:3319', cor: '#9bc1e6', rotulo: 'Limite aproximado da Interdição dos Valar', pts: [[-2700, -100], [-2760, -500], [-2780, -900], [-2720, -1300]] },
];

function poligono(ctx: CanvasRenderingContext2D, pts: Pt[], fechar = true) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  if (fechar) ctx.closePath();
}

function bboxPts(pts: Pt[]): [number, number, number, number] {
  let a = Infinity,
    b = Infinity,
    c = -Infinity,
    d = -Infinity;
  for (const p of pts) {
    if (p[0] < a) a = p[0];
    if (p[1] < b) b = p[1];
    if (p[0] > c) c = p[0];
    if (p[1] > d) d = p[1];
  }
  return [a, b, c, d];
}

function cruza(bb: [number, number, number, number], x0: number, y0: number, t: number, m: number) {
  return !(bb[0] > x0 + t + m || bb[2] < x0 - m || bb[1] > y0 + t + m || bb[3] < y0 - m);
}

/** Trechos de costa com caixa delimitadora, para desenhar só o que cruza cada ladrilho. */
interface Trecho {
  pts: Pt[];
  bb: [number, number, number, number];
}
const trechosCache = new WeakMap<Pt[][], Trecho[]>();
function trechosDe(costas: Pt[][]): Trecho[] {
  let t = trechosCache.get(costas);
  if (!t) {
    t = [];
    for (const poli of costas) {
      const fechado = [...poli, poli[0]];
      for (let i = 0; i < fechado.length - 1; i += 192) {
        const pts = fechado.slice(i, Math.min(fechado.length, i + 193));
        t.push({ pts, bb: bboxPts(pts) });
      }
    }
    trechosCache.set(costas, t);
  }
  return t;
}

let hachura: CanvasPattern | null = null;
let hachuraCert: CanvasPattern | null = null;
function padroes(ctx: CanvasRenderingContext2D) {
  if (!hachura) {
    const c = document.createElement('canvas');
    c.width = c.height = 12;
    const g = c.getContext('2d')!;
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(-2, 14);
    g.lineTo(14, -2);
    g.stroke();
    hachura = ctx.createPattern(c, 'repeat');
    const c2 = document.createElement('canvas');
    c2.width = c2.height = 10;
    const g2 = c2.getContext('2d')!;
    g2.strokeStyle = 'rgba(250,236,200,0.55)';
    g2.lineWidth = 1;
    g2.beginPath();
    g2.moveTo(0, 0);
    g2.lineTo(10, 10);
    g2.stroke();
    hachuraCert = ctx.createPattern(c2, 'repeat');
  }
}

interface Entrada {
  tex: THREE.CanvasTexture | null;
  canvas: HTMLCanvasElement | null;
  usado: number;
}

export class Sobreposicao {
  camadas: Camadas = { ...CAMADAS_PADRAO };
  selecionado: string | null = null;
  costas: Pt[][] = [];
  /** Assinatura do relevo de onde vêm as costas (entra na chave do cache). */
  sigCostas = '';
  private cache = new Map<string, Entrada>();
  private quadro = 0;
  private canvasLivres: HTMLCanvasElement[] = [];
  private assinaturaCache = new Map<number, string>();

  private assinatura(t: number): string {
    const k = Math.round(t * 1e7);
    let s = this.assinaturaCache.get(k);
    if (!s) {
      const rotas = ROTAS.filter((r) => ativo('rota-' + r.id, r.de, r.ate, t)).map((r) => r.id).join(',');
      const rr = rios(t).map((r) => r.id).join(',') + estradasAtivas(t).map((r) => r.id).join(',');
      s = assinaturaPolitica(t) + hashString(rotas + rr).toString(36);
      if (this.assinaturaCache.size > 400) this.assinaturaCache.clear();
      this.assinaturaCache.set(k, s);
    }
    return s + JSON.stringify(this.camadas) + (this.selecionado ?? '') + this.sigCostas;
  }

  /** Atualiza as texturas dos ladrilhos visíveis, com orçamento de tempo. */
  atualizar(tiles: Tile[], t: number, definir: (tile: Tile, tex: THREE.Texture | null) => void, orcamentoMs = 6) {
    this.quadro++;
    const sig = this.assinatura(t);
    const inicio = performance.now();
    // primeiro os ladrilhos mais grosseiros (cobrem mais área)
    const ordenados = [...tiles].sort((a, b) => a.nivel - b.nivel);
    for (const tile of ordenados) {
      const chave = `${tile.nivel}/${tile.i}/${tile.j}|${sig}`;
      const ud = tile.mesh?.userData as { ov?: string } | undefined;
      if (!ud) continue;
      let e = this.cache.get(chave);
      if (e) {
        e.usado = this.quadro;
        if (ud.ov !== chave) {
          definir(tile, e.tex);
          ud.ov = chave;
        }
        continue;
      }
      if (performance.now() - inicio > orcamentoMs) continue;
      e = this.desenhar(tile, t);
      this.cache.set(chave, e);
      definir(tile, e.tex);
      ud.ov = chave;
    }
    if (this.quadro % 30 === 0 && this.cache.size > 140) this.limpar();
  }

  invalidar() {
    // força redesenho mudando a assinatura (camadas/seleção já entram nela)
    this.assinaturaCache.clear();
  }

  private limpar() {
    const lista = [...this.cache.entries()].sort((a, b) => a[1].usado - b[1].usado);
    for (const [k, e] of lista.slice(0, lista.length - 110)) {
      if (this.quadro - e.usado < 3) continue;
      e.tex?.dispose();
      if (e.canvas) this.canvasLivres.push(e.canvas);
      this.cache.delete(k);
    }
  }

  private desenhar(tile: Tile, t: number): Entrada {
    const { x0, y0, tam, nivel } = tile;
    const margem = tam * 0.05;
    const c = this.camadas;
    // coleta o que cruza o ladrilho antes de alocar um canvas
    const terrs = c.reinos ? territoriosAtivos(t).filter((a) => a.pts.length && cruza(bboxPts(a.pts), x0, y0, tam, margem)) : [];
    const rs = c.rios ? rios(t).filter((r) => nivel >= ((r.ordem ?? 2) === 1 ? 1 : (r.ordem ?? 2) === 2 ? 3 : 4) && cruza(bboxPts(r.pts!), x0, y0, tam, margem)) : [];
    const es = c.estradas && nivel >= 3 ? estradasAtivas(t).filter((r) => cruza(bboxPts(r.pts!), x0, y0, tam, margem)) : [];
    const zonas = c.certeza ? terreno.feicoes.filter((f) => f.tipo === 'zona' && f.nivel === 'artistico' && ativo(f.id, f.de, f.ate, t) && f.contorno) : [];
    const costas = nivel <= 4 ? trechosDe(this.costas).filter((p) => cruza(p.bb, x0, y0, tam, margem)) : [];
    const vest = c.vestigios
      ? lugares.filter((l) => {
          const st = statusLugar(l, t)[0];
          return (st === 'submerso' || st === 'removido' || st === 'ausente') && areaLugar(l) && l.tipo === 'ilha' && cruza(bboxPts(areaLugar(l)!), x0, y0, tam, margem);
        })
      : [];
    const ruinas = nivel >= 3 ? lugares.filter((l) => ['destruido', 'ruina'].includes(statusLugar(l, t)[0]) && !l.regiao && l.em[0] > x0 - 30 && l.em[0] < x0 + tam + 30 && l.em[1] > y0 - 30 && l.em[1] < y0 + tam + 30) : [];
    const rotas = c.rotas ? ROTAS.filter((r) => ativo('rota-' + r.id, r.de, r.ate, t) && cruza(bboxPts(r.pts), x0, y0, tam, margem)) : [];
    if (!terrs.length && !rs.length && !es.length && !zonas.length && !costas.length && !vest.length && !ruinas.length && !rotas.length) {
      return { tex: null, canvas: null, usado: this.quadro };
    }
    const canvas = this.canvasLivres.pop() ?? document.createElement('canvas');
    canvas.width = canvas.height = PX;
    const ctx = canvas.getContext('2d')!;
    padroes(ctx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, PX, PX);
    const s = PX / tam;
    ctx.setTransform(s, 0, 0, -s, -x0 * s, (y0 + tam) * s);
    const px = (v: number) => v / s;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // certeza: hachura sobre a reconstrução artística
    for (const z of zonas) {
      const pts = z.contorno as Pt[];
      ctx.save();
      poligono(ctx, pts);
      ctx.clip();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = hachuraCert!;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(0, 0, PX, PX);
      ctx.restore();
      ctx.save();
      ctx.setLineDash([px(6), px(5)]);
      ctx.strokeStyle = 'rgba(255,236,190,0.75)';
      ctx.lineWidth = px(1.5);
      poligono(ctx, pts);
      ctx.stroke();
      ctx.restore();
    }

    // silhueta das costas na escala continental
    if (costas.length) {
      ctx.strokeStyle = nivel <= 2 ? 'rgba(244,232,200,0.55)' : 'rgba(244,232,200,0.32)';
      ctx.lineWidth = px(nivel <= 1 ? 1.6 : 1.1);
      for (const p of costas) {
        poligono(ctx, p.pts, false);
        ctx.stroke();
      }
    }

    // reinos
    for (const a of terrs) {
      const cor = a.reino.cor;
      const sel = this.selecionado === a.reino.id;
      const { tipo, borda } = a.terr;
      ctx.save();
      if (tipo === 'dominio') {
        poligono(ctx, a.pts);
        ctx.fillStyle = cor;
        ctx.globalAlpha = sel ? 0.24 : borda === 'difusa' ? 0.06 : 0.09;
        ctx.fill();
      } else if (tipo === 'ocupacao') {
        poligono(ctx, a.pts);
        ctx.clip();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = cor;
        ctx.globalAlpha = sel ? 0.16 : 0.05;
        ctx.fillRect(0, 0, PX, PX);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = hachura!;
        ctx.globalAlpha = sel ? 0.4 : 0.2;
        ctx.fillRect(0, 0, PX, PX);
        ctx.restore();
        ctx.save();
        ctx.setTransform(s, 0, 0, -s, -x0 * s, (y0 + tam) * s);
      } else {
        poligono(ctx, a.pts);
        ctx.fillStyle = cor;
        ctx.globalAlpha = sel ? 0.12 : 0.04;
        ctx.fill();
      }
      ctx.restore();
      // bordas
      ctx.save();
      ctx.strokeStyle = cor;
      const largura = sel ? 3.2 : 2;
      if (borda === 'difusa') {
        // borda difusa: faixas largas e transparentes
        for (let k = 5; k >= 1; k--) {
          ctx.globalAlpha = (sel ? 0.1 : 0.05) * (1 + (5 - k) * 0.25);
          ctx.lineWidth = px(largura * k * 2.4);
          poligono(ctx, a.pts);
          ctx.stroke();
        }
      } else {
        ctx.globalAlpha = sel ? 1 : 0.75;
        ctx.lineWidth = px(largura);
        if (borda === 'aproximada') ctx.setLineDash([px(7), px(5)]);
        if (tipo === 'influencia') ctx.setLineDash([px(1.5), px(5)]);
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        poligono(ctx, a.pts);
        ctx.stroke();
      }
      ctx.restore();
    }

    // rios
    for (const r of rs) {
      const ordem = r.ordem ?? 2;
      const w = ordem === 1 ? 1.1 + nivel * 0.45 : ordem === 2 ? 0.8 + nivel * 0.3 : 0.6 + nivel * 0.22;
      ctx.strokeStyle = 'rgba(70,128,176,0.95)';
      ctx.lineWidth = px(w);
      poligono(ctx, r.pts!, false);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(150,200,230,0.5)';
      ctx.lineWidth = px(w * 0.35);
      ctx.stroke();
    }

    // estradas
    for (const e of es) {
      ctx.save();
      ctx.strokeStyle = 'rgba(120,84,48,0.9)';
      ctx.lineWidth = px(e.ordem === 1 ? 1.8 : 1.3);
      ctx.setLineDash([px(6), px(4)]);
      poligono(ctx, e.pts!, false);
      ctx.stroke();
      ctx.restore();
    }

    // vestígios: contornos de ilhas desaparecidas
    for (const l of vest) {
      ctx.save();
      ctx.strokeStyle = 'rgba(190,225,255,0.85)';
      ctx.lineWidth = px(1.6);
      ctx.setLineDash([px(3), px(4)]);
      poligono(ctx, areaLugar(l)!);
      ctx.stroke();
      ctx.restore();
    }

    // ruínas: halo escuro
    for (const l of ruinas) {
      const r = Math.max(4, tam * 0.03);
      const g = ctx.createRadialGradient(l.em[0], l.em[1], 0, l.em[0], l.em[1], r);
      g.addColorStop(0, 'rgba(60,20,16,0.55)');
      g.addColorStop(1, 'rgba(60,20,16,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(l.em[0], l.em[1], r, 0, Math.PI * 2);
      ctx.fill();
    }

    // rotas
    for (const r of rotas) {
      ctx.save();
      ctx.strokeStyle = r.cor;
      ctx.lineWidth = px(2.2);
      ctx.setLineDash([px(8), px(6)]);
      poligono(ctx, r.pts, false);
      ctx.stroke();
      ctx.restore();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return { tex, canvas, usado: this.quadro };
  }
}
