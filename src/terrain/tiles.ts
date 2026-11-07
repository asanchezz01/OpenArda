// Sistema de ladrilhos em quadtree com carregamento progressivo: primeiro os
// níveis grosseiros, depois os detalhados perto da câmera. Quando o período
// muda o relevo, os novos ladrilhos "transformam" as alturas antigas (morph).

import * as THREE from 'three';
import type { Feicao } from '../core/types';
import { terreno } from '../core/data';
import { criarMaterialTile, type UniformesGlobais } from './material';
import TerrainWorker from './terrain.worker.ts?worker';

const RES = 48;
const N = RES + 1;
const RAIZ = 2500;
const NIVEL_MAX = 7;

export interface DadosTile {
  h: Float32Array;
  agua: Float32Array;
  grad: Float32Array;
  bio: Float32Array;
  extra: Float32Array;
  vis: Float32Array;
}

type Resolver = (d: DadosTile) => void;

export class PoolWorkers {
  private workers: Worker[] = [];
  private ocupados: number[] = [];
  private fila: { msg: unknown; res: Resolver; prio: number; cancelado: () => boolean }[] = [];
  private pend = new Map<number, Resolver>();
  private modelosEnviados = new Set<string>();
  private prox = 1;
  constructor(n: number) {
    for (let i = 0; i < n; i++) {
      const w = new TerrainWorker();
      w.onmessage = (ev) => {
        const d = ev.data;
        this.ocupados[i]--;
        const r = this.pend.get(d.id);
        this.pend.delete(d.id);
        if (r && d.tipo === 'tile') r(d as DadosTile);
        this.bombear();
      };
      this.workers.push(w);
      this.ocupados.push(0);
    }
  }
  garantirModelo(assinatura: string, feicoes: Feicao[]) {
    if (this.modelosEnviados.has(assinatura)) return;
    this.modelosEnviados.add(assinatura);
    const msg = { tipo: 'modelo', assinatura, feicoes, cadeias: terreno.cadeias, limites: terreno.limites };
    for (const w of this.workers) w.postMessage(msg);
  }
  pedir(msg: Record<string, unknown>, prio: number, cancelado: () => boolean): Promise<DadosTile> {
    return new Promise((res) => {
      this.fila.push({ msg, res, prio, cancelado });
      this.bombear();
    });
  }
  get pendentes() {
    return this.fila.length + this.pend.size;
  }
  private bombear() {
    if (!this.fila.length) return;
    this.fila = this.fila.filter((f) => !f.cancelado());
    this.fila.sort((a, b) => a.prio - b.prio);
    for (let i = 0; i < this.workers.length && this.fila.length; i++) {
      while (this.ocupados[i] < 2 && this.fila.length) {
        const item = this.fila.shift()!;
        const id = this.prox++;
        this.pend.set(id, item.res);
        this.ocupados[i]++;
        this.workers[i].postMessage({ ...(item.msg as object), id });
      }
    }
  }
}

// geometria compartilhada (grade unitária + saias para esconder fendas)
let geomBase: { pos: THREE.BufferAttribute; idx: THREE.BufferAttribute; skirt: THREE.BufferAttribute; mapa: Int32Array; total: number } | null = null;
function base() {
  if (geomBase) return geomBase;
  const borda: number[] = [];
  for (let i = 0; i < N; i++) borda.push(i); // y=0
  for (let j = 1; j < N; j++) borda.push(j * N + RES); // x=1
  for (let i = RES - 1; i >= 0; i--) borda.push(RES * N + i); // y=1
  for (let j = RES - 1; j >= 1; j--) borda.push(j * N); // x=0
  const total = N * N + borda.length;
  const pos = new Float32Array(total * 3);
  const skirt = new Float32Array(total);
  const mapa = new Int32Array(total);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const k = j * N + i;
      pos[k * 3] = i / RES;
      pos[k * 3 + 1] = j / RES;
      mapa[k] = k;
    }
  borda.forEach((src, b) => {
    const k = N * N + b;
    pos[k * 3] = pos[src * 3];
    pos[k * 3 + 1] = pos[src * 3 + 1];
    skirt[k] = 1;
    mapa[k] = src;
  });
  const idx: number[] = [];
  for (let j = 0; j < RES; j++)
    for (let i = 0; i < RES; i++) {
      const a = j * N + i,
        b = a + 1,
        c = a + N,
        d = c + 1;
      idx.push(a, b, d, a, d, c);
    }
  const L = borda.length;
  for (let b = 0; b < L; b++) {
    const s0 = borda[b],
      s1 = borda[(b + 1) % L];
    const k0 = N * N + b,
      k1 = N * N + ((b + 1) % L);
    idx.push(s0, k0, k1, s0, k1, s1);
  }
  geomBase = {
    pos: new THREE.BufferAttribute(pos, 3),
    idx: new THREE.BufferAttribute(new Uint32Array(idx), 1),
    skirt: new THREE.BufferAttribute(skirt, 1),
    mapa,
    total,
  };
  return geomBase;
}

