// Reconstrução artística: volumes em km, Z para cima, X para leste, Y para norte; pé da colina em Z=0.
// Descrito em O Senhor dos Anéis (Livro III, cap. 6): colina verde junto ao Riacho de Neve, fosso,
// muralha forte e cerca de espinhos; casas pela encosta; caminho calçado com um canal de água ao lado;
// escada de pedra até o terraço verde; Meduseld com o telhado que parece de ouro; túmulos dos reis
// ao lado do caminho, a primeira linhagem a oeste e a segunda a leste.
// Artísticos: tamanhos, número e posição das casas, portão ao norte.
import * as THREE from 'three';
import { rng } from '../terrain/noise';
import { criarLotes } from './lotes';

const PE_COLINA = 0.45; // raio da base da colina
const TOPO = 0.13; // raio do alto, onde fica o terraço
const ALTURA = 0.08; // artístico
const MURO = 0.47;
const PORTAO = Math.PI / 2; // norte

/** Altura da encosta a uma distância r do centro. */
export function perfilEdoras(r: number): number {
  if (r <= TOPO) return ALTURA;
  if (r >= PE_COLINA) return 0;
  return ALTURA * 0.5 * (1 + Math.cos((Math.PI * (r - TOPO)) / (PE_COLINA - TOPO)));
}

