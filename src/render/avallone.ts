// Reconstrução a partir de public/fotografias/avallone-aa.webp, em km, com Z para cima.
import * as THREE from 'three';
import { Noise } from '../terrain/noise';
import { maquete } from './arquitetura';
import { arcada, ardósia, arrimo, cal, cantaria, coluna, madeira, moldura, nicho, pedraEscura, piso, sombra, telhado, terracota, árvore } from './numenor-acabamentos';
import { casco, cilindro, cone, copa, material } from './oficina';

// O eixo X acompanha a costa leste de Eressëa e Y aponta do mar para a cidade.
const GIRO = 114 * Math.PI / 180;
const limite = 1.08;
const ruído = new Noise(324);
const { smoothstep } = THREE.MathUtils;
const frente = (x: number) => -0.31 + 0.34 * (Math.abs(x) / limite) ** 2.3 + 0.04 * Math.sin(x * 9) + 0.017 * Math.sin(x * 23);
const fundo = (x: number) => 0.97 - 0.6 * (Math.abs(x) / limite) ** 2;

function altura(x: number, y: number) {
  const a = frente(x), b = fundo(x);
  const bordo = 1 - smoothstep(Math.abs(x), 0.84, limite);
  const colina = 0.235 + 0.059 * Math.exp(-((x - 0.13) ** 2) / 0.21);
  const subida = smoothstep(y, a - 0.02, a + 0.57);
  const descida = 1 - smoothstep(y, b - 0.45, b);
  const ondulação = ruído.simplex(x * 9, y * 9) * 0.015 + ruído.simplex(x * 34, y * 34) * 0.004;
  return -0.022 + (colina + ondulação) * bordo * subida * descida;
}

function promontório() {
  const geo = new THREE.PlaneGeometry(2, 1, 112, 64);
  const pos = geo.attributes.position;
  const cores: number[] = [];
  const tufo = new THREE.Color(0x53604a), rocha = new THREE.Color(0x8c897e), cor = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) * limite;
    const y = THREE.MathUtils.lerp(frente(x) - 0.09, fundo(x), pos.getY(i) + 0.5);
    const z = altura(x, y);
    pos.setXYZ(i, x, y, z);
    const mancha = ruído.simplex(x * 22, y * 22);
    const musgo = smoothstep(z + mancha * 0.032, 0.02, 0.09);
    cor.copy(rocha).lerp(tufo, musgo).multiplyScalar(0.92 + mancha * 0.22);
    cores.push(cor.r, cor.g, cor.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
  geo.computeVertexNormals();
  const relevo = new THREE.Mesh(geo, material(0xffffff, { vertexColors: true }));
  relevo.name = 'Promontório de Tol Eressëa';
  return relevo;
}

const pedraBranca = material(0xf0e7d7, { map: cantaria.map, bumpMap: cantaria.bumpMap, bumpScale: 0.00028, emissive: 0x9eacb5, emissiveIntensity: 0.18 });
const rebocoClaro = material(0xf4eddf, { map: cal.map, bumpMap: cal.bumpMap, bumpScale: 0.0003, emissive: 0xa6aec0, emissiveIntensity: 0.15 });
const pedraFuste = pedraBranca.clone();
for (const chave of ['map', 'bumpMap'] as const) {
  const textura = pedraFuste[chave]!.clone();
  textura.repeat.set(9, 6);
  textura.needsUpdate = true;
  pedraFuste[chave] = textura;
}
const chumbo = material(0x374850, { map: ardósia.map, bumpMap: ardósia.bumpMap, bumpScale: 0.00035 });
const metal = material(0x857450, { metalness: 0.3 });
const vidro = material(0xfad99f, { emissive: 0xffbd66, emissiveIntensity: 0.6 });

