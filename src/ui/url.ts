// Links compartilháveis: restauram local, período, enquadramento e seleção.

import type { App } from '../app';
import { tempo } from '../core/data';
import type { Vista } from '../core/types';

export interface EstadoLink {
  vista?: Vista;
  t?: number;
  sel?: string;
  travado?: boolean;
  comparar?: [number, number];
  hora?: number;
  jornada?: [string, number];
}

export function lerLink(hash = location.hash): EstadoLink {
  const out: EstadoLink = {};
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const v = p.get('v');
  if (v) {
    const [x, y, d, rumo, inclinacao] = v.split(',').map(Number);
    if ([x, y, d].every(Number.isFinite)) out.vista = { x, y, d, rumo: rumo || 0, inclinacao: inclinacao || 0 };
  }
  const t = p.get('t');
  if (t) {
    const tt = tempo.desserializar(t);
    if (tt != null) out.t = tt;
  }
  const s = p.get('s');
  if (s) out.sel = s;
  if (p.get('f') === '1') out.travado = true;
  const c = p.get('c');
  if (c) {
    const [a, b] = c.split('|').map((x) => tempo.desserializar(x));
    if (a != null && b != null) out.comparar = [a, b];
  }
  const h = p.get('h');
  if (h && Number.isFinite(Number(h))) out.hora = Number(h);
  const j = p.get('j');
  if (j) {
    const [id, k] = j.split('.');
    out.jornada = [id, Number(k) || 0];
  }
  return out;
}

export function montarLink(app: App): string {
  const s = app.camera.estado;
  const p = new URLSearchParams();
  p.set('v', [s.x, s.y, s.d, s.rumo, s.inclinacao].map((n) => (Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(2))).join(','));
  if (app.comparando) p.set('c', `${tempo.serializar(app.A.t)}|${tempo.serializar(app.B.t)}`);
  else p.set('t', tempo.serializar(app.t));
  if (app.selecao) p.set('s', app.selecao);
  if (app.travado) p.set('f', '1');
  if (app.horaAuto === false) p.set('h', app.hora.toFixed(1));
  if (app.jornada) p.set('j', `${app.jornada.j.id}.${app.jornada.passo}`);
  return `${location.origin}${location.pathname}#${p.toString().replace(/%2C/g, ',').replace(/%7C/g, '|').replace(/%3A/g, ':')}`;
}
