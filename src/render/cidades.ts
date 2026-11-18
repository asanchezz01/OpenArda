import * as THREE from 'three';
import { maquete } from './arquitetura';
import { casco, cilindro, cone, copa, material } from './oficina';

const marfim = material(0xe5dbbf);
const madeira = material(0x634430);
const ardósia = material(0x435962);
const cobre = material(0x538d83);
const negro = material(0x292a30);
const fogo = material(0xff9946, { emissive: 0x9a2f0c });
const agua = material(0x325c68, { roughness: 0.32 });

export function criarPorto(nome: string, giro: number, cinzento: boolean) {
  const o = maquete(nome, cinzento ? 425 : 199);
  o.grupo.rotation.z = giro;
  const cais = cinzento ? o.pedra : marfim;
  o.bloco(cais, 0, -0.15, 1.4, 0.22, 0.052, -0.016);
  o.bloco(o.relva, 0, -0.49, 1.38, 0.51, 0.08, -0.028);
  for (const x of [-0.45, -0.01, 0.38]) {
    o.bloco(cais, x, 0.07, 0.078, 0.33, 0.047, -0.012);
    o.casa(cais, cinzento ? ardósia : cobre, x, -0.28, 0.04, 0.18, 0.084, 0.058, 0);
    o.torre(cais, x + 0.085, -0.28, 0.027, 0.12, 0.04, cinzento ? ardósia : cobre);
    const navioX = x + 0.09;
    o.peca(casco, madeira, navioX, 0.17, -0.008, 0.12, 0.035, 0.022, Math.PI / 2);
    o.peca(cilindro, madeira, navioX, 0.17, 0.047, 0.003, 0.003, 0.076);
    o.bloco(marfim, navioX, 0.173, 0.058, 0.004, 0.044, 0.035);
  }
  o.casas(cais, cinzento ? ardósia : cobre, 0, -0.51, 1.24, 0.39, 0.05, 38);
  o.arco(cais, -0.68, -0.15, -0.011, 0.13, 0.12, 0.094);
  if (cinzento) {
    // Estaleiro: uma rampa desce do armazém para o golfo.
    const rampa = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.27, 0.018), madeira);
    rampa.rotation.x = -0.18;
    rampa.position.set(0.63, -0.029, 0.022);
    o.grupo.add(rampa);
    o.peca(casco, madeira, 0.63, -0.045, 0.017, 0.15, 0.046, 0.022, Math.PI / 2);
  }
  return o.montar();
}

export function criarCalmindon() {
  const o = maquete('Calmindon', 32);
  for (let i = 0; i < 11; i++) {
    const a = i * Math.PI * 2 / 11;
    o.peca(copa, o.rocha, Math.cos(a) * 0.087, Math.sin(a) * 0.062, -0.018, 0.06, 0.05, 0.09, a);
  }
  o.peca(cilindro, o.relva, 0, 0, 0.017, 0.105, 0.082, 0.07);
  o.peca(cilindro, o.pedra, 0, 0, 0.063, 0.059, 0.059, 0.027);
  o.torre(marfim, 0, 0, 0.035, 0.15, 0.076);
  o.recinto(marfim, 0.049, 0.049, 0.222, 0.013, false, -1);
  o.peca(copa, fogo, 0, 0, 0.248, 0.012, 0.012, 0.020);
  o.bloco(madeira, -0.11, -0.064, 0.12, 0.028, 0.016);
  return o.montar();
}