function torreDoPorto() {
  const o = maquete('Torre branca de Avallónë', 325);
  const { bloco, peca } = o;
  const x = 0.51, y = -0.36;
  const base = 0.111, topo = 0.459, r = 0.066;

  // O cais abraça a base da torre. As duas arcadas atravessam a fachada baixa.
  bloco(piso, x - 0.021, y - 0.021, 0.32, 0.245, 0.018, -0.005);
  bloco(arrimo, x, y + 0.015, 0.223, 0.154, 0.089, 0.012);
  const frenteCais = y - 0.091;
  for (const dx of [-0.036, 0.020]) arcada(o, pedraBranca, x + dx, frenteCais, 0.013, 0.056, 0.054, 0.063);
  for (const [dx, w] of [[-0.082, 0.036], [0.085, 0.075]]) bloco(arrimo, x + dx, frenteCais, w, 0.055, 0.066, 0.012);
  for (const dx of [-0.036, 0.020]) nicho(o, x + dx, y - 0.063, 0.013, 0.043, 0.05, 0, cantaria);
  bloco(cantaria, x, frenteCais + 0.019, 0.237, 0.092, 0.023, 0.076);
  bloco(pedraBranca, x, y - 0.022, 0.251, 0.225, 0.009, 0.099);
  o.ameiasLinha(cantaria, x - 0.125, y - 0.134, x + 0.125, y - 0.134, 0.108, 0.0048);

  const fuste = new THREE.CylinderGeometry(r * 0.92, r, topo - base, 48).rotateX(Math.PI / 2);
  fuste.name = 'Fuste de cantaria branca';
  peca(fuste, pedraFuste, x, y, (topo + base) / 2, 1, 1, 1);
  for (const [z, raio, h] of [[base + 0.008, 0.071, 0.017], [0.159, 0.067, 0.007], [0.414, 0.064, 0.007], [0.445, 0.074, 0.012], [topo, 0.078, 0.011]]) {
    peca(cilindro, z < 0.17 ? cantaria : pedraBranca, x, y, z, raio, raio, h);
  }
  for (let i = 0; i < 32; i++) {
    const a = i * Math.PI / 16;
    const c = Math.cos(a), s = Math.sin(a);
    bloco(pedraBranca, x + c * 0.067, y + s * 0.067, 0.014, 0.019, 0.015, 0.428, a);
    bloco(cantaria, x + c * 0.063, y + s * 0.063, 0.010, 0.013, 0.010, 0.421, a);
    peca(cilindro, pedraBranca, x + c * 0.071, y + s * 0.071, 0.463, 0.009, 0.009, 0.009, a);
    if (i % 2 === 0) bloco(pedraBranca, x + c * 0.074, y + s * 0.074, 0.011, 0.013, 0.017, 0.465, a);
  }
  for (const [a, z, w, h] of [[-1.48, 0.117, 0.026, 0.04], [-1.1, 0.183, 0.011, 0.020], [-1.47, 0.245, 0.014, 0.020], [-1.11, 0.327, 0.012, 0.024], [-1.58, 0.387, 0.011, 0.019], [0.36, 0.277, 0.014, 0.024], [1.54, 0.35, 0.012, 0.019]]) {
    const raio = THREE.MathUtils.lerp(r, r * 0.92, (z + h - base) / (topo - base)) + 0.0014;
    nicho(o, x + raio * Math.cos(a), y + raio * Math.sin(a), z, w, h, a + Math.PI / 2, pedraBranca);
  }
  const tx = x - 0.045, ty = y + 0.011;
  peca(cilindro, pedraBranca, tx, ty, 0.487, 0.026, 0.026, 0.052);
  peca(cilindro, cantaria, tx, ty, 0.516, 0.029, 0.029, 0.009);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3, px = tx + 0.025 * Math.cos(a), py = ty + 0.025 * Math.sin(a);
    nicho(o, px, py, 0.486, 0.014, 0.027, a + Math.PI / 2, pedraBranca);
    bloco(vidro, px, py, 0.005, 0.003, 0.013, 0.49, a + Math.PI / 2);
  }
  peca(cone, chumbo, tx, ty, 0.555, 0.031, 0.031, 0.073);
  o.finial(metal, tx, ty, 0.589, 0.017);
  peca(copa, metal, tx, ty, 0.592, 0.0037, 0.0037, 0.0037);
  return o.montar();
}

