import * as THREE from 'three';
import type { Pt } from '../core/types';
import type { ModeloTerreno } from '../terrain/model';
import { Noise } from '../terrain/noise';
import { maquete } from './arquitetura';
import { casco, cilindro, copa, material } from './oficina';

type Maquete = ReturnType<typeof maquete>;

const cantaria = material(0xd9cba9);
const juntas = material(0xa99b81);
const cal = material(0xf1e9d3);
const ardósia = material(0x526268);
const terracota = material(0x88594a);
const madeira = material(0x694936);
const sombra = material(0x393b37);
const folhas = material(0x456242);
const folhasClaras = material(0x69834f);
const lona = material(0xe3d5ae, { side: THREE.DoubleSide });
const velaClara = material(0xf2edd8, { side: THREE.DoubleSide });
const vela = new THREE.ShapeGeometry(new THREE.Shape([
  new THREE.Vector2(-0.50, 0), new THREE.Vector2(0.50, 0.08), new THREE.Vector2(0.31, 0.90), new THREE.Vector2(-0.28, 1),
])).rotateX(Math.PI / 2);

function barco(o: Maquete, x: number, y: number, rumo: number, l: number, pano = lona) {
  o.peca(casco, madeira, x, y, -0.006, l, l * 0.25, l * 0.13, rumo);
  o.peca(cilindro, madeira, x, y, l * 0.32, 0.002, 0.002, l * 0.63);
  o.peca(vela, pano, x, y, l * 0.17, l * 0.46, 1, l * 0.46, rumo + Math.PI / 2);
}

/** Os edifícios assentam em alturas locais; o exagero estica só a posição vertical. */
function assentamento(nome: string, terreno: ModeloTerreno, em: Pt, h: number) {
  const grupo = new THREE.Group(), pontos = new THREE.Group();
  grupo.name = nome;
  pontos.name = 'Pontos no relevo';
  grupo.add(pontos);
  function assentar(o: Maquete, x: number, y: number, giro = 0) {
    o.grupo.position.set(x, y, terreno.altura(em[0] + x, em[1] + y) - h);
    o.grupo.rotation.z = giro;
    pontos.add(o.montar());
  }
  return { grupo, assentar };
}

function armazem(o: Maquete, x: number, y: number, z: number, w: number, d: number) {
  o.casa(cantaria, ardósia, x, y, z, w, d, 0.039, 0, false);
  o.bloco(madeira, x, y + d / 2 + 0.001, 0.032, 0.003, 0.031, z);
  o.bloco(cantaria, x, y + d / 2 + 0.003, 0.04, 0.009, 0.005, z + 0.031);
  for (const lado of [-1, 1]) o.bloco(madeira, x + lado * w * 0.27, y + d / 2 + 0.008, 0.009, 0.009, 0.012, z);
}

function terraco(o: Maquete, x: number, y: number, w: number, d: number, topo: number) {
  o.bloco(cantaria, x, y, w, d, topo + 0.020, -0.020);
  o.bloco(cal, x, y, w * 1.015, d * 1.015, 0.005, topo - 0.005);
  const frente = y + d / 2 + 0.002;
  for (let i = 0; i < 5; i++) {
    o.bloco(cantaria, x + w * (i / 5 - 0.4), frente, w * 0.16, 0.009, topo * 0.9, 0.004);
  }
  for (let z = 0.008; z < topo - 0.008; z += 0.013) {
    o.bloco(juntas, x, frente + 0.005, w * 0.992, 0.0015, 0.0017, z);
    for (let i = 0; i < 14; i++) {
      const dx = i + (Math.round(z / 0.013) % 2 ? 0.25 : 0.75);
      o.bloco(juntas, x - w / 2 + w * dx / 14, frente + 0.005, 0.0018, 0.0015, 0.0115, z);
    }
  }
}