function expandir(src: Float32Array, comp: number, prev?: Float32Array): Float32Array {
  const { mapa, total } = base();
  const out = new Float32Array(total * comp * (prev ? 2 : 1));
  if (prev) {
    for (let k = 0; k < total; k++) {
      out[k * 2] = src[mapa[k]];
      out[k * 2 + 1] = prev[mapa[k]];
    }
  } else {
    for (let k = 0; k < total; k++) for (let c = 0; c < comp; c++) out[k * comp + c] = src[mapa[k] * comp + c];
  }
  return out;
}

export interface No {
  nivel: number;
  i: number;
  j: number;
  x0: number;
  y0: number;
  tam: number;
}

interface Tile extends No {
  chave: string;
  assinatura: string;
  dados?: DadosTile;
  mesh?: THREE.Mesh;
  material?: THREE.ShaderMaterial;
  morphInicio: number;
  usado: number;
  pedido: boolean;
}

export interface OpcoesSistema {
  regiao?: [number, number, number, number];
  luzArvores?: () => { x: number; y: number; h: number; raio: number } | null;
}

export class SistemaTerreno {
  readonly grupo = new THREE.Group();
  readonly uniformes: UniformesGlobais;
  private pool: PoolWorkers;
  private tiles = new Map<string, Tile>();
  private assinaturaExibida = '';
  private assinaturaAlvo = '';
  private assinaturaAnterior = '';
  private morphDur = 2500;
  private inicioTransicao = 0;
  private frustum = new THREE.Frustum();
  private mat = new THREE.Matrix4();
  private box = new THREE.Box3();
  private raizes: No[] = [];
  private quadro = 0;
  visiveis: Tile[] = [];
  aoMudarRelevo?: () => void;
  bias = 1;
  private opcoes: OpcoesSistema;

  constructor(pool: PoolWorkers, uniformes: UniformesGlobais, opcoes: OpcoesSistema = {}) {
    this.pool = pool;
    this.uniformes = uniformes;
    this.opcoes = opcoes;
    const [x0, y0, x1, y1] = terreno.limites;
    for (let j = 0; y0 + j * RAIZ < y1; j++)
      for (let i = 0; x0 + i * RAIZ < x1; i++) this.raizes.push({ nivel: 0, i, j, x0: x0 + i * RAIZ, y0: y0 + j * RAIZ, tam: RAIZ });
    this.grupo.matrixAutoUpdate = false;
  }

  get assinatura() {
    return this.assinaturaExibida;
  }
  get emTransicao() {
    return this.assinaturaAlvo !== this.assinaturaExibida;
  }

  definirEstado(assinatura: string, feicoes: Feicao[], morphMs = 2500) {
    if (assinatura === this.assinaturaAlvo) return;
    this.pool.garantirModelo(assinatura, feicoes);
    this.assinaturaAlvo = assinatura;
    this.morphDur = morphMs;
    this.inicioTransicao = performance.now();
    if (!this.assinaturaExibida) this.assinaturaExibida = assinatura;
  }

  private chave(assin: string, n: No) {
    return `${assin}:${n.nivel}/${n.i}/${n.j}`;
  }

