import * as THREE from 'three';
import type { Pt } from '../core/types';
import { PORTOES_ECHOR } from '../core/visitas';
import { reinoPorId } from '../core/data';
import type { ModeloTerreno } from '../terrain/model';
import { maquete } from './arquitetura';
import { cilindro, cone, copa, material } from './oficina';

const escuro = material(0x272b2e);
const madeira = material(0x634632);
const agua = material(0x365d66, { roughness: 0.36 });
const ouro = material(0xcaa34d);
const luz = material(0xffc085, { emissive: 0xe68b48, emissiveIntensity: 0.55 });

export function criarAngband() {
  const o = maquete('Angband', 14);
  o.aterro(1.65, 1.1, 0.6);
  const fundo = material(0x413937);
  for (let i = 0; i < 19; i++) {
    const x = (o.rand() - 0.5) * 2.72, y = 0.34 + o.rand() * 0.78;
    o.peca(copa, fundo, x, y, 0.26, 0.25 + o.rand() * 0.53, 0.6, 0.34 + o.rand() * 0.57, o.rand() * 5);
  }
  o.bloco(escuro, 0, 0.025, 0.64, 0.12, 0.57);
  o.arco(o.rocha, 0, -0.045, 0, 1.08, 0.26, 0.67).name = 'Portões de Ferro';
  for (let i = -4; i <= 4; i++) o.bloco(fundo, i * 0.069, -0.044, 0.022, 0.022, 0.48);
  for (const x of [-0.65, 0.65]) {
    o.torre(escuro, x, -0.09, 0.15, 0.56);
    o.bloco(fundo, x, -0.45, 0.14, 0.75, 0.12);
    for (const y of [-0.72, -0.37]) o.peca(copa, luz, x, y, 0.135, 0.025, 0.025, 0.039);
  }
  o.bloco(o.rocha, 0, -0.65, 0.74, 0.9, 0.015);
  return o.montar();
}

export function criarAbismo(fase: string) {
  const o = maquete('Abismo de Helm', 3019);
  o.aterro(0.78, 0.72);
  for (let i = 0; i < 16; i++) {
    const s = i % 2 === 0 ? -1 : 1, y = (o.rand() - 0.5) * 1.25;
    o.peca(copa, o.rocha, s * (0.43 + 0.17 * o.rand()), y, 0.13, 0.14, 0.28, 0.19 + 0.22 * o.rand(), o.rand() * 6);
  }
  o.bloco(agua, 0.052, 0, 0.046, 1.42, 0.007);
  o.muro(o.pedra, [-0.55, 0.13], [0.01, 0.13], 0, 0.071, 0.033);
  o.muro(o.pedra, [0.095, 0.13], [0.46, 0.17], 0, 0.071, 0.033);
  if (fase === 'ruina') {
    for (let i = 0; i < 18; i++) o.peca(copa, o.pedra, 0.01 + o.rand() * 0.082, 0.06 + o.rand() * 0.136, 0.007, 0.011, 0.013, 0.012, o.rand() * 6);
  } else {
    o.arco(o.pedra, 0.052, 0.13, 0.001, 0.09, 0.036, 0.072).name = 'Bueiro do Muro de Helm';
  }
  o.ameiasLinha(o.pedra, -0.55, 0.13, 0.01, 0.13, 0.071, 0.009);
  o.ameiasLinha(o.pedra, 0.095, 0.13, 0.45, 0.164, 0.071, 0.009);
  o.peca(cilindro, o.rocha, 0.318, 0.19, 0.032, 0.17, 0.14, 0.07);
  o.bloco(o.pedra, 0.283, 0.2, 0.197, 0.153, 0.082, 0.07);
  o.arco(o.pedra, 0.287, 0.279, 0.068, 0.089, 0.044, 0.112);
  o.torre(o.pedra, 0.377, 0.155, 0.045, 0.224, 0.073);
  o.peca(cone, madeira, 0.377, 0.155, 0.33, 0.052, 0.052, 0.071);
  o.bloco(escuro, 0.21, -0.49, 0.14, 0.04, 0.091);
  o.arco(o.rocha, 0.21, -0.502, 0, 0.21, 0.093, 0.13).name = 'Entrada de Aglarond';
  return o.montar();
}

