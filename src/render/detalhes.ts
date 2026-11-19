import * as THREE from 'three';
import type { Globo } from './globo';
import { ARMENELOS, CAIS_ROMENNA, COLINA_MENEGROTH, EDORAS, faseArmenelos, faseMenegroth, MENEGROTH, faseNargothrond, MARGEM_NARGOTHROND, NARGOTHROND, faseEdoras, faseGondolin, faseMinasTirith, faseRomenna, GONDOLIN, MINAS_TIRITH, ROMENNA } from '../core/detalhes';
import type { Lugar } from '../core/types';
import { NOVAS_VISITAS } from '../core/visitas';
import type { ModeloTerreno } from '../terrain/model';
import type { UniformesGlobais } from '../terrain/material';
import { criarGondolin } from './gondolin';
import { criarAvallone } from './avallone';
import { criarMinasTirith } from './minas-tirith';
import { criarEdoras } from './edoras';
import { criarArmenelos, criarRomenna } from './numenor';
import { criarAndunie, criarEldalonde, criarEmerie, criarHyarastorni, criarNindamos, criarNoirinan } from './numenor-assentamentos';
import { criarMenegroth } from './menegroth';
import { criarKhazadDum } from './khazad-dum';
import { criarNargothrond } from './nargothrond';
import { criarArmada, criarCalmindon, criarCapitalNorte, criarFortaleza, criarOsgiliath, criarOstInEdhil, criarPorto, criarTirion, criarValmar } from './cidades';
import { criarAbismo, criarAngband, criarCarasGaladhon, criarCinturao, criarMeneltarma, criarOrfalch, criarRammas, criarSaloes } from './paisagens';

interface Sitio {
  lugar: Lugar;
  fase: (t: number) => string | null;
  criar: (fase: string, terreno: ModeloTerreno, em: [number, number], h: number, corte: boolean) => THREE.Group;
  /** Objetos abaixo do chão da cidade, esticados com o exagero do relevo. */
  profundos: string[];
  /** Raio (km) em que o chão é amostrado: a cidade fica no ponto mais alto, sem ser enterrada. */
  raio: number;
  /** Ponto de assentamento, quando difere do marcador do lugar (porto junto à água). */
  em?: [number, number];
  /** Altura acima do terreno (km); menor nos portos, para o cais ficar perto do mar. */
  folga?: number;
  alcance?: number;
  agua?: boolean;
  segueTerreno?: boolean;
}

const ARQUITETURA: Record<string, Sitio['criar']> = {
  avallone: criarAvallone,
  osgiliath: criarOsgiliath,
  'rammas-echor': criarRammas,
  'minas-ithil': (f) => criarFortaleza('Minas Ithil', f),
  'abismo-de-helm': criarAbismo,
  meneltarma: (_f, terreno, em, h) => criarMeneltarma(terreno, em, h),
  andunie: criarAndunie,
  eldalonde: criarEldalonde,
  nindamos: criarNindamos,
  emerie: criarEmerie,
  hyarastorni: criarHyarastorni,
  noirinan: criarNoirinan,
  'grande-armada': criarArmada,
  'tol-uinen': criarCalmindon,
  'orfalch-echor': criarOrfalch,
  mithlond: () => criarPorto('Mithlond', 0.33, true),
  'ost-in-edhil': criarOstInEdhil,
  annuminas: (f) => criarCapitalNorte('Annúminas', f),
  fornost: (f) => criarCapitalNorte('Fornost Erain', f),
  'carn-dum': (f) => criarFortaleza('Carn Dûm', f),
  'barad-dur': (f) => criarFortaleza('Barad-dûr', f),
  angband: criarAngband,
  tirion: criarTirion,
  valmar: criarValmar,
  'khazad-dum': criarKhazadDum,
  erebor: (f) => criarSaloes('Erebor', f),
  'caras-galadhon': criarCarasGaladhon,
  'saloes-thranduil': (f) => criarSaloes('Salões de Thranduil', f),
  'cinturao-melian': (_f, terreno, em, h) => criarCinturao(terreno, em, h),
};