function encostaDeAndunie(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(1.95, 1.36, 42, 36).translate(0, -0.73, 0);
  const p = geo.getAttribute('position');
  const cores: number[] = [];
  const ruido = new Noise(633);
  const verde = new THREE.Color(0x829053), rocha = new THREE.Color(0x817a66), cor = new THREE.Color();
  const { smoothstep } = THREE.MathUtils;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), x = p.getX(i) * (0.95 + Math.sin(y * 7) * 0.09);
    const t = (-y - 0.05) / 1.36;
    const bordo = (1 - smoothstep(Math.abs(x), 0.55, 0.89)) * (1 - smoothstep(t, 0.81, 1));
    const detalhe = ruido.simplex(x * 8.3, y * 8.3);
    p.setXYZ(i, x, y, -0.014 + (0.152 * smoothstep(t, 0.15, 0.84) + detalhe * 0.012) * bordo);
    cor.copy(verde).lerp(rocha, smoothstep(detalhe - bordo * 0.17, -0.09, 0.49));
    cores.push(cor.r, cor.g, cor.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
  geo.computeVertexNormals();
  const encosta = new THREE.Mesh(geo, material(0xffffff, { vertexColors: true }));
  encosta.name = 'Encosta de Andúnië';
  return encosta;
}

export function criarAndunie(fase: string) {
  const porto = new THREE.Group();
  porto.name = 'Andúnië';
  porto.add(encostaDeAndunie());
  const cais = maquete('Cais e armazéns de Andúnië', 631);
  terraco(cais, 0, -0.113, 1.43, 0.29, 0.038);
  for (const x of [-0.45, -0.01, 0.38]) {
    cais.bloco(cantaria, x, 0.076, 0.083, 0.30, 0.044, -0.012);
    for (const y of [0.03, 0.11, 0.19]) cais.bloco(madeira, x - 0.043, y, 0.009, 0.009, 0.05, -0.009);
    armazem(cais, x, -0.22, 0.038, 0.17, 0.079);
    barco(cais, x + 0.09, 0.17, Math.PI * 0.48, 0.135);
  }
  porto.add(cais.montar());

  const cidade = maquete('Bairros em terraços', 632);
  for (const [j, z] of [0.064, 0.106, 0.153].entries()) {
    const y = -0.43 - j * 0.235;
    terraco(cidade, j * -0.038, y, 1.29 - j * 0.13, 0.24, z);
    for (let i = -5 + j; i <= 5 - j; i++) {
      if (Math.abs(i) < 1) continue;
      const x = i * 0.106 - j * 0.038 + (cidade.rand() - 0.5) * 0.012;
      const py = y + (cidade.rand() - 0.5) * 0.036, h = 0.024 + cidade.rand() * 0.03;
      cidade.casa(i % 3 === 0 ? cal : cantaria, i % 4 === 0 ? terracota : ardósia, x, py, z, 0.064 + cidade.rand() * 0.020, 0.067, h, 0);
      cidade.janelas(sombra, x - 0.030, py + 0.034, x + 0.030, py + 0.034, z, 2, 0.02);
      if (i % 3 === 0) cidade.arvore(madeira, folhas, x - 0.034, py - 0.067, z, 0.024 + cidade.rand() * 0.016);
    }
    const anterior = [0.038, 0.064, 0.106][j];
    for (let i = 0; i < 12; i++) {
      cidade.bloco(cal, 0, y + 0.167 - i * 0.0055, 0.075, 0.006, (z - anterior) * (i + 1) / 12, anterior);
    }
  }
  porto.add(cidade.montar());
  if (fase === 'porto') return porto;

  const solar = maquete('Solar dos Senhores de Andúnië', 633);
  const z = 0.153, x = -0.055, y = -0.97;
  solar.bloco(cantaria, x, y, 0.35, 0.19, 0.053, z - 0.032);
  solar.casa(cal, ardósia, x, y, z + 0.020, 0.26, 0.132, 0.073, 0);
  solar.arco(cal, x, y + 0.077, z + 0.021, 0.044, 0.025, 0.050);
  solar.janelas(sombra, x - 0.11, y + 0.067, x + 0.11, y + 0.067, z + 0.056, 2, 0.027, 0.015);
  for (const lado of [-1, 1]) solar.torreQuadrada(cantaria, ardósia, cantaria, x + lado * 0.164, y, z + 0.009, 0.055, 0.103);
  porto.add(solar.montar());
  return porto;
}

