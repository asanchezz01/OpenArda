// Núcleo do Atlas de Arda: estado (tempo, câmera, seleção, camadas,
// comparação, jornadas), laço de renderização e ações chamadas pela interface.

import * as THREE from 'three';
import { Camera } from './render/camera';
import { Ceu } from './render/sky';
import { aplicarIluminacao, criarUniformesCeu, luzDasArvores, regimeDe, type UniformesCeu } from './render/lighting';
import { Rotulos } from './render/labels';
import { Sobreposicao, CAMADAS_PADRAO, type Camadas } from './render/overlay';
import { criarUniformesGlobais, type UniformesGlobais } from './terrain/material';
import { PoolWorkers, SistemaTerreno } from './terrain/tiles';
import { ModeloTerreno } from './terrain/model';
import { estadoTerreno, terreno, tempo, eras, jornadas, lugarPorId, reinoPorId, statusLugar, lugares } from './core/data';
import type { Evento, Feicao, Jornada, Vista } from './core/types';

export type Selecao = string | null; // "lugar:id" | "reino:id" | "evento:id" | "aqui:x,y" | "marco:id" | "fontes"

export interface Lado {
  t: number;
  sistema: SistemaTerreno;
  uniformes: UniformesGlobais;
  ceu: UniformesCeu;
  modelo: ModeloTerreno | null;
  assinaturaModelo: string;
  rotulos: Rotulos;
}

type Ouvinte = (motivo: string) => void;

const EZELLOHAR = { x: -3960, y: -150, h: 1.5, raio: 1700 };

export class App {
  readonly renderer: THREE.WebGLRenderer;
  readonly camera: Camera;
  readonly host: HTMLElement;
  private ceu: Ceu;
  readonly sobreposicao = new Sobreposicao();
  readonly sobreposicaoB = new Sobreposicao();
  readonly pool: PoolWorkers;
  readonly A: Lado;
  readonly B: Lado;
  private veu: SistemaTerreno;
  private veuUniformes: UniformesGlobais;
  private veuCeu = criarUniformesCeu();
  private estrada: THREE.Mesh;
  private brilhos!: Record<'illuin' | 'ormal' | 'telperion' | 'laurelin', THREE.Sprite>;
  private cena = new THREE.Scene();
  private modelos = new Map<string, ModeloTerreno>();
  private ouvintes: Ouvinte[] = [];
  private relogio = new THREE.Clock();
  private tempoDebounce = 0;
  private readonly tVeu = tempo.cursor('PE:400');
  private pendenteTerreno = false;

  hora = 3.5;
  horaAuto = true;
  selecao: Selecao = null;
  travado = false;
  comparando = false;
  ladoAtivo: 'A' | 'B' = 'B';
  jornada: { j: Jornada; passo: number } | null = null;
  caminhoReto = 0; // 0..1
  private caminhoRetoAlvo = 0;
  tocando = false;
  reduzirMovimento = false;
  camadas: Camadas = { ...CAMADAS_PADRAO };
  private tempestade = 0;
  private relampago = 0;
  vistasAntes = new Map<string, { vista: Vista; t: number }>();
  aoEventosCruzados?: (evs: Evento[], t0: number, t1: number) => void;
  aoToqueMapa?: (x: number, y: number, sx: number, sy: number) => void;
  aoClicarRotulo?: (tipo: 'lugar' | 'reino' | 'marco', id: string) => void;
  realce = new Set<string>();
  ultimoStatus = new Map<string, string>();

