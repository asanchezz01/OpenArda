// Monta a interface sobre o mapa e liga as ações às funções do App.

import type { App } from '../app';
import type { Evento, Vista } from '../core/types';
import { eras, jornadas, lugarPorId, reinoPorId, tempo } from '../core/data';
import { Busca } from './busca';
import { LinhaTempo } from './linha';
import { fichaAqui, fichaEvento, fichaFonte, fichaFontes, fichaLugar, fichaMarco, fichaReino } from './fichas';
import { fichaLinhagem, fichaSenhorios, fichaValar, htmlArvoreTela, htmlRetrato } from './linhagens';
import { htmlPainelFotos, htmlVisualizador } from './fotografias';
import { esc, guardar, h, ler, listaFontes } from './util';
import { lerLink, montarLink } from './url';
import { regimeDe } from '../render/lighting';
import { faseEdoras, faseGondolin, faseMinasTirith, VISTA_EDORAS, VISTA_GONDOLIN, VISTA_MINAS_TIRITH } from '../core/detalhes';

const VISITAS_3D: Record<string, { nome: string; fase: (t: number) => string | null; vista: Vista; padrao: string; aviso: string }> = {
  'gondolin-3d': { nome: 'Gondolin', fase: faseGondolin, vista: VISTA_GONDOLIN, padrao: 'PE:400', aviso: 'Gondolin em 3D · Reconstrução artística. A linha do tempo alterna construção, cidade íntegra e ruínas.' },
  'edoras-3d': { nome: 'Edoras', fase: faseEdoras, vista: VISTA_EDORAS, padrao: 'TE:3018', aviso: 'Edoras em 3D · Reconstrução artística. A colina, as muralhas e Meduseld seguem a descrição; a linha do tempo mostra os túmulos dos reis e o Longo Inverno.' },
  'minas-tirith-3d': { nome: 'Minas Tirith', fase: faseMinasTirith, vista: VISTA_MINAS_TIRITH, padrao: 'TE:3018', aviso: 'Minas Tirith em 3D · Reconstrução artística. Os sete níveis seguem a descrição; a linha do tempo mostra a Árvore Branca ausente, viva ou morta.' },
};

export class Interface {
  private app: App;
  private painel!: HTMLElement;
  private conteudo!: HTMLElement;
  private busca!: Busca;
  private linha!: LinhaTempo;
  private cartaoJornada!: HTMLElement;
  private barraComparar!: HTMLElement;
  private avisos!: HTMLElement;
  private status!: HTMLElement;
  private bussola!: HTMLElement;
  private camadasEl!: HTMLElement;
  private inicio!: HTMLElement;
  private carregando!: HTMLElement;
  private arvoreTela!: HTMLElement;
  private retratoTela!: HTMLDialogElement;
  private arvoreTelaId = '';
  private arvoreTelaFocoAntes: HTMLElement | null = null;
  private fotosTela!: HTMLElement;
  /** '' fechado; 'painel' na grade; ou o id da foto aberta no visualizador. */
  private fotosAberto = '';
  private fotosTodas = false;
  private fotosFocoAntes: HTMLElement | null = null;
  private conteudoAtual = '';
  private urlTimer = 0;

  constructor(app: App, raiz: HTMLElement) {
    this.app = app;
    this.montar(raiz);
    this.ligar();
  }