// As frentes largas são paralelas à água; as ruas sobem pelos intervalos entre as fileiras.
const quadras = [
  { y: -0.137, casas: [[-0.77, 0.086, 2], [-0.60, 0.132, 2], [-0.416, 0.15, 3], [-0.217, 0.125, 3], [0.075, 0.14, 3], [0.235, 0.123, 3], [0.375, 0.113, 3]] },
  { y: 0.015, casas: [[-0.81, 0.092, 2], [-0.665, 0.128, 2], [-0.49, 0.138, 2], [-0.32, 0.081, 2], [-0.15, 0.099, 2], [0.015, 0.105, 3], [0.16, 0.12, 2], [0.31, 0.16, 3], [0.473, 0.093, 2]] },
  { y: 0.185, casas: [[-0.69, 0.080, 2], [-0.53, 0.156, 3], [-0.34, 0.15, 3], [-0.155, 0.126, 3], [0.033, 0.14, 3], [0.21, 0.133, 2], [0.41, 0.132, 3]] },
  { y: 0.345, casas: [[-0.49, 0.117, 2], [-0.28, 0.11, 3], [-0.08, 0.17, 3], [0.12, 0.14, 3], [0.31, 0.119, 2], [0.49, 0.155, 3]] },
];

function cidade() {
  const o = maquete('Patamares de Avallónë', 326);
  const { bloco, rand } = o;
  const ocupação: { x: number; y: number; w: number; d: number }[] = [];
  for (const [fila, { y: centro, casas }] of quadras.entries()) {
    for (const [i, [x, w, pisos]] of casas.entries()) {
      const y = centro + (rand() - 0.5) * 0.044;
      const d = w * (0.52 + rand() * 0.20);
      const h = pisos * 0.024 + 0.009;
      const chão = Math.max(...[-1, 1].flatMap((a) => [-1, 1].map((b) => altura(x + a * w * 0.5, y + b * d * 0.5))));
      const z = Math.max(0.038, chão) + 0.008;
      const fachada = y - d / 2;
      ocupação.push({ x, y, w, d });
      bloco(arrimo, x, y - 0.011, w * 1.11, d + 0.027, z + 0.004, -0.004);
      bloco(piso, x, y - 0.01, w * 1.14, d + 0.03, 0.005, z - 0.003);
      bloco(i % 4 === 1 ? pedraBranca : rebocoClaro, x, y, w, d, h, z);
      const duas = (i + fila) % 3 !== 0;
      const teto = (i + 2 * fila) % 5 === 2 ? terracota : chumbo;
      telhado(o, teto, x, y, z + h, w + 0.009, d + 0.009, 0.019 + d * 0.12, 0, duas ? rebocoClaro : undefined);
      bloco(cantaria, x + w * 0.28, y + d * 0.09, 0.008, 0.009, 0.024, z + h + 0.008);
      for (const s of [-1, 1]) {
        const fy = y + s * (d / 2 + 0.001);
        bloco(moldura, x, fy, w * 1.018, 0.004, 0.003, z + h - 0.003);
        o.janelas(sombra, x - w * 0.43, fy, x + w * 0.43, fy, z + 0.001, pisos, 0.021, 0.024, 0.012);
        const sx = x + s * (w / 2 + 0.001);
        o.janelas(sombra, sx, y - d * 0.40, sx, y + d * 0.40, z + 0.002, pisos, 0.024, 0.024, 0.010);
      }
      nicho(o, x - w * 0.13, fachada - 0.002, z + 0.001, 0.017, 0.020);
      if (fila === 0 && i >= 4) {
        for (let f = 1; f < pisos; f++) {
          const andar = z + f * 0.024;
          bloco(madeira, x, fachada - 0.010, w * 0.94, 0.023, 0.0045, andar);
          bloco(madeira, x, fachada - 0.021, w * 0.94, 0.0028, 0.003, andar + 0.008);
          for (const dx of [-0.42, -0.21, 0, 0.21, 0.42]) coluna(o, madeira, x + dx * w, fachada - 0.020, andar, 0.0038, 0.023);
        }
      }
    }
  }
  for (const [x, y, r, h] of [[-0.76, -0.02, 0.017, 0.111], [-0.48, 0.183, 0.019, 0.125], [0.042, 0.398, 0.016, 0.115]]) {
    const z = altura(x, y) + 0.012;
    o.torreRedonda(pedraBranca, chumbo, metal, x, y, z, r, h);
    for (const a of [-Math.PI / 2, 0, Math.PI / 2, Math.PI]) {
      nicho(o, x + (r + 0.0008) * Math.cos(a), y + (r + 0.0008) * Math.sin(a), z + h - 0.025, 0.013, 0.021, a + Math.PI / 2);
    }
  }
  const muralha = [[-0.83, -0.21], [-0.59, -0.231], [-0.35, -0.265], [-0.10, -0.305], [0.17, -0.298], [0.35, -0.257], [0.5, -0.218]] as const;
  for (let i = 1; i < muralha.length; i++) {
    const a = [...muralha[i - 1]] as [number, number], b = [...muralha[i]] as [number, number];
    o.muro(arrimo, a, b, -0.006, 0.067, 0.027);
    o.muro(piso, a, b, 0.061, 0.006, 0.035);
  }
  for (let i = 0; i < 25; i++) {
    const y = -0.305 + i * 0.018, x = -0.076 + i * 0.0013;
    const z = Math.max(0.046 + i * 0.0064, altura(x, y) + 0.004);
    bloco(piso, x, y, 0.031, 0.019, z + 0.01, -0.01, -0.074);
  }
  for (let i = 0; i < 1000; i++) {
    const x = (rand() * 2 - 1) * limite, y = -0.29 + rand() * 1.23;
    const z = altura(x, y);
    if (z < 0.025 || (x < 0.54 && y < 0.44 && rand() > 0.31)) continue;
    if (ocupação.some((c) => Math.abs(x - c.x) < c.w / 2 + 0.018 && Math.abs(y - c.y) < c.d / 2 + 0.020)) continue;
    if (Math.abs(x + 0.06) < 0.045 && y < 0.15) continue;
    árvore(o, x, y, z, 0.021 + rand() * 0.04);
  }
  for (let i = 0; i < 186; i++) {
    const x = (rand() * 2 - 1) * limite, y = frente(x) + rand() * 0.21 - 0.022;
    const z = Math.max(-0.014, altura(x, y));
    const s = 0.010 + rand() * 0.021;
    o.peca(copa, pedraEscura, x, y, z + s * 0.32, s * 1.25, s * 0.77, s * 0.65, rand() * 6.28);
  }
  return o.montar();
}