export function criarCarasGaladhon(fase: string) {
  const o = maquete('Caras Galadhon', 777);
  const abandonada = fase !== 'ativo';
  const casca = material(0xa7a8a1);
  const copas = [material(0xc69946), material(0xb59c4c), material(0xddb85b)];
  const plataformas: [number, number, number][] = [];
  o.aterro(0.52, 0.43, 0.14, o.relva);
  o.recinto(o.relva, 0.45, 0.36, 0, 0.043, false, 8);
  o.recinto(escuro, 0.489, 0.393, 0.001, 0.005, false, -1);
  o.arco(o.pedra, -0.055, -0.357, 0.001, 0.09, 0.04, 0.057);
  for (let i = 0; i < 14; i++) {
    const a = i * Math.PI * 2 / 14, r = 0.32 + o.rand() * 0.05;
    const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.75, h = 0.16 + o.rand() * 0.095;
    const z = 0.095 + o.rand() * 0.018;
    o.peca(cilindro, casca, x, y, h / 2, 0.012, 0.012, h);
    for (let k = 0; k < 5; k++) {
      const theta = k * Math.PI * 2 / 5 + a;
      o.peca(copa, copas[k % copas.length], x + Math.cos(theta) * 0.034, y + Math.sin(theta) * 0.034, h + o.rand() * 0.046, 0.065, 0.058, 0.045, theta);
    }
    plataformas.push([x, y, z]);
    if (abandonada && i % 3 === 0) continue;
    o.peca(cilindro, madeira, x, y, z, 0.045, 0.041, 0.007);
    for (let j = 0; j < 9; j++) o.bloco(casca, x - 0.024, y - 0.009, 0.024, 0.004, 0.003, z * j / 9);
    if (!abandonada) o.peca(copa, luz, x + 0.032, y, z + 0.025, 0.007, 0.007, 0.01);
  }
  for (let i = 0; i < plataformas.length; i++) {
    if (abandonada && i % 2 === 0) continue;
    const [x, y, z] = plataformas[i], [a, b, c] = plataformas[(i + 1) % plataformas.length];
    o.muro(madeira, [x, y], [a, b], (z + c) / 2, 0.006, 0.018);
  }
  return o.montar();
}

export function criarSaloes(nome: string, fase: string) {
  const o = maquete(nome, 533);
  const elfos = nome === 'Salões de Thranduil', erebor = nome === 'Erebor';
  const narog = nome === 'Salões de Nargothrond';
  const deserto = ['abandonado', 'smaug', 'glaurung', 'abandonada'].includes(fase);
  const rocha = elfos ? material(0x545f50) : narog ? material(0xa48656) : o.rocha;
  const piso = material(elfos ? 0x7e7559 : 0x8e8272);
  o.aterro(0.55, 0.54, 0.21);
  o.bloco(piso, 0, 0.055, 0.77, 0.74, 0.021);
  o.bloco(rocha, 0, 0.347, 0.88, 0.19, 0.24);
  for (const x of [-0.45, 0.45]) {
    o.bloco(rocha, x, 0.075, 0.19, 0.76, 0.15);
    for (let i = 0; i < 6; i++) o.peca(copa, rocha, x + (o.rand() - 0.5) * 0.12, -0.30 + i * 0.128, 0.175, 0.12, 0.12, 0.094 + o.rand() * 0.1, i);
  }
  for (const x of [-0.24, 0.24]) {
    for (const y of [-0.19, -0.063, 0.064, 0.191]) {
      o.peca(cilindro, o.pedra, x, y, 0.077, 0.019, 0.026, 0.115);
      o.bloco(rocha, x, y, 0.056, 0.052, 0.014, 0.128);
      if (!deserto) o.peca(copa, luz, x, y - 0.024, 0.102, 0.008, 0.008, 0.012);
    }
    o.muro(rocha, [x, -0.201], [x, 0.233], 0.141, 0.018, 0.042);
  }
  const entrada = o.arco(o.pedra, 0, -0.329, 0.018, 0.225, 0.076, 0.168);
  entrada.name = narog ? 'Portas de Felagund' : erebor ? 'Porta Principal' : 'Portão do Rei Élfico';
  if (elfos || erebor) {
    o.bloco(agua, 0, -0.468, 1.35, 0.19, 0.013, -0.055);
    o.arco(o.pedra, 0.015, -0.475, -0.071, 0.278, 0.079, 0.084, Math.PI / 2);
  }
  if (elfos) {
    o.bloco(agua, 0.336, -0.165, 0.037, 0.63, 0.009, 0.023);
    for (let i = 0; i < 12; i++) o.peca(cilindro, madeira, 0.31 + o.rand() * 0.038, -0.3 + o.rand() * 0.17, 0.036, 0.011, 0.011, 0.025);
    for (let i = 0; i < 23; i++) {
      const x = (o.rand() - 0.5) * 1.08, y = -0.61 + o.rand() * 1.12;
      if (Math.abs(x) < 0.51 && y > -0.56) continue;
      o.arvore(madeira, o.relva, x, y, 0.026, 0.085);
    }
  } else if (fase === 'smaug' || fase === 'glaurung') {
    for (let i = 0; i < 99; i++) {
      const a = o.rand() * 2 * Math.PI, r = Math.sqrt(o.rand()) * 0.17;
      o.peca(copa, ouro, r * Math.cos(a), 0.097 + r * 0.52 * Math.sin(a), 0.023 + (0.17 - r) * 0.26, 0.018, 0.016, 0.009, a);
    }
  } else if (!deserto) {
    o.bloco(o.pedra, 0, 0.244, 0.26, 0.074, 0.026, 0.02);
    o.bloco(o.rocha, 0, 0.257, 0.075, 0.042, 0.04, 0.048);
  }
  return o.montar();
}