export function criarArmada() {
  const o = maquete('Grande Armada', 3310);
  const vela = material(0xa34038);
  const tecido = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0.4, 0.94), new THREE.Vector2(-0.4, 1)]);
  const pano = new THREE.ShapeGeometry(tecido).rotateX(Math.PI / 2);
  vela.side = THREE.DoubleSide;
  for (let i = 0; i < 21; i++) {
    const x = (i % 7 - 3) * 0.23 + (o.rand() - 0.5) * 0.084;
    const y = (Math.floor(i / 7) - 1) * 0.32 + (o.rand() - 0.5) * 0.075;
    const s = i === 10 ? 1.4 : 0.82 + o.rand() * 0.22, rumo = 2.08;
    o.peca(casco, madeira, x, y, -0.018, 0.23 * s, 0.056 * s, 0.042 * s, rumo);
    for (const desvio of [-0.05, 0.04]) {
      const px = x + Math.cos(rumo) * desvio, py = y + Math.sin(rumo) * desvio;
      o.peca(cilindro, madeira, px, py, 0.071 * s, 0.004, 0.004, 0.102 * s);
      o.peca(pano, vela, px, py, 0.054 * s, 0.069 * s, 1, 0.073 * s, rumo + Math.PI / 2);
    }
  }
  return o.montar();
}

export function criarOsgiliath(fase: string) {
  const o = maquete('Osgiliath', 418);
  const ruina = fase !== 'integra';
  // Eixo Y local acompanha o trecho entre os vértices do Anduin.
  o.grupo.rotation.z = -Math.atan2(3, 10);
  o.bloco(agua, 0, 0, 0.68, 3.5, 0.018, -0.055);
  for (const lado of [-1, 1]) {
    o.bloco(o.pedra, lado * 0.79, 0, 0.94, 2.32, 0.24, -0.235);
    o.bloco(o.relva, lado * 0.82, 0, 0.86, 2.31, 0.012, 0.005);
    o.bloco(marfim, lado * 0.39, 0, 0.19, 2.28, 0.024, 0.01);
    o.bloco(marfim, lado * 0.82, 0, 0.85, 0.13, 0.023, 0.012);
    for (const y of [-0.77, -0.34, 0.34, 0.77]) o.casas(o.pedra, ardósia, lado * 0.84, y, 0.65, 0.34, 0.018, 22, ruina);
    o.torre(o.pedra, lado * 0.53, -0.14, 0.046, ruina ? 0.05 : 0.13, 0.023);
  }
  for (let i = -2; i <= 2; i++) {
    if (i === 0 && fase === 'ponte-partida') continue;
    o.arco(o.pedra, i * 0.16, 0, -0.062, 0.166, 0.135, ruina && i === 0 ? 0.09 : 0.152);
  }
  if (!ruina) {
    o.rotunda(marfim, cobre, -0.11, 0, 0.128, 0.093, 0.13);
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      o.peca(cilindro, o.pedra, -0.11 + Math.cos(a) * 0.124, Math.sin(a) * 0.124, 0.152, 0.009, 0.009, 0.115);
    }
  } else {
    for (let i = 0; i < 23; i++) {
      const x = (o.rand() - 0.5) * 0.31 - 0.11, y = (o.rand() - 0.5) * 0.09;
      if (fase === 'ponte-partida' && Math.abs(x) < 0.085) continue;
      o.peca(copa, o.rocha, x, y, 0.041, 0.023, 0.019, 0.022, o.rand() * 6);
    }
  }
  return o.montar();
}

export function criarOstInEdhil(fase: string) {
  const o = maquete('Ost-in-Edhil', 218);
  const ruina = fase !== 'ativo';
  o.aterro(0.61, 0.47);
  o.recinto(marfim, 0.53, 0.39, 0, 0.055, ruina);
  o.bloco(o.pedra, 0, 0, 0.59, 0.25, 0.012);
  for (const x of [-0.24, 0, 0.24]) {
    for (const y of [-0.23, 0.21]) {
      if (ruina) {
        o.muro(o.pedra, [x - 0.08, y], [x + 0.035, y], 0, 0.019, 0.015);
        o.peca(copa, o.rocha, x, y - 0.04, 0.012, 0.075, 0.031, 0.022, x);
      } else {
        o.casa(marfim, cobre, x, y, 0.013, 0.182, 0.114, 0.058, 0);
        o.bloco(o.rocha, x + 0.047, y + 0.018, 0.027, 0.025, 0.1, 0.015);
      }
      o.bloco(o.rocha, x - 0.015, y * 0.48, 0.053, 0.041, 0.017, 0.011);
      if (!ruina) o.bloco(fogo, x - 0.015, y * 0.48, 0.032, 0.023, 0.009, 0.027);
    }
  }
  for (const x of [-0.37, 0.37]) o.casas(marfim, ardósia, x, 0, 0.15, 0.29, 0, 13, ruina);
  return o.montar();
}