  private montar(raiz: HTMLElement) {
    const topo = h('header', { id: 'topo' });
    topo.innerHTML = `
      <button type="button" id="btn-camadas" class="icone" aria-label="Camadas e legenda" aria-expanded="false" title="Camadas e legenda">☰</button>
      <div class="marca"><span class="marca-sinal">✦</span><span class="marca-nome">Atlas de Arda</span></div>
      <div id="busca" role="search">
        <input id="busca-campo" type="search" autocomplete="off" spellcheck="false" placeholder="Buscar lugar, reino ou acontecimento" aria-label="Buscar lugar, reino ou acontecimento">
        <div id="busca-res" role="listbox" hidden></div>
      </div>
      <nav class="topo-acoes">
        <button type="button" data-acao="jornadas" title="Jornadas guiadas (J)">Jornadas</button>
        <button type="button" data-acao="linhagens" title="Árvores genealógicas e governantes desta época">Linhagens</button>
        <button type="button" data-acao="fotografias" title="Fotografias dos reinos e lugares desta época">Fotografias</button>
        <button type="button" data-acao="fontes" title="Fontes e método">Fontes</button>
        <button type="button" data-acao="compartilhar" class="icone" aria-label="Copiar link desta vista" title="Copiar link desta vista">⤴</button>
      </nav>`;
    raiz.appendChild(topo);

    this.camadasEl = h('aside', { id: 'camadas', hidden: '', 'aria-label': 'Camadas e legenda' });
    const c = this.app.camadas;
    const chk = (k: string, rot: string, desc = '') =>
      `<label class="chk"><input type="checkbox" data-camada="${k}" ${(c as unknown as Record<string, boolean>)[k] ? 'checked' : ''}> <span>${rot}${desc ? `<small>${desc}</small>` : ''}</span></label>`;
    this.camadasEl.innerHTML = `
      <div class="menu-atalhos">
        <button type="button" data-acao="jornadas">Seguir uma jornada</button>
        <button type="button" data-acao="eras">Escolher uma era</button>
        <button type="button" data-acao="linhagens">Linhagens e governantes</button>
        <button type="button" data-acao="valar">Valar e Maiar</button>
        <button type="button" data-acao="fotografias">Fotografias dos lugares</button>
        <button type="button" data-acao="gondolin-3d">Visitar Gondolin em 3D</button>
        <button type="button" data-acao="minas-tirith-3d">Visitar Minas Tirith em 3D</button>
        <button type="button" data-acao="edoras-3d">Visitar Edoras em 3D</button>
        <button type="button" data-acao="fontes">Fontes e método</button>
      </div>
      <h2>Camadas</h2>
      ${chk('nomes', 'Nomes')}
      ${chk('reinos', 'Reinos e fronteiras', 'domínio, ocupação, influência')}
      ${chk('detalhes', 'Detalhes dos reinos em 3D', 'Gondolin, Minas Tirith e Edoras: aproxime para ver as cidades')}
      ${chk('rios', 'Rios')}
      ${chk('estradas', 'Estradas')}
      ${chk('vestigios', 'Lugares desaparecidos', 'antigas posições e contornos')}
      ${chk('rotas', 'Travessias e rotas')}
      ${chk('certeza', 'Certeza cartográfica', 'hachura onde começa a reconstrução')}
      ${chk('marcos', 'Marcos de alinhamento', 'pontos comuns entre mapas de eras diferentes')}
      <label class="faixa">Exagero do relevo <input type="range" id="exagero" min="1" max="5" step="0.25" value="2.5"><output>2,5×</output><small class="nota">Em escala continental o atlas realça o relevo automaticamente.</small></label>
      <label class="chk"><input type="checkbox" id="reduzir"> <span>Reduzir movimento<small>sem voos animados</small></span></label>
      <h2>Legenda</h2>
      <ul class="legenda">
        <li><span class="leg-terr dominio documentada" style="--cor:#e0c070"></span>Domínio político · fronteira documentada</li>
        <li><span class="leg-terr dominio aproximada" style="--cor:#e0c070"></span>Domínio político · fronteira aproximada</li>
        <li><span class="leg-terr ocupacao difusa" style="--cor:#9fc58a"></span>Ocupação: o povo vive ali, sem fronteira de Estado</li>
        <li><span class="leg-terr influencia difusa" style="--cor:#9bc1e6"></span>Influência: alianças, tributos, proteção</li>
        <li><span class="leg-terr dominio difusa" style="--cor:#c47a6a"></span>Borda difusa: a obra situa o povo mas deixa os limites em aberto</li>
        <li><span class="leg-pt st-ativo"></span>Lugar ativo · <span class="leg-pt st-destruido"></span>destruído/ruína · <span class="leg-pt st-submerso"></span>submerso/retirado</li>
        <li><span class="leg-linha rio"></span>Rio · <span class="leg-linha estrada"></span>Estrada · <span class="leg-linha rota"></span>Rota</li>
        <li><span class="leg-hach"></span>Reconstrução artística (com a camada de certeza)</li>
      </ul>
      <h2>Teclado</h2>
      <p class="atalhos"><kbd>←↑→↓</kbd> mover · <kbd>+</kbd><kbd>−</kbd> aproximar · <kbd>Q</kbd><kbd>E</kbd> girar · <kbd>R</kbd><kbd>F</kbd> inclinar · <kbd>N</kbd> norte · <kbd>[</kbd><kbd>]</kbd> ano · <kbd>,</kbd><kbd>.</kbd> acontecimento · <kbd>Espaço</kbd> reproduzir · <kbd>L</kbd> fixar · <kbd>C</kbd> comparar · <kbd>/</kbd> buscar · <kbd>Esc</kbd> fechar</p>`;
    raiz.appendChild(this.camadasEl);

    this.painel = h('aside', { id: 'painel', hidden: '', role: 'dialog', 'aria-label': 'Ficha' });
    this.painel.innerHTML = `<div class="alca" aria-hidden="true"></div><button type="button" class="fechar" aria-label="Fechar ficha">×</button><div class="painel-conteudo" tabindex="-1"></div>`;
    raiz.appendChild(this.painel);
    this.conteudo = this.painel.querySelector('.painel-conteudo')!;

    const nav = h('div', { id: 'navegacao', role: 'group', 'aria-label': 'Navegação da câmera' });
    nav.innerHTML = `
      <button type="button" data-nav="mais" aria-label="Aproximar" title="Aproximar (+)">+</button>
      <button type="button" data-nav="menos" aria-label="Afastar" title="Afastar (−)">−</button>
      <button type="button" data-nav="norte" class="bussola" aria-label="Apontar para o norte" title="Norte (N)"><span>N</span></button>
      <button type="button" data-nav="inclinar" aria-label="Alternar vista vertical e oblíqua" title="Vista vertical / oblíqua">3D</button>`;
    raiz.appendChild(nav);
    this.bussola = nav.querySelector('.bussola span')!;

    this.barraComparar = h('div', { id: 'comparar-barra', hidden: '' });
    raiz.appendChild(this.barraComparar);
    this.cartaoJornada = h('section', { id: 'jornada-cartao', hidden: '', 'aria-live': 'polite' });
    raiz.appendChild(this.cartaoJornada);
    this.avisos = h('div', { id: 'avisos', 'aria-live': 'polite' });
    raiz.appendChild(this.avisos);
    this.status = h('div', { id: 'status' });
    raiz.appendChild(this.status);
    this.carregando = h('div', { id: 'carregando', hidden: '' }, '<span></span> Carregando relevo…');
    raiz.appendChild(this.carregando);

    this.inicio = h('section', { id: 'inicio', 'aria-label': 'Boas-vindas' });
    this.inicio.innerHTML = `
      <button type="button" class="fechar" aria-label="Fechar">×</button>
      <p class="sobretitulo">Anos das Árvores · Baía de Eldamar</p>
      <h1>Atlas de Arda</h1>
      <p>Você está diante de Aman. Em primeiro plano, Tol Eressëa; ao fundo, as Pelóri. A luz das Duas Árvores passa pela Calacirya. Arraste para explorar.</p>
      <div class="inicio-acoes">
        <button type="button" data-inicio="explorar">Explorar livremente</button>
        <button type="button" data-inicio="era">Escolher uma era</button>
        <button type="button" data-inicio="jornada">Seguir uma jornada</button>
      </div>
      <p class="dica"><span class="so-toque">Um dedo arrasta · pinça aproxima · dois dedos giram e inclinam · toque duplo e arraste aproxima com uma mão.</span><span class="so-mouse">Arraste para mover · roda para aproximar · botão direito (ou Ctrl) para girar e inclinar.</span></p>`;
    raiz.appendChild(this.inicio);

    // árvore genealógica em tela cheia, sobre o mapa e os painéis
    this.arvoreTela = h('section', { id: 'arvore-tela', hidden: '', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'arvore-tela-nome', tabindex: '-1' });
    raiz.appendChild(this.arvoreTela);

    this.retratoTela = h('dialog', { id: 'retrato-tela', 'aria-labelledby': 'retrato-nome' }) as HTMLDialogElement;
    raiz.appendChild(this.retratoTela);
    this.fotosTela = h('section', { id: 'fotos-tela', class: 'tela-cheia', hidden: '', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'fotos-tela-titulo', tabindex: '-1' });
    raiz.appendChild(this.fotosTela);

    this.linha = new LinhaTempo(this.app, raiz);
    // a altura real da linha do tempo posiciona os controles acima dela
    const ro = new ResizeObserver(() => raiz.style.setProperty('--lt-h', `${this.linha.el.offsetHeight}px`));
    ro.observe(this.linha.el);
    this.busca = new Busca(this.app, topo.querySelector('#busca-campo')!, topo.querySelector('#busca-res')!);
  }

