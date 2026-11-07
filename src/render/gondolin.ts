// Reconstrução artística: volumes em km, Z para cima, chão da cidade em Z=0.
import * as THREE from 'three';
import type { FaseGondolin } from '../core/detalhes';
import { rng } from '../terrain/noise';
import { criarLotes } from './lotes';

export function criarGondolin(fase: FaseGondolin): THREE.Group {
  const cidade = new THREE.Group();
  cidade.name = `Gondolin: ${fase}`;
  const ruinas = fase === 'ruinas';
  const obra = fase === 'construcao';
  const rand = rng(510);
  const material = (cor: number) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.85 });
  const pedra = material(ruinas ? 0x777571 : 0xe3ded0);
  const calcario = material(ruinas ? 0x8d887c : 0xf6edd9);
  const piso = material(ruinas ? 0x7d7768 : 0xc5bda5);
  const rocha = material(0x827d6b);
  const telhado = material(0x607e85);
  const sombra = material(0x39464a);
  const verde = material(0x426f50);
  const agua = material(0x72bdc4);
  const ouro = material(0xd9ad54);
  const prata = material(0xcadce2);
  const { caixa, peca, bloco, finalizar } = criarLotes();
  const cilindro = new THREE.CylinderGeometry(1, 1, 1, 12).rotateX(Math.PI / 2);
  const cone = new THREE.ConeGeometry(1, 1, 12).rotateX(Math.PI / 2);
  const copa = new THREE.IcosahedronGeometry(1, 1);
  const transform = new THREE.Object3D();

  function torre(x: number, y: number, r: number, altura: number, z = 0) {
    const h = altura * (ruinas ? 0.2 + rand() * 0.25 : obra ? 0.45 : 1);
    peca(cilindro, pedra, x, y, z + h / 2, r, r, h);
    if (ruinas || obra) return;
    for (const nivel of [0.12, 0.72, 0.96]) peca(cilindro, calcario, x, y, z + h * nivel, r * 1.13, r * 1.13, 0.025);
    peca(cone, telhado, x, y, z + h + r * 1.2, r * 1.24, r * 1.24, r * 2.4);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      bloco(sombra, x + Math.cos(a) * r, y + Math.sin(a) * r, 0.027, 0.009, h * 0.16, z + h * 0.61, a - Math.PI / 2);
    }
  }

  // O soco rochoso prolonga o relevo existente; só ele acompanha o exagero vertical.
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 4.0, 0.8, 64, 4).rotateX(Math.PI / 2), rocha);
  base.geometry.translate(0, 0, -0.4);
  base.name = 'Amon Gwareth';
  cidade.add(base);
  peca(cilindro, piso, 0, 0, 0.015, 2.83, 2.83, 0.03);

  // Uma muralha urbana, com abertura ao sul; os sete portões pertencem à passagem nas montanhas.
  const n = 72;
  for (let i = 0; i < n; i++) {
    const a = i * Math.PI * 2 / n;
    if (i >= 53 && i <= 55 || ruinas && i % 7 === 0) continue;
    const x = Math.cos(a) * 2.65, y = Math.sin(a) * 2.65;
    const h = ruinas ? 0.06 + rand() * 0.13 : obra ? 0.12 : 0.29;
    bloco(pedra, x, y, 0.255, 0.09, h, 0.03, a + Math.PI / 2);
    if (!ruinas && !obra) {
      for (const offset of [-0.085, 0, 0.085]) {
        bloco(calcario, x - Math.sin(a) * offset, y + Math.cos(a) * offset, 0.042, 0.11, 0.055, h + 0.03, a + Math.PI / 2);
      }
    }
    if (i % 6 === 0) torre(x, y, 0.11, 0.47, 0.03);
  }

  // Escadaria e pórtico de entrada.
  const escadaria = new THREE.InstancedMesh(caixa, pedra, 24);
  escadaria.name = 'Escadaria';
  escadaria.position.z = 0.035;
  for (let i = 0; i < escadaria.count; i++) {
    const y = -3.88 + i * 0.045;
    const topo = Math.min(0, (2.9 + y) * 0.8 / 1.1);
    transform.position.set(0, y, (topo - 0.8) / 2);
    transform.rotation.set(0, 0, 0);
    transform.scale.set(0.45, 0.06, topo + 0.8);
    transform.updateMatrix();
    escadaria.setMatrixAt(i, transform.matrix);
  }
  escadaria.computeBoundingSphere();
  cidade.add(escadaria);
  torre(-0.25, -2.61, 0.16, 0.62, 0.03);
  torre(0.25, -2.61, 0.16, 0.62, 0.03);
  if (!ruinas && !obra) bloco(calcario, 0, -2.61, 0.38, 0.18, 0.10, 0.32);

  // Avenidas abertas e praça central: os quarteirões preservam esses vazios.
  bloco(calcario, 0, -0.95, 0.22, 3.22, 0.018, 0.031);
  bloco(calcario, 0, -0.25, 4.6, 0.16, 0.018, 0.032);
  peca(cilindro, calcario, 0, -0.35, 0.045, 0.64, 0.64, 0.025);
  for (let rua = 0; rua < 3; rua++) {
    const r = 1.05 + rua * 0.58;
    const anel = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.055, 80), calcario);
    anel.position.z = 0.035;
    cidade.add(anel);
  }

  // Bairro residencial: as mesmas sementes conservam o traçado entre épocas.
  for (let faixa = 0; faixa < 3; faixa++) {
    const raio = 0.86 + faixa * 0.62;
    const total = 22 + faixa * 18;
    for (let i = 0; i < total; i++) {
      const a = i * Math.PI * 2 / total + faixa * 0.13;
      const x = Math.cos(a) * raio, y = Math.sin(a) * raio;
      const w = 0.11 + rand() * 0.09, d = 0.15 + rand() * 0.1, h = 0.13 + rand() * 0.15;
      const variacao = rand();
      if (Math.abs(x) < 0.24 || Math.abs(y + 0.25) < 0.19 || y > 0.2 && Math.abs(x) < 0.64) continue;
      if (obra && i % 3 === 0) continue;
      const altura = h * (ruinas ? 0.12 + variacao * 0.35 : obra ? 0.4 : 1);
      bloco(pedra, x, y, w, d, altura, 0.04, a);
      if (!ruinas && !obra) {
        bloco(calcario, x, y, w * 1.08, d * 1.08, 0.025, altura + 0.04, a);
        peca(cone, telhado, x, y, altura + 0.115, w * 0.76, d * 0.76, 0.13, a);
        bloco(sombra, x + Math.cos(a) * w * 0.51, y + Math.sin(a) * w * 0.51, 0.012, d * 0.33, altura * 0.35, altura * 0.45, a);
      }
      if (i % 8 === 0) torre(x * 0.94, y * 0.94, 0.065, 0.48, 0.04);
      if (ruinas) bloco(pedra, x + 0.12, y - 0.08, w * 0.8, d * 0.6, 0.04, 0.04, a + 0.6);
    }
  }

  // Pátio, salão de Turgon e Torre do Rei.
  bloco(calcario, 0, 0.7, 1.2, 1.12, 0.07, 0.04);
  const palacioH = ruinas ? 0.13 : obra ? 0.18 : 0.38;
  bloco(pedra, 0, 0.75, 0.74, 0.66, palacioH, 0.11);
  for (const x of [-0.49, 0.49]) {
    bloco(pedra, x, 0.72, 0.2, 0.9, palacioH * 0.7, 0.11);
    torre(x, 1.12, 0.1, 0.65, 0.11);
  }
  torre(0, 0.92, 0.19, 1.32, 0.11);
  for (let i = 0; i < 6; i++) bloco(calcario, 0, 0.1 + i * 0.055, 0.58, 0.07, 0.014 * (i + 1), 0.04);
  if (!ruinas && !obra) {
    for (let i = -3; i <= 3; i++) {
      peca(cilindro, calcario, i * 0.09, 0.39, 0.26, 0.019, 0.019, 0.30);
    }
    bloco(calcario, 0, 0.39, 0.7, 0.15, 0.06, 0.41);
  }

  // Jardins, fontes e imagens de Glingal e Belthil, sem emissões mágicas.
  if (!ruinas && !obra) {
    for (let i = 0; i < 36; i++) {
      const a = i * Math.PI / 18, r = i % 2 ? 1.42 : 2.41;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (Math.abs(x) < 0.25 || Math.abs(y + 0.25) < 0.2) continue;
      peca(cilindro, verde, x, y, 0.041, 0.12, 0.12, 0.018);
      peca(cilindro, rocha, x, y, 0.10, 0.018, 0.018, 0.13);
      peca(copa, verde, x, y, 0.24, 0.07, 0.07, 0.15);
    }
    for (const [x, y, r] of [[0, -0.48, 0.19], [-1.43, -0.25, 0.10], [1.43, -0.25, 0.10]]) {
      peca(cilindro, pedra, x, y, 0.07, r, r, 0.07);
      peca(cilindro, agua, x, y, 0.108, r * 0.8, r * 0.8, 0.008);
      peca(cilindro, calcario, x, y, 0.16, r * 0.13, r * 0.13, 0.15);
      peca(cilindro, agua, x, y, 0.23, r * 0.45, r * 0.45, 0.016);
    }
    for (const [x, mat] of [[-0.46, ouro], [0.46, prata]] as const) {
      peca(cilindro, calcario, x, 0.06, 0.08, 0.10, 0.10, 0.08);
      peca(cilindro, mat, x, 0.06, 0.23, 0.025, 0.025, 0.25);
      for (const [dx, dy, dz] of [[0, 0, 0.38], [-0.06, 0, 0.31], [0.06, 0, 0.32], [0, 0.055, 0.34]]) {
        peca(copa, mat, x + dx, 0.06 + dy, dz, 0.075, 0.065, 0.085);
      }
    }
  }

  finalizar(cidade);
  return cidade;
}
