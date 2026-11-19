import * as THREE from 'three';
import type { Pt } from '../core/types';
import type { ModeloTerreno } from '../terrain/model';
import { Noise } from '../terrain/noise';
import { maquete } from './arquitetura';
import { casco, cilindro, copa, material, type M } from './oficina';
import {
  arcada, ardósia, árvore, arrimo, azul, bronze, cal, cantaria, cobre, coluna, escora,
  madeira, moldura, nicho, ocre, pedraEscura, piso, sombra, tábuas, telhado, terracota,
} from './numenor-acabamentos';

type Maquete = ReturnType<typeof maquete>;

const lona = material(0xe3d5ae, { side: THREE.DoubleSide });
const velaClara = material(0xf2edd8, { side: THREE.DoubleSide });
const vela = new THREE.ShapeGeometry(new THREE.Shape([
  new THREE.Vector2(-0.50, 0), new THREE.Vector2(0.50, 0.08), new THREE.Vector2(0.31, 0.90), new THREE.Vector2(-0.28, 1),
])).rotateX(Math.PI / 2);

const convés = casco.clone();

function barco(o: Maquete, x: number, y: number, rumo: number, l: number, pano = lona) {
  o.peca(casco, madeira, x, y, -0.006, l, l * 0.25, l * 0.15, rumo);
  o.peca(convés, tábuas, x, y, l * 0.088 - 0.006, l * 0.88, l * 0.21, l * 0.029, rumo);
  o.peca(cilindro, madeira, x, y, l * 0.32, 0.002, 0.002, l * 0.63);
  for (const [offset, z] of [[0, 0.17], [-0.008, 0.615]]) {
    const [dx, dy] = o.giro(rumo, 0, offset * l);
    o.bloco(madeira, x + dx, y + dy, l * (z < 0.3 ? 0.51 : 0.34), 0.002, 0.002, l * z, rumo + Math.PI / 2);
  }
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

/** Volume, beirais e cumeeira com a mesma orientação da fachada. */
function edifício(o: Maquete, parede: M, telha: M, x: number, y: number, z: number, w: number, d: number, h: number, ang = 0, quatroÁguas = true) {
  o.bloco(parede, x, y, w, d, h, z, ang);
  o.bloco(parede, x, y, w * 1.07, d * 1.07, 0.004, z, ang);
  o.bloco(madeira, x, y, w * 1.07, d * 1.12, 0.0025, z + h - 0.0025, ang);
  telhado(o, telha, x, y, z + h, w * 1.064, d * 1.163, (quatroÁguas ? Math.min(w, d) : d) * 0.49, ang,
    quatroÁguas ? undefined : parede);
}

function janela(o: Maquete, x: number, y: number, z: number, w: number, h: number, guarnição = moldura, ang = 0) {
  o.bloco(sombra, x, y, w, 0.003, h, z, ang);
  for (const lado of [-1, 1]) {
    const [dx, dy] = o.giro(ang, lado * w * 0.69, 0);
    o.bloco(guarnição, x + dx, y + dy, w * 0.31, 0.0035, h, z, ang);
  }
  for (const dz of [-0.002, h]) o.bloco(moldura, x, y, w * 1.78, 0.004, 0.002, z + dz, ang);
}

function armazem(o: Maquete, x: number, y: number, z: number, w: number, d: number) {
  edifício(o, cantaria, ardósia, x, y, z, w, d, 0.045, 0, false);
  const frente = y + d / 2 + 0.0015;
  nicho(o, x, frente, z + 0.002, 0.052, 0.041, Math.PI);
  o.bloco(madeira, x, frente + 0.0008, 0.032, 0.003, 0.022, z + 0.002);
  for (const lado of [-1, 1]) {
    janela(o, x + lado * w * 0.33, frente, z + 0.020, 0.010, 0.012, madeira);
    o.bloco(cantaria, x + lado * (w / 2 - 0.005), frente, 0.010, 0.007, 0.042, z);
  }
}

// A lona fica esticada entre a verga e a linha frontal de postes.
const cobertura = new THREE.PlaneGeometry(1, 1).rotateX(0.20);
function banca(o: Maquete, x: number, y: number, z: number, w: number, tecido: M) {
  for (const dx of [-w * 0.46, w * 0.46]) {
    for (const dy of [-0.011, 0.011]) o.bloco(madeira, x + dx, y + dy, 0.003, 0.003, 0.023 + dy * 0.20, z);
  }
  o.peca(cobertura, tecido, x, y, z + 0.024, w, 0.030, 0.030);
  o.bloco(tábuas, x, y, w * 0.87, 0.014, 0.007, z + 0.005);
}

function carga(o: Maquete, x: number, y: number, z: number) {
  for (let i = 0; i < 4; i++) {
    const s = 0.007 + o.rand() * 0.009;
    const dx = x + (i - 1.5) * 0.012, dy = y + (o.rand() - 0.5) * 0.013;
    if (i % 2 === 0) {
      o.peca(cilindro, madeira, dx, dy, z + s / 2, s * 0.48, s * 0.48, s);
      for (const h of [0.22, 0.78]) o.peca(cilindro, sombra, dx, dy, z + s * h, s / 2, s / 2, 0.0012);
    } else {
      const ângulo = o.rand() * 0.9;
      o.bloco(tábuas, dx, dy, s, s, s * 0.7, z, ângulo);
      o.bloco(madeira, dx, dy, s, 0.002, 0.001, z + s * 0.7, ângulo);
    }
  }
}

function degraus(o: Maquete, x: number, y: number, z: number, w: number, d: number, h: number, n: number, rumo = -1) {
  const passo = d / n;
  for (let i = 0; i < n; i++) {
    o.bloco(cantaria, x, y + rumo * (i + 0.5) * passo, w, passo, h * (i + 1) / n, z);
  }
}

function terraco(o: Maquete, x: number, y: number, w: number, d: number, topo: number, arcadas = false) {
  o.bloco(arrimo, x, y, w, d, topo + 0.014, -0.020);
  o.bloco(piso, x, y, w * 1.01, d * 1.02, 0.006, topo - 0.006);
  const frente = y + d / 2 + 0.003;
  for (let i = -5; i <= 5; i++) {
    const dx = x + i * w / 12;
    if (arcadas && i !== 0) nicho(o, dx, frente, topo - 0.027, w / 14, 0.023, Math.PI, cantaria);
    o.bloco(cantaria, dx + w / 24, frente, 0.011, 0.016, 0.027, topo - 0.026);
  }
  o.bloco(moldura, x, frente, w, 0.013, 0.005, topo - 0.006);
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
  terraco(cais, 0, -0.113, 1.43, 0.29, 0.038, true);
  for (const [i, x] of [-0.45, -0.01, 0.38].entries()) {
    const extensão = [0.30, 0.25, 0.33][i];
    cais.bloco(arrimo, x, 0.076, 0.083, extensão, 0.045, -0.012);
    cais.bloco(piso, x, 0.076, 0.089, extensão + 0.007, 0.005, 0.033);
    for (const y of [0.032, 0.106, 0.186]) {
      cais.bloco(madeira, x - 0.043, y, 0.008, 0.008, 0.043, -0.004);
      cais.bloco(madeira, x + 0.043, y, 0.008, 0.008, 0.043, -0.004);
    }
    if (i === 1) {
      cais.bloco(piso, x, -0.195, 0.16, 0.070, 0.003, 0.038);
      for (const lado of [-1, 1]) coluna(cais, moldura, x + lado * 0.068, -0.179, 0.041, 0.009, 0.032);
      arcada(cais, moldura, x, -0.179, 0.040, 0.12, 0.012, 0.056);
    } else armazem(cais, x, -0.22, 0.038, 0.17, 0.079);
    carga(cais, x, -0.038, 0.038);
    barco(cais, x + 0.09, 0.17, Math.PI * 0.48, 0.135);
  }
  for (const [i, x] of [-0.60, -0.33, -0.23, 0.21, 0.55].entries()) {
    banca(cais, x, -0.096 - i % 2 * 0.023, 0.038, 0.043, i % 2 === 0 ? lona : terracota);
  }
  for (const lado of [-1, 1]) {
    const x = lado * 0.62;
    degraus(cais, x, 0.075, 0.001, 0.077, 0.047, 0.035, 8);
    cais.bloco(piso, x, 0.025, 0.081, 0.024, 0.005, 0.033);
    árvore(cais, lado * 0.64, -0.184, 0.038, 0.042);
  }
  porto.add(cais.montar());

  const cidade = maquete('Bairros em terraços', 632);
  for (const [j, z] of [0.064, 0.106, 0.153].entries()) {
    const y = -0.43 - j * 0.235;
    terraco(cidade, j * -0.038, y, 1.29 - j * 0.13, 0.24, z, true);
    for (let i = -5 + j; i <= 5 - j; i++) {
      if (i === 0 || (i === 2 && j === 1) || (j === 2 && fase !== 'porto' && Math.abs(i) <= 2)) continue;
      const x = i * 0.106 - j * 0.038 + (cidade.rand() - 0.5) * 0.016;
      const py = y + (cidade.rand() - 0.5) * 0.058 - 0.014;
      const h = 0.029 + cidade.rand() * 0.042;
      const w = 0.059 + cidade.rand() * 0.023, d = 0.064 + cidade.rand() * 0.029;
      const parede = [cal, cantaria, ocre][(i + 5 + j) % 3];
      const telha = i % 4 === 0 ? terracota : ardósia;
      edifício(cidade, parede, telha, x, py, z, w, d, h, 0, i % 3 !== 0);
      const face = py + d / 2 + 0.001;
      nicho(cidade, x, face, z + 0.002, 0.015, 0.021, Math.PI);
      for (const lado of [-1, 1]) {
        janela(cidade, x + lado * w * 0.27, face, z + h - 0.019, 0.008, 0.011, azul);
        janela(cidade, x + lado * (w / 2 + 0.001), py, z + h * 0.48, 0.008, 0.013, madeira, Math.PI / 2);
      }
      if (i % 2 !== 0) cidade.bloco(cantaria, x + w * 0.29, py - d * 0.24, 0.008, 0.009, d * 0.35, z + h + 0.006);
      if (i % 3 === 0) árvore(cidade, x - 0.024, py - 0.064, z, 0.031, i > 0);
    }
    // Lotes menores nas ruas transversais quebram a linha das fachadas principais.
    for (const lado of [-1, 1]) {
      for (let k = 0; k < (j < 2 ? 3 : 1); k++) {
        const x = j * -0.038 + lado * (0.21 + k * 0.135 + cidade.rand() * 0.027), py = y - 0.071;
        const w = 0.040 + cidade.rand() * 0.029, d = 0.047;
        const h = 0.022 + cidade.rand() * 0.024;
        if (j === 2 && fase !== 'porto') continue;
        edifício(cidade, k % 2 === 0 ? cal : ocre, k === 1 ? terracota : ardósia, x, py, z, w, d, h, 0, k % 2 === 0);
        janela(cidade, x + lado * (w / 2 + 0.001), py, z + 0.013, 0.009, 0.009, azul, Math.PI / 2);
      }
      const x = j * -0.038 + lado * (0.57 - j * 0.064);
      cidade.bloco(cantaria, x, y - 0.020, 0.018, 0.178, 0.011, z);
      cidade.bloco(piso, x, y - 0.020, 0.022, 0.181, 0.003, z + 0.010);
      árvore(cidade, x - lado * 0.025, y + 0.075, z, 0.038, true);
    }
    const anterior = [0.038, 0.064, 0.106][j];
    const x = j * -0.038, entrada = y + 0.19;
    degraus(cidade, x, entrada, anterior, 0.064, 0.079, z - anterior, 12);
    for (const lado of [-1, 1]) {
      const borda = x + lado * 0.036;
      cidade.bloco(cantaria, borda, entrada - 0.049, 0.007, 0.076, 0.011, z - 0.007);
      cidade.bloco(moldura, borda, entrada - 0.049, 0.009, 0.077, 0.003, z + 0.004);
    }
  }
  porto.add(cidade.montar());
  if (fase === 'porto') return porto;

  const solar = maquete('Solar dos Senhores de Andúnië', 633);
  const z = 0.155, x = -0.055, y = -0.976;
  solar.bloco(arrimo, x, y + 0.028, 0.43, 0.214, 0.061, z - 0.042);
  solar.bloco(piso, x, y + 0.028, 0.437, 0.219, 0.006, z + 0.014);
  edifício(solar, cal, ardósia, x, y - 0.021, z + 0.020, 0.263, 0.143, 0.093);
  const frente = y + 0.099;
  solar.bloco(piso, x, frente - 0.030, 0.256, 0.082, 0.008, z + 0.020);
  for (let i = -2; i <= 2; i++) {
    arcada(solar, cantaria, x + i * 0.048, frente, z + 0.028, 0.046, 0.012, 0.051);
    nicho(solar, x + i * 0.048, y + 0.052, z + 0.084, 0.021, 0.023, Math.PI);
  }
  solar.bloco(azul, x, frente - 0.028, 0.262, 0.079, 0.008, z + 0.079);
  solar.bloco(bronze, x, frente - 0.028, 0.264, 0.081, 0.002, z + 0.087);
  telhado(solar, cobre, x, frente - 0.028, z + 0.089, 0.27, 0.082, 0.024);
  for (const lado of [-1, 1]) {
    const tx = x + lado * 0.166;
    solar.torreQuadrada(cantaria, cobre, bronze, tx, y, z + 0.019, 0.062, 0.112);
    solar.bloco(azul, tx, y, 0.064, 0.064, 0.005, z + 0.110);
    for (const dz of [0.047, 0.081]) nicho(solar, tx, y + 0.032, z + dz, 0.020, 0.023, Math.PI);
    árvore(solar, x + lado * 0.168, frente - 0.005, z + 0.020, 0.039);
  }
  degraus(solar, x, frente + 0.041, z + 0.015, 0.095, 0.032, 0.012, 5);
  porto.add(solar.montar());
  return porto;
}

export function criarEldalonde(fase: string) {
  const porto = new THREE.Group(), cais = maquete('Cais dos Eldar', 173);
  porto.name = 'Eldalondë';
  porto.rotation.z = 1.22; // +Y local aponta para a Baía de Eldanna.
  terraco(cais, -0.17, -0.19, 0.96, 0.27, 0.047);
  for (const [i, x] of [-0.50, -0.19, 0.19].entries()) {
    cais.bloco(arrimo, x, 0.072, 0.076, 0.31, 0.041, -0.010);
    cais.bloco(piso, x, 0.072, 0.081, 0.31, 0.006, 0.030);
    cais.bloco(cantaria, x, 0.197, 0.102, 0.067, 0.014, 0.022);
    for (const lado of [-1, 1]) {
      const dx = x + lado * 0.035;
      for (const y of [-0.003, 0.079, 0.154]) coluna(cais, moldura, dx, y, 0.036, 0.009, 0.009);
    }
    armazem(cais, x, -0.265, 0.047, 0.15, 0.067);
    carga(cais, x + 0.05, -0.13 - i * 0.01, 0.047);
  }
  if (fase === 'eldar') {
    barco(cais, -0.37, 0.24, 0.90, 0.174, velaClara);
    barco(cais, 0.04, 0.21, 1.05, 0.146, velaClara);
  }
  barco(cais, 0.32, 0.21, 1.44, 0.083);
  porto.add(cais.montar());

  const jardim = maquete('Pórtico e árvores de Nísimaldar', 174);
  jardim.bloco(arrimo, 0, -0.443, 0.57, 0.111, 0.048, -0.013);
  jardim.bloco(piso, 0, -0.439, 0.56, 0.114, 0.005, 0.035);
  degraus(jardim, 0, -0.338, 0.004, 0.143, 0.057, 0.035, 6);
  for (const y of [-0.423, -0.465]) {
    for (let k = -2; k <= 2; k++) arcada(jardim, moldura, k * 0.079, y, 0.042, 0.077, 0.006, 0.057);
    for (let k = 0; k <= 5; k++) coluna(jardim, cantaria, (k - 2.5) * 0.079, y, 0.041, 0.007, 0.038);
  }
  jardim.bloco(moldura, 0, -0.444, 0.421, 0.058, 0.004, 0.097);
  telhado(jardim, cobre, 0, -0.444, 0.101, 0.423, 0.069, 0.021);
  for (const x of [-0.232, 0.232]) {
    jardim.bloco(cantaria, x, -0.444, 0.057, 0.065, 0.007, 0.040);
    for (const dx of [-0.020, 0.020]) {
      for (const y of [-0.422, -0.466]) coluna(jardim, moldura, x + dx, y, 0.047, 0.009, 0.071);
    }
    jardim.bloco(moldura, x, -0.444, 0.060, 0.066, 0.006, 0.118);
    telhado(jardim, cobre, x, -0.444, 0.124, 0.068, 0.073, 0.031);
    jardim.finial(bronze, x, -0.444, 0.155, 0.014);
    árvore(jardim, x * 1.47, -0.425, 0.002, 0.049, true);
  }
  jardim.bloco(piso, 0, -0.61, 0.071, 0.243, 0.006, -0.004);
  for (let i = 0; i < 27; i++) {
    const x = (i % 2 ? 1 : -1) * (0.064 + jardim.rand() * 0.5), y = -0.53 - jardim.rand() * 0.32;
    árvore(jardim, x, y, 0, 0.023 + jardim.rand() * 0.043, i % 4 === 0);
  }
  porto.add(jardim.montar());
  return porto;
}

export function criarNindamos() {
  const o = maquete('Nindamos', 187);
  o.grupo.rotation.z = Math.PI; // Ao sul do Siril; aldeia na margem leste do rio.
  for (const [i, x] of [-0.55, -0.34, -0.15].entries()) {
    const extensão = [0.25, 0.30, 0.21][i];
    const fim = -0.144 + extensão;
    o.bloco(tábuas, x, -0.144 + extensão / 2, 0.048, extensão, 0.007, 0.020);
    // Cada tábua cruza o passadiço e as duas vigas longitudinais apoiam o piso.
    for (let y = -0.141; y < fim - 0.002; y += 0.010) o.bloco(tábuas, x, y, 0.050, 0.0094, 0.005, 0.023);
    for (const lado of [-1, 1]) {
      o.bloco(madeira, x + lado * 0.019, -0.144 + extensão / 2, 0.006, extensão, 0.008, 0.016);
      for (let y = -0.114; y < fim; y += 0.056) {
        o.bloco(madeira, x + lado * 0.022, y, 0.006, 0.006, 0.047, -0.008);
      }
    }
    carga(o, x, -0.12, 0.028);
    barco(o, x + 0.069, 0.21, 1.4, 0.069);
  }
  const aldeia = maquete('Casas de pescadores e passadiços', 188);
  aldeia.bloco(tábuas, -0.35, -0.13, 0.58, 0.061, 0.012, 0.018);
  for (let x = -0.63; x <= -0.07; x += 0.033) {
    aldeia.bloco(tábuas, x, -0.13, 0.030, 0.063, 0.003, 0.029);
    aldeia.bloco(madeira, x, -0.101, 0.004, 0.004, 0.018, 0.030);
  }
  aldeia.bloco(madeira, -0.35, -0.101, 0.56, 0.003, 0.003, 0.045);
  for (let linha = 0; linha < 3; linha++) {
    for (let i = 0; i < 5; i++) {
      const x = -0.61 + i * 0.108 + aldeia.rand() * 0.035;
      const y = -0.21 - linha * 0.114 + (aldeia.rand() - 0.5) * 0.046;
      const z = 0.035 + linha * 0.008;
      const w = 0.046 + aldeia.rand() * 0.034, d = 0.044 + aldeia.rand() * 0.019;
      const h = 0.021 + aldeia.rand() * 0.014;
      const ang = (aldeia.rand() - 0.5) * 0.67;
      const ponto = (dx: number, dy: number) => {
        const [px, py] = aldeia.giro(ang, dx, dy);
        return [x + px, y + py] as const;
      };
      for (const lado of [-1, 1]) {
        for (const fundo of [-1, 1]) {
          const [px, py] = ponto(w * lado * 0.42, d * fundo * 0.4);
          aldeia.bloco(madeira, px, py, 0.006, 0.006, z + 0.010, -0.008, ang);
        }
      }
      const [fx, fy] = ponto(0, d / 2 + 0.006);
      escora(aldeia, fx, fy, -0.001, w * 0.71, z, ang);
      aldeia.bloco(tábuas, fx, fy, w * 1.12, 0.020, 0.005, z - 0.004, ang);
      edifício(aldeia, i % 3 === 0 ? ocre : madeira, (i + linha) % 3 === 0 ? terracota : ardósia, x, y, z, w, d, h, ang, false);
      const [px, py] = ponto(0, d * 0.5 + 0.001);
      aldeia.bloco(sombra, px, py, 0.011, 0.004, h * 0.65, z, ang);
      const [jx, jy] = ponto(w * 0.30, d * 0.5 + 0.001);
      janela(aldeia, jx, jy, z + h * 0.55, 0.006, 0.008, tábuas, ang);
      if (linha === 0 && i % 2 === 0) {
        const [ax, ay] = ponto(0, d / 2 + 0.012);
        telhado(aldeia, i === 2 ? lona : tábuas, ax, ay, z + h * 0.75, w * 0.73, 0.027, 0.007, ang);
        for (const lado of [-1, 1]) {
          const [px, py] = ponto(lado * w * 0.32, d / 2 + 0.016);
          aldeia.bloco(madeira, px, py, 0.0025, 0.0025, h * 0.75, z, ang);
        }
      }
    }
  }
  // Cavaletes para estender as redes junto ao cais.
  for (const x of [-0.46, -0.24]) {
    for (const lado of [-1, 1]) aldeia.bloco(madeira, x + lado * 0.025, -0.116, 0.003, 0.004, 0.034, 0.031);
    aldeia.bloco(madeira, x, -0.116, 0.056, 0.003, 0.003, 0.063);
    for (let i = -5; i <= 5; i++) aldeia.bloco(lona, x + i * 0.004, -0.116, 0.0009, 0.001, 0.022 - Math.abs(i) * 0.0013, 0.064 - (0.022 - Math.abs(i) * 0.0013));
    for (const z of [0.050, 0.055, 0.060]) aldeia.bloco(lona, x, -0.116, 0.044, 0.001, 0.0009, z);
  }
  o.grupo.add(aldeia.montar());
  return o.montar();
}

export function criarEmerie(_fase: string, terreno: ModeloTerreno, em: Pt, h: number) {
  const local = assentamento('Emerië', terreno, em, h);
  const casa = maquete('Casa Branca de Erendis', 882);
  casa.bloco(arrimo, 0, 0, 0.314, 0.254, 0.042, -0.037);
  casa.bloco(piso, 0, 0, 0.317, 0.256, 0.004, 0.002);
  edifício(casa, cal, ardósia, 0, 0.022, 0.006, 0.238, 0.144, 0.065);
  casa.bloco(cantaria, 0, -0.084, 0.246, 0.067, 0.010, 0.005);
  casa.bloco(piso, 0, -0.085, 0.247, 0.065, 0.004, 0.013);
  for (const x of [-0.113, -0.076, -0.038, 0.038, 0.076, 0.113]) coluna(casa, moldura, x, -0.110, 0.017, 0.009, 0.049);
  casa.bloco(madeira, 0, -0.085, 0.251, 0.070, 0.004, 0.065);
  telhado(casa, ardósia, 0, -0.085, 0.069, 0.260, 0.075, 0.022);
  nicho(casa, 0, -0.0515, 0.016, 0.035, 0.043);
  casa.bloco(azul, 0, -0.053, 0.012, 0.003, 0.024, 0.018);
  for (const x of [-0.087, -0.044, 0.044, 0.087]) {
    janela(casa, x, -0.0515, 0.031, 0.011, 0.019, azul);
    janela(casa, x, 0.095, 0.031, 0.011, 0.019, azul);
  }
  for (const lado of [-1, 1]) {
    for (const y of [-0.005, 0.048]) janela(casa, lado * 0.120, y, 0.031, 0.012, 0.021, azul, Math.PI / 2);
    casa.bloco(ocre, lado * 0.110, -0.134, 0.035, 0.024, 0.005, 0.001);
    for (const dx of [-0.01, 0, 0.01]) árvore(casa, lado * 0.110 + dx, -0.134, 0.003, 0.010, true);
  }
  degraus(casa, 0, -0.159, -0.006, 0.075, 0.040, 0.023, 6, 1);
  casa.bloco(cantaria, 0.071, 0.063, 0.021, 0.024, 0.064, 0.080);
  casa.bloco(moldura, 0.071, 0.063, 0.025, 0.027, 0.004, 0.144);
  for (const lado of [-1, 1]) casa.bloco(cantaria, 0.071 + lado * 0.005, 0.063, 0.006, 0.012, 0.008, 0.148);
  local.assentar(casa, 0, 0);

  const pasto = maquete('Redil de Emerië', 883);
  const muro: Pt[] = [[0.065, -0.126], [0.181, -0.110], [0.225, -0.035], [0.182, 0.100],
    [0.085, 0.138], [-0.105, 0.132], [-0.212, 0.077], [-0.219, -0.049], [-0.156, -0.122], [-0.033, -0.124]];
  for (let i = 0; i < muro.length - 1; i++) {
    pasto.muro(arrimo, muro[i], muro[i + 1], -0.008, 0.020, 0.012);
    pasto.muro(cantaria, muro[i], muro[i + 1], 0.010, 0.005, 0.015);
  }
  for (const x of [-0.032, 0.064]) pasto.bloco(madeira, x, -0.125, 0.009, 0.010, 0.025, -0.003);
  for (const z of [0.006, 0.016]) pasto.bloco(tábuas, 0.017, -0.125, 0.093, 0.004, 0.003, z);
  escora(pasto, 0.017, -0.123, 0.004, 0.090, 0.014);
  for (let i = 0; i < 15; i++) {
    const x = (pasto.rand() - 0.5) * 0.33, y = (pasto.rand() - 0.5) * 0.19;
    pasto.peca(copa, cal, x, y, 0.010, 0.008, 0.0048, 0.006, pasto.rand() * 6);
    pasto.peca(copa, sombra, x + 0.007, y, 0.011, 0.0032, 0.003, 0.0037);
  }
  local.assentar(pasto, 0.39, 0.14, -0.17);
  const jardim = maquete('Árvores da Casa Branca', 886);
  árvore(jardim, -0.052, -0.025, -0.015, 0.062);
  árvore(jardim, 0.067, 0.043, -0.015, 0.047, true);
  local.assentar(jardim, -0.25, 0.068);
  return local.grupo;
}

export function criarHyarastorni(_fase: string, terreno: ModeloTerreno, em: Pt, h: number) {
  const local = assentamento('Hyarastorni', terreno, em, h);
  const casa = maquete('Casa de Hallatan', 884);
  casa.bloco(arrimo, 0, 0, 0.312, 0.282, 0.045, -0.039);
  casa.bloco(piso, 0, -0.030, 0.299, 0.207, 0.004, 0.005);
  edifício(casa, ocre, terracota, 0, 0.071, 0.006, 0.25, 0.115, 0.065, 0, false);
  edifício(casa, tábuas, ardósia, -0.113, -0.037, 0.006, 0.133, 0.083, 0.047, Math.PI / 2, false);
  edifício(casa, cantaria, terracota, 0.116, -0.026, 0.006, 0.105, 0.068, 0.034, Math.PI / 2);
  const face = 0.012;
  casa.bloco(madeira, 0, face, 0.248, 0.004, 0.004, 0.035);
  casa.bloco(madeira, 0, face, 0.248, 0.004, 0.004, 0.064);
  for (const x of [-0.121, -0.081, -0.042, 0.042, 0.081, 0.121]) casa.bloco(madeira, x, face, 0.004, 0.004, 0.060, 0.007);
  for (const x of [-0.101, 0.101]) {
    escora(casa, x, face - 0.002, 0.010, 0.037, 0.023, x < 0 ? 0 : Math.PI);
    janela(casa, x, face - 0.001, 0.042, 0.012, 0.015, madeira);
  }
  for (const x of [-0.052, 0.052]) {
    coluna(casa, madeira, x, -0.024, 0.009, 0.007, 0.041);
    janela(casa, x, face - 0.001, 0.042, 0.012, 0.015, madeira);
  }
  casa.bloco(madeira, 0, face - 0.002, 0.039, 0.004, 0.029, 0.008);
  telhado(casa, terracota, 0, -0.011, 0.050, 0.118, 0.040, 0.013);
  for (const y of [-0.089, -0.039]) janela(casa, -0.070, y, 0.025, 0.011, 0.011, madeira, Math.PI / 2);
  casa.bloco(cantaria, 0.023, 0.092, 0.018, 0.019, 0.049, 0.075);
  casa.bloco(moldura, 0.023, 0.092, 0.022, 0.023, 0.004, 0.124);
  for (const lado of [-1, 1]) {
    casa.muro(arrimo, [lado * 0.142, -0.129], [lado * 0.029, -0.129], 0.006, 0.019, 0.010);
    casa.bloco(cantaria, lado * 0.029, -0.129, 0.013, 0.013, 0.023, 0.006);
  }
  carga(casa, -0.032, -0.092, 0.009);
  carga(casa, 0.054, -0.064, 0.009);
  árvore(casa, 0.143, 0.107, 0.005, 0.054);
  árvore(casa, -0.138, 0.104, 0.006, 0.042, true);
  local.assentar(casa, 0, 0, -0.04);

  const celeiro = maquete('Celeiros e muros de pastagem', 885);
  armazem(celeiro, 0, 0, 0.004, 0.19, 0.105);
  celeiro.muro(cantaria, [-0.13, -0.085], [-0.13, 0.108], -0.012, 0.018, 0.012);
  celeiro.muro(cantaria, [-0.13, 0.108], [0.16, 0.108], -0.012, 0.018, 0.012);
  celeiro.muro(cantaria, [0.16, 0.108], [0.177, -0.047], -0.012, 0.018, 0.012);
  for (const x of [-0.094, 0.054, 0.131]) carga(celeiro, x, 0.078, 0.002);
  for (const x of [-0.116, 0.144]) árvore(celeiro, x, -0.079, -0.010, 0.035, true);
  local.assentar(celeiro, -0.38, -0.19, 0.47);
  return local.grupo;
}

const sepulturas = [[0, 0, 0], [-0.33, 0.17, 0.28], [0.34, 0.22, -0.24], [-0.66, 0.40, 0.49], [0.67, 0.42, -0.46]];
const afloramento = new THREE.DodecahedronGeometry(1, 0);
afloramento.name = 'Estratos de rocha';

function paredaoNoirinan(terreno: ModeloTerreno, em: Pt, h: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(2.20, 0.93, 80, 40).translate(0, 0.36, 0);
  const p = geo.getAttribute('position'), cores: number[] = [];
  const ruido = new Noise(442);
  const rocha = new THREE.Color(0x999184), terra = new THREE.Color(0x81845e), cor = new THREE.Color();
  const { smoothstep } = THREE.MathUtils;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const recuo = y - Math.abs(x) * 0.59;
    const fratura = ruido.simplex(x * 7.1 + y * 2, y * 8.3);
    // Recuos locais deixam o vestíbulo aberto e se dissolvem no perfil da crista.
    let corte = 0;
    for (const [tx, ty, giro] of sepulturas) {
      const dx = x - tx, dy = y - ty;
      const lx = dx * Math.cos(giro) + dy * Math.sin(giro);
      const ly = -dx * Math.sin(giro) + dy * Math.cos(giro);
      corte = Math.max(corte, (1 - smoothstep(Math.abs(lx), 0.042, 0.109)) * (1 - smoothstep(ly, 0.036, 0.152)));
    }
    const pé = -0.051 + fratura * 0.018 + corte * 0.076;
    const encosta = smoothstep(recuo, pé, 0.13) * (1 - smoothstep(recuo, 0.20, 0.46))
      * (1 - smoothstep(Math.abs(x), 0.74, 1.08)) * (1 - smoothstep(y, 0.66, 0.82));
    const base = terreno.altura(em[0] + x, em[1] + y) - h - 0.014;
    const veio = ruido.simplex(x * 21, y * 9) * 0.009;
    const altura = 0.128 + fratura * 0.017 + veio + Math.cos(x * Math.PI) * 0.018;
    p.setZ(i, base + altura * encosta);
    cor.copy(terra).lerp(rocha, smoothstep(encosta, 0, 0.68)).multiplyScalar(0.90 + fratura * 0.16);
    cores.push(cor.r, cor.g, cor.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
  geo.computeVertexNormals();
  const revestimento = pedraEscura.clone();
  revestimento.color.setHex(0xffffff);
  revestimento.vertexColors = true;
  const paredao = new THREE.Mesh(geo, revestimento);
  paredao.name = 'Relevo';
  return paredao;
}

export function criarNoirinan(_fase: string, terreno: ModeloTerreno, em: Pt, h: number) {
  const local = assentamento('Noirinan', terreno, em, h);
  local.grupo.add(paredaoNoirinan(terreno, em, h));
  for (const [i, [x, y, giro]] of sepulturas.entries()) {
    const o = maquete(i === 0 ? 'Sepultura de Elros' : `Entrada funerária ${i}`, 442 + i);
    const s = i === 0 ? 1 : 0.72 + o.rand() * 0.13;
    for (const lado of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const w = (0.049 + o.rand() * 0.030) * s, h = (0.048 + o.rand() * 0.025) * s;
        o.peca(afloramento, pedraEscura, lado * (0.091 * s + k * 0.021), (0.004 + k * 0.026) * s,
          (0.029 + k * 0.009) * s, w, 0.075 * s, h, lado * (0.22 + o.rand() * 0.9));
      }
      o.bloco(arrimo, lado * 0.069 * s, -0.008 * s, 0.030 * s, 0.087 * s, 0.097 * s, 0.004);
    }
    o.bloco(pedraEscura, 0, 0.001 * s, 0.178 * s, 0.100 * s, 0.037 * s, 0.095 * s);
    o.bloco(sombra, 0, 0.035 * s, 0.102 * s, 0.008, 0.088 * s, 0.005);
    arcada(o, arrimo, 0, -0.019 * s, 0.008, 0.127 * s, 0.025 * s, 0.093 * s);
    arcada(o, cantaria, 0, -0.058 * s, 0.008, 0.156 * s, 0.023 * s, 0.107 * s);
    o.bloco(piso, 0, -0.008 * s, 0.126 * s, 0.119 * s, 0.009, -0.001);
    o.bloco(arrimo, 0, -0.060 * s, 0.182 * s, 0.040 * s, 0.012 * s, 0.110 * s);
    o.bloco(moldura, 0, -0.062 * s, 0.187 * s, 0.044 * s, 0.005 * s, 0.121 * s);
    degraus(o, 0, -0.149 * s, -0.017, 0.169 * s, 0.082 * s, 0.026, 7, 1);
    if (i === 0) {
      for (const lado of [-1, 1]) {
        coluna(o, cantaria, lado * 0.093, -0.059, 0.005, 0.016, 0.105);
        o.bloco(arrimo, lado * 0.098, -0.116, 0.020, 0.062, 0.018, -0.008);
      }
      o.bloco(bronze, 0, -0.084, 0.013, 0.003, 0.013, 0.109, Math.PI / 4);
    }
    local.assentar(o, x, y, giro);
  }
  return local.grupo;
}
