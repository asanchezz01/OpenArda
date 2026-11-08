import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App, type Lado } from '../src/app';
import { estadoTerreno, tempo, type EstadoTerreno } from '../src/core/data';
import { retratoDe } from '../src/core/linhagens';
import { PoolWorkers } from '../src/terrain/tiles';
import { fichaValar, htmlRetrato } from '../src/ui/linhagens';
import { htmlPainelFotos } from '../src/ui/fotografias';
import { miniatura } from '../src/ui/util';

const { workers, WorkerDuplo } = vi.hoisted(() => {
  class WorkerDuplo {
    pedidos: Record<string, unknown>[] = [];
    onmessage?: (ev: { data: Record<string, unknown> }) => void;
    onerror?: () => void;
    constructor() { workers.push(this); }
    postMessage(msg: Record<string, unknown>) { this.pedidos.push(msg); }
    concluir(id: number) { this.onmessage?.({ data: { tipo: 'tile', id } }); }
  }
  const workers: WorkerDuplo[] = [];
  return { workers, WorkerDuplo };
});
vi.mock('../src/terrain/terrain.worker.ts?worker', () => ({ default: WorkerDuplo }));

type Internos = {
  estadoRelevo(t: number): EstadoTerreno;
  ajustarResolucao(dt: number): void;
  quadro(): void;
  deltaRender: number;
};

function simularApp(extra: object = {}) {
  const renderer = { getPixelRatio: () => 2, setPixelRatio: vi.fn(), setSize: vi.fn() };
  const camera = { tick: vi.fn(), ajustarAspecto: vi.fn() };
  const pool = { definirPausado: vi.fn() };
  const emitir = vi.fn();
  const app = Object.assign(Object.create(App.prototype), {
    renderer, camera, pool, emitir,
    host: { clientWidth: 1280, clientHeight: 720 },
    A: { t: tempo.cursor('TE:3018'), sistema: { carregando: false } },
    relogio: { getDelta: () => 1 / 60 }, horaAuto: false,
    mapaCoberto: false, interfaceAberta: false, deltaRender: 0, ultimoRender: 5000,
    emaQuadro: 16, ultimoAjuste: 0, prMax: 2, resolucaoFixa: false,
    modelos: new Map(),
  }, extra) as App;
  return { app, interno: app as unknown as Internos, renderer, camera, pool, emitir };
}