export function criarEldalonde(fase: string) {
  const porto = new THREE.Group(), cais = maquete('Cais dos Eldar', 173);
  porto.name = 'Eldalondë';
  porto.rotation.z = 1.22; // +Y local aponta para a Baía de Eldanna.
  terraco(cais, -0.17, -0.19, 0.96, 0.27, 0.047);
  for (const x of [-0.50, -0.19, 0.19]) {
    cais.bloco(cantaria, x, 0.072, 0.076, 0.31, 0.041, -0.010);
    cais.bloco(cal, x, 0.197, 0.102, 0.067, 0.014, 0.020);
    armazem(cais, x, -0.265, 0.047, 0.15, 0.067);
  }
  if (fase === 'eldar') {
    barco(cais, -0.37, 0.24, 0.90, 0.174, velaClara);
    barco(cais, 0.04, 0.21, 1.05, 0.146, velaClara);
  }
  barco(cais, 0.32, 0.21, 1.44, 0.083);
  porto.add(cais.montar());

  const jardim = maquete('Pórtico e árvores de Nísimaldar', 174);
  jardim.bloco(cantaria, 0, -0.435, 0.50, 0.097, 0.035, -0.013);
  jardim.bloco(cal, 0, -0.397, 0.48, 0.024, 0.008, 0.014);
  for (let k = -2; k <= 2; k++) jardim.arco(cantaria, k * 0.087, -0.45, 0.022, 0.088, 0.024, 0.070);
  jardim.telhado(ardósia, 0, -0.45, 0.092, 0.46, 0.053, 0.018);
  for (let i = 0; i < 30; i++) {
    const x = (jardim.rand() - 0.5) * 1.16, y = -0.55 - jardim.rand() * 0.32;
    jardim.arvore(madeira, i % 4 === 0 ? folhasClaras : folhas, x, y, 0.008, 0.022 + jardim.rand() * 0.044);
  }
  porto.add(jardim.montar());
  return porto;
}

export function criarNindamos() {
  const o = maquete('Nindamos', 187);
  o.grupo.rotation.z = Math.PI; // Ao sul do Siril; aldeia na margem leste do rio.
  for (const x of [-0.55, -0.34, -0.15]) {
    o.bloco(madeira, x, 0.024, 0.049, 0.27, 0.009, 0.018);
    for (const y of [-0.076, 0, 0.07, 0.14]) {
      for (const lado of [-1, 1]) o.bloco(madeira, x + lado * 0.022, y, 0.006, 0.006, 0.040, -0.008);
    }
    barco(o, x + 0.069, 0.21, 1.4, 0.069);
  }
  const aldeia = maquete('Casas de pescadores e passadiços', 188);
  aldeia.bloco(madeira, -0.35, -0.13, 0.58, 0.070, 0.013, 0.020);
  for (let linha = 0; linha < 3; linha++) {
    for (let i = 0; i < 5; i++) {
      const x = -0.60 + i * 0.108 + aldeia.rand() * 0.029;
      const y = -0.21 - linha * 0.114 + (aldeia.rand() - 0.5) * 0.037;
      const z = 0.035 + linha * 0.008;
      const w = 0.050 + aldeia.rand() * 0.026;
      for (const lado of [-1, 1]) aldeia.bloco(madeira, x + w * lado * 0.36, y, 0.009, 0.040, z + 0.006, -0.006);
      aldeia.casa(i % 3 === 0 ? cantaria : madeira, i % 2 === 0 ? terracota : ardósia, x, y, z, w, 0.050, 0.026, 0, false);
      aldeia.bloco(sombra, x, y + 0.026, 0.013, 0.003, 0.019, z);
    }
  }
  o.grupo.add(aldeia.montar());
  return o.montar();
}

