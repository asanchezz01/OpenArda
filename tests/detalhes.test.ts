import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { estadoTerreno, lugarPorId, tempo, terreno } from '../src/core/data';
import { ARVORE_MINAS_TIRITH, faseGondolin, faseMinasTirith, MINAS_TIRITH, VISTA_GONDOLIN, VISTA_MINAS_TIRITH } from '../src/core/detalhes';
import { criarGondolin } from '../src/render/gondolin';
import { criarMinasTirith } from '../src/render/minas-tirith';
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

describe('Minas Tirith', () => {
  it.each([
    ['SE', 3319, null], ['SE', 3320, 'sem-arvore'], ['TE', 1, 'sem-arvore'], ['TE', 2, 'arvore-viva'],
    ['TE', 1635, 'arvore-viva'], ['TE', 1636, 'arvore-morta'], ['TE', 1639, 'arvore-morta'], ['TE', 1640, 'arvore-viva'],
    ['TE', 2871, 'arvore-viva'], ['TE', 2872, 'arvore-morta'], ['TE', 3018, 'arvore-morta'], ['TE', 3019, 'arvore-viva'], ['QE', 100, 'arvore-viva'],
  ])('mostra a Árvore Branca certa em %s %i', (era, ano, fase) => {
    expect(faseMinasTirith(tempo.tAno(era as string, ano as number))).toBe(fase);
  });

  it('cobre todas as fases do lugar', () => {
    expect(MINAS_TIRITH.fases!.map((f) => f.de)).toEqual(Object.keys(ARVORE_MINAS_TIRITH));
  });

  it('gera sete níveis reproduzíveis, com a Cidadela a 700 pés e a Torre de 50 braças', () => {
    const viva = criarMinasTirith('arvore-viva');
    const outra = criarMinasTirith('arvore-viva');
    const instancias = (g: THREE.Group) => g.children.filter((c): c is THREE.InstancedMesh => c instanceof THREE.InstancedMesh);
    expect(instancias(viva).map((m) => Array.from(m.instanceMatrix.array))).toEqual(instancias(outra).map((m) => Array.from(m.instanceMatrix.array)));
    expect(instancias(viva).reduce((n, m) => n + m.count, 0)).toBeGreaterThan(500);
    expect(viva.children.filter((c) => c instanceof THREE.Mesh).length).toBeLessThan(30);
    const box = new THREE.Box3().setFromObject(viva);
    expect([...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)).toBe(true);
    expect(box.max.z).toBeCloseTo((600 + 300) * 0.0003048, 4);
    const proa = new THREE.Box3().setFromObject(viva.getObjectByName('Proa')!);
    expect(proa.max.z).toBeCloseTo(700 * 0.0003048, 4);
    expect(new THREE.Box3().setFromObject(viva.getObjectByName('Rocha')!).min.z).toBeCloseTo(-0.8);
    const total = (f: Parameters<typeof criarMinasTirith>[0]) => instancias(criarMinasTirith(f)).reduce((n, m) => n + m.count, 0);
    expect(total('sem-arvore')).toBeLessThan(total('arvore-viva'));
    expect(total('arvore-viva')).toBeLessThan(total('arvore-morta'));
  });

  it('assenta a cidade no ponto mais alto do entorno e estica só a rocha', () => {
    const te = tempo.tAno('TE', 3018);
    const relevo = new ModeloTerreno(estadoTerreno(te).feicoes, terreno.cadeias, terreno.limites);
    const u = criarUniformesGlobais();
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(VISTA_MINAS_TIRITH.x + 3, VISTA_MINAS_TIRITH.y, 6);
    const camada = new DetalhesReinos();
    camada.atualizar(te, camera, relevo, u, true);
    const visiveis = camada.grupo.children.filter((c) => c instanceof THREE.Group && c.visible);
    expect(visiveis.map((c) => c.name)).toEqual(['Minas Tirith: arvore-morta']);
    const cidade = visiveis[0];
    const h = relevo.altura(VISTA_MINAS_TIRITH.x, VISTA_MINAS_TIRITH.y);
    expect(cidade.position.z).toBeGreaterThanOrEqual(h * u.uExag.value + 0.035);
    u.uExag.value = 5;
    camada.atualizar(te, camera, relevo, u, true);
    expect(cidade.getObjectByName('Rocha')!.scale.z).toBe(5);
    expect(cidade.scale.z).toBe(1);
    camada.atualizar(tempo.tAno('SE', 3000), camera, relevo, u, true);
    expect(camada.grupo.visible).toBe(false);
  });

  it('aparece nas fichas de Minas Anor e de Gondor', () => {
    const app = { t: tempo.tAno('TE', 3018) } as App;
    for (const html of [fichaLugar(app, MINAS_TIRITH), fichaReino(app, reinoPorId.get('gondor')!)]) {
      expect(html).toContain('data-acao="minas-tirith-3d"');
      expect(html).toContain('Reconstrução artística');
    }
  });

  it.each([['SE', 3000, true], ['TE', 3018, false]])('o atalho a partir de %s %i só muda a época se não houver cidade', (era, ano, muda) => {
    vi.stubGlobal('document', { getElementById: () => ({ setAttribute: vi.fn() }) });
    const app = {
      t: tempo.tAno(era as string, ano as number), travado: false,
      sairJornada: vi.fn(), sairCaminhoReto: vi.fn(), definirCamada: vi.fn(), definirTempo: vi.fn(),
      ladoAtual: vi.fn(), retanguloDe: () => ({ width: 1280, height: 800 }),
      voar: vi.fn(), renderer: { domElement: { focus: vi.fn() } },
    };
    const ui = { app, fecharInicio: vi.fn(), fecharPainel: vi.fn(), camadasEl: { hidden: false }, aviso: vi.fn() };
    try {
      Interface.prototype.executar.call(ui as unknown as Interface, 'minas-tirith-3d', {});
      if (muda) expect(app.definirTempo).toHaveBeenCalledWith(tempo.tAno('TE', 3018));
      else expect(app.definirTempo).not.toHaveBeenCalled();
      expect(app.voar.mock.calls[0][0]).toMatchObject({ x: MINAS_TIRITH.em[0], y: MINAS_TIRITH.em[1], d: VISTA_MINAS_TIRITH.d });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
