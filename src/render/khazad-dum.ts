import * as THREE from 'three';
import type { Pt } from '../core/types';
import { maquete } from './arquitetura';
import { cantaria, madeira, pedraEscura } from './numenor-acabamentos';
import { cilindro, copa, material } from './oficina';

const rocha = pedraEscura.clone();
rocha.color.setHex(0x657075);
const alvenaria = cantaria.clone();
alvenaria.color.setHex(0x838382);
const polida = material(0x373b40, { roughness: 0.31 });
const pedra = material(0x65666a, { map: rocha.map, bumpMap: rocha.bumpMap, bumpScale: 0.00065 });
const moldura = material(0x94908a, { map: rocha.map });
const sombra = new THREE.MeshBasicMaterial({ color: 0x151a22 });
const laje = [0x626464, 0x6c6d6a, 0x74736c, 0x7c7b73].map((cor) => material(cor, { map: rocha.map, roughness: 0.56 }));
const veio = [0x4c565b, 0x566268, 0x64696a, 0x757770].map((cor) => material(cor, { map: rocha.map, roughness: 0.96, flatShading: true }));
const cristal = material(0xffdb9a, { emissive: 0xe5a34d, emissiveIntensity: 0.9 });
const luzColonia = material(0xffa949, { emissive: 0xf17d2e, emissiveIntensity: 0.85 });
const ornato = material(0xb8c5c2, { emissive: 0x4c6e74, emissiveIntensity: 0.75 });
const marmore = material(0xe7e7d9, { map: rocha.map, roughness: 0.4 });
const ferro = material(0x383939, { roughness: 0.48, metalness: 0.35 });
const pergaminho = material(0x92816a, { roughness: 0.93 });
const agua = material(0x253538, { roughness: 0.29, bumpMap: rocha.bumpMap, bumpScale: 0.0004 });
const ondulacao = material(0x415359, { roughness: 0.34 });
const folhas = [0x3b4533, 0x4d5034, 0x62603e].map((cor) => material(cor, { flatShading: true }));
const estratos = material(0x67706f, { map: rocha.map, bumpMap: rocha.bumpMap, bumpScale: 0.002, vertexColors: true });
const valeEscuro = material(0x11151a, { roughness: 1 });

/** Rocha em anéis irregulares com juntas inclinadas que atravessam o corte. */
function macico(o: ReturnType<typeof maquete>, x: number, y: number, w: number, d: number, base: number, h: number, topo: number) {
  const geo = new THREE.BufferGeometry();
  const posição: number[] = [], uv: number[] = [], cor: number[] = [], faces: number[] = [];
  const lados = 32, andares = 7;
  const contorno = Array.from({ length: lados }, () => 0.87 + o.rand() * 0.18);
  for (let j = 0; j <= andares; j++) {
    const f = j / andares, r = THREE.MathUtils.lerp(1, topo, f);
    for (let i = 0; i <= lados; i++) {
      const a = 2 * Math.PI * (i % lados) / lados;
      const borda = r * contorno[i % lados] * (1 + 0.045 * Math.sin(i % lados * 2.9 + j * 4));
      const dx = w * 0.5 * Math.cos(a) * borda, dy = d * 0.5 * Math.sin(a) * borda;
      const z = base + h * (f + f * (0.04 * Math.sin(a * 3 + j) + 0.13 * dy / d - 0.09 * dx / w));
      posição.push(x + dx, y + dy, z);
      uv.push(i * 0.09, z * 9);
      const tom = 0.67 + 0.11 * Math.sin(i % lados * 2.1 + j * 1.3) + 0.14 * Math.sin(j * 3.2 + Math.cos(a) * 2.8);
      cor.push(tom, tom, tom * 1.03);
      if (j && i) {
        const b = j * (lados + 1) + i, c = b - lados - 1;
        faces.push(c - 1, c, b, c - 1, b, b - 1);
      }
    }
  }
  const centro = posição.length / 3;
  posição.push(x, y, base + h * 1.035);
  uv.push(x * 9, y * 9);
  cor.push(0.79, 0.79, 0.8);
  for (let i = 0; i < lados; i++) {
    const k = (andares * (lados + 1) + i) * 3;
    posição.push(posição[k], posição[k + 1], posição[k + 2]);
    uv.push(posição[k] * 9, posição[k + 1] * 9);
    cor.push(cor[k], cor[k + 1], cor[k + 2]);
    faces.push(centro, centro + 1 + i, centro + 1 + (i + 1) % lados);
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(posição, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3));
  geo.setIndex(faces);
  geo.computeVertexNormals();
  o.grupo.add(new THREE.Mesh(geo, estratos));
}

