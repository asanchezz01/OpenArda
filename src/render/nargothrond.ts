// Reconstrução artística de Nargothrond: volumes em km, Z para cima. Coordenadas locais: X rio abaixo
// ao longo do Narog, Y para a margem leste; o grupo "Giro" alinha X ao traçado do atlas.
// Descrito (O Silmarillion, cap. 13 e 21): cavernas escavadas por Finrod sob as colinas de Taur-en-Faroth,
// na margem oeste do Narog, com as portas voltadas para o rio; a grande ponte construída a conselho de
// Túrin diante das Portas de Felagund; Glaurung, que entra pela ponte e diante das portas encontra Túrin.
// Artísticos (composição a partir de uma ilustração de referência): a garganta em degraus, as fachadas
// escavadas em pedra dourada nas duas margens, as janelas em arco, as cúpulas, as bocas de caverna, as
// três arcadas da ponte e a forma do dragão.
import * as THREE from 'three';
import { GIRO_NARGOTHROND, type FaseNargothrond } from '../core/detalhes';
import { cilindro, cone, copa, cupula, duasAguas, material, oficina } from './oficina';

const RAIO_BASE = 0.72;
const R = RAIO_BASE - 0.01;
/** O Narog: eixo em y e largura. */
export const RIO = { y: 0.2, largura: 0.07 };
/** Degraus da garganta em cada margem: distância da frente ao eixo do rio e altura do topo. */
export const OESTE = [{ s: 0.042, h: 0.03 }, { s: 0.085, h: 0.075 }, { s: 0.128, h: 0.125 }, { s: 0.17, h: 0.23 }];
export const LESTE = [{ s: 0.042, h: 0.03 }, { s: 0.082, h: 0.07 }, { s: 0.122, h: 0.115 }, { s: 0.162, h: 0.2 }];
/** Praça diante das Portas de Felagund, no primeiro degrau da margem oeste: meia largura e frente das portas. */
export const PRACA = { meia: 0.062, portas: 0.072 };
/** A ponte de três arcos, das portas ao primeiro degrau da margem leste. */
export const PONTE = { tabuleiro: 0.032, largura: 0.016 };

/** Converte coordenadas locais do modelo para o deslocamento no atlas (km), a partir do centro do sítio. */
export function paraAtlas(x: number, y: number): [number, number] {
  const c = Math.cos(GIRO_NARGOTHROND), s = Math.sin(GIRO_NARGOTHROND);
  return [x * c - y * s, x * s + y * c];
}

/** y local de um ponto a uma distância s do eixo do rio, na margem oeste (-1) ou leste (+1). */
const margem = (lado: number, s: number) => RIO.y + lado * s;

/** Meio cilindro com o eixo em Y e a metade curva para cima: o topo das janelas e das bocas em arco. */
const meiaRoda = new THREE.CylinderGeometry(1, 1, 1, 16, 1, false, -Math.PI / 2, Math.PI);
/** Arco: meio toro no plano XZ, vão unitário de -1 a 1. */
const arco = new THREE.TorusGeometry(1, 0.14, 6, 20, Math.PI).rotateX(Math.PI / 2);

