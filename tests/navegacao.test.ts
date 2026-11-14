// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { App } from '../src/app';
import { eras, jornadas, tempo } from '../src/core/data';
import { pessoaPorId } from '../src/core/linhagens';
import { Interface } from '../src/ui/interface';
import { norm } from '../src/ui/util';

let ui: Interface;
let app: App;
let documentListeners: MockInstance<Document['addEventListener']>;
let windowListeners: MockInstance<Window['addEventListener']>;
const el = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const tecla = (alvo: HTMLElement, key: string) => alvo.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="app"><div id="mapa"><canvas tabindex="0"></canvas></div></div>';
  document.body.className = '';
  const armazenamento = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => armazenamento.get(k) ?? null, setItem: (k: string, v: string) => armazenamento.set(k, v) });
  history.replaceState(null, '', '/');
  documentListeners = vi.spyOn(document, 'addEventListener');
  windowListeners = vi.spyOn(window, 'addEventListener');
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  vi.stubGlobal('ResizeObserver', class { observe() {} });
  // jsdom não implementa a camada modal do navegador; verificamos seu acionamento.
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.open = true; }) },
    close: { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.open = false; }) },
  });
  const ouvintes: ((m: string) => void)[] = [];
  let tAtual = tempo.cursor('AA:#aa-silmarils');
  app = {
    get t() { return tAtual; }, camadas: {}, hora: 3.5, horaAuto: false,
    travado: false, tocando: false, comparando: false, jornada: null, emCaminhoReto: false,
    realce: new Set(), host: el('#mapa'), renderer: { domElement: el('canvas') },
    camera: { estado: { x: 0, y: 0, d: 500, rumo: 0, inclinacao: 45 }, definir: vi.fn(), voar: vi.fn() },
    ouvir: (f: (m: string) => void) => ouvintes.push(f),
    emitir: (m: string) => ouvintes.forEach((f) => f(m)),
    selecionar: vi.fn(), definirAtividadeInterface: vi.fn(), voar: vi.fn(),
    definirTempo: vi.fn((t: number) => { tAtual = t; app.emitir('tempo'); }),
    passoAno: vi.fn(), passoEvento: vi.fn(), sairJornada: vi.fn(), sairCaminhoReto: vi.fn(),
    travar: vi.fn(), divisaoVertical: () => true,
    faseArvores: () => ({ fase: 'Telperion', telperion: 1, laurelin: 0 }),
  } as unknown as App;
  ui = new Interface(app, el('#app'));
});