beforeEach(() => {
  workers.length = 0;
  vi.stubGlobal('document', { hidden: false });
  vi.spyOn(performance, 'now').mockReturnValue(5016);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('trabalho do mapa durante a navegação', () => {
  it('mantém relógio, câmera e linha do tempo, sem desenhar sob uma tela cheia', () => {
    const { app, interno, camera, pool, emitir } = simularApp({ deltaRender: 10 });
    app.definirAtividadeInterface(true, true);
    interno.quadro();
    expect(pool.definirPausado).toHaveBeenLastCalledWith(true);
    expect(camera.tick).toHaveBeenCalledWith(1 / 60);
    expect(camera.ajustarAspecto).not.toHaveBeenCalled();
    expect(emitir).toHaveBeenCalledWith('quadro');
    expect(interno.deltaRender).toBe(0);
    app.definirAtividadeInterface(false, true);
    expect(pool.definirPausado).toHaveBeenLastCalledWith(false);
  });

  it('não retoma os workers ao fechar uma tela se a aba ainda está oculta', () => {
    const { app, interno, camera, pool } = simularApp();
    app.definirAtividadeInterface(true, true);
    vi.stubGlobal('document', { hidden: true });
    app.definirAtividadeInterface(false, false);
    interno.quadro();
    expect(pool.definirPausado).toHaveBeenLastCalledWith(true);
    expect(camera.ajustarAspecto).not.toHaveBeenCalled();
  });

  it('poupa quadros do mapa no intervalo de 30 FPS enquanto um painel está aberto', () => {
    const { interno, camera } = simularApp({ interfaceAberta: true });
    interno.quadro();
    expect(camera.tick).toHaveBeenCalledOnce();
    expect(camera.ajustarAspecto).not.toHaveBeenCalled();
    expect(interno.deltaRender).toBeCloseTo(1 / 60);
  });

  it('conclui os pedidos em voo sem iniciar os da fila enquanto estiver pausado', async () => {
    const pool = new PoolWorkers(1);
    const pedido = { tipo: 'tile', assinatura: 'teste' };
    const a = pool.pedir(pedido, 0, () => false);
    const b = pool.pedir(pedido, 0, () => false);
    const c = pool.pedir(pedido, 0, () => false);
    expect(workers[0].pedidos).toHaveLength(2);
    pool.definirPausado(true);
    workers[0].concluir(1);
    await expect(a).resolves.toMatchObject({ tipo: 'tile', id: 1 });
    expect(workers[0].pedidos).toHaveLength(2);
    pool.definirPausado(false);
    expect(workers[0].pedidos).toHaveLength(3);
    workers[0].concluir(2);
    workers[0].concluir(3);
    await Promise.all([b, c]);
    expect(pool.pendentes).toBe(0);
  });

  it('não despacha nem mantém um pedido cancelado durante a pausa', async () => {
    const pool = new PoolWorkers(1);
    pool.definirPausado(true);
    let cancelado = false;
    const resultado = pool.pedir({ tipo: 'tile' }, 0, () => cancelado);
    expect(workers[0].pedidos).toHaveLength(0);
    cancelado = true;
    pool.definirPausado(false);
    await expect(resultado).resolves.toBeNull();
    expect(workers[0].pedidos).toHaveLength(0);
  });
});

describe('resolução automática', () => {
  it('reduz a resolução já em 30 ms por quadro, mesmo carregando terreno', () => {
    const { interno, renderer } = simularApp({ emaQuadro: 30, A: { sistema: { carregando: true } } });
    interno.ajustarResolucao(0.03);
    expect(renderer.setPixelRatio).toHaveBeenCalledWith(1.6);
    expect(renderer.setSize).toHaveBeenCalledWith(1280, 720);
  });

  it('respeita o limite mínimo, o intervalo entre ajustes e a qualidade fixa', () => {
    for (const extra of [{ resolucaoFixa: true }, { ultimoAjuste: 4500 }, { renderer: { getPixelRatio: () => 0.6, setPixelRatio: vi.fn() } }]) {
      const { app, interno } = simularApp({ emaQuadro: 40, ...extra });
      interno.ajustarResolucao(0.04);
      expect(app.renderer.setPixelRatio).not.toHaveBeenCalled();
    }
  });

  it('recupera a nitidez com folga estável, aguardando carregamento e painéis', () => {
    for (const extra of [{}, { interfaceAberta: true }, { A: { sistema: { carregando: true } } }, { ultimoAjuste: 2000 }]) {
      const { interno, renderer } = simularApp({ ...extra });
      renderer.getPixelRatio = () => 1;
      interno.ajustarResolucao(1 / 60);
      if (Object.keys(extra).length) expect(renderer.setPixelRatio).not.toHaveBeenCalled();
      else expect(renderer.setPixelRatio).toHaveBeenCalledWith(1.2);
    }
  });
});

describe('cache de relevo e luz das Árvores', () => {
  it('separa as máscaras de luz mesmo quando a geometria das duas épocas coincide', () => {
    const { interno, app } = simularApp();
    const fimDasArvores = tempo.fronteira('AA:#aa-escurecimento', 0);
    const aa = fimDasArvores - 0.00001;
    const depois = fimDasArvores;
    expect(estadoTerreno(aa).assinatura).toBe(estadoTerreno(depois).assinatura);
    const arvores = interno.estadoRelevo(aa);
    const semArvores = interno.estadoRelevo(depois);
    expect(arvores.feicoes).toEqual(semArvores.feicoes);
    expect(arvores.assinatura).not.toBe(semArvores.assinatura);
    const lado = { t: aa, sistema: { assinatura: arvores.assinatura }, modelo: null, assinaturaModelo: '' } as unknown as Lado;
    const modeloAA = app.modeloDe(lado);
    expect(modeloAA).not.toBeNull();
    lado.t = depois;
    lado.sistema = { assinatura: semArvores.assinatura } as Lado['sistema'];
    expect(app.modeloDe(lado)).not.toBeNull();
    lado.t = aa;
    lado.sistema = { assinatura: arvores.assinatura } as Lado['sistema'];
    expect(app.modeloDe(lado)).toBe(modeloAA);
  });
});

describe('imagens para navegação', () => {
  it('usa miniaturas nas galerias com carregamento adiado, preservando o original ampliado', () => {
    const app = { t: tempo.cursor('TE:3018') } as App;
    for (const html of [fichaValar(app), htmlPainelFotos(app, true)]) {
      const imagens = html.match(/<img\b[^>]*>/g)!;
      expect(imagens.length).toBeGreaterThan(0);
      for (const img of imagens) {
        expect(img).toContain('src="miniaturas/');
        expect(img).toContain('loading="lazy"');
        expect(img).toContain('decoding="async"');
      }
    }
    expect(htmlRetrato('feanor')).toContain(`src="${retratoDe('feanor')!.imagem}"`);
    expect(miniatura('retratos/futuro.webp')).toBe('retratos/futuro.webp');
  });
});
