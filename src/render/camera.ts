// Câmera orbital no estilo de um globo virtual: arrastar move o chão sob o
// dedo, pinça aproxima, dois dedos giram e inclinam, roda aproxima no cursor.

import * as THREE from 'three';
import type { Vista } from '../core/types';

export interface EstadoCamera extends Vista {}

const D_MIN = 1.2;
const D_MAX = 14000;
const INCL_MAX = 84;

function angDiff(a: number, b: number) {
  let d = ((b - a) % 360 + 540) % 360 - 180;
  return d;
}

export class Camera {
  readonly cam: THREE.PerspectiveCamera;
  estado: EstadoCamera = { x: -3290, y: -135, d: 520, rumo: 270, inclinacao: 68 };
  alturaEm: (x: number, y: number) => number = () => 0;
  aoMudar?: () => void;
  aoInteragir?: () => void;
  aoToque?: (sx: number, sy: number) => void;
  bloqueada = false;
  reduzirMovimento = false;
  private voo: { de: EstadoCamera; para: EstadoCamera; t0: number; dur: number; b: number; resolver: () => void } | null = null;
  private alvoZSuave = 0;
  private el: HTMLElement;
  private ponteiros = new Map<number, { x: number; y: number; x0: number; y0: number; t0: number; botao: number }>();
  private arrasto: { tipo: 'pan' | 'orbita' | 'zoom1'; gx: number; gy: number; sx: number; sy: number; d0: number } | null = null;
  private gesto2: { dist: number; ang: number; mx: number; my: number; d0: number; rumo0: number; incl0: number; gx: number; gy: number } | null = null;
  private ultimoToque = { t: 0, x: 0, y: 0 };
  private vel = { x: 0, y: 0 };
  private ultimoMov = 0;
  private ray = new THREE.Raycaster();
  private moveu = false;

