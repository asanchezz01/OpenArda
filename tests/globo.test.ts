import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Globo, RAIO_ARDA } from '../src/render/globo';
import { tempo } from '../src/core/data';

describe('mundo redondo', () => {
  const g = new Globo();
  g.atualizar(1, 1500, -600); // alvo em Gondor

  it('o alvo fica no topo da esfera, sem deslocamento', () => {
    const p = g.paraMundo(1500, -600, 2);
    expect(p.x).toBeCloseTo(1500, 6);
    expect(p.y).toBeCloseTo(-600, 6);
    expect(p.z).toBeCloseTo(2, 6);
  });

  it('ida e volta entre a grade e o mundo 3D', () => {
    for (const [x, y, h] of [[-2200, -700, 0], [4000, 1800, 3], [0, -200, 1]]) {
      const v = g.doMundo(g.paraMundo(x, y, h));
      expect(v.x).toBeCloseTo(x, 4);
      expect(v.y).toBeCloseTo(y, 4);
      expect(v.h).toBeCloseTo(h, 4);
    }
  });

  it('lugares distantes descem abaixo do horizonte', () => {
    const longe = g.paraMundo(-4500, 2000, 0);
    expect(longe.z).toBeLessThan(-1000);
    expect(g.visivel(longe, new THREE.Vector3(1500, -600, 50))).toBe(false);
    expect(g.visivel(g.paraMundo(1520, -600, 0), new THREE.Vector3(1500, -600, 50))).toBe(true);
  });

  it('o raio vertical atinge o ponto sob a câmera', () => {
    const r = new THREE.Ray(new THREE.Vector3(1600, -500, 300), new THREE.Vector3(0, 0, -1));
    const p = g.interceptar(r, 0)!;
    expect(Math.hypot(p.x - 1600, p.y + 500)).toBeLessThan(10); // a curvatura desloca pouco a 140 km do alvo
    expect(g.R).toBe(RAIO_ARDA);
  });

  it('plano antes da Queda (k = 0) não altera nada', () => {
    const plano = new Globo();
    plano.atualizar(0, 0, 0);
    expect(plano.paraMundo(10, 20, 3).toArray()).toEqual([10, 20, 3]);
    expect(tempo.fronteira('SE:3319', 0)).toBeGreaterThan(tempo.cursor('SE:3318'));
  });
});