/** fase: "verao|inverno-<túmulos a oeste>-<túmulos a leste>" (ver faseEdoras). */
export function criarEdoras(fase: string): THREE.Group {
  const [clima, o, l] = fase.split('-');
  const inverno = clima === 'inverno';
  const oeste = Number(o) || 0,
    leste = Number(l) || 0;
  const cidade = new THREE.Group();
  cidade.name = `Edoras: ${fase}`;
  const rand = rng(2569);
  const { peca, bloco, finalizar } = criarLotes();
  const material = (cor: number) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.9 });
  const neve = material(0xeef1f4);
  const relva = inverno ? neve : material(0x7a8a46);
  const terra = material(0x6b5a3c);
  const pedra = material(0xa49c8a);
  const madeira = material(0x5a3d24);
  const palha = inverno ? neve : material(0xb08d4a);
  const ouro = inverno ? material(0xe8dcb0) : new THREE.MeshStandardMaterial({ color: 0xd9a92e, roughness: 0.35, metalness: 0.6 });
  const espinhos = material(0x2f3a22);
  const agua = material(0x6fb3c4);
  const flor = material(0xf6f6f0);
  const cilindro = new THREE.CylinderGeometry(1, 1, 1, 10).rotateX(Math.PI / 2);
  // telhado de duas águas: prisma unitário (comprimento X, largura Y, altura Z), cumeeira ao longo de X, base em z=0
  const telhado = new THREE.CylinderGeometry(1, 1, 1, 3).rotateZ(Math.PI / 2).translate(0, 0, 0.5).scale(1, 1 / Math.sqrt(3), 1 / 1.5);
  const monte = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2);

  // Base em talude sob a colina, esticada com o exagero do relevo: em encostas vira um aterro, não uma parede.
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 1.56, 0.8, 48).rotateX(Math.PI / 2).translate(0, 0, -0.4), relva);
  base.name = 'Base';
  cidade.add(base);

  // A colina verde, por revolução do perfil.
  const pts: THREE.Vector2[] = [];
  for (let k = 0; k <= 24; k++) {
    const r = TOPO + ((PE_COLINA + 0.05 - TOPO) * k) / 24;
    pts.unshift(new THREE.Vector2(r, perfilEdoras(r)));
  }
  pts.unshift(new THREE.Vector2(0, ALTURA));
  const colina = new THREE.Mesh(new THREE.LatheGeometry(pts, 64).rotateX(Math.PI / 2), relva);
  colina.name = 'Colina';
  cidade.add(colina);

  const naPassagem = (a: number, folga: number) => Math.abs(Math.atan2(Math.sin(a - PORTAO), Math.cos(a - PORTAO))) < folga;

  // Fosso (aterro de terra), muralha e cerca de espinhos, com a abertura do portão ao norte.
  for (const [r, mat, larg, alt, folga] of [
    [MURO + 0.04, terra, 0.016, 0.004, 0.05],
    [MURO, pedra, 0.008, 0.009, 0.035],
    [MURO - 0.014, espinhos, 0.004, 0.005, 0.035],
  ] as [number, THREE.Material, number, number, number][]) {
    const n = Math.ceil((Math.PI * 2 * r) / 0.012);
    for (let k = 0; k < n; k++) {
      const a = (k * Math.PI * 2) / n;
      if (naPassagem(a, folga)) continue;
      bloco(mat, Math.cos(a) * r, Math.sin(a) * r, larg, ((Math.PI * 2 * r) / n) * 1.05, alt, perfilEdoras(r), a);
    }
  }
  for (const lado of [-1, 1]) bloco(madeira, lado * 0.016, MURO, 0.007, 0.007, 0.016);
  bloco(madeira, 0, MURO, 0.04, 0.006, 0.003, 0.016);

  // Caminho calçado do portão ao pé da escada, com o canal de água ao lado.
  for (let r = MURO + 0.06; r > TOPO + 0.025; r -= 0.012) {
    bloco(pedra, 0, r, 0.012, 0.013, 0.0015, perfilEdoras(r));
    bloco(agua, 0.009, r, 0.003, 0.013, 0.0012, perfilEdoras(r));
  }
  // Escada de pedra até o terraço verde.
  for (let k = 0; k < 6; k++) bloco(pedra, 0, TOPO + 0.02 - k * 0.006, 0.02, 0.006, 0.0012 * (k + 1), ALTURA);
  peca(cilindro, relva, 0, 0, ALTURA + 0.0035, TOPO - 0.02, TOPO - 0.02, 0.007);
  peca(cilindro, pedra, 0, 0, ALTURA + 0.003, TOPO - 0.018, TOPO - 0.018, 0.006);

  // Meduseld: salão longo de madeira, portas ao norte, telhado dourado.
  const zt = ALTURA + 0.007;
  bloco(madeira, 0, -0.01, 0.028, 0.08, 0.011, zt);
  peca(telhado, ouro, 0, -0.01, zt + 0.011, 0.086, 0.034, 0.02, Math.PI / 2);
  for (const lado of [-1, 1]) peca(cilindro, ouro, lado * 0.009, 0.031, zt + 0.0055, 0.0015, 0.0015, 0.011);

  // Casas de madeira com telhado de palha, alinhadas às curvas de nível da encosta.
  for (let anel = 0; anel < 8; anel++) {
    const r0 = TOPO + 0.04 + anel * 0.035;
    const n = Math.floor((Math.PI * 2 * r0) / 0.03);
    for (let k = 0; k < n; k++) {
      const a = ((k + rand() * 0.8) * Math.PI * 2) / n;
      const r = r0 + (rand() - 0.5) * 0.024;
      const w = 0.012 + rand() * 0.012,
        d = 0.008 + rand() * 0.005,
        h = 0.003 + rand() * 0.002;
      if (rand() < 0.4 || naPassagem(a, 0.06) || r > MURO - 0.03) continue;
      const x = Math.cos(a) * r,
        y = Math.sin(a) * r;
      const z = perfilEdoras(r + d / 2);
      const giro = a + Math.PI / 2;
      bloco(madeira, x, y, w, d, h, z, giro);
      peca(telhado, palha, x, y, z + h, w * 1.1, d * 1.3, 0.006, giro);
    }
  }

  // Túmulos dos reis ao lado do caminho que sai do portão; flores brancas de simbelmynë sobre eles.
  const tumulo = (x: number, y: number) => {
    peca(monte, relva, x, y, 0, 0.011, 0.011, 0.007);
    for (let k = 0; k < 5; k++) bloco(flor, x + (rand() - 0.5) * 0.01, y + (rand() - 0.5) * 0.01, 0.0012, 0.0012, 0.0012, 0.004 + rand() * 0.002);
  };
  for (let k = 0; k < 11; k++) bloco(pedra, 0, MURO + 0.06 + k * 0.022, 0.012, 0.023, 0.0012);
  for (let k = 0; k < oeste; k++) tumulo(-0.028, MURO + 0.07 + k * 0.022);
  for (let k = 0; k < leste; k++) tumulo(0.028, MURO + 0.07 + k * 0.022);

  finalizar(cidade);
  return cidade;
}
