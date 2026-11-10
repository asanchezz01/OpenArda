// Reconstrução artística de Nargothrond: volumes em km, Z para cima. Coordenadas locais: X rio abaixo
// ao longo do Narog, Y para a margem leste; o grupo "Giro" alinha X ao traçado do atlas.
// Descrito (O Silmarillion, cap. 13 e 21): cavernas escavadas por Finrod sob as colinas de Taur-en-Faroth,
// na margem oeste do Narog, com as portas voltadas para o rio; a grande ponte construída a conselho de
// Túrin diante das Portas de Felagund; Glaurung, que entra pela ponte, junta o tesouro no salão mais
// fundo e se deita sobre ele. Artísticos: forma da garganta, planta e número dos salões, portas,
// terraço e escada (fotografia nargothrond-pe400), forma do dragão e o corte que abre um setor da colina.
import * as THREE from 'three';
import { GIRO_NARGOTHROND, type FaseNargothrond } from '../core/detalhes';
import { cilindro, cone, copa, material, oficina } from './oficina';

const RAIO_BASE = 0.72;
/** O Narog: eixo em y e largura; penhasco oeste (Taur-en-Faroth) e barranco leste. */
export const RIO = { y: 0.2, largura: 0.06 };
export const PENHASCO = { y: 0.16, h: 0.085 };
export const LESTE = { y: 0.24, h: 0.025 };
/** Terraço diante das portas, na altura do barranco leste: a ponte sai dele em nível. */
export const TERRACO = 0.025;
/** Setor aberto pelo corte, rio abaixo das portas, e altura do teto dos salões. */
export const CORTE = { x0: 0.04, x1: 0.34, y0: -0.3, y1: PENHASCO.y, teto: 0.03 };

interface Ret { x0: number; x1: number; y0: number; y1: number }
/** Salões abertos pelo corte. */
export const SALOES = {
  trono: { x0: 0.12, x1: 0.22, y0: -0.22, y1: -0.02 },
  tesouro: { x0: 0.26, x1: 0.32, y0: -0.14, y1: -0.07 },
};
/** Corredores; uma parede fina de rocha os separa dos salões. O primeiro vem das portas. */
const CORREDORES: Ret[] = [
  { x0: 0.046, x1: 0.3, y0: 0.053, y1: 0.067 },
  { x0: 0.163, x1: 0.177, y0: -0.017, y1: 0.05 },
  { x0: 0.283, x1: 0.297, y0: -0.067, y1: 0.05 },
];

