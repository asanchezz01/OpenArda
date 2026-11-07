import * as THREE from 'three';

/** Agrupa peças repetidas: uma chamada de desenho por combinação de geometria/material, não por edifício. */
export function criarLotes() {
  const lotes = new Map<string, { geo: THREE.BufferGeometry; mat: THREE.Material; matrizes: THREE.Matrix4[] }>();
  const transform = new THREE.Object3D();
  const caixa = new THREE.BoxGeometry(1, 1, 1);

  function peca(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, ang = 0) {
    const chave = geo.uuid + mat.uuid;
    if (!lotes.has(chave)) lotes.set(chave, { geo, mat, matrizes: [] });
    transform.position.set(x, y, z);
    transform.scale.set(sx, sy, sz);
    transform.rotation.set(0, 0, ang);
    transform.updateMatrix();
    lotes.get(chave)!.matrizes.push(transform.matrix.clone());
  }

  /** Caixa apoiada em z, com altura h. */
  function bloco(mat: THREE.Material, x: number, y: number, w: number, d: number, h: number, z = 0, ang = 0) {
    peca(caixa, mat, x, y, z + h / 2, w, d, h, ang);
  }

  function finalizar(grupo: THREE.Object3D) {
    for (const { geo, mat, matrizes } of lotes.values()) {
      const mesh = new THREE.InstancedMesh(geo, mat, matrizes.length);
      matrizes.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.computeBoundingSphere();
      grupo.add(mesh);
    }
  }

  return { caixa, peca, bloco, finalizar };
}
