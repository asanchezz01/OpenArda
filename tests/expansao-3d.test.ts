// @vitest-environment jsdom
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { App } from '../src/app';
import { estadoTerreno, lugarPorId, reinoPorId, tempo, terreno } from '../src/core/data';
import { COLINA_MENEGROTH, MARGEM_NARGOTHROND, VISTA_TUMLADEN, faseTumladen } from '../src/core/detalhes';
import { NOVAS_VISITAS, PORTOES_ECHOR } from '../src/core/visitas';
import { maquete } from '../src/render/arquitetura';
import { DetalhesReinos } from '../src/render/detalhes';
import { arcada, moldura } from '../src/render/numenor-acabamentos';
import { casco } from '../src/render/oficina';
import { criarUniformesGlobais } from '../src/terrain/material';
import { ModeloTerreno } from '../src/terrain/model';
import { fichaLugar, fichaReino } from '../src/ui/fichas';
import { lerLink, montarLink } from '../src/ui/url';

const terrenoPorEstado = new Map<string, ModeloTerreno>();
function relevo(t: number) {
  const { assinatura, feicoes } = estadoTerreno(t);
  if (!terrenoPorEstado.has(assinatura)) terrenoPorEstado.set(assinatura, new ModeloTerreno(feicoes, terreno.cadeias, terreno.limites));
  return terrenoPorEstado.get(assinatura)!;
}

const destino = (id: string) => NOVAS_VISITAS.find((v) => v.id === id)!;
const nomeModelo = (v: typeof NOVAS_VISITAS[number]) => v.id === 'tol-uinen' ? 'Calmindon' : v.lugar.nome;

function atualizar(camada: DetalhesReinos, v: typeof NOVAS_VISITAS[number], ref: string, exagero = 2.5) {
  const t = tempo.cursor(ref), terreno = relevo(t);
  const u = criarUniformesGlobais();
  u.uExag.value = exagero;
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(v.vista.x, v.vista.y - v.vista.d * 0.7, Math.max(0, terreno.altura(v.vista.x, v.vista.y)) * exagero + v.vista.d * 0.7);
  camada.atualizar(t, camera, terreno, u, true);
  return camada.grupo.children.find((c) => c.name === nomeModelo(v) && c.visible) as THREE.Group | undefined;
}

