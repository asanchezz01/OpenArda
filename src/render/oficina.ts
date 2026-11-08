// Peças de arquitetura compartilhadas pelos sítios em 3D (Númenor, Menegroth): geometrias unitárias,
// materiais e construtores de torres, telhados, janelas, casas, árvores e navios sobre os lotes instanciados.
import * as THREE from 'three';
import { rng } from '../terrain/noise';
import { criarLotes } from './lotes';

export const PE = 0.0003048; // km
export const material = (cor: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.85, ...extra });

// Peças unitárias. Cilindro, cone, pirâmide e copa são centrados; duas águas e cúpula têm a base em z = 0.
export const cilindro = new THREE.CylinderGeometry(1, 1, 1, 16).rotateX(Math.PI / 2);
export const cone = new THREE.ConeGeometry(1, 1, 16).rotateX(Math.PI / 2);
export const piramide = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).rotateX(Math.PI / 2);
export const duasAguas = new THREE.CylinderGeometry(1, 1, 1, 3).rotateZ(Math.PI / 2).translate(0, 0, 0.5).scale(1, 1 / Math.sqrt(3), 1 / 1.5);
export const cupula = new THREE.SphereGeometry(1, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2);
export const copa = new THREE.IcosahedronGeometry(1, 1);
/** Casco em planta (popa reta, proa afilada), comprimento e boca unitários, altura de 0 a 1. */
export const casco = (() => {
  const s = new THREE.Shape();
  s.moveTo(-0.5, -0.32);
  s.lineTo(0.12, -0.5);
  s.quadraticCurveTo(0.42, -0.42, 0.5, 0);
  s.quadraticCurveTo(0.42, 0.42, 0.12, 0.5);
  s.lineTo(-0.5, 0.32);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 6 });
})();

export type M = THREE.Material;

