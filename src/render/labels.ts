// Nomes discretos sobre o mapa, com prioridade por escala e sem sobreposição.

import * as THREE from 'three';
import type { Lugar, Reino } from '../core/types';
import { lugares, reinos, statusLugar, ativo, terreno } from '../core/data';

const LIMITE_POSTO = [0, 30000, 4200, 1500, 520, 170];
const NOMES_LUGARES = new Set(lugares.map((l) => l.nome.toLowerCase()));

interface Rotulo {
  id: string;
  el: HTMLElement;
  w: number;
  h: number;
  visivel: boolean;
  z?: number;
  zSig?: string;
}

export interface OpcoesRotulos {
  mostrarVestigios: boolean;
  mostrarMarcos: boolean;
  mostrarNomes: boolean;
  selecionado: string | null;
  veu?: boolean;
}

export class Rotulos {
  readonly raiz: HTMLElement;
  private mapa = new Map<string, Rotulo>();
  aoClicar?: (tipo: 'lugar' | 'reino' | 'marco', id: string) => void;
  private v = new THREE.Vector3();

  constructor(pai: HTMLElement) {
    this.raiz = document.createElement('div');
    this.raiz.className = 'rotulos';
    pai.appendChild(this.raiz);
  }

  private obter(id: string, criar: () => HTMLElement): Rotulo {
    let r = this.mapa.get(id);
    if (!r) {
      const el = criar();
      el.style.visibility = 'hidden';
      this.raiz.appendChild(el);
      r = { id, el, w: el.offsetWidth || 80, h: el.offsetHeight || 16, visivel: false };
      this.mapa.set(id, r);
    }
    return r;
  }