afterEach(() => {
  for (const [tipo, listener, options] of documentListeners?.mock.calls ?? []) document.removeEventListener(tipo, listener, options);
  for (const [tipo, listener, options] of windowListeners?.mock.calls ?? []) window.removeEventListener(tipo, listener, options);
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('busca e menu', () => {
  it('oferece destinos ao focar e encontra personagens com espaços e acentos', () => {
    const campo = el<HTMLInputElement>('#busca-campo');
    campo.focus();
    expect(el('#busca-res').hidden).toBe(false);
    expect(el('#busca-res').textContent).toContain('Por onde começar?');
    campo.value = '  Gáladriel  ';
    campo.dispatchEvent(new Event('input'));
    expect(el('#busca-status').textContent).toContain('1 resultado');
    const destino = el<HTMLButtonElement>('#busca-res .destino');
    expect(destino.textContent).toBe('Ver linhagem de Galadriel');
    destino.click();
    expect(app.selecionar).toHaveBeenCalledOnce();
    expect(el('#painel h2').textContent).toBe('Galadriel');
    expect(el('#busca-res').hidden).toBe(true);
    ui.fecharPainel();
    expect(document.activeElement).toBe(campo);
    expect(norm('Minas   Tirith')).toBe('minas tirith');
  });

  it('encontra personagens por outros nomes e alcunhas', () => {
    const campo = el<HTMLInputElement>('#busca-campo');
    for (const [q, nome] of [['Olórin', 'Gandalf'], ['passolargo', 'Aragorn II Elessar'], ['Annatar', 'Sauron'], ['Sméagol', 'Gollum / Sméagol']]) {
      campo.value = q;
      campo.dispatchEvent(new Event('input'));
      const primeiro = el('#busca-res .resultado');
      expect(primeiro.querySelector('.r-tipo')!.textContent).toBe('Personagem');
      expect(primeiro.querySelector('strong')!.textContent).toBe(nome);
    }
  });

  it('localiza personagens sem ficha própria pelas fichas que os mencionam', () => {
    const campo = el<HTMLInputElement>('#busca-campo');
    campo.value = 'Wulf';
    campo.dispatchEvent(new Event('input'));
    expect(el('#busca-status').textContent).toContain('Nenhuma ficha com esse nome');
    expect(el('#busca-res').textContent).toContain('Fichas que o mencionam');
    const nomes = [...document.querySelectorAll('#busca-res .resultado strong')].map((s) => s.textContent);
    expect(nomes).toContain('Fréaláf');
    for (const m of document.querySelectorAll('#busca-res .r-mencao')) expect(m.textContent).toContain('Wulf');
    campo.value = 'xyzzy';
    campo.dispatchEvent(new Event('input'));
    expect(el('#busca-res').textContent).toContain('Tente outro nome');
  });

  it('criaturas citadas nos textos têm ficha própria', () => {
    const campo = el<HTMLInputElement>('#busca-campo');
    for (const [q, nome] of [['Glaurung', 'Glaurung'], ['Smaug', 'Smaug'], ['Ungoliant', 'Ungoliant'], ['Huan', 'Huan']]) {
      campo.value = q;
      campo.dispatchEvent(new Event('input'));
      const primeiro = el('#busca-res .resultado');
      expect(primeiro.querySelector('.r-tipo')!.textContent).toBe('Personagem');
      expect(primeiro.querySelector('strong')!.textContent).toBe(nome);
    }
  });

  it('percorre resultados com setas e Esc devolve foco sem fechar a ficha', () => {
    ui.abrir('fontes');
    const campo = el<HTMLInputElement>('#busca-campo');
    campo.focus();
    tecla(campo, 'ArrowDown');
    expect(document.activeElement).toBe(el('#busca-res .destino'));
    tecla(document.activeElement as HTMLElement, 'Escape');
    expect(document.activeElement).toBe(campo);
    expect(el('#busca-res').hidden).toBe(true);
    expect(el('#painel').hidden).toBe(false);
  });

  it('explica como recuperar uma busca vazia e escapa texto digitado', () => {
    const campo = el<HTMLInputElement>('#busca-campo');
    campo.value = '<img src=x onerror=alert(1)>';
    campo.dispatchEvent(new Event('input'));
    expect(el('#busca-res').textContent).toContain('Tente outro nome');
    expect(el('#busca-res').querySelector('img')).toBeNull();
  });

  it('sincroniza estado do menu ao abrir uma seção e restaura o foco', () => {
    const menu = el<HTMLButtonElement>('#btn-camadas');
    menu.click();
    expect(menu.getAttribute('aria-expanded')).toBe('true');
    expect(el('#camadas').contains(document.activeElement)).toBe(true);
    el<HTMLButtonElement>('#camadas [data-acao="fontes"]').click();
    expect(el('#camadas').hidden).toBe(true);
    expect(menu.getAttribute('aria-expanded')).toBe('false');
    ui.fecharPainel();
    expect(document.activeElement).toBe(menu);
    menu.click();
    tecla(document.activeElement as HTMLElement, 'Escape');
    expect(menu.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(menu);
  });

  it('fecha o menu ao tocar fora e mantém o estado de acessibilidade', () => {
    el<HTMLButtonElement>('#btn-camadas').click();
    el('#mapa').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(el('#camadas').hidden).toBe(true);
    expect(el('#btn-camadas').getAttribute('aria-expanded')).toBe('false');
  });

  it('leva o foco à ficha mesmo quando o dispositivo também tem tela de toque', () => {
    vi.mocked(matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
    el<HTMLButtonElement>('#btn-camadas').click();
    el<HTMLButtonElement>('#camadas [data-acao="fontes"]').click();
    expect(document.activeElement).toBe(el('.painel-conteudo'));
  });
});

describe('fichas, telas cheias e jornadas', () => {
  it('volta da fonte à ficha original com a rolagem preservada', () => {
    ui.abrir('lugar:gondolin');
    el('.painel-conteudo').scrollTop = 240;
    el<HTMLButtonElement>('#painel [data-acao="fonte"][data-id="silm"]').click();
    expect(el('#painel').getAttribute('aria-label')).toBe('O Silmarillion');
    el<HTMLButtonElement>('[data-acao="voltar-ficha"]').click();
    expect(el('#painel h2').textContent).toBe('Gondolin');
    expect(el('.painel-conteudo').scrollTop).toBe(240);
    expect(el('[data-acao="voltar-ficha"]').hidden).toBe(true);
    ui.fecharPainel();
    ui.abrir('fontes');
    expect(el('[data-acao="voltar-ficha"]').hidden).toBe(true);
  });

  it('preserva foco e detalhes abertos ao atualizar a época de uma ficha', () => {
    ui.abrir('lugar:gondolin');
    const detalhe = el<HTMLDetailsElement>('#painel details');
    detalhe.open = true;
    const botao = el<HTMLButtonElement>('#painel [data-acao="fonte"]');
    const id = botao.dataset.id;
    botao.focus();
    app.emitir('tempo');
    vi.advanceTimersByTime(200);
    expect((document.activeElement as HTMLElement).dataset.id).toBe(id);
    expect(el<HTMLDetailsElement>('#painel details').open).toBe(true);
  });

  it('aciona diálogo nativo para fotos, pausa reprodução e preserva foco do filtro', () => {
    const gatilho = el<HTMLButtonElement>('.topo-acoes [data-acao="fotografias"]');
    gatilho.focus();
    app.tocando = true;
    gatilho.click();
    const dialog = el<HTMLDialogElement>('#fotos-tela');
    expect(dialog.open).toBe(true);
    expect(dialog.showModal).toHaveBeenCalledOnce();
    expect(app.tocando).toBe(false);
    const filtro = el<HTMLInputElement>('#fotos-todas');
    filtro.focus();
    filtro.checked = true;
    filtro.dispatchEvent(new Event('change', { bubbles: true }));
    expect(document.activeElement).toBe(el('#fotos-todas'));
    el<HTMLButtonElement>('[data-fechar-fotos]').click();
    expect(dialog.open).toBe(false);
    expect(dialog.hidden).toBe(true);
    expect(document.activeElement).toBe(gatilho);
  });

  it('abre árvore com diálogo nativo e Esc fecha antes da ficha', () => {
    ui.abrir('linhagem:feanor');
    const gatilho = el<HTMLButtonElement>('#painel [data-acao="arvore-tela"]');
    gatilho.focus();
    gatilho.click();
    expect(el<HTMLDialogElement>('#arvore-tela').open).toBe(true);
    tecla(document.activeElement as HTMLElement, 'Escape');
    expect(el<HTMLDialogElement>('#arvore-tela').open).toBe(false);
    expect(el('#painel').hidden).toBe(false);
    expect(document.activeElement).toBe(gatilho);
  });

  it.each([
    ['maedhros', '.pessoa-nome'],
    ['finwe', '.chip-pessoa'],
    ['nerdanel', '.conjuge button'],
  ])('abre a ficha completa de %s ao clicar no nome da árvore em tela cheia', (id, seletor) => {
    ui.abrir('linhagem:feanor');
    el<HTMLButtonElement>('#painel [data-acao="arvore-tela"]').click();
    const pessoa = pessoaPorId.get(id)!;
    const nome = el<HTMLButtonElement>(`#arvore-tela ${seletor}[data-sel="linhagem:${id}"]`);
    app.selecionar = vi.fn();
    nome.focus();
    nome.click();
    expect(el<HTMLDialogElement>('#arvore-tela').open).toBe(false);
    expect(app.selecionar).toHaveBeenCalledOnce();
    expect(app.selecionar).toHaveBeenCalledWith('linhagem:' + id);
    expect(el('#painel h2').textContent).toBe(pessoa.nome);
    expect(el('#painel .resumo').textContent).toBe(pessoa.resumo);
    for (const dado of [pessoa.epiteto, pessoa.datas].filter(Boolean)) expect(el('#painel').textContent).toContain(dado);
    expect(el('#painel .tipo').textContent).toContain('Personagem');
    const secoes = [...document.querySelectorAll('#painel h3')].map((h) => h.textContent);
    expect(secoes).toEqual(expect.arrayContaining(['Reinos que governou', 'Ascendência', 'Descendência', 'Fontes']));
    expect(document.activeElement).toBe(el('.painel-conteudo'));
    el<HTMLButtonElement>('[data-acao="voltar-ficha"]').click();
    expect(el('#painel h2').textContent).toBe('Fëanor');
  });

  it('mantém o ícone de árvore para centralizar a genealogia em outro personagem', () => {
    ui.abrir('linhagem:feanor');
    el<HTMLButtonElement>('#painel [data-acao="arvore-tela"]').click();
    el<HTMLButtonElement>('#arvore-tela [data-acao="arvore-tela"][data-id="maedhros"]').click();
    expect(el<HTMLDialogElement>('#arvore-tela').open).toBe(true);
    expect(el('#arvore-tela-nome').textContent).toBe('Maedhros');
    expect(el('#painel h2').textContent).toBe('Fëanor');
  });

  it('abre a ficha ao clicar no nome da árvore embutida no painel', () => {
    ui.abrir('linhagem:feanor');
    el<HTMLButtonElement>('#painel .pessoa-nome[data-sel="linhagem:maedhros"]').click();
    expect(el('#painel h2').textContent).toBe('Maedhros');
    expect(el('#painel .resumo').textContent).toBe(pessoaPorId.get('maedhros')!.resumo);
  });

  it('abre a fonte de uma fotografia à frente, com retorno à ficha anterior', () => {
    ui.abrir('lugar:gondolin');
    el<HTMLButtonElement>('#painel [data-acao="foto"]').click();
    expect(el<HTMLDialogElement>('#fotos-tela').open).toBe(true);
    el<HTMLButtonElement>('#fotos-tela [data-acao="fonte"][data-id="silm"]').click();
    expect(el<HTMLDialogElement>('#fotos-tela').open).toBe(false);
    expect(el('#painel').getAttribute('aria-label')).toBe('O Silmarillion');
    el<HTMLButtonElement>('[data-acao="voltar-ficha"]').click();
    expect(el('#painel h2').textContent).toBe('Gondolin');
  });

  it('mantém o foco no botão de próxima fotografia após trocar de imagem', () => {
    ui.executar('foto', { id: 'gondolin-pe400' });
    const proxima = el<HTMLButtonElement>('#fotos-tela .foto-nav:last-child');
    const id = proxima.dataset.id;
    proxima.focus();
    proxima.click();
    expect(document.activeElement).toBe(el('#fotos-tela .foto-nav:last-child'));
    expect(el<HTMLImageElement>('#fotos-tela figure img').src).toContain(id);
  });

  it('permite expandir a ficha por teclado e limpa o estado ao fechar', () => {
    ui.abrir('fontes');
    const alca = el<HTMLButtonElement>('#painel .alca');
    alca.click();
    expect(alca.getAttribute('aria-expanded')).toBe('true');
    expect(el('#painel').classList.contains('expandido')).toBe(true);
    ui.fecharPainel();
    expect(alca.getAttribute('aria-expanded')).toBe('false');
  });

  it('oferece conclusão na última parada de uma jornada', () => {
    app.jornada = { j: jornadas[0], passo: jornadas[0].passos.length - 1 };
    app.emitir('jornada');
    const concluir = el<HTMLButtonElement>('#jornada-cartao [data-j="sair"]');
    expect(concluir.textContent).toBe('Concluir jornada');
    expect(concluir.disabled).toBe(false);
    concluir.click();
    expect(app.sairJornada).toHaveBeenCalledOnce();
  });

  it('preserva foco ao avançar na jornada e retorna ao menu ao concluir', () => {
    const j = jornadas[0];
    app.irPasso = vi.fn((passo: number) => { app.jornada = { j, passo }; app.emitir('jornada'); });
    app.sairJornada = vi.fn(() => { app.jornada = null; app.emitir('jornada'); });
    app.jornada = { j, passo: j.passos.length - 2 };
    app.emitir('jornada');
    const proxima = el<HTMLButtonElement>('#jornada-cartao [data-j="prox"]');
    proxima.focus();
    proxima.click();
    expect((document.activeElement as HTMLElement).textContent).toBe('Concluir jornada');
    (document.activeElement as HTMLButtonElement).click();
    expect(document.activeElement).toBe(el('#btn-camadas'));
    expect(el('#jornada-cartao').hidden).toBe(true);
  });

  it('mantém foco ao escolher um lado e ao encerrar a comparação', () => {
    Object.assign(app, { comparando: true, ladoAtivo: 'A', A: { t: tempo.cursor('PE:400') }, B: { t: tempo.cursor('TE:3018') } });
    app.sairComparar = vi.fn(() => { Object.assign(app, { comparando: false }); app.emitir('comparar'); });
    app.emitir('comparar');
    const lado = el<HTMLButtonElement>('[data-lado="B"]');
    lado.focus();
    lado.click();
    expect(document.activeElement).toBe(el('[data-lado="B"]'));
    expect(el('[data-lado="B"]').getAttribute('aria-pressed')).toBe('true');
    const sair = el<HTMLButtonElement>('[data-lado="sair"]');
    sair.focus();
    sair.click();
    expect(document.activeElement).toBe(el('[data-k="comparar"]'));
  });

  it('não remove um aviso de acontecimento enquanto sua ação tem foco', () => {
    app.aoEventosCruzados!([tempo.evento('se-queda')!], tempo.cursor('SE:3318'), tempo.cursor('SE:3319'));
    const aviso = el('#avisos .aviso');
    el<HTMLButtonElement>('#avisos button').focus();
    vi.advanceTimersByTime(7000);
    expect(aviso.isConnected).toBe(true);
    ui.aviso('Outro aviso');
    ui.aviso('Mais um aviso');
    ui.aviso('Aviso recente');
    expect(aviso.isConnected).toBe(true);
    el('canvas').focus();
    vi.advanceTimersByTime(1500);
    expect(aviso.isConnected).toBe(false);
  });

  it('nomes dos Valar abrem a ficha, como promete a instrução', () => {
    ui.abrir('valar');
    const nome = el<HTMLButtonElement>('.valar-cartao .pessoa-nome');
    const texto = nome.textContent;
    nome.click();
    expect(el('#painel h2').textContent).toBe(texto);
  });

  it('restaura links sem manter um enquadramento fixo de outra vista', () => {
    app.travado = true;
    ui.aplicarLink({ t: tempo.cursor('TE:3018') });
    expect(app.travar).toHaveBeenCalledWith(false);
  });

  it('retorna ao menu se o botão que abriu a ficha foi substituído', () => {
    const gatilho = document.createElement('button');
    document.body.appendChild(gatilho);
    gatilho.focus();
    ui.abrir('fontes');
    gatilho.remove();
    ui.fecharPainel();
    expect(document.activeElement).toBe(el('#btn-camadas'));
  });
});

describe('linha do tempo', () => {
  it('explica a navegação por sequência nas eras sem anos e anuncia a era atual', () => {
    expect(el('[data-k="ano+"]').textContent).toBe('›');
    expect(el('[data-k="ano+"]').getAttribute('aria-label')).toBe('Próximo acontecimento');
    expect(el('[data-era="AA"]').getAttribute('aria-pressed')).toBe('true');
    app.definirTempo(tempo.cursor('TE:3018'));
    expect(el('[data-k="ano+"]').textContent).toBe('+1');
    expect(el('[data-era="TE"]').getAttribute('aria-pressed')).toBe('true');
  });

  it('edita o acontecimento atual e Esc fecha apenas o editor, devolvendo foco', () => {
    const data = el<HTMLButtonElement>('.lt-data');
    data.click();
    expect(el<HTMLSelectElement>('[name="ev"]').value).toBe('aa-silmarils');
    expect(data.getAttribute('aria-expanded')).toBe('true');
    tecla(document.activeElement as HTMLElement, 'Escape');
    expect(el('.lt-editor').hidden).toBe(true);
    expect(data.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(data);
  });

  it('não aceita ano vazio, fora do intervalo ou fracionário', () => {
    app.definirTempo(tempo.cursor('TE:3018'));
    el<HTMLButtonElement>('.lt-data').click();
    const input = el<HTMLInputElement>('[name="ano"]');
    for (const valor of ['', '99999', '3018.5']) {
      input.value = valor;
      expect(input.validity.valid).toBe(false);
    }
  });

  it('oferece saltos de acontecimento no editor de data, inclusive no celular', () => {
    el<HTMLButtonElement>('.lt-data').click();
    el<HTMLButtonElement>('[data-evento="1"]').click();
    expect(app.passoEvento).toHaveBeenLastCalledWith(1);
    expect(el('.lt-editor').hidden).toBe(true);
    expect(document.activeElement).toBe(el('.lt-data'));
  });

  it('oferece Home, End e setas verticais no controle de tempo', () => {
    const trilho = el('.lt-trilho');
    tecla(trilho, 'Home');
    expect(tempo.eraDe(app.t).id).toBe(eras[0].id);
    tecla(trilho, 'End');
    expect(tempo.eraDe(app.t).id).toBe(eras[eras.length - 1].id);
    tecla(trilho, 'ArrowUp');
    expect(app.passoAno).toHaveBeenLastCalledWith(1);
    tecla(trilho, 'ArrowDown');
    expect(app.passoAno).toHaveBeenLastCalledWith(-1);
  });

  it('finaliza arrasto interrompido sem saltar para o início do trilho', () => {
    const trilho = el('.lt-trilho');
    trilho.setPointerCapture = vi.fn();
    vi.spyOn(trilho, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 1000 } as DOMRect);
    const inicio = new MouseEvent('pointerdown', { clientX: 700, button: 0, bubbles: true });
    Object.defineProperty(inicio, 'isPrimary', { value: true });
    Object.defineProperty(inicio, 'pointerId', { value: 1 });
    trilho.dispatchEvent(inicio);
    const t = app.t;
    trilho.dispatchEvent(new MouseEvent('pointercancel', { clientX: 0 }));
    expect(app.t).toBe(t);
    expect(app.definirTempo).toHaveBeenLastCalledWith(t, { arrastando: false });
  });
});
