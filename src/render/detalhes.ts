import * as THREE from 'three';
import { faseGondolin, faseMinasTirith, GONDOLIN, MINAS_TIRITH } from '../core/detalhes';
import type { Lugar } from '../core/types';
import type { ModeloTerreno } from '../terrain/model';
import type { UniformesGlobais } from '../terrain/material';
import { criarGondolin } from './gondolin';
import { criarMinasTirith } from './minas-tirith';

interface Sitio {
  lugar: Lugar;
  fase: (t: number) => string | null;
  criar: (fase: string) => THREE.Group;
  /** Objetos abaixo do chão da cidade, esticados com o exagero do relevo. */
  profundos: string[];
  /** Raio (km) em que o chão é amostrado: a cidade fica no ponto mais alto, sem ser enterrada. */
  raio: number;
}

const SITIOS: Sitio[] = [
  { lugar: GONDOLIN, fase: faseGondolin, criar: criarGondolin as Sitio['criar'], profundos: ['Amon Gwareth', 'Escadaria'], raio: 0 },
  { lugar: MINAS_TIRITH, fase: faseMinasTirith, criar: criarMinasTirith as Sitio['criar'], profundos: ['Rocha'], raio: 0.65 },
];

export class DetalhesReinos {
  readonly grupo = new THREE.Group();
  private modelos = new Map<string, THREE.Group>();
  private alturas = new WeakMap<ModeloTerreno, Map<Sitio, number>>();
  private sol = new THREE.DirectionalLight(0xffffff, 2.2);
  private ambiente = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.6);
  private centro = new THREE.Vector3();

  constructor() {
    this.grupo.name = 'Detalhes dos reinos';
    this.grupo.visible = false;
    this.ambiente.position.set(0, 0, 1);
    this.grupo.add(this.sol, this.ambiente);
  }

  private altura(s: Sitio, terreno: ModeloTerreno): number {
    let porSitio = this.alturas.get(terreno);
    if (!porSitio) this.alturas.set(terreno, (porSitio = new Map()));
    let h = porSitio.get(s);
    if (h == null) {
      const [x, y] = s.lugar.em;
      h = terreno.altura(x, y);
      if (s.raio > 0) for (let k = 0; k < 8; k++) h = Math.max(h, terreno.altura(x + Math.cos(k * Math.PI / 4) * s.raio, y + Math.sin(k * Math.PI / 4) * s.raio));
      porSitio.set(s, h);
    }
    return h;
  }

  /** Chamada para cada viewport: a comparação usa o estado e o relevo daquele lado. */
  atualizar(t: number, camera: THREE.Camera, terreno: ModeloTerreno | null, u: UniformesGlobais, habilitado: boolean) {
    this.grupo.visible = false;
    if (!habilitado || !terreno) return;
    for (const modelo of this.modelos.values()) modelo.visible = false;
    for (const s of SITIOS) {
      const fase = s.fase(t);
      if (!fase) continue;
      const h = this.altura(s, terreno);
      this.centro.set(s.lugar.em[0], s.lugar.em[1], h * u.uExag.value + 0.035);
      if (h <= 0 || camera.position.distanceToSquared(this.centro) > 150 * 150) continue;
      const chave = `${s.lugar.id}:${fase}`;
      let cidade = this.modelos.get(chave);
      if (!cidade) {
        cidade = s.criar(fase);
        this.modelos.set(chave, cidade);
        this.grupo.add(cidade);
      }
      cidade.position.copy(this.centro);
      for (const nome of s.profundos) cidade.getObjectByName(nome)!.scale.z = u.uExag.value;
      cidade.visible = true;
      this.grupo.visible = true;
    }
    if (!this.grupo.visible) return;
    this.sol.position.copy(u.uSunDir.value);
    this.sol.color.copy(u.uSunColor.value);
    this.ambiente.color.copy(u.uSky.value);
    this.ambiente.groundColor.copy(u.uGround.value);
  }
}
