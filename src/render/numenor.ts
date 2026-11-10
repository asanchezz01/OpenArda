// Reconstrução artística das cidades de Númenor: volumes em km, Z para cima, X para leste, Y para norte.
// Descrito (Tolkien): Armenelos, a cidade dos reis, com Nimloth no pátio do rei; o Templo que Sauron fez
// erguer na colina no meio da cidade, circular, com 500 pés de diâmetro e de altura, coroado por uma cúpula
// de prata que logo enegreceu com a fumaça (O Silmarillion, Akallabêth). Rómenna, o grande porto no fundo
// de uma baía da costa leste, de onde partiram os nove navios dos Fiéis (Contos Inacabados, Parte II, 1).
// Visual (escolhas da série Os Anéis de Poder, Prime Video; não são descrições de Tolkien): o paço sob o
// penhasco, com a rotunda de cúpula de bronze, os pavilhões de treliça azul, a grande muralha com arcada,
// friso de mosaico e cascata, a estátua do rei e a Torre do Rei no rochedo ao lado; no porto, o colosso de
// Eärendil junto ao rochedo, o farol de pedra com fogo, a ponte de três arcos com atlantes, os viadutos, as
// casas de teto plano com azul e ouro e os navios de velas em leque.
// A série mostra uma única cidade à beira-mar. O atlas mantém a geografia de Tolkien: o paço fica em
// Armenelos, no interior, e o porto com o colosso fica em Rómenna.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { FaseArmenelos, FaseRomenna } from '../core/detalhes';
import { rng } from '../terrain/noise';
import { casco, cilindro, cone, copa, cupula, material, oficina, PE, type M } from './oficina';
export { casco } from './oficina';

// ---------------------------------------------------------------- Peças de Númenor

/** Painel de parede com vão em arco pleno: largura em X, espessura em Y e altura em Z unitárias, base em z = 0. */
const vao = (() => {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0);
  s.lineTo(-0.36, 0);
  s.lineTo(-0.36, 0.5);
  s.absarc(0, 0.5, 0.36, Math.PI, 0, true);
  s.lineTo(0.36, 0);
  s.lineTo(0.5, 0);
  s.lineTo(0.5, 1);
  s.lineTo(-0.5, 1);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 8 }).translate(0, 0, -0.5).rotateX(Math.PI / 2);
})();
/** Vão cheio, com as mesmas convenções: portais e painéis em arco. */
const arcoCheio = (() => {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0);
  s.lineTo(-0.5, 0.5);
  s.absarc(0, 0.5, 0.5, Math.PI, 0, true);
  s.lineTo(0.5, 0);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 8 }).translate(0, 0, -0.5).rotateX(Math.PI / 2);
})();
/** Tronco de cone centrado (raio 1 na base, 0,5 no topo): os mantos das estátuas. */
const troncoCone = new THREE.CylinderGeometry(0.5, 1, 1, 14).rotateX(Math.PI / 2);
/** Disco de eixo horizontal (Y): medalhões nas fachadas. */
const disco = new THREE.CylinderGeometry(1, 1, 1, 18);
/** Braço erguido: parte da origem e sobe a 50° para +Y. */
const bracoErguido = new THREE.CylinderGeometry(0.1, 0.13, 1, 8).translate(0, 0.5, 0).rotateX(THREE.MathUtils.degToRad(50));
/** Manto que cai do braço erguido até o chão: lâmina vertical no plano YZ, em frações da altura da estátua. */
const drapeado = (() => {
  const s = new THREE.Shape();
  s.moveTo(0.08, 0);
  s.lineTo(0.3, 0);
  s.lineTo(0.33, 1);
  s.lineTo(0.1, 0.82);
  s.closePath();
  const paraYZ = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0));
  return new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false }).applyMatrix4(paraYZ);
})();
/** Vela em leque: setor vertical no plano XZ, aberto a partir do pé do mastro. */
export const leque = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.absarc(0, 0, 1, 0.12 * Math.PI, 0.62 * Math.PI, false);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -0.01).rotateX(Math.PI / 2);
})();

/**
 * Rochedo de topo plano em z1: contorno elíptico irregular e faces íngremes que se abrem até 1,3× na base (z0).
 * Calcário claro com veios e manchas de mato, por vértice. Dentro de 90% do contorno nominal o topo é chão firme.
 */
function rochedo(x: number, y: number, rx: number, ry: number, z0: number, z1: number, semente: number, { ang = 0, cume = 0, topo = 0x8a9a58 } = {}): THREE.BufferGeometry {
  const N = 48, K = 8;
  const r = rng(semente);
  const f = Array.from({ length: 6 }, () => r() * Math.PI * 2);
  const pos: number[] = [], cor: number[] = [], idx: number[] = [];
  const pedra = new THREE.Color(0xe6dfcb), veio = new THREE.Color(0xb9b09a), mato = new THREE.Color(0x61793d), c = new THREE.Color();
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const ponto = (a: number, raio: number, z: number, tom: THREE.Color) => {
    const px = Math.cos(a) * rx * raio, py = Math.sin(a) * ry * raio;
    pos.push(x + px * ca - py * sa, y + px * sa + py * ca, z);
    cor.push(tom.r, tom.g, tom.b);
  };
  const borda = (a: number) => 1 + 0.05 * Math.sin(a * 3 + f[0]) + 0.035 * Math.sin(a * 7 + f[1]);
  for (let k = 0; k <= K; k++) {
    const t = k / K; // 0 no topo, 1 na base
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const dobra = t * (0.07 * Math.sin(a * 5 + t * 9 + f[2]) + 0.045 * Math.sin(a * 11 - t * 13 + f[3])) + Math.sin(Math.PI * t) * 0.035 * Math.sin(a * 8 + f[4]);
      const verde = Math.sin(a * 4 + t * 6 + f[4]) + 0.6 * Math.sin(a * 9 - t * 5 + f[5]);
      c.copy(pedra).lerp(veio, 0.5 + 0.35 * Math.sin(a * 13 + t * 17 + f[1]) + 0.15 * Math.sin(t * 22 + f[3])).lerp(mato, THREE.MathUtils.smoothstep(verde, 0.8, 1.4) * 0.8);
      ponto(a, borda(a) * (1 + 0.05 * t + 0.25 * t * t) + dobra, z1 + (z0 - z1) * t, c);
    }
  }
  for (let k = 0; k < K; k++)
    for (let i = 0; i < N; i++) {
      const a = k * N + i, b = k * N + ((i + 1) % N);
      idx.push(a, a + N, b, b, a + N, b + N);
    }
  // topo: anel próprio, para a cor do chão não escorrer pelas faces
  const anel = pos.length / 3;
  c.set(topo);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    ponto(a, borda(a), z1, c);
  }
  pos.push(x, y, z1 + cume);
  cor.push(c.r, c.g, c.b);
  for (let i = 0; i < N; i++) idx.push(anel + N, anel + i, anel + ((i + 1) % N));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3));
  geo.setIndex(idx);
  const facetado = geo.toNonIndexed();
  facetado.computeVertexNormals();
  return facetado;
}

function rochas(nome: string, geos: THREE.BufferGeometry[], m: M): THREE.Mesh {
  const mesh = new THREE.Mesh(mergeGeometries(geos), m);
  mesh.name = nome;
  return mesh;
}

