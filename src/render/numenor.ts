// Reconstrução artística das cidades de Númenor: volumes em km, Z para cima, X para leste, Y para norte.
// Descrito: Armenelos, a cidade dos reis, com Nimloth no pátio do rei; o Templo que Sauron fez erguer
// na colina no meio da cidade, circular, com 500 pés de diâmetro e de altura, coroado por uma cúpula
// de prata que logo enegreceu com a fumaça (O Silmarillion, Akallabêth). Rómenna, o grande porto no
// fundo de uma baía da costa leste, de onde partiram os navios dos Fiéis (Contos Inacabados, Parte II, 1).
// Artísticos: traçados, tamanhos e formas, inspirados nas fotografias armenelos-se3000 e romenna-se3000
// (pedra branca, telhados de ardósia, torres com coruchéus, cais de pedra e armazéns de madeira).
import * as THREE from 'three';
import type { FaseArmenelos, FaseRomenna } from '../core/detalhes';

import { cilindro, copa, cupula, material, oficina, PE } from './oficina';
export { casco } from './oficina';

// ---------------------------------------------------------------- Armenelos

const MURO = 0.6;
const COLINA = { x: -0.12, y: 0, r: 0.25, topo: 0.095, h: 0.03 };
/** Portões nos quatro pontos cardeais: o leste dá no pátio do rei, os outros nas avenidas da colina. */
const PORTOES = (() => {
  const n = Math.atan2(Math.sqrt(MURO ** 2 - COLINA.x ** 2), COLINA.x);
  return [0, Math.PI, n, -n];
})();
/** O paço do rei, a leste da colina: corpo principal em x = PACO.x e alas até PACO.fundo, abertas para o pátio. */
const PACO = { x: 0.16, meia: 0.17, fundo: 0.4, muro: 0.443 };
export const NIMLOTH: [number, number] = [0.31, 0];
/** Templo de Melkor: 500 pés de diâmetro na base e 500 pés de altura até a cúpula. */
export const TEMPLO = { raio: (500 * PE) / 2, altura: 500 * PE };

/** Altura da colina no meio da cidade; o topo plano abriga jardins e, depois, o Templo. */
export function alturaColina(x: number, y: number): number {
  const r = Math.hypot(x - COLINA.x, y - COLINA.y);
  if (r <= COLINA.topo) return COLINA.h;
  if (r >= COLINA.r) return 0;
  return COLINA.h * 0.5 * (1 + Math.cos((Math.PI * (r - COLINA.topo)) / (COLINA.r - COLINA.topo)));
}

