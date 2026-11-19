// Revestimentos procedurais e peças instanciadas para os assentamentos da Segunda Era.
import * as THREE from 'three';
import { Noise } from '../terrain/noise';
import type { maquete } from './arquitetura';
import { cilindro, copa, material, type M } from './oficina';

type Maquete = ReturnType<typeof maquete>;
type Padrao = 'pedra' | 'telha' | 'madeira' | 'cal' | 'rocha';

function textura(padrao: Padrao, contraste = 1) {
  const lado = 128;
  const dados = new Uint8Array(lado * lado * 4);
  const ruido = new Noise(742);
  const { euclideanModulo: resto, smoothstep } = THREE.MathUtils;
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const u = (x + 0.5) / lado, v = (y + 0.5) / lado;
      const grão = ruido.simplex(u * 71, v * 71);
      const mancha = ruido.simplex(u * 6, v * 6);
      let valor: number;
      if (padrao === 'pedra' || padrao === 'telha') {
        const telha = padrao === 'telha';
        const vv = v * (telha ? 13 : 8);
        const uu = u * (telha ? 16 : 5) + (Math.floor(vv) % 2) * 0.5;
        const junta = Math.min(resto(uu, 1), resto(-uu, 1), resto(vv, 1) * (telha ? 0.38 : 1), resto(-vv, 1));
        const peça = ruido.simplex(Math.floor(uu) * 1.7, Math.floor(vv) * 2.3);
        valor = 123 + 101 * smoothstep(junta, 0.012, 0.088) + peça * 21 + grão * 11;
      } else if (padrao === 'madeira') {
        const tábua = u * 8;
        const veio = Math.sin(u * 540 + ruido.simplex(u * 14, v * 2) * 2.8);
        valor = 142 + 67 * smoothstep(resto(tábua, 1), 0, 0.12) + veio * 12 + mancha * 13 + grão * 8;
      } else if (padrao === 'rocha') {
        const estrato = Math.sin(u * 34 + v * 49 + mancha * 3.8);
        valor = 201 + estrato * 14 + mancha * 23 + grão * 18;
      } else {
        valor = 235 + mancha * 14 + grão * 8;
      }
      const i = (y * lado + x) * 4;
      dados[i] = dados[i + 1] = dados[i + 2] = THREE.MathUtils.clamp(220 + (valor - 220) * contraste, 0, 255);
      dados[i + 3] = 255;
    }
  }
  const mapa = new THREE.DataTexture(dados, lado, lado);
  mapa.name = padrao;
  mapa.colorSpace = THREE.SRGBColorSpace;
  mapa.wrapS = mapa.wrapT = THREE.RepeatWrapping;
  mapa.magFilter = THREE.LinearFilter;
  mapa.minFilter = THREE.LinearMipmapLinearFilter;
  mapa.generateMipmaps = true;
  mapa.needsUpdate = true;
  const relevo = mapa.clone();
  relevo.colorSpace = THREE.NoColorSpace;
  relevo.needsUpdate = true;
  return { map: mapa, bumpMap: relevo };
}

const pedra = textura('pedra'), telha = textura('telha'), fibras = textura('madeira');
const reboco = textura('cal'), estratos = textura('rocha');

export const cantaria = material(0xd7c8ac, { ...pedra, bumpScale: 0.0007 });
export const arrimo = material(0xb5a78d, { ...pedra, bumpScale: 0.0011 });
const lajes = textura('pedra', 0.48);
for (const mapa of [lajes.map, lajes.bumpMap]) mapa.repeat.set(7, 2);
export const piso = material(0xcabc9f, { ...lajes, bumpScale: 0.00028 });
export const cal = material(0xfaf0da, { ...reboco, bumpScale: 0.0004 });
export const ocre = material(0xd6aa78, { ...reboco, bumpScale: 0.0004 });
export const moldura = material(0xe9d9b7);
export const ardósia = material(0x677b85, { ...telha, bumpScale: 0.0004 });
export const terracota = material(0xa76a51, { ...telha, bumpScale: 0.0004 });
export const cobre = material(0x628c7c, { ...telha, bumpScale: 0.0004 });
export const madeira = material(0x8c664b, { ...fibras, bumpScale: 0.0004 });
export const tábuas = material(0xb69167, { ...fibras, bumpScale: 0.0006 });
export const pedraEscura = material(0x8c8274, { ...estratos, bumpScale: 0.0018 });
export const sombra = material(0x292d2b);
export const azul = material(0x38647b);
export const bronze = material(0xb89652, { roughness: 0.52, metalness: 0.25 });