/** Distância de um ponto ao segmento [x0, y0, x1, y1]. */
function distSeg(x: number, y: number, [x0, y0, x1, y1]: readonly number[]): number {
  const dx = x1 - x0, dy = y1 - y0;
  const t = Math.min(1, Math.max(0, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - x0 - dx * t, y - y0 - dy * t);
}

function paleta() {
  return {
    branca: material(0xf3f0e7),
    pedra: material(0xddd6c3),
    creme: [material(0xf0e4c8), material(0xe6d8b6), material(0xf5ecd9)],
    laje: material(0xd6c8a6),
    ardosia: material(0x5f6872),
    azul: material(0x2d5aa0),
    turquesa: material(0x3f8f95),
    bronze: material(0xa9783a, { metalness: 0.6, roughness: 0.45 }),
    ouro: material(0xd9b24c, { metalness: 0.7, roughness: 0.35 }),
    sombra: material(0x2b3038),
    estatua: material(0xe1dac8),
    cipreste: material(0x2f4a2a),
    folhas: material(0x4d7636),
    tronco: material(0x5b4633),
    calcada: material(0xd9cfb6),
    terra: material(0xb9ad8c),
    relva: material(0x7d9a4c),
    agua: material(0x6fb3c4, { roughness: 0.25 }),
    queda: material(0xe9f4f5, { transparent: true, opacity: 0.82 }),
    fogo: material(0xffb347, { emissive: 0xff7a1a, emissiveIntensity: 1.4 }),
    fumaca: material(0x6e6c6a, { transparent: true, opacity: 0.22, depthWrite: false }),
    rocha: material(0xffffff, { vertexColors: true }),
  };
}

/** Peças no estilo de Númenor da série, sobre os lotes de uma oficina. */
function pecas(o: ReturnType<typeof oficina>, p: ReturnType<typeof paleta>) {
  const { peca, bloco, rand, giro } = o;

  /** Casa de teto plano: corpo creme, platibanda e janelas; às vezes um segundo corpo recuado, uma cúpula ou uma faixa azul. */
  function casa(x: number, y: number, z: number, w: number, d: number, h: number, ang: number) {
    const m = p.creme[Math.floor(rand() * 3)], sorte = rand();
    bloco(m, x, y, w, d, h, z, ang);
    bloco(p.laje, x, y, w * 1.05, d * 1.05, 0.0011, z + h, ang);
    if (sorte < 0.4) {
      const [dx, dy] = giro(ang, -w * 0.18, d * 0.12);
      bloco(m, x + dx, y + dy, w * 0.58, d * 0.7, h * 0.55, z + h, ang);
      bloco(p.laje, x + dx, y + dy, w * 0.62, d * 0.75, 0.001, z + h * 1.55, ang);
    } else if (sorte < 0.47) peca(cupula, sorte < 0.44 ? p.ouro : p.azul, x, y, z + h + 0.001, d * 0.3, d * 0.3, d * 0.26);
    if (sorte > 0.72) bloco(sorte > 0.9 ? p.turquesa : p.azul, x, y, w * 1.01, d * 1.02, 0.0013, z + h * 0.66, ang);
    const n = Math.max(1, Math.round(w / 0.007));
    for (let j = 0; j < n; j++)
      for (const s of [-1, 1]) {
        const [dx, dy] = giro(ang, ((j + 0.5) / n - 0.5) * w * 0.9, s * (d / 2 + 0.0002));
        bloco(p.sombra, x + dx, y + dy, 0.0022, 0.0006, h * 0.3, z + h * 0.28, ang);
      }
  }

  const cipreste = (x: number, y: number, z: number, s: number) => peca(cone, p.cipreste, x, y, z + s / 2, s * 0.14, s * 0.14, s);
  const arvore = (x: number, y: number, z: number, s: number) => o.arvore(p.tronco, p.folhas, x, y, z, s);

  /** Arcada entre dois pontos: painéis com vão em arco e, nas arcadas cegas, um fundo escuro. */
  function arcada(m: M, x0: number, y0: number, x1: number, y1: number, z: number, h: number, passo: number, esp: number, fundo = true) {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(len / passo)), ang = Math.atan2(y1 - y0, x1 - x0);
    for (let j = 0; j < n; j++) {
      const t = (j + 0.5) / n;
      peca(vao, m, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z, len / n, esp, h, ang);
    }
    if (fundo) bloco(p.sombra, (x0 + x1) / 2, (y0 + y1) / 2, len, esp * 0.4, h, z, ang);
  }

  /** Ponte ou aqueduto: arcada vazada, tabuleiro e parapeitos. */
  function ponte(m: M, x0: number, y0: number, x1: number, y1: number, z: number, h: number, passo: number, larg: number) {
    const len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    arcada(m, x0, y0, x1, y1, z, h, passo, larg, false);
    bloco(m, mx, my, len + 0.002, larg * 1.12, h * 0.06, z + h, ang);
    for (const l of [-1, 1]) {
      const [dx, dy] = giro(ang, 0, l * larg * 0.56);
      bloco(m, mx + dx, my + dy, len + 0.002, larg * 0.08, h * 0.05, z + h * 1.06, ang);
    }
  }

  /**
   * Frente de muralha entre dois pontos, com o lado de fora à direita de quem vai do primeiro ao segundo:
   * pilastras, friso de mosaico azul entre filetes dourados, arcada e cornija. A versão simples tem só arcos cegos.
   */
  function frente(x0: number, y0: number, x1: number, y1: number, h: number, z = 0, simples = false) {
    const len = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / len, uy = (y1 - y0) / len, ang = Math.atan2(uy, ux);
    const nx = uy, ny = -ux, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    bloco(p.branca, mx + nx * 0.0015, my + ny * 0.0015, len + 0.003, 0.004, h * 0.035, z + h * 0.975, ang);
    if (simples) {
      arcada(p.branca, x0 + nx * 0.001, y0 + ny * 0.001, x1 + nx * 0.001, y1 + ny * 0.001, z + h * 0.08, h * 0.8, 0.02, 0.0024);
      return;
    }
    const zf = z + h * 0.68, n = Math.max(1, Math.round(len / 0.03));
    for (let j = 0; j <= n; j++) bloco(p.branca, x0 + (ux * len * j) / n + nx * 0.0012, y0 + (uy * len * j) / n + ny * 0.0012, 0.004, 0.0024, h * 0.68, z, ang);
    bloco(p.azul, mx + nx * 0.0008, my + ny * 0.0008, len, 0.0016, h * 0.115, zf, ang);
    for (const dz of [0, h * 0.115]) bloco(p.ouro, mx + nx * 0.0012, my + ny * 0.0012, len, 0.0024, 0.0007, zf + dz, ang);
    arcada(p.branca, x0 + nx * 0.0012, y0 + ny * 0.0012, x1 + nx * 0.0012, y1 + ny * 0.0012, zf + h * 0.13, h * 0.16, 0.009, 0.0024);
  }

  /** Salão de pedra branca: rodapé azul, janelas altas nas fachadas longas, cornija dourada e terraço de ardósia. */
  function salao(x: number, y: number, z: number, w: number, d: number, h: number, ang: number) {
    bloco(p.branca, x, y, w, d, h, z, ang);
    bloco(p.azul, x, y, w + 0.0006, d + 0.0006, h * 0.16, z + h * 0.04, ang);
    bloco(p.ouro, x, y, w + 0.001, d + 0.001, h * 0.04, z + h * 0.9, ang);
    bloco(p.ardosia, x, y, w * 0.94, d * 0.88, 0.0012, z + h, ang);
    const n = Math.max(2, Math.round(w / 0.011));
    for (let j = 0; j < n; j++)
      for (const s of [-1, 1]) {
        const [dx, dy] = giro(ang, ((j + 0.5) / n - 0.5) * w * 0.92, s * (d / 2 + 0.0005));
        bloco(p.sombra, x + dx, y + dy, (w / n) * 0.42, 0.0006, h * 0.5, z + h * 0.28, ang);
      }
  }

  /** Pavilhão cúbico com painéis de treliça azul nas quatro faces e cornija dourada. */
  function pavilhao(x: number, y: number, z: number, w: number, h: number, ang = 0) {
    bloco(p.branca, x, y, w, w, h, z, ang);
    for (let q = 0; q < 4; q++) {
      const a = ang + (q * Math.PI) / 2;
      bloco(p.azul, x + Math.cos(a) * (w / 2 + 0.0002), y + Math.sin(a) * (w / 2 + 0.0002), 0.0006, w * 0.5, h * 0.62, z + h * 0.22, a);
    }
    bloco(p.ouro, x, y, w * 1.1, w * 1.1, 0.0012, z + h, ang);
    bloco(p.branca, x, y, w * 0.92, w * 0.92, 0.002, z + h + 0.0012, ang);
  }

  /**
   * Colosso de pedra voltado para `ang`: manto até os pés e a espada apontada para o chão diante do corpo.
   * Eärendil ergue o braço esquerdo, de onde cai o manto, e leva Elwing, como ave, no ombro direito.
   */
  function colosso(m: M, x: number, y: number, z: number, H: number, ang: number, earendil = false) {
    const em = (dx: number, dy: number) => {
      const [a, b] = giro(ang, dx * H, dy * H);
      return [x + a, y + b] as const;
    };
    const parte = (geo: THREE.BufferGeometry, dx: number, dy: number, zc: number, sx: number, sy: number, sz: number) => {
      const [a, b] = em(dx, dy);
      peca(geo, m, a, b, z + zc * H, sx * H, sy * H, sz * H, ang);
    };
    parte(troncoCone, -0.03, 0, 0.4, 0.15, 0.26, 0.8); // capa
    parte(troncoCone, 0, 0, 0.31, 0.13, 0.15, 0.62); // túnica
    parte(cilindro, 0, 0, 0.72, 0.075, 0.1, 0.22); // tronco
    parte(copa, 0, 0, 0.82, 0.075, 0.15, 0.04); // ombros
    parte(cilindro, 0, 0, 0.865, 0.03, 0.03, 0.05);
    parte(copa, 0.005, 0, 0.93, 0.042, 0.042, 0.055); // cabeça
    parte(copa, -0.022, 0, 0.9, 0.05, 0.062, 0.085); // cabelos
    parte(o.caixa, 0.1, 0, 0.36, 0.012, 0.03, 0.56); // lâmina
    parte(o.caixa, 0.1, 0, 0.63, 0.016, 0.12, 0.016); // guarda
    parte(o.caixa, 0.1, 0, 0.67, 0.016, 0.02, 0.07); // punho
    parte(copa, 0.085, 0, 0.69, 0.035, 0.05, 0.03); // mãos sobre o punho
    parte(cilindro, 0.01, -0.125, 0.74, 0.028, 0.028, 0.14); // braço direito
    parte(o.caixa, 0.05, -0.085, 0.685, 0.09, 0.045, 0.04);
    if (!earendil) {
      parte(cilindro, 0.01, 0.125, 0.74, 0.028, 0.028, 0.14); // braço esquerdo, também sobre a espada
      parte(o.caixa, 0.05, 0.085, 0.685, 0.09, 0.045, 0.04);
      return;
    }
    parte(bracoErguido, 0, 0.12, 0.8, 0.3, 0.3, 0.3);
    parte(copa, 0, 0.12 + 0.3 * 0.643, 0.8 + 0.3 * 0.766 + 0.02, 0.03, 0.04, 0.045); // mão aberta
    parte(drapeado, -0.07, 0, 0, 1, 1, 1);
    parte(copa, 0, -0.13, 0.86, 0.035, 0.045, 0.03); // Elwing
  }

  /** Atlante: figura de braços erguidos que sustenta a cornija da ponte. */
  function atlante(m: M, x: number, y: number, z: number, H: number, ang: number) {
    const em = (dx: number, dy: number, zc: number, sx: number, sy: number, sz: number, geo: THREE.BufferGeometry = o.caixa) => {
      const [a, b] = giro(ang, dx * H, dy * H);
      peca(geo, m, x + a, y + b, z + zc * H, sx * H, sy * H, sz * H, ang);
    };
    for (const l of [-1, 1]) {
      em(0, l * 0.06, 0.2, 0.08, 0.08, 0.4);
      em(0, l * 0.15, 0.86, 0.07, 0.07, 0.3);
    }
    em(0, 0, 0.45, 0.13, 0.24, 0.16);
    em(0, 0, 0.64, 0.12, 0.22, 0.24);
    em(0, 0, 0.83, 0.07, 0.07, 0.08, copa);
  }

  /** Farol de pedra em estilo élfico: corpo esguio com contrafortes, gabletes e janelas em lanceta, e o fogo no alto. */
  function farol(m: M, x: number, y: number, z: number, H: number) {
    const anel = (r: number, z0: number, z1: number, mat = m) => peca(cilindro, mat, x, y, z + ((z0 + z1) / 2) * H, r * H, r * H, (z1 - z0) * H);
    anel(0.17, 0, 0.1);
    anel(0.14, 0.1, 0.32);
    anel(0.095, 0.32, 0.72);
    anel(0.13, 0.72, 0.75);
    anel(0.075, 0.75, 0.9);
    anel(0.095, 0.9, 0.925);
    for (let q = 0; q < 8; q++) {
      const a = (q * Math.PI) / 4, b = a + Math.PI / 8, c = Math.cos(a), s = Math.sin(a);
      peca(cone, m, x + c * 0.125 * H, y + s * 0.125 * H, z + 0.37 * H, 0.035 * H, 0.035 * H, 0.1 * H);
      bloco(m, x + c * 0.105 * H, y + s * 0.105 * H, 0.03 * H, 0.014 * H, 0.38 * H, z + 0.32 * H, a);
      peca(cone, m, x + c * 0.115 * H, y + s * 0.115 * H, z + 0.785 * H, 0.02 * H, 0.02 * H, 0.07 * H);
      bloco(p.sombra, x + Math.cos(b) * 0.094 * H, y + Math.sin(b) * 0.094 * H, 0.004 * H, 0.03 * H, 0.26 * H, z + 0.4 * H, b);
      bloco(p.sombra, x + Math.cos(b) * 0.139 * H, y + Math.sin(b) * 0.139 * H, 0.004 * H, 0.04 * H, 0.13 * H, z + 0.14 * H, b);
      bloco(p.sombra, x + Math.cos(b) * 0.0745 * H, y + Math.sin(b) * 0.0745 * H, 0.004 * H, 0.03 * H, 0.1 * H, z + 0.78 * H, b);
    }
    peca(copa, p.fogo, x, y, z + 0.955 * H, 0.06 * H, 0.06 * H, 0.05 * H);
    peca(cone, p.fogo, x + 0.01 * H, y, z + 1.04 * H, 0.045 * H, 0.045 * H, 0.16 * H);
    for (let j = 0; j < 5; j++) peca(copa, p.fumaca, x + (0.05 + j * 0.06) * H, y + j * 0.02 * H, z + (1.12 + j * 0.09) * H, (0.04 + j * 0.014) * H, (0.035 + j * 0.012) * H, (0.03 + j * 0.01) * H);
  }

  /** Navio de Númenor: proa e popa altas e as velas em leque, abertas aos pares como asas, ou fechadas junto aos mastros. */
  function navio(m: { casco: M; conves: M; mastro: M; vela: M; ouro: M }, x: number, y: number, ang: number, abertas: boolean, L = 0.05) {
    const B = L * 0.26, conves = 0.006;
    const em = (dx: number, dy = 0) => {
      const [a, b] = giro(ang, dx, dy);
      return [x + a, y + b] as const;
    };
    peca(casco, m.casco, x, y, -0.002, L, B, 0.008, ang);
    bloco(m.conves, x, y, L * 0.8, B * 0.7, 0.0004, conves, ang);
    const [px, py] = em(-L * 0.4);
    bloco(m.casco, px, py, L * 0.18, B * 0.8, 0.005, conves, ang); // castelo de popa
    bloco(m.ouro, px, py, L * 0.19, B * 0.84, 0.0006, conves + 0.005, ang);
    const [rx, ry] = em(-L * 0.5);
    peca(cone, m.casco, rx, ry, conves + 0.008, 0.0012, 0.0012, 0.012); // cadaste
    const [qx, qy] = em(L * 0.5);
    peca(cone, m.casco, qx, qy, conves + 0.007, 0.0014, 0.0014, 0.016); // roda de proa
    peca(copa, m.ouro, qx, qy, conves + 0.0155, 0.0012, 0.0012, 0.0012);
    for (const [dx, h] of [[L * 0.2, 0.034], [-L * 0.14, 0.03]] as const) {
      const [mx, my] = em(dx);
      peca(cilindro, m.mastro, mx, my, conves + h / 2, 0.0005, 0.0005, h);
      // no porto, os leques ficam fechados junto ao mastro
      for (const l of [-1, 1]) peca(leque, m.vela, mx, my, conves + 0.003, h * (abertas ? 0.95 : 0.3), 0.03, h * 0.95, ang + l * 1.3);
    }
    const [fx, fy] = em(L * 0.2);
    bloco(m.ouro, fx, fy, 0.004, 0.0004, 0.0022, conves + 0.034, ang); // flâmula
  }

  return { casa, cipreste, arvore, arcada, ponte, frente, salao, pavilhao, colosso, atlante, farol, navio };
}