export function criarArmenelos(fase: FaseArmenelos): THREE.Group {
  const templo = fase === 'templo';
  const cidade = new THREE.Group();
  cidade.name = `Armenelos: ${fase}`;
  const o = oficina(32);
  const { peca, bloco, rand } = o;
  const branca = material(0xf3f0e7);
  const pedra = material(0xe2dccd);
  const ardosia = material(0x76808b);
  const ardosias = [ardosia, material(0x8b9196), material(0x6c7480)];
  const ouro = material(0xd9b24c, { metalness: 0.7, roughness: 0.35 });
  const sombra = material(0x2d333b);
  const relva = material(0x6e8e44);
  const gramado = material(0x84a352);
  const sebe = material(0x3d5c2c);
  const folhas = material(0x4d7636);
  const tronco = material(0x5b4633);
  const cascalho = material(0xd8cfb8);
  const agua = material(0x6fb3c4, { roughness: 0.3 });
  const chao = material(0xa9a78a);
  const canteiros = [material(0xe2c255), material(0xf4f0e2), material(0xc9819a), material(0x9b6fb0)];

  // Base em talude, esticada com o exagero do relevo: na encosta vira aterro, sem deixar a cidade flutuando.
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.45, 0.8, 64).rotateX(Math.PI / 2).translate(0, 0, -0.4), relva);
  base.name = 'Base';
  cidade.add(base);
  peca(cilindro, chao, 0, 0, 0.0005, MURO, MURO, 0.001);

  // A colina no meio da cidade, por revolução do perfil (de fora para o topo).
  const perfil: THREE.Vector2[] = [];
  for (let k = 0; k <= 32; k++) {
    const r = (COLINA.r + 0.01) * (1 - k / 32);
    perfil.push(new THREE.Vector2(r, alturaColina(COLINA.x + r, COLINA.y) + 0.0012));
  }
  const colina = new THREE.Mesh(new THREE.LatheGeometry(perfil, 72).rotateX(Math.PI / 2).translate(COLINA.x, COLINA.y, 0), gramado);
  colina.name = 'Colina';
  cidade.add(colina);

  // Muralha branca com ameias, torres redondas de coruchéu e os quatro portões.
  const naPorta = (a: number, folga: number) => PORTOES.some((p) => Math.abs(Math.atan2(Math.sin(a - p), Math.cos(a - p))) * MURO < folga);
  const n = Math.ceil((Math.PI * 2 * MURO) / 0.012);
  const passo = (Math.PI * 2 * MURO) / n;
  for (let k = 0; k < n; k++) {
    const a = (k * Math.PI * 2) / n;
    if (naPorta(a, 0.02)) continue;
    const c = Math.cos(a), s = Math.sin(a);
    bloco(branca, c * MURO, s * MURO, 0.009, passo * 1.04, 0.016, 0, a);
    for (const t of [-0.25, 0.25]) bloco(branca, c * (MURO + 0.0035) - s * t * passo, s * (MURO + 0.0035) + c * t * passo, 0.002, passo * 0.3, 0.0026, 0.016, a);
    if (k % 10 === 5 && !naPorta(a, 0.06)) o.torreRedonda(branca, ardosia, ouro, c * (MURO + 0.004), s * (MURO + 0.004), 0, 0.011, 0.03);
  }
  for (const p of PORTOES) {
    const c = Math.cos(p), s = Math.sin(p);
    for (const lado of [-1, 1]) o.torreQuadrada(branca, ardosia, ouro, c * MURO - s * lado * 0.026, s * MURO + c * lado * 0.026, 0, 0.02, 0.036, p);
    bloco(branca, c * MURO, s * MURO, 0.012, 0.036, 0.01, 0.016, p);
    o.ameiasRetangulo(branca, c * MURO, s * MURO, 0.012, 0.036, 0.026, p);
  }

  // Avenidas calçadas até a colina e o pátio do rei, com árvores dos dois lados; anel em volta da colina.
  const via = (x0: number, y0: number, x1: number, y1: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0);
    bloco(cascalho, (x0 + x1) / 2, (y0 + y1) / 2, len, 0.018, 0.0012, 0.001, ang);
    for (let t = 0.03; t < len - 0.03; t += 0.026)
      for (const lado of [-1, 1]) {
        const [dx, dy] = o.giro(ang, t, lado * 0.016);
        o.arvore(tronco, folhas, x0 + dx, y0 + dy, 0.001, 0.011);
      }
  };
  via(PACO.muro, 0, MURO, 0);
  via(COLINA.x - COLINA.r - 0.01, 0, -MURO, 0);
  for (const s of [-1, 1]) via(COLINA.x, s * (COLINA.r + 0.01), COLINA.x, s * Math.sqrt(MURO ** 2 - COLINA.x ** 2));
  for (let k = 0; k < 64; k++) {
    const a = ((k + 0.5) * Math.PI * 2) / 64;
    const r = COLINA.r + 0.012;
    bloco(cascalho, COLINA.x + Math.cos(a) * r, COLINA.y + Math.sin(a) * r, 0.014, ((Math.PI * 2 * r) / 64) * 1.06, 0.0012, 0.001, a);
  }

  // Bairros em anéis em volta da colina, com ruas a cada dois anéis; quintais com árvores.
  const livre = (x: number, y: number) => {
    if (Math.hypot(x, y) > MURO - 0.03) return false;
    if (Math.hypot(x - COLINA.x, y - COLINA.y) < COLINA.r + 0.03) return false;
    if (x > PACO.x - 0.06 && x < PACO.muro + 0.025 && Math.abs(y) < PACO.meia + 0.035) return false;
    if (Math.abs(y) < 0.026 && (x > PACO.muro || x < COLINA.x)) return false;
    if (Math.abs(x - COLINA.x) < 0.026 && Math.abs(y) > COLINA.r) return false;
    return true;
  };
  for (let anel = 0; anel < 14; anel++) {
    if (anel % 3 === 2) continue;
    const r = COLINA.r + 0.05 + anel * 0.028;
    const m = Math.floor((Math.PI * 2 * r) / 0.024);
    for (let k = 0; k < m; k++) {
      const a = ((k + rand() * 0.3 + (anel % 2) * 0.5) * Math.PI * 2) / m;
      const x = COLINA.x + Math.cos(a) * r, y = COLINA.y + Math.sin(a) * r;
      const w = 0.014 + rand() * 0.01, d = 0.011 + rand() * 0.005, h = 0.008 + rand() * 0.01, sorte = rand(), extra = rand();
      if (!livre(x, y) || k % 9 === 0) continue; // vielas radiais
      if (sorte < 0.1) o.arvore(tronco, folhas, x, y, 0.001, 0.01 + extra * 0.006);
      else if (sorte > 0.955) o.torreQuadrada(sorte > 0.98 ? branca : pedra, ardosia, ouro, x, y, 0.001, 0.012, 0.024 + extra * 0.012, a);
      else o.casa(sorte > 0.8 ? branca : pedra, ardosias[Math.floor(extra * 3)], x, y, 0.001, w, d, h, a + Math.PI / 2);
    }
  }
  for (let k = 0; k < 70; k++) {
    const a = rand() * Math.PI * 2, r = MURO + 0.03 + rand() * 0.06, s = rand();
    if (!naPorta(a, 0.05)) o.arvore(tronco, folhas, Math.cos(a) * r, Math.sin(a) * r, 0, 0.01 + s * 0.008);
  }

  // O paço: corpo principal com o pavilhão de cúpula dourada, alas em U, torres de canto e a Torre do Rei.
  const { x: PX, meia: PY, fundo: FUNDO } = PACO;
  bloco(branca, PX, 0, 0.045, PY * 2, 0.03);
  o.telhado(ardosia, PX, 0, 0.03, PY * 2 + 0.004, 0.049, 0.018, Math.PI / 2);
  for (const s of [-1, 1]) {
    bloco(branca, (PX + FUNDO) / 2, s * PY, FUNDO - PX, 0.035, 0.026);
    o.telhado(ardosia, (PX + FUNDO) / 2, s * PY, 0.026, FUNDO - PX + 0.004, 0.039, 0.015);
    o.torreRedonda(branca, ardosia, ouro, PX, s * PY, 0, 0.018, 0.054);
    o.torreRedonda(branca, ardosia, ouro, FUNDO, s * PY, 0, 0.015, 0.046);
    for (const x of [0.225, 0.28, 0.335]) o.torreQuadrada(branca, ardosia, ouro, x, s * (PY + 0.024), 0, 0.014, 0.036);
    // cúpulas de chumbo sobre o corpo principal
    peca(cilindro, branca, PX, s * 0.1, 0.034, 0.012, 0.012, 0.008);
    peca(cupula, ardosia, PX, s * 0.1, 0.038, 0.012, 0.012, 0.012);
    o.finial(ouro, PX, s * 0.1, 0.05, 0.008);
    // janelas: pátio, fundos e alas
    o.janelas(sombra, PX + 0.0226, s * 0.04, PX + 0.0226, s * (PY - 0.022), 0, 3);
    o.janelas(sombra, PX - 0.0226, s * 0.018, PX - 0.0226, s * (PY - 0.022), 0, 3);
    for (const f of [-1, 1]) o.janelas(sombra, PX + 0.03, s * (PY + f * 0.0176), FUNDO - 0.018, s * (PY + f * 0.0176), 0, 3, 0.009, 0.0078);
  }
  bloco(branca, PX + 0.006, 0, 0.058, 0.07, 0.044);
  o.ameiasRetangulo(branca, PX + 0.006, 0, 0.058, 0.07, 0.044, 0);
  peca(cilindro, branca, PX + 0.006, 0, 0.049, 0.025, 0.025, 0.01);
  peca(cupula, ouro, PX + 0.006, 0, 0.054, 0.025, 0.025, 0.024);
  peca(cilindro, branca, PX + 0.006, 0, 0.082, 0.005, 0.005, 0.008);
  o.finial(ouro, PX + 0.006, 0, 0.086, 0.014);
  o.janelas(sombra, PX + 0.0352, -0.03, PX + 0.0352, 0.03, 0.008, 3, 0.012, 0.011, 0.008);
  bloco(sombra, PX + 0.0352, 0, 0.001, 0.016, 0.02); // portal
  for (let k = 0; k < 3; k++) bloco(branca, PX + 0.038 + k * 0.004, 0, 0.004, 0.034 - k * 0.004, 0.003 - k * 0.001);
  o.torreQuadrada(branca, ardosia, ouro, PX - 0.043, 0, 0, 0.026, 0.1); // Torre do Rei

  // O pátio do rei: gramado com alamedas, canteiros floridos e sebes, fechado a leste por um muro com portão.
  const CX0 = PX + 0.04, CX1 = PACO.muro - 0.004, meio = (CX0 + CX1) / 2;
  bloco(gramado, meio, 0, CX1 - CX0, PY * 2 - 0.04, 0.0016);
  bloco(cascalho, meio, 0, CX1 - CX0, 0.012, 0.0019);
  bloco(cascalho, NIMLOTH[0], 0, 0.012, PY * 2 - 0.04, 0.0019);
  peca(cilindro, cascalho, NIMLOTH[0], NIMLOTH[1], 0.001, 0.034, 0.034, 0.0019);
  peca(cilindro, templo ? material(0x4a4440) : gramado, NIMLOTH[0], NIMLOTH[1], 0.0011, 0.026, 0.026, 0.0021);
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      const cx = NIMLOTH[0] + sx * 0.068, cy = sy * 0.072;
      for (let j = 0; j < 3; j++) bloco(canteiros[(j + (sx > 0 ? 1 : 0) + (sy > 0 ? 2 : 0)) % 4], cx, cy + (j - 1) * 0.013, 0.07, 0.008, 0.0028);
      bloco(sebe, cx, cy + sy * 0.03, 0.08, 0.004, 0.004);
      o.arvore(tronco, folhas, cx + sx * 0.045, cy + sy * 0.03, 0.0016, 0.012);
    }
  for (const s of [-1, 1]) {
    bloco(branca, PACO.muro, s * (PY + 0.03) / 2, 0.006, PY - 0.03, 0.011);
    o.ameiasLinha(branca, PACO.muro, s * 0.03, PACO.muro, s * PY, 0.011);
    bloco(branca, (FUNDO + PACO.muro) / 2, s * PY, PACO.muro - FUNDO, 0.006, 0.011);
    o.torreRedonda(branca, ardosia, ouro, PACO.muro, s * 0.03, 0, 0.0095, 0.03);
    o.torreRedonda(branca, ardosia, ouro, PACO.muro, s * PY, 0, 0.011, 0.032);
  }

  // Nimloth, a Árvore Branca, no meio do pátio; depois de 3262, só o toco queimado.
  const [nx, ny] = NIMLOTH;
  if (!templo) {
    const flores = material(0xfbfbf5, { emissive: 0x3a3a36 });
    peca(cilindro, material(0xd6d9db), nx, ny, 0.012, 0.0035, 0.0035, 0.022);
    peca(copa, flores, nx, ny, 0.032, 0.021, 0.021, 0.014);
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI * 2) / 8;
      peca(copa, flores, nx + Math.cos(a) * 0.018, ny + Math.sin(a) * 0.018, 0.025 + (k % 2) * 0.004, 0.013, 0.013, 0.01);
    }
    peca(copa, flores, nx, ny, 0.044, 0.013, 0.013, 0.01);
  } else {
    peca(cilindro, material(0x2a2522), nx, ny, 0.0035, 0.0028, 0.0028, 0.003);
  }

  const zt = COLINA.h + 0.0012;
  const [cx, cy] = [COLINA.x, COLINA.y];
  if (!templo) {
    // Jardins no alto da colina: fonte, alameda circular e anel de árvores; caminhos descendo em cruz.
    peca(cilindro, branca, cx, cy, zt + 0.001, 0.022, 0.022, 0.002);
    peca(cilindro, agua, cx, cy, zt + 0.0021, 0.019, 0.019, 0.0006);
    peca(cilindro, branca, cx, cy, zt + 0.005, 0.0022, 0.0022, 0.008);
    peca(copa, branca, cx, cy, zt + 0.0095, 0.004, 0.004, 0.002);
    for (let k = 0; k < 40; k++) {
      const a = (k * Math.PI * 2) / 40;
      bloco(cascalho, cx + Math.cos(a) * 0.055, cy + Math.sin(a) * 0.055, 0.008, 0.0095, 0.0008, zt, a);
    }
    for (let k = 0; k < 18; k++) {
      const a = ((k + 0.5) * Math.PI * 2) / 18;
      o.arvore(tronco, folhas, cx + Math.cos(a) * 0.078, cy + Math.sin(a) * 0.078, zt - 0.001, 0.012);
      if (k % 2) bloco(canteiros[k % 4], cx + Math.cos(a) * 0.035, cy + Math.sin(a) * 0.035, 0.016, 0.006, 0.0022, zt, a);
    }
    // bosques e pavilhões pela encosta, fora dos caminhos; um anel de canteiros a meia altura
    for (let k = 0; k < 90; k++) {
      const a = rand() * Math.PI * 2, r = 0.1 + rand() * 0.13, s = rand();
      if (Math.abs(Math.sin(2 * a)) < 0.12) continue;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      o.arvore(tronco, s > 0.5 ? folhas : sebe, x, y, alturaColina(x, y), 0.009 + s * 0.007);
    }
    for (let k = 0; k < 8; k++) {
      const a = ((k + 0.5) * Math.PI) / 4, r = 0.165;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, z = alturaColina(x, y);
      for (let c = 0; c < 6; c++) peca(cilindro, branca, x + Math.cos((c * Math.PI) / 3) * 0.006, y + Math.sin((c * Math.PI) / 3) * 0.006, z + 0.004, 0.0008, 0.0008, 0.008);
      peca(cilindro, branca, x, y, z + 0.0085, 0.0075, 0.0075, 0.0012);
      peca(cupula, ouro, x, y, z + 0.009, 0.0068, 0.0068, 0.005);
    }
    for (let k = 0; k < 48; k++) {
      const a = ((k + 0.5) * Math.PI * 2) / 48, r = 0.13;
      if (k % 6 === 5) continue;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      bloco(canteiros[k % 4], x, y, 0.005, 0.014, 0.0024, alturaColina(x, y), a);
    }
    for (let q = 0; q < 4; q++) {
      const a = (q * Math.PI) / 2;
      for (let r = 0.06; r < COLINA.r; r += 0.008) {
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        bloco(cascalho, x, y, 0.0085, 0.01, 0.0008, alturaColina(x, y) + 0.0006, a);
      }
    }
  } else {
    // O Templo de Melkor: rotunda de pedra escura, cúpula de prata enegrecida e a fumaça que subia dela.
    const { raio: RT, altura: HT } = TEMPLO;
    const escura = material(0x8f8a82);
    const nervura = material(0xa39e94);
    const negra = material(0x2a2b30, { metalness: 0.75, roughness: 0.35 });
    const fumaca = material(0x6e6c6a, { transparent: true, opacity: 0.22, depthWrite: false });
    peca(cilindro, nervura, cx, cy, zt + 0.001, 0.094, 0.094, 0.002);
    peca(cilindro, escura, cx, cy, zt + HT / 2, RT, RT, HT);
    for (let k = 0; k < 32; k++) {
      const a = (k * Math.PI * 2) / 32;
      bloco(nervura, cx + Math.cos(a) * RT, cy + Math.sin(a) * RT, 0.004, 0.006, HT, zt, a);
    }
    for (const z of [0.25, 0.6, 0.97]) peca(cilindro, nervura, cx, cy, zt + HT * z, RT * 1.045, RT * 1.045, 0.004);
    for (let q = 0; q < 4; q++) {
      const a = (q * Math.PI) / 2;
      bloco(sombra, cx + Math.cos(a) * (RT + 0.0015), cy + Math.sin(a) * (RT + 0.0015), 0.004, 0.02, 0.04, zt, a);
      for (let k = 0; k < 4; k++) bloco(nervura, cx + Math.cos(a) * (RT + 0.006 + k * 0.005), cy + Math.sin(a) * (RT + 0.006 + k * 0.005), 0.005, 0.03, 0.004 - k * 0.001, zt, a);
    }
    peca(cupula, negra, cx, cy, zt + HT, RT, RT, RT * 0.82);
    peca(cilindro, negra, cx, cy, zt + HT + RT * 0.82 + 0.004, 0.009, 0.009, 0.008);
    for (let k = 0; k < 11; k++) {
      const r = 0.014 + k * 0.006;
      peca(copa, fumaca, cx + k * k * 0.0012, cy + k * 0.003, zt + HT + RT * 0.82 + 0.016 + k * 0.026, r, r * 0.9, r * 0.7);
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
  return { L, u, n: nrm, ang: Math.atan2(u[1], u[0]), ponto };
}

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
  const cais = material(0xd6cfbd);
  const pedra = material(0xe4ddcc);
  const clara = material(0xf0ebde);
  const ardosia = material(0x66696d);
  const madeira = material(0x6b4a2e);
  const tabuado = material(0x7d5d3c);
  const ouro = material(0xd9b24c, { metalness: 0.7, roughness: 0.35 });
  const sombra = material(0x2f3439);
  const folhas = material(0x4d7636);
  const tronco = material(0x5b4633);
  const vinhas = [material(0x5d7a3a), material(0x7f9852)];
  const toldos = [material(0xd9c9a3), material(0xa8513c), material(0x3f6a8a)];
  const barcos = { casco: material(0x4a3222), conves: material(0x9a7550), mastro: material(0x5a412a), vela: material(0xf0e9d6), ouro };

  // A terra do porto, recortada pela costa: a face voltada para o mar é a muralha do cais.
  const contorno: THREE.Vector2[] = [];
  for (let k = 0; k <= 25; k++) {
    const y = Y_S + k * 0.05;
    contorno.push(new THREE.Vector2(caisX(y), y));
  }
  contorno.push(new THREE.Vector2(OESTE, Y_N), new THREE.Vector2(OESTE, Y_S));
  // grupos da extrusão: 0 = tampas (relva), 1 = faces (a muralha do cais voltada para o mar)
  const base = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape(contorno), { depth: 0.8, bevelEnabled: false }).translate(0, 0, -0.8), [material(0x6f8c45), cais]);
  base.name = 'Base';
  cidade.add(base);

  const norte = braco(caisX(Y_N), Y_N, 1);
  const sul = braco(caisX(Y_S), Y_S, -1);
  // bissetriz da terra entre os braços: decide de qual cais cada casa está mais perto
  const bis = [-(norte.u[0] + sul.u[0]), -(norte.u[1] + sul.u[1])];
  const doNorte = (x: number, y: number) => bis[0] * (y - APICE[1]) - bis[1] * (x - APICE[0]) <= 0;

  // Passeio do cais: parapeito, frades de amarração, guindastes; armazéns de madeira com toldos.
  const calcada = material(0xcfc7b3);
  for (const b of [norte, sul]) {
    const [mx, my] = b.ponto((b.L - 0.12) / 2, 0.035);
    bloco(calcada, mx, my, b.L - 0.02, 0.07, 0.0008, 0, b.ang);
    for (let t = 0.004; t < b.L - 0.004; t += 0.012) {
      const [x, y] = b.ponto(t, 0.002);
      bloco(cais, x, y, 0.0125, 0.0018, 0.0022, 0, b.ang);
      if (Math.round(t / 0.012) % 3 === 0) {
        const [fx, fy] = b.ponto(t, 0.006);
        peca(cilindro, sombra, fx, fy, 0.0012, 0.0008, 0.0008, 0.0024);
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
      const comp = 0.032 + rand() * 0.006, toldo = rand(), caixas = rand();
      o.casa(madeira, tabuado, x, y, 0, comp, 0.017, 0.0075, b.ang, false);
      const [tx, ty] = b.ponto(t, 0.043);
      if (toldo < 0.6) bloco(toldos[Math.floor(toldo * 5) % 3], tx, ty, comp * 0.7, 0.007, 0.0006, 0.0055, b.ang);
      if (caixas < 0.5) for (let k = 0; k < 3; k++) {
        const [kx, ky] = b.ponto(t + (k - 1) * 0.005, 0.03);
        bloco(tabuado, kx, ky, 0.003, 0.003, 0.003, 0, b.ang);
      }
    }
  }

  // Casas de pedra em fileiras paralelas ao cais, ruas a cada duas fileiras; torres quadradas entre elas.
  const CIDADELA = { x: -0.58, y: -0.05, lado: 0.14 };
  const TORRES: [number, number, number][] = [[-0.07, 0.05, 0.05], [-0.04, -0.09, 0.044], [-0.17, 0.12, 0.04], [-0.2, -0.12, 0.046], [0.04, 0.16, 0.038], [-0.32, 0.02, 0.042]];
  const ocupado = (x: number, y: number) =>
    Math.abs(x - CIDADELA.x) < CIDADELA.lado / 2 + 0.03 && Math.abs(y - CIDADELA.y) < CIDADELA.lado / 2 + 0.03 ||
    TORRES.some(([tx, ty]) => Math.hypot(x - tx, y - ty) < 0.022) ||
    Math.abs(y - CIDADELA.y) < 0.012 && x > CIDADELA.x && x < 0.0; // rua da cidadela ao cais
  for (const b of [norte, sul])
    for (let faixa = 0; faixa < 20; faixa++) {
      if (faixa % 3 === 2) continue;
      const d0 = 0.085 + faixa * 0.026;
      for (let t = -0.6; t < b.L; t += 0.023) {
        const d = d0 + (rand() - 0.5) * 0.008;
        const [x, y] = b.ponto(t + rand() * 0.005, d);
        const w = 0.012 + rand() * 0.014, p = 0.01 + rand() * 0.007, h = 0.008 + rand() * 0.013, sorte = rand(), extra = rand(), raro = rand();
        if (x < -0.7 || y > Y_N - 0.04 || y < Y_S + 0.04 || x > caisX(y) - 0.075) continue;
        if (doNorte(x, y) !== (b === norte) || ocupado(x, y)) continue;
        if (Math.abs(((t + 0.1) % 0.17) - 0.085) > 0.075) continue; // ruas transversais
        if (raro < (d - 0.16) / 0.42) { if (raro < 0.08 + (d - 0.16) / 2.4) o.arvore(tronco, folhas, x, y, 0, 0.008 + extra * 0.007); continue; } // rareia para o interior
        if (sorte < 0.08) o.arvore(tronco, folhas, x, y, 0, 0.009 + extra * 0.005);
        else if (sorte > 0.965) o.torreQuadrada(pedra, ardosia, ouro, x, y, 0, 0.012, 0.026 + extra * 0.012, b.ang);
        else {
          o.casa(sorte > 0.75 ? clara : pedra, ardosia, x, y, 0, w, p, h, b.ang + (extra - 0.5) * 0.14, sorte > 0.4);
          if (h > 0.014) {
            const [jx, jy] = o.giro(b.ang, 0, -p / 2 - 0.0002);
            o.janelas(sombra, x + jx - Math.cos(b.ang) * w * 0.35, y + jy - Math.sin(b.ang) * w * 0.35, x + jx + Math.cos(b.ang) * w * 0.35, y + jy + Math.sin(b.ang) * w * 0.35, 0.002, 2, 0.006, 0.0055, 0.003);
          }
        }
      }
    }
  for (const [x, y, h] of TORRES) o.torreQuadrada(clara, ardosia, ouro, x, y, 0, 0.018, h, norte.ang);

  // Cidadela no alto, com muralha, torres de canto, salão e torre de menagem.
  {
    const { x, y, lado } = CIDADELA, m = lado / 2;
    for (const [x0, y0, x1, y1] of [[-m, -m, m, -m], [m, -m, m, m], [m, m, -m, m], [-m, m, -m, -m]]) {
      const len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0);
      const porta = x0 === m && x1 === m; // lado leste, voltado para o porto
      if (porta) for (const s of [-1, 1]) bloco(pedra, x + m, y + (s * (m + 0.012)) / 2, m - 0.012, 0.007, 0.016, 0, Math.PI / 2);
      else bloco(pedra, x + (x0 + x1) / 2, y + (y0 + y1) / 2, len, 0.007, 0.016, 0, ang);
      o.ameiasLinha(pedra, x + x0, y + y0, x + x1, y + y1, 0.016);
      o.torreRedonda(pedra, ardosia, ouro, x + x0, y + y0, 0, 0.012, 0.034);
    }
    for (const s of [-1, 1]) o.torreQuadrada(pedra, ardosia, ouro, x + m + 0.006, y + s * 0.016, 0, 0.012, 0.026, 0);
    o.torreQuadrada(clara, ardosia, ouro, x - 0.025, y + 0.02, 0, 0.04, 0.075);
    o.casa(clara, ardosia, x + 0.02, y - 0.025, 0, 0.06, 0.026, 0.02, 0);
    o.janelas(sombra, x - 0.01, y - 0.0382, x + 0.05, y - 0.0382, 0, 2, 0.008, 0.009, 0.006);
    for (let k = 0; k < 6; k++) o.arvore(tronco, folhas, x + 0.035 + (k % 3) * 0.012, y + 0.03 + Math.floor(k / 3) * 0.014, 0, 0.009);
    bloco(material(0xcfc7b3), (x + m) / 2, y, -(x + m), 0.016, 0.0008, 0); // rua do portão até o cais (x = 0)
  }

  // Terraços de vinhas na encosta a oeste.
  for (let k = 0; k * 0.008 < 0.16; k++) bloco(vinhas[k % 2], OESTE + 0.012 + k * 0.008, (Y_N + Y_S) / 2, 0.005, Y_N - Y_S - 0.04, 0.0025);

  // No mar (nível da água, ajustado pela camada): molhes com faróis, píeres de madeira, navios e barcos.
  const mar = new THREE.Group();
  mar.name = 'Mar';
  const s = oficina(3310);
  const luz = material(0xffd27a, { emissive: 0xffb94a, emissiveIntensity: 0.9 });
  const molhe = (x0: number, y0: number, dx: number, dy: number, len: number, fora: 1 | -1) => {
    const L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, ang = Math.atan2(uy, ux);
    for (let t = 0; t < len; t += 0.015) {
      const x = x0 + ux * (t + 0.0075), y = y0 + uy * (t + 0.0075);
      s.bloco(cais, x, y, 0.0155, 0.018, 0.012, -0.007, ang);
      s.bloco(cais, x - uy * fora * 0.008, y + ux * fora * 0.008, 0.0155, 0.003, 0.004, 0.005, ang);
    }
    const fx = x0 + ux * len, fy = y0 + uy * len;
    s.peca(cilindro, cais, fx, fy, -0.002, 0.014, 0.014, 0.014);
    s.torreRedonda(clara, ardosia, ouro, fx, fy, 0.005, 0.0085, 0.042);
    s.peca(cilindro, luz, fx, fy, 0.049, 0.0062, 0.0062, 0.006);
  };
  const [rnx, rny] = norte.ponto(0.75, 0);
  molhe(rnx, rny, 0.25, -1, 0.42, 1);
  const [rsx, rsy] = sul.ponto(0.62, 0);
  molhe(rsx, rsy, 1, 0.62, 0.36, -1);

  const pieres: [ReturnType<typeof braco>, number][] = [[norte, 0.2], [norte, 0.36], [norte, 0.52], [sul, 0.2], [sul, 0.38]];
  for (const [b, t] of pieres) {
    const ang = Math.atan2(-b.n[1], -b.n[0]);
    const [x, y] = b.ponto(t, -0.036);
    s.bloco(tabuado, x, y, 0.072, 0.007, 0.0012, 0.004, ang);
    for (let k = 0; k < 6; k++) {
      const [px, py] = b.ponto(t, -0.004 - k * 0.0135);
      for (const l of [-1, 1]) s.peca(cilindro, madeira, px + Math.cos(b.ang) * l * 0.003, py + Math.sin(b.ang) * l * 0.003, 0.0005, 0.0006, 0.0006, 0.009);
    }
  }

  const frota = naviosRomenna(fase);
  for (const [x, y, ang] of frota.ancorados) s.navio(barcos, x, y, ang, false);
  for (const [x, y, ang] of frota.aVela) s.navio(barcos, x, y, ang, true);
  for (let k = 0; k < frota.barcos; k++) {
    const [b, t] = pieres[k % pieres.length];
    const lado = k % 2 ? 1 : -1;
    const [x, y] = b.ponto(t + lado * 0.009, -0.02 - (k % 3) * 0.02);
    s.barco(barcos, x, y, Math.atan2(-b.n[1], -b.n[0]));
  }

  o.finalizar(cidade);
  s.finalizar(mar);
  cidade.add(mar);
  return cidade;
}
