import type { Certeza, FonteRef } from '../core/types';
import { fontePorId } from '../core/data';

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .trim();
}

export const NOME_CERT: Record<Certeza, string> = {
  descrito: 'Descrito por Tolkien',
  inferido: 'Inferido de referências',
  artistico: 'Reconstrução artística',
};

export function seloCert(c: Certeza | undefined, curto = false): string {
  const k = c ?? 'inferido';
  const txt = curto ? { descrito: 'descrito', inferido: 'inferido', artistico: 'artístico' }[k] : NOME_CERT[k];
  return `<span class="selo cert-${k}" title="${esc(NOME_CERT[k])}">${esc(txt)}</span>`;
}

export function refFonte(r: FonteRef): string {
  const f = fontePorId.get(r.fonte);
  const titulo = f ? f.titulo : r.fonte;
  const lac = f?.acesso === 'lacuna' ? ' <span class="selo lacuna" title="Fonte não consultada diretamente nesta versão">lacuna</span>' : '';
  return `<button type="button" class="ref" data-acao="fonte" data-id="${esc(r.fonte)}"><cite>${esc(titulo)}</cite>${r.local ? `, ${esc(r.local)}` : ''}</button>${lac}${r.nota ? ` <span class="nota">${esc(r.nota)}</span>` : ''}`;
}

export function listaFontes(rs: FonteRef[] | undefined): string {
  if (!rs || !rs.length) return '<p class="nota">Sem fonte registrada para este item.</p>';
  return `<ul class="fontes">${rs.map((r) => `<li>${refFonte(r)}</li>`).join('')}</ul>`;
}

export function h(tag: string, attrs: Record<string, string> = {}, html = ''): HTMLElement {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  e.innerHTML = html;
  return e;
}

export function guardar(chave: string, valor: string) {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    /* armazenamento indisponível */
  }
}
export function ler(chave: string): string | null {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}