export function criarCapitalNorte(nome: string, fase: string) {
  const lago = nome === 'Annúminas', ruina = fase !== 'ativo';
  const o = maquete(nome, lago ? 609 : 784);
  o.aterro(0.57, 0.42, lago ? 0.22 : 0.15, o.relva);
  o.recinto(o.pedra, 0.51, 0.37, 0, 0.057, ruina, lago ? 1 : 8);
  if (lago) {
    o.bloco(o.pedra, 0.48, 0.22, 0.27, 0.11, 0.22, -0.205, 0.45);
    o.torre(marfim, -0.12, 0.03, 0.073, ruina ? 0.061 : 0.26, 0, ruina ? undefined : ardósia);
    if (!ruina) o.rotunda(o.pedra, ardósia, 0.1, 0.06, 0.077, 0.005, 0.049);
  } else {
    o.recinto(marfim, 0.24, 0.19, 0.038, 0.081, ruina, 8);
    o.peca(cilindro, o.rocha, 0, 0, 0.013, 0.265, 0.22, 0.051);
    o.bloco(marfim, 0, 0.06, 0.17, 0.15, ruina ? 0.03 : 0.17, 0.035);
    if (!ruina) o.telhado(ardósia, 0, 0.06, 0.205, 0.18, 0.16, 0.055);
  }
  o.casas(marfim, ardósia, 0, -0.23, 0.67, 0.087, 0, 29, ruina);
  o.casas(marfim, ardósia, 0, 0.21, 0.64, 0.10, 0, 25, ruina);
  return o.montar();
}

export function criarTirion() {
  const o = maquete('Tirion', 626);
  o.aterro(0.88, 0.6, 0.22, o.relva);
  for (const [i, raio] of [0.83, 0.61, 0.39].entries()) {
    const z = i * 0.111;
    o.peca(cilindro, marfim, -i * 0.09, 0, z + 0.025, raio, raio * 0.64, 0.05);
    o.recinto(marfim, raio * 0.92, raio * 0.58, z + 0.025, 0.032, false, 0);
    for (const y of [-raio * 0.24, raio * 0.24]) o.casas(marfim, cobre, -i * 0.09, y, raio * 1.25, raio * 0.32, z + 0.05, 26);
    if (i < 2) for (let deg = 0; deg < 15; deg++) o.bloco(o.pedra, raio - deg * 0.019, 0, 0.024, 0.112, (deg + 1) * 0.0075, z + 0.025);
  }
  o.rotunda(marfim, cobre, -0.22, 0, 0.13, 0.263, 0.075);
  o.torre(marfim, -0.22, 0, 0.038, 0.42, 0.365);
  const lampada = material(0xffffff, { emissive: 0xb9d9ff, emissiveIntensity: 1.4 });
  o.peca(copa, lampada, -0.22, 0, 0.815, 0.019, 0.019, 0.032);
  o.peca(cone, marfim, -0.22, 0, 0.861, 0.04, 0.04, 0.056);
  return o.montar();
}