const SITIOS: Sitio[] = [
  { lugar: GONDOLIN, fase: faseGondolin, criar: criarGondolin as Sitio['criar'], profundos: ['Amon Gwareth', 'Escadaria'], raio: 0, segueTerreno: true },
  { lugar: MINAS_TIRITH, fase: faseMinasTirith, criar: criarMinasTirith as Sitio['criar'], profundos: ['Rocha'], raio: 0.65 },
  { lugar: EDORAS, fase: faseEdoras, criar: criarEdoras, profundos: ['Base'], raio: 0, segueTerreno: true },
  { lugar: ARMENELOS, fase: faseArmenelos, criar: criarArmenelos as Sitio['criar'], profundos: ['Base'], raio: 0 },
  { lugar: MENEGROTH, fase: faseMenegroth, criar: criarMenegroth as Sitio['criar'], profundos: ['Base'], raio: 0, em: COLINA_MENEGROTH, folga: 0.008 },
  { lugar: NARGOTHROND, fase: faseNargothrond, criar: (f, _terreno, _em, _h, corte) => corte
    ? criarSaloes('Salões de Nargothrond', f)
    : criarNargothrond(f as Parameters<typeof criarNargothrond>[0]), profundos: ['Base'], raio: 0, em: MARGEM_NARGOTHROND, folga: 0.008 },
  { lugar: ROMENNA, fase: faseRomenna, criar: criarRomenna as Sitio['criar'], profundos: ['Base'], raio: 0, em: CAIS_ROMENNA, folga: 0.006 },
  ...NOVAS_VISITAS.map(({ lugar, em, agua, raio, vista, fase }): Sitio => ({
    lugar, em, agua, raio: raio ?? 0, fase, criar: ARQUITETURA[lugar.id], profundos: [],
    folga: agua ? 0 : 0.006, alcance: Math.max(14, vista.d * 2.6),
    segueTerreno: ['meneltarma', 'emerie', 'hyarastorni', 'noirinan', 'orfalch-echor', 'rammas-echor', 'cinturao-melian'].includes(lugar.id),
  })),
];

export class DetalhesReinos {
  readonly grupo = new THREE.Group();
  readonly cortes = { menegroth: true, nargothrond: false };
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
    if (s.agua) return 0;
    let porSitio = this.alturas.get(terreno);
    if (!porSitio) this.alturas.set(terreno, (porSitio = new Map()));
    let h = porSitio.get(s);
    if (h == null) {
      const [x, y] = s.em ?? s.lugar.em;
      h = terreno.altura(x, y);
      if (s.raio > 0) for (let k = 0; k < 8; k++) h = Math.max(h, terreno.altura(x + Math.cos(k * Math.PI / 4) * s.raio, y + Math.sin(k * Math.PI / 4) * s.raio));
      porSitio.set(s, h);
    }
    return h;
  }

  /** Chamada para cada viewport: a comparação usa o estado e o relevo daquele lado. */
  atualizar(t: number, camera: THREE.Camera, terreno: ModeloTerreno | null, u: UniformesGlobais, habilitado: boolean, globo?: Globo, assinaturaTerreno = '') {
    this.grupo.visible = false;
    if (!habilitado || !terreno) return;
    for (const modelo of this.modelos.values()) modelo.visible = false;
    for (const s of SITIOS) {
      const fase = s.fase(t);
      if (!fase) continue;
      const h = this.altura(s, terreno);
      const [x, y] = s.em ?? s.lugar.em;
      const z = h * u.uExag.value + (s.folga ?? 0.035);
      // ponytail: no globo só a posição é curvada; a inclinação do modelo (< 1,5° a 150 km do alvo) é ignorada
      if (globo) globo.paraMundo(x, y, z, this.centro);
      else this.centro.set(x, y, z);
      if ((!s.agua && h <= 0) || camera.position.distanceToSquared(this.centro) > (s.alcance ?? 150) ** 2) continue;
      const corte = s.lugar.id === 'nargothrond' && this.cortes.nargothrond;
      const chave = `${s.lugar.id}:${fase}${corte ? ':corte' : ''}${s.segueTerreno ? ':' + assinaturaTerreno : ''}`;
      let cidade = this.modelos.get(chave);
      if (!cidade) {
        cidade = s.criar(fase, terreno, [x, y], h, corte);
        this.modelos.set(chave, cidade);
        this.grupo.add(cidade);
      }
      cidade.position.copy(this.centro);
      for (const nome of s.profundos) cidade.getObjectByName(nome)!.scale.z = u.uExag.value;
      const base = cidade.getObjectByName('Base');
      if (base) base.scale.z = u.uExag.value;
      const fecho = cidade.getObjectByName('Fecho da colina');
      if (fecho) fecho.visible = !this.cortes.menegroth;
      const relevo = cidade.getObjectByName('Relevo');
      if (relevo) relevo.scale.z = u.uExag.value;
      const pontos = cidade.getObjectByName('Pontos no relevo');
      if (pontos) {
        pontos.scale.z = u.uExag.value;
        for (const p of pontos.children) p.scale.z = 1 / u.uExag.value;
      }
      // navios e molhes ficam no nível do mar, abaixo do chão da cidade
      const mar = cidade.getObjectByName('Mar');
      if (mar) mar.position.z = -z;
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
