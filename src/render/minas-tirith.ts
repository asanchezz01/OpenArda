// Reconstrução artística: volumes em km, Z para cima, X para leste, chão do primeiro círculo em Z=0.
// Descrito em O Senhor dos Anéis (Livro V, cap. 1): sete níveis com muralha e portão cada, portões
// alternados, muralha externa negra, proa de rocha voltada a leste até o círculo mais alto, Cidadela a
// 700 pés da planície, Torre Branca de 50 braças, a Fonte e a Árvore Branca, e o ombro do Mindolluin atrás.
import * as THREE from 'three';
import type { FaseMinasTirith } from '../core/detalhes';
import { rng } from '../terrain/noise';
import { criarLotes } from './lotes';

const PE = 0.0003048; // km
const TORRE = 300 * PE; // 50 braças, da base ao pináculo
const raio = (i: number) => 0.62 - i * 0.08; // artístico
/** Chão do nível i (0–6); chao(7) é o parapeito da Cidadela, 700 pés acima da planície. */
const chao = (i: number) => i * 100 * PE;
const OMBRO = { de: -1.3, ate: -0.12, meia: 0.12, topo: 0.15 };

export function criarMinasTirith(fase: FaseMinasTirith): THREE.Group {
  const cidade = new THREE.Group();
  cidade.name = `Minas Tirith: ${fase}`;
  const rand = rng(2002);
  const { peca, bloco, finalizar } = criarLotes();
  const material = (cor: number) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.85 });
  const rocha = material(0x8a8676);
  const pedra = material(0xe6e3da);
  const telhado = material(0xb7b2a6);
  const negra = material(0x2d2f33);
  const branca = material(0xf7f6f1);
  const agua = material(0x72bdc4);
  const folhas = material(0xf1f4f6);
  const seca = material(0x8c877d);
  const disco = new THREE.CylinderGeometry(1, 1, 1, 48).rotateX(Math.PI / 2);
  const cilindro = new THREE.CylinderGeometry(1, 1, 1, 12).rotateX(Math.PI / 2);
  const cone = new THREE.ConeGeometry(1, 1, 12).rotateX(Math.PI / 2);
  const copa = new THREE.IcosahedronGeometry(1, 1);
  const noOmbro = (x: number, y: number) => x < OMBRO.ate + 0.02 && Math.abs(y) < OMBRO.meia + 0.01;

  // Ombro: seção trapezoidal (largura y, altura z) estendida de oeste para leste.
  const ombro = (meiaTopo: number, meiaBase: number, z0: number, z1: number) => {
    const secao = new THREE.Shape([new THREE.Vector2(-meiaBase, z0), new THREE.Vector2(meiaBase, z0), new THREE.Vector2(meiaTopo, z1), new THREE.Vector2(-meiaTopo, z1)]);
    const geo = new THREE.ExtrudeGeometry(secao, { depth: OMBRO.ate - OMBRO.de, bevelEnabled: false });
    geo.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, OMBRO.de, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));
    return new THREE.Mesh(geo, rocha);
  };

  // Só o que fica abaixo do primeiro círculo acompanha o exagero do relevo: a colina desce até a planície.
  const fundacao = new THREE.Group();
  fundacao.name = 'Rocha';
  const base = new THREE.Mesh(new THREE.CylinderGeometry(raio(0) + 0.04, 1.4, 0.8, 64, 2).rotateX(Math.PI / 2).translate(0, 0, -0.4), rocha);
  fundacao.add(base, ombro(OMBRO.meia + 0.12, 0.6, -0.8, 0));
  cidade.add(fundacao);

  // O ombro que liga a colina ao Mindolluin, com as casas dos mortos de Rath Dínen.
  cidade.add(ombro(OMBRO.meia, OMBRO.meia + 0.12, 0, OMBRO.topo));
  for (let i = 0; i < 9; i++) {
    const x = -0.3 - i * 0.075, y = (i % 2 ? 1 : -1) * 0.05;
    bloco(pedra, x, y, 0.03, 0.022, 0.012, OMBRO.topo);
    peca(copa, telhado, x, y, OMBRO.topo + 0.012, 0.013, 0.01, 0.008);
  }

  // Os sete níveis escavados na colina.
  for (let i = 1; i < 7; i++) peca(disco, pedra, 0, 0, (chao(i - 1) + chao(i)) / 2, raio(i), raio(i), chao(i) - chao(i - 1));

  // Muralhas: a externa é negra; cada portão alterna entre o lado sul e o norte, a partir do leste.
  for (let i = 0; i < 7; i++) {
    const r = raio(i);
    const portao = i === 0 ? 0 : i % 2 ? -0.7 : 0.7;
    const externa = i === 0;
    const h = externa ? 0.05 : i === 6 ? chao(7) - chao(6) + 0.002 : 0.022;
    const n = Math.ceil(Math.PI * 2 * r / 0.03);
    for (let k = 0; k < n; k++) {
      const a = k * Math.PI * 2 / n;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      const desvio = Math.abs(Math.atan2(Math.sin(a - portao), Math.cos(a - portao)));
      if (desvio * r < (externa ? 0.022 : 0.012) || noOmbro(x, y)) continue;
      bloco(externa ? negra : pedra, x, y, externa ? 0.014 : 0.008, Math.PI * 2 * r / n * 1.04, h, chao(i), a);
      if (externa && k % 6 === 0) bloco(negra, x, y, 0.022, 0.022, h + 0.012, chao(i), a);
    }
    for (const lado of [-1, 1]) {
      const a = portao + lado * (externa ? 0.05 : 0.04);
      bloco(externa ? negra : pedra, Math.cos(a) * r, Math.sin(a) * r, 0.02, 0.02, h + (externa ? 0.025 : 0.01), chao(i), a);
    }
  }
  bloco(negra, raio(0) - 0.004, 0, 0.008, 0.03, 0.035);

  // A proa de pedra, afiada como a quilha de um navio, divide todos os círculos menos o primeiro.
  const quilha = new THREE.Shape([new THREE.Vector2(0.5, 0), new THREE.Vector2(raio(6), 0.05), new THREE.Vector2(raio(6), -0.05)]);
  const proa = new THREE.Mesh(new THREE.ExtrudeGeometry(quilha, { depth: chao(7), bevelEnabled: false }), rocha);
  proa.name = 'Proa';
  cidade.add(proa);
  for (let k = 0; k < 4; k++) bloco(pedra, 0.49 - k * 0.012, 0, 0.008, 0.012 + k * 0.006, 0.008, chao(7));

  // Casas em fileiras: as mesmas sementes conservam o traçado entre épocas.
  for (let i = 0; i < 6; i++) {
    for (let fila = 0; fila < 2; fila++) {
      const r = raio(i + 1) + 0.018 + fila * 0.028;
      const n = Math.floor(Math.PI * 2 * r / 0.026);
      for (let k = 0; k < n; k++) {
        const a = (k + fila * 0.5) * Math.PI * 2 / n;
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        const w = 0.012 + rand() * 0.01, d = 0.012 + rand() * 0.006, h = 0.008 + rand() * 0.012, vazio = rand() < 0.2;
        if (vazio || x > 0 && Math.abs(y) < 0.065 || noOmbro(x, y)) continue;
        bloco(pedra, x, y, d, w, h, chao(i), a);
        bloco(telhado, x, y, d * 1.05, w * 1.05, 0.002, chao(i) + h, a);
      }
    }
  }

  // Cidadela: Pátio da Fonte, Árvore Branca e Torre de Ecthelion.
  const z = chao(6);
  bloco(branca, -0.045, 0, 0.06, 0.04, 0.022, z);
  peca(cilindro, branca, -0.045, 0, z + (TORRE - 0.012) / 2, 0.011, 0.011, TORRE - 0.012);
  peca(cone, telhado, -0.045, 0, z + TORRE - 0.006, 0.012, 0.012, 0.012);
  peca(cilindro, pedra, 0.035, -0.012, z + 0.001, 0.007, 0.007, 0.002);
  peca(cilindro, agua, 0.035, -0.012, z + 0.0022, 0.0055, 0.0055, 0.0005);
  if (fase !== 'sem-arvore') {
    const viva = fase === 'arvore-viva';
    peca(cilindro, viva ? branca : seca, 0.045, 0.012, z + 0.006, 0.0012, 0.0012, 0.012);
    if (viva) peca(copa, folhas, 0.045, 0.012, z + 0.015, 0.007, 0.007, 0.005);
    else for (let k = 0; k < 4; k++) bloco(seca, 0.045, 0.012, 0.009, 0.0008, 0.0008, z + 0.009 + k * 0.0018, k * 1.3);
  }

  finalizar(cidade);
  return cidade;
}