  private filhos(n: No): No[] {
    const t = n.tam / 2;
    const out: No[] = [];
    for (let b = 0; b < 2; b++)
      for (let a = 0; a < 2; a++)
        out.push({ nivel: n.nivel + 1, i: n.i * 2 + a, j: n.j * 2 + b, x0: n.x0 + a * t, y0: n.y0 + b * t, tam: t });
    return out;
  }

  private naRegiao(n: No) {
    const r = this.opcoes.regiao;
    if (!r) return true;
    return !(n.x0 > r[2] || n.x0 + n.tam < r[0] || n.y0 > r[3] || n.y0 + n.tam < r[1]);
  }

  private tile(assin: string, n: No): Tile {
    const k = this.chave(assin, n);
    let t = this.tiles.get(k);
    if (!t) {
      t = { ...n, chave: k, assinatura: assin, morphInicio: 0, usado: this.quadro, pedido: false };
      this.tiles.set(k, t);
    }
    t.usado = this.quadro;
    return t;
  }

  private pedir(t: Tile, prio: number) {
    if (t.pedido) return;
    t.pedido = true;
    const luz = this.opcoes.luzArvores?.() ?? null;
    const assin = t.assinatura;
    this.pool
      .pedir({ tipo: 'tile', assinatura: assin, x0: t.x0, y0: t.y0, tamanho: t.tam, res: RES, luz }, prio, () => !this.tiles.has(t.chave) || (this.quadro - t.usado > 90 && t.nivel > 1))
      .then((d) => {
        if (!this.tiles.has(t.chave)) return;
        t.dados = d;
        this.criarMesh(t);
      });
  }