  constructor(el: HTMLElement, aspect: number) {
    this.el = el;
    this.cam = new THREE.PerspectiveCamera(38, aspect, 0.01, 60000);
    this.cam.up.set(0, 0, 1);
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointercancel', this.onUp);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('dblclick', (e) => {
      if (this.bloqueada) return;
      this.zoomEm(e.clientX, e.clientY, e.shiftKey || e.altKey ? 2 : 0.45, true);
    });
  }

  get emVoo() {
    return !!this.voo;
  }

  /** Atualiza a posição da câmera a partir do estado. */
  aplicar() {
    const s = this.estado;
    const zAlvo = this.alturaEm(s.x, s.y);
    this.alvoZSuave += (zAlvo - this.alvoZSuave) * 0.25;
    if (Math.abs(zAlvo - this.alvoZSuave) > s.d * 0.5) this.alvoZSuave = zAlvo;
    const phi = THREE.MathUtils.degToRad(s.inclinacao);
    const th = THREE.MathUtils.degToRad(s.rumo);
    const hx = Math.sin(th),
      hy = Math.cos(th);
    const cx = s.x - s.d * Math.sin(phi) * hx;
    const cy = s.y - s.d * Math.sin(phi) * hy;
    let cz = this.alvoZSuave + s.d * Math.cos(phi);
    const gz = this.alturaEm(cx, cy);
    if (cz < gz + 0.25) cz = gz + 0.25;
    this.cam.position.set(cx, cy, cz);
    // para vistas quase verticais, o "para cima" acompanha o rumo
    this.cam.up.set(hx * 0.02, hy * 0.02, 1).normalize();
    this.cam.lookAt(s.x, s.y, this.alvoZSuave);
    // planos de recorte proporcionais à altura sobre o chão (boa precisão de profundidade)
    this.cam.near = Math.min(60, Math.max(0.01, (cz - gz) * 0.08));
    this.cam.far = Math.max(20000, s.d * 60);
    this.cam.updateProjectionMatrix();
    this.cam.updateMatrixWorld();
  }

  get zAlvo() {
    return this.alvoZSuave;
  }

  definir(v: Partial<EstadoCamera>) {
    Object.assign(this.estado, v);
    this.limitar();
    this.aoMudar?.();
  }

  private limitar() {
    const s = this.estado;
    s.d = Math.min(D_MAX, Math.max(D_MIN, s.d));
    s.inclinacao = Math.min(INCL_MAX, Math.max(0, s.inclinacao));
    s.rumo = ((s.rumo % 360) + 360) % 360;
    s.x = Math.min(5200, Math.max(-5200, s.x));
    s.y = Math.min(2600, Math.max(-3000, s.y));
  }

  /** Voo suave até um destino; o arco sobe para mostrar o caminho. */
  voar(para: Partial<EstadoCamera>, duracao?: number): Promise<void> {
    const de = { ...this.estado };
    const alvo = { ...de, ...para };
    alvo.d = Math.min(D_MAX, Math.max(D_MIN, alvo.d));
    const dist = Math.hypot(alvo.x - de.x, alvo.y - de.y);
    const dm = dist * 1.1;
    const b = Math.max(0, Math.log(Math.max(dm, 1)) - Math.max(Math.log(de.d), Math.log(alvo.d)));
    let dur = duracao ?? Math.min(4500, Math.max(1200, 1000 + 900 * Math.log2(1 + dist / Math.max(1, Math.min(de.d, alvo.d)))));
    if (this.reduzirMovimento) dur = 0;
    this.voo?.resolver();
    if (dur <= 0) {
      this.estado = alvo;
      this.limitar();
      this.voo = null;
      this.aoMudar?.();
      return Promise.resolve();
    }
    return new Promise((resolver) => {
      this.voo = { de, para: alvo, t0: performance.now(), dur, b, resolver };
    });
  }

  pararVoo() {
    if (this.voo) {
      this.voo.resolver();
      this.voo = null;
    }
  }

  tick(dt: number) {
    if (this.voo) {
      const v = this.voo;
      const k = Math.min(1, (performance.now() - v.t0) / v.dur);
      const s = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const ld = Math.log(v.de.d) + (Math.log(v.para.d) - Math.log(v.de.d)) * s + v.b * Math.sin(Math.PI * s);
      this.estado = {
        x: v.de.x + (v.para.x - v.de.x) * s,
        y: v.de.y + (v.para.y - v.de.y) * s,
        d: Math.exp(ld),
        rumo: v.de.rumo + angDiff(v.de.rumo, v.para.rumo) * s,
        inclinacao: v.de.inclinacao + (v.para.inclinacao - v.de.inclinacao) * s - Math.sin(Math.PI * s) * Math.min(25, v.b * 12),
      };
      this.limitar();
      if (k >= 1) {
        this.estado = { ...v.para };
        this.limitar();
        this.voo = null;
        v.resolver();
      }
      this.aoMudar?.();
    } else if (!this.arrasto && !this.gesto2 && (Math.abs(this.vel.x) > 0.001 || Math.abs(this.vel.y) > 0.001)) {
      if (this.reduzirMovimento) {
        this.vel.x = this.vel.y = 0;
      } else {
        this.estado.x += this.vel.x * dt;
        this.estado.y += this.vel.y * dt;
        const f = Math.exp(-dt * 4);
        this.vel.x *= f;
        this.vel.y *= f;
        this.limitar();
        this.aoMudar?.();
      }
    }
  }

  /** Interseção do raio da tela com o plano do chão (z = altura do alvo). */
  chao(sx: number, sy: number, z = this.alvoZSuave): THREE.Vector3 | null {
    const r = this.el.getBoundingClientRect();
    const ndc = new THREE.Vector2(((sx - r.left) / r.width) * 2 - 1, -((sy - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.cam);
    const d = this.ray.ray.direction;
    const o = this.ray.ray.origin;
    if (Math.abs(d.z) < 1e-6) return null;
    const t = (z - o.z) / d.z;
    if (t <= 0) return null;
    const p = o.clone().addScaledVector(d, t);
    if (p.distanceTo(o) > this.estado.d * 25) return null;
    return p;
  }

  /** Raio da tela em coordenadas do mundo (para o ray-march no terreno). */
  raio(sx: number, sy: number): THREE.Ray {
    const r = this.el.getBoundingClientRect();
    const ndc = new THREE.Vector2(((sx - r.left) / r.width) * 2 - 1, -((sy - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.cam);
    return this.ray.ray.clone();
  }

  zoomEm(sx: number, sy: number, fator: number, animar = false) {
    const g = this.chao(sx, sy);
    const s = this.estado;
    const nd = Math.min(D_MAX, Math.max(D_MIN, s.d * fator));
    const k = 1 - nd / s.d;
    const alvo = { d: nd, x: g ? s.x + (g.x - s.x) * k : s.x, y: g ? s.y + (g.y - s.y) * k : s.y };
    this.aoInteragir?.();
    if (animar) this.voar(alvo, 450);
    else this.definir(alvo);
  }

  private onDown = (e: PointerEvent) => {
    this.el.setPointerCapture(e.pointerId);
    this.pararVoo();
    this.vel.x = this.vel.y = 0;
    this.moveu = false;
    this.ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now(), botao: e.button });
    if (this.bloqueada) return;
    this.aoInteragir?.();
    if (this.ponteiros.size === 1) {
      const agora = performance.now();
      const dt = agora - this.ultimoToque.t;
      const perto = Math.hypot(e.clientX - this.ultimoToque.x, e.clientY - this.ultimoToque.y) < 40;
      const orbita = e.button === 2 || e.button === 1 || e.ctrlKey || e.shiftKey;
      const g = this.chao(e.clientX, e.clientY);
      if (e.pointerType === 'touch' && dt < 320 && perto) {
        // toque duplo e arrasto: zoom com um dedo
        this.arrasto = { tipo: 'zoom1', gx: 0, gy: 0, sx: e.clientX, sy: e.clientY, d0: this.estado.d };
      } else {
        this.arrasto = {
          tipo: orbita ? 'orbita' : 'pan',
          gx: g?.x ?? NaN,
          gy: g?.y ?? NaN,
          sx: e.clientX,
          sy: e.clientY,
          d0: this.estado.d,
        };
      }
    } else if (this.ponteiros.size === 2) {
      this.arrasto = null;
      const [a, b] = [...this.ponteiros.values()];
      const mx = (a.x + b.x) / 2,
        my = (a.y + b.y) / 2;
      const g = this.chao(mx, my);
      this.gesto2 = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        ang: Math.atan2(b.y - a.y, b.x - a.x),
        mx,
        my,
        d0: this.estado.d,
        rumo0: this.estado.rumo,
        incl0: this.estado.inclinacao,
        gx: g?.x ?? this.estado.x,
        gy: g?.y ?? this.estado.y,
      };
    }
  };

  private onMove = (e: PointerEvent) => {
    const p = this.ponteiros.get(e.pointerId);
    if (!p) return;
    const ddx = e.clientX - p.x,
      ddy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) > 6) this.moveu = true;
    if (this.bloqueada) return;
    const s = this.estado;
    if (this.gesto2 && this.ponteiros.size >= 2) {
      const [a, b] = [...this.ponteiros.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const mx = (a.x + b.x) / 2,
        my = (a.y + b.y) / 2;
      const g = this.gesto2;
      const fator = g.dist / Math.max(10, dist);
      const dmy = my - g.my;
      // os dois dedos subindo/descendo juntos inclinam
      const dmx = mx - g.mx;
      const paralelo = Math.abs(dmy) > 18 && Math.abs(dmy) > Math.abs(dmx) * 1.4 && Math.abs(dist - g.dist) < 40;
      if (paralelo) {
        s.inclinacao = g.incl0 - dmy * 0.25;
      } else {
        s.d = g.d0 * fator;
        s.rumo = g.rumo0 - THREE.MathUtils.radToDeg(ang - g.ang);
      }
      this.limitar();
      this.aplicar();
      // mantém o ponto sob os dedos
      const atual = this.chao(mx, my);
      if (atual && !paralelo) {
        s.x += g.gx - atual.x;
        s.y += g.gy - atual.y;
      }
      this.limitar();
      this.aoMudar?.();
      return;
    }
    const a = this.arrasto;
    if (!a) return;
    if (a.tipo === 'zoom1') {
      s.d = a.d0 * Math.exp((e.clientY - a.sy) * 0.008);
      this.limitar();
      this.aoMudar?.();
      return;
    }
    if (a.tipo === 'orbita') {
      s.rumo -= ddx * 0.3;
      s.inclinacao -= ddy * 0.25;
      this.limitar();
      this.aoMudar?.();
      return;
    }
    // pan: o ponto do chão agarrado fica sob o cursor
    const g = this.chao(e.clientX, e.clientY);
    const t = performance.now();
    if (g && !Number.isNaN(a.gx)) {
      const mx = a.gx - g.x,
        my = a.gy - g.y;
      s.x += mx;
      s.y += my;
      const dtm = Math.max(1, t - this.ultimoMov) / 1000;
      this.vel.x = this.vel.x * 0.6 + (mx / dtm) * 0.4;
      this.vel.y = this.vel.y * 0.6 + (my / dtm) * 0.4;
    } else {
      const k = s.d * 0.0022;
      const th = THREE.MathUtils.degToRad(s.rumo);
      // direita da tela = (cos, -sen); frente = (sen, cos)
      s.x += (-ddx * Math.cos(th) + ddy * Math.sin(th)) * k;
      s.y += (ddx * Math.sin(th) + ddy * Math.cos(th)) * k;
    }
    this.ultimoMov = t;
    this.limitar();
    this.aplicar();
    this.aoMudar?.();
  };

  private onUp = (e: PointerEvent) => {
    const p = this.ponteiros.get(e.pointerId);
    this.ponteiros.delete(e.pointerId);
    if (this.ponteiros.size < 2) this.gesto2 = null;
    if (this.ponteiros.size === 0) {
      const tocou = p && !this.moveu && performance.now() - p.t0 < 400;
      if (this.arrasto?.tipo === 'zoom1' && tocou && !this.bloqueada) {
        // toque duplo sem arrastar: aproxima
        this.zoomEm(e.clientX, e.clientY, 0.45, true);
      } else if (tocou) {
        this.aoToque?.(e.clientX, e.clientY);
      }
      if (performance.now() - this.ultimoMov > 80) this.vel.x = this.vel.y = 0;
      this.arrasto = null;
      if (p && tocou) this.ultimoToque = { t: performance.now(), x: e.clientX, y: e.clientY };
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (this.bloqueada) return;
    this.pararVoo();
    const delta = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
    this.zoomEm(e.clientX, e.clientY, Math.exp(delta * 0.0016));
  };

  redimensionar(aspect: number) {
    this.ajustarAspecto(aspect);
  }

  /** Em retrato, mantém ~40° no eixo horizontal para não estreitar a vista. */
  ajustarAspecto(aspect: number) {
    this.cam.aspect = aspect;
    const vfov = aspect >= 1 ? 38 : THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(20)) / aspect));
    this.cam.fov = Math.min(80, vfov);
    this.cam.updateProjectionMatrix();
  }
}