/** Uma malha por telhado, com UVs alinhados da beirada até a cumeeira. */
function águas(quatro: boolean) {
  const ponta = quatro ? 0.27 : 0.5;
  const a = [-0.5, -0.5, 0], b = [0.5, -0.5, 0], c = [0.5, 0.5, 0], d = [-0.5, 0.5, 0];
  const e = [-ponta, 0, 1], f = [ponta, 0, 1];
  const posição: number[] = [], uv: number[] = [];
  function água(base: number[], fim: number[], topo: number[], canto?: number[]) {
    const meio = (1 - 2 * ponta) / 2;
    posição.push(...base, ...fim, ...topo);
    if (canto) {
      uv.push(0, 0, 1, 0, 1 - meio, 1, 0, 0, 1 - meio, 1, meio, 1);
      posição.push(...base, ...topo, ...canto);
    } else uv.push(0, 0, 1, 0, 0.5, 1);
  }
  água(a, b, f, e);
  água(c, d, e, f);
  if (quatro) {
    água(d, a, e);
    água(b, c, f);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(posição, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

const duasÁguas = águas(false), quatroÁguas = águas(true);
const oitões = new THREE.BufferGeometry();
oitões.setAttribute('position', new THREE.Float32BufferAttribute([
  -0.5, 0.5, 0, -0.5, -0.5, 0, -0.5, 0, 1,
  0.5, -0.5, 0, 0.5, 0.5, 0, 0.5, 0, 1,
], 3));
oitões.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1, 0, 0, 1, 0, 0.5, 1], 2));
oitões.computeVertexNormals();

export function telhado(o: Maquete, m: M, x: number, y: number, z: number, w: number, d: number, h: number, ang = 0, parede?: M) {
  if (parede) {
    o.peca(oitões, parede, x, y, z, w * 0.94, d * 0.86, h, ang);
    o.peca(duasÁguas, m, x, y, z, w, d, h, ang);
  } else {
    if (d > w) {
      [w, d] = [d, w];
      ang += Math.PI / 2;
    }
    o.peca(quatroÁguas, m, x, y, z, w, d, h, ang);
  }
  o.bloco(m, x, y, w * (parede ? 0.995 : 0.54), 0.0035, 0.0025, z + h - 0.0007, ang);
}

/** O arco tem um vão aberto e uma face posterior. A mesma geometria serve em toda a ilha. */
function vãoArqueado(meia: number, base: number, altura: number) {
  const s = new THREE.Shape();
  s.moveTo(-meia, 0);
  s.lineTo(-meia, base);
  s.absellipse(0, base, meia, altura - base, Math.PI, 0, true);
  s.lineTo(meia, 0);
  s.closePath();
  return s;
}

const abertura = new THREE.ShapeGeometry(vãoArqueado(0.36, 0.58, 0.83), 8).rotateX(Math.PI / 2);
const anel = new THREE.Shape();
anel.moveTo(-0.5, 0);
anel.lineTo(-0.5, 0.58);
anel.absellipse(0, 0.58, 0.5, 0.42, Math.PI, 0, true);
anel.lineTo(0.5, 0);
anel.lineTo(0.36, 0);
anel.lineTo(0.36, 0.58);
anel.absellipse(0, 0.58, 0.36, 0.25, 0, Math.PI, false);
anel.lineTo(-0.36, 0);
anel.closePath();
const arco = new THREE.ExtrudeGeometry(anel, { depth: 1, bevelEnabled: false, curveSegments: 8 })
  .rotateX(Math.PI / 2).translate(0, 0.5, 0);
arco.name = 'Arquivoltas';

export function arcada(o: Maquete, m: M, x: number, y: number, z: number, w: number, d: number, h: number, ang = 0) {
  o.peca(arco, m, x, y, z, w, d, h, ang);
}

export function nicho(o: Maquete, x: number, y: number, z: number, w: number, h: number, ang = 0, guarnição = moldura) {
  o.peca(abertura, sombra, x, y, z, w, 1, h, ang);
  arcada(o, guarnição, x, y, z, w, 0.003, h, ang);
  o.bloco(guarnição, x, y, w * 1.13, 0.005, 0.002, z - 0.001, ang);
}

export function coluna(o: Maquete, m: M, x: number, y: number, z: number, w: number, h: number) {
  o.bloco(m, x, y, w, w, w * 0.27, z);
  o.peca(cilindro, m, x, y, z + h / 2, w * 0.32, w * 0.32, h);
  o.bloco(m, x, y, w * 1.12, w * 1.12, w * 0.25, z + h - w * 0.25);
}

const diagonal = new THREE.BoxGeometry(0.15, 1, Math.SQRT2).rotateY(Math.PI / 4);
diagonal.name = 'Contraventamento';

export function escora(o: Maquete, x: number, y: number, z: number, w: number, h: number, ang = 0) {
  // A espessura na diagonal é definida separadamente da extensão da viga.
  o.peca(diagonal, madeira, x, y, z + h / 2, w, 0.0035, h, ang);
}

const folhas = [material(0x3e6249), material(0x56734a), material(0x839655)];

export function árvore(o: Maquete, x: number, y: number, z: number, s: number, clara = false) {
  o.peca(cilindro, madeira, x, y, z + s * 0.48, s * 0.074, s * 0.074, s * 0.96);
  const giro = o.rand() * Math.PI * 2;
  for (let i = 0; i < 5; i++) {
    const a = giro + i * 2.40, r = s * (0.16 + o.rand() * 0.21);
    const topo = z + s * (0.63 + o.rand() * 0.47);
    o.peca(copa, folhas[(i + Number(clara)) % folhas.length], x + Math.cos(a) * r, y + Math.sin(a) * r,
      topo, s * 0.39, s * 0.34, s * (0.39 + o.rand() * 0.23), a);
  }
}