const pano = new THREE.ShapeGeometry(new THREE.Shape([
  new THREE.Vector2(0, 0), new THREE.Vector2(0.12, 1), new THREE.Vector2(0.59, 0.06), new THREE.Vector2(0.30, -0.02),
])).rotateX(Math.PI / 2);
const linho = material(0xece1bd, { side: THREE.DoubleSide });

function barcos() {
  const o = maquete('Veleiros e atracadouros', 327);
  const cordas: number[] = [];
  for (const [x, y, l, a, aberto] of [[0.36, -0.84, 0.25, 0.06, 0], [0.83, -0.54, 0.096, -0.73, 1], [1.03, -0.65, 0.095, 0.02, 0], [-0.14, -0.49, 0.069, 0.86, 0], [0.012, -0.485, 0.083, 0.33, 0], [-0.52, -0.59, 0.117, -0.43, 1]]) {
    const p = (u: number, v: number, z: number): [number, number, number] => {
      const [dx, dy] = o.giro(a, u * l, v * l);
      return [x + dx, y + dy, z * l];
    };
    o.peca(casco, madeira, ...p(0, 0, -0.055), l, l * 0.28, l * 0.15, a);
    o.peca(casco, cantaria, ...p(0, 0, 0.061), l * 0.99, l * 0.28, l * 0.012, a);
    o.peca(casco, arrimo, ...p(0, 0, 0.095), l * 0.86, l * 0.22, l * 0.01, a);
    const mastros = l > 0.2 ? [[-0.17, 0.54], [0.19, 0.44]] : [[0, 0.60]];
    for (const [u, h] of mastros) {
      o.peca(cilindro, madeira, ...p(u, 0, (h + 0.07) / 2), l * 0.008, l * 0.008, l * (h - 0.07));
      if (aberto) o.peca(pano, linho, ...p(u, 0, 0.104), l, 1, l * (h - 0.12), a);
      for (const v of [-0.108, 0.108]) {
        cordas.push(...p(u, 0, h), ...p(-0.39, v, 0.092));
        cordas.push(...p(u, 0, h * 0.85), ...p(0.46, v, 0.098));
      }
      cordas.push(...p(u - 0.19, 0, h * 0.76), ...p(u + 0.20, 0, h * 0.74));
    }
    for (const s of [-1, 1]) {
      for (let i = -3; i <= 3; i++) {
        const [px, py] = p(i * 0.097, s * 0.124, 0);
        o.bloco(madeira, px, py, l * 0.013, l * 0.012, l * 0.046, l * 0.091, a);
      }
      cordas.push(...p(-0.36, s * 0.124, 0.139), ...p(0.36, s * 0.124, 0.139));
    }
  }
  for (const x of [-0.17, 0.05]) {
    o.bloco(madeira, x, -0.365, 0.024, 0.118, 0.009, 0.008);
    for (const y of [-0.405, -0.375, -0.341]) {
      for (const dx of [-0.008, 0.008]) o.peca(cilindro, madeira, x + dx, y, 0.01, 0.0021, 0.0021, 0.035);
    }
  }
  const cabos = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(cordas, 3));
  o.grupo.add(new THREE.LineSegments(cabos, new THREE.LineBasicMaterial({ color: 0x57473b, transparent: true, opacity: 0.68 })));
  return o.montar();
}

