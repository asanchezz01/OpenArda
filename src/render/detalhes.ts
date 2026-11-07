import * as THREE from 'three';
import { faseGondolin, GONDOLIN, type FaseGondolin } from '../core/detalhes';
import type { ModeloTerreno } from '../terrain/model';
import type { UniformesGlobais } from '../terrain/material';
import { criarGondolin } from './gondolin';

export class DetalhesReinos {
  readonly grupo = new THREE.Group();
  private modelos = new Map<FaseGondolin, THREE.Group>();
  private alturas = new WeakMap<ModeloTerreno, number>();
  private sol = new THREE.DirectionalLight(0xffffff, 2.2);
  private ambiente = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.6);
  private centro = new THREE.Vector3();

  constructor() {
    this.grupo.name = 'Detalhes dos reinos';
    this.grupo.visible = false;
    this.ambiente.position.set(0, 0, 1);
    this.grupo.add(this.sol, this.ambiente);
  }

  /** Chamada para cada viewport: a comparação usa o estado e o relevo daquele lado. */
  atualizar(t: number, camera: THREE.Camera, terreno: ModeloTerreno | null, u: UniformesGlobais, habilitado: boolean) {
    this.grupo.visible = false;
    const fase = faseGondolin(t);
    if (!habilitado || !fase || !terreno) return;
    let h = this.alturas.get(terreno);
    if (h == null) {
      h = terreno.altura(...GONDOLIN.em);
      this.alturas.set(terreno, h);
    }
    this.centro.set(GONDOLIN.em[0], GONDOLIN.em[1], h * u.uExag.value + 0.035);
    if (h <= 0 || camera.position.distanceToSquared(this.centro) > 150 * 150) return;
    let cidade = this.modelos.get(fase);
    if (!cidade) {
      cidade = criarGondolin(fase);
      this.modelos.set(fase, cidade);
      this.grupo.add(cidade);
    }
    for (const modelo of this.modelos.values()) modelo.visible = modelo === cidade;
    cidade.position.copy(this.centro);
    cidade.getObjectByName('Amon Gwareth')!.scale.z = u.uExag.value;
    cidade.getObjectByName('Escadaria')!.scale.z = u.uExag.value;
    this.sol.position.copy(u.uSunDir.value);
    this.sol.color.copy(u.uSunColor.value);
    this.ambiente.color.copy(u.uSky.value);
    this.ambiente.groundColor.copy(u.uGround.value);
    this.grupo.visible = true;
  }
}