  private criarLugar(l: Lugar): HTMLElement {
    const el = document.createElement('button');
    el.type = 'button';
    const ponto = !l.regiao && !['rio', 'montanha', 'mar', 'floresta', 'lago'].includes(l.tipo);
    el.className = `rotulo rotulo-${l.tipo} posto-${l.posto}` + (l.regiao ? ' rotulo-regiao' : '') + (ponto ? ' com-ponto' : '');
    el.innerHTML = `${ponto ? '<span class="ponto"></span>' : ''}<span class="nome">${l.nome}</span><span class="estado"></span>`;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.aoClicar?.('lugar', l.id);
    });
    el.setAttribute('aria-label', l.nome);
    return el;
  }

  private criarReino(r: Reino): HTMLElement {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'rotulo rotulo-reino';
    el.style.setProperty('--cor', r.cor);
    el.innerHTML = `<span class="nome">${r.nome.replace(/ \(.*\)$/, '')}</span>`;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.aoClicar?.('reino', r.id);
    });
    return el;
  }

  atualizar(
    cam: THREE.PerspectiveCamera,
    largura: number,
    altura: number,
    offsetX: number,
    t: number,
    d: number,
    alturaEm: (x: number, y: number) => number,
    sigTerreno: string,
    op: OpcoesRotulos,
    realcar: Set<string>,
  ) {
    const usados: [number, number, number, number][] = [];
    const ocupa = (x: number, y: number, w: number, h: number) => {
      for (const u of usados) if (x < u[2] && x + w > u[0] && y < u[3] && y + h > u[1]) return true;
      return false;
    };
    const candidatos: { r: Rotulo; x: number; y: number; prio: number; classe: string; texto?: string }[] = [];
    const projetar = (rot: Rotulo, x: number, y: number) => {
      if (rot.zSig !== sigTerreno) {
        rot.z = alturaEm(x, y);
        rot.zSig = sigTerreno;
      }
      this.v.set(x, y, rot.z! + 0.02);
      const dist = this.v.distanceTo(cam.position);
      this.v.project(cam);
      if (this.v.z > 1 || this.v.z < -1 || Math.abs(this.v.x) > 1.1 || Math.abs(this.v.y) > 1.1) return null;
      return { sx: (this.v.x * 0.5 + 0.5) * largura + offsetX, sy: (-this.v.y * 0.5 + 0.5) * altura, dist };
    };
    const limiteFog = Math.max(d * 9, 1500);
    if (op.mostrarNomes) {
      for (const l of lugares) {
        let [st] = statusLugar(l, t);
        // no Caminho Reto, Aman aparece como era antes de ser retirada
        if (op.veu && st === 'removido') st = 'ativo';
        const vestigio = st === 'submerso' || st === 'removido' || st === 'ausente';
        if (st === 'futuro') continue;
        if (vestigio && !op.mostrarVestigios && !realcar.has(l.id)) continue;
        if (vestigio && st === 'ausente' && !realcar.has(l.id)) continue;
        if (d > LIMITE_POSTO[l.posto] * (vestigio ? 0.6 : 1) && !realcar.has(l.id)) continue;
        const rot = this.obter('l:' + l.id, () => this.criarLugar(l));
        const p = projetar(rot, l.em[0], l.em[1]);
        if (!p || p.dist > limiteFog) continue;
        let classe = `st-${st}`;
        if (realcar.has(l.id)) classe += ' realce';
        if (op.selecionado === 'lugar:' + l.id) classe += ' selecionado';
        const prio = l.posto * 10 + (vestigio ? 5 : 0) - (realcar.has(l.id) ? 100 : 0) - (op.selecionado === 'lugar:' + l.id ? 200 : 0);
        candidatos.push({ r: rot, x: p.sx, y: p.sy, prio, classe });
      }
      for (const r of reinos) {
        if (!ativo('rei-' + r.id, r.de, r.ate, t)) continue;
        if (!r.territorios.some((terr, i) => ativo(`${r.id}#${i}`, terr.de, terr.ate, t))) continue;
        if (d > 3200 || d < 60) continue;
        if (NOMES_LUGARES.has(r.nome.replace(/ \(.*\)$/, '').toLowerCase())) continue;
        const rot = this.obter('r:' + r.id, () => this.criarReino(r));
        const p = projetar(rot, r.em[0], r.em[1]);
        if (!p || p.dist > limiteFog) continue;
        candidatos.push({ r: rot, x: p.sx, y: p.sy, prio: 15 - (op.selecionado === 'reino:' + r.id ? 200 : 0), classe: op.selecionado === 'reino:' + r.id ? 'selecionado' : '' });
      }
    }
    if (op.mostrarMarcos) {
      for (const m of terreno.marcos) {
        const rot = this.obter('m:' + m.id, () => {
          const el = document.createElement('button');
          el.type = 'button';
          el.className = 'rotulo rotulo-marco com-ponto';
          el.innerHTML = `<span class="ponto"></span><span class="nome">⌖ ${m.nome}</span>`;
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            this.aoClicar?.('marco', m.id);
          });
          return el;
        });
        const p = projetar(rot, m.em[0], m.em[1]);
        if (!p) continue;
        candidatos.push({ r: rot, x: p.sx, y: p.sy, prio: 1, classe: '' });
      }
    }
    candidatos.sort((a, b) => a.prio - b.prio);
    const mostrar = new Set<Rotulo>();
    for (const c of candidatos) {
      const { r } = c;
      if (r.w <= 1) {
        r.w = r.el.offsetWidth || 80;
        r.h = r.el.offsetHeight || 16;
      }
      const temPonto = r.el.classList.contains('com-ponto');
      const x = temPonto ? c.x - 5 : c.x - r.w / 2;
      const y = temPonto ? c.y - r.h / 2 : c.y - r.h / 2;
      if (x < offsetX - r.w || x > offsetX + largura || y < 40 || y > altura - 20) continue;
      if (ocupa(x - 2, y - 1, r.w + 4, r.h + 2) && !c.classe.includes('selecionado')) continue;
      usados.push([x - 2, y - 1, x + r.w + 2, y + r.h + 1]);
      r.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      const cls = r.el.dataset.cls;
      if (cls !== c.classe) {
        if (cls) r.el.classList.remove(...cls.split(' ').filter(Boolean));
        if (c.classe) r.el.classList.add(...c.classe.split(' ').filter(Boolean));
        r.el.dataset.cls = c.classe;
        r.w = r.el.offsetWidth || r.w;
      }
      mostrar.add(r);
      if (usados.length > 90) break;
    }
    for (const r of this.mapa.values()) {
      const v = mostrar.has(r);
      if (v !== r.visivel) {
        r.el.style.visibility = v ? 'visible' : 'hidden';
        r.visivel = v;
      }
    }
  }

  esconderTudo() {
    for (const r of this.mapa.values()) {
      r.el.style.visibility = 'hidden';
      r.visivel = false;
    }
  }
}
