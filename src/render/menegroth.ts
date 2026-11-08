// Reconstrução artística de Menegroth, as Mil Cavernas: volumes em km, Z para cima, X para leste, Y para norte.
// Descrito (O Silmarillion, cap. 10): salões escavados numa colina rochosa na floresta, junto ao Esgalduin,
// com uma única ponte de pedra até as portas; pilares esculpidos à semelhança das faias de Oromë, com
// tronco, galhos e folhas, iluminados por lanternas de ouro; fontes de prata, bacias de mármore e pisos
// de pedras de muitas cores. Artísticos: forma da colina, planta dos salões, portal (fotografia
// menegroth-pe400) e o corte permanente que abre um setor da colina para mostrar o interior.
import * as THREE from 'three';
import type { FaseMenegroth } from '../core/detalhes';
import { cilindro, copa, material, oficina } from './oficina';

/** O Esgalduin no modelo: vértice da curva do traçado do atlas e as direções rio acima e rio abaixo. */
export const RIO = { curva: [-0.3, 0.42] as [number, number], acima: [0.625, 0.781] as [number, number], abaixo: [-0.832, -0.555] as [number, number], largura: 0.04 };
const RAIO_BASE = 0.72;
/** A colina: raio na base, borda do topo e altura. */
export const COLINA = { r: 0.3, topo: 0.17, h: 0.072 };
/** Setor aberto pelo corte (graus, a partir do leste, sentido anti-horário) e altura do corte horizontal. */
export const CORTE = { de: -20, ate: 60, teto: 0.026 };
/** Portas voltadas para a curva do rio. */
export const PORTAO = Math.atan2(RIO.curva[1], RIO.curva[0]);

export function alturaColina(r: number): number {
  if (r <= COLINA.topo) return COLINA.h;
  if (r >= COLINA.r) return 0;
  return COLINA.h * Math.pow(0.5 * (1 + Math.cos((Math.PI * (r - COLINA.topo)) / (COLINA.r - COLINA.topo))), 0.6);
}

const grau = Math.PI / 180;
const noCorte = (x: number, y: number, folga = 0) => {
  const a = Math.atan2(y, x) / grau;
  return a > CORTE.de - folga && a < CORTE.ate + folga;
};
const polar = (r: number, a: number): [number, number] => [r * Math.cos(a * grau), r * Math.sin(a * grau)];

/** Salões abertos pelo corte: centro polar (r, graus), comprimento radial e largura. */
export const SALOES = {
  trono: { r: 0.165, a: 20, comp: 0.1, larg: 0.062 },
  fonte: { r: 0.235, a: 44, comp: 0.044, larg: 0.044 },
  tesouro: { r: 0.232, a: -4, comp: 0.04, larg: 0.04 },
};
/** Corredores radiais (graus, de r0 a r1, largura); separados dos salões por uma parede fina de rocha. */
const CORREDORES = [
  { a: 20, r0: 0.05, r1: 0.112, larg: 0.014 },
  { a: 44, r0: 0.07, r1: 0.21, larg: 0.012 },
  { a: -4, r0: 0.07, r1: 0.209, larg: 0.012 },
];

function dentroSalao(x: number, y: number, s: { r: number; a: number; comp: number; larg: number }, folga = 0) {
  const [cx, cy] = polar(s.r, s.a);
  const c = Math.cos(s.a * grau), n = Math.sin(s.a * grau);
  const u = (x - cx) * c + (y - cy) * n, v = -(x - cx) * n + (y - cy) * c;
  return Math.abs(u) < s.comp / 2 + folga && Math.abs(v) < s.larg / 2 + folga;
}
const corredorComoSalao = (k: (typeof CORREDORES)[number]) => ({ r: (k.r0 + k.r1) / 2, a: k.a, comp: k.r1 - k.r0, larg: k.larg });
const noCorredor = (x: number, y: number) => CORREDORES.some((k) => dentroSalao(x, y, corredorComoSalao(k)));
/** Raio em que a encosta desce abaixo do teto dos salões: até ali o corte é uma laje plana. */
const R_LAJE = (() => {
  let r = COLINA.topo;
  while (alturaColina(r) > CORTE.teto) r += 0.0005;
  return r;
})();
const escavado = (x: number, y: number) => Object.values(SALOES).some((s) => dentroSalao(x, y, s)) || noCorredor(x, y);