// ---------------------------------------------------------------- Armenelos

/** Nível do paço e do pátio do rei, sobre a grande muralha. */
const ZP = 0.08;
/** Os dois degraus diante do pódio do paço. */
const DEGRAUS = [0.027, 0.054];
const ROTUNDA: [number, number] = [-0.2, 0.02];
/** O terraço do pátio do rei: centro, eixo voltado a nordeste, comprimento e largura. */
const TERRACO = { x: 0.06, y: 0.12, ang: THREE.MathUtils.degToRad(25), comp: 0.36, larg: 0.13 };
const TA = [Math.cos(TERRACO.ang), Math.sin(TERRACO.ang)];
/** Ponto no referencial do terraço: u ao longo do eixo, v para noroeste. */
const noTerraco = (u: number, v: number): [number, number] => [TERRACO.x + TA[0] * u - TA[1] * v, TERRACO.y + TA[1] * u + TA[0] * v];
const doTerraco = (x: number, y: number): [number, number] => [(x - TERRACO.x) * TA[0] + (y - TERRACO.y) * TA[1], -(x - TERRACO.x) * TA[1] + (y - TERRACO.y) * TA[0]];
/** Nimloth, no meio do pátio do rei. */
export const NIMLOTH = noTerraco(0.03, 0);
export const TORRE_DO_REI = { x: -0.16, y: 0.22, rocha: 0.1, altura: 0.185 };
/** A colina no meio da cidade: jardins e, depois, o Templo. */
export const COLINA = { x: 0.26, y: -0.38, r: 0.2, topo: 0.095, h: 0.03 };
/** Templo de Melkor: 500 pés de diâmetro na base e 500 pés de altura até a cúpula. */
export const TEMPLO = { raio: (500 * PE) / 2, altura: 500 * PE };
const MACICO = { x: -0.55, y: -0.08, rx: 0.22, ry: 0.38 };
/** Bairro em terraço ao pé da grande muralha, no referencial do pátio. */
const BAIRRO = { u: 0.02, v: -0.135, comp: 0.2, larg: 0.14, h: 0.02 };
/** Patamares de casas na encosta sudoeste. */
const ENCOSTA = [{ x: -0.27, y: -0.33, rx: 0.11, ry: 0.085, z0: 0, z1: 0.03 }, { x: -0.335, y: -0.275, rx: 0.06, ry: 0.055, z0: 0.03, z1: 0.06 }];
/** O lago ao pé da cascata, que cai da grande muralha junto ao canto leste. */
const CASCATA = 0.165;
const LAGO = noTerraco(CASCATA, -0.095);
const CANAL = [LAGO[0], LAGO[1], 0.86, -0.02];
const AQUEDUTO = [0.84, 0.48, ...noTerraco(0.185, 0.03)];
const AVENIDA = [0.04, -0.125, 0.9, -0.125];

/** Altura da colina no meio da cidade; o topo plano abriga jardins e, depois, o Templo. */
export function alturaColina(x: number, y: number): number {
  const r = Math.hypot(x - COLINA.x, y - COLINA.y);
  if (r <= COLINA.topo) return COLINA.h;
  if (r >= COLINA.r) return 0;
  return COLINA.h * 0.5 * (1 + Math.cos((Math.PI * (r - COLINA.topo)) / (COLINA.r - COLINA.topo)));
}

/** Chão dos bairros: altura onde se pode construir, ou null onde há paço, rocha, água ou rua. */
function chaoArmenelos(x: number, y: number): number | null {
  if (Math.hypot(x, y) > 0.9) return null;
  if (((x - MACICO.x) / (MACICO.rx * 1.4)) ** 2 + ((y - MACICO.y) / (MACICO.ry * 1.4)) ** 2 < 1) return null;
  if (x > -0.33 && x < 0.045 && y > -0.17 && y < 0.14) return null; // paço, degraus e praça
  const [u, v] = doTerraco(x, y);
  if (Math.abs(u) < TERRACO.comp / 2 + 0.012 && Math.abs(v) < TERRACO.larg / 2 + 0.012) return null;
  if (Math.hypot(x - TORRE_DO_REI.x, y - TORRE_DO_REI.y) < 0.092) return null;
  if (Math.hypot(x - COLINA.x, y - COLINA.y) < COLINA.r + 0.022) return null;
  if (Math.hypot(x - LAGO[0], y - LAGO[1]) < 0.034) return null;
  if (distSeg(x, y, CANAL) < 0.018 || distSeg(x, y, AQUEDUTO) < 0.014 || distSeg(x, y, AVENIDA) < 0.02) return null;
  const e = ENCOSTA[0];
  if (((x - e.x) / (e.rx * 1.4)) ** 2 + ((y - e.y) / (e.ry * 1.4)) ** 2 < 1) return null;
  const du = Math.abs(u - BAIRRO.u), dv = Math.abs(v - BAIRRO.v);
  if (du < BAIRRO.comp / 2 + 0.01 && dv < BAIRRO.larg / 2 + 0.01) return du < BAIRRO.comp / 2 - 0.012 && dv < BAIRRO.larg / 2 - 0.012 ? BAIRRO.h : null;
  return 0;
}