function faixa(pontos: Pt[], terreno: ModeloTerreno, em: Pt, h: number, largura: number, altura: number, mat: THREE.Material) {
  const vs: number[] = [], indices: number[] = [];
  pontos.forEach(([x, y], i) => {
    const a = pontos[Math.max(0, i - 1)], b = pontos[Math.min(i + 1, pontos.length - 1)];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    for (const k of [-1, 1]) {
      const X = x - k * largura * Math.sin(ang) / 2, Y = y + k * largura * Math.cos(ang) / 2;
      const z = terreno.altura(X, Y) - h;
      vs.push(X - em[0], Y - em[1], z + 0.008, X - em[0], Y - em[1], z + 0.008 + altura);
    }
    if (i) {
      const p = (i - 1) * 4, q = i * 4;
      indices.push(p + 1, q + 1, p + 3, p + 3, q + 1, q + 3);
      if (altura) indices.push(p, q, p + 1, p + 1, q, q + 1, p + 2, p + 3, q + 2, p + 3, q + 3, q + 2);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vs, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  return mesh;
}

export function criarMeneltarma(terreno: ModeloTerreno, em: Pt, h: number) {
  const g = new THREE.Group();
  g.name = 'Meneltarma';
  const pontos: Pt[] = Array.from({ length: 241 }, (_, i) => {
    const t = i / 240, a = -0.2 + Math.PI * 6.2 * t, r = 10.2 * (1 - t) + 0.36;
    return [em[0] + Math.cos(a) * r, em[1] + Math.sin(a) * r];
  });
  const estrada = faixa(pontos, terreno, em, h, 0.13, 0, material(0x9e927c, { side: THREE.DoubleSide }));
  estrada.name = 'Relevo';
  g.add(estrada);
  return g;
}

export function criarRammas(fase: string, terreno: ModeloTerreno, em: Pt, h: number) {
  const g = new THREE.Group(), relevo = new THREE.Group(), torres = new THREE.Group();
  g.name = 'Rammas Echor';
  relevo.name = 'Relevo';
  torres.name = 'Pontos no relevo';
  g.add(relevo, torres);
  const muro = material(0xa09885, { side: THREE.DoubleSide });
  const ponto = (i: number): Pt => {
    const a = i * Math.PI / 80;
    return [em[0] - 11 + Math.cos(a) * 11, em[1] + Math.sin(a) * (8 + Math.cos(a))];
  };
  const segmentos = fase === 'ruina' ? [[3, 29], [33, 69], [74, 117], [124, 157]] : [[3, 157]];
  for (const [de, ate] of segmentos) relevo.add(faixa(Array.from({ length: ate - de + 1 }, (_, j) => ponto(de + j)), terreno, em, h, 0.10, 0.036, muro));
  const forte = maquete('Fortalezas da Calçada', 3019);
  forte.arco(forte.pedra, 0, 0, 0, 0.44, 0.11, 0.13, Math.PI / 2);
  for (const y of [-0.24, 0.24]) forte.torre(forte.pedra, 0, y, 0.075, 0.17);
  forte.grupo.position.z = terreno.altura(...em) - h;
  torres.add(forte.montar());
  return g;
}

export function criarCinturao(terreno: ModeloTerreno, em: Pt, h: number) {
  const anel = reinoPorId.get('doriath')!.territorios.find((t) => t.rotulo === 'Cinturão de Melian')!.contorno!;
  const vertices: number[] = [], uvs: number[] = [], faces: number[] = [];
  anel.forEach(([x, y], i) => {
    const b = anel[(i + 1) % anel.length], dx = b[0] - x, dy = b[1] - y;
    const comprimento = Math.hypot(dx, dy);
    const n = Math.ceil(comprimento / 2);
    for (let j = 0; j <= n; j++) {
      const cx = x + dx * j / n, cy = y + dy * j / n;
      for (const k of [-1, 0, 1]) {
        const X = cx - 3.4 * k * dy / comprimento, Y = cy + 3.4 * k * dx / comprimento;
        vertices.push(X - em[0], Y - em[1], terreno.altura(X, Y) - h + (k ? 0.035 : 0.14));
        uvs.push((k + 1) / 2, i + j / n);
      }
      if (j) {
        const q = vertices.length / 3 - 3;
        for (let k = q; k < q + 2; k++) faces.push(k - 3, k, k + 1, k - 3, k + 1, k - 2);
      }
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(faces);
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 local; void main() { local = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 local;
      void main() {
        float borda = smoothstep(0.0, 0.45, min(local.x, 1.0 - local.x));
        float nuvens = 0.68 + 0.19 * sin(local.y * 29.0 + local.x * 1.8) + 0.12 * sin(local.y * 13.1);
        gl_FragColor = vec4(0.64, 0.73, 0.74, borda * nuvens * 0.63);
      }`,
  });
  const g = new THREE.Group(), nevoa = new THREE.Mesh(geo, mat);
  g.name = 'Cinturão de Melian';
  nevoa.name = 'Relevo';
  g.add(nevoa);
  return g;
}

export function criarOrfalch(fase: string, terreno: ModeloTerreno, em: Pt, h: number) {
  const g = new THREE.Group(), pontos = new THREE.Group();
  g.name = 'Orfalch Echor';
  pontos.name = 'Pontos no relevo';
  g.add(pontos);
  const materiais = [madeira, material(0x636a70), material(0xa87850), escuro, material(0xc9d4d8), ouro, material(0x909ba1)];
  for (const [i, gate] of PORTOES_ECHOR.entries()) {
    if (i === 6 && fase === 'seis') break;
    const o = maquete(`Portão de ${gate.nome}`, 116 + i);
    const ruina = fase === 'abandonado';
    o.grupo.position.set(gate.em[0] - em[0], gate.em[1] - em[1], terreno.altura(...gate.em) - h);
    o.grupo.rotation.z = -gate.rumo * Math.PI / 180;
    o.arco(o.pedra, 0, 0, 0, 0.42, 0.063, ruina ? 0.071 : 0.128);
    for (const x of [-0.227, 0.227]) o.torre(o.pedra, x, 0, 0.054, ruina ? 0.068 : 0.155);
    if (!ruina) for (let j = -3; j <= 3; j++) o.bloco(materiais[i], j * 0.031, 0.009, i === 6 || i === 3 ? 0.01 : 0.03, 0.012, 0.067);
    pontos.add(o.montar());
  }
  return g;
}
