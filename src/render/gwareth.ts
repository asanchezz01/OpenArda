import * as THREE from 'three';
import { Noise, rng } from '../terrain/noise';

const PLATO = 2.86; // km, além do piso de 2,83 km
const PE_ESCADA = -4.75;
const ALTO_ESCADA = -2.81;
const MEIA_LARGURA_ESCADA = 0.24;
const ANGULOS = 144;
const ANEIS = 44;
const INICIO_FALDRA = 0.56;
const AMOSTRAS_FALDRA = 5;
const { lerp, clamp, smoothstep } = THREE.MathUtils;
const ruido = new Noise(510);

function raioDoPe(a: number): number {
  return 6.15 + 0.50 * Math.cos(2 * a + 0.7) + 0.40 * Math.sin(3 * a - 0.6)
    + 0.30 * Math.cos(5 * a + 1.2) + 0.19 * Math.sin(9 * a);
}

/** Colina e escada compartilham o perfil do acesso. Alturas relativas ao piso, em km. */
export function criarAmonGwareth(
  alturaTerreno: (x: number, y: number) => number,
  caixa: THREE.BufferGeometry,
  pedraEscada: THREE.Material,
) {
  const zPeEscada = Math.min(-0.08, alturaTerreno(0, PE_ESCADA) - 0.008);
  const alturaAcesso = (y: number) => lerp(zPeEscada, 0, clamp((y - PE_ESCADA) / (-PLATO - PE_ESCADA), 0, 1));
  const angulos = Array.from({ length: ANGULOS }, (_, i) => {
    const a = i * Math.PI * 2 / ANGULOS;
    const raio = raioDoPe(a);
    const x = Math.cos(a), y = Math.sin(a);
    const chao = Array.from({ length: AMOSTRAS_FALDRA + 1 }, (_, k) => {
      const r = lerp(PLATO, raio, lerp(INICIO_FALDRA, 1, k / AMOSTRAS_FALDRA));
      return alturaTerreno(x * r, y * r);
    });
    return { a, x, y, raio, chao, zPe: Math.min(-0.08, chao[AMOSTRAS_FALDRA] - 0.065) };
  });

  function perfil(angulo: (typeof angulos)[number], u: number) {
    const { a, raio, chao, zPe } = angulo;
    const r = lerp(PLATO, raio, u);
    const x = angulo.x * r, y = angulo.y * r;
    const costela = Math.sin(a * 5 + u * 2.1) + 0.35 * Math.cos(a * 9 - u * 3.6);
    const escarpa = smoothstep(costela, -0.8, 0.65);
    const quebra = smoothstep(u, lerp(0.05, 0.12, escarpa), lerp(0.48, 0.34, escarpa));
    const faldra = smoothstep(u, 0.06, 1);
    const forma = ruido.simplex(x * 0.93, y * 0.93);
    const fratura = ruido.simplex(x * 3.3 + y * 0.6, y * 4.7);
    const granulo = ruido.simplex(x * 12.8, y * 12.8);
    // As camadas inclinam-se em relação à colina, cruzando os sulcos radiais.
    const estrato = Math.sin(35 * u + x * 1.9 + y * 0.65 + forma * 1.8);
    const borda = smoothstep(u, 0, 0.11) * (1 - smoothstep(u, 0.58, 1));
    const escarpaZ = zPe * (quebra * 0.58 + faldra * 0.42)
      + borda * (forma * 0.065 + fratura * 0.038 + granulo * 0.011 + estrato * escarpa * 0.017);
    // A faldra acompanha o chão local antes de mergulhar sob a malha do vale.
    const amostra = clamp((u - INICIO_FALDRA) / (1 - INICIO_FALDRA), 0, 1) * AMOSTRAS_FALDRA;
    const i = Math.min(Math.floor(amostra), AMOSTRAS_FALDRA - 1);
    const chaoZ = lerp(chao[i], chao[i + 1], amostra - i);
    const faldraZ = chaoZ + lerp(0.16, -0.065, smoothstep(u, INICIO_FALDRA, 1));
    const z = lerp(escarpaZ, faldraZ, smoothstep(u, INICIO_FALDRA, 0.76));
    const acesso = (1 - smoothstep(Math.abs(x), 0.31, 0.63)) * smoothstep(-y, -ALTO_ESCADA - 0.18, -ALTO_ESCADA)
      * (1 - smoothstep(-y, -PE_ESCADA, -PE_ESCADA + 0.48));
    const pedra = borda * smoothstep(0.75 * escarpa + 0.42 * forma + 0.23 * fratura - acesso * 0.32, 0.26, 0.82);
    return { x, y, z: Math.min(0, lerp(z, alturaAcesso(y), acesso)), pedra, estrato, fratura, granulo };
  }

  const relva = new THREE.Color(0x666b44);
  const relvaVale = new THREE.Color(0x87944e);
  const pedra = new THREE.Color(0x858378);
  const tom = new THREE.Color();
  const pontos = [0, 0, 0], cores = [...relva.toArray(), 1], indices: number[] = [];
  for (let anel = 0; anel <= ANEIS; anel++) {
    const u = anel / ANEIS;
    for (let i = 0; i < ANGULOS; i++) {
      const p = perfil(angulos[i], u);
      pontos.push(p.x, p.y, p.z);
      tom.copy(relva).lerp(relvaVale, smoothstep(u, 0.57, 0.92)).lerp(pedra, p.pedra)
        .multiplyScalar(0.90 + 0.17 * p.fratura + 0.07 * p.granulo + 0.085 * p.estrato * p.pedra);
      cores.push(tom.r, tom.g, tom.b, 1 - smoothstep(u, 0.73, 0.98));
      const atual = 1 + anel * ANGULOS + i;
      const seguinte = 1 + anel * ANGULOS + (i + 1) % ANGULOS;
      if (anel === 0) indices.push(0, atual, seguinte);
      else indices.push(atual - ANGULOS, atual, seguinte, atual - ANGULOS, seguinte, seguinte - ANGULOS);
    }
  }
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(pontos, 3));
  geometria.setAttribute('color', new THREE.Float32BufferAttribute(cores, 4));
  geometria.setIndex(indices);
  geometria.computeVertexNormals();
  const base = new THREE.Mesh(geometria, new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, roughness: 1 }));
  base.name = 'Amon Gwareth';

  // Blocos fraturados se concentram na escarpa e diminuem até o pé da encosta.
  const geoBloco = new THREE.IcosahedronGeometry(1, 1);
  const vertices = geoBloco.getAttribute('position');
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
    const fratura = 1 + ruido.simplex(x * 2.9 + z, y * 3.4 - z) * 0.24;
    vertices.setXYZ(i, x * fratura + z * 0.28, y * fratura, z * fratura);
  }
  geoBloco.computeVertexNormals();
  const blocos = new THREE.InstancedMesh(geoBloco, new THREE.MeshStandardMaterial({ roughness: 1 }), 134);
  blocos.name = 'Afloramentos e blocos de Amon Gwareth';
  blocos.count = 0;
  const rand = rng(5116);
  const objeto = new THREE.Object3D();
  for (let i = 0; i < 520 && blocos.count < 134; i++) {
    const angulo = angulos[Math.floor(rand() * ANGULOS)];
    const u = lerp(0.10, 0.84, rand() ** 1.45);
    const p = perfil(angulo, u);
    const tamanho = (0.06 + rand() ** 1.9 * 0.43) * lerp(1, 0.42, u);
    if (p.y < 0 && Math.abs(p.x) < MEIA_LARGURA_ESCADA + tamanho + 0.16) continue;
    if (rand() * 0.72 > p.pedra + 0.035 || p.z + 0.035 < alturaTerreno(p.x, p.y)) continue;
    const altura = tamanho * (0.28 + rand() * 0.30);
    objeto.position.set(p.x, p.y, Math.min(-altura, p.z - altura * 0.48));
    objeto.rotation.set(rand() * 0.35, rand() * 0.3, angulo.a + rand() - 0.5);
    objeto.scale.set(tamanho * 1.03, tamanho * (0.54 + rand() * 0.48), altura);
    objeto.updateMatrix();
    blocos.setMatrixAt(blocos.count, objeto.matrix);
    blocos.setColorAt(blocos.count, tom.copy(pedra).multiplyScalar(0.60 + rand() * 0.49));
    blocos.count++;
  }
  blocos.computeBoundingSphere();
  base.add(blocos);

  const escadaria = new THREE.InstancedMesh(caixa, pedraEscada, 43);
  escadaria.name = 'Escadaria';
  escadaria.position.z = 0.028;
  const passo = (ALTO_ESCADA - PE_ESCADA) / escadaria.count;
  objeto.rotation.set(0, 0, 0);
  for (let i = 0; i < escadaria.count; i++) {
    const y = PE_ESCADA + (i + 0.5) * passo;
    const topo = alturaAcesso(y + passo / 2) + 0.006;
    const fundo = alturaAcesso(y - passo / 2) - 0.065;
    objeto.position.set(0, y, (topo + fundo) / 2);
    objeto.scale.set(2 * MEIA_LARGURA_ESCADA, passo + 0.006, topo - fundo);
    objeto.updateMatrix();
    escadaria.setMatrixAt(i, objeto.matrix);
  }
  escadaria.computeBoundingSphere();
  return { base, escadaria };
}