export function criarEmerie(_fase: string, terreno: ModeloTerreno, em: Pt, h: number) {
  const local = assentamento('Emerië', terreno, em, h);
  const casa = maquete('Casa Branca de Erendis', 882);
  casa.bloco(cantaria, 0, 0, 0.31, 0.24, 0.042, -0.037);
  casa.casa(cal, ardósia, 0, 0.007, 0.004, 0.245, 0.153, 0.058, 0);
  casa.bloco(cantaria, 0, -0.097, 0.237, 0.063, 0.009, 0.004);
  for (let i = -2; i <= 2; i++) casa.bloco(cal, i * 0.051, -0.119, 0.007, 0.008, 0.054, 0.012);
  casa.telhado(ardósia, 0, -0.094, 0.066, 0.252, 0.069, 0.028);
  casa.bloco(sombra, 0, -0.071, 0.025, 0.003, 0.042, 0.004);
  casa.bloco(cantaria, 0, -0.075, 0.039, 0.010, 0.004, 0.046);
  casa.bloco(cantaria, 0.079, 0.048, 0.021, 0.023, 0.049, 0.092);
  casa.bloco(cal, 0.079, 0.048, 0.025, 0.027, 0.005, 0.141);
  casa.janelas(sombra, -0.092, -0.072, 0.092, -0.072, 0.011, 2, 0.04, 0.028);
  local.assentar(casa, 0, 0);

  const pasto = maquete('Redil de Emerië', 883);
  const muro: Pt[] = [[0.065, -0.126], [0.181, -0.110], [0.225, -0.035], [0.182, 0.100],
    [0.085, 0.138], [-0.105, 0.132], [-0.212, 0.077], [-0.219, -0.049], [-0.156, -0.122], [-0.033, -0.124]];
  for (let i = 0; i < muro.length - 1; i++) pasto.muro(cantaria, muro[i], muro[i + 1], -0.008, 0.020, 0.012);
  for (let i = 0; i < 15; i++) {
    const x = (pasto.rand() - 0.5) * 0.33, y = (pasto.rand() - 0.5) * 0.19;
    pasto.peca(copa, cal, x, y, 0.010, 0.008, 0.0048, 0.006, pasto.rand() * 6);
    pasto.peca(copa, sombra, x + 0.007, y, 0.011, 0.0032, 0.003, 0.0037);
  }
  local.assentar(pasto, 0.39, 0.14, -0.17);
  const jardim = maquete('Árvores da Casa Branca', 886);
  jardim.arvore(madeira, folhas, -0.052, -0.025, -0.015, 0.062);
  jardim.arvore(madeira, folhasClaras, 0.067, 0.043, -0.015, 0.047);
  local.assentar(jardim, -0.25, 0.068);
  return local.grupo;
}

export function criarHyarastorni(_fase: string, terreno: ModeloTerreno, em: Pt, h: number) {
  const local = assentamento('Hyarastorni', terreno, em, h);
  const casa = maquete('Casa de Hallatan', 884);
  casa.bloco(cantaria, 0, 0, 0.31, 0.28, 0.045, -0.039);
  casa.casa(cantaria, terracota, 0, 0.071, 0.006, 0.25, 0.115, 0.060, 0, false);
  casa.casa(madeira, ardósia, -0.113, -0.032, 0.006, 0.124, 0.083, 0.042, Math.PI / 2, false);
  casa.casa(cantaria, terracota, 0.118, -0.026, 0.006, 0.10, 0.068, 0.028, Math.PI / 2);
  casa.bloco(madeira, 0, 0.011, 0.048, 0.004, 0.037, 0.008);
  casa.janelas(sombra, -0.099, 0.012, 0.10, 0.012, 0.027, 2, 0.027);
  local.assentar(casa, 0, 0, -0.04);

  const celeiro = maquete('Celeiros e muros de pastagem', 885);
  armazem(celeiro, 0, 0, 0.004, 0.19, 0.105);
  celeiro.muro(cantaria, [-0.13, -0.085], [-0.13, 0.108], -0.012, 0.018, 0.012);
  celeiro.muro(cantaria, [-0.13, 0.108], [0.16, 0.108], -0.012, 0.018, 0.012);
  celeiro.muro(cantaria, [0.16, 0.108], [0.177, -0.047], -0.012, 0.018, 0.012);
  local.assentar(celeiro, -0.38, -0.19, 0.47);
  return local.grupo;
}