export function criarArmenelos(fase: FaseArmenelos): THREE.Group {
  const templo = fase === 'templo';
  const cidade = new THREE.Group();
  cidade.name = `Armenelos: ${fase}`;
  const o = oficina(32);
  const { peca, bloco, rand } = o;
  const p = paleta();
  const k = pecas(o, p);
  const gramado = material(0x84a352);
  const sebe = material(0x3d5c2c);
  const canteiros = [material(0xe2c255), material(0xf4f0e2), material(0xc9819a), material(0x9b6fb0)];

  // Base em talude, esticada com o exagero do relevo: na encosta vira aterro, sem deixar a cidade flutuando.
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.8, 0.8, 72).rotateX(Math.PI / 2).translate(0, 0, -0.4), p.relva);
  base.name = 'Base';
  cidade.add(base);
  peca(cilindro, p.terra, 0.2, -0.12, 0.0004, 0.62, 0.52, 0.0008);

  // O penhasco atrás do paço, em três lances; o rochedo da Torre do Rei; os patamares da encosta.
  cidade.add(rochas('Rochas', [
    rochedo(MACICO.x, MACICO.y, MACICO.rx, MACICO.ry, 0, 0.17, 11),
    rochedo(MACICO.x - 0.04, MACICO.y + 0.02, 0.15, 0.3, 0.17, 0.25, 12),
    rochedo(MACICO.x - 0.06, MACICO.y + 0.06, 0.09, 0.19, 0.25, 0.31, 13, { cume: 0.03 }),
    rochedo(TORRE_DO_REI.x, TORRE_DO_REI.y, 0.06, 0.055, 0, TORRE_DO_REI.rocha, 14),
    ...ENCOSTA.map((e, i) => rochedo(e.x, e.y, e.rx, e.ry, e.z0, e.z1, 15 + i, { topo: 0xcfc4a6 })),
  ], p.rocha));
  const bosque = (cx: number, cy: number, rx: number, ry: number, z: number, n: number, fora?: (x: number, y: number) => boolean) => {
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 0.84, s = rand();
      const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
      if (fora?.(x, y)) continue;
      if (s < 0.35) k.cipreste(x, y, z, 0.014 + s * 0.03);
      else k.arvore(x, y, z, 0.009 + s * 0.008);
    }
  };
  const naElipse = (cx: number, cy: number, rx: number, ry: number) => (x: number, y: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1;
  bosque(MACICO.x, MACICO.y, MACICO.rx, MACICO.ry, 0.17, 70, naElipse(MACICO.x - 0.04, MACICO.y + 0.02, 0.15 * 1.35, 0.3 * 1.35));
  bosque(MACICO.x - 0.04, MACICO.y + 0.02, 0.15, 0.3, 0.25, 60, naElipse(MACICO.x - 0.06, MACICO.y + 0.06, 0.09 * 1.35, 0.19 * 1.35));
  bosque(MACICO.x - 0.06, MACICO.y + 0.06, 0.07, 0.15, 0.315, 24);

  // Pódio do paço e os dois degraus da frente, com as escadarias que sobem da praça.
  bloco(p.pedra, -0.195, -0.01, 0.21, 0.26, ZP);
  bloco(p.pedra, -0.0725, -0.02, 0.035, 0.22, DEGRAUS[1]);
  bloco(p.pedra, -0.04, -0.035, 0.03, 0.17, DEGRAUS[0]);
  k.frente(-0.3, -0.14, -0.09, -0.14, ZP);
  k.frente(-0.055, -0.13, -0.055, 0.09, DEGRAUS[1], 0, true);
  k.frente(-0.025, -0.12, -0.025, 0.05, DEGRAUS[0], 0, true);
  k.frente(-0.09, -0.13, -0.055, -0.13, DEGRAUS[1], 0, true);
  bloco(p.calcada, -0.195, -0.01, 0.2, 0.25, 0.0006, ZP);
  bloco(p.calcada, 0.01, -0.095, 0.07, 0.13, 0.0008); // praça ao pé das escadarias
  const escada = (x: number, z: number, dz: number) => {
    for (let i = 0; i < 5; i++) bloco(p.branca, x - i * 0.003, -0.06, 0.003, 0.026, ((i + 1) * dz) / 5, z);
  };
  escada(-0.0115, 0, DEGRAUS[0]);
  escada(-0.0415, DEGRAUS[0], DEGRAUS[1] - DEGRAUS[0]);
  escada(-0.0765, DEGRAUS[1], ZP - DEGRAUS[1]);
  k.pavilhao(-0.0725, 0.06, DEGRAUS[1], 0.022, 0.04);
  k.pavilhao(-0.0725, -0.11, DEGRAUS[1], 0.02, 0.03);
  k.pavilhao(-0.04, -0.1, DEGRAUS[0], 0.018, 0.028);
  for (let i = 0; i < 6; i++) k.cipreste(-0.04, -0.03 + i * 0.012, DEGRAUS[0], 0.016);

  // A rotunda: corpo quadrado com quatro pilones, tambor com faixa de janelas azuis e a cúpula de bronze.
  const [RX, RY] = ROTUNDA;
  bloco(p.branca, RX, RY, 0.084, 0.084, 0.02, ZP);
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      bloco(p.branca, RX + sx * 0.036, RY + sy * 0.036, 0.016, 0.016, 0.034, ZP);
      bloco(p.ouro, RX + sx * 0.036, RY + sy * 0.036, 0.0172, 0.0172, 0.0012, ZP + 0.034);
    }
  peca(cilindro, p.branca, RX, RY, ZP + 0.028, 0.036, 0.036, 0.016);
  peca(cilindro, p.azul, RX, RY, ZP + 0.0405, 0.0355, 0.0355, 0.009);
  for (let i = 0; i < 28; i++) {
    const a = (i * Math.PI * 2) / 28;
    bloco(p.branca, RX + Math.cos(a) * 0.0358, RY + Math.sin(a) * 0.0358, 0.0016, 0.0022, 0.009, ZP + 0.036, a);
  }
  peca(cilindro, p.branca, RX, RY, ZP + 0.04625, 0.0385, 0.0385, 0.0025);
  peca(cilindro, p.ouro, RX, RY, ZP + 0.048, 0.0372, 0.0372, 0.001);
  peca(cupula, p.bronze, RX, RY, ZP + 0.0485, 0.0365, 0.0365, 0.021);
  peca(cilindro, p.ouro, RX, RY, ZP + 0.0705, 0.004, 0.004, 0.003);
  o.finial(p.ouro, RX, RY, ZP + 0.072, 0.012);
  // portal a leste: arco escuro em moldura azul e ouro, entre dois pilones
  bloco(p.branca, RX + 0.05, RY, 0.022, 0.046, 0.042, ZP);
  peca(arcoCheio, p.ouro, RX + 0.0614, RY, ZP, 0.034, 0.001, 0.038, Math.PI / 2);
  peca(arcoCheio, p.azul, RX + 0.0618, RY, ZP, 0.03, 0.001, 0.035, Math.PI / 2);
  peca(arcoCheio, p.sombra, RX + 0.0622, RY, ZP, 0.02, 0.001, 0.028, Math.PI / 2);
  for (const s of [-1, 1]) {
    bloco(p.branca, RX + 0.052, RY + s * 0.031, 0.016, 0.014, 0.05, ZP);
    bloco(p.ouro, RX + 0.052, RY + s * 0.031, 0.0172, 0.0152, 0.0012, ZP + 0.05);
    bloco(p.azul, RX + 0.0602, RY + s * 0.031, 0.0006, 0.006, 0.03, ZP + 0.012);
  }
  for (let i = 0; i < 4; i++) bloco(p.branca, RX + 0.064 + i * 0.004, RY, 0.004, 0.04, 0.004 - i * 0.001, ZP);
  // ala sul com dois pavilhões de cúpula dourada; anexo norte com o pavilhão de treliça
  k.salao(RX, RY - 0.092, ZP, 0.05, 0.1, 0.024, Math.PI / 2);
  for (const s of [-1, 1]) {
    const x = RX + s * 0.02, y = RY - 0.148;
    bloco(p.branca, x, y, 0.018, 0.018, 0.036, ZP);
    bloco(p.ouro, x, y, 0.0195, 0.0195, 0.0012, ZP + 0.036);
    peca(cilindro, p.branca, x, y, ZP + 0.0402, 0.006, 0.006, 0.006);
    peca(cupula, p.ouro, x, y, ZP + 0.0432, 0.0066, 0.0066, 0.006);
  }
  k.salao(RX + 0.012, RY + 0.068, ZP, 0.06, 0.036, 0.02, 0);
  k.pavilhao(RX + 0.05, RY + 0.066, ZP, 0.02, 0.036);
  // ponte do paço ao rochedo da torre
  k.ponte(p.branca, -0.168, 0.118, -0.163, 0.172, 0, ZP - 0.004, 0.018, 0.006);

  // A Torre do Rei: fuste branco e esguio, cinta de lancetas e coroa de pináculos.
  {
    const { x, y, rocha: z } = TORRE_DO_REI;
    let zt = z;
    for (const [r, h] of [[0.0098, 0.065], [0.0086, 0.05], [0.0075, 0.03]]) {
      peca(cilindro, p.branca, x, y, zt + h / 2, r, r, h);
      peca(cilindro, p.branca, x, y, zt + h, r * 1.18, r * 1.18, 0.002);
      zt += h;
    }
    peca(cilindro, p.branca, x, y, zt + 0.008, 0.0066, 0.0066, 0.016);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4, b = a + Math.PI / 8;
      bloco(p.branca, x + Math.cos(a) * 0.0078, y + Math.sin(a) * 0.0078, 0.003, 0.0012, 0.02, zt - 0.002, a);
      peca(cone, p.branca, x + Math.cos(a) * 0.0082, y + Math.sin(a) * 0.0082, zt + 0.023, 0.0014, 0.0014, 0.01);
      bloco(p.sombra, x + Math.cos(b) * 0.0066, y + Math.sin(b) * 0.0066, 0.0006, 0.003, 0.012, zt + 0.002, b);
    }
    peca(cone, p.branca, x, y, zt + 0.016 + 0.012, 0.0068, 0.0068, 0.024);
    bosque(x, y, 0.05, 0.045, z, 14, (px, py) => Math.hypot(px - x, py - y) < 0.016);
  }

  // O terraço do pátio do rei sobre a grande muralha: friso de mosaico, arcada e a cascata no canto leste.
  const [t0, t1] = [TERRACO.comp / 2, TERRACO.larg / 2];
  bloco(p.pedra, TERRACO.x, TERRACO.y, TERRACO.comp, TERRACO.larg, ZP, 0, TERRACO.ang);
  const cantos = [noTerraco(-t0, -t1), noTerraco(t0, -t1), noTerraco(t0, t1), noTerraco(-t0, t1)];
  for (let i = 0; i < 3; i++) k.frente(...cantos[i], ...cantos[i + 1], ZP);
  bloco(p.calcada, TERRACO.x, TERRACO.y, TERRACO.comp - 0.006, TERRACO.larg - 0.006, 0.0006, ZP, TERRACO.ang);
  for (const [u, w] of [[-0.07, 0.11], [0.12, 0.08]]) bloco(gramado, ...noTerraco(u, 0), w, TERRACO.larg - 0.04, 0.0005, ZP + 0.0006, TERRACO.ang);
  for (let u = -0.15; u < 0.172; u += 0.012) if (Math.abs(u - CASCATA) > 0.012) k.cipreste(...noTerraco(u, -0.055), ZP, 0.017);
  k.arcada(p.branca, ...noTerraco(-0.12, 0.057), ...noTerraco(0.17, 0.057), ZP, 0.011, 0.009, 0.003, false);
  bloco(p.branca, ...noTerraco(0.025, 0.057), 0.292, 0.005, 0.001, ZP + 0.011, TERRACO.ang);
  for (const [u, v] of [[-0.03, 0.03], [-0.03, -0.03], [0.09, 0.03], [0.09, -0.03]]) {
    bloco(canteiros[(u > 0 ? 1 : 0) + (v > 0 ? 2 : 0)], ...noTerraco(u, v), 0.03, 0.008, 0.0022, ZP + 0.0006, TERRACO.ang);
    bloco(sebe, ...noTerraco(u, v * 1.45), 0.036, 0.003, 0.0034, ZP + 0.0006, TERRACO.ang);
  }
  {
    const [x, y] = noTerraco(0.135, 0);
    peca(cilindro, p.branca, x, y, ZP + 0.0016, 0.012, 0.012, 0.002);
    peca(cilindro, p.agua, x, y, ZP + 0.0028, 0.0105, 0.0105, 0.0006);
    peca(cilindro, p.branca, x, y, ZP + 0.005, 0.0012, 0.0012, 0.006);
  }
  bloco(p.queda, ...noTerraco(CASCATA, -t1 - 0.003), 0.018, 0.002, ZP - 0.003, 0, TERRACO.ang);
  bloco(p.agua, ...noTerraco(CASCATA, -t1 + 0.012), 0.016, 0.03, 0.0005, ZP + 0.0008, TERRACO.ang);
  peca(cilindro, p.pedra, LAGO[0], LAGO[1], 0.0012, 0.03, 0.03, 0.0024);
  peca(cilindro, p.agua, LAGO[0], LAGO[1], 0.0016, 0.027, 0.027, 0.0024);
  peca(copa, p.queda, ...noTerraco(CASCATA, -t1 - 0.008), 0.003, 0.012, 0.007, 0.004, TERRACO.ang);

  // Nimloth, a Árvore Branca, no meio do pátio; depois de 3262, só o toco queimado.
  const [nx, ny] = NIMLOTH;
  peca(cilindro, p.branca, nx, ny, ZP + 0.0012, 0.026, 0.026, 0.0024);
  peca(cilindro, templo ? material(0x4a4440) : gramado, nx, ny, ZP + 0.0014, 0.022, 0.022, 0.0026);
  if (!templo) {
    const flores = material(0xfbfbf5, { emissive: 0x3a3a36 });
    peca(cilindro, material(0xd6d9db), nx, ny, ZP + 0.012, 0.0035, 0.0035, 0.022);
    peca(copa, flores, nx, ny, ZP + 0.032, 0.021, 0.021, 0.014);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8;
      peca(copa, flores, nx + Math.cos(a) * 0.018, ny + Math.sin(a) * 0.018, ZP + 0.025 + (i % 2) * 0.004, 0.013, 0.013, 0.01);
    }
    peca(copa, flores, nx, ny, ZP + 0.044, 0.013, 0.013, 0.01);
  } else peca(cilindro, material(0x2a2522), nx, ny, ZP + 0.0042, 0.0028, 0.0028, 0.003);

  // A estátua do rei no encontro da muralha com o paço.
  {
    const [x, y] = noTerraco(-0.145, -t1 - 0.014);
    bloco(p.pedra, x, y, 0.02, 0.02, 0.004, DEGRAUS[0], TERRACO.ang);
    k.colosso(p.estatua, x, y, DEGRAUS[0] + 0.004, 0.052, TERRACO.ang - Math.PI / 2);
  }

  // O bairro em terraço ao pé da muralha, com arcos cegos.
  {
    const [x, y] = noTerraco(BAIRRO.u, BAIRRO.v), c = BAIRRO.comp / 2, l = BAIRRO.larg / 2;
    const em = (u: number, v: number) => noTerraco(BAIRRO.u + u, BAIRRO.v + v);
    bloco(p.pedra, x, y, BAIRRO.comp, BAIRRO.larg, BAIRRO.h, 0, TERRACO.ang);
    k.frente(...em(-c, l), ...em(-c, -l), BAIRRO.h, 0, true);
    k.frente(...em(-c, -l), ...em(c, -l), BAIRRO.h, 0, true);
    k.frente(...em(c, -l), ...em(c, l), BAIRRO.h, 0, true);
    bloco(p.calcada, x, y, BAIRRO.comp - 0.004, BAIRRO.larg - 0.004, 0.0005, BAIRRO.h, TERRACO.ang);
  }

  // Aqueduto de dois andares até o pátio; canal da cascata até a borda da cidade, com três pontes.
  {
    const [x0, y0, x1, y1] = AQUEDUTO;
    k.arcada(p.pedra, x0, y0, x1, y1, 0, 0.048, 0.04, 0.008, false);
    k.ponte(p.pedra, x0, y0, x1, y1, 0.048, 0.028, 0.02, 0.008);
    const len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0);
    bloco(p.agua, (x0 + x1) / 2, (y0 + y1) / 2, len, 0.004, 0.0005, 0.0775, ang);
    const [cx0, cy0, cx1, cy1] = CANAL, cl = Math.hypot(cx1 - cx0, cy1 - cy0), ca = Math.atan2(cy1 - cy0, cx1 - cx0);
    bloco(p.pedra, (cx0 + cx1) / 2, (cy0 + cy1) / 2, cl, 0.018, 0.0016, 0, ca);
    bloco(p.agua, (cx0 + cx1) / 2, (cy0 + cy1) / 2, cl, 0.013, 0.002, 0, ca);
    for (const t of [0.22, 0.5, 0.78]) {
      const x = cx0 + (cx1 - cx0) * t, y = cy0 + (cy1 - cy0) * t, [dx, dy] = o.giro(ca, 0, 0.012);
      k.ponte(p.branca, x - dx, y - dy, x + dx, y + dy, 0, 0.006, 0.024, 0.008);
    }
  }

  // Avenida da borda leste até a praça, entre ciprestes.
  bloco(p.calcada, (AVENIDA[0] + AVENIDA[2]) / 2, AVENIDA[1], AVENIDA[2] - AVENIDA[0], 0.016, 0.0009);
  for (let x = AVENIDA[0] + 0.02; x < AVENIDA[2] - 0.02; x += 0.024) for (const s of [-1, 1]) k.cipreste(x, AVENIDA[1] + s * 0.013, 0, 0.018);

  // Patamares de casas na encosta sudoeste.
  ENCOSTA.forEach((e, i) => {
    const acima = ENCOSTA[i + 1];
    for (let x = e.x - e.rx; x <= e.rx + e.x; x += 0.021)
      for (let y = e.y - e.ry; y <= e.ry + e.y; y += 0.02) {
        const w = 0.012 + rand() * 0.006, d = 0.011 + rand() * 0.004, h = 0.007 + rand() * 0.008, a = rand();
        if (((x - e.x) / (e.rx * 0.8)) ** 2 + ((y - e.y) / (e.ry * 0.8)) ** 2 > 1) continue;
        if (acima && ((x - acima.x) / (acima.rx * 1.6)) ** 2 + ((y - acima.y) / (acima.ry * 1.6)) ** 2 < 1) continue;
        if (a < 0.12) k.cipreste(x, y, e.z1, 0.016);
        else k.casa(x, y, e.z1, w, d, h, a * 0.3);
      }
  });

  // Bairros de casas de teto plano, em fileiras paralelas à grande muralha, rareando para as bordas.
  for (let v = -0.95; v < 0.95; v += 0.0195) {
    const fila = Math.round((v + 0.95) / 0.0195);
    for (let u = -0.95; u < 0.95; u += 0.019) {
      const col = Math.round((u + 0.95) / 0.019);
      const jx = rand(), w = 0.012 + rand() * 0.007, d = 0.011 + rand() * 0.005, h = 0.007 + rand() * 0.01, sorte = rand(), vira = rand();
      if (fila % 5 === 4 || col % 8 === 7) continue; // ruas
      const [x, y] = noTerraco(u + (jx - 0.5) * 0.004, v);
      const z = chaoArmenelos(x, y);
      if (z == null) continue;
      if (sorte < (Math.hypot(x - 0.15, y + 0.1) - 0.42) / 0.4) {
        if (sorte < 0.14) k.arvore(x, y, z, 0.01 + vira * 0.008);
        else if (sorte < 0.2) k.cipreste(x, y, z, 0.014 + vira * 0.01);
        continue;
      }
      if (sorte < 0.05) k.cipreste(x, y, z, 0.013 + vira * 0.008);
      else if (sorte > 0.985) k.pavilhao(x, y, z, 0.013, 0.022 + vira * 0.01, TERRACO.ang);
      else k.casa(x, y, z, w, d, h, TERRACO.ang + (vira - 0.5) * 0.12);
    }
  }

  // A colina no meio da cidade, por revolução do perfil (de fora para o topo), com a alameda em volta.
  const perfil: THREE.Vector2[] = [];
  for (let i = 0; i <= 32; i++) {
    const r = (COLINA.r + 0.01) * (1 - i / 32);
    perfil.push(new THREE.Vector2(r, alturaColina(COLINA.x + r, COLINA.y) + 0.0012));
  }
  const colina = new THREE.Mesh(new THREE.LatheGeometry(perfil, 72).rotateX(Math.PI / 2).translate(COLINA.x, COLINA.y, 0), gramado);
  colina.name = 'Colina';
  cidade.add(colina);
  const [cx, cy] = [COLINA.x, COLINA.y];
  for (let i = 0; i < 64; i++) {
    const a = ((i + 0.5) * Math.PI * 2) / 64, r = COLINA.r + 0.012;
    bloco(p.calcada, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.014, ((Math.PI * 2 * r) / 64) * 1.06, 0.0012, 0.0004, a);
  }
  bloco(p.calcada, cx, (cy + COLINA.r + AVENIDA[1]) / 2, 0.014, AVENIDA[1] - cy - COLINA.r, 0.0009);

  const zt = COLINA.h + 0.0012;
  if (!templo) {
    // Jardins no alto da colina: fonte, alameda circular e anel de árvores; caminhos descendo em cruz.
    peca(cilindro, p.branca, cx, cy, zt + 0.001, 0.022, 0.022, 0.002);
    peca(cilindro, p.agua, cx, cy, zt + 0.0021, 0.019, 0.019, 0.0006);
    peca(cilindro, p.branca, cx, cy, zt + 0.005, 0.0022, 0.0022, 0.008);
    peca(copa, p.branca, cx, cy, zt + 0.0095, 0.004, 0.004, 0.002);
    for (let i = 0; i < 40; i++) {
      const a = (i * Math.PI * 2) / 40;
      bloco(p.calcada, cx + Math.cos(a) * 0.055, cy + Math.sin(a) * 0.055, 0.008, 0.0095, 0.0008, zt, a);
    }
    for (let i = 0; i < 18; i++) {
      const a = ((i + 0.5) * Math.PI * 2) / 18;
      k.cipreste(cx + Math.cos(a) * 0.078, cy + Math.sin(a) * 0.078, zt - 0.001, 0.02);
      if (i % 2) bloco(canteiros[i % 4], cx + Math.cos(a) * 0.035, cy + Math.sin(a) * 0.035, 0.016, 0.006, 0.0022, zt, a);
    }
    // bosques e pavilhões pela encosta, fora dos caminhos; um anel de canteiros a meia altura
    for (let i = 0; i < 90; i++) {
      const a = rand() * Math.PI * 2, r = 0.1 + rand() * 0.09, s = rand();
      if (Math.abs(Math.sin(2 * a)) < 0.12) continue;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (s > 0.6) k.cipreste(x, y, alturaColina(x, y), 0.014 + s * 0.008);
      else k.arvore(x, y, alturaColina(x, y), 0.009 + s * 0.007);
    }
    for (let i = 0; i < 8; i++) {
      const a = ((i + 0.5) * Math.PI) / 4, r = 0.15;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, z = alturaColina(x, y);
      for (let c = 0; c < 6; c++) peca(cilindro, p.branca, x + Math.cos((c * Math.PI) / 3) * 0.006, y + Math.sin((c * Math.PI) / 3) * 0.006, z + 0.004, 0.0008, 0.0008, 0.008);
      peca(cilindro, p.branca, x, y, z + 0.0085, 0.0075, 0.0075, 0.0012);
      peca(cupula, p.bronze, x, y, z + 0.009, 0.0068, 0.0068, 0.005);
    }
    for (let i = 0; i < 48; i++) {
      const a = ((i + 0.5) * Math.PI * 2) / 48, r = 0.125;
      if (i % 6 === 5) continue;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      bloco(canteiros[i % 4], x, y, 0.005, 0.014, 0.0024, alturaColina(x, y), a);
    }
    for (let q = 0; q < 4; q++) {
      const a = (q * Math.PI) / 2;
      for (let r = 0.06; r < COLINA.r; r += 0.008) {
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        bloco(p.calcada, x, y, 0.0085, 0.01, 0.0008, alturaColina(x, y) + 0.0006, a);
      }
    }
  } else {
    // O Templo de Melkor: rotunda de pedra escura, cúpula de prata enegrecida e a fumaça que subia dela.
    const { raio: RT, altura: HT } = TEMPLO;
    const escura = material(0x8f8a82);
    const nervura = material(0xa39e94);
    const negra = material(0x2a2b30, { metalness: 0.75, roughness: 0.35 });
    peca(cilindro, nervura, cx, cy, zt + 0.001, 0.094, 0.094, 0.002);
    peca(cilindro, escura, cx, cy, zt + HT / 2, RT, RT, HT);
    for (let i = 0; i < 32; i++) {
      const a = (i * Math.PI * 2) / 32;
      bloco(nervura, cx + Math.cos(a) * RT, cy + Math.sin(a) * RT, 0.004, 0.006, HT, zt, a);
    }
    for (const z of [0.25, 0.6, 0.97]) peca(cilindro, nervura, cx, cy, zt + HT * z, RT * 1.045, RT * 1.045, 0.004);
    for (let q = 0; q < 4; q++) {
      const a = (q * Math.PI) / 2;
      bloco(p.sombra, cx + Math.cos(a) * (RT + 0.0015), cy + Math.sin(a) * (RT + 0.0015), 0.004, 0.02, 0.04, zt, a);
      for (let i = 0; i < 4; i++) bloco(nervura, cx + Math.cos(a) * (RT + 0.006 + i * 0.005), cy + Math.sin(a) * (RT + 0.006 + i * 0.005), 0.005, 0.03, 0.004 - i * 0.001, zt, a);
    }
    peca(cupula, negra, cx, cy, zt + HT, RT, RT, RT * 0.82);
    peca(cilindro, negra, cx, cy, zt + HT + RT * 0.82 + 0.004, 0.009, 0.009, 0.008);
    for (let i = 0; i < 11; i++) {
      const r = 0.014 + i * 0.006;
      peca(copa, p.fumaca, cx + i * i * 0.0012, cy + i * 0.003, zt + HT + RT * 0.82 + 0.016 + i * 0.026, r, r * 0.9, r * 0.7);
    }
  }

  o.finalizar(cidade);
  return cidade;
}

