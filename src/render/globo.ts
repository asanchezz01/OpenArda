// O mundo redondo depois da Queda de Númenor. O mapa (Grade de Arda, plano) é
// enrolado numa esfera fixa por projeção azimutal equidistante em torno de
// CENTRO; depois a esfera é girada para que o alvo da câmera fique no topo, com
// o "para cima" em +z. Perto do alvo o mundo continua quase igual ao plano, por
// isso câmera, ladrilhos e modelos seguem em coordenadas da grade; mover o mapa
// gira o globo, como num globo virtual.
// A mesma conta existe no vertex shader do terreno (material.ts).

import * as THREE from 'three';
import type { UniformesGlobais } from '../terrain/material';

/** km. Tolkien não dá o raio; depois da Queda o mundo é a Terra, e a escala do atlas já é calibrada em distâncias reais. */
export const RAIO_ARDA = 6371;
/** Centro da projeção: meio da área coberta pelo mapa. */
export const CENTRO = new THREE.Vector2(0, -200);

export interface PontoGrade {
  x: number;
  y: number;
  h: number;
}

export class Globo {
  /** 0 = mundo plano, 1 = esfera de RAIO_ARDA (transição suave entre os dois). */
  k = 0;
  R = Infinity;
  private T = new THREE.Vector2();
  private n = new THREE.Vector3(0, 0, 1);
  private Q = new THREE.Matrix3();
  private Qt = new THREE.Matrix3();
  private tmp = new THREE.Vector3();

  get ativo() {
    return this.k > 0.002;
  }

  /** Recalcula a rotação para o alvo (tx, ty) e grava nos uniformes do terreno. */
  atualizar(k: number, tx: number, ty: number, u?: UniformesGlobais) {
    this.k = k;
    this.T.set(tx, ty);
    if (this.ativo) {
      this.R = RAIO_ARDA / k;
      const dx = tx - CENTRO.x,
        dy = ty - CENTRO.y;
      const s = Math.hypot(dx, dy);
      const ux = s > 1e-9 ? dx / s : 1,
        uy = s > 1e-9 ? dy / s : 0;
      const th = s / this.R;
      const c = Math.cos(th),
        sn = Math.sin(th);
      this.n.set(sn * ux, sn * uy, c);
      // base da esfera no alvo (radial, circunferencial, normal) → base do mundo (u, perp(u), z)
      const fonte = new THREE.Matrix3().set(c * ux, -uy, sn * ux, c * uy, ux, sn * uy, -sn, 0, c);
      const destino = new THREE.Matrix3().set(ux, -uy, 0, uy, ux, 0, 0, 0, 1);
      this.Q.multiplyMatrices(destino, fonte.clone().transpose());
      this.Qt.copy(this.Q).transpose();
    }
    if (u) {
      u.uGlobo.value.set(tx, ty, this.ativo ? this.R : 1, this.ativo ? 1 : 0);
      u.uGloboN.value.copy(this.n);
      u.uGloboQ.value.copy(this.Q);
    }
  }

  /** Ponto da grade (x, y, altura já exagerada) → posição no mundo 3D. */
  paraMundo(x: number, y: number, h: number, out = new THREE.Vector3()): THREE.Vector3 {
    if (!this.ativo) return out.set(x, y, h);
    const R = this.R;
    const dx = x - CENTRO.x,
      dy = y - CENTRO.y;
    const s = Math.hypot(dx, dy);
    const ux = s > 1e-9 ? dx / s : 1,
      uy = s > 1e-9 ? dy / s : 0;
    const th = s / R;
    const mx = Math.sin(th) * ux,
      my = Math.sin(th) * uy,
      mz = Math.cos(th);
    out.set(R * (mx - this.n.x) + h * mx, R * (my - this.n.y) + h * my, R * (mz - this.n.z) + h * mz).applyMatrix3(this.Q);
    return out.set(out.x + this.T.x, out.y + this.T.y, out.z);
  }

  /** Posição no mundo 3D → ponto da grade com altura sobre o nível do mar. */
  doMundo(p: THREE.Vector3): PontoGrade {
    if (!this.ativo) return { x: p.x, y: p.y, h: p.z };
    const R = this.R;
    const v = this.tmp.set(p.x - this.T.x, p.y - this.T.y, p.z).applyMatrix3(this.Qt).addScaledVector(this.n, R);
    const r = v.length();
    const th = Math.acos(Math.min(1, Math.max(-1, v.z / r)));
    const fi = Math.atan2(v.y, v.x);
    return { x: CENTRO.x + R * th * Math.cos(fi), y: CENTRO.y + R * th * Math.sin(fi), h: r - R };
  }

  /** Centro da esfera no mundo 3D: o alvo fica no topo, a R abaixo. */
  centro(out = new THREE.Vector3()) {
    return out.set(this.T.x, this.T.y, -this.R);
  }

  /** O ponto do mundo está do lado da esfera voltado para a câmera? */
  visivel(p: THREE.Vector3, cam: THREE.Vector3): boolean {
    if (!this.ativo) return true;
    const c = this.centro(this.tmp);
    return (p.x - c.x) * (cam.x - p.x) + (p.y - c.y) * (cam.y - p.y) + (p.z - c.z) * (cam.z - p.z) > 0;
  }

  /** Interseção de um raio com a superfície na altura h; devolve o ponto da grade. */
  interceptar(ray: THREE.Ray, h: number): THREE.Vector3 | null {
    if (!this.ativo) {
      const d = ray.direction;
      if (Math.abs(d.z) < 1e-6) return null;
      const t = (h - ray.origin.z) / d.z;
      return t > 0 ? ray.origin.clone().addScaledVector(d, t) : null;
    }
    const c = this.centro(new THREE.Vector3());
    const oc = ray.origin.clone().sub(c);
    const b = oc.dot(ray.direction);
    const disc = b * b - (oc.lengthSq() - (this.R + h) ** 2);
    if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    if (t <= 0) return null;
    const g = this.doMundo(ray.origin.clone().addScaledVector(ray.direction, t));
    return new THREE.Vector3(g.x, g.y, h);
  }
}