  private ligar() {
    const a = this.app;
    const atividade = () => a.definirAtividadeInterface(
      !this.fotosTela.hidden || !this.arvoreTela.hidden || this.retratoTela.open,
      !this.painel.hidden || !this.camadasEl.hidden,
    );
    const visibilidade = new MutationObserver(atividade);
    for (const el of [this.fotosTela, this.arvoreTela, this.retratoTela, this.painel, this.camadasEl]) {
      visibilidade.observe(el, { attributes: true, attributeFilter: ['hidden', 'open'] });
    }
    atividade();
    this.busca.aoAcao = (acao, dados) => this.executar(acao, dados);
    this.linha.aoEscolherEra = (id) => this.escolherEra(id);
    this.linha.aoComparar = () => this.alternarComparar();

    document.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-acao]');
      if (!b || b.closest('#busca-res')) return;
      const dados = { ...b.dataset } as Record<string, string>;
      const acao = dados.acao;
      delete dados.acao;
      this.executar(acao, dados);
    });
    this.painel.querySelector('.fechar')!.addEventListener('click', () => this.fecharPainel());
    this.retratoTela.addEventListener('click', (e) => {
      if (e.target === this.retratoTela || (e.target as Element).closest('[data-fechar-retrato]')) this.retratoTela.close();
    });
    this.retratoTela.addEventListener('close', () => { this.retratoTela.innerHTML = ''; });
    // dentro da tela cheia, um nome recentraliza a árvore em vez de abrir a ficha atrás dela
    this.fotosTela.addEventListener('click', (e) => {
      const alvo = e.target as HTMLElement;
      if (alvo.closest('[data-fechar-fotos]')) {
        e.stopPropagation();
        this.fecharFotos();
        return;
      }
      // "Ver no mapa" e "Ir a esta época" fecham o painel e seguem para a ação normal
      const acao = alvo.closest<HTMLElement>('[data-acao]')?.dataset.acao;
      if (acao === 'sel' || acao === 'tempo') this.fecharFotos();
    });
    this.fotosTela.addEventListener('change', (e) => {
      if ((e.target as HTMLElement).id !== 'fotos-todas') return;
      this.fotosTodas = (e.target as HTMLInputElement).checked;
      this.abrirFotos('painel');
    });
    this.arvoreTela.addEventListener('click', (e) => {
      const alvo = e.target as HTMLElement;
      if (alvo.closest('[data-fechar-arvore]')) {
        e.stopPropagation();
        this.fecharArvoreTela();
        return;
      }
      const b = alvo.closest<HTMLElement>('[data-sel], [data-acao="arvore-tela"]');
      if (!b) return;
      const sel = b.dataset.sel ?? '';
      if (b.dataset.acao === 'arvore-tela' || sel.startsWith('linhagem:')) {
        e.stopPropagation();
        this.abrirArvoreTela(b.dataset.id ?? sel.slice(9));
      } else this.fecharArvoreTela(); // um reino: fecha e deixa a ficha do reino abrir
    });
    this.conteudo.addEventListener('change', (e) => {
      const el = e.target as HTMLSelectElement;
      if (el.id === 'linhagem-ir') this.abrir('linhagem:' + el.value);
    });
    // folha inferior arrastável no celular
    const alca = this.painel.querySelector('.alca') as HTMLElement;
    let y0 = 0;
    alca.addEventListener('pointerdown', (e) => {
      y0 = e.clientY;
      alca.setPointerCapture(e.pointerId);
    });
    alca.addEventListener('pointerup', (e) => {
      const dy = e.clientY - y0;
      if (Math.abs(dy) < 8) this.painel.classList.toggle('expandido');
      else if (dy < 0) this.painel.classList.add('expandido');
      else if (this.painel.classList.contains('expandido')) this.painel.classList.remove('expandido');
      else this.fecharPainel();
    });

    document.getElementById('btn-camadas')!.addEventListener('click', (e) => {
      const ab = this.camadasEl.hidden;
      this.camadasEl.hidden = !ab;
      (e.currentTarget as HTMLElement).setAttribute('aria-expanded', String(ab));
    });
    this.camadasEl.addEventListener('change', (e) => {
      const el = e.target as HTMLInputElement;
      if (el.dataset.camada) a.definirCamada(el.dataset.camada as never, el.checked as never);
      if (el.id === 'reduzir') a.definirReduzirMovimento(el.checked);
    });
    const ex = this.camadasEl.querySelector<HTMLInputElement>('#exagero')!;
    ex.addEventListener('input', () => {
      a.definirExagero(Number(ex.value));
      ex.nextElementSibling!.textContent = `${ex.value.replace('.', ',')}×`;
    });
    (this.camadasEl.querySelector('#reduzir') as HTMLInputElement).checked = a.reduzirMovimento;

    document.getElementById('navegacao')!.addEventListener('click', (e) => {
      const k = (e.target as HTMLElement).closest<HTMLElement>('[data-nav]')?.dataset.nav;
      const s = a.camera.estado;
      const r = a.host.getBoundingClientRect();
      if (k === 'mais') a.camera.zoomEm(r.left + r.width / 2, r.top + r.height / 2, 0.5, true);
      if (k === 'menos') a.camera.zoomEm(r.left + r.width / 2, r.top + r.height / 2, 2, true);
      if (k === 'norte') a.camera.voar({ rumo: 0 }, 500);
      if (k === 'inclinar') a.camera.voar({ inclinacao: s.inclinacao > 10 ? 0 : 60 }, 600);
    });

    this.inicio.addEventListener('click', (e) => {
      const k = (e.target as HTMLElement).closest<HTMLElement>('[data-inicio]')?.dataset.inicio;
      if ((e.target as HTMLElement).closest('.fechar')) this.fecharInicio();
      if (!k) return;
      this.fecharInicio();
      if (k === 'era') this.abrirEras();
      if (k === 'jornada') this.abrirJornadas();
      if (k === 'explorar') this.aviso('Explore à vontade. Toque num lugar para ler sua ficha ou em qualquer ponto para perguntar: o que havia aqui?', 6000);
    });
    if (ler('arda-inicio-visto') === '1' && location.hash.length > 3) this.inicio.hidden = true;

    a.aoClicarRotulo = (tipo, id) => {
      if (tipo === 'lugar') this.abrir('lugar:' + id);
      else if (tipo === 'reino') this.abrir('reino:' + id);
      else this.abrir('marco:' + id);
    };
    a.aoToqueMapa = (x, y) => {
      const raio = Math.max(8, Math.min(220, a.camera.estado.d * 0.06));
      const r = fichaAqui(a, x, y, raio);
      if (r.unico) this.abrir(r.unico);
      else this.abrir(`aqui:${x.toFixed(1)},${y.toFixed(1)}`);
    };
    a.aoEventosCruzados = (evs) => this.eventosCruzados(evs);
    a.ouvir((m) => {
      if (m === 'camadas') {
        this.camadasEl.querySelectorAll<HTMLInputElement>('[data-camada]').forEach((el) => {
          el.checked = a.camadas[el.dataset.camada as keyof typeof a.camadas];
        });
      }
      if (m === 'selecao' || m === 'tempo' || m === 'comparar' || m === 'jornada' || m === 'trava' || m === 'caminho-reto') {
        this.atualizarPainel();
        this.atualizarJornada();
        this.atualizarComparar();
        this.agendarUrl();
      }
      if (m.startsWith('abrir-evento:')) this.executar('ir-evento', { id: m.split(':')[1] });
      if (m.startsWith('status:')) {
        // um lugar mudou de estado (fundação, queda, submersão): destaca por alguns segundos
        const id = m.split(':')[1];
        this.app.realce.add(id);
        setTimeout(() => {
          if (this.app.selecao !== 'lugar:' + id) this.app.realce.delete(id);
        }, 4000);
      }
      if (m === 'quadro') this.quadro();
    });
    a.camera.aoMudar = () => this.agendarUrl();
    window.addEventListener('keydown', (e) => this.teclado(e));
    window.addEventListener('hashchange', () => {
      if (location.hash !== this.ultimoHash) this.aplicarLink(lerLink());
    });
  }

  private ultimoHash = '';
  private agendarUrl() {
    clearTimeout(this.urlTimer);
    this.urlTimer = window.setTimeout(() => {
      const url = montarLink(this.app);
      this.ultimoHash = url.slice(url.indexOf('#'));
      history.replaceState(null, '', this.ultimoHash);
    }, 400);
  }

  aplicarLink(l: ReturnType<typeof lerLink>) {
    const a = this.app;
    if (!l.jornada && a.jornada) a.sairJornada();
    if (!l.jornada && a.emCaminhoReto) a.sairCaminhoReto();
    if (l.comparar) a.comparar(l.comparar[0], l.comparar[1]);
    else {
      if (a.comparando) a.sairComparar();
      if (l.t != null) a.definirTempo(l.t, { silencioso: true });
    }
    if (l.vista) a.camera.definir(l.vista);
    if (l.hora != null) {
      a.hora = l.hora;
      a.horaAuto = false;
    }
    if (l.sel) this.abrir(l.sel, false);
    else if (!this.painel.hidden) this.fecharPainel();
    if (l.travado) a.travar(true);
    if (l.jornada) a.iniciarJornada(l.jornada[0], l.jornada[1]);
  }

  private fecharInicio() {
    this.inicio.hidden = true;
    guardar('arda-inicio-visto', '1');
  }

  // ---------- painel ----------
  abrir(sel: string, voar = false) {
    const a = this.app;
    if (sel === 'fontes' || sel === 'jornadas' || sel === 'eras' || sel === 'linhagens' || sel === 'valar' || sel.startsWith('fonte:') || sel.startsWith('aqui:')) {
      this.conteudoAtual = sel;
      if (sel.startsWith('aqui:')) a.selecionar(null);
      this.renderPainel();
      return;
    }
    a.selecionar(sel);
    this.conteudoAtual = sel;
    this.renderPainel();
    if (voar) {
      if (a.travado) this.aviso('Enquadramento fixo: a câmera fica onde está. Destrave (🔒) para voar até lá.');
      const [tipo, id] = sel.split(':');
      if (tipo === 'lugar') {
        const l = lugarPorId.get(id);
        if (l) a.voar(this.vistaLugar(l.id));
      }
      if (tipo === 'reino') {
        const r = reinoPorId.get(id);
        if (r) a.voar({ x: r.em[0], y: r.em[1], d: 1100 });
      }
    }
  }

  private vistaLugar(id: string): Partial<Vista> {
    const l = lugarPorId.get(id)!;
    const v = l.vista ?? {};
    const d = v.d ?? (l.posto <= 1 ? 1400 : l.posto === 2 ? 220 : l.posto === 3 ? 150 : 90);
    const out: Partial<Vista> = { x: l.em[0], y: l.em[1], d };
    if (v.rumo != null) out.rumo = v.rumo;
    out.inclinacao = v.inclinacao ?? Math.max(35, this.app.camera.estado.inclinacao);
    return out;
  }

  private painelAgendado = 0;
  private ultimoRenderPainel = 0;
  /** Redesenha a ficha aberta no máximo ~6 vezes por segundo (reprodução e arrasto do tempo). */
  private atualizarPainel() {
    if (this.painel.hidden || !this.conteudoAtual || this.painelAgendado) return;
    const espera = Math.max(0, 160 - (performance.now() - this.ultimoRenderPainel));
    this.painelAgendado = window.setTimeout(() => {
      this.painelAgendado = 0;
      if (!this.painel.hidden && this.conteudoAtual) this.renderPainel(true);
    }, espera);
  }

  private renderPainel(manterScroll = false) {
    const a = this.app;
    const sel = this.conteudoAtual;
    let html = '';
    const [tipo, ...resto] = sel.split(':');
    const id = resto.join(':');
    if (tipo === 'lugar') {
      const l = lugarPorId.get(id);
      if (l) html = fichaLugar(a, l);
    } else if (tipo === 'reino') {
      const r = reinoPorId.get(id);
      if (r) html = fichaReino(a, r);
    } else if (tipo === 'evento') {
      const e = tempo.evento(id);
      if (e) html = fichaEvento(a, e);
    } else if (tipo === 'aqui') {
      const [x, y] = id.split(',').map(Number);
      html = fichaAqui(a, x, y, Math.max(8, Math.min(220, a.camera.estado.d * 0.06))).html;
    } else if (tipo === 'fontes') html = fichaFontes();
    else if (tipo === 'fonte') html = fichaFonte(id);
    else if (tipo === 'marco') html = fichaMarco(id);
    else if (tipo === 'jornadas') html = this.htmlJornadas();
    else if (tipo === 'eras') html = this.htmlEras();
    else if (tipo === 'linhagem') html = fichaLinhagem(a, id);
    else if (tipo === 'linhagens') html = fichaSenhorios(a);
    else if (tipo === 'valar') html = fichaValar(a);
    if (!html) return;
    this.ultimoRenderPainel = performance.now();
    const top = this.conteudo.scrollTop;
    const arvoreX = this.conteudo.querySelector('.arvore-rolagem')?.scrollLeft;
    const largo = tipo === 'linhagem' || tipo === 'valar';
    this.painel.classList.toggle('largo', largo);
    document.body.classList.toggle('painel-largo', largo);
    const abertos = manterScroll ? [...this.conteudo.querySelectorAll('details[open] summary')].map((x) => x.textContent) : [];
    this.conteudo.innerHTML = html;
    if (abertos.length) this.conteudo.querySelectorAll('details').forEach((d) => abertos.includes(d.querySelector('summary')?.textContent ?? null) && (d.open = true));
    this.painel.hidden = false;
    document.body.classList.add('painel-aberto');
    const rol = this.conteudo.querySelector<HTMLElement>('.arvore-rolagem');
    if (rol) rol.scrollLeft = manterScroll && arvoreX != null ? arvoreX : (rol.scrollWidth - rol.clientWidth) / 2;
    if (manterScroll) this.conteudo.scrollTop = top;
    else {
      this.conteudo.scrollTop = 0;
      // leva o foco do teclado à ficha recém-aberta
      if (!this.painelFocoAntes) this.painelFocoAntes = document.activeElement as HTMLElement | null;
      if (!matchMedia('(pointer: coarse)').matches) this.conteudo.focus({ preventScroll: true });
    }
  }
  private painelFocoAntes: HTMLElement | null = null;

  fecharPainel() {
    const voltar = this.painelFocoAntes;
    this.painelFocoAntes = null;
    if (voltar && this.painel.contains(document.activeElement) && document.contains(voltar)) voltar.focus({ preventScroll: true });
    this.painel.hidden = true;
    this.painel.classList.remove('expandido', 'largo');
    document.body.classList.remove('painel-aberto', 'painel-largo');
    this.conteudoAtual = '';
    this.app.selecionar(null);
  }

  // ---------- ações ----------
  executar(acao: string, d: Record<string, string>) {
    const a = this.app;
    const tNum = (v?: string) => (v != null && v !== '' ? Number(v) : null);
    switch (acao) {
      case 'gondolin-3d':
      case 'minas-tirith-3d':
      case 'edoras-3d': {
        const v = VISITAS_3D[acao];
        if (a.travado) {
          this.aviso(`Enquadramento fixo: destrave para visitar ${v.nome} em 3D.`);
          break;
        }
        a.sairJornada();
        a.sairCaminhoReto();
        a.definirCamada('detalhes', true);
        if (!v.fase(a.t)) a.definirTempo(tempo.cursor(v.padrao));
        this.fecharInicio();
        this.camadasEl.hidden = true;
        document.getElementById('btn-camadas')!.setAttribute('aria-expanded', 'false');
        this.fecharPainel();
        const viewport = a.retanguloDe(a.ladoAtual());
        a.voar({ ...v.vista, d: v.vista.d / Math.min(1, viewport.width / viewport.height) });
        a.renderer.domElement.focus({ preventScroll: true });
        this.aviso(v.aviso, 7000);
        break;
      }
      case 'sel':
        this.abrir(d.sel, d.sel.startsWith('lugar:') || d.sel.startsWith('reino:'));
        break;
      case 'voar': {
        const v: Partial<Vista> = { x: Number(d.x), y: Number(d.y), d: Number(d.d) || 200 };
        if (d.rumo) v.rumo = Number(d.rumo);
        if (d.inclinacao) v.inclinacao = Number(d.inclinacao);
        if (a.travado) this.aviso('Enquadramento fixo: destrave (🔒) para voar até lá.');
        a.voar(v);
        break;
      }
      case 'tempo': {
        const t = tNum(d.t) ?? tempo.cursor(d.ref);
        a.definirTempo(t);
        break;
      }
      case 'visitar': {
        const t = tNum(d.t);
        if (t != null) a.definirTempo(t);
        this.abrir('lugar:' + d.id, true);
        break;
      }
      case 'posicao': {
        const l = lugarPorId.get(d.id)!;
        a.voar(this.vistaLugar(l.id));
        this.abrir(`aqui:${l.em[0]},${l.em[1]}`);
        a.realce.add(l.id);
        break;
      }
      case 'ir-lugar':
        this.abrir('lugar:' + d.id, true);
        break;
      case 'ir-reino': {
        const t = tNum(d.t);
        if (t != null) a.definirTempo(t);
        this.abrir('reino:' + d.id, true);
        break;
      }
      case 'evento':
        this.abrir('evento:' + d.id);
        break;
      case 'ir-evento': {
        const e = tempo.evento(d.id);
        if (!e) break;
        a.definirTempo(tempo.tEvento(e));
        this.abrir('evento:' + e.id);
        const v = this.vistaEvento(e);
        if (v) a.voar(v);
        break;
      }
      case 'antes': {
        const t = Number(d.t);
        const guardada = d.ev ? a.vistasAntes.get(d.ev) : undefined;
        a.definirTempo(t);
        if (guardada && !a.travado) a.voar(guardada.vista);
        this.aviso(`Mesma vista, em ${tempo.rotulo(t).principal}.`);
        break;
      }
      case 'fundacao': {
        const r = reinoPorId.get(d.id)!;
        const e = tempo.evento(r.evento_fundacao!);
        if (e) a.definirTempo(tempo.tEvento(e));
        const cap = r.capitais[0] ? lugarPorId.get(r.capitais[0].lugar) : undefined;
        a.voar(cap ? { x: cap.em[0], y: cap.em[1], d: 700 } : { x: r.em[0], y: r.em[1], d: 900 });
        this.abrir('reino:' + r.id);
        break;
      }
      case 'ultimo': {
        const r = reinoPorId.get(d.id)!;
        a.definirTempo(tempo.cursor(r.ultimo_periodo!));
        a.voar({ x: r.em[0], y: r.em[1], d: 1000 });
        this.abrir('reino:' + r.id);
        break;
      }
      case 'comparar-reino': {
        const r = reinoPorId.get(d.id)!;
        const par = r.comparar ?? [r.evento_fundacao ? '#' + r.evento_fundacao : r.de, r.ultimo_periodo ?? r.de];
        a.comparar(tempo.cursor(par[0]), tempo.cursor(par[1]));
        a.voar({ x: r.em[0], y: r.em[1], d: 1300, inclinacao: 30 });
        a.selecionar('reino:' + r.id);
        this.aviso(`Comparando as fronteiras de ${r.nome}: ${tempo.rotulo(tempo.cursor(par[0])).principal} e ${tempo.rotulo(tempo.cursor(par[1])).principal}.`);
        break;
      }
      case 'comparar':
        a.comparar(tempo.cursor(d.a), tempo.cursor(d.b));
        break;
      case 'fonte':
        this.abrir('fonte:' + d.id);
        break;
      case 'fontes':
        this.abrir('fontes');
        this.camadasEl.hidden = true;
        break;
      case 'jornadas':
        this.abrirJornadas();
        this.camadasEl.hidden = true;
        break;
      case 'eras':
        this.abrirEras();
        this.camadasEl.hidden = true;
        break;
      case 'fotografias':
        this.camadasEl.hidden = true;
        this.abrirFotos('painel');
        break;
      case 'foto':
        this.abrirFotos(d.id);
        break;
      case 'arvore-tela':
        this.abrirArvoreTela(d.id);
        break;
      case 'retrato':
        this.abrirRetrato(d.id);
        break;
      case 'linhagens':
        this.abrir('linhagens');
        this.camadasEl.hidden = true;
        break;
      case 'valar':
        this.abrir('valar');
        this.camadasEl.hidden = true;
        break;
      case 'jornada':
        a.iniciarJornada(d.id, Number(d.passo) || 0);
        this.fecharPainel();
        break;
      case 'era':
        this.escolherEra(d.id);
        break;
      case 'hora':
        a.hora = Number(d.h);
        a.horaAuto = false;
        this.atualizarPainel();
        break;
      case 'caminho-reto':
        a.iniciarCaminhoReto();
        break;
      case 'sair-caminho':
        a.sairCaminhoReto();
        break;
      case 'compartilhar':
        this.compartilhar();
        break;
    }
  }

  private vistaEvento(e: Evento): Partial<Vista> | null {
    if (e.vista) return e.vista;
    const l = e.lugares?.map((id) => lugarPorId.get(id)).find(Boolean);
    if (l) return this.vistaLugar(l.id);
    return null;
  }

  private escolherEra(id: string) {
    const a = this.app;
    const era = eras.find((e) => e.id === id)!;
    a.definirTempo(tempo.cursor(era.cursor_padrao ?? `${id}:inicio`));
    if (era.vista) {
      if (a.travado) this.aviso('Enquadramento fixo: a câmera permanece onde está.');
      a.voar(era.vista);
    }
    this.aviso(`${era.nome}: ${era.descricao}`, 6500);
    if (this.conteudoAtual === 'eras') this.fecharPainel();
  }

  private abrirEras() {
    this.abrir('eras');
  }
  private abrirJornadas() {
    this.abrir('jornadas');
  }

  private htmlEras(): string {
    return `<header class="ficha-cab"><p class="tipo">Escolher uma era</p><h2>Eras de Arda</h2></header>
    <ul class="lista-eras">${eras
      .map(
        (e) => `<li style="--cor:${e.cor}"><button type="button" data-acao="era" data-id="${e.id}"><strong>${esc(e.nome)}</strong>${e.datada ? `<span class="data">${e.inicio}–${e.fim} ${esc(e.abrev)}</span>` : '<span class="data">sem anos: navegação por sequência</span>'}<span>${esc(e.descricao)}</span></button></li>`,
      )
      .join('')}</ul>`;
  }

  private htmlJornadas(): string {
    return `<header class="ficha-cab"><p class="tipo">Seguir uma jornada</p><h2>Percursos guiados</h2></header>
    <ul class="lista-jornadas">${jornadas
      .map((j) => `<li><button type="button" data-acao="jornada" data-id="${j.id}"><strong>${esc(j.titulo)}</strong><span>${esc(j.subtitulo)}</span><span class="data">${j.passos.length} paradas</span></button></li>`)
      .join('')}</ul>
    <section class="bloco"><h3>Seguir o Caminho Reto</h3><p>Depois da Queda de Númenor, Aman não está mais na superfície do mundo. Este modo narrativo mostra, segundo a Akallabêth, como a estrada reta continua enquanto o mundo se curva.</p><div class="acoes"><button type="button" data-acao="caminho-reto">Seguir o Caminho Reto</button></div></section>`;
  }

  // ---------- árvore em tela cheia ----------
  private abrirRetrato(id: string) {
    const html = htmlRetrato(id);
    if (!html || this.retratoTela.open) return;
    this.retratoTela.innerHTML = html;
    this.retratoTela.showModal();
  }

  private abrirArvoreTela(id: string) {
    const html = htmlArvoreTela(this.app, id);
    if (!html) return;
    if (this.arvoreTela.hidden) this.arvoreTelaFocoAntes = document.activeElement as HTMLElement | null;
    this.arvoreTelaId = id;
    this.arvoreTela.innerHTML = html;
    this.arvoreTela.hidden = false;
    document.body.classList.add('arvore-tela-aberta');
    const rol = this.arvoreTela.querySelector<HTMLElement>('.arvore-rolagem')!;
    rol.scrollLeft = (rol.scrollWidth - rol.clientWidth) / 2;
    this.arvoreTela.querySelector<HTMLElement>('[data-fechar-arvore]')!.focus({ preventScroll: true });
  }

  // ---------- fotografias em tela cheia ----------
  private abrirFotos(alvo: string) {
    const html = alvo === 'painel' ? htmlPainelFotos(this.app, this.fotosTodas) : htmlVisualizador(this.app, alvo);
    if (!html) return;
    if (this.fotosTela.hidden) this.fotosFocoAntes = document.activeElement as HTMLElement | null;
    this.fotosAberto = alvo;
    this.fotosTela.innerHTML = html;
    this.fotosTela.hidden = false;
    this.fotosTela.classList.toggle('visualizador', alvo !== 'painel');
    this.fotosTela.scrollTop = 0;
    this.fotosTela.querySelector<HTMLElement>('[data-fechar-fotos]')!.focus({ preventScroll: true });
  }

  private fecharFotos() {
    if (this.fotosTela.hidden) return;
    this.fotosTela.hidden = true;
    this.fotosTela.innerHTML = '';
    this.fotosAberto = '';
    const voltar = this.fotosFocoAntes;
    this.fotosFocoAntes = null;
    if (voltar && document.contains(voltar)) voltar.focus({ preventScroll: true });
  }

  private fecharArvoreTela() {
    if (this.arvoreTela.hidden) return;
    this.arvoreTela.hidden = true;
    this.arvoreTela.innerHTML = '';
    this.arvoreTelaId = '';
    document.body.classList.remove('arvore-tela-aberta');
    const voltar = this.arvoreTelaFocoAntes;
    this.arvoreTelaFocoAntes = null;
    if (voltar && document.contains(voltar)) voltar.focus({ preventScroll: true });
  }

  // ---------- jornada ----------
  private atualizarJornada() {
    const a = this.app;
    const c = this.cartaoJornada;
    if (a.emCaminhoReto && !a.jornada) {
      c.hidden = false;
      c.innerHTML = `<p class="sobretitulo">Modo narrativo</p><h3>O Caminho Reto</h3><p>Depois da Queda, o mundo se curva e Aman fica fora de seus círculos. Pela estrada reta, que segue em frente enquanto o mar desce, alguns marinheiros ainda chegaram a Tol Eressëa e a Valinor.</p>${listaFontes([{ fonte: 'silm', local: 'Akallabêth (fim)' }])}<div class="acoes"><button type="button" class="primario" data-acao="sair-caminho">Voltar ao mundo redondo</button></div>`;
      return;
    }
    if (!a.jornada) {
      c.hidden = true;
      return;
    }
    const { j, passo } = a.jornada;
    const p = j.passos[passo];
    c.hidden = false;
    c.innerHTML = `<p class="sobretitulo">${esc(j.titulo)} · ${passo + 1}/${j.passos.length}</p>
      <h3>${esc(p.titulo)}</h3>
      <p>${esc(p.texto)}</p>
      ${p.fontes?.length ? listaFontes(p.fontes) : ''}
      <div class="progresso">${j.passos.map((_, k) => `<span class="${k === passo ? 'atual' : k < passo ? 'feito' : ''}"></span>`).join('')}</div>
      <div class="acoes">
        <button type="button" data-j="ant" ${passo === 0 ? 'disabled' : ''} aria-label="Parada anterior">‹ Anterior</button>
        ${p.selecionar ? `<button type="button" data-j="ficha">Ver ficha</button>` : ''}
        ${p.modo === 'caminho-reto' ? `<button type="button" data-acao="sair-caminho">Voltar ao mundo</button>` : ''}
        <button type="button" data-j="prox" class="primario" ${passo === j.passos.length - 1 ? 'disabled' : ''} aria-label="Próxima parada">Próximo ›</button>
        <button type="button" data-j="sair" class="discreto">Sair</button>
      </div>`;
    c.querySelectorAll<HTMLButtonElement>('[data-j]').forEach((b) =>
      b.addEventListener('click', () => {
        const k = b.dataset.j;
        if (k === 'ant') a.irPasso(passo - 1);
        if (k === 'prox') a.irPasso(passo + 1);
        if (k === 'sair') {
          a.sairJornada();
          a.sairCaminhoReto();
        }
        if (k === 'ficha' && p.selecionar) this.abrir(p.selecionar);
      }),
    );
  }

  // ---------- comparação ----------
  private alternarComparar() {
    const a = this.app;
    if (a.comparando) {
      a.sairComparar();
      return;
    }
    const t = a.t;
    const era = tempo.eraDe(t);
    // sugestão: comparar com o momento logo antes do último grande acontecimento
    const ev = tempo.eventoAtual(t);
    const tA = ev && ev.importante ? tempo.passoAno(tempo.tInicioEvento(ev) + 1e-9, -1) : era.datada ? tempo.passoAno(t, -100) : tempo.passoEvento(t, -1);
    a.comparar(tA, t);
    this.aviso('Comparação lado a lado: as câmeras estão sincronizadas. Toque num dos lados para escolher qual a linha do tempo controla.', 5000);
  }

  private atualizarComparar() {
    const a = this.app;
    const b = this.barraComparar;
    if (!a.comparando) {
      b.hidden = true;
      return;
    }
    b.hidden = false;
    const ra = tempo.rotulo(a.A.t),
      rb = tempo.rotulo(a.B.t);
    b.innerHTML = `<button type="button" class="lado ${a.ladoAtivo === 'A' ? 'ativo' : ''}" data-lado="A"><span class="sobretitulo">${a.divisaoVertical() ? 'Esquerda' : 'Acima'}</span><strong>${esc(ra.principal)}</strong></button>
      <button type="button" class="trocar" data-lado="troca" aria-label="Trocar lados">⇆</button>
      <button type="button" class="lado ${a.ladoAtivo === 'B' ? 'ativo' : ''}" data-lado="B"><span class="sobretitulo">${a.divisaoVertical() ? 'Direita' : 'Abaixo'}</span><strong>${esc(rb.principal)}</strong></button>
      <button type="button" class="sair" data-lado="sair">Sair</button>`;
    b.querySelectorAll<HTMLButtonElement>('[data-lado]').forEach((x) =>
      x.addEventListener('click', () => {
        const k = x.dataset.lado;
        if (k === 'A' || k === 'B') a.ladoAtivo = k;
        if (k === 'troca') a.comparar(a.B.t, a.A.t);
        if (k === 'sair') a.sairComparar();
        a.emitir('tempo');
      }),
    );
  }

  // ---------- avisos ----------
  aviso(texto: string, ms = 4000, html = '') {
    const el = h('div', { class: 'aviso' }, `<p>${esc(texto)}</p>${html}`);
    this.avisos.appendChild(el);
    while (this.avisos.children.length > 3) this.avisos.firstElementChild!.remove();
    setTimeout(() => {
      el.classList.add('saindo');
      setTimeout(() => el.remove(), 400);
    }, ms);
  }

  private eventosCruzados(evs: Evento[]) {
    const lista = evs.filter((e) => e.importante).slice(-2);
    const mostrar = lista.length ? lista : evs.slice(-1);
    for (const e of mostrar) {
      const el = h(
        'div',
        { class: 'aviso evento' },
        `<p class="sobretitulo">${esc(tempo.dataEvento(e))}</p><p><strong>${esc(e.titulo)}</strong></p><button type="button" class="link" data-acao="evento" data-id="${e.id}">Ler o que aconteceu</button>`,
      );
      this.avisos.appendChild(el);
      while (this.avisos.children.length > 3) this.avisos.firstElementChild!.remove();
      setTimeout(() => {
        el.classList.add('saindo');
        setTimeout(() => el.remove(), 400);
      }, 6500);
    }
  }

  private async compartilhar() {
    const url = montarLink(this.app);
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: 'Atlas de Arda', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      this.aviso('Link copiado. Ele restaura o local, o período e o enquadramento.');
    } catch {
      this.aviso('Copie o endereço da barra do navegador: ele guarda esta vista.');
    }
  }

  // ---------- teclado ----------
  private teclado(e: KeyboardEvent) {
    const alvo = e.target as HTMLElement;
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    // O dialog mantém o teclado no retrato; Esc nativo não fecha a árvore atrás.
    if (this.retratoTela.open) return;
    // com a árvore em tela cheia, o teclado não move o mapa; Esc fecha
    // com as fotografias abertas: Esc fecha (ou volta à grade), setas passam de foto
    if (this.fotosAberto) {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (this.fotosAberto !== 'painel' && this.fotosTela.querySelector('[data-acao="fotografias"]')) this.abrirFotos('painel');
        else this.fecharFotos();
      } else if (this.fotosAberto !== 'painel' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        this.fotosTela.querySelectorAll<HTMLElement>('.foto-nav')[e.key === 'ArrowLeft' ? 0 : 1]?.click();
      }
      return;
    }
    if (this.arvoreTelaId) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.fecharArvoreTela();
      }
      return;
    }
    if (alvo.closest('input, select, textarea')) {
      if (e.key === 'Escape') (alvo as HTMLInputElement).blur();
      return;
    }
    // o trilho do tempo já trata as setas; botões já tratam Espaço e Enter
    if (alvo.closest('[role="slider"]') && e.key.startsWith('Arrow')) return;
    if (alvo.closest('button, a, summary') && (e.key === ' ' || e.key === 'Enter')) return;
    const a = this.app;
    const s = a.camera.estado;
    const passo = s.d * 0.12;
    const th = (s.rumo * Math.PI) / 180;
    const mover = (fx: number, fy: number) => {
      if (a.travado) return;
      a.camera.definir({ x: s.x + (fx * Math.cos(th) + fy * Math.sin(th)) * passo, y: s.y + (-fx * Math.sin(th) + fy * Math.cos(th)) * passo });
    };
    let usado = true;
    switch (e.key) {
      case 'ArrowUp':
        mover(0, 1);
        break;
      case 'ArrowDown':
        mover(0, -1);
        break;
      case 'ArrowLeft':
        mover(-1, 0);
        break;
      case 'ArrowRight':
        mover(1, 0);
        break;
      case '+':
      case '=':
        if (!a.travado) a.camera.definir({ d: s.d * 0.8 });
        break;
      case '-':
      case '_':
        if (!a.travado) a.camera.definir({ d: s.d * 1.25 });
        break;
      case 'q':
      case 'Q':
        if (!a.travado) a.camera.definir({ rumo: s.rumo - 8 });
        break;
      case 'e':
      case 'E':
        if (!a.travado) a.camera.definir({ rumo: s.rumo + 8 });
        break;
      case 'r':
      case 'R':
        if (!a.travado) a.camera.definir({ inclinacao: s.inclinacao + 5 });
        break;
      case 'f':
      case 'F':
        if (!a.travado) a.camera.definir({ inclinacao: s.inclinacao - 5 });
        break;
      case 'n':
      case 'N':
        a.camera.voar({ rumo: 0 }, 400);
        break;
      case '[':
        a.passoAno(e.shiftKey ? -100 : -1);
        break;
      case ']':
        a.passoAno(e.shiftKey ? 100 : 1);
        break;
      case '{':
        a.passoAno(-100);
        break;
      case '}':
        a.passoAno(100);
        break;
      case ',':
      case '<':
        a.passoEvento(-1);
        break;
      case '.':
      case '>':
        a.passoEvento(1);
        break;
      case ' ':
        this.linha.alternarPlay();
        break;
      case 'l':
      case 'L':
        a.travar(!a.travado);
        break;
      case 'c':
      case 'C':
        this.alternarComparar();
        break;
      case 'j':
      case 'J':
        this.abrirJornadas();
        break;
      case '/':
        this.busca.focar();
        break;
      case 'Escape':
        if (!this.painel.hidden) this.fecharPainel();
        else if (a.jornada) a.sairJornada();
        else if (a.comparando) a.sairComparar();
        break;
      default:
        usado = false;
    }
    if (usado) e.preventDefault();
  }

  // ---------- por quadro ----------
  private ultimoStatusTxt = '';
  private quadro() {
    const a = this.app;
    const s = a.camera.estado;
    this.bussola.style.transform = `rotate(${-s.rumo}deg)`;
    this.carregando.hidden = !a.carregando;
    const txt = `GA ${Math.round(s.x)} ${s.x >= 0 ? 'L' : 'O'}, ${Math.abs(Math.round(s.y))} ${s.y >= 0 ? 'N' : 'S'} · ${s.d >= 10 ? Math.round(s.d) : s.d.toFixed(1)} km${a.travado ? ' · enquadramento fixo' : ''}${regimeDe(a.t) === 'arvores' ? ' · ' + a.faseArvores().fase : ''}`;
    if (txt !== this.ultimoStatusTxt) {
      this.status.textContent = txt;
      this.ultimoStatusTxt = txt;
    }
  }
}