/** Lotes e peças de arquitetura compartilhados pelas duas cidades. */
export function oficina(semente: number) {
  const lotes = criarLotes();
  const { peca, bloco } = lotes;
  const rand = rng(semente);
  const giro = (ang: number, dx: number, dy: number): [number, number] => [dx * Math.cos(ang) - dy * Math.sin(ang), dx * Math.sin(ang) + dy * Math.cos(ang)];

  /** Telhado de quatro águas: duas águas no meio e meia pirâmide em cada ponta. */
  function telhado(m: M, x: number, y: number, z: number, w: number, d: number, h: number, ang = 0) {
    if (w < d) {
      [w, d] = [d, w];
      ang += Math.PI / 2;
    }
    peca(duasAguas, m, x, y, z, Math.max(w - d, 1e-4), d, h, ang);
    for (const s of [-1, 1]) {
      const [dx, dy] = giro(ang, (s * (w - d)) / 2, 0);
      peca(piramide, m, x + dx, y + dy, z + h / 2, d, d, h, ang);
    }
  }

  function ameiasLinha(m: M, x0: number, y0: number, x1: number, y1: number, z: number, alt = 0.0024) {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(2, Math.round(len / 0.0045));
    const ang = Math.atan2(y1 - y0, x1 - x0);
    for (let k = 0; k < n; k += 2) {
      const t = (k + 0.5) / n;
      bloco(m, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, len / n, 0.0018, alt, z, ang);
    }
  }

  function ameiasRetangulo(m: M, x: number, y: number, w: number, d: number, z: number, ang: number) {
    const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => giro(ang, (a * w) / 2, (b * d) / 2));
    for (let k = 0; k < 4; k++) ameiasLinha(m, x + c[k][0], y + c[k][1], x + c[(k + 1) % 4][0], y + c[(k + 1) % 4][1], z);
  }

  const finial = (ouro: M, x: number, y: number, z: number, h: number) => peca(cone, ouro, x, y, z + h / 2, h * 0.09, h * 0.09, h);

  function torreRedonda(paredes: M, telha: M, ouro: M, x: number, y: number, z: number, r: number, h: number) {
    peca(cilindro, paredes, x, y, z + h / 2, r, r, h);
    peca(cilindro, paredes, x, y, z + h - 0.0015, r * 1.18, r * 1.18, 0.003); // mísula sob o telhado
    const hc = r * 2.6;
    peca(cone, telha, x, y, z + h + hc / 2, r * 1.28, r * 1.28, hc);
    finial(ouro, x, y, z + h + hc, r * 1.1);
  }

  function torreQuadrada(paredes: M, telha: M, ouro: M, x: number, y: number, z: number, w: number, h: number, ang = 0, coberta = true) {
    bloco(paredes, x, y, w, w, h, z, ang);
    bloco(paredes, x, y, w * 1.16, w * 1.16, 0.003, z + h - 0.003, ang); // mísula das ameias
    ameiasRetangulo(paredes, x, y, w * 1.16, w * 1.16, z + h, ang);
    if (!coberta) return;
    peca(piramide, telha, x, y, z + h + w * 0.55, w * 0.82, w * 0.82, w * 1.1, ang);
    finial(ouro, x, y, z + h + w * 1.1, w * 0.6);
  }

  /** Fileiras de janelas numa fachada (segmento x0,y0 → x1,y1), uma por andar. */
  function janelas(m: M, x0: number, y0: number, x1: number, y1: number, z0: number, andares: number, passo = 0.009, andar = 0.0085, alta = 0.0055) {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.floor(len / passo));
    const ang = Math.atan2(y1 - y0, x1 - x0);
    for (let f = 0; f < andares; f++)
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        bloco(m, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 0.0034, 0.0008, alta, z0 + 0.003 + f * andar, ang);
      }
  }

  function casa(paredes: M, telha: M, x: number, y: number, z: number, w: number, d: number, h: number, ang: number, quatroAguas = true) {
    bloco(paredes, x, y, w, d, h, z, ang);
    if (quatroAguas) telhado(telha, x, y, z + h, w * 1.06, d * 1.14, d * 0.55, ang);
    else peca(duasAguas, telha, x, y, z + h, w * 1.06, d * 1.18, d * 0.5, ang);
  }

  function arvore(tronco: M, folhas: M, x: number, y: number, z: number, s: number) {
    peca(cilindro, tronco, x, y, z + s * 0.5, s * 0.08, s * 0.08, s);
    peca(copa, folhas, x, y, z + s * 1.15, s * 0.55, s * 0.55, s * 0.62);
  }

  /** Navio de três mastros, de velas abertas ou recolhidas nas vergas. */
  function navio(m: { casco: M; conves: M; mastro: M; vela: M; ouro: M }, x: number, y: number, ang: number, abertas: boolean, L = 0.046) {
    const B = L * 0.24;
    peca(casco, m.casco, x, y, -0.002, L, B, 0.0075, ang);
    const em = (dx: number, dy = 0) => {
      const [a, b] = giro(ang, dx, dy);
      return [x + a, y + b] as const;
    };
    const conves = 0.0055;
    bloco(m.conves, x, y, L * 0.8, B * 0.72, 0.0004, conves, ang);
    const [px, py] = em(-L * 0.38);
    bloco(m.casco, px, py, L * 0.2, B * 0.86, 0.0045, conves, ang); // castelo de popa
    const [qx, qy] = em(L * 0.36);
    bloco(m.casco, qx, qy, L * 0.12, B * 0.6, 0.0025, conves, ang); // castelo de proa
    const [gx, gy] = em(L * 0.62);
    bloco(m.mastro, gx, gy, L * 0.3, 0.0006, 0.0006, conves + 0.002, ang); // gurupés
    for (const [dx, h] of [[L * 0.24, 0.032], [0, 0.04], [-L * 0.22, 0.028]] as const) {
      const [mx, my] = em(dx);
      peca(cilindro, m.mastro, mx, my, conves + h / 2, 0.0005, 0.0005, h);
      for (const k of [0.45, 0.8]) {
        const z = conves + h * k;
        const larg = B * (k < 0.5 ? 1.25 : 0.95);
        bloco(m.mastro, mx, my, 0.0005, larg, 0.0005, z, ang); // verga
        if (abertas) bloco(m.vela, mx, my, 0.0005, larg * 0.95, h * 0.3, z - h * 0.3, ang);
        else bloco(m.vela, mx, my, 0.0014, larg * 0.9, 0.0012, z - 0.0011, ang);
      }
      if (dx === 0) bloco(m.ouro, mx, my, 0.004, 0.0004, 0.0022, conves + h, ang); // flâmula
    }
  }

  function barco(m: { casco: M; mastro: M; vela: M }, x: number, y: number, ang: number) {
    peca(casco, m.casco, x, y, -0.0008, 0.012, 0.0035, 0.0028, ang);
    peca(cilindro, m.mastro, x, y, 0.006, 0.0003, 0.0003, 0.009);
    bloco(m.vela, x, y, 0.0003, 0.004, 0.006, 0.0035, ang + Math.PI / 2);
  }

  return { ...lotes, rand, giro, telhado, ameiasLinha, ameiasRetangulo, finial, torreRedonda, torreQuadrada, janelas, casa, arvore, navio, barco };
}