  constructor(host: HTMLElement) {
    this.host = host;
    const prefereReduzir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.reduzirMovimento = prefereReduzir;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 800 ? 1.5 : 2));
    this.renderer.setSize(host.clientWidth, host.clientHeight);
    this.renderer.autoClear = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.className = 'mapa-canvas';
    this.renderer.domElement.setAttribute('aria-label', 'Mapa 3D de Arda');
    this.renderer.domElement.tabIndex = 0;
    host.appendChild(this.renderer.domElement);

    this.camera = new Camera(this.renderer.domElement, host.clientWidth / host.clientHeight);
    this.camera.reduzirMovimento = this.reduzirMovimento;
    const nw = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
    this.pool = new PoolWorkers(nw);
    const luz = () => EZELLOHAR;
    const mk = (rotHost: HTMLElement): Lado => {
      const uniformes = criarUniformesGlobais();
      const sistema = new SistemaTerreno(this.pool, uniformes, { luzArvores: luz });
      this.cena.add(sistema.grupo);
      return { t: 0, sistema, uniformes, ceu: criarUniformesCeu(), modelo: null, assinaturaModelo: '', rotulos: new Rotulos(rotHost) };
    };
    const rotA = document.createElement('div');
    rotA.className = 'camada-rotulos lado-a';
    const rotB = document.createElement('div');
    rotB.className = 'camada-rotulos lado-b';
    host.appendChild(rotA);
    host.appendChild(rotB);
    this.A = mk(rotA);
    this.B = mk(rotB);
    this.B.sistema.grupo.visible = false;
    for (const l of [this.A, this.B]) l.rotulos.aoClicar = (tipo, id) => this.aoClicarRotulo?.(tipo, id);

    // Aman velada (modo Caminho Reto)
    this.veuUniformes = criarUniformesGlobais();
    this.veu = new SistemaTerreno(this.pool, this.veuUniformes, { regiao: [-4900, -2600, -2900, 2100], luzArvores: () => null });
    this.veu.grupo.visible = false;
    this.cena.add(this.veu.grupo);
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.85, 0.5), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.estrada = new THREE.Mesh(geo, mat);
    this.estrada.visible = false;
    this.cena.add(this.estrada);

    this.ceu = new Ceu(this.A.ceu);
    // brilhos das Lâmpadas e das Duas Árvores
    const textura = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const g = c.getContext('2d')!;
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.15, 'rgba(255,255,255,0.75)');
      gr.addColorStop(0.45, 'rgba(255,255,255,0.18)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 128);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    const brilho = (cor: number) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textura, color: cor, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      s.visible = false;
      this.cena.add(s);
      return s;
    };
    this.brilhos = { illuin: brilho(0xfff1c8), ormal: brilho(0xffe2b0), telperion: brilho(0xc8d8ff), laurelin: brilho(0xffc760) };
    this.camera.alturaEm = (x, y) => this.alturaEm(x, y, this.A);
    this.camera.viewport = (sx, sy) => this.retanguloDe(this.ladoDaTela(sx, sy));
    this.camera.aoToque = (sx, sy) => this.tocar(sx, sy);
    window.addEventListener('resize', () => this.redimensionar());
    this.A.sistema.aoMudarRelevo = () => this.emitir('relevo');
  }

  // ---------- consultas ----------
  modeloDe(lado: Lado): ModeloTerreno | null {
    const sig = lado.sistema.assinatura || '';
    if (lado.assinaturaModelo === sig && lado.modelo) return lado.modelo;
    if (!sig) return null;
    let m = this.modelos.get(sig);
    if (!m) {
      const est = estadoTerreno(lado.t);
      if (est.assinatura !== sig) {
        // a assinatura exibida ainda é a anterior; usa o estado alvo quando pronto
        return lado.modelo;
      }
      m = new ModeloTerreno(est.feicoes, terreno.cadeias, terreno.limites);
      this.modelos.set(sig, m);
      if (this.modelos.size > 4) this.modelos.delete(this.modelos.keys().next().value!);
    }
    lado.modelo = m;
    lado.assinaturaModelo = sig;
    return m;
  }

  alturaEm(x: number, y: number, lado: Lado = this.A): number {
    const m = this.modeloDe(lado);
    if (!m) return 0;
    const h = m.altura(x, y);
    return Math.max(0, h) * lado.uniformes.uExag.value;
  }

  get t() {
    return this.ladoAtual().t;
  }

  ladoAtual(): Lado {
    return this.comparando && this.ladoAtivo === 'A' ? this.A : this.comparando ? this.B : this.A;
  }

  /** Ponto do mundo sob a tela (ray-march no relevo). */
  pontoEm(sx: number, sy: number): THREE.Vector3 | null {
    const lado = this.ladoDaTela(sx, sy);
    const ray = this.camera.raio(sx, sy);
    const m = this.modeloDe(lado);
    if (!m) return this.camera.chao(sx, sy, 0);
    const exag = lado.uniformes.uExag.value;
    let t = 0;
    const maxT = this.camera.estado.d * 30;
    let passo = Math.max(0.05, this.camera.estado.d * 0.01);
    for (let k = 0; k < 400 && t < maxT; k++) {
      const p = ray.origin.clone().addScaledVector(ray.direction, t);
      const hz = Math.max(0, m.altura(p.x, p.y)) * exag;
      if (p.z <= hz) {
        // refino binário
        let a = t - passo,
          b = t;
        for (let i = 0; i < 12; i++) {
          const c = (a + b) / 2;
          const q = ray.origin.clone().addScaledVector(ray.direction, c);
          if (q.z <= Math.max(0, m.altura(q.x, q.y)) * exag) b = c;
          else a = c;
        }
        return ray.origin.clone().addScaledVector(ray.direction, b);
      }
      passo = Math.max(0.05, Math.min(this.camera.estado.d * 0.05, (p.z - hz) * 0.5));
      t += passo;
    }
    return this.camera.chao(sx, sy, 0);
  }

  /** Na comparação, a metade da tela que contém o ponto (esquerda/acima = A). */
  ladoDaTela(sx: number, sy: number): Lado {
    if (!this.comparando) return this.A;
    const r = this.host.getBoundingClientRect();
    if (this.divisaoVertical()) return sx - r.left < Math.floor(r.width / 2) ? this.A : this.B;
    return sy - r.top < r.height - Math.floor(r.height / 2) ? this.A : this.B;
  }

  /** Retângulo da tela (em coordenadas do cliente) onde um lado é desenhado. */
  retanguloDe(lado: Lado): { left: number; top: number; width: number; height: number } {
    const r = this.host.getBoundingClientRect();
    if (!this.comparando) return r;
    if (this.divisaoVertical()) {
      const w2 = Math.floor(r.width / 2);
      return lado === this.A ? { left: r.left, top: r.top, width: w2, height: r.height } : { left: r.left + w2, top: r.top, width: r.width - w2, height: r.height };
    }
    const hB = Math.floor(r.height / 2);
    return lado === this.A ? { left: r.left, top: r.top, width: r.width, height: r.height - hB } : { left: r.left, top: r.top + r.height - hB, width: r.width, height: hB };
  }

  divisaoVertical() {
    return this.host.clientWidth >= this.host.clientHeight * 0.9;
  }

  // ---------- eventos internos ----------
  ouvir(f: Ouvinte) {
    this.ouvintes.push(f);
  }
  emitir(motivo: string) {
    for (const f of this.ouvintes) f(motivo);
  }

  // ---------- tempo ----------
  definirTempo(t: number, opts: { lado?: 'A' | 'B'; arrastando?: boolean; silencioso?: boolean } = {}) {
    const lado = opts.lado ? (opts.lado === 'A' ? this.A : this.B) : this.ladoAtual();
    const t0 = lado.t;
    lado.t = t;
    if (!this.comparando) this.B.t = t;
    if (!opts.silencioso && lado === this.ladoAtual()) {
      const evs = tempo.eventosEntre(t0, t);
      if (evs.length && !opts.arrastando && evs.length <= 4) {
        for (const e of evs) this.vistasAntes.set(e.id, { vista: { ...this.camera.estado }, t: t0 });
        if (evs.some((e) => e.id === 'se-queda') && t > t0 && !this.reduzirMovimento) this.tempestade = 1;
        this.aoEventosCruzados?.(evs, t0, t);
      }
    }
    if (opts.arrastando) {
      this.pendenteTerreno = true;
      clearTimeout(this.tempoDebounce);
      this.tempoDebounce = window.setTimeout(() => this.atualizarTerreno(), 280);
    } else this.atualizarTerreno();
    this.emitir('tempo');
  }

  atualizarTerreno() {
    this.pendenteTerreno = false;
    const dur = this.reduzirMovimento ? 600 : 2600;
    for (const l of [this.A, this.B]) {
      if (l === this.B && !this.comparando) continue;
      const est = estadoTerreno(l.t);
      l.sistema.definirEstado(est.assinatura, est.feicoes, est.feicoes.length ? dur : dur);
    }
  }

  passoAno(n: number) {
    this.definirTempo(tempo.passoAno(this.t, n));
  }
  passoEvento(dir: 1 | -1) {
    this.definirTempo(tempo.passoEvento(this.t, dir));
  }

  // ---------- câmera ----------
  voar(v: Partial<Vista>, forcar = false): Promise<boolean> {
    if (this.travado && !forcar) return Promise.resolve(false);
    return this.camera.voar(v);
  }

  travar(v: boolean) {
    this.travado = v;
    this.camera.bloqueada = v;
    this.emitir('trava');
  }

  definirReduzirMovimento(v: boolean) {
    this.reduzirMovimento = v;
    this.camera.reduzirMovimento = v;
    this.emitir('config');
  }

  exageroUsuario = 2.5;
  definirExagero(v: number) {
    this.exageroUsuario = v;
    this.emitir('config');
  }

  definirCamada<K extends keyof Camadas>(k: K, v: Camadas[K]) {
    this.camadas[k] = v;
    this.sobreposicao.camadas = { ...this.camadas };
    this.sobreposicaoB.camadas = { ...this.camadas };
    this.sobreposicao.invalidar();
    this.sobreposicaoB.invalidar();
    this.host.classList.toggle('sem-nomes', !this.camadas.nomes);
    this.emitir('camadas');
  }

  // ---------- seleção ----------
  selecionar(s: Selecao) {
    this.selecao = s;
    const reino = s?.startsWith('reino:') ? s.slice(6) : null;
    this.sobreposicao.selecionado = reino;
    this.sobreposicaoB.selecionado = reino;
    this.realce.clear();
    if (s?.startsWith('lugar:')) this.realce.add(s.slice(6));
    if (s?.startsWith('evento:')) {
      const ev = tempo.evento(s.slice(7));
      ev?.lugares?.forEach((l) => this.realce.add(l));
    }
    this.emitir('selecao');
  }

  // ---------- comparação ----------
  comparar(tA: number, tB: number) {
    this.comparando = true;
    this.A.t = tA;
    this.B.t = tB;
    this.B.sistema.grupo.visible = true;
    this.host.classList.add('comparando');
    this.host.classList.toggle('divisao-horizontal', !this.divisaoVertical());
    this.ladoAtivo = 'B';
    this.atualizarTerreno();
    this.emitir('comparar');
    this.emitir('tempo');
  }

  sairComparar() {
    if (!this.comparando) return;
    const t = this.ladoAtual().t;
    this.comparando = false;
    this.B.sistema.grupo.visible = false;
    this.B.rotulos.esconderTudo();
    this.host.classList.remove('comparando', 'divisao-horizontal');
    this.A.t = t;
    this.B.t = t;
    this.atualizarTerreno();
    this.emitir('comparar');
    this.emitir('tempo');
  }

  // ---------- jornadas ----------
  iniciarJornada(id: string, passo = 0) {
    const j = jornadas.find((x) => x.id === id);
    if (!j) return;
    // o passo pode vir de um link editado à mão
    this.jornada = { j, passo: Math.max(0, Math.min(j.passos.length - 1, Math.floor(passo) || 0)) };
    this.aplicarPasso();
  }

  irPasso(k: number) {
    if (!this.jornada) return;
    this.jornada.passo = Math.max(0, Math.min(this.jornada.j.passos.length - 1, k));
    this.aplicarPasso();
  }

  private aplicarPasso() {
    const jp = this.jornada!;
    const p = jp.j.passos[jp.passo];
    if (this.travado) this.travar(false);
    if (p.modo !== 'caminho-reto' && this.caminhoRetoAlvo > 0) this.sairCaminhoReto();
    if (p.comparar) {
      this.comparar(tempo.cursor(p.comparar[0]), tempo.cursor(p.comparar[1]));
    } else {
      this.sairComparar();
      this.definirTempo(tempo.cursor(p.quando));
    }
    if (p.hora_arvores != null) {
      this.hora = p.hora_arvores;
      this.horaAuto = false;
    }
    this.selecionar(p.selecionar ?? null);
    if (p.modo === 'caminho-reto') this.iniciarCaminhoReto();
    else this.camera.voar(p.vista);
    this.emitir('jornada');
  }

  sairJornada() {
    if (this.jornada?.j.passos[this.jornada.passo]?.modo === 'caminho-reto') this.sairCaminhoReto();
    this.jornada = null;
    this.horaAuto = true;
    this.emitir('jornada');
  }

  // ---------- Caminho Reto ----------
  iniciarCaminhoReto() {
    const tAntes = tempo.cursor('SE:3318');
    const est = estadoTerreno(tAntes, (f: Feicao) => f.grupo === 'aman');
    this.veu.definirEstado(est.assinatura, est.feicoes, 1);
    this.veu.grupo.visible = true;
    this.caminhoRetoAlvo = 1;
    if (this.t < tempo.cursor('SE:3319')) this.definirTempo(tempo.cursor('SE:3320'));
    const ini = { x: -2440, y: -560, d: 160, rumo: 285, inclinacao: 78 };
    const meio = { x: -2900, y: -320, d: 320, rumo: 290, inclinacao: 80 };
    const fim = { x: -3300, y: -120, d: 240, rumo: 270, inclinacao: 72 };
    // a sequência para se o visitante assumir a câmera no meio do caminho
    const r = this.reduzirMovimento;
    void (async () => {
      if (!(await this.camera.voar(ini, r ? 0 : 2200))) return;
      if (!(await this.camera.voar(meio, r ? 0 : 6000))) return;
      await this.camera.voar(fim, r ? 0 : 5000);
    })();
    this.emitir('caminho-reto');
  }

  sairCaminhoReto() {
    this.caminhoRetoAlvo = 0;
    this.emitir('caminho-reto');
  }

  get emCaminhoReto() {
    return this.caminhoRetoAlvo > 0;
  }

  // ---------- toque no mapa ----------
  private tocar(sx: number, sy: number) {
    const p = this.pontoEm(sx, sy);
    if (!p) return;
    if (this.comparando) {
      const lado = this.ladoDaTela(sx, sy);
      this.ladoAtivo = lado === this.A ? 'A' : 'B';
      this.emitir('tempo');
    }
    this.aoToqueMapa?.(p.x, p.y, sx, sy);
  }

  // ---------- laço ----------
  redimensionar() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    this.renderer.setSize(w, h);
    this.host.classList.toggle('divisao-horizontal', this.comparando && !this.divisaoVertical());
    this.camera.redimensionar(this.aspectoVista());
  }

  private aspectoVista() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!this.comparando) return w / h;
    return this.divisaoVertical() ? w / 2 / h : w / (h / 2);
  }

  iniciar() {
    this.atualizarTerreno();
    const loop = () => {
      this.quadro();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // resolução dinâmica: mantém a fluidez em aparelhos modestos
  private emaQuadro = 16;
  private ultimoAjuste = 0;
  private prMax = Math.min(window.devicePixelRatio || 1, window.innerWidth < 800 ? 1.5 : 2);
  private resolucaoFixa = /qualidade=fixa/.test(location.search);
  private ajustarResolucao(dtReal: number) {
    if (this.resolucaoFixa) return;
    this.emaQuadro = this.emaQuadro * 0.92 + dtReal * 1000 * 0.08;
    const agora = performance.now();
    if (agora - this.ultimoAjuste < 2500) return;
    const pr = this.renderer.getPixelRatio();
    let novo = pr;
    if (this.emaQuadro > 48 && pr > 0.6) novo = Math.max(0.6, pr * 0.8);
    else if (this.emaQuadro < 20 && pr < this.prMax) novo = Math.min(this.prMax, pr * 1.2);
    if (Math.abs(novo - pr) > 0.01) {
      this.renderer.setPixelRatio(novo);
      this.renderer.setSize(this.host.clientWidth, this.host.clientHeight);
      this.ultimoAjuste = agora;
    }
  }

  private quadro() {
    const dtReal = this.relogio.getDelta();
    if (!this.carregando) this.ajustarResolucao(dtReal);
    const dt = Math.min(0.1, dtReal);
    const agora = performance.now() / 1000;
    if (this.horaAuto && regimeDe(this.t) === 'arvores') {
      this.hora = (this.hora + dt * (this.reduzirMovimento ? 0.08 : 0.25)) % 12;
    }
    this.camera.tick(dt);
    this.camera.ajustarAspecto(this.aspectoVista());
    this.camera.aplicar();
    const cam = this.camera.cam;

    // transições visuais
    this.tempestade = Math.max(0, this.tempestade - dt / 7);
    this.relampago = this.tempestade > 0.15 && Math.random() < dt * 2.2 ? 1 : this.relampago * Math.exp(-dt * 9);
    this.caminhoReto += (this.caminhoRetoAlvo - this.caminhoReto) * Math.min(1, dt * (this.reduzirMovimento ? 10 : 0.6));
    if (this.caminhoReto < 0.002 && this.caminhoRetoAlvo === 0) {
      this.caminhoReto = 0;
      this.veu.grupo.visible = false;
    }
    const alvo = new THREE.Vector2(this.camera.estado.x, this.camera.estado.y);
    // em escala continental o relevo é realçado para destacar as cordilheiras
    const D = this.camera.estado.d;
    const fatorEscala = 1 + 1.4 * THREE.MathUtils.smoothstep(D, 350, 3500);
    const exag = Math.round(this.exageroUsuario * fatorEscala * 10) / 10;
    for (const u of [this.A.uniformes, this.B.uniformes, this.veuUniformes]) u.uExag.value = exag;
    const altCam = Math.max(1, cam.position.z);
    for (const lado of [this.A, this.B]) {
      if (lado === this.B && !this.comparando) continue;
      aplicarIluminacao(lado.uniformes, lado.ceu, { t: lado.t, hora: this.hora, alvo, tempestade: this.tempestade, relampago: this.relampago, veu: lado === this.A ? this.caminhoReto : 0 });
      lado.uniformes.uTime.value = agora;
      lado.uniformes.uFogDensity.value *= 260 / (260 + altCam);
      lado.ceu.uTime.value = agora;
      const gd = new THREE.Vector3(EZELLOHAR.x - cam.position.x, EZELLOHAR.y - cam.position.y, 0);
      if (regimeDe(lado.t) === 'lampadas') gd.set(3450 - cam.position.x, -150 - cam.position.y, 0);
      if (this.caminhoReto > 0.01) gd.set(-3600 - cam.position.x, -120 - cam.position.y, 0);
      lado.ceu.uGlowDir.value.copy(gd.normalize());
      // curvatura do mundo no Caminho Reto
      const k = this.caminhoReto;
      lado.uniformes.uCurv.value.set(-2440, -560, lado === this.A ? (k * k) / 1900 : 0);
    }
    // Aman velada
    if (this.veu.grupo.visible) {
      const u = this.veuUniformes;
      aplicarIluminacao(u, this.veuCeu, { t: this.tVeu, hora: 0, alvo, tempestade: 0, relampago: 0, veu: 1 });
      u.uVeil.value = Math.min(1, this.caminhoReto * 1.4);
      u.uFogColor.value.setRGB(0.62, 0.58, 0.5);
      u.uFogDensity.value = 0.00012;
      this.veu.atualizar(cam, 0);
      // a estrada reta: uma faixa de luz que segue em frente enquanto o mundo se curva
      const a = new THREE.Vector3(-2440, -560, 0.25),
        b = new THREE.Vector3(-3440, -120, 0.25);
      const meio = a.clone().add(b).multiplyScalar(0.5);
      const len = a.distanceTo(b);
      this.estrada.position.copy(meio);
      this.estrada.scale.set(len, 6, 1);
      this.estrada.rotation.set(0, 0, Math.atan2(b.y - a.y, b.x - a.x));
      (this.estrada.material as THREE.MeshBasicMaterial).opacity = 0.55 * this.caminhoReto;
      this.estrada.visible = this.caminhoReto > 0.02;
    } else this.estrada.visible = false;

    // brilhos das fontes de luz anteriores ao Sol
    {
      const reg = regimeDe(this.A.t);
      const ex = this.A.uniformes.uExag.value;
      const dist = (x: number, y: number, z: number) => cam.position.distanceTo(new THREE.Vector3(x, y, z));
      const { illuin, ormal, telperion, laurelin } = this.brilhos;
      illuin.visible = ormal.visible = reg === 'lampadas';
      if (illuin.visible) {
        for (const [s, x, y] of [[illuin, 3450, 1250], [ormal, 3450, -1550]] as [THREE.Sprite, number, number][]) {
          const z = 6 * ex + 2;
          s.position.set(x, y, z);
          const k = Math.max(90, dist(x, y, z) * 0.06);
          s.scale.set(k, k, 1);
        }
      }
      const arv = reg === 'arvores' ? luzDasArvores(this.hora) : null;
      telperion.visible = laurelin.visible = !!arv;
      if (arv) {
        const z = 0.5 * ex + 0.6;
        const k = Math.max(14, dist(-3960, -150, z) * 0.05);
        telperion.position.set(-3961.5, -149, z);
        laurelin.position.set(-3958.5, -151, z);
        telperion.scale.set(k * (0.4 + arv.telperion), k * (0.4 + arv.telperion), 1);
        laurelin.scale.set(k * (0.4 + arv.laurelin), k * (0.4 + arv.laurelin), 1);
        (telperion.material as THREE.SpriteMaterial).opacity = 0.15 + 0.85 * arv.telperion;
        (laurelin.material as THREE.SpriteMaterial).opacity = 0.15 + 0.85 * arv.laurelin;
      }
    }
    // terreno
    const bias = window.innerWidth < 700 ? 0.8 : 1;
    this.A.sistema.bias = this.B.sistema.bias = bias;
    this.A.sistema.atualizar(cam, this.camera.zAlvo);
    if (this.comparando) this.B.sistema.atualizar(cam, this.camera.zAlvo);
    this.sobreposicao.costas = this.modeloDe(this.A)?.costas ?? [];
    this.sobreposicao.sigCostas = this.A.assinaturaModelo;
    this.sobreposicao.atualizar(this.A.sistema.visiveis, this.A.t, (tile, tex) => this.A.sistema.definirOverlay(tile, tex));
    if (this.comparando) {
      this.sobreposicaoB.costas = this.modeloDe(this.B)?.costas ?? [];
      this.sobreposicaoB.sigCostas = this.B.assinaturaModelo;
      this.sobreposicaoB.atualizar(this.B.sistema.visiveis, this.B.t, (tile, tex) => this.B.sistema.definirOverlay(tile, tex), 4);
    }

    // mudanças de estado dos lugares (animação de queda/fundação)
    for (const l of lugares) {
      const st = statusLugar(l, this.A.t)[0];
      const prev = this.ultimoStatus.get(l.id);
      if (prev && prev !== st) this.emitir('status:' + l.id + ':' + prev + ':' + st);
      this.ultimoStatus.set(l.id, st);
    }

    // render
    const r = this.renderer;
    const W = this.host.clientWidth,
      H = this.host.clientHeight;
    r.setScissorTest(false);
    r.clear();
    const desenhar = (lado: Lado, x: number, y: number, w: number, h: number) => {
      r.setViewport(x, y, w, h);
      r.setScissor(x, y, w, h);
      r.setScissorTest(true);
      this.ceuUniformes(lado);
      this.ceu.atualizar(cam);
      r.render(this.ceu.cena, this.ceu.camera);
      this.A.sistema.grupo.visible = lado === this.A;
      this.B.sistema.grupo.visible = lado === this.B;
      r.clearDepth();
      r.render(this.cena, cam);
    };
    const opRot = {
      mostrarVestigios: this.camadas.vestigios,
      mostrarMarcos: this.camadas.marcos,
      mostrarNomes: this.camadas.nomes,
      selecionado: this.selecao,
      veu: this.caminhoReto > 0.4,
    };
    const sig = (l: Lado) => l.sistema.assinatura + ':' + l.uniformes.uExag.value;
    if (!this.comparando) {
      desenhar(this.A, 0, 0, W, H);
      this.A.rotulos.atualizar(cam, W, H, 0, this.A.t, this.camera.estado.d, (x, y) => this.alturaEm(x, y, this.A), sig(this.A), opRot, this.realce);
    } else if (this.divisaoVertical()) {
      const w2 = Math.floor(W / 2);
      desenhar(this.A, 0, 0, w2, H);
      desenhar(this.B, w2, 0, W - w2, H);
      this.A.rotulos.atualizar(cam, w2, H, 0, this.A.t, this.camera.estado.d, (x, y) => this.alturaEm(x, y, this.A), sig(this.A), opRot, this.realce);
      this.B.rotulos.atualizar(cam, W - w2, H, w2, this.B.t, this.camera.estado.d, (x, y) => this.alturaEm(x, y, this.B), sig(this.B), opRot, this.realce);
    } else {
      const h2 = Math.floor(H / 2);
      desenhar(this.A, 0, h2, W, H - h2);
      desenhar(this.B, 0, 0, W, h2);
      this.A.rotulos.atualizar(cam, W, H - h2, 0, this.A.t, this.camera.estado.d, (x, y) => this.alturaEm(x, y, this.A), sig(this.A), opRot, this.realce);
      this.B.rotulos.raiz.style.transform = `translateY(${H - h2}px)`;
      this.B.rotulos.atualizar(cam, W, h2, 0, this.B.t, this.camera.estado.d, (x, y) => this.alturaEm(x, y, this.B), sig(this.B), opRot, this.realce);
    }
    if (!this.comparando || this.divisaoVertical()) this.B.rotulos.raiz.style.transform = '';
    r.setScissorTest(false);
    this.A.sistema.grupo.visible = true;
    this.B.sistema.grupo.visible = this.comparando;
    this.emitir('quadro');
  }

  private ceuUniformes(lado: Lado) {
    const u = (this.ceu as unknown as { mat: THREE.ShaderMaterial }).mat.uniforms;
    for (const k of Object.keys(lado.ceu) as (keyof UniformesCeu)[]) u[k].value = lado.ceu[k].value;
  }

  get carregando() {
    return this.A.sistema.carregando || this.pendenteTerreno;
  }

  faseArvores() {
    return luzDasArvores(this.hora);
  }

  eraAtual() {
    return tempo.eraDe(this.t);
  }

  eras() {
    return eras;
  }

  lugar(id: string) {
    return lugarPorId.get(id);
  }
  reino(id: string) {
    return reinoPorId.get(id);
  }
}