const dentro = (x: number, y: number, r: Ret, folga = 0) => x > r.x0 - folga && x < r.x1 + folga && y > r.y0 - folga && y < r.y1 + folga;
const centro = (r: Ret): [number, number] => [(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2];
const escavado = (x: number, y: number) => [...Object.values(SALOES), ...CORREDORES].some((r) => dentro(x, y, r));

/** Monte de ouro no salão do trono: semieixos e altura do topo. */
const MONTE = { a: 0.034, b: 0.07, h: 0.012 };
function alturaMonte(dx: number, dy: number) {
  const q = 1 - (dx / MONTE.a) ** 2 - (dy / MONTE.b) ** 2;
  return q > 0 ? MONTE.h * Math.sqrt(q) : 0;
}

/** Converte coordenadas locais do modelo para o deslocamento no atlas (km), a partir do centro do sítio. */
export function paraAtlas(x: number, y: number): [number, number] {
  const c = Math.cos(GIRO_NARGOTHROND), s = Math.sin(GIRO_NARGOTHROND);
  return [x * c - y * s, x * s + y * c];
}

export function criarNargothrond(fase: FaseNargothrond): THREE.Group {
  const acesa = fase === 'integra' || fase === 'ponte';
  const ruina = !acesa;
  const cidade = new THREE.Group();
  cidade.name = `Nargothrond: ${fase}`;
  const giro = new THREE.Group();
  giro.name = 'Giro';
  giro.rotation.z = GIRO_NARGOTHROND;
  cidade.add(giro);
  const o = oficina(1102);
  const { peca, bloco, rand } = o;
  const relva = material(0x4f6a3a);
  const rocha = material(0x6d6a5e);
  const musgo = material(0x55683f);
  const corte = material(0x5b5148);
  const paredes = material(0xc4bdac);
  const pedra = material(0xb3ad9d);
  const entalhe = material(0xa29c8a);
  const marmore = material(0xe6e1d6);
  const ouro = material(0xd9b24c, { metalness: 0.7, roughness: 0.35 });
  const prata = material(0xd8dde2, { metalness: 0.8, roughness: 0.25 });
  const luz = acesa ? material(0xffd27a, { emissive: 0xffb84a, emissiveIntensity: 1.1 }) : material(0x6b5a35, { metalness: 0.5 });
  const madeira = material(0x5a3e2a);
  const sombra = material(0x1f2226);
  const agua = material(0x3f6a6c, { roughness: 0.2 });
  const espuma = material(0xe4ece9);
  const piso = material(0x8f8574);
  const dragao = material(0x6f5a2c, { metalness: 0.35, roughness: 0.55 });
  const ventre = material(0xa48a46, { metalness: 0.3, roughness: 0.6 });
  const tronco = material(0x5c4a38);
  const pinhos = [material(0x2f4a2e), material(0x3a5532), material(0x284026)];
  const folhas = [material(0x4c6e33), material(0x5d7d3a)];

  // Base em talude sob o vale, esticada com o exagero do relevo.
  const base = new THREE.Mesh(new THREE.CylinderGeometry(RAIO_BASE + 0.02, 1.5, 0.8, 64).rotateX(Math.PI / 2).translate(0, 0, -0.4), relva);
  base.name = 'Base';
  cidade.add(base);

  const R = RAIO_BASE - 0.01;
  const arco = (forma: THREE.Shape | THREE.Path, a0: number, a1: number, n = 40) => {
    for (let k = 1; k <= n; k++) forma.lineTo(Math.cos(a0 + ((a1 - a0) * k) / n) * R, Math.sin(a0 + ((a1 - a0) * k) / n) * R);
  };

  // O maciço de Taur-en-Faroth: penhasco reto sobre o rio, com o setor do corte recortado.
  {
    const a0 = Math.asin(PENHASCO.y / R);
    const f = new THREE.Shape();
    f.moveTo(-Math.cos(a0) * R, PENHASCO.y);
    f.lineTo(CORTE.x0, CORTE.y1);
    f.lineTo(CORTE.x0, CORTE.y0);
    f.lineTo(CORTE.x1, CORTE.y0);
    f.lineTo(CORTE.x1, CORTE.y1);
    f.lineTo(Math.cos(a0) * R, PENHASCO.y);
    arco(f, a0, -Math.PI - a0);
    const macico = new THREE.Mesh(new THREE.ExtrudeGeometry(f, { depth: PENHASCO.h, bevelEnabled: false, curveSegments: 1 }), [musgo, rocha]);
    macico.name = 'Taur-en-Faroth';
    giro.add(macico);
    // as paredes do corte, acima do teto, com a cor da rocha cortada
    const hc = PENHASCO.h - CORTE.teto - 0.0005;
    bloco(corte, CORTE.x0 + 0.0005, (CORTE.y0 + CORTE.y1) / 2, 0.001, CORTE.y1 - CORTE.y0, hc, CORTE.teto);
    bloco(corte, CORTE.x1 - 0.0005, (CORTE.y0 + CORTE.y1) / 2, 0.001, CORTE.y1 - CORTE.y0, hc, CORTE.teto);
    bloco(corte, (CORTE.x0 + CORTE.x1) / 2, CORTE.y0 + 0.0005, CORTE.x1 - CORTE.x0, 0.001, hc, CORTE.teto);
  }

  // O barranco leste, mais baixo, na altura do terraço.
  {
    const a0 = Math.asin(LESTE.y / R);
    const f = new THREE.Shape();
    f.moveTo(Math.cos(a0) * R, LESTE.y);
    arco(f, a0, Math.PI - a0);
    f.lineTo(Math.cos(a0) * R, LESTE.y);
    const barranco = new THREE.Mesh(new THREE.ExtrudeGeometry(f, { depth: LESTE.h, bevelEnabled: false, curveSegments: 1 }), [relva, rocha]);
    barranco.name = 'Margem leste';
    giro.add(barranco);
  }

  // O corte: laje na altura do teto com os salões e corredores vazados.
  {
    const laje = new THREE.Shape([new THREE.Vector2(CORTE.x0, CORTE.y0), new THREE.Vector2(CORTE.x1, CORTE.y0), new THREE.Vector2(CORTE.x1, CORTE.y1), new THREE.Vector2(CORTE.x0, CORTE.y1)]);
    for (const r of [...Object.values(SALOES), ...CORREDORES])
      laje.holes.push(new THREE.Path([new THREE.Vector2(r.x0, r.y0), new THREE.Vector2(r.x0, r.y1), new THREE.Vector2(r.x1, r.y1), new THREE.Vector2(r.x1, r.y0)]));
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(laje, { depth: CORTE.teto, bevelEnabled: false, curveSegments: 1 }), [corte, paredes]);
    m.name = 'Corte';
    giro.add(m);
    for (const r of [...Object.values(SALOES), ...CORREDORES]) bloco(piso, ...centro(r), r.x1 - r.x0, r.y1 - r.y0, 0.0006);
  }

  /** Pilar de pedra com capitel e, enquanto a cidade vive, uma lanterna. */
  const pilar = (x: number, y: number, tombado: boolean) => {
    const h = CORTE.teto - 0.001;
    if (tombado) return bloco(pedra, x, y, h * 0.8, 0.0042, 0.0042, 0.0006, rand() * Math.PI);
    peca(cilindro, pedra, x, y, h / 2, 0.0024, 0.0024, h);
    bloco(entalhe, x, y, 0.0068, 0.0068, 0.0025, h - 0.0025);
    bloco(entalhe, x, y, 0.006, 0.006, 0.0015, 0.0006);
    peca(copa, luz, x + 0.0035, y, h * 0.6, 0.0013, 0.0013, 0.0017);
  };

  // O salão do trono de Finrod: duas fileiras de pilares e o estrado no fundo, voltado para as portas.
  const trono = SALOES.trono, [tx, ty] = centro(trono);
  for (let y = trono.y0 + 0.022; y < trono.y1 - 0.008; y += 0.018)
    for (const dx of [-0.03, 0.03]) pilar(tx + dx, y, ruina && rand() < 0.3);
  bloco(marmore, tx, trono.y0 + 0.012, 0.036, 0.018, 0.002);
  if (acesa) {
    bloco(prata, tx, trono.y0 + 0.011, 0.007, 0.005, 0.004, 0.002);
    bloco(prata, tx, trono.y0 + 0.0085, 0.007, 0.0012, 0.01, 0.002);
  } else bloco(prata, tx + 0.012, trono.y0 + 0.024, 0.007, 0.005, 0.003, 0.0006, 0.9); // trono derrubado

  // A câmara do tesouro: arcas cheias até o saque; depois, vazia.
  const tes = SALOES.tesouro, [cx, cy] = centro(tes);
  if (acesa) {
    for (let k = 0; k < 6; k++) {
      const x = cx + ((k % 2) - 0.5) * 0.024, y = cy + (Math.floor(k / 2) - 1) * 0.02;
      bloco(madeira, x, y, 0.009, 0.006, 0.004, 0.0006);
      bloco(ouro, x, y, 0.0094, 0.0064, 0.0008, 0.0046);
    }
    peca(copa, luz, cx, cy, 0.018, 0.0016, 0.0016, 0.002);
  } else for (let k = 0; k < 3; k++) bloco(madeira, cx + (rand() - 0.5) * 0.04, cy + (rand() - 0.5) * 0.05, 0.009, 0.006, 0.003, 0.0006, rand() * 3); // arcas vazias, viradas

  // Lanternas ao longo dos corredores.
  if (acesa)
    for (const r of CORREDORES) {
      const longo = r.x1 - r.x0 > r.y1 - r.y0;
      for (let s = 0.01; s < (longo ? r.x1 - r.x0 : r.y1 - r.y0); s += 0.022)
        peca(copa, luz, longo ? r.x0 + s : (r.x0 + r.x1) / 2, longo ? (r.y0 + r.y1) / 2 : r.y0 + s, 0.016, 0.0012, 0.0012, 0.0016);
    }

  // Glaurung reúne o tesouro no salão mais fundo e se deita sobre ele.
  if (fase === 'glaurung') {
    const mx = tx, my = ty - 0.02;
    peca(copa, ouro, mx, my, 0, MONTE.a, MONTE.b, MONTE.h);
    for (let k = 0; k < 36; k++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 0.85;
      const dx = Math.cos(a) * MONTE.a * r, dy = Math.sin(a) * MONTE.b * r;
      peca(copa, rand() < 0.15 ? prata : ouro, mx + dx, my + dy, alturaMonte(dx, dy), 0.003 + rand() * 0.004, 0.003 + rand() * 0.004, 0.0015 + rand() * 0.0015);
    }
    for (let k = 0; k < 40; k++) {
      const a = rand() * Math.PI * 2, r = 0.7 + rand() * 0.45;
      const x = mx + Math.cos(a) * MONTE.a * r, y = my + Math.sin(a) * MONTE.b * r;
      if (dentro(x, y, trono, -0.003)) peca(copa, rand() < 0.2 ? prata : ouro, x, y, 0.0008, 0.002 + rand() * 0.002, 0.002 + rand() * 0.002, 0.0015);
    }
    // o corpo em S sobre o monte, da cauda (fundo do salão) à cabeça, voltada para os corredores e as portas
    const trajeto = new THREE.CatmullRomCurve3(
      [[0.016, -0.065], [0.022, -0.045], [0.012, -0.025], [-0.012, -0.015], [-0.018, 0.005], [-0.006, 0.022], [0.012, 0.03], [0.016, 0.048], [0.006, 0.066], [0.0, 0.084]].map(([x, y]) => new THREE.Vector3(mx + x, my + y, 0)),
    );
    const pts = trajeto.getSpacedPoints(44);
    const grossura = (s: number) => (s < 0.55 ? 0.0015 + 0.0065 * (s / 0.55) ** 0.8 : s < 0.82 ? 0.008 - ((s - 0.55) / 0.27) * 0.0045 : 0.0035);
    let ang = 0, z = 0;
    pts.forEach((q, k) => {
      const s = k / (pts.length - 1), g = grossura(s);
      const prox = pts[Math.min(k + 1, pts.length - 1)], ant = pts[Math.max(k - 1, 0)];
      ang = Math.atan2(prox.y - ant.y, prox.x - ant.x);
      z = alturaMonte(q.x - mx, q.y - my) + g * 0.55;
      peca(copa, dragao, q.x, q.y, z, 0.0042, g, g * 0.75, ang);
      peca(copa, ventre, q.x, q.y, z - g * 0.3, 0.0038, g * 0.85, g * 0.42, ang);
      if (k % 2 === 0 && s < 0.85) peca(cone, ventre, q.x, q.y, z + g * 0.75, 0.0007 + g * 0.08, 0.0007 + g * 0.08, 0.0012 + g * 0.3);
      // quatro patas, sem asas
      if (k === Math.round(44 * 0.42) || k === Math.round(44 * 0.68))
        for (const lado of [-1, 1]) {
          const [lx, ly] = o.giro(ang, 0.001, lado * g * 1.15);
          bloco(dragao, q.x + lx, q.y + ly, 0.0042, 0.0036, z * 0.8, 0, ang);
          const [px, py] = o.giro(ang, 0.003, lado * g * 1.35);
          peca(copa, ventre, q.x + px, q.y + py, 0.0008, 0.0036, 0.0024, 0.0012, ang);
        }
    });
    // cabeça, focinho, olhos e chifres
    const fim = pts[pts.length - 1];
    const frente = (d: number, lado = 0): [number, number] => {
      const [a, b] = o.giro(ang, d, lado);
      return [fim.x + a, fim.y + b];
    };
    peca(copa, dragao, ...frente(0.005), z + 0.0016, 0.0085, 0.0062, 0.0046, ang);
    peca(copa, dragao, ...frente(0.0125), z + 0.0006, 0.0072, 0.0042, 0.003, ang);
    peca(copa, ventre, ...frente(0.011), z - 0.0012, 0.0066, 0.0036, 0.0015, ang);
    for (const lado of [-1, 1]) {
      peca(copa, ouro, ...frente(0.008, lado * 0.0044), z + 0.003, 0.0014, 0.0011, 0.001, ang);
      peca(cone, ventre, ...frente(0.0008, lado * 0.0036), z + 0.0068, 0.001, 0.001, 0.006);
    }
  }

  // Escombros depois do saque.
  if (ruina)
    for (let k = 0; k < 60; k++) {
      const x = CORTE.x0 + rand() * (CORTE.x1 - CORTE.x0), y = CORTE.y0 + rand() * (CORTE.y1 - CORTE.y0), s = rand();
      if (escavado(x, y) && !(fase === 'glaurung' && alturaMonte(x - tx, y - ty + 0.02) > 0)) peca(copa, rocha, x, y, 0.001, 0.002 + s * 0.003, 0.002 + s * 0.003, 0.0015 + s * 0.002);
    }

  // As Portas de Felagund: fachada aparelhada no penhasco, terraço sobre o rio e escada até a água.
  {
    const yf = PENHASCO.y;
    bloco(rocha, 0, yf + 0.008, 0.075, 0.016, TERRACO, 0); // contraforte de rocha sob o terraço
    bloco(pedra, 0, yf + 0.008, 0.075, 0.016, 0.0015, TERRACO);
    bloco(entalhe, 0, yf + 0.001, 0.05, 0.002, 0.042, TERRACO); // fachada
    bloco(entalhe, 0, yf + 0.0025, 0.058, 0.004, 0.004, TERRACO + 0.034); // cornija
    bloco(entalhe, 0, yf + 0.0035, 0.044, 0.003, 0.003, TERRACO + 0.027); // lintel
    for (const x of [-0.019, -0.0095, 0.0095, 0.019]) bloco(pedra, x, yf + 0.003, 0.0045, 0.004, 0.027, TERRACO + 0.0015);
    if (ruina) {
      bloco(sombra, 0, yf + 0.0022, 0.014, 0.0008, 0.024, TERRACO + 0.0015);
      bloco(madeira, 0.006, yf + 0.011, 0.007, 0.0015, 0.0012, TERRACO + 0.0015, 0.4);
      bloco(madeira, -0.008, yf + 0.009, 0.007, 0.0015, 0.0012, TERRACO + 0.0015, -0.3);
    } else for (const x of [-0.0036, 0.0036]) bloco(madeira, x, yf + 0.0022, 0.0068, 0.0008, 0.024, TERRACO + 0.0015);
    // escada rio acima, do terraço até a água
    for (let k = 0; k < 10; k++) bloco(pedra, -0.04 - k * 0.005, yf + 0.008, 0.005, 0.012, TERRACO - (k + 1) * 0.0024, 0);
  }

  // A grande ponte de Túrin, das portas à margem leste.
  if (fase !== 'integra') {
    const meia = (LESTE.y - PENHASCO.y) / 2, yc = (LESTE.y + PENHASCO.y) / 2;
    const arcoPonte = new THREE.TorusGeometry(1, 0.25, 8, 24, Math.PI).rotateX(Math.PI / 2);
    peca(arcoPonte, pedra, 0, yc, 0, meia * 0.9, 0.04, TERRACO - 0.002, Math.PI / 2);
    bloco(pedra, 0, yc, 0.013, meia * 2 + 0.01, 0.002, TERRACO - 0.0005);
    for (const x of [-0.006, 0.006]) bloco(pedra, x, yc, 0.001, meia * 2 + 0.01, 0.0025, TERRACO + 0.0015);
    // caminho calçado na margem leste
    for (let y = LESTE.y + 0.006; y < 0.5; y += 0.01) bloco(pedra, 0, y, 0.01, 0.0095, 0.0008, LESTE.h);
  }

  // O Narog na garganta: água, espuma junto ao contraforte e pedras nas margens.
  for (let x = -R; x < R; x += 0.02) {
    if (Math.hypot(x, RIO.y) > R) continue;
    bloco(agua, x, RIO.y, 0.0205, LESTE.y - PENHASCO.y, 0.0005);
    for (const lado of [-1, 1]) {
      const s = rand();
      if (s < 0.6) peca(copa, s < 0.25 ? musgo : rocha, x + rand() * 0.02, RIO.y + lado * (RIO.largura / 2 + 0.006 + rand() * 0.006), 0.002, 0.004 + s * 0.006, 0.003 + s * 0.004, 0.003 + s * 0.004);
    }
  }
  for (let k = 0; k < 14; k++) peca(copa, espuma, 0.02 + rand() * 0.07, PENHASCO.y + 0.018 + rand() * 0.02, 0.0006, 0.004 + rand() * 0.005, 0.002 + rand() * 0.003, 0.0008);

  // Saliências de rocha e musgo nas faces dos penhascos.
  for (let k = 0; k < 120; k++) {
    const oeste = k < 80, x = (rand() * 2 - 1) * (R - 0.06), s = rand();
    if (oeste && x > -0.09 && x < 0.04) continue; // portas, terraço e escada
    if (oeste && x > CORTE.x0 - 0.005 && x < CORTE.x1 + 0.005) continue;
    const y = oeste ? PENHASCO.y : LESTE.y, h = oeste ? PENHASCO.h : LESTE.h;
    if (!oeste && Math.abs(x) < 0.012) continue;
    peca(copa, s < 0.3 ? musgo : rocha, x, y, rand() * h, 0.006 + s * 0.008, 0.003 + s * 0.003, 0.005 + s * 0.008);
  }

  // A floresta de Taur-en-Faroth e da margem leste: pinheiros e algumas árvores de folha.
  for (let k = 0; k < 1100; k++) {
    const r = Math.sqrt(rand()) * (R - 0.015), a = rand() * Math.PI * 2, s = 0.02 + rand() * 0.016, cor = rand();
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    let z: number;
    if (y < PENHASCO.y - 0.01) {
      if (dentro(x, y, CORTE, 0.012)) continue;
      z = PENHASCO.h;
    } else if (y > LESTE.y + 0.01) {
      if (Math.abs(x) < 0.014 && fase !== 'integra') continue;
      z = LESTE.h;
    } else continue;
    if (cor < 0.8) {
      peca(cilindro, tronco, x, y, z + s * 0.3, s * 0.045, s * 0.045, s * 0.6);
      const f = pinhos[Math.floor(cor * 3.75) % 3];
      peca(cone, f, x, y, z + s * 0.62, s * 0.3, s * 0.3, s * 0.7);
      peca(cone, f, x, y, z + s * 0.98, s * 0.2, s * 0.2, s * 0.5);
    } else {
      peca(cilindro, tronco, x, y, z + s * 0.35, s * 0.05, s * 0.05, s * 0.7);
      peca(copa, folhas[k % 2], x, y, z + s * 0.92, s * 0.4, s * 0.4, s * 0.32);
    }
  }

  o.finalizar(giro);
  return cidade;
}