// ---------------------------------------------------------------- Rómenna

/**
 * O cais acompanha a costa do atlas no fundo da baía, em V: a água começa em
 * x = 0,15 + 1,55·y ao norte e x = 0,15 + 0,55·|y| ao sul (km, a partir do ponto de assentamento).
 */
export const caisX = (y: number) => 0.15 + (y >= 0 ? 1.55 * y : -0.55 * y);
const Y_N = 0.55, Y_S = -0.7, OESTE = -0.8;
const APICE: [number, number] = [0.15, 0];

function braco(fx: number, fy: number, terra: 1 | -1) {
  const L = Math.hypot(fx - APICE[0], fy - APICE[1]);
  const u: [number, number] = [(fx - APICE[0]) / L, (fy - APICE[1]) / L];
  const nrm: [number, number] = terra > 0 ? [-u[1], u[0]] : [u[1], -u[0]]; // aponta para a terra
  const ponto = (t: number, d: number): [number, number] => [APICE[0] + u[0] * t + nrm[0] * d, APICE[1] + u[1] * t + nrm[1] * d];
  /** Coordenadas de um ponto no referencial do braço: ao longo do cais e terra adentro. */
  const de = (x: number, y: number): [number, number] => [(x - APICE[0]) * u[0] + (y - APICE[1]) * u[1], (x - APICE[0]) * nrm[0] + (y - APICE[1]) * nrm[1]];
  return { L, u, n: nrm, ang: Math.atan2(u[1], u[0]), ponto, de };
}
const NORTE = braco(caisX(Y_N), Y_N, 1);
const SUL = braco(caisX(Y_S), Y_S, -1);

