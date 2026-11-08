// Reconstrução artística a partir de fotografias/gondolin-pe400.webp; volumes em km, Z para cima.
import * as THREE from 'three';
import type { FaseGondolin } from '../core/detalhes';
import { rng } from '../terrain/noise';
import { criarLotes } from './lotes';

export function criarGondolin(fase: FaseGondolin): THREE.Group {
  const cidade = new THREE.Group();
  cidade.name = `Gondolin: ${fase}`;
  const ruinas = fase === 'ruinas';
  const obra = fase === 'construcao';
  const completa = !ruinas && !obra;
  const rand = rng(510), dano = rng(511);
  const material = (cor: number) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.88 });
  const pedra = material(ruinas ? 0x858177 : 0xe6dfce);
  const calcario = material(ruinas ? 0x999181 : 0xf5efdf);
  const piso = material(ruinas ? 0x807966 : 0xcfc5ad);
  const rocha = material(0x827d6b);
  const telhado = material(0xc3c6bb);
  const sombra = material(0x46504c);
  const verde = material(0x426043);
  const agua = material(0x77aaa5);
  const ouro = material(0xd9ad54);
  const prata = material(0xcadce2);
  const { caixa, peca, bloco, finalizar } = criarLotes();
  const cilindro = new THREE.CylinderGeometry(1, 1, 1, 16).rotateX(Math.PI / 2);
  const plataforma = new THREE.CylinderGeometry(1, 1, 1, 96).rotateX(Math.PI / 2);
  plataforma.name = 'Plataformas dos terraços';
  const cupula = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2);
  cupula.name = 'Cúpulas';
  const telhadoQuatroAguas = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).rotateX(Math.PI / 2);
  const copa = new THREE.IcosahedronGeometry(1, 1);

  const abertura = new THREE.Shape();
  abertura.moveTo(-0.5, 0);
  abertura.lineTo(0.5, 0);
  abertura.lineTo(0.5, 0.5);
  abertura.absarc(0, 0.5, 0.5, 0, Math.PI, false);
  abertura.closePath();
  const janela = new THREE.ShapeGeometry(abertura, 6).rotateX(Math.PI / 2).translate(0, 0, -0.5);
  janela.name = 'Janelas em arco';
  const moldura = new THREE.Shape();
  moldura.moveTo(-0.5, 0);
  moldura.lineTo(-0.5, 0.5);
  moldura.absarc(0, 0.5, 0.5, Math.PI, 0, true);
  moldura.lineTo(0.5, 0);
  moldura.lineTo(0.35, 0);
  moldura.lineTo(0.35, 0.5);
  moldura.absarc(0, 0.5, 0.35, 0, Math.PI, false);
  moldura.lineTo(-0.35, 0);
  moldura.closePath();
  const arco = new THREE.ExtrudeGeometry(moldura, { depth: 1, bevelEnabled: false, curveSegments: 6 })
    .rotateX(Math.PI / 2).translate(0, 0.5, -0.5);
  arco.name = 'Arcadas de pedra';

  function altura(h: number) {
    return h * (ruinas ? 0.16 + dano() * 0.22 : obra ? 0.48 : 1);
  }

  function fachada(x: number, y: number, w: number, d: number, h: number, z: number, ang: number, nobre = false) {
    for (let lado = 0; lado < 4; lado++) {
      const a = ang + lado * Math.PI / 2;
      const largura = lado % 2 ? d : w, profundidade = lado % 2 ? w : d;
      const n = Math.max(1, Math.floor(largura / (nobre ? 0.14 : 0.07)));
      for (const nivel of h > 1 ? [0.30, 0.53, 0.77] : h > 0.24 ? [0.30, 0.71] : [0.57]) {
        for (let i = 0; i < n; i++) {
          const dx = ((i + 0.5) / n - 0.5) * largura * 0.82;
          const px = x + Math.cos(a) * dx + Math.sin(a) * (profundidade / 2 + 0.003);
          const py = y + Math.sin(a) * dx - Math.cos(a) * (profundidade / 2 + 0.003);
          const ww = Math.min(nobre ? 0.075 : 0.034, largura / n * 0.48);
          const hh = nobre ? h > 1 ? 0.18 : 0.115 : 0.055;
          peca(janela, sombra, px, py, z + h * nivel, ww, 1, hh, a);
          if (nobre) peca(arco, calcario, px, py, z + h * nivel, ww * 1.35, 0.018, hh * 1.12, a);
          else bloco(calcario, px, py, ww * 1.4, 0.012, 0.009, z + h * nivel - hh / 2, a);
        }
      }
    }
  }

  function edificio(x: number, y: number, w: number, d: number, h: number, z: number, ang = 0, nobre = false) {
    const hh = altura(h);
    bloco(pedra, x, y, w, d, hh, z, ang);
    bloco(calcario, x, y, w * 1.04, d * 1.04, 0.018, z, ang);
    if (ruinas) {
      bloco(pedra, x + w * 0.6, y - d * 0.3, w * 0.6, d * 0.5, 0.028, z, ang + 0.3);
      return;
    }
    if (obra) return;
    bloco(sombra, x, y, w * 1.035, d * 1.035, 0.012, z + hh - 0.008, ang);
    bloco(calcario, x, y, w * 1.12, d * 1.10, 0.024, z + hh, ang);
    peca(telhadoQuatroAguas, telhado, x, y, z + hh + 0.085, w * 1.14, d * 1.12, 0.13, ang);
    fachada(x, y, w, d, hh, z, ang, nobre);
    if (nobre) {
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        bloco(calcario, x + sx * w * 0.47, y + sy * d * 0.47, 0.035, 0.035, hh, z);
      }
    }
  }

  function torre(x: number, y: number, r: number, h: number, z: number, real = false) {
    const hh = altura(h);
    if (real) bloco(pedra, x, y, r * 1.8, r * 1.8, hh, z);
    else peca(cilindro, pedra, x, y, z + hh / 2, r, r, hh);
    if (!completa) return;
    if (real) {
      fachada(x, y, r * 1.8, r * 1.8, hh, z, 0, true);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        bloco(calcario, x + sx * r * 0.87, y + sy * r * 0.87, 0.018, 0.018, hh, z);
      }
      for (const nivel of [0.08, 0.42, 0.82, 1]) {
        bloco(calcario, x, y, r * 2.12, r * 2.12, 0.025, z + hh * nivel);
      }
    } else {
      for (const nivel of [0.10, 0.72, 0.98]) peca(cilindro, calcario, x, y, z + hh * nivel, r * 1.12, r * 1.12, 0.024);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        peca(janela, sombra, x + Math.sin(a) * r * 1.003, y - Math.cos(a) * r * 1.003, z + hh * 0.64, r * 0.30, 1, hh * 0.18, a);
      }
    }
    const lanternim = real ? 0.24 : r * 0.75;
    peca(cilindro, piso, x, y, z + hh + lanternim / 2, r * 0.94, r * 0.94, lanternim);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const px = x + Math.sin(a) * r * 0.96, py = y - Math.cos(a) * r * 0.96;
      peca(janela, sombra, px, py, z + hh + lanternim * 0.51, r * 0.43, 1, lanternim * 0.78, a);
      if (real) peca(arco, calcario, px, py, z + hh + lanternim / 2, r * 0.57, 0.027, lanternim, a);
    }
    peca(cilindro, calcario, x, y, z + hh + lanternim, r * 1.17, r * 1.17, 0.025);
    peca(cupula, telhado, x, y, z + hh + lanternim + 0.012, r * 1.19, r * 1.19, r * 1.30);
    peca(cilindro, prata, x, y, z + hh + lanternim + r * 1.30 + 0.045, 0.008, 0.008, 0.09);
  }

  // Só o soco e a escadaria de acesso acompanham o exagero do relevo.
  const geoBase = new THREE.CylinderGeometry(2.9, 4.0, 0.8, 96, 8).rotateX(Math.PI / 2).translate(0, 0, -0.4);
  const vertices = geoBase.getAttribute('position');
  const cores = new Float32Array(vertices.count * 3);
  const cor = new THREE.Color();
  const corPedra = new THREE.Color(0x9b9787), corRelva = new THREE.Color(0x62724e);
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
    const a = Math.atan2(y, x), k = Math.max(0, Math.min(1, -z / 0.8));
    const dobra = 1 + Math.sin(k * Math.PI) * (Math.sin(a * 17 + k * 8) * 0.017 + Math.cos(a * 31 - k * 6) * 0.012);
    vertices.setXYZ(i, x * dobra, y * dobra, z);
    const relva = THREE.MathUtils.smoothstep(Math.sin(a * 5 + k * 4) + Math.cos(a * 11) * 0.4, -0.3, 0.8);
    cor.copy(corPedra).lerp(corRelva, relva).multiplyScalar(0.88 + Math.sin(a * 23 + k * 14) * 0.1);
    cor.toArray(cores, i * 3);
  }
  geoBase.setAttribute('color', new THREE.BufferAttribute(cores, 3));
  geoBase.computeVertexNormals();
  const materialBase = material(0xffffff);
  materialBase.vertexColors = true;
  const base = new THREE.Mesh(geoBase, materialBase);
  base.name = 'Amon Gwareth';
  cidade.add(base);
  peca(plataforma, piso, 0, 0, 0.015, 2.83, 2.83, 0.03);

  // Terraços de contenção e jardins, não sete muralhas/portões dentro da cidade.
  const niveis = [{ r: 2.68, z: 0.04 }, { r: 2.10, z: 0.25 }, { r: 1.53, z: 0.48 }, { r: 0.97, z: 0.72 }];
  for (let nivel = 1; nivel < niveis.length; nivel++) {
    const { r, z } = niveis[nivel], anterior = niveis[nivel - 1].z;
    peca(plataforma, pedra, 0, 0, (z + anterior) / 2, r, r, z - anterior);
    peca(plataforma, calcario, 0, 0, z - 0.012, r * 1.01, r * 1.01, 0.024);
    for (let i = 0; i < 64; i++) {
      const a = i * Math.PI / 32, x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (y < 0 && Math.abs(x) < 0.34 || ruinas && i % 9 === 0) continue;
      bloco(pedra, x, y, r * Math.PI / 31, 0.045, ruinas ? 0.035 : 0.09, z, a + Math.PI / 2);
      if (completa) {
        bloco(calcario, x, y, r * Math.PI / 31, 0.058, 0.014, z + 0.09, a + Math.PI / 2);
        if (i % 2 === 0) peca(janela, sombra, x * 1.003, y * 1.003, anterior + (z - anterior) * 0.44, 0.065, 1, (z - anterior) * 0.73, a + Math.PI / 2);
      }
    }
    for (let i = 0; i < 14; i++) {
      const h = (z - anterior) * (i + 1) / 14;
      const y = -r - 0.36 + i * 0.031;
      bloco(calcario, 0, y, 0.54, 0.045, h, anterior);
      for (const x of [-0.30, 0.30]) bloco(pedra, x, y, 0.035, 0.046, h + 0.08, anterior);
    }
  }

  const n = 96;
  for (let i = 0; i < n; i++) {
    const a = i * Math.PI * 2 / n;
    if (i >= 71 && i <= 73 || ruinas && i % 7 === 0) continue;
    const x = Math.cos(a) * 2.65, y = Math.sin(a) * 2.65;
    const h = ruinas ? 0.06 + dano() * 0.12 : obra ? 0.13 : 0.27;
    bloco(pedra, x, y, 0.182, 0.10, h, 0.03, a + Math.PI / 2);
    if (completa) {
      bloco(calcario, x, y, 0.185, 0.12, 0.022, h + 0.03, a + Math.PI / 2);
      for (const offset of [-0.06, 0.06]) bloco(calcario, x - Math.sin(a) * offset, y + Math.cos(a) * offset, 0.036, 0.11, 0.045, h + 0.052, a + Math.PI / 2);
      if (i % 2 === 0) bloco(calcario, x * 1.019, y * 1.019, 0.024, 0.03, h * 0.83, 0.03, a + Math.PI / 2);
    }
    if (i % 8 === 0) torre(x, y, 0.09, 0.40, 0.03);
  }

  const escadaria = new THREE.InstancedMesh(caixa, pedra, 24);
  escadaria.name = 'Escadaria';
  escadaria.position.z = 0.035;
  const transform = new THREE.Object3D();
  for (let i = 0; i < escadaria.count; i++) {
    const y = -3.88 + i * 0.045;
    const topo = Math.min(0, (2.9 + y) * 0.8 / 1.1);
    transform.position.set(0, y, (topo - 0.8) / 2);
    transform.scale.set(0.52, 0.06, topo + 0.8);
    transform.updateMatrix();
    escadaria.setMatrixAt(i, transform.matrix);
  }
  escadaria.computeBoundingSphere();
  cidade.add(escadaria);
  torre(-0.30, -2.61, 0.14, 0.55, 0.03);
  torre(0.30, -2.61, 0.14, 0.55, 0.03);
  if (completa) peca(arco, calcario, 0, -2.66, 0.26, 0.38, 0.22, 0.46);

  // Bairros em patamares: a semente da planta não depende dos danos de cada época.
  for (let faixa = 0; faixa < 3; faixa++) {
    const { z } = niveis[faixa], raio = [2.38, 1.81, 1.25][faixa], total = [68, 48, 32][faixa];
    for (let i = 0; i < total; i++) {
      const a = i * Math.PI * 2 / total + faixa * 0.11;
      const r = raio + (rand() - 0.5) * 0.045;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      const w = 0.13 + rand() * 0.07, d = 0.20 + rand() * 0.08, h = 0.19 + rand() * 0.14 + faixa * 0.045;
      if (y < 0 && Math.abs(x) < 0.37 || Math.abs(y) < 0.10) continue;
      if (obra && i % 4 === 0) continue;
      edificio(x, y, w, d, h, z + 0.008, a + Math.PI / 2);
      if (i % 11 === 0) torre(x * 0.98, y * 0.98, 0.065, 0.48 + faixa * 0.04, z);
    }
  }

  // Palácio elevado, alas porticadas e Torre do Rei quadrada com lanternim e cúpula.
  bloco(calcario, 0, 0.25, 1.30, 0.90, 0.07, 0.72);
  edificio(0, 0.38, 0.66, 0.59, 0.46, 0.79, 0, true);
  for (const x of [-0.53, 0.53]) {
    edificio(x, 0.28, 0.23, 0.74, 0.32, 0.79, 0, true);
    torre(x, 0.62, 0.105, 0.63, 0.79);
  }
  torre(0, 0.58, 0.14, 1.45, 0.85, true);
  if (completa) {
    for (let i = -3; i <= 3; i++) {
      const x = i * 0.09;
      peca(janela, sombra, x, 0.055, 0.96, 0.067, 1, 0.27);
      peca(arco, calcario, x, 0.025, 0.96, 0.09, 0.095, 0.30);
    }
    bloco(calcario, 0, 0.025, 0.74, 0.17, 0.04, 1.11);
    for (const x of [-0.31, 0.31]) torre(x, 0.38, 0.057, 0.44, 1.25);
  }

  if (completa) {
    // Praças, parterres e fontes em vários níveis; sem luzes ou partículas adicionais.
    for (let nivel = 0; nivel < 3; nivel++) {
      const { z } = niveis[nivel], r = [2.15, 1.58, 1.03][nivel] + 0.09;
      for (let i = 0; i < 28; i++) {
        const a = i * Math.PI / 14, x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (y < 0 && Math.abs(x) < 0.39) continue;
        peca(cilindro, calcario, x, y, z + 0.013, 0.091, 0.091, 0.025);
        peca(cilindro, verde, x, y, z + 0.029, 0.078, 0.078, 0.01);
        peca(cilindro, rocha, x, y, z + 0.09, 0.012, 0.012, 0.12);
        peca(copa, verde, x, y, z + 0.20, 0.07, 0.075, 0.13);
        peca(copa, verde, x + 0.032, y, z + 0.17, 0.06, 0.055, 0.08);
      }
    }
    for (const [x, y, z, r] of [[0, -0.57, 0.72, 0.21], [-1.8, 0, 0.25, 0.11], [1.8, 0, 0.25, 0.11]]) {
      peca(cilindro, pedra, x, y, z + 0.037, r, r, 0.074);
      peca(cilindro, agua, x, y, z + 0.077, r * 0.83, r * 0.83, 0.008);
      peca(cilindro, calcario, x, y, z + 0.14, r * 0.11, r * 0.11, 0.15);
      for (const [h, tamanho] of [[0.18, 0.50], [0.27, 0.27]]) {
        peca(cilindro, calcario, x, y, z + h, r * tamanho, r * tamanho, 0.025);
        peca(cilindro, agua, x, y, z + h + 0.015, r * tamanho * 0.88, r * tamanho * 0.88, 0.008);
      }
    }
    for (const [x, mat] of [[-0.43, ouro], [0.43, prata]] as const) {
      peca(cilindro, calcario, x, -0.36, 0.76, 0.085, 0.085, 0.08);
      peca(cilindro, mat, x, -0.36, 0.88, 0.018, 0.018, 0.20);
      for (const [dx, dy, dz] of [[0, 0, 1.05], [-0.055, 0, 0.99], [0.055, 0, 1.01], [0, 0.04, 1.02]]) {
        peca(copa, mat, x + dx, -0.36 + dy, dz, 0.065, 0.055, 0.07);
      }
    }
  }
  if (obra) {
    for (const x of [-0.24, 0.24]) for (const y of [0.34, 0.80]) {
      bloco(rocha, x, y, 0.018, 0.018, 0.95, 0.79);
      bloco(rocha, 0, y, 0.52, 0.028, 0.025, 1.60);
    }
  }
  if (ruinas) {
    for (let i = 0; i < 72; i++) {
      const a = i * Math.PI / 18, r = 1.7 + dano() * 0.78;
      peca(copa, pedra, Math.cos(a) * r, Math.sin(a) * r, 0.075, 0.025 + dano() * 0.05, 0.04, 0.04);
    }
  }

  finalizar(cidade);
  return cidade;
}