function paredaoNoirinan(terreno: ModeloTerreno, em: Pt, h: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(2.20, 0.93, 48, 32).translate(0, 0.36, 0);
  const p = geo.getAttribute('position'), cores: number[] = [];
  const ruido = new Noise(442);
  const rocha = new THREE.Color(0x6e695c), terra = new THREE.Color(0x797b51), cor = new THREE.Color();
  const { smoothstep } = THREE.MathUtils;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const recuo = y - 0.045 - Math.abs(x) * 0.50;
    const encosta = smoothstep(recuo, -0.038, 0.14) * (1 - smoothstep(recuo, 0.21, 0.36))
      * (1 - smoothstep(Math.abs(x), 0.72, 1.08)) * (1 - smoothstep(y, 0.66, 0.82));
    const fratura = ruido.simplex(x * 8.2 + y, y * 12.8);
    const base = terreno.altura(em[0] + x, em[1] + y) - h - 0.014;
    p.setZ(i, base + (0.121 + fratura * 0.022) * encosta);
    cor.copy(terra).lerp(rocha, encosta).multiplyScalar(0.88 + fratura * 0.16);
    cores.push(cor.r, cor.g, cor.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
  geo.computeVertexNormals();
  const paredao = new THREE.Mesh(geo, material(0xffffff, { vertexColors: true }));
  paredao.name = 'Relevo';
  return paredao;
}

export function criarNoirinan(_fase: string, terreno: ModeloTerreno, em: Pt, h: number) {
  const local = assentamento('Noirinan', terreno, em, h);
  local.grupo.add(paredaoNoirinan(terreno, em, h));
  for (const [i, [x, y, giro]] of [[0, 0, 0], [-0.33, 0.17, 0.28], [0.34, 0.22, -0.24], [-0.66, 0.40, 0.49], [0.67, 0.42, -0.46]].entries()) {
    const o = maquete(i === 0 ? 'Sepultura de Elros' : `Entrada funerária ${i}`, 442 + i);
    const escala = i === 0 ? 1 : 0.70 + o.rand() * 0.14;
    // A rocha envolve a entrada; a face posterior escura dá profundidade ao vão.
    for (let k = -2; k <= 2; k++) {
      o.peca(copa, o.rocha, k * 0.064 * escala, 0.07 * escala, 0.048 * escala,
        0.085 * escala, (0.10 + o.rand() * 0.044) * escala, (0.065 + o.rand() * 0.062) * escala, k * 0.38);
    }
    o.bloco(sombra, 0, 0.008, 0.086 * escala, 0.011, 0.074 * escala);
    o.arco(cantaria, 0, -0.054 * escala, 0.007, 0.155 * escala, 0.027, 0.105 * escala);
    o.bloco(cal, 0, -0.055 * escala, 0.177 * escala, 0.035, 0.012, 0.105 * escala);
    for (let degrau = 0; degrau < 5; degrau++) {
      o.bloco(cantaria, 0, -0.143 * escala + degrau * 0.014, 0.173 * escala, 0.024, 0.008 + degrau * 0.004, -0.015);
    }
    local.assentar(o, x, y, giro);
  }
  return local.grupo;
}