/** O colosso de Eärendil, de pé no cais sul, voltado para a boca do porto, com o rochedo às costas. */
export const COLOSSO = { em: SUL.ponto(0.24, 0.045), altura: 0.17 };
/** O rochedo do colosso (referencial do braço sul) e o alto da margem norte (referencial do braço norte). */
const ROCHEDO = { t: 0.24, d: 0.175, rx: 0.14, ry: 0.105, h: 0.15 };
const ALTO = { t: 0.5, d: 0.42, rx: 0.2, ry: 0.1, h: 0.09 };
/** A cidade alta, no rochedo entre os dois cais. */
const ALTA = { x: -0.22, y: -0.02, rx: 0.15, ry: 0.19, h: 0.045 };
/** Terraço do Salão dos Guardas do Mar, paralelo ao cais norte. */
const GUARDAS = { t0: 0.1, t1: 0.7, d0: 0.16, d1: 0.26, h: 0.03 };
const VIADUTO = [...SUL.ponto(0.12, 0.15), ...NORTE.ponto(0.06, 0.165)];
const AQUEDUTO_R = [-0.76, -0.4, ...SUL.ponto(0.3, 0.33)];
/** A ponte de três arcos na boca do porto, entre os dois promontórios. */
export const PONTE_DO_MAR = { a: [0.76, -0.3], b: [0.86, -0.04], vao: 0.07, altura: 0.055, largura: 0.02 };

/** Navios ancorados no porto, em coordenadas locais: [x, y, rumo]. */
export function naviosRomenna(fase: FaseRomenna): { ancorados: [number, number, number][]; aVela: [number, number, number][]; barcos: number } {
  if (fase === 'barcos') return { ancorados: [], aVela: [], barcos: 14 };
  if (fase === 'navios')
    return {
      ancorados: [[0.43, 0.1, 0.6], [0.54, 0.2, 0.55], [0.5, -0.05, -0.3], [0.63, 0.07, 0.2], [0.44, -0.19, -0.45], [0.66, -0.13, 0.1]],
      aVela: [[1.05, -0.3, 2.6]],
      barcos: 10,
    };
  // Os nove navios dos Fiéis: quatro de Elendil, três de Isildur, dois de Anárion (Akallabêth).
  const fila = (n: number, x0: number, y: number): [number, number, number][] => Array.from({ length: n }, (_, k) => [x0 + k * 0.058, y, 0.15]);
  return { ancorados: [...fila(4, 0.46, 0.06), ...fila(3, 0.49, -0.05), ...fila(2, 0.52, -0.16)], aVela: [], barcos: 6 };
}