/** Faixa do terreno entre duas retas paralelas ao rio, recortada pela borda circular do modelo. */
function faixa(y0: number, y1: number): THREE.Shape {
  const a = Math.max(y0, -R + 1e-4), b = Math.min(y1, R - 1e-4), n = 20;
  const pts: THREE.Vector2[] = [];
  for (let k = 0; k <= n; k++) {
    const y = a + ((b - a) * k) / n;
    pts.push(new THREE.Vector2(Math.sqrt(R * R - y * y), y));
  }
  for (let k = n; k >= 0; k--) {
    const y = a + ((b - a) * k) / n;
    pts.push(new THREE.Vector2(-Math.sqrt(R * R - y * y), y));
  }
  return new THREE.Shape(pts);
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

  const relva = material(0x5b6b3c);
  const rocha = material(0x7a6d58);
  const lajeado = material(0x8f7f62);
  const musgo = material(0x66733f);
  const dourada = material(0xd8bd82);
  const clara = material(0xe8d4a0);
  const queimada = material(0x8e7a55);
  const telha = material(0xb08f58);
  const ouro = material(0xd9b24c, { metalness: 0.7, roughness: 0.35 });
  const vidro = material(0x3a2f22);
  const sombra = material(0x1d1914);
  const luz = material(0xffd27a, { emissive: 0xffb84a, emissiveIntensity: 1.1 });
  const madeira = material(0x5a3e2a);
  const agua = material(0x4e6a55, { roughness: 0.2 });
  const espuma = material(0xe8eadc);
  const dragao = material(0x6f5a2c, { metalness: 0.35, roughness: 0.55 });
  const ventre = material(0xa48a46, { metalness: 0.3, roughness: 0.6 });
  const tronco = material(0x5c4a38);
  const pinhos = [material(0x3d5230), material(0x4a5f34), material(0x34472a)];
  const folhas = [material(0x5d7438), material(0x6e8040)];

  // Base em talude sob o vale, esticada com o exagero do relevo.
  const base = new THREE.Mesh(new THREE.CylinderGeometry(RAIO_BASE + 0.02, 1.5, 0.8, 64).rotateX(Math.PI / 2).translate(0, 0, -0.4), relva);
  base.name = 'Base';
  cidade.add(base);

  // Os degraus da garganta: cada um é uma faixa paralela ao rio, extrudada até a sua altura.
  for (const [lado, degraus] of [[-1, OESTE], [1, LESTE]] as const)
    degraus.forEach((d, k) => {
      const s1 = k + 1 < degraus.length ? degraus[k + 1].s : 2;
      const [y0, y1] = [margem(lado, d.s), margem(lado, s1)].sort((a, b) => a - b);
      const ultimo = k === degraus.length - 1;
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(faixa(y0, y1), { depth: d.h, bevelEnabled: false, curveSegments: 1 }), [ultimo ? relva : lajeado, rocha]);
      m.name = `${lado < 0 ? 'Taur-en-Faroth' : 'Margem leste'} ${k + 1}`;
      giro.add(m);
    });

  /** Janela em arco numa fachada paralela ao rio. */
  const janela = (m: THREE.Material, x: number, y: number, z: number, w: number, h: number) => {
    bloco(m, x, y, w, 0.0012, h - w / 2, z);
    peca(meiaRoda, m, x, y, z + h - w / 2, w / 2, 0.0012, w / 2);
  };
  const corJanela = () => (acesa ? (rand() < 0.25 ? luz : vidro) : sombra);

  /** Edifício escavado no degrau: fachada para o rio, pilastras, andares de janelas em arco e cobertura. */
  function predio(lado: number, x: number, sFrente: number, z: number, w: number, prof: number, h: number, terreo: boolean) {
    const n = -lado; // a fachada olha para o rio
    const yf = margem(lado, sFrente);
    const danificado = ruina && rand() < 0.45;
    if (danificado) h *= 0.55 + rand() * 0.3;
    const pedra = ruina && rand() < 0.4 ? queimada : dourada;
    bloco(pedra, x, yf - (n * prof) / 2, w, prof, h, z);
    const vaos = Math.max(2, Math.round(w / 0.011));
    const vao = w / vaos;
    for (let i = 0; i <= vaos; i++) bloco(clara, x - w / 2 + i * vao, yf + n * 0.0008, 0.0022, 0.0018, h, z);
    const andares = Math.max(1, Math.floor(h / 0.013));
    const ah = h / andares;
    for (let f = 0; f < andares; f++) {
      const z0 = z + f * ah;
      bloco(clara, x, yf + n * 0.001, w + 0.002, 0.0026, 0.0014, z0 + ah - 0.0014); // cornija
      const arcada = terreo && f === 0;
      const ww = Math.min(arcada ? vao * 0.62 : vao * 0.42, 0.007), wh = ah * (arcada ? 0.72 : 0.55);
      for (let i = 0; i < vaos; i++) janela(corJanela(), x - w / 2 + (i + 0.5) * vao, yf + n * 0.0006, z0 + ah * (arcada ? 0.08 : 0.2), ww, wh);
    }
    const topo = z + h;
    if (danificado) {
      for (let k = 0; k < 3; k++) peca(copa, pedra, x + (rand() - 0.5) * w, yf + n * (0.004 + rand() * 0.006), z + 0.0015, 0.003 + rand() * 0.003, 0.003, 0.002);
      return;
    }
    const tipo = rand();
    if (tipo < 0.25) peca(duasAguas, clara, x, yf - (n * prof) / 2, topo, prof, w * 1.04, Math.min(w * 0.16, 0.006), Math.PI / 2); // frontão baixo
    else if (tipo < 0.8) bloco(clara, x, yf - n * 0.001, w, 0.0016, 0.004, topo); // balaustrada
    else {
      const r = Math.min(w * 0.28, 0.012), yc = yf - n * Math.min(prof * 0.45, r * 1.3);
      peca(cilindro, dourada, x, yc, topo + 0.004, r, r, 0.008);
      for (let k = 0; k < 3; k++) janela(corJanela(), x - r * 0.6 + k * r * 0.6, yc + n * r * 0.98, topo + 0.0015, 0.0018, 0.005);
      peca(cupula, telha, x, yc, topo + 0.008, r * 1.05, r * 1.05, r * 0.9);
      peca(cone, ouro, x, yc, topo + 0.008 + r * 0.9 + 0.002, 0.0008, 0.0008, 0.004);
    }
    if (rand() < 0.3) {
      // torreão de canto com cúpula
      const tx = x + (rand() < 0.5 ? -1 : 1) * (w / 2 - 0.004), r = 0.0045, th = h + 0.012;
      peca(cilindro, dourada, tx, yf - n * 0.004, z + th / 2, r, r, th);
      for (let f = 1; f < th / 0.012; f++) janela(corJanela(), tx, yf - n * 0.004 + n * r, z + f * 0.012 - 0.008, 0.0024, 0.006);
      peca(cupula, telha, tx, yf - n * 0.004, z + th, r * 1.15, r * 1.15, r * 1.2);
    }
  }

  /** Boca de caverna em arco no paredão. */
  const boca = (lado: number, x: number, s: number, z: number, w: number, h: number) => {
    const y = margem(lado, s) - lado * 0.0006;
    bloco(sombra, x, y, w, 0.001, h - w / 2, z);
    peca(meiaRoda, sombra, x, y, z + h - w / 2, w / 2, 0.001, w / 2);
    peca(arco, clara, x, y, z + h - w / 2, w / 2 + 0.0015, 0.012, w / 2 + 0.0015);
  };

  // Fachadas nos três primeiros degraus de cada margem; no terceiro, alternadas com bocas de caverna.
  for (const [lado, degraus] of [[-1, OESTE], [1, LESTE]] as const)
    for (let k = 0; k < degraus.length - 1; k++) {
      const d = degraus[k], prox = degraus[k + 1];
      const sFrente = d.s + 0.008, prof = prox.s - sFrente;
      const L = Math.min(0.52 - k * 0.03, Math.sqrt(Math.max(0, R * R - margem(lado, prox.s) ** 2)) - 0.04);
      let x = -L;
      while (x < L) {
        const w = 0.028 + rand() * 0.032;
        const cx = x + w / 2;
        x += w + 0.003 + rand() * 0.008;
        if (cx + w / 2 > L) break;
        if (k === 0 && lado < 0 && Math.abs(cx) < PRACA.meia + w / 2) continue; // praça das portas
        if (k === 0 && lado > 0 && Math.abs(cx) < 0.012 + w / 2) continue; // cabeceira da ponte
        const sorte = rand();
        if (k === degraus.length - 2) {
          // junto ao paredão: bocas de caverna em arco, alguns edifícios altos e rocha nua
          if (sorte < 0.4) boca(lado, cx, prox.s, d.h, Math.min(w * 0.8, 0.045), (prox.h - d.h) * (0.6 + rand() * 0.25));
          if (sorte < 0.4 || sorte > 0.72) continue;
        } else if (k === 1 && sorte < 0.25) {
          if (sorte < 0.1) boca(lado, cx, prox.s, d.h, Math.min(w * 0.7, 0.03), (prox.h - d.h) * 0.75);
          continue;
        }
        if (k === 0 && sorte < 0.2) continue;
        if (Math.abs(cx) > L * 0.8 && rand() < 0.3) continue; // a rocha nua predomina nas pontas da garganta
        predio(lado, cx, sFrente, d.h, w, prof, prox.h - d.h + rand() * 0.012, k === 0);
      }
      // balaustrada ao longo da borda do degrau
      for (let xb = -L; xb < L; xb += 0.03) if (!(k === 0 && Math.abs(xb + 0.015) < 0.014)) bloco(clara, xb + 0.015, margem(lado, d.s + 0.0015), 0.028, 0.0012, 0.003, d.h);
    }

  // Bocas de caverna maiores no alto dos paredões, sob a floresta.
  for (const [lado, degraus] of [[-1, OESTE], [1, LESTE]] as const) {
    const [d, prox] = [degraus[degraus.length - 2], degraus[degraus.length - 1]];
    for (const x of [-0.24, 0.1, 0.31]) boca(lado, x + lado * 0.05, prox.s, d.h + 0.004, 0.05, prox.h - d.h - 0.016);
  }

  // As Portas de Felagund: o grande portal no fundo da praça, com colunas, frontão e dois torreões.
  {
    const s = PRACA.portas, z = OESTE[0].h, yf = margem(-1, s), w = 0.09, h = OESTE[1].h - z + 0.03;
    bloco(dourada, 0, yf - 0.012, w, 0.024, h, z);
    for (let f = 1; f < 4; f++) bloco(clara, 0, yf + 0.001, w + 0.003, 0.0028, 0.0016, z + (f * h) / 4);
    peca(arco, clara, 0, yf + 0.001, z + 0.025, 0.0125, 0.02, 0.0125);
    janela(sombra, 0, yf + 0.0005, z, 0.022, 0.036);
    if (ruina) {
      bloco(madeira, 0.012, yf + 0.008, 0.012, 0.0016, 0.0014, z, 0.5);
      bloco(madeira, -0.01, yf + 0.011, 0.012, 0.0016, 0.0014, z, -0.4);
    } else for (const x of [-0.0055, 0.0055]) bloco(madeira, x, yf + 0.0009, 0.0105, 0.0012, 0.024, z);
    for (const x of [-0.02, -0.014, 0.014, 0.02]) peca(cilindro, clara, x, yf + 0.003, z + 0.02, 0.0022, 0.0022, 0.04);
    bloco(clara, 0, yf + 0.002, 0.05, 0.004, 0.003, z + 0.04);
    for (let i = 0; i < 6; i++) for (let f = 0; f < 2; f++) if (Math.abs(i - 2.5) > 1) janela(corJanela(), -0.0375 + i * 0.015, yf + 0.0005, z + 0.052 + f * 0.014, 0.005, 0.01);
    for (const x of [-0.05, 0.05]) {
      peca(cilindro, dourada, x, yf - 0.006, z + (h + 0.02) / 2, 0.009, 0.009, h + 0.02);
      for (let f = 0; f < 4; f++) janela(corJanela(), x, yf + 0.0032, z + 0.01 + f * 0.016, 0.0034, 0.009);
      if (!ruina) {
        peca(cupula, telha, x, yf - 0.006, z + h + 0.02, 0.0105, 0.0105, 0.012);
        peca(cone, ouro, x, yf - 0.006, z + h + 0.034, 0.001, 0.001, 0.006);
      }
    }
    // escada da praça até a água, rio acima, rente ao paredão
    for (let k = 0; k < 14; k++) bloco(clara, -0.066 - k * 0.004, margem(-1, 0.0385), 0.004, 0.006, z - (k + 1) * 0.002, 0);
    // o lajeado da praça
    bloco(clara, 0, margem(-1, (OESTE[0].s + s) / 2), PRACA.meia * 2, s - OESTE[0].s, 0.0006, z);
  }

  // A grande ponte de Túrin, em três arcos sobre o Narog, das portas à margem leste.
  if (fase !== 'integra') {
    // perfil da ponte (y ao longo do vão, z para cima) com três arcos plenos, extrudado na largura
    const t = PONTE.tabuleiro, meia = OESTE[0].s, mola = 0.009;
    const vaos: [number, number][] = [[-meia, -0.0175], [-0.0115, 0.0115], [0.0175, meia]];
    const perfil = new THREE.Shape();
    perfil.moveTo(-meia, t);
    vaos.forEach(([a, b], i) => {
      if (i === 0) perfil.lineTo(a, mola);
      else {
        perfil.lineTo(a, 0);
        perfil.lineTo(a, mola);
      }
      perfil.absarc((a + b) / 2, mola, (b - a) / 2, Math.PI, 0, true);
      if (i < vaos.length - 1) perfil.lineTo(b, 0);
    });
    perfil.lineTo(meia, t);
    perfil.lineTo(-meia, t);
    const geo = new THREE.ExtrudeGeometry(perfil, { depth: PONTE.largura, bevelEnabled: false, curveSegments: 16 });
    geo.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, -PONTE.largura / 2, 1, 0, 0, RIO.y, 0, 1, 0, 0, 0, 0, 0, 1));
    const ponte = new THREE.Mesh(geo, [dourada, clara]);
    ponte.name = 'Ponte';
    giro.add(ponte);
    // aduelas claras em volta dos arcos, cornija, parapeitos e talha-mares
    for (const [a, b] of vaos) peca(arco, clara, 0, RIO.y + (a + b) / 2, mola, (b - a) / 2 + 0.0008, (PONTE.largura / 2 + 0.0008) / 0.14, (b - a) / 2 + 0.0008, Math.PI / 2);
    bloco(clara, 0, RIO.y, PONTE.largura + 0.002, meia * 2, 0.0016, t - 0.0016);
    for (const x of [-PONTE.largura / 2, PONTE.largura / 2]) {
      bloco(clara, x, RIO.y, 0.0012, meia * 2, 0.004, t);
      for (const p of [-meia, -0.0145, 0.0145, meia]) bloco(clara, x, RIO.y + p, 0.0022, 0.003, 0.0065, t);
    }
    for (const p of [-0.0145, 0.0145]) for (const sx of [-1, 1]) peca(copa, dourada, sx * (PONTE.largura / 2 + 0.002), RIO.y + p, 0.002, 0.004, 0.003, 0.004);
  }

  // Glaurung diante das portas, sobre o ouro espalhado na praça (no texto, depois se deita sobre o tesouro lá dentro).
  if (fase === 'glaurung') {
    const z0 = OESTE[0].h;
    const em = (x: number, s: number) => new THREE.Vector3(x, margem(-1, s), 0);
    for (let k = 0; k < 30; k++) {
      const a = rand() * Math.PI, r = Math.sqrt(rand());
      peca(copa, ouro, Math.cos(a) * 0.03 * r, margem(-1, PRACA.portas - 0.003 - Math.sin(a) * 0.014 * r), z0, 0.004 + rand() * 0.004, 0.003 + rand() * 0.003, 0.0018 + rand() * 0.002);
    }
    const trajeto = new THREE.CatmullRomCurve3([em(-0.056, 0.066), em(-0.042, 0.05), em(-0.024, 0.062), em(-0.004, 0.054), em(0.016, 0.064), em(0.034, 0.057), em(0.038, 0.048), em(0.022, 0.046), em(0.006, 0.045)]);
    const pts = trajeto.getSpacedPoints(40);
    const grossura = (s: number) => (s < 0.55 ? 0.0012 + 0.0052 * (s / 0.55) ** 0.8 : s < 0.82 ? 0.0064 - ((s - 0.55) / 0.27) * 0.0034 : 0.003);
    let ang = 0, z = 0;
    pts.forEach((q, k) => {
      const s = k / (pts.length - 1), g = grossura(s);
      const prox = pts[Math.min(k + 1, pts.length - 1)], ant = pts[Math.max(k - 1, 0)];
      ang = Math.atan2(prox.y - ant.y, prox.x - ant.x);
      z = z0 + g * 0.55;
      peca(copa, dragao, q.x, q.y, z, 0.0036, g, g * 0.75, ang);
      peca(copa, ventre, q.x, q.y, z - g * 0.3, 0.0032, g * 0.85, g * 0.42, ang);
      if (k % 2 === 0 && s < 0.85) peca(cone, ventre, q.x, q.y, z + g * 0.75, 0.0006 + g * 0.08, 0.0006 + g * 0.08, 0.001 + g * 0.3);
      if (k === Math.round(40 * 0.42) || k === Math.round(40 * 0.68))
        for (const lado of [-1, 1]) {
          const [lx, ly] = o.giro(ang, 0.001, lado * g * 1.15);
          bloco(dragao, q.x + lx, q.y + ly, 0.0036, 0.003, z - z0, z0, ang);
        }
    });
    const fim = pts[pts.length - 1];
    const frente = (d: number, l = 0): [number, number] => {
      const [a, b] = o.giro(ang, d, l);
      return [fim.x + a, fim.y + b];
    };
    peca(copa, dragao, ...frente(0.004), z + 0.0012, 0.007, 0.0052, 0.0038, ang);
    peca(copa, dragao, ...frente(0.0105), z + 0.0004, 0.006, 0.0036, 0.0026, ang);
    for (const l of [-1, 1]) {
      peca(copa, ouro, ...frente(0.0066, l * 0.0037), z + 0.0025, 0.0012, 0.001, 0.0009, ang);
      peca(cone, ventre, ...frente(0.0006, l * 0.003), z + 0.0058, 0.0009, 0.0009, 0.005);
    }
  }

  // Escombros nos degraus depois do saque.
  if (ruina)
    for (let k = 0; k < 90; k++) {
      const lado = rand() < 0.65 ? -1 : 1, degraus = lado < 0 ? OESTE : LESTE, i = Math.floor(rand() * 3);
      const x = (rand() * 2 - 1) * 0.38, s = degraus[i].s + 0.002 + rand() * 0.006;
      if (lado < 0 && i === 0 && Math.abs(x) < PRACA.meia) continue;
      peca(copa, rand() < 0.5 ? queimada : rocha, x, margem(lado, s), degraus[i].h, 0.002 + rand() * 0.003, 0.002 + rand() * 0.002, 0.0015 + rand() * 0.002);
    }

  // Rocha bruta nas frentes dos degraus, entre os edifícios, e no cais junto à água.
  for (const [lado, degraus] of [[-1, OESTE], [1, LESTE]] as const)
    degraus.forEach((d, k) => {
      const base = k === 0 ? 0 : degraus[k - 1].h, alto = d.h - base;
      for (let j = 0; j < (k === 0 ? 120 : k === 3 ? 160 : 90); j++) {
        const x = (rand() * 2 - 1) * 0.6, s = d.s + 0.001 + rand() * 0.003, t = rand();
        if (Math.hypot(x, margem(lado, s)) > R - 0.01) continue;
        if (k === 0 && Math.abs(x) < 0.012) continue; // ponte
        if (k === 0 && lado < 0 && x < -0.05 && x > -0.13) continue; // escada
        peca(copa, t < 0.2 ? musgo : rocha, x, margem(lado, s), base + rand() * alto, 0.006 + t * 0.01, 0.003 + t * 0.003, 0.006 + t * 0.01);
      }
    });

  // O Narog na garganta: água verde, espuma nos pilares e pedras ao pé dos paredões.
  for (let x = -R; x < R; x += 0.02) {
    if (Math.hypot(x, RIO.y + OESTE[0].s) > R && Math.hypot(x, RIO.y - OESTE[0].s) > R) continue;
    bloco(agua, x, RIO.y, 0.0205, OESTE[0].s + LESTE[0].s, 0.0005);
    for (const lado of [-1, 1]) {
      const sz = rand();
      if (sz < 0.7) peca(copa, sz < 0.2 ? musgo : rocha, x + rand() * 0.02, margem(lado, RIO.largura / 2 + 0.002 + rand() * 0.004), 0.001, 0.003 + sz * 0.005, 0.0025 + sz * 0.003, 0.002 + sz * 0.003);
    }
  }
  for (let k = 0; k < 10; k++) peca(copa, espuma, (rand() - 0.5) * 0.03, RIO.y + (rand() < 0.5 ? -1 : 1) * (0.012 + rand() * 0.006), 0.0006, 0.003 + rand() * 0.004, 0.0015, 0.0007);

  // Vegetação pendente nas bordas dos degraus; mais densa no abandono.
  const tufos = fase === 'abandonada' ? 260 : 150;
  for (let k = 0; k < tufos; k++) {
    const lado = rand() < 0.5 ? -1 : 1, degraus = lado < 0 ? OESTE : LESTE, i = Math.floor(rand() * degraus.length);
    const x = (rand() * 2 - 1) * 0.5, s = degraus[i].s + rand() * 0.004;
    if (Math.hypot(x, margem(lado, s)) > R - 0.01) continue;
    if (lado < 0 && i === 0 && Math.abs(x) < PRACA.meia + 0.01) continue;
    if (i === 0 && Math.abs(x) < 0.012) continue;
    peca(copa, rand() < 0.6 ? musgo : folhas[k % 2], x, margem(lado, s), degraus[i].h - rand() * 0.012, 0.004 + rand() * 0.006, 0.002 + rand() * 0.002, 0.003 + rand() * 0.006);
  }

  // A floresta de Taur-en-Faroth e da margem leste, no alto da garganta.
  for (let k = 0; k < 1000; k++) {
    const r = Math.sqrt(rand()) * (R - 0.015), a = rand() * Math.PI * 2, s = 0.02 + rand() * 0.016, cor = rand();
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    const oeste = y < margem(-1, OESTE[3].s + 0.008), leste = y > margem(1, LESTE[3].s + 0.008);
    if (!oeste && !leste) continue;
    const z = oeste ? OESTE[3].h : LESTE[3].h;
    if (cor < 0.7) {
      peca(cilindro, tronco, x, y, z + s * 0.3, s * 0.045, s * 0.045, s * 0.6);
      const f = pinhos[Math.floor(cor * 4.28) % 3];
      peca(cone, f, x, y, z + s * 0.62, s * 0.3, s * 0.3, s * 0.7);
      peca(cone, f, x, y, z + s * 0.98, s * 0.2, s * 0.2, s * 0.5);
    } else {
      peca(cilindro, tronco, x, y, z + s * 0.35, s * 0.05, s * 0.05, s * 0.7);
      peca(copa, folhas[k % 2], x, y, z + s * 0.92, s * 0.42, s * 0.42, s * 0.34);
    }
  }

  o.finalizar(giro);
  return cidade;
}
