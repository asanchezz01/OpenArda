import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { estadoTerreno, lugarPorId, tempo, terreno } from '../src/core/data';
import { faseGondolin, VISTA_GONDOLIN } from '../src/core/detalhes';
import { criarGondolin } from '../src/render/gondolin';
import { DetalhesReinos } from '../src/render/detalhes';
import { ModeloTerreno } from '../src/terrain/model';
import { criarUniformesGlobais } from '../src/terrain/material';
import { fichaLugar, fichaReino } from '../src/ui/fichas';
import { reinoPorId } from '../src/core/data';
import type { App } from '../src/app';
import { Interface } from '../src/ui/interface';

describe('Gondolin na linha do tempo', () => {
  it.each([
    [51, null], [52, 'construcao'], [115, 'construcao'],
    [116, 'integra'], [509, 'integra'], [510, 'ruinas'],
    [586, 'ruinas'], [587, null],
  ])('respeita a fase em %i P.E.', (ano, fase) => {
    expect(faseGondolin(tempo.tAno('PE', ano))).toBe(fase);
  });

  it('não mostra a cidade nos Anos das Árvores nem na Terceira Era', () => {
    expect(faseGondolin(tempo.cursor('AA:inicio'))).toBeNull();
    expect(faseGondolin(tempo.tAno('TE', 3019))).toBeNull();
  });
});

describe('geometria de Gondolin', () => {
  it('gera volumes finitos, instanciados e reproduzíveis, com ruínas mais baixas', () => {
    const integra = criarGondolin('integra');
    const outra = criarGondolin('integra');
    const ruinas = criarGondolin('ruinas');
    const obra = criarGondolin('construcao');
    for (const grupo of [integra, outra, ruinas, obra]) {
      const box = new THREE.Box3().setFromObject(grupo);
      expect([...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)).toBe(true);
      expect(box.max.z).toBeGreaterThan(0);
      expect(grupo.children.filter((c) => c instanceof THREE.Mesh).length).toBeLessThan(30);
    }
    const instancias = (g: THREE.Group) => g.children.filter((c): c is THREE.InstancedMesh => c instanceof THREE.InstancedMesh);
    expect(instancias(integra).reduce((n, m) => n + m.count, 0)).toBeGreaterThan(500);
    expect(instancias(integra).map((m) => Array.from(m.instanceMatrix.array))).toEqual(instancias(outra).map((m) => Array.from(m.instanceMatrix.array)));
    expect(new THREE.Box3().setFromObject(ruinas).max.z).toBeLessThan(new THREE.Box3().setFromObject(integra).max.z / 2);
    expect(new THREE.Box3().setFromObject(obra).max.z).toBeLessThan(new THREE.Box3().setFromObject(integra).max.z);
    const base = integra.getObjectByName('Amon Gwareth') as THREE.Mesh;
    base.geometry.computeBoundingBox();
    expect(base.geometry.boundingBox!.max.z).toBeCloseTo(0);
    expect(base.geometry.boundingBox!.min.z).toBeCloseTo(-0.8);
  });
});