export function criarRomenna(fase: FaseRomenna): THREE.Group {
  const cidade = new THREE.Group();
  cidade.name = `Rómenna: ${fase}`;
  const o = oficina(600);
  const { peca, bloco, rand } = o;
  const p = paleta();
  const k = pecas(o, p);
  const madeira = material(0x6b4a2e);
  const tabuado = material(0x7d5d3c);
  const vinhas = [material(0x5d7a3a), material(0x7f9852)];
  const toldos = [material(0xd9c9a3), material(0xa8513c), material(0x3f6a8a)];
  const barcos = { casco: material(0x4a3222), conves: material(0x9a7550), mastro: material(0x5a412a), vela: material(0xd9c7a0), ouro: p.ouro };
  const norte = NORTE, sul = SUL;

  // A terra do porto, recortada pela costa: a face voltada para o mar é a muralha do cais.
  const contorno: THREE.Vector2[] = [];
  for (let i = 0; i <= 25; i++) {
    const y = Y_S + i * 0.05;
    contorno.push(new THREE.Vector2(caisX(y), y));
  }
  contorno.push(new THREE.Vector2(OESTE, Y_N), new THREE.Vector2(OESTE, Y_S));
  // grupos da extrusão: 0 = tampas (relva), 1 = faces (a muralha do cais voltada para o mar)
  const base = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape(contorno), { depth: 0.8, bevelEnabled: false }).translate(0, 0, -0.8), [p.relva, p.pedra]);
  base.name = 'Base';
  cidade.add(base);

  // O rochedo do colosso, com casas e árvores no alto, e o alto da margem norte.
  const [ex, ey] = sul.ponto(ROCHEDO.t, ROCHEDO.d);
  const [ex2, ey2] = sul.ponto(ROCHEDO.t + 0.01, ROCHEDO.d + 0.015);
  const [ax, ay] = norte.ponto(ALTO.t, ALTO.d);
  cidade.add(rochas('Rochas', [
    rochedo(ex, ey, ROCHEDO.rx, ROCHEDO.ry, -0.01, ROCHEDO.h, 21, { ang: sul.ang }),
    rochedo(ex2, ey2, 0.085, 0.065, ROCHEDO.h, ROCHEDO.h + 0.04, 22, { ang: sul.ang, topo: 0xcfc4a6 }),
    rochedo(ax, ay, ALTO.rx, ALTO.ry, -0.01, ALTO.h, 23, { ang: norte.ang, topo: 0xcfc4a6 }),
    rochedo(ALTA.x, ALTA.y, ALTA.rx, ALTA.ry, -0.01, ALTA.h, 24, { topo: 0xcfc4a6 }),
  ], p.rocha));
  /** Casas e árvores no alto de um rochedo: grade dentro de 80% do contorno. */
  const noAlto = (cx: number, cy: number, rx: number, ry: number, ang: number, z: number, fora?: (lx: number, ly: number) => boolean) => {
    for (let lx = -rx; lx <= rx; lx += 0.021)
      for (let ly = -ry; ly <= ry; ly += 0.02) {
        const w = 0.012 + rand() * 0.006, d = 0.011 + rand() * 0.004, h = 0.007 + rand() * 0.009, s = rand();
        if ((lx / (rx * 0.8)) ** 2 + (ly / (ry * 0.8)) ** 2 > 1 || fora?.(lx, ly)) continue;
        const [dx, dy] = o.giro(ang, lx, ly);
        if (s < 0.14) k.cipreste(cx + dx, cy + dy, z, 0.018);
        else if (s < 0.24) k.arvore(cx + dx, cy + dy, z, 0.012);
        else k.casa(cx + dx, cy + dy, z, w, d, h, ang + (s - 0.5) * 0.2);
      }
  };
  noAlto(ex2, ey2, 0.085, 0.065, sul.ang, ROCHEDO.h + 0.04);
  noAlto(ax, ay, ALTO.rx, ALTO.ry, norte.ang, ALTO.h, (lx, ly) => Math.hypot(lx, ly) < 0.035);
  noAlto(ALTA.x, ALTA.y, ALTA.rx, ALTA.ry, 0, ALTA.h, (lx, ly) => Math.hypot(lx, ly) < 0.035);
  // casas de cúpula de bronze no alto da margem norte e na cidade alta
  for (const [x, y, z, ang] of [[ax, ay, ALTO.h, norte.ang], [ALTA.x, ALTA.y, ALTA.h, 0]]) {
    bloco(p.branca, x, y, 0.05, 0.036, 0.016, z, ang);
    bloco(p.ouro, x, y, 0.052, 0.038, 0.001, z + 0.016, ang);
    peca(cilindro, p.branca, x, y, z + 0.02, 0.013, 0.013, 0.008);
    peca(cupula, p.bronze, x, y, z + 0.024, 0.0135, 0.0135, 0.009);
  }
  for (let i = 0; i < 26; i++) {
    const a = rand() * Math.PI * 2, r = 0.55 + rand() * 0.4, s = rand();
    const [dx, dy] = o.giro(sul.ang, Math.cos(a) * ROCHEDO.rx * r, Math.sin(a) * ROCHEDO.ry * r);
    if (((ex + dx - ex2) / 0.12) ** 2 + ((ey + dy - ey2) / 0.12) ** 2 < 1) continue;
    if (s < 0.5) k.cipreste(ex + dx, ey + dy, ROCHEDO.h, 0.016 + s * 0.012);
    else k.arvore(ex + dx, ey + dy, ROCHEDO.h, 0.008 + s * 0.008);
  }

  // O colosso de Eärendil, com Elwing no ombro, sobre o seu soco no cais.
  bloco(p.pedra, ...COLOSSO.em, 0.075, 0.075, 0.008, 0, sul.ang);
  k.colosso(p.estatua, ...COLOSSO.em, 0.008, COLOSSO.altura, Math.atan2(-sul.n[1], -sul.n[0]), true);

  // Terraço e Salão dos Guardas do Mar, na margem norte.
  {
    const g = GUARDAS, [x, y] = norte.ponto((g.t0 + g.t1) / 2, (g.d0 + g.d1) / 2);
    bloco(p.pedra, x, y, g.t1 - g.t0, g.d1 - g.d0, g.h, 0, norte.ang);
    k.frente(...norte.ponto(g.t0, g.d0), ...norte.ponto(g.t1, g.d0), g.h);
    k.frente(...norte.ponto(g.t1, g.d0), ...norte.ponto(g.t1, g.d1), g.h);
    k.frente(...norte.ponto(g.t0, g.d1), ...norte.ponto(g.t0, g.d0), g.h);
    bloco(p.calcada, x, y, g.t1 - g.t0 - 0.004, g.d1 - g.d0 - 0.004, 0.0005, g.h, norte.ang);
    const [hx, hy] = norte.ponto(0.42, 0.222);
    k.salao(hx, hy, g.h, 0.24, 0.04, 0.022, norte.ang);
    peca(cilindro, p.branca, hx, hy, g.h + 0.025, 0.014, 0.014, 0.006);
    peca(cupula, p.bronze, hx, hy, g.h + 0.028, 0.0145, 0.0145, 0.009);
    for (const t of [0.28, 0.56]) k.pavilhao(...norte.ponto(t, 0.222), g.h, 0.022, 0.034, norte.ang);
    for (let t = g.t0 + 0.012; t < g.t1 - 0.008; t += 0.014) k.cipreste(...norte.ponto(t, g.d0 + 0.008), g.h, 0.017);
  }

  // Viaduto por trás do colosso, do rochedo à margem norte; aqueduto de dois andares vindo do oeste.
  k.ponte(p.pedra, VIADUTO[0], VIADUTO[1], VIADUTO[2], VIADUTO[3], 0, 0.045, 0.04, 0.012);
  k.arcada(p.pedra, AQUEDUTO_R[0], AQUEDUTO_R[1], AQUEDUTO_R[2], AQUEDUTO_R[3], 0, 0.03, 0.04, 0.008, false);
  k.ponte(p.pedra, AQUEDUTO_R[0], AQUEDUTO_R[1], AQUEDUTO_R[2], AQUEDUTO_R[3], 0.03, 0.02, 0.02, 0.008);

  const ocupado = (x: number, y: number) => {
    const [st, sd] = sul.de(x, y), [nt, nd] = norte.de(x, y);
    return ((st - ROCHEDO.t) / (ROCHEDO.rx * 1.4)) ** 2 + ((sd - ROCHEDO.d) / (ROCHEDO.ry * 1.4)) ** 2 < 1 ||
      ((nt - ALTO.t) / (ALTO.rx * 1.4)) ** 2 + ((nd - ALTO.d) / (ALTO.ry * 1.4)) ** 2 < 1 ||
      ((x - ALTA.x) / (ALTA.rx * 1.4)) ** 2 + ((y - ALTA.y) / (ALTA.ry * 1.4)) ** 2 < 1 ||
      Math.hypot(x - COLOSSO.em[0], y - COLOSSO.em[1]) < 0.065 ||
      nt > GUARDAS.t0 - 0.012 && nt < GUARDAS.t1 + 0.012 && nd > GUARDAS.d0 - 0.012 && nd < GUARDAS.d1 + 0.012 ||
      distSeg(x, y, VIADUTO) < 0.014 || distSeg(x, y, AQUEDUTO_R) < 0.012;
  };

  // Passeio do cais: parapeito, frades de amarração, guindastes; bancas de pedra com toldos.
  for (const b of [norte, sul]) {
    const [mx, my] = b.ponto((b.L - 0.12) / 2, 0.035);
    bloco(p.calcada, mx, my, b.L - 0.02, 0.07, 0.0008, 0, b.ang);
    for (let t = 0.004; t < b.L - 0.004; t += 0.012) {
      const [x, y] = b.ponto(t, 0.002);
      bloco(p.pedra, x, y, 0.0125, 0.0018, 0.0022, 0, b.ang);
      if (Math.round(t / 0.012) % 3 === 0) {
        const [fx, fy] = b.ponto(t, 0.006);
        peca(cilindro, p.sombra, fx, fy, 0.0012, 0.0008, 0.0008, 0.0024);
      }
    }
    for (let t = 0.09; t < b.L - 0.05; t += 0.16) {
      const [x, y] = b.ponto(t, 0.012);
      peca(cilindro, madeira, x, y, 0.011, 0.0012, 0.0012, 0.022);
      const [lx, ly] = b.ponto(t, 0.0);
      bloco(madeira, lx, ly, 0.0012, 0.026, 0.0012, 0.021, b.ang);
    }
    for (let t = 0.05; t < b.L - 0.04; t += 0.042) {
      const [x, y] = b.ponto(t, 0.054);
      const comp = 0.03 + rand() * 0.006, toldo = rand(), caixas = rand();
      if (ocupado(x, y)) continue;
      bloco(p.creme[1], x, y, comp, 0.016, 0.007, 0, b.ang);
      bloco(p.laje, x, y, comp * 1.04, 0.0168, 0.001, 0.007, b.ang);
      const [tx, ty] = b.ponto(t, 0.043);
      if (toldo < 0.7) bloco(toldos[Math.floor(toldo * 5) % 3], tx, ty, comp * 0.8, 0.007, 0.0006, 0.0052, b.ang);
      if (caixas < 0.5) for (let i = 0; i < 3; i++) {
        const [kx, ky] = b.ponto(t + (i - 1) * 0.005, 0.03);
        bloco(tabuado, kx, ky, 0.003, 0.003, 0.003, 0, b.ang);
      }
    }
  }

  // Casas de teto plano em fileiras paralelas ao cais, ruas a cada duas fileiras, rareando para o interior.
  // bissetriz da terra entre os braços: decide de qual cais cada casa está mais perto
  const bis = [-(norte.u[0] + sul.u[0]), -(norte.u[1] + sul.u[1])];
  const doNorte = (x: number, y: number) => bis[0] * (y - APICE[1]) - bis[1] * (x - APICE[0]) <= 0;
  for (const b of [norte, sul])
    for (let faixa = 0; faixa < 20; faixa++) {
      if (faixa % 3 === 2) continue;
      const d0 = 0.085 + faixa * 0.026;
      for (let t = -0.6; t < b.L; t += 0.023) {
        const d = d0 + (rand() - 0.5) * 0.008;
        const [x, y] = b.ponto(t + rand() * 0.005, d);
        const w = 0.012 + rand() * 0.008, pr = 0.011 + rand() * 0.005, h = 0.008 + rand() * 0.01, sorte = rand(), extra = rand(), raro = rand();
        if (x < -0.7 || y > Y_N - 0.04 || y < Y_S + 0.04 || x > caisX(y) - 0.075) continue;
        if (doNorte(x, y) !== (b === norte) || ocupado(x, y)) continue;
        if (Math.abs(((t + 0.1) % 0.17) - 0.085) > 0.075) continue; // ruas transversais
        if (raro < (d - 0.34) / 0.5) {
          if (raro < 0.1 + (d - 0.16) / 2.4) (extra < 0.4 ? k.cipreste : k.arvore)(x, y, 0, 0.01 + extra * 0.008);
          continue;
        }
        if (sorte < 0.07) k.cipreste(x, y, 0, 0.014 + extra * 0.008);
        else if (sorte > 0.975) k.pavilhao(x, y, 0, 0.013, 0.024 + extra * 0.012, b.ang);
        else k.casa(x, y, 0, w, pr, h, b.ang + (extra - 0.5) * 0.14);
      }
    }

  // Terraços de vinhas na encosta a oeste.
  for (let i = 0; i * 0.008 < 0.16; i++) bloco(vinhas[i % 2], OESTE + 0.012 + i * 0.008, (Y_N + Y_S) / 2, 0.005, Y_N - Y_S - 0.04, 0.0025);

  // No mar (nível da água, ajustado pela camada): promontórios, a ponte dos atlantes, o farol, píeres e navios.
  const mar = new THREE.Group();
  mar.name = 'Mar';
  const s = oficina(3310);
  const ks = pecas(s, p);
  const { a: A, b: B, vao: VAO, altura: HB, largura: LB } = PONTE_DO_MAR;
  const compB = Math.hypot(B[0] - A[0], B[1] - A[1]), db = [(B[0] - A[0]) / compB, (B[1] - A[1]) / compB], angB = Math.atan2(db[1], db[0]);
  /** Ponto da ponte: t ao longo do tabuleiro a partir do sul, lado > 0 para o mar aberto. */
  const naPonte = (t: number, lado = 0): [number, number] => [A[0] + db[0] * t + db[1] * lado, A[1] + db[1] * t - db[0] * lado];
  const promontorio = (de: [number, number], ate: [number, number], semente: number) => {
    const len = Math.hypot(ate[0] - de[0], ate[1] - de[1]), ang = Math.atan2(ate[1] - de[1], ate[0] - de[0]);
    const cx = (de[0] + ate[0]) / 2, cy = (de[1] + ate[1]) / 2;
    for (let i = 0; i < 14; i++) {
      const t = (s.rand() - 0.5) * len * 0.8, [dx, dy] = s.giro(ang, t, (s.rand() - 0.5) * 0.03), alto = s.rand();
      if (alto < 0.35) ks.cipreste(cx + dx, cy + dy, HB, 0.016 + alto * 0.012);
      else if (alto < 0.6) ks.arvore(cx + dx, cy + dy, HB, 0.009 + alto * 0.006);
      else ks.casa(cx + dx, cy + dy, HB, 0.014, 0.012, 0.006 + alto * 0.006, ang);
    }
    return rochedo(cx, cy, len / 2 + 0.02, 0.032, -0.03, HB, semente, { ang, topo: 0xb7b08f });
  };
  mar.add(rochas('Promontórios', [promontorio(sul.ponto(0.62, 0), [A[0], A[1]], 31), promontorio(norte.ponto(0.75, 0), [B[0], B[1]], 32)], p.rocha));

  // A ponte: três arcos entre encontros maciços, atlantes nos dois pilares e medalhões dourados nos fechos.
  const enc = (compB - 3 * VAO) / 2;
  for (const t of [enc / 2, compB - enc / 2]) s.bloco(p.pedra, ...naPonte(t), enc, LB, HB + 0.014, -0.01, angB);
  ks.ponte(p.pedra, ...naPonte(enc), ...naPonte(compB - enc), -0.004, HB + 0.004, VAO, LB);
  s.bloco(p.pedra, ...naPonte(compB / 2), compB + 0.01, LB * 1.2, 0.003, HB + 0.003, angB);
  for (const lado of [-1, 1]) {
    const fora = angB + (lado > 0 ? -Math.PI / 2 : Math.PI / 2);
    for (const i of [1, 2]) {
      const t = enc + i * VAO;
      s.bloco(p.pedra, ...naPonte(t, lado * (LB / 2 + 0.003)), 0.014, 0.008, 0.008, -0.004, angB);
      ks.atlante(p.estatua, ...naPonte(t, lado * (LB / 2 + 0.003)), 0.004, 0.04, fora);
      s.bloco(p.pedra, ...naPonte(t, lado * (LB / 2 + 0.003)), 0.02, 0.009, 0.006, 0.044, angB);
    }
    for (let i = 0; i < 3; i++) s.peca(disco, p.ouro, ...naPonte(enc + (i + 0.5) * VAO, lado * (LB / 2 + 0.0004)), 0.051, 0.0032, 0.001, 0.0032, angB);
  }
  // o farol na ponta do promontório sul, junto ao encontro da ponte
  ks.farol(p.pedra, ...naPonte(-0.04), HB, 0.1);
  s.bloco(p.branca, ...naPonte(compB + 0.03), 0.018, 0.018, 0.012, HB, angB);
  s.peca(cupula, p.bronze, ...naPonte(compB + 0.03), HB + 0.012, 0.008, 0.008, 0.006);

  // arcada do cais norte, ao nível da água
  ks.arcada(p.pedra, ...norte.ponto(0.05, -0.002), ...norte.ponto(0.72, -0.002), 0, 0.011, 0.014, 0.003);

  const pieres: [ReturnType<typeof braco>, number][] = [[norte, 0.2], [norte, 0.36], [norte, 0.52], [sul, 0.42], [sul, 0.54]];
  for (const [b, t] of pieres) {
    const ang = Math.atan2(-b.n[1], -b.n[0]);
    const [x, y] = b.ponto(t, -0.036);
    s.bloco(tabuado, x, y, 0.072, 0.007, 0.0012, 0.004, ang);
    for (let i = 0; i < 6; i++) {
      const [px, py] = b.ponto(t, -0.004 - i * 0.0135);
      for (const l of [-1, 1]) s.peca(cilindro, madeira, px + Math.cos(b.ang) * l * 0.003, py + Math.sin(b.ang) * l * 0.003, 0.0005, 0.0006, 0.0006, 0.009);
    }
  }

  const frota = naviosRomenna(fase);
  for (const [x, y, ang] of frota.ancorados) ks.navio(barcos, x, y, ang, false);
  for (const [x, y, ang] of frota.aVela) ks.navio(barcos, x, y, ang, true);
  for (let i = 0; i < frota.barcos; i++) {
    const [b, t] = pieres[i % pieres.length];
    const lado = i % 2 ? 1 : -1;
    const [x, y] = b.ponto(t + lado * 0.009, -0.02 - (i % 3) * 0.02);
    s.barco(barcos, x, y, Math.atan2(-b.n[1], -b.n[0]));
  }

  o.finalizar(cidade);
  s.finalizar(mar);
  cidade.add(mar);
  return cidade;
}
