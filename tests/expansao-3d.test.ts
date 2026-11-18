// @vitest-environment jsdom
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { App } from '../src/app';
import { estadoTerreno, reinoPorId, tempo, terreno } from '../src/core/data';
import { COLINA_MENEGROTH, MARGEM_NARGOTHROND } from '../src/core/detalhes';
import { NOVAS_VISITAS, PORTOES_ECHOR } from '../src/core/visitas';
import { DetalhesReinos } from '../src/render/detalhes';
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
    ['osgiliath', 'SE:3319', null], ['osgiliath', 'TE:1437', 'incendiada'], ['osgiliath', 'TE:1640', 'ruinas'],
    ['osgiliath', 'TE:3018', 'ponte-partida'],
    ['barad-dur', 'SE:1000', 'construcao'], ['barad-dur', 'SE:1600', 'integra'], ['barad-dur', 'SE:3441', 'alicerces'],
    ['barad-dur', 'TE:2951', 'integra'], ['barad-dur', 'TE:3019', 'ruinas'],
    ['meneltarma', 'SE:3319', null], ['tirion', 'SE:3319', null], ['angband', 'PE:587', null],
    ['cinturao-melian', 'AA:#aa-primeira-batalha', 'ativo'], ['cinturao-melian', 'PE:503', null],
    ['grande-armada', 'SE:3309', null], ['grande-armada', 'SE:3310', 'ativo'], ['grande-armada', 'SE:3319', null],
    ['khazad-dum', 'TE:2989', 'balin'], ['khazad-dum', 'TE:2994', 'abandonado'], ['khazad-dum', 'TE:3018', 'lago'],
    ['erebor', 'TE:1998', null], ['erebor', 'TE:2770', 'smaug'], ['erebor', 'TE:2941', 'restaurada'],
  ])('%s em %s passa à fase %s', (id, ref, fase) => {
    expect(destino(id).fase(tempo.cursor(ref))).toBe(fase);
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
