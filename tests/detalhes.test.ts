import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { estadoTerreno, lugarPorId, tempo, terreno } from '../src/core/data';
import { ARVORE_MINAS_TIRITH, EDORAS, estadoEdoras, faseEdoras, faseGondolin, faseMinasTirith, MINAS_TIRITH, VISTA_EDORAS, VISTA_GONDOLIN, VISTA_MINAS_TIRITH } from '../src/core/detalhes';
import { ARMENELOS, CAIS_ROMENNA, FASES_ARMENELOS, FASES_ROMENNA, faseArmenelos, faseRomenna, ROMENNA, VISTA_ARMENELOS, VISTA_ROMENNA } from '../src/core/detalhes';
import { COLINA_MENEGROTH, FASES_MENEGROTH, faseMenegroth, MENEGROTH, VISTA_MENEGROTH } from '../src/core/detalhes';
import { criarMenegroth, distanciaRio, PORTAO, RIO } from '../src/render/menegroth';
import { alturaColina, casco, criarArmenelos, criarRomenna, naviosRomenna, TEMPLO } from '../src/render/numenor';
import { criarEdoras, perfilEdoras } from '../src/render/edoras';
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

  it('mantém o caminho central livre e sobe aos três terraços por patamares distintos', () => {
    const cidade = criarGondolin('integra');
    cidade.updateMatrixWorld(true);
    const raio = new THREE.Raycaster();
    for (const [y, z] of [[-2.53, 0.03], [-2.0, 0.25], [-1.42, 0.48], [-0.86, 0.72]]) {
      raio.set(new THREE.Vector3(0, y, 4), new THREE.Vector3(0, 0, -1));
      expect(raio.intersectObject(cidade, true)[0].point.z).toBeCloseTo(z, 2);
    }
  });

  it('inclui cúpulas, arcadas e janelas detalhadas dentro do orçamento de geometria', () => {
    const cidade = criarGondolin('integra');
    const meshes = cidade.children.filter((c): c is THREE.Mesh => c instanceof THREE.Mesh);
    const nome = (n: string) => meshes.filter((m) => m.geometry.name === n);
    expect(nome('Cúpulas').length).toBeGreaterThan(0);
    expect(nome('Arcadas de pedra').length).toBeGreaterThan(0);
    expect(nome('Janelas em arco').some((m) => m instanceof THREE.InstancedMesh && m.count > 500)).toBe(true);
    const triangulos = meshes.reduce((n, m) => n + (m.geometry.index?.count ?? m.geometry.getAttribute('position').count) / 3 * (m instanceof THREE.InstancedMesh ? m.count : 1), 0);
    expect(triangulos).toBeLessThan(200_000);
    expect(meshes.length).toBeLessThan(30);
    expect(cidade.children.some((c) => c instanceof THREE.Light)).toBe(false);
    for (const fase of ['construcao', 'ruinas'] as const) {
      const inacabada = criarGondolin(fase);
      expect(inacabada.children.some((c) => c instanceof THREE.Mesh && c.geometry.name === 'Cúpulas')).toBe(false);
    }
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
    const ui = Object.assign(Object.create(Interface.prototype), { app, fecharInicio: vi.fn(), fecharPainel: vi.fn(), camadasEl: { hidden: false }, aviso: vi.fn() });
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
    const ui = Object.assign(Object.create(Interface.prototype), { app, fecharInicio: vi.fn(), fecharPainel: vi.fn(), camadasEl: { hidden: false }, aviso: vi.fn() });
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

describe('Edoras', () => {
  it.each([
    [2568, null],
    [2569, { inverno: false, oeste: 1, leste: 0 }],
    [2570, { inverno: false, oeste: 2, leste: 0 }],
    [2758, { inverno: true, oeste: 8, leste: 0 }],
    [2759, { inverno: false, oeste: 9, leste: 0 }],
    [2798, { inverno: false, oeste: 9, leste: 1 }],
    [3018, { inverno: false, oeste: 9, leste: 7 }],
    [3019, { inverno: false, oeste: 9, leste: 8 }],
  ])('em %i T.E. mostra a neve e os túmulos certos', (ano, estado) => {
    expect(estadoEdoras(tempo.tAno('TE', ano))).toEqual(estado);
  });

  it('tem todos os túmulos na Quarta Era e nenhuma cidade antes de Brego', () => {
    expect(faseEdoras(tempo.tAno('QE', 50))).toBe('verao-9-8');
    expect(faseEdoras(tempo.tAno('TE', 2510))).toBeNull();
    expect(EDORAS.fases!.map((f) => f.de)).toEqual(['TE:2569', 'TE:2758', 'TE:2759']);
  });

  it('gera a colina, as muralhas, Meduseld e os túmulos de forma reproduzível', () => {
    const instancias = (g: THREE.Group) => g.children.filter((c): c is THREE.InstancedMesh => c instanceof THREE.InstancedMesh);
    const total = (f: string) => instancias(criarEdoras(f)).reduce((n, m) => n + m.count, 0);
    const a = criarEdoras('verao-9-7');
    expect(instancias(a).map((m) => Array.from(m.instanceMatrix.array))).toEqual(instancias(criarEdoras('verao-9-7')).map((m) => Array.from(m.instanceMatrix.array)));
    expect(total('verao-9-7')).toBeGreaterThan(500);
    expect(a.children.filter((c) => c instanceof THREE.Mesh).length).toBeLessThan(30);
    const box = new THREE.Box3().setFromObject(a);
    expect([...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)).toBe(true);
    // Meduseld é o ponto mais alto: telhado acima do terraço no alto da colina
    expect(box.max.z).toBeGreaterThan(perfilEdoras(0) + 0.02);
    expect(new THREE.Box3().setFromObject(a.getObjectByName('Base')!).min.z).toBeCloseTo(-0.8);
    // cada rei morto acrescenta um túmulo (monte + flores)
    expect(total('verao-9-8') - total('verao-9-7')).toBe(6);
  });

  it('assenta a cidade no relevo, estica só a base e some antes de 2569', () => {
    const te = tempo.tAno('TE', 3018);
    const relevo = new ModeloTerreno(estadoTerreno(te).feicoes, terreno.cadeias, terreno.limites);
    const u = criarUniformesGlobais();
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(VISTA_EDORAS.x + 2, VISTA_EDORAS.y, 3);
    const camada = new DetalhesReinos();
    camada.atualizar(te, camera, relevo, u, true);
    const visiveis = camada.grupo.children.filter((c) => c instanceof THREE.Group && c.visible);
    expect(visiveis.map((c) => c.name)).toEqual(['Edoras: verao-9-7']);
    u.uExag.value = 4;
    camada.atualizar(te, camera, relevo, u, true);
    expect(visiveis[0].getObjectByName('Base')!.scale.z).toBe(4);
    camada.atualizar(tempo.tAno('TE', 2500), camera, relevo, u, true);
    expect(camada.grupo.visible).toBe(false);
  });

  it('aparece nas fichas de Edoras e de Rohan', () => {
    const app = { t: tempo.tAno('TE', 3018) } as App;
    for (const html of [fichaLugar(app, EDORAS), fichaReino(app, reinoPorId.get('rohan')!)]) {
      expect(html).toContain('data-acao="edoras-3d"');
      expect(html).toContain('Reconstrução artística');
    }
  });
});

describe('Númenor: Armenelos e Rómenna', () => {
  const instancias = (g: THREE.Object3D) => g.children.filter((c): c is THREE.InstancedMesh => c instanceof THREE.InstancedMesh);
  const relevo = () => new ModeloTerreno(estadoTerreno(tempo.tAno('SE', 3000)).feicoes, terreno.cadeias, terreno.limites);

  it.each([
    [31, null, null], [32, 'nimloth', 'barcos'], [599, 'nimloth', 'barcos'], [600, 'nimloth', 'navios'],
    [3262, 'nimloth', 'navios'], [3263, 'templo', 'navios'], [3309, 'templo', 'navios'], [3310, 'templo', 'fieis'],
    [3318, 'templo', 'fieis'], [3319, null, null],
  ])('em %i S.E. mostra Armenelos %s e Rómenna %s', (ano, armenelos, romenna) => {
    expect(faseArmenelos(tempo.tAno('SE', ano))).toBe(armenelos);
    expect(faseRomenna(tempo.tAno('SE', ano))).toBe(romenna);
  });

  it('as fases vêm de data/lugares.json e somem com a Queda', () => {
    expect(ARMENELOS.fases!.map((f) => f.de)).toEqual([...Object.keys(FASES_ARMENELOS), 'SE:3319']);
    expect(ROMENNA.fases!.map((f) => f.de)).toEqual([...Object.keys(FASES_ROMENNA), 'SE:3319']);
    expect(faseArmenelos(tempo.tAno('TE', 1))).toBeNull();
  });

  it('Armenelos: Nimloth no pátio e, depois, o Templo de 500 pés na colina', () => {
    const nimloth = criarArmenelos('nimloth');
    const templo = criarArmenelos('templo');
    expect(instancias(nimloth).map((m) => Array.from(m.instanceMatrix.array))).toEqual(instancias(criarArmenelos('nimloth')).map((m) => Array.from(m.instanceMatrix.array)));
    expect(instancias(nimloth).reduce((n, m) => n + m.count, 0)).toBeGreaterThan(3000);
    const alto = (g: THREE.Object3D) => new THREE.Box3().setFromObject(g).max.z;
    expect(alto(nimloth)).toBeLessThan(0.15); // a Torre do Rei é o ponto mais alto
    expect(alto(templo)).toBeGreaterThan(alturaColina(-0.12, 0) + TEMPLO.altura);
    expect(TEMPLO.altura).toBeCloseTo(0.1524, 4);
    expect(new THREE.Box3().setFromObject(nimloth.getObjectByName('Base')!).min.z).toBeCloseTo(-0.8);
  });

  it('Rómenna: os navios mudam com a época, nove dos Fiéis no fim', () => {
    expect(naviosRomenna('barcos').ancorados).toHaveLength(0);
    expect(naviosRomenna('navios').ancorados.length).toBeGreaterThan(3);
    expect(naviosRomenna('fieis').ancorados).toHaveLength(9);
    const cascos = (f: 'barcos' | 'navios' | 'fieis') => instancias(criarRomenna(f).getObjectByName('Mar')!).filter((m) => m.geometry === casco).reduce((n, m) => n + m.count, 0);
    const { ancorados, aVela, barcos } = naviosRomenna('fieis');
    expect(cascos('fieis')).toBe(ancorados.length + aVela.length + barcos);
  });

  it('o porto fica em terra, com o mar logo a leste, e os navios no nível da água', () => {
    const m = relevo();
    const [x, y] = CAIS_ROMENNA;
    expect(m.altura(x, y)).toBeGreaterThan(0);
    expect(m.altura(x + 0.4, y)).toBeLessThanOrEqual(0);
    for (const [nx, ny] of naviosRomenna('fieis').ancorados) expect(m.altura(x + nx, y + ny)).toBeLessThanOrEqual(0);
    const te = tempo.tAno('SE', 3315);
    const u = criarUniformesGlobais();
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(VISTA_ROMENNA.x + 1, VISTA_ROMENNA.y, 2);
    const camada = new DetalhesReinos();
    camada.atualizar(te, camera, m, u, true);
    const porto = camada.grupo.children.find((c) => c.name === 'Rómenna: fieis')!;
    expect(porto.visible).toBe(true);
    expect(porto.position.x).toBe(x);
    expect(porto.position.z + porto.getObjectByName('Mar')!.position.z).toBeCloseTo(0);
    camera.position.set(VISTA_ARMENELOS.x, VISTA_ARMENELOS.y, 2);
    camada.atualizar(te, camera, m, u, true);
    expect(camada.grupo.children.find((c) => c.name === 'Armenelos: templo')?.visible).toBe(true);
    camada.atualizar(tempo.tAno('SE', 3319), camera, m, u, true);
    expect(camada.grupo.visible).toBe(false);
  });

  it('aparece nas fichas de Armenelos, Rómenna e Númenor', () => {
    const app = { t: tempo.tAno('SE', 3000) } as App;
    expect(fichaLugar(app, ARMENELOS)).toContain('data-acao="armenelos-3d"');
    expect(fichaLugar(app, ROMENNA)).toContain('data-acao="romenna-3d"');
    const reino = fichaReino(app, reinoPorId.get('numenor')!);
    expect(reino).toContain('data-acao="armenelos-3d"');
    expect(reino).toContain('data-acao="romenna-3d"');
  });
});

describe('Menegroth', () => {
  const instancias = (g: THREE.Object3D) => g.children.filter((c): c is THREE.InstancedMesh => c instanceof THREE.InstancedMesh);
  const lanternasAcesas = (g: THREE.Object3D) =>
    instancias(g).filter((m) => (m.material as THREE.MeshStandardMaterial).emissiveIntensity > 0 && (m.material as THREE.MeshStandardMaterial).emissive.getHex() !== 0).reduce((n, m) => n + m.count, 0);

  it.each([
    ['PE', 400, 'integra'], ['PE', 502, 'integra'], ['PE', 503, 'saqueada'], ['PE', 504, 'integra'],
    ['PE', 506, 'destruida'], ['PE', 586, 'destruida'], ['PE', 587, null], ['SE', 10, null],
  ] as const)('em %s %i está %s', (era, ano, fase) => {
    expect(faseMenegroth(tempo.tAno(era, ano))).toBe(fase);
  });

  it('existe desde a fundação nos Anos das Árvores, com as fases de data/lugares.json', () => {
    expect(faseMenegroth(tempo.cursor('AA:#aa-menegroth'))).toBe('integra');
    expect(MENEGROTH.fases!.map((f) => f.de)).toEqual([...Object.keys(FASES_MENEGROTH), 'PE:587']);
  });

  it('o modelo fica na margem do Esgalduin do atlas, com a ponte na curva e as portas voltadas para ela', () => {
    const esgalduin = terreno.feicoes.find((f) => f.id === 'rio-esgalduin')!.pts!;
    const curva = [COLINA_MENEGROTH[0] + RIO.curva[0], COLINA_MENEGROTH[1] + RIO.curva[1]];
    expect(esgalduin.some(([x, y]) => Math.hypot(x - curva[0], y - curva[1]) < 1e-9)).toBe(true);
    expect(distanciaRio(...RIO.curva)).toBe(0);
    expect(distanciaRio(0, 0)).toBeGreaterThan(0.45); // a colina não toca o rio
    expect(PORTAO).toBeCloseTo(Math.atan2(RIO.curva[1], RIO.curva[0]));
  });

  it('gera o corte, os salões e as lanternas; saque e destruição apagam as luzes', () => {
    const integra = criarMenegroth('integra');
    expect(instancias(integra).map((m) => Array.from(m.instanceMatrix.array))).toEqual(instancias(criarMenegroth('integra')).map((m) => Array.from(m.instanceMatrix.array)));
    expect(integra.getObjectByName('Corte')).toBeTruthy();
    const box = new THREE.Box3().setFromObject(integra);
    expect([...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)).toBe(true);
    expect(lanternasAcesas(integra)).toBeGreaterThan(20);
    expect(lanternasAcesas(criarMenegroth('saqueada'))).toBe(0);
    expect(lanternasAcesas(criarMenegroth('destruida'))).toBe(0);
  });

  it('aparece perto da câmera e some quando Beleriand afunda', () => {
    const te = tempo.tAno('PE', 400);
    const relevo = new ModeloTerreno(estadoTerreno(te).feicoes, terreno.cadeias, terreno.limites);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(VISTA_MENEGROTH.x + 1, VISTA_MENEGROTH.y, 2);
    const camada = new DetalhesReinos();
    const u = criarUniformesGlobais();
    camada.atualizar(te, camera, relevo, u, true);
    const modelo = camada.grupo.children.find((c) => c.name === 'Menegroth: integra')!;
    expect(modelo.visible).toBe(true);
    expect(modelo.position.x).toBe(COLINA_MENEGROTH[0]);
    camada.atualizar(tempo.tAno('PE', 587), camera, relevo, u, true);
    expect(camada.grupo.visible).toBe(false);
  });

  it('aparece nas fichas de Menegroth e de Doriath', () => {
    const app = { t: tempo.tAno('PE', 400) } as App;
    expect(fichaLugar(app, MENEGROTH)).toContain('data-acao="menegroth-3d"');
    expect(fichaReino(app, reinoPorId.get('doriath')!)).toContain('data-acao="menegroth-3d"');
  });
});