// X leste, Y norte, Z acima, em quilômetros de maquete. A travessia é comprimida entre os dois portões.
export function criarKhazadDum(fase: string): THREE.Group {
  const raiz = new THREE.Group();
  raiz.name = 'Khazad-dûm';
  const lago = fase.startsWith('lago');
  const partida = fase === 'lago-ponte-partida';
  const tumulo = fase === 'ruinas-de-balin' || lago;
  const ativo = fase === 'durin' || fase === 'integra';
  const pisoOeste = 0.072, pisoAlto = 0.193, pisoBaixo = 0.115;
  const salaoY = -0.092;

  function setor(nome: string, semente: number, construir: (o: ReturnType<typeof maquete>) => void) {
    const o = maquete(nome, semente);
    construir(o);
    raiz.add(o.montar());
  }

  setor('Base', 631, (o) => {
    // A abertura entre os dois maciços deixa o abismo visível até a base do corte.
    macico(o, -0.332, 0.008, 0.82, 0.51, -0.26, 0.26, 0.92);
    macico(o, 0.247, 0.033, 0.51, 0.55, -0.28, 0.28, 0.92);
    macico(o, 0.706, 0.012, 0.26, 0.37, -0.24, 0.24, 0.88);
    macico(o, -0.727, -0.075, 0.49, 0.4, -0.125, 0.126, 0.92);
  });

  setor('Rocha estratificada', 122, (o) => {
    const { peca, rand } = o;
    const perfis = [
      [-0.46, 0.103, 0.244, 0.259, 0.302, 0.48], [-0.254, 0.242, 0.48, 0.255, 0.421, 0.55],
      [0.109, 0.335, 0.398, 0.205, 0.392, 0.53], [0.365, 0.178, 0.236, 0.264, 0.298, 0.46],
      [0.661, 0.122, 0.238, 0.215, 0.255, 0.54],
      [-0.325, -0.051, 0.51, 0.22, 0.117, 0.86], [-0.019, -0.002, 0.34, 0.265, 0.163, 0.85],
      [0.134, 0.187, 0.199, 0.217, 0.184, 0.84], [0.376, -0.049, 0.286, 0.277, 0.087, 0.83],
      [0.703, -0.072, 0.239, 0.253, 0.115, 0.87],
    ];
    for (const [x, y, w, d, h, topo] of perfis) {
      macico(o, x, y, w, d, -0.009, h, topo);
    }
    for (let i = 0; i < 44; i++) {
      const ang = rand() * 6.28;
      peca(copa, veio[i % 4], -0.25 + Math.cos(ang) * (0.37 + rand() * 0.19), -0.055 + Math.sin(ang) * (0.16 + rand() * 0.09),
        0.018 + rand() * 0.025, 0.018 + rand() * 0.033, 0.021 + rand() * 0.032, 0.012 + rand() * 0.028, ang);
    }
  });

  setor('Aproximação oeste', 712, (o) => {
    const { bloco, peca, rand } = o;
    const x = -0.584, y = -0.051, z = pisoOeste;
    const ângulo = -Math.PI / 2;
    bloco(rocha, x + 0.026, y, 0.106, 0.187, z);
    bloco(rocha, x + 0.009, y - 0.078, 0.058, 0.074, 0.175, z);
    bloco(rocha, x + 0.012, y + 0.075, 0.068, 0.072, 0.198, z);
    o.arco(rocha, x, y, z, 0.122, 0.046, 0.151, ângulo);
    if (fase !== 'durin') {
      const porta = new THREE.Group();
      porta.name = 'Portas de Durin';
      o.grupo.add(porta);
      porta.position.set(x - 0.034, y, z);
      porta.rotation.z = ângulo;
      const linhas = maquete('Ithildin', 1);
      const polilinha = (...pontos: Pt[]) => {
        for (let i = 1; i < pontos.length; i++) linhas.muro(ornato, pontos[i - 1], pontos[i], 0.001, 0.0015, 0.0015);
      };
      const arco: Pt[] = Array.from({ length: 21 }, (_, i) => {
        const a = Math.PI * i / 20;
        return [0.043 * Math.cos(a), 0.07 + 0.047 * Math.sin(a)];
      });
      polilinha([0.043, 0.009], ...arco, [-0.043, 0.009]);
      polilinha([-0.043, 0.009], [0.043, 0.009]);
      for (const s of [-1, 1]) {
        const u = s * 0.027;
        polilinha([u, 0.017], [u, 0.074], [u - s * 0.005, 0.082]);
        for (let i = 0; i < 4; i++) {
          const a = 0.026 + i * 0.01;
          for (const k of [-1, 1]) polilinha([u, a], [u + k * 0.008, a + 0.004], [u + k * 0.011, a + 0.011]);
        }
      }
      polilinha([-0.011, 0.088], [-0.014, 0.1], [-0.005, 0.094], [0, 0.104], [0.005, 0.094], [0.014, 0.1], [0.011, 0.088], [-0.011, 0.088]);
      polilinha([-0.009, 0.073], [0.011, 0.073], [0.003, 0.067], [0.003, 0.062], [-0.006, 0.062], [-0.005, 0.068], [-0.009, 0.073]);
      polilinha(...Array.from({ length: 17 }, (_, i): Pt => {
        const a = i * Math.PI / 8, r = i % 2 ? 0.0045 : 0.012;
        return [r * Math.sin(a), 0.043 + r * Math.cos(a)];
      }));
      for (let i = 0; i < 7; i++) {
        const a = (i - 3) * 0.15;
        const u = Math.sin(a) * 0.067, v = 0.058 + Math.cos(a) * 0.069;
        polilinha([u - 0.002, v], [u, v + 0.0025], [u + 0.002, v], [u, v - 0.0025], [u - 0.002, v]);
      }
      linhas.grupo.rotation.x = Math.PI / 2;
      porta.add(linhas.montar());
      bloco(polida, x - 0.029, y, 0.008, 0.093, 0.132, z);
      for (const s of [-1, 1]) {
        const py = y + s * 0.085;
        peca(cilindro, madeira, x - 0.056, py, z + 0.039, 0.007, 0.008, 0.082);
        peca(cilindro, madeira, x - 0.056, py, z + 0.081, 0.005, 0.006, 0.024);
        for (let i = 0; i < 21; i++) {
          const a = i * 2.4, r = Math.sqrt(rand()) * 0.047;
          peca(copa, folhas[i % 3], x - 0.057 + Math.cos(a) * r, py + Math.sin(a) * r, z + 0.105 + (rand() - 0.5) * 0.039,
            0.015 + rand() * 0.014, 0.013 + rand() * 0.012, 0.013 + rand() * 0.01, a);
        }
      }
    }

    for (let i = 0; i < 16; i++) {
      bloco(laje[i % 4], x - 0.043 - i * 0.008, y - i * 0.003, 0.0089, 0.061 - i * 0.0015, 0.009, z - 0.013 - i * 0.0031);
    }
    for (let i = 0; i < 48; i++) {
      const ang = rand() * Math.PI * 2, r = 0.8 + rand() * 0.26;
      peca(copa, veio[i % 4], -0.741 + Math.cos(ang) * 0.211 * r, -0.08 + Math.sin(ang) * 0.153 * r,
        0.011 + rand() * 0.014, 0.021 + rand() * 0.036, 0.019 + rand() * 0.027, 0.016 + rand() * 0.018, ang);
    }
    if (lago) {
      const contorno = new THREE.Shape();
      for (let i = 0; i <= 64; i++) {
        const a = i * Math.PI / 32, r = 0.93 + 0.045 * Math.sin(5 * a) + 0.021 * Math.cos(9 * a);
        const px = r * Math.cos(a) * 0.211, py = r * Math.sin(a) * 0.153;
        if (i === 0) contorno.moveTo(px, py);
        else contorno.lineTo(px, py);
      }
      const superfície = new THREE.Mesh(new THREE.ShapeGeometry(contorno), agua);
      superfície.name = 'Lago da Porta Oeste';
      superfície.position.set(-0.741, -0.08, 0.044);
      o.grupo.add(superfície);
      for (let i = 0; i < 39; i++) {
        const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 0.79;
        bloco(ondulacao, -0.741 + Math.cos(a) * r * 0.21, -0.08 + Math.sin(a) * r * 0.153,
          0.007 + rand() * 0.026, 0.0006 + rand() * 0.001, 0.00035, 0.0443, 0.16);
      }
    }
  });

  setor('Escadaria ocidental', 284, (o) => {
    for (let i = 0; i < 200; i++) {
      const x = -0.526 + (i + 0.5) * 0.002;
      const z = pisoOeste + (pisoAlto - pisoOeste) * (i + 1) / 200;
      o.bloco(laje[Math.floor(i / 7) % 4], x, -0.052, 0.0021, 0.055, 0.01, z - 0.01);
    }
    for (let i = 0; i < 8; i++) {
      const x = -0.499 + i * 0.048, h = 0.061 + i * 0.0145;
      macico(o, x, -0.052, 0.14, 0.161, -0.003, h, 0.69);
    }
    for (let i = 0; i < 4; i++) {
      const x = -0.474 + i * 0.085;
      o.arco(pedra, x, -0.052, 0.086 + i * 0.025, 0.105, 0.018, 0.078, Math.PI / 2);
    }
  });

  setor('Vigésimo Primeiro Salão', 351, (o) => {
    const { bloco, peca, rand } = o;
    bloco(polida, -0.019, -0.007, 0.289, 0.245, 0.048, pisoAlto - 0.052);
    for (let i = 0; i < 10; i++) for (let j = 0; j < 8; j++) {
      bloco(laje[Math.floor(rand() * 4)], -0.1495 + i * 0.029, -0.113 + j * 0.029, 0.0284, 0.0284, 0.004, pisoAlto - 0.004);
    }
    for (const y of [-0.078, 0.062]) {
      for (let i = 0; i < 5; i++) {
        const x = -0.132 + i * 0.056;
        bloco(pedra, x, y, 0.034, 0.032, 0.011, pisoAlto);
        bloco(moldura, x, y, 0.027, 0.027, 0.008, pisoAlto + 0.011);
        bloco(polida, x, y, 0.021, 0.021, 0.125, pisoAlto + 0.019, Math.PI / 4);
        for (const s of [-1, 1]) {
          bloco(pedra, x + s * 0.008, y, 0.0065, 0.024, 0.114, pisoAlto + 0.02);
          bloco(moldura, x, y + s * 0.011, 0.004, 0.003, 0.11, pisoAlto + 0.024);
        }
        for (let j = 0; j < 3; j++) bloco(j === 1 ? moldura : pedra, x, y, 0.024 + j * 0.006, 0.027 + j * 0.004, 0.006, pisoAlto + 0.139 + j * 0.006);
        if (ativo || (fase === 'balin' && i >= 3)) {
          o.muro(moldura, [x, y - 0.012], [x, y - 0.021], pisoAlto + 0.069, 0.004, 0.003);
          peca(copa, ativo ? cristal : luzColonia, x, y - 0.023, pisoAlto + 0.068, 0.0052, 0.0052, 0.01);
        }
      }
      for (let i = 0; i < 4; i++) {
        o.arco(pedra, -0.104 + i * 0.056, y, pisoAlto + 0.117, 0.069, 0.019, 0.083);
        o.arco(moldura, -0.104 + i * 0.056, y - 0.013, pisoAlto + 0.119, 0.06, 0.005, 0.063);
      }
    }
    for (const x of [-0.108, 0.077]) {
      bloco(polida, x, 0.112, 0.111, 0.021, 0.161, pisoAlto);
      bloco(alvenaria, x, 0.099, 0.109, 0.007, 0.009, pisoAlto + 0.128);
    }
    o.arco(alvenaria, -0.014, 0.11, pisoAlto, 0.096, 0.026, 0.165);
    o.arco(polida, 0.125, -0.015, pisoAlto, 0.109, 0.022, 0.146, Math.PI / 2);
  });

  setor('Câmara de Mazarbul', 847, (o) => {
    const { bloco, peca, rand } = o;
    const x = 0.13, y = 0.188;
    bloco(laje[1], -0.014, 0.177, 0.067, 0.144, 0.022, pisoAlto - 0.022);
    bloco(pedra, x, y, 0.162, 0.153, 0.035, pisoAlto - 0.035);
    bloco(laje[2], x, y, 0.152, 0.147, 0.003, pisoAlto);
    for (const px of [x - 0.054, x, x + 0.054]) {
      bloco(polida, px, y + 0.073, 0.054, 0.024, 0.109, pisoAlto);
      bloco(sombra, px, y + 0.0605, 0.041, 0.0018, 0.027, pisoAlto + 0.025);
      bloco(madeira, px, y + 0.051, 0.028, 0.023, 0.011, pisoAlto + 0.028);
      for (const dx of [-0.009, 0.009]) bloco(ferro, px + dx, y + 0.05, 0.0025, 0.0238, 0.012, pisoAlto + 0.028);
      if (tumulo) bloco(madeira, px + 0.006, y + 0.039, 0.031, 0.008, 0.003, pisoAlto + 0.017, rand());
    }
    for (const s of [-1, 1]) bloco(pedra, x - 0.078, y + s * 0.047, 0.013, 0.052, 0.08, pisoAlto);
    bloco(moldura, x - 0.078, y, 0.02, 0.146, 0.013, pisoAlto + 0.076);
    bloco(polida, x - 0.08, y - 0.011, 0.012, 0.041, 0.066, pisoAlto, -0.79);
    for (const dy of [-0.046, 0.046]) bloco(pedra, x + 0.077, y + dy, 0.019, 0.055, 0.064, pisoAlto);
    bloco(pedra, x + 0.077, y, 0.02, 0.146, 0.016, pisoAlto + 0.048);
    bloco(laje[1], x + 0.103, y - 0.054, 0.048, 0.14, 0.014, pisoAlto - 0.014);
    bloco(polida, x + 0.078, y - 0.048, 0.021, 0.052, 0.067, pisoAlto + 0.062);
    bloco(polida, x + 0.078, y + 0.051, 0.021, 0.053, 0.067, pisoAlto + 0.062);
    bloco(moldura, x + 0.081, y, 0.026, 0.151, 0.014, pisoAlto + 0.121);
    const luz = new THREE.BufferGeometry();
    luz.setAttribute('position', new THREE.Float32BufferAttribute([
      x + 0.088, y - 0.015, pisoAlto + 0.118, x + 0.088, y + 0.015, pisoAlto + 0.118,
      x - 0.024, y + 0.031, pisoAlto + 0.002, x - 0.024, y - 0.031, pisoAlto + 0.002,
    ], 3));
    luz.setIndex([0, 1, 2, 0, 2, 3]);
    const feixe = new THREE.Mesh(luz, new THREE.MeshBasicMaterial({ color: 0xcbe6ff, transparent: true, opacity: 0.23, depthWrite: false, side: THREE.DoubleSide }));
    feixe.name = 'Feixe do poço de luz oriental';
    o.grupo.add(feixe);
    if (tumulo) {
      bloco(madeira, x + 0.042, y + 0.032, 0.022, 0.016, 0.0024, pisoAlto + 0.003, -0.36);
      bloco(pergaminho, x + 0.042, y + 0.032, 0.019, 0.014, 0.0025, pisoAlto + 0.0054, -0.36);
      const túmulo = maquete('Túmulo de Balin', 1);
      túmulo.bloco(pedra, x, y, 0.058, 0.033, 0.016, pisoAlto + 0.003);
      túmulo.bloco(marmore, x, y, 0.066, 0.039, 0.007, pisoAlto + 0.019);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 9 - i; j++) {
        const px = x + (j - (8 - i) / 2) * 0.0047, py = y + (i - 1.5) * 0.005;
        túmulo.bloco(polida, px, py, 0.0008, 0.0027, 0.0003, pisoAlto + 0.026, i * 0.14);
        túmulo.bloco(polida, px + 0.001, py + 0.0006, 0.0023, 0.0008, 0.0003, pisoAlto + 0.026, -0.64 + j % 3 * 0.6);
      }
      o.grupo.add(túmulo.montar());
    }
    if (tumulo || fase === 'abandonado') {
      for (let i = 0; i < 35; i++) {
        const px = x + (rand() - 0.5) * 0.143, py = y - 0.06 + rand() * 0.023;
        peca(copa, laje[i % 4], px, py, pisoAlto + 0.005, 0.003 + rand() * 0.004, 0.002, 0.002, rand() * 6);
      }
    }
  });

  setor('Segundo Salão', 447, (o) => {
    const { bloco, rand } = o;
    for (let i = 0; i < 26; i++) {
      const z = pisoAlto - (pisoAlto - pisoBaixo) * (i + 1) / 26;
      bloco(laje[Math.floor(i / 3) % 4], 0.219 + i * 0.0039, 0.087 - i * 0.0058, 0.0074, 0.046, 0.014, z - 0.014, -0.97);
    }
    bloco(rocha, 0.388, salaoY, 0.205, 0.23, 0.11);
    for (let i = 0; i < 7; i++) for (let j = 0; j < 8; j++) {
      bloco(laje[Math.floor(rand() * 4)], 0.297 + i * 0.03, salaoY + (j - 3.5) * 0.028, 0.0295, 0.0275, 0.005, 0.11);
    }
    for (const x of [0.337, 0.396, 0.452]) {
      for (const y of [salaoY - 0.079, salaoY + 0.076]) {
        bloco(polida, x, y, 0.027, 0.027, 0.097, pisoBaixo);
        bloco(pedra, x, y, 0.032, 0.033, 0.007, pisoBaixo);
        bloco(moldura, x, y, 0.036, 0.035, 0.008, pisoBaixo + 0.094);
      }
      o.arco(pedra, x, salaoY + 0.009, pisoBaixo + 0.035, 0.175, 0.027, 0.123, Math.PI / 2);
    }
  });

  setor('Abismo oriental', 928, (o) => {
    o.bloco(valeEscuro, 0.543, salaoY + 0.013, 0.144, 0.236, 0.006, 0.006);
    macico(o, 0.545, salaoY + 0.148, 0.183, 0.091, -0.009, 0.127, 0.83);
    for (const x of [0.476, 0.607]) {
      macico(o, x, salaoY, 0.052, 0.276, -0.012, 0.114, 0.8);
      for (let i = 0; i < 46; i++) {
        const y = salaoY + (o.rand() - 0.5) * 0.241;
        o.peca(copa, veio[i % 4], x + (o.rand() - 0.5) * 0.02, y, 0.037 + o.rand() * 0.038,
          0.011 + o.rand() * 0.012, 0.016 + o.rand() * 0.016, 0.019 + o.rand() * 0.022, o.rand() * 6);
      }
    }
    const perfil = new THREE.Shape();
    const início = 0.495, vão = 0.096;
    const z = (t: number) => pisoBaixo + 0.015 * Math.sin(Math.PI * t);
    const topo: Pt[] = Array.from({ length: 25 }, (_, i) => [i / 24, z(i / 24)]);
    const restante = partida ? topo.slice(0, 5) : topo;
    for (const [i, [t, altura]] of restante.entries()) {
      if (i === 0) perfil.moveTo(início, altura);
      else perfil.lineTo(início + t * vão, altura);
    }
    if (partida) perfil.lineTo(início + 0.11 * vão, z(0.11) - 0.01);
    for (const [t, altura] of restante.slice().reverse()) {
      if (!partida || t < 0.11) perfil.lineTo(início + t * vão, altura - 0.009 - 0.009 * Math.abs(2 * t - 1));
    }
    perfil.closePath();
    const ponte = new THREE.Mesh(new THREE.ExtrudeGeometry(perfil, { depth: 0.013, bevelEnabled: false }).rotateX(Math.PI / 2), pedra);
    ponte.position.y = salaoY + 0.0065;
    ponte.name = partida ? 'Ponte de Durin desabada' : 'Ponte de Durin';
    o.grupo.add(ponte);
  });

  setor('Primeiro Salão e Grandes Portões', 115, (o) => {
    const { bloco, peca, rand } = o;
    const h = pisoBaixo + 0.028;
    for (let i = 0; i < 14; i++) bloco(laje[i % 4], 0.592 + i * 0.0031, salaoY, 0.0033, 0.045 + i * 0.0016, 0.015, pisoBaixo - 0.015 + i * 0.00215);
    bloco(rocha, 0.696, salaoY, 0.13, 0.181, h - 0.005);
    bloco(laje[2], 0.696, salaoY, 0.13, 0.179, 0.005, h - 0.005);
    for (const y of [salaoY - 0.074, salaoY + 0.074]) {
      bloco(polida, 0.699, y, 0.123, 0.024, 0.103, h);
      for (const x of [0.643, 0.704, 0.753]) {
        bloco(pedra, x, y, 0.026, 0.031, 0.115, h);
        bloco(moldura, x, y, 0.032, 0.04, 0.009, h + 0.091);
      }
    }
    o.arco(alvenaria, 0.75, salaoY, h, 0.17, 0.042, 0.147, Math.PI / 2);
    o.arco(moldura, 0.775, salaoY, h, 0.135, 0.013, 0.126, Math.PI / 2);
    for (const dy of [-0.048, 0, 0.048]) {
      o.arco(pedra, 0.748, salaoY + dy, h + 0.139, 0.041, 0.029, 0.051, Math.PI / 2);
    }
    if (lago) {
      bloco(madeira, 0.758, salaoY - 0.034, 0.052, 0.043, 0.006, h + 0.001, 0.42);
      bloco(madeira, 0.766, salaoY + 0.043, 0.034, 0.061, 0.007, h + 0.001, -0.46);
    } else {
      for (const dy of [-0.052, 0.052]) bloco(madeira, 0.742, salaoY + dy, 0.061, 0.008, 0.084, h, Math.sign(dy) * 0.18);
    }
    for (let i = 0; i < 13; i++) bloco(laje[i % 4], 0.786 + 0.0049 * i, salaoY, 0.0052, 0.123 + i * 0.003, 0.027, h - 0.03 - i * 0.004);
    for (let i = 0; i < 34; i++) {
      const x = 0.765 + rand() * 0.103, y = salaoY + (rand() - 0.5) * 0.298;
      if (Math.abs(y - salaoY) > 0.079) peca(copa, veio[i % 4], x, y, 0.036 + rand() * 0.058, 0.021 + rand() * 0.031, 0.026, 0.016 + rand() * 0.024, rand() * 5);
    }
  });
  return raiz;
}