describe('camada 3D integrada ao terreno', () => {
  const pe = tempo.tAno('PE', 400);
  const relevo = new ModeloTerreno(estadoTerreno(pe).feicoes, terreno.cadeias, terreno.limites);
  const camera = new THREE.PerspectiveCamera();
  const u = criarUniformesGlobais();

  it('cria modelos só de perto, respeita o botão da camada e acompanha o relevo', () => {
    const camada = new DetalhesReinos();
    camera.position.set(0, 0, 3000);
    camada.atualizar(pe, camera, relevo, u, true);
    expect(camada.grupo.visible).toBe(false);
    expect(camada.grupo.children.filter((c) => c instanceof THREE.Group)).toHaveLength(0);
    camera.position.set(VISTA_GONDOLIN.x, VISTA_GONDOLIN.y - 10, 10);
    camada.atualizar(pe, camera, relevo, u, false);
    expect(camada.grupo.visible).toBe(false);
    camada.atualizar(pe, camera, null, u, true);
    expect(camada.grupo.visible).toBe(false);
    camada.atualizar(pe, camera, relevo, u, true);
    expect(camada.grupo.visible).toBe(true);
    const cidade = camada.grupo.getObjectByName('Gondolin: integra')!;
    const h = relevo.altura(VISTA_GONDOLIN.x, VISTA_GONDOLIN.y);
    expect(cidade.position.z).toBeCloseTo(h * u.uExag.value + 0.035);
    u.uExag.value = 5;
    camada.atualizar(pe, camera, relevo, u, true);
    expect(cidade.position.z).toBeCloseTo(h * 5 + 0.035);
    expect(cidade.getObjectByName('Amon Gwareth')!.scale.z).toBe(5);
    expect(cidade.getObjectByName('Escadaria')!.scale.z).toBe(5);
    expect(cidade.scale.z).toBe(1);
  });

  it('mantém a escadaria apoiada na rocha do exagero mínimo ao máximo', () => {
    const cidade = criarGondolin('integra');
    const escada = cidade.getObjectByName('Escadaria') as THREE.InstancedMesh;
    const matriz = new THREE.Matrix4();
    for (const exag of [1, 2.5, 5]) {
      for (let i = 0; i < escada.count; i++) {
        escada.getMatrixAt(i, matriz);
        const centro = new THREE.Vector3().setFromMatrixPosition(matriz);
        const escala = new THREE.Vector3().setFromMatrixScale(matriz);
        const rochaZ = Math.min(0, (2.9 + centro.y) * 0.8 / 1.1) * exag;
        const fundo = (centro.z - escala.z / 2) * exag + escada.position.z;
        const topo = (centro.z + escala.z / 2) * exag + escada.position.z;
        expect(fundo).toBeLessThan(rochaZ);
        expect(topo).toBeGreaterThan(rochaZ);
      }
    }
  });

  it('alterna os lados da comparação sem misturar épocas nem acumular modelos', () => {
    const camada = new DetalhesReinos();
    camera.position.set(VISTA_GONDOLIN.x, VISTA_GONDOLIN.y, 14);
    const visivel = () => camada.grupo.children.filter((c) => c instanceof THREE.Group && c.visible).map((c) => c.name);
    for (let i = 0; i < 4; i++) {
      camada.atualizar(tempo.tAno('PE', 509), camera, relevo, u, true);
      expect(visivel()).toEqual(['Gondolin: integra']);
      camada.atualizar(tempo.tAno('PE', 510), camera, relevo, u, true);
      expect(visivel()).toEqual(['Gondolin: ruinas']);
    }
    expect(camada.grupo.children.filter((c) => c instanceof THREE.Group)).toHaveLength(2);
    camada.atualizar(tempo.tAno('PE', 587), camera, relevo, u, true);
    expect(camada.grupo.visible).toBe(false);
    camada.atualizar(pe, camera, relevo, u, false);
    expect(camada.grupo.visible).toBe(false);
  });
});

it('oferece a visita 3D nas fichas do lugar e do reino, com a ressalva artística', () => {
  const app = { t: tempo.tAno('PE', 400) } as App;
  for (const html of [fichaLugar(app, lugarPorId.get('gondolin')!), fichaReino(app, reinoPorId.get('gondolin')!)]) {
    expect(html).toContain('data-acao="gondolin-3d"');
    expect(html).toContain('Reconstrução artística');
  }
  expect(fichaLugar(app, lugarPorId.get('numenor')!)).not.toContain('data-acao="gondolin-3d"');
});

describe('atalho para a cidade', () => {
  it.each([52, 400, 510, 587])('visita a fase correta a partir de %i P.E. e devolve o foco ao mapa', (ano) => {
    const botao = { setAttribute: vi.fn() };
    vi.stubGlobal('document', { getElementById: () => botao });
    const app = {
      t: tempo.tAno('PE', ano), travado: false,
      sairJornada: vi.fn(), sairCaminhoReto: vi.fn(), definirCamada: vi.fn(), definirTempo: vi.fn(),
      ladoAtual: vi.fn(), retanguloDe: () => ({ width: 390, height: 844 }),
      voar: vi.fn(), renderer: { domElement: { focus: vi.fn() } },
    };
    const ui = { app, fecharInicio: vi.fn(), fecharPainel: vi.fn(), camadasEl: { hidden: false }, aviso: vi.fn() };
    try {
      Interface.prototype.executar.call(ui as unknown as Interface, 'gondolin-3d', {});
      expect(app.definirCamada).toHaveBeenCalledWith('detalhes', true);
      if (ano === 587) expect(app.definirTempo).toHaveBeenCalledWith(tempo.tAno('PE', 400));
      else expect(app.definirTempo).not.toHaveBeenCalled();
      expect(app.voar.mock.calls[0][0].d).toBeGreaterThan(32);
      expect(app.renderer.domElement.focus).toHaveBeenCalledWith({ preventScroll: true });
      expect(ui.camadasEl.hidden).toBe(true);
      expect(botao.setAttribute).toHaveBeenCalledWith('aria-expanded', 'false');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('respeita o enquadramento travado sem alterar a época', () => {
    const aviso = vi.fn();
    const ui = { app: { travado: true }, aviso };
    Interface.prototype.executar.call(ui as unknown as Interface, 'gondolin-3d', {});
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining('destrave'));
  });
});