  /** Amostra altura/água de um ladrilho já pronto (ou ancestral) de outra assinatura. */
  private amostrarAnterior(assin: string, n: No): { h: Float32Array; agua: Float32Array } | null {
    let no: No | null = n;
    let anc: Tile | undefined;
    while (no) {
      const t = this.tiles.get(this.chave(assin, no));
      if (t?.dados) {
        anc = t;
        break;
      }
      if (no.nivel === 0) break;
      const pi = Math.floor(no.i / 2),
        pj = Math.floor(no.j / 2);
      const tam: number = no.tam * 2;
      const [x0, y0] = terreno.limites;
      no = { nivel: no.nivel - 1, i: pi, j: pj, tam, x0: x0 + pi * tam, y0: y0 + pj * tam };
    }
    if (!anc) return null;
    if (anc.nivel === n.nivel) return { h: anc.dados!.h, agua: anc.dados!.agua };
    const h = new Float32Array(N * N);
    const agua = new Float32Array(N * N);
    const s = n.tam / anc.tam;
    const ox = (n.x0 - anc.x0) / anc.tam,
      oy = (n.y0 - anc.y0) / anc.tam;
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const fx = (ox + (i / RES) * s) * RES,
          fy = (oy + (j / RES) * s) * RES;
        const ix = Math.min(RES - 1, Math.floor(fx)),
          iy = Math.min(RES - 1, Math.floor(fy));
        const tx = fx - ix,
          ty = fy - iy;
        const A = anc.dados!;
        const g = (arr: Float32Array) =>
          (arr[iy * N + ix] * (1 - tx) + arr[iy * N + ix + 1] * tx) * (1 - ty) + (arr[(iy + 1) * N + ix] * (1 - tx) + arr[(iy + 1) * N + ix + 1] * tx) * ty;
        h[j * N + i] = g(A.h);
        const a0 = A.agua[iy * N + ix];
        agua[j * N + i] = a0 < -50 ? a0 : Math.max(-99, g(A.agua));
      }
    return { h, agua };
  }

  private criarMesh(t: Tile) {
    const b = base();
    const d = t.dados!;
    let prev: { h: Float32Array; agua: Float32Array } | null = null;
    const transicao = t.assinatura === this.assinaturaAlvo && this.assinaturaAnteriorPara(t) !== '';
    if (transicao) prev = this.amostrarAnterior(this.assinaturaAnteriorPara(t), t);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', b.pos);
    g.setIndex(b.idx);
    g.setAttribute('aSkirt', b.skirt);
    g.setAttribute('aH', new THREE.BufferAttribute(expandir(d.h, 1, prev?.h ?? d.h), 2));
    g.setAttribute('aW', new THREE.BufferAttribute(expandir(d.agua, 1, prev?.agua ?? d.agua), 2));
    g.setAttribute('aG', new THREE.BufferAttribute(expandir(d.grad, 2), 2));
    g.setAttribute('aB', new THREE.BufferAttribute(expandir(d.bio, 4), 4));
    g.setAttribute('aE', new THREE.BufferAttribute(expandir(d.extra, 4), 4));
    g.setAttribute('aV', new THREE.BufferAttribute(expandir(d.vis, 1), 1));
    let hmax = 0;
    for (let k = 0; k < d.h.length; k++) if (d.h[k] > hmax) hmax = d.h[k];
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(t.x0 + t.tam / 2, t.y0 + t.tam / 2, 0), t.tam * 0.75 + hmax * 12);
    g.boundingBox = new THREE.Box3(new THREE.Vector3(t.x0, t.y0, -50), new THREE.Vector3(t.x0 + t.tam, t.y0 + t.tam, hmax * 12 + 1));
    const m = criarMaterialTile(this.uniformes);
    m.uniforms.uOrigin.value.set(t.x0, t.y0);
    m.uniforms.uSize.value = t.tam;
    m.uniforms.uSkirt.value = Math.max(0.3, t.tam * 0.01);
    m.uniforms.uMorph.value = prev ? 0 : 1;
    const mesh = new THREE.Mesh(g, m);
    mesh.matrixAutoUpdate = false;
    mesh.frustumCulled = false;
    mesh.visible = false;
    mesh.userData.tile = t;
    t.mesh = mesh;
    t.material = m;
    t.morphInicio = prev ? -1 : 0;
    this.grupo.add(mesh);
  }

  private assinaturaAnteriorPara(_t: Tile): string {
    if (this.assinaturaAlvo !== this.assinaturaExibida) return this.assinaturaExibida;
    // ainda dentro da janela de morph depois da troca
    if (this.assinaturaAnterior && performance.now() - this.inicioTransicao < this.morphDur + 4000) return this.assinaturaAnterior;
    return '';
  }

  /** Seleciona os ladrilhos para a câmera e pede os que faltam. */
  atualizar(camera: THREE.PerspectiveCamera, alvoZ = 0) {
    this.quadro++;
    this.mat.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.mat);
    const cam = camera.position;
    const exag = this.uniformes.uExag.value;
    const desejados: No[] = [];
    const visitar = (n: No) => {
      if (!this.naRegiao(n)) return;
      this.box.min.set(n.x0, n.y0, -5);
      this.box.max.set(n.x0 + n.tam, n.y0 + n.tam, 10 * exag + 2);
      if (n.nivel > 0 && !this.frustum.intersectsBox(this.box)) return;
      const dx = Math.max(n.x0 - cam.x, 0, cam.x - (n.x0 + n.tam));
      const dy = Math.max(n.y0 - cam.y, 0, cam.y - (n.y0 + n.tam));
      const dz = Math.max(0, cam.z - alvoZ);
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (n.nivel < NIVEL_MAX && dist < n.tam * 1.55 * this.bias) {
        for (const f of this.filhos(n)) visitar(f);
      } else desejados.push(n);
    };
    for (const r of this.raizes) visitar(r);

    const alvo = this.assinaturaAlvo;
    // pedidos: sempre garantir raízes e níveis 1 (base grosseira), depois desejados
    const prioridade = (n: No) => {
      const cx = n.x0 + n.tam / 2,
        cy = n.y0 + n.tam / 2;
      return n.nivel * 1e5 + Math.hypot(cx - cam.x, cy - cam.y);
    };
    for (const r of this.raizes) if (this.naRegiao(r)) this.pedir(this.tile(alvo, r), -1);
    for (const n of desejados) {
      const t = this.tile(alvo, n);
      if (!t.dados) this.pedir(t, prioridade(n));
      // garante ancestrais para preenchimento progressivo
      let p = n;
      while (p.nivel > 1) {
        const pi = Math.floor(p.i / 2),
          pj = Math.floor(p.j / 2),
          tam = p.tam * 2;
        const [x0, y0] = terreno.limites;
        p = { nivel: p.nivel - 1, i: pi, j: pj, tam, x0: x0 + pi * tam, y0: y0 + pj * tam };
        const ta = this.tile(alvo, p);
        if (!ta.dados) this.pedir(ta, prioridade(p));
      }
    }

    // conjunto exibido
    const chaveNo = (n: No) => `${n.nivel}/${n.i}/${n.j}`;
    const desejadoSet = new Set(desejados.map(chaveNo));
    const ancestral = new Set<string>();
    for (const n of desejados) {
      let i = n.i,
        j = n.j;
      for (let l = n.nivel - 1; l >= 0; l--) {
        i = Math.floor(i / 2);
        j = Math.floor(j / 2);
        ancestral.add(`${l}/${i}/${j}`);
      }
    }
    const montar = (assin: string) => {
      const rec = (n: No): { l: Tile[]; ok: boolean } => {
        const t = this.tiles.get(this.chave(assin, n));
        const k = chaveNo(n);
        if (desejadoSet.has(k) || !ancestral.has(k)) {
          if (t?.mesh) return { l: [t], ok: true };
          return { l: [], ok: false };
        }
        const res: Tile[] = [];
        let ok = true;
        for (const f of this.filhos(n)) {
          const kf = chaveNo(f);
          if (!desejadoSet.has(kf) && !ancestral.has(kf)) continue;
          const r = rec(f);
          res.push(...r.l);
          ok = ok && r.ok;
        }
        if (ok) return { l: res, ok: true };
        if (t?.mesh) return { l: [t], ok: true };
        return { l: res, ok: false };
      };
      const lista: Tile[] = [];
      let completo = true;
      for (const r of this.raizes) {
        if (!this.naRegiao(r)) continue;
        const res = rec(r);
        lista.push(...res.l);
        completo = completo && res.ok;
      }
      return { lista, completo };
    };

    let exib = montar(this.assinaturaExibida);
    if (alvo !== this.assinaturaExibida) {
      const novo = montar(alvo);
      const espera = performance.now() - this.inicioTransicao;
      if (novo.completo || (espera > 6000 && novo.lista.length)) {
        this.assinaturaAnterior = this.assinaturaExibida;
        this.assinaturaExibida = alvo;
        this.inicioTransicao = performance.now();
        exib = novo;
        for (const t of novo.lista) if (t.morphInicio === -1) t.morphInicio = performance.now();
        this.aoMudarRelevo?.();
      }
    }
    // morph
    const agora = performance.now();
    for (const t of exib.lista) {
      if (t.morphInicio === -1) t.morphInicio = agora;
      if (t.morphInicio > 0 && t.material) {
        const k = Math.min(1, (agora - t.morphInicio) / this.morphDur);
        t.material.uniforms.uMorph.value = k * k * (3 - 2 * k);
        if (k >= 1) t.morphInicio = 0;
      }
    }
    for (const t of this.visiveis) if (t.mesh) t.mesh.visible = false;
    for (const t of exib.lista) if (t.mesh) t.mesh.visible = true;
    this.visiveis = exib.lista;
    if (this.quadro % 60 === 0) this.limpar();
  }

  private limpar() {
    if (this.tiles.size < 700) return;
    const lista = [...this.tiles.values()].filter((t) => t.nivel > 0 && !(t.mesh?.visible));
    lista.sort((a, b) => a.usado - b.usado);
    const remover = lista.slice(0, this.tiles.size - 550);
    for (const t of remover) {
      if (t.mesh) {
        this.grupo.remove(t.mesh);
        t.mesh.geometry.dispose();
        t.material?.dispose();
      }
      this.tiles.delete(t.chave);
    }
  }

  get carregando(): boolean {
    return this.pool.pendentes > 0 || this.emTransicao;
  }

  definirOverlay(t: Tile, tex: THREE.Texture | null) {
    if (!t.material) return;
    t.material.uniforms.uOverlay.value = tex;
    t.material.uniforms.uHasOverlay.value = tex ? 1 : 0;
  }
}

export type { Tile };