export function criarValmar() {
  const o = maquete('Valmar', 73);
  o.aterro(0.79, 0.56, 0.12);
  o.recinto(marfim, 0.72, 0.49, 0, 0.052, false, 6);
  o.bloco(marfim, -0.13, 0, 1.21, 0.117, 0.016);
  o.arco(marfim, -0.67, 0, 0, 0.16, 0.047, 0.108, Math.PI / 2);
  const bronze = material(0xad8251);
  for (const x of [-0.43, -0.16, 0.12, 0.42]) {
    for (const y of [-0.24, 0.24]) {
      const h = x > 0 ? 0.142 : 0.116;
      o.torre(marfim, x, y, 0.044, h);
      for (const dx of [-0.029, 0.029]) for (const dy of [-0.029, 0.029]) o.bloco(marfim, x + dx, y + dy, 0.012, 0.012, 0.078, h);
      o.peca(cone, bronze, x, y, h + 0.029, 0.022, 0.022, 0.044);
      o.peca(cone, cobre, x, y, h + 0.108, 0.055, 0.055, 0.061);
    }
  }
  o.rotunda(marfim, cobre, 0.43, 0, 0.132, 0.013, 0.069);
  return o.montar();
}

export function criarFortaleza(nome: string, fase: string) {
  const mordor = nome === 'Barad-dûr';
  const morgul = fase === 'morgul';
  const ruina = ['ruina', 'ruinas', 'alicerces'].includes(fase);
  const o = maquete(nome, mordor ? 1000 : morgul ? 2002 : 27);
  const pedra = mordor ? negro : morgul ? material(0x6a8575) : o.pedra;
  o.aterro(mordor ? 1.0 : 0.52, mordor ? 0.78 : 0.43, 0.35);
  const s = mordor ? 1.64 : 1;
  o.recinto(pedra, 0.48 * s, 0.37 * s, 0, (mordor && fase === 'ruinas' ? 0.028 : 0.069) * s, ruina);
  o.recinto(pedra, 0.29 * s, 0.25 * s, 0.082 * s, 0.065 * s, ruina);
  o.peca(cilindro, o.rocha, 0, 0, 0.04 * s, 0.31 * s, 0.27 * s, 0.086 * s);
  const h = fase === 'alicerces' ? 0.06 : ruina ? (mordor ? 0.025 : 0.115) : fase === 'construcao' ? 0.27 : mordor ? 0.82 : 0.31;
  o.bloco(pedra, 0, 0.06, s * 0.257, s * 0.24, h, 0.083 * s);
  if (fase !== 'alicerces' && !(mordor && fase === 'ruinas')) {
    for (const x of [-0.125, 0.125]) {
      o.bloco(pedra, x * s, 0.06, 0.062 * s, s * 0.27, h * (mordor ? 0.81 : 0.93), 0.083 * s);
      o.torre(pedra, x * 1.96 * s, -0.04 * s, 0.044 * s, h * 0.54, 0.075 * s, ruina ? undefined : (morgul ? pedra : ardósia));
    }
  }
  if (!ruina) {
    o.torre(pedra, 0, 0.067, 0.085 * s, h * 0.31, 0.083 * s + h, mordor ? negro : morgul ? undefined : ardósia);
    o.arco(pedra, 0, -0.34 * s, 0, 0.15 * s, 0.046 * s, 0.091 * s);
  }
  if (morgul) {
    const luz = material(0xb3d9bd, { emissive: 0x4db48d, emissiveIntensity: 0.75 });
    for (let i = 0; i < 5; i++) o.bloco(luz, 0, -0.063, 0.017, 0.003, 0.024, 0.113 + i * 0.049);
    o.peca(cilindro, luz, 0, 0.067, 0.491, 0.086, 0.086, 0.016);
    o.arco(o.pedra, 0, -0.43, -0.079, 0.15, 0.075, 0.095, Math.PI / 2);
  }
  if (nome === 'Carn Dûm') {
    const via = [[-0.42, -0.58], [0.18, -0.49], [-0.29, -0.42], [0, -0.34]] as const;
    for (let i = 1; i < via.length; i++) o.muro(o.rocha, [...via[i - 1]], [...via[i]], -0.06 + i * 0.012, 0.018, 0.037);
  }
  if (ruina) for (let i = 0; i < 30; i++) o.peca(copa, o.rocha, (o.rand() - 0.5) * s * 0.65, (o.rand() - 0.5) * s * 0.53, 0.025, 0.044 * s, 0.054 * s, 0.039 * s, o.rand() * 6);
  return o.montar();
}