/** Distância de um ponto ao Esgalduin do modelo (as duas pernas a partir da curva). */
export function distanciaRio(x: number, y: number): number {
  let d = Infinity;
  for (const dir of [RIO.acima, RIO.abaixo]) {
    const t = Math.max(0, (x - RIO.curva[0]) * dir[0] + (y - RIO.curva[1]) * dir[1]);
    d = Math.min(d, Math.hypot(x - RIO.curva[0] - dir[0] * t, y - RIO.curva[1] - dir[1] * t));
  }
  return d;
}

export function criarMenegroth(fase: FaseMenegroth): THREE.Group {
  const acesa = fase === 'integra';
  const ruina = fase === 'destruida';
  const cidade = new THREE.Group();
  cidade.name = `Menegroth: ${fase}`;
  const o = oficina(1050);
  const { peca, bloco, rand } = o;
  const relva = material(0x51703a);
  const rocha = material(0x626b55);
  const musgo = material(0x5f7446);
  const corte = material(0x5b5148, { side: THREE.DoubleSide });
  const pedra = material(0xb9b4a5);
  const entalhe = material(0xa7ad97);
  const marmore = material(0xe9e5dc);
  const prata = material(0xd8dde2, { metalness: 0.8, roughness: 0.25 });
  const ouro = material(0xd9b24c, { metalness: 0.7, roughness: 0.35 });
  const luz = acesa ? material(0xffd27a, { emissive: 0xffb84a, emissiveIntensity: 1.1 }) : material(0x6b5a35, { metalness: 0.5 });
  const madeira = material(0x5a4632);
  const sombra = material(0x22262a);
  const agua = material(0x4f7f86, { roughness: 0.25 });
  const casca = material(0x9c9a90);
  const folhas = [material(0x4c6e33), material(0x5d7d3a), material(0x3f5e2c)];
  const pisos = [material(0xb08d57), material(0x6f8f8a), material(0xd3cbb9), material(0x7a5c6e)];

  // Base em talude sob a floresta, esticada com o exagero do relevo.
  const base = new THREE.Mesh(new THREE.CylinderGeometry(RAIO_BASE + 0.02, 1.5, 0.8, 64).rotateX(Math.PI / 2).translate(0, 0, -0.4), relva);
  base.name = 'Base';
  cidade.add(base);

  // A colina rochosa, por revolução do perfil, sem o setor do corte; as faces do corte fecham a seção.
  const perfil: THREE.Vector2[] = [];
  for (let k = 0; k <= 32; k++) {
    const r = (COLINA.r + 0.01) * (1 - k / 32);
    perfil.push(new THREE.Vector2(r, alturaColina(r)));
  }
  // na LatheGeometry girada, o ângulo phi corresponde ao ângulo (phi - 90°) no plano XY
  const aberto = CORTE.ate - CORTE.de;
  const colina = new THREE.Mesh(new THREE.LatheGeometry(perfil, 60, (CORTE.ate + 90) * grau, (360 - aberto) * grau).rotateX(Math.PI / 2), rocha);
  colina.name = 'Colina';
  cidade.add(colina);
  // Faces da seção acima do teto dos salões (abaixo dele, a laje do corte fecha o setor).
  const secao = new THREE.Shape([new THREE.Vector2(0, CORTE.teto), new THREE.Vector2(R_LAJE, CORTE.teto), ...perfil.filter((q) => q.x < R_LAJE).map((q) => new THREE.Vector2(q.x, q.y))]);
  for (const a of [CORTE.de, CORTE.ate]) {
    const c = Math.cos(a * grau), s = Math.sin(a * grau);
    const face = new THREE.ShapeGeometry(secao).applyMatrix4(new THREE.Matrix4().set(c, 0, -s, 0, s, 0, c, 0, 0, 1, 0, 0, 0, 0, 0, 1));
    cidade.add(new THREE.Mesh(face, corte));
  }
  // Topo musgoso fora do corte.
  peca(cilindro, musgo, 0, 0, COLINA.h + 0.0004, COLINA.topo * 0.98, COLINA.topo * 0.98, 0.0008);

  // O corte: a rocha do setor é uma laje cortada na altura do teto, com os salões e corredores vazados;
  // as paredes dos furos são as paredes escavadas. Além da laje, a encosta segue o perfil da colina.
  const laje = new THREE.Shape();
  for (let k = 0; k <= 24; k++) {
    const [x, y] = polar(R_LAJE, CORTE.de + (aberto * k) / 24);
    if (k === 0) laje.moveTo(x, y);
    else laje.lineTo(x, y);
  }
  for (let k = 24; k >= 0; k--) laje.lineTo(...polar(0.035, CORTE.de + (aberto * k) / 24));
  for (const s of [...Object.values(SALOES), ...CORREDORES.map(corredorComoSalao)]) {
    const c = Math.cos(s.a * grau), n = Math.sin(s.a * grau), [cx, cy] = polar(s.r, s.a);
    laje.holes.push(new THREE.Path([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => new THREE.Vector2(cx + (u * s.comp * c) / 2 - (v * s.larg * n) / 2, cy + (u * s.comp * n) / 2 + (v * s.larg * c) / 2))));
  }
  const paredes = material(0xc9c3b2);
  const corteLaje = new THREE.Mesh(new THREE.ExtrudeGeometry(laje, { depth: CORTE.teto, bevelEnabled: false, curveSegments: 1 }), [corte, paredes]);
  corteLaje.name = 'Corte';
  cidade.add(corteLaje);
  const borda = perfil.filter((q) => q.x >= R_LAJE);
  cidade.add(new THREE.Mesh(new THREE.LatheGeometry([...borda, new THREE.Vector2(R_LAJE, CORTE.teto)], 16, (CORTE.de + 90) * grau, aberto * grau).rotateX(Math.PI / 2), rocha));

  // Pisos de pedras de muitas cores nos salões; pedra lisa nos corredores.
  for (let i = -COLINA.r; i <= COLINA.r; i += 0.006)
    for (let j = -COLINA.r; j <= COLINA.r; j += 0.006) {
      const x = i + 0.003, y = j + 0.003;
      if (!noCorte(x, y) || !escavado(x, y)) continue;
      const k = Math.round(i / 0.006) + Math.round(j / 0.006);
      if (Object.values(SALOES).some((s) => dentroSalao(x, y, s))) bloco(pisos[((k % 4) + 4) % 4], x, y, 0.006, 0.006, 0.0006);
      else if (noCorredor(x, y)) bloco(pedra, x, y, 0.006, 0.006, 0.0006);
    }

  /** Pilar em forma de faia: tronco, galhos e folhas esculpidos, com uma lanterna de ouro. */
  const pilar = (x: number, y: number, h: number, tombado = false) => {
    if (tombado) {
      bloco(pedra, x, y, h * 0.8, 0.004, 0.004, 0.0006, rand() * Math.PI);
      return;
    }
    peca(cilindro, pedra, x, y, h / 2, 0.0022, 0.0022, h);
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + 0.4;
      peca(copa, entalhe, x + Math.cos(a) * 0.004, y + Math.sin(a) * 0.004, h - 0.003, 0.0045, 0.0045, 0.0025);
    }
    peca(copa, entalhe, x, y, h - 0.001, 0.005, 0.005, 0.002);
    if (fase !== 'destruida') peca(copa, luz, x + 0.0035, y, h * 0.62, 0.0014, 0.0014, 0.0018);
  };

  // Salão do trono de Thingol e Melian: duas fileiras de pilares-faia, estrado e tronos no fundo.
  {
    const s = SALOES.trono, c = Math.cos(s.a * grau), n = Math.sin(s.a * grau);
    const em = (u: number, v: number): [number, number] => {
      const [cx, cy] = polar(s.r, s.a);
      return [cx + u * c - v * n, cy + u * n + v * c];
    };
    for (let u = -s.comp / 2 + 0.01; u < s.comp / 2 - 0.006; u += 0.015)
      for (const v of [-0.019, 0.019]) {
        const [x, y] = em(u, v);
        pilar(x, y, CORTE.teto - 0.001, ruina && rand() < 0.35);
      }
    const [dx, dy] = em(-s.comp / 2 + 0.012, 0);
    bloco(marmore, dx, dy, 0.016, 0.03, 0.002, 0, s.a * grau);
    if (fase === 'integra')
      for (const [v, m] of [[-0.006, ouro], [0.006, prata]] as const) {
        const [tx, ty] = em(-s.comp / 2 + 0.01, v);
        bloco(m, tx, ty, 0.005, 0.005, 0.004, 0.002, s.a * grau);
        const [bx, by] = em(-s.comp / 2 + 0.0075, v);
        bloco(m, bx, by, 0.0012, 0.005, 0.009, 0.002, s.a * grau);
      }
    else bloco(ouro, ...em(-s.comp / 2 + 0.02, 0.011), 0.005, 0.005, 0.003, 0.0006, 1.1); // trono derrubado
  }

  // Salão da fonte: bacia de mármore e fonte de prata, com pilares nos cantos.
  {
    const s = SALOES.fonte, [cx, cy] = polar(s.r, s.a);
    peca(cilindro, marmore, cx, cy, 0.0015, 0.012, 0.012, 0.003);
    peca(cilindro, ruina ? pedra : agua, cx, cy, 0.0031, 0.0105, 0.0105, 0.0004);
    peca(cilindro, prata, cx, cy, 0.006, 0.0014, 0.0014, 0.012);
    peca(cilindro, prata, cx, cy, 0.0115, 0.005, 0.005, 0.0008);
    for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const [x, y] = o.giro(s.a * grau, u * 0.016, v * 0.016);
      pilar(cx + x, cy + y, CORTE.teto - 0.001, ruina && u > 0 && v > 0);
    }
  }

  // Câmara do tesouro: arcas e o brilho do ouro, levado no saque.
  {
    const s = SALOES.tesouro, [cx, cy] = polar(s.r, s.a);
    if (fase === 'integra')
      for (let k = 0; k < 6; k++) {
        const [x, y] = o.giro(s.a * grau, ((k % 3) - 1) * 0.011, (Math.floor(k / 3) - 0.5) * 0.016);
        bloco(madeira, cx + x, cy + y, 0.007, 0.005, 0.004, 0.0006, s.a * grau);
        bloco(ouro, cx + x, cy + y, 0.0074, 0.0054, 0.0008, 0.0046, s.a * grau);
      }
    peca(copa, luz, cx, cy, 0.016, 0.0016, 0.0016, 0.002);
  }

  // Lanternas ao longo dos corredores.
  if (fase !== 'destruida')
    for (const k of CORREDORES)
      for (let r = k.r0 + 0.01; r < k.r1; r += 0.02) {
        const [x, y] = polar(r, k.a);
        peca(copa, luz, x, y, 0.014, 0.0012, 0.0012, 0.0016);
      }

  // Escombros do saque e da destruição.
  if (fase !== 'integra')
    for (let k = 0; k < (ruina ? 70 : 18); k++) {
      const a = CORTE.de + rand() * aberto, r = 0.06 + rand() * 0.2, s = rand();
      const [x, y] = polar(r, a);
      if (escavado(x, y)) peca(copa, rocha, x, y, 0.001, 0.002 + s * 0.003, 0.002 + s * 0.003, 0.0015 + s * 0.002);
    }

  // O portal, cavado na encosta voltada para o rio: faias em relevo, colunas, portas e degraus.
  {
    const a = PORTAO, c = Math.cos(a), n = Math.sin(a);
    const R = 0.285;
    const em = (r: number, t: number): [number, number] => [c * r - n * t, n * r + c * t];
    bloco(rocha, ...em(R - 0.012, 0), 0.03, 0.08, 0.045, 0, a);
    bloco(musgo, ...em(R - 0.012, 0), 0.032, 0.084, 0.003, 0.045, a);
    const [fx, fy] = em(R + 0.0035, 0);
    bloco(entalhe, fx, fy, 0.002, 0.05, 0.034, 0, a); // fachada aparelhada
    if (ruina) {
      bloco(sombra, ...em(R + 0.0047, 0), 0.0008, 0.014, 0.019, 0.004, a);
      bloco(madeira, ...em(R + 0.014, 0.004), 0.0015, 0.007, 0.0012, 0.0002, a + 0.5);
    } else for (const t of [-0.0036, 0.0036]) bloco(madeira, ...em(R + 0.0047, t), 0.0008, 0.0068, 0.019, 0.004, a);
    for (const t of [-0.016, 0.016]) {
      // faia em relevo: tronco que se abre em galhos e copa sobre a porta
      const [x, y] = em(R + 0.005, t);
      peca(cilindro, entalhe, x, y, 0.004 + 0.012, 0.0025, 0.0025, 0.024);
      for (let k = 0; k < 4; k++) peca(copa, entalhe, ...em(R + 0.0055, t * (1 - k * 0.22)), 0.03 + k * 0.002, 0.006, 0.0025, 0.0045);
      const [px, py] = em(R + 0.005, t * 1.75);
      peca(cilindro, entalhe, px, py, 0.004 + 0.011, 0.0018, 0.0018, 0.022);
      peca(copa, entalhe, px, py, 0.027, 0.0032, 0.0032, 0.0025);
    }
    for (let k = 0; k < 4; k++) bloco(pedra, ...em(R + 0.008 + k * 0.004, 0), 0.004, 0.028, 0.004 - k * 0.001, 0, a);
  }

  // O caminho do portal à ponte, a ponte única de pedra em arco e o Esgalduin com pedras nas margens.
  {
    const a = PORTAO, c = Math.cos(a), n = Math.sin(a);
    const [vx, vy] = RIO.curva;
    const meia = RIO.largura / 2 + 0.012;
    for (let r = 0.305; r < Math.hypot(vx, vy) - meia; r += 0.008) bloco(pedra, c * r, n * r, 0.0085, 0.01, 0.0008, 0, a);
    const arco = new THREE.TorusGeometry(1, 0.25, 8, 24, Math.PI).rotateX(Math.PI / 2);
    peca(arco, pedra, vx, vy, 0, meia, 0.03, 0.008, a);
    bloco(pedra, vx, vy, meia * 2 + 0.01, 0.009, 0.0015, 0.008, a);
    for (const t of [-0.0042, 0.0042]) bloco(pedra, vx - n * t, vy + c * t, meia * 2 + 0.01, 0.001, 0.0025, 0.0095, a);
    for (const s of [-1, 1]) bloco(pedra, vx + c * s * (meia + 0.004), vy + n * s * (meia + 0.004), 0.012, 0.012, 0.008, 0, a);
    for (const dir of [RIO.acima, RIO.abaixo]) {
      const ang = Math.atan2(dir[1], dir[0]);
      for (let t = 0; t < 1; t += 0.02) {
        const x = vx + dir[0] * (t + 0.01), y = vy + dir[1] * (t + 0.01);
        if (Math.hypot(x, y) > RAIO_BASE - 0.01) break;
        bloco(agua, x, y, 0.0205, RIO.largura, 0.0005, 0, ang);
        for (const lado of [-1, 1]) {
          const s = rand(), d = RIO.largura / 2 + 0.002 + rand() * 0.004;
          if (s < 0.6) peca(copa, s < 0.3 ? musgo : rocha, x - dir[1] * lado * d, y + dir[0] * lado * d, 0.001, 0.003 + s * 0.004, 0.003 + s * 0.003, 0.002 + s * 0.002);
        }
      }
    }
    peca(cilindro, agua, vx, vy, 0.00025, RIO.largura / 2, RIO.largura / 2, 0.0005);
  }

  // Afloramentos de rocha e musgo pela encosta, fora do corte.
  for (let k = 0; k < 160; k++) {
    const a = rand() * Math.PI * 2, r = COLINA.topo + rand() * (COLINA.r - COLINA.topo), s = rand();
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (noCorte(x, y, 3)) continue;
    peca(copa, s < 0.4 ? musgo : rocha, x, y, alturaColina(r), 0.006 + s * 0.01, 0.005 + s * 0.008, 0.004 + s * 0.006, a);
  }

  // A floresta de faias de Neldoreth e Region, também sobre a colina, fora do corte, do rio e do caminho.
  for (let k = 0; k < 900; k++) {
    const r = Math.sqrt(rand()) * (RAIO_BASE - 0.02), a = rand() * Math.PI * 2, s = 0.022 + rand() * 0.014, cor = rand();
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (distanciaRio(x, y) < RIO.largura / 2 + 0.014) continue;
    if (noCorte(x, y, 6) && r < COLINA.r + 0.02) continue;
    const g = Math.atan2(Math.sin(a - PORTAO), Math.cos(a - PORTAO));
    if (Math.abs(g * r) < 0.035 && r > 0.2) continue; // portal e caminho
    if (r > COLINA.topo - 0.01 && r < COLINA.r - 0.02 && rand() < 0.4) continue; // encosta íngreme, mais rocha
    const z = alturaColina(r);
    peca(cilindro, casca, x, y, z + s * 0.35, s * 0.05, s * 0.05, s * 0.7);
    const f = folhas[Math.floor(cor * 3)];
    peca(copa, f, x, y, z + s * 0.92, s * 0.42, s * 0.42, s * 0.34);
    peca(copa, f, x + s * 0.18, y - s * 0.1, z + s * 0.78, s * 0.3, s * 0.3, s * 0.24);
    peca(copa, f, x - s * 0.15, y + s * 0.14, z + s * 0.8, s * 0.28, s * 0.28, s * 0.22);
  }

  o.finalizar(cidade);
  return cidade;
}