describe('expansão dos reinos em 3D', () => {
  it.each(NOVAS_VISITAS)('$id é visitável pela ficha e cria geometria no relevo', (v) => {
    const app = { t: tempo.cursor(v.padrao) } as App;
    expect(fichaLugar(app, v.lugar)).toContain(`data-acao="visitar-3d" data-id="${v.id}"`);
    if (v.lugar.reino) expect(fichaReino(app, reinoPorId.get(v.lugar.reino)!)).toContain(`data-id="${v.id}"`);
    const camada = new DetalhesReinos(), modelo = atualizar(camada, v, v.padrao)!;
    expect(modelo).toBeDefined();
    const caixa = new THREE.Box3().setFromObject(modelo);
    expect(caixa.isEmpty()).toBe(false);
    expect([...caixa.min.toArray(), ...caixa.max.toArray()].every(Number.isFinite)).toBe(true);
    expect(atualizar(camada, v, v.padrao)).toBe(modelo);
  });

  it.each([
    ['avallone', 'AL:#al-queda-lampadas', null], ['avallone', 'AA:#aa-silmarils', 'ativo'],
    ['avallone', 'SE:3318', 'ativo'], ['avallone', 'SE:3319', null],
    ['osgiliath', 'SE:3319', null], ['osgiliath', 'TE:1437', 'incendiada'], ['osgiliath', 'TE:1640', 'ruinas'],
    ['osgiliath', 'TE:3018', 'ponte-partida'],
    ['barad-dur', 'SE:1000', 'construcao'], ['barad-dur', 'SE:1600', 'integra'], ['barad-dur', 'SE:3441', 'alicerces'],
    ['barad-dur', 'TE:2951', 'integra'], ['barad-dur', 'TE:3019', 'ruinas'],
    ['meneltarma', 'SE:3319', null], ['tirion', 'SE:3319', null], ['angband', 'PE:587', null],
    ['cinturao-melian', 'AA:#aa-primeira-batalha', 'ativo'], ['cinturao-melian', 'PE:503', null],
    ['grande-armada', 'SE:3309', null], ['grande-armada', 'SE:3310', 'ativo'], ['grande-armada', 'SE:3319', null],
    ['khazad-dum', 'SE:749', 'durin'], ['khazad-dum', 'SE:750', 'integra'],
    ['khazad-dum', 'TE:2989', 'balin'], ['khazad-dum', 'TE:2994', 'abandonado'], ['khazad-dum', 'TE:3018', 'lago'],
    ['erebor', 'TE:1998', null], ['erebor', 'TE:2770', 'smaug'], ['erebor', 'TE:2941', 'restaurada'],
  ])('%s em %s passa à fase %s', (id, ref, fase) => {
    expect(destino(id).fase(tempo.cursor(ref))).toBe(fase);
  });

  it('reconstrói a torre, os patamares e os barcos de Avallónë junto à costa', () => {
    const v = destino('avallone'), camada = new DetalhesReinos();
    const modelo = atualizar(camada, v, v.padrao)!;
    const torre = modelo.getObjectByName('Torre branca de Avallónë')!;
    const patamares = modelo.getObjectByName('Patamares de Avallónë')!;
    const barcos = modelo.getObjectByName('Veleiros e atracadouros')!;
    const max = (obj: THREE.Object3D) => new THREE.Box3().setFromObject(obj).max.z;
    expect(modelo.position.z).toBe(0);
    expect(max(torre)).toBeGreaterThan(max(patamares));
    expect(barcos.children.some((obj) => obj instanceof THREE.InstancedMesh && obj.geometry === casco)).toBe(true);
    expect(Math.abs(relevo(tempo.cursor(v.padrao)).distCosta(v.vista.x, v.vista.y))).toBeLessThan(0.05);
    expect(atualizar(camada, v, 'SE:3319')).toBeUndefined();
  });

  it('liga o panorama de Tumladen à cidade e aos portões, usando a bacia do relevo', () => {
    const t = tempo.cursor('PE:400');
    const ficha = fichaLugar({ t } as App, lugarPorId.get('tumladen')!);
    expect(ficha).toContain('data-acao="tumladen-3d"');
    expect(ficha).toContain('data-acao="gondolin-3d"');
    expect(ficha).toContain('data-acao="visitar-3d" data-id="orfalch-echor"');
    expect(fichaLugar({ t } as App, lugarPorId.get('gondolin')!)).toContain('data-acao="tumladen-3d"');
    const vale = relevo(t);
    const { x, y } = VISTA_TUMLADEN;
    expect(vale.altura(x - 14, y)).toBeCloseTo(vale.altura(x + 14, y), 1);
    expect(vale.altura(x - 42, y)).toBeGreaterThan(vale.altura(x - 14, y) + 0.4);
    expect(vale.altura(x, y)).toBeGreaterThan(vale.altura(x - 14, y) + 0.2);
    expect(faseTumladen(tempo.cursor('PE:586'))).toBe('ativo');
    expect(faseTumladen(tempo.cursor('PE:587'))).toBeNull();
    expect(relevo(tempo.cursor('PE:587')).distCosta(x, y)).toBeLessThan(0);
  });

  it('alternar o lado da comparação restaura a geometria correspondente', () => {
    const v = destino('barad-dur'), camada = new DetalhesReinos();
    const inteira = atualizar(camada, v, 'TE:3018')!;
    const ruinas = atualizar(camada, v, 'TE:3019')!;
    expect(inteira.visible).toBe(false);
    expect(ruinas).not.toBe(inteira);
    expect(new THREE.Box3().setFromObject(inteira).max.z).toBeGreaterThan(new THREE.Box3().setFromObject(ruinas).max.z);
    expect(atualizar(camada, v, 'TE:3018')).toBe(inteira);
    expect(ruinas.visible).toBe(false);
  });

  it('apoia os portões no desfiladeiro sem esticar a arquitetura', () => {
    const v = destino('orfalch-echor'), camada = new DetalhesReinos();
    expect(atualizar(camada, v, 'PE:472')!.getObjectByName('Pontos no relevo')!.children).toHaveLength(6);
    const g = atualizar(camada, v, 'PE:473', 5)!;
    g.updateMatrixWorld(true);
    const portoes = g.getObjectByName('Pontos no relevo')!.children;
    expect(portoes).toHaveLength(7);
    portoes.forEach((portao, i) => {
      const [x, y] = PORTOES_ECHOR[i].em;
      const pos = portao.getWorldPosition(new THREE.Vector3());
      expect(pos.x).toBeCloseTo(x);
      expect(pos.y).toBeCloseTo(y);
      expect(pos.z).toBeCloseTo(relevo(tempo.cursor('PE:473')).altura(x, y) * 5 + 0.006);
      expect(portao.getWorldScale(new THREE.Vector3()).z).toBeCloseTo(1);
    });
  });

  it('mantém navios na água e o armazém dos portos em terra', () => {
    for (const [id, giro] of [['andunie', 0], ['mithlond', 0.33]] as const) {
      const v = destino(id), m = relevo(tempo.cursor(v.padrao));
      const local = (x: number, y: number) => m.distCosta(v.vista.x + x * Math.cos(giro) - y * Math.sin(giro), v.vista.y + x * Math.sin(giro) + y * Math.cos(giro));
      for (const x of [-0.45, -0.01, 0.38]) {
        expect(local(x + 0.09, 0.17)).toBeLessThan(0);
        expect(local(x, -0.28)).toBeGreaterThan(0);
      }
    }
  });

  it.each([
    ['eldalonde', 'rio-nunduine', 1.22, [-0.37, 0.24], [-0.50, -0.265]],
    ['nindamos', 'rio-siril', Math.PI, [-0.481, 0.21], [-0.56, -0.21]],
  ] as const)('alinha %s à foz e mantém barcos na água e edificações em terra', (id, rio, giro, barco, casa) => {
    const v = destino(id), m = relevo(tempo.cursor(v.padrao));
    const local = ([x, y]: readonly [number, number]) => m.distCosta(v.vista.x + x * Math.cos(giro) - y * Math.sin(giro), v.vista.y + x * Math.sin(giro) + y * Math.cos(giro));
    expect(local(barco)).toBeLessThan(0);
    expect(local(casa)).toBeGreaterThan(0);
    expect(m.distCosta(...v.lugar.em)).toBeGreaterThan(0);
    expect(Math.hypot(v.lugar.em[0] - v.vista.x, v.lugar.em[1] - v.vista.y)).toBeLessThan(0.25);
    const pontos = terreno.feicoes.find((f) => f.id === rio)!.pts!;
    const [inicio, fim] = pontos.slice(-2);
    const a = new THREE.Vector3(...inicio, 0), b = new THREE.Vector3(...fim, 0);
    const cais = new THREE.Vector3(v.vista.x, v.vista.y, 0);
    expect(new THREE.Line3(a, b).closestPointToPoint(cais, true, new THREE.Vector3()).distanceTo(cais)).toBeLessThan(0.15);
  });

  it('mantém os vãos das arcadas abertos e agrupa as peças repetidas', () => {
    const o = maquete('Arcadas de Númenor', 174);
    arcada(o, moldura, 0, 0, 0, 1, 0.1, 1);
    arcada(o, moldura, 1, 0, 0, 1, 0.1, 1);
    const grupo = o.montar();
    const lotes = grupo.children.filter((obj) => obj instanceof THREE.InstancedMesh);
    expect(lotes).toHaveLength(1);
    expect(lotes[0]).toHaveProperty('count', 2);
    grupo.updateMatrixWorld(true);
    const lançar = (x: number, z: number) =>
      new THREE.Raycaster(new THREE.Vector3(x, 1, z), new THREE.Vector3(0, -1, 0)).intersectObject(grupo);
    expect(lançar(0, 0.7)).toHaveLength(0);
    expect(lançar(0.43, 0.4).length).toBeGreaterThan(0);
    expect(lançar(1, 0.91).length).toBeGreaterThan(0);
  });

  it('mantém os cais de Eldalondë e muda as embarcações depois da divisão', () => {
    const v = destino('eldalonde'), camada = new DetalhesReinos();
    const barcos = (modelo: THREE.Group) => {
      let n = 0;
      modelo.traverse((obj) => { if (obj instanceof THREE.InstancedMesh && obj.geometry === casco) n += obj.count; });
      return n;
    };
    expect(barcos(atualizar(camada, v, 'SE:2250')!)).toBe(3);
    const tarde = atualizar(camada, v, 'SE:2251')!;
    expect(barcos(tarde)).toBe(1);
    expect(tarde.getObjectByName('Cais dos Eldar')).toBeDefined();
  });

  it('mostra o solar de Andúnië a partir da criação do senhorio', () => {
    const v = destino('andunie'), camada = new DetalhesReinos();
    const antes = atualizar(camada, v, 'SE:629')!;
    const depois = atualizar(camada, v, 'SE:630')!;
    expect(antes.getObjectByName('Cais e armazéns de Andúnië')).toBeDefined();
    expect(antes.getObjectByName('Solar dos Senhores de Andúnië')).toBeUndefined();
    expect(depois.getObjectByName('Solar dos Senhores de Andúnië')).toBeDefined();
  });

  it.each([
    ['emerie', 'SE:881', 'Casa Branca de Erendis'],
    ['hyarastorni', 'SE:881', 'Casa de Hallatan'],
    ['noirinan', 'SE:441', 'Sepultura de Elros'],
  ])('assenta %s no relevo e respeita o período de visita', (id, antes, nome) => {
    const v = destino(id), camada = new DetalhesReinos();
    expect(atualizar(camada, v, antes)).toBeUndefined();
    const g = atualizar(camada, v, v.padrao, 5)!;
    const edificio = g.getObjectByName(nome)!;
    expect(edificio.getWorldScale(new THREE.Vector3()).z).toBeCloseTo(1);
    expect(edificio.getWorldPosition(new THREE.Vector3()).z).toBeCloseTo(relevo(tempo.cursor(v.padrao)).altura(v.vista.x, v.vista.y) * 5 + 0.006);
    expect(v.fase(tempo.cursor('SE:3319'))).toBeNull();
  });

  it('oferece todas as novas edificações na ficha da ilha e oculta os portos depois da Queda', () => {
    const ficha = fichaLugar({ t: tempo.cursor('SE:3000') } as App, lugarPorId.get('numenor')!);
    for (const id of ['andunie', 'eldalonde', 'nindamos', 'emerie', 'hyarastorni', 'noirinan']) {
      expect(ficha).toContain(`data-acao="visitar-3d" data-id="${id}"`);
      expect(destino(id).fase(tempo.cursor('SE:3318'))).toBeTruthy();
      expect(destino(id).fase(tempo.cursor('SE:3319'))).toBeNull();
    }
  });

  it('alterna os cortes de Menegroth e Nargothrond preservando os modelos por fase', () => {
    const t = tempo.cursor('PE:400'), m = relevo(t), u = criarUniformesGlobais();
    const camada = new DetalhesReinos(), camera = new THREE.PerspectiveCamera();
    camera.position.set(...COLINA_MENEGROTH, 3);
    camada.atualizar(t, camera, m, u, true);
    const fecho = camada.grupo.getObjectByName('Fecho da colina')!;
    expect(fecho.visible).toBe(false);
    camada.cortes.menegroth = false;
    camada.atualizar(t, camera, m, u, true);
    expect(fecho.visible).toBe(true);
    camera.position.set(...MARGEM_NARGOTHROND, 3);
    camada.cortes.nargothrond = true;
    camada.atualizar(t, camera, m, u, true);
    expect(camada.grupo.getObjectByName('Salões de Nargothrond')?.visible).toBe(true);
    camada.cortes.nargothrond = false;
    camada.atualizar(t, camera, m, u, true);
    expect(camada.grupo.getObjectByName('Salões de Nargothrond')?.visible).toBe(false);
    expect(camada.grupo.getObjectByName('Nargothrond: integra')?.visible).toBe(true);
  });

  it('comparte a posição local com precisão suficiente para reabrir o mesmo cais', () => {
    const vista = destino('mithlond').vista;
    const app = { camera: { estado: vista }, t: tempo.cursor('TE:3021') } as App;
    const hash = new URL(montarLink(app)).hash;
    expect(lerLink(hash).vista).toEqual(vista);
  });
});
