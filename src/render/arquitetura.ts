import * as THREE from 'three';
import type { Pt } from '../core/types';
import { cone, cupula, cilindro, material, oficina } from './oficina';

export function maquete(nome: string, semente: number) {
  const grupo = new THREE.Group();
  grupo.name = nome;
  const o = oficina(semente);
  const pedra = material(0xbeb6a6);
  const rocha = material(0x6b6460);
  const relva = material(0x696d46);

  function aterro(rx: number, ry: number, profundidade = 0.16, cor = rocha) {
    const suporte = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.24, 1, 24).rotateX(Math.PI / 2), cor);
    suporte.name = 'Base';
    suporte.geometry.scale(rx, ry, profundidade).translate(0, 0, -profundidade / 2);
    grupo.add(suporte);
  }

  function muro(mat: THREE.Material, a: Pt, b: Pt, z: number, h: number, d: number) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    o.bloco(mat, a[0] + dx / 2, a[1] + dy / 2, Math.hypot(dx, dy) + d * 0.35, d, h, z, Math.atan2(dy, dx));
  }

  function arco(mat: THREE.Material, x: number, y: number, z: number, w: number, d: number, h: number, ang = 0) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(-w * 0.37, 0);
    s.lineTo(-w * 0.37, h * 0.38);
    s.quadraticCurveTo(0, h * 1.14, w * 0.37, h * 0.38);
    s.lineTo(w * 0.37, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(w / 2, h);
    s.lineTo(-w / 2, h);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 10 });
    geo.translate(0, 0, -d / 2).rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.z = ang;
    grupo.add(mesh);
    return mesh;
  }

  function recinto(mat: THREE.Material, rx: number, ry: number, z: number, h: number, ruina = false, entrada = 9) {
    const pontos: Pt[] = Array.from({ length: 12 }, (_, i) => [rx * Math.cos(i * Math.PI / 6), ry * Math.sin(i * Math.PI / 6)]);
    pontos.forEach((p, i) => {
      if (i === entrada || (ruina && (i === 4 || i === 10))) return;
      muro(mat, p, pontos[(i + 1) % pontos.length], z, h * (ruina && i % 3 === 0 ? 0.28 : 1), 0.017);
      if (i % 2 === 0) o.peca(cilindro, mat, ...p, z + h * 0.54, 0.027, 0.027, h * 1.08);
    });
  }

  function casas(mat: THREE.Material, telha: THREE.Material, x: number, y: number, w: number, d: number, z: number, n: number, ruina = false) {
    for (let i = 0; i < n; i++) {
      const px = x + (o.rand() - 0.5) * w, py = y + (o.rand() - 0.5) * d;
      const s = 0.022 + o.rand() * 0.028, ang = o.rand() * 0.26;
      if (ruina) {
        o.bloco(mat, px, py, s, 0.004, s * (0.15 + o.rand() * 0.38), z, ang);
        o.bloco(mat, px - s * 0.45, py + s * 0.25, 0.004, s * 0.5, s * 0.3, z, ang);
      } else {
        o.casa(mat, telha, px, py, z, s, 0.7 * s, 0.67 * s, ang);
      }
    }
  }

  function torre(mat: THREE.Material, x: number, y: number, r: number, h: number, z = 0, ponta?: THREE.Material) {
    o.peca(cilindro, mat, x, y, z + h * 0.5, r, r, h);
    o.peca(cilindro, mat, x, y, z + h, r * 1.13, r * 1.13, Math.min(0.011, h * 0.2));
    if (ponta) o.peca(cone, ponta, x, y, z + h + r * 0.65, r * 1.13, r * 1.13, r * 1.3);
  }

  function rotunda(mat: THREE.Material, teto: THREE.Material, x: number, y: number, r: number, z: number, h: number) {
    torre(mat, x, y, r, h, z);
    o.peca(cupula, teto, x, y, z + h, r, r, r * 0.76);
  }

  return { ...o, grupo, pedra, rocha, relva, aterro, muro, arco, recinto, casas, torre, rotunda, montar: () => { o.finalizar(grupo); return grupo; } };
}