function espuma() {
  const { rand } = maquete('Espuma', 328);
  const posição: number[] = [], cores: number[] = [];
  const azul = new THREE.Color(0x7599aa), prata = new THREE.Color(0xbac5b9);
  function ondulação(x: number, y: number, w: number, d: number, a: number, brilho: number, cor: THREE.Color) {
    const c = Math.cos(a), s = Math.sin(a);
    for (const [u, v, alpha] of [[-1, 0, 0], [0, -1, brilho], [1, 0, 0], [-1, 0, 0], [1, 0, 0], [0, 1, brilho * 0.38]]) {
      posição.push(x + u * w * c - v * d * s, y + u * w * s + v * d * c, 0.002);
      cores.push(cor.r, cor.g, cor.b, alpha);
    }
  }
  for (let i = 0; i < 900; i++) {
    const x = (rand() * 2 - 1) * 3.3, y = -0.10 - rand() * 2.90;
    if (Math.abs(x) < limite && y > frente(x) - 0.065) continue;
    const brilho = (0.025 + rand() * 0.06) * (1 - smoothstep(Math.hypot(x, y), 1.65, 3));
    ondulação(x, y, 0.014 + rand() * 0.06, 0.0014 + rand() * 0.003, (rand() - 0.5) * 0.28, brilho, azul);
  }
  for (let i = 0; i < 106; i++) {
    const x = (rand() * 2 - 1) * 0.97;
    const y = frente(x) + 0.082 - rand() * 0.042;
    const inclinação = Math.atan2(frente(x + 0.01) - frente(x - 0.01), 0.02);
    ondulação(x, y, 0.008 + rand() * 0.017, 0.003, inclinação, 0.16 + rand() * 0.18, prata);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(posição, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 4));
  const mar = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
  mar.name = 'Ondulações e espuma do cais';
  return mar;
}

export function criarAvallone() {
  const grupo = new THREE.Group();
  grupo.name = 'Avallónë';
  grupo.rotation.z = GIRO;
  grupo.add(promontório(), cidade(), torreDoPorto(), barcos(), espuma());
  return grupo;
}
