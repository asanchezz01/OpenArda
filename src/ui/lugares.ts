import { eras, lugares, statusLugar, tempo } from '../core/data';
import { statusChip } from './fichas';
import { esc, norm } from './util';

const porNome = [...lugares].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

export function montarListaLugares(raiz: HTMLElement, t: number, visitar?: (id: string, t: number) => void) {
  raiz.innerHTML = `
    <form class="lugares-data">
      <label>Era <select name="era">${eras.map((era) => `<option value="${era.id}">${esc(era.nome)}</option>`).join('')}</select></label>
      <div class="lugares-momento"></div>
    </form>
    <label class="lugares-filtro">Filtrar por nome <input type="search" autocomplete="off"></label>
    <p class="lugares-contagem nota" role="status"></p>
    <ul class="lugares-resultados" role="list"></ul>`;

  const formulario = raiz.querySelector<HTMLFormElement>('form')!;
  const eraCampo = formulario.querySelector<HTMLSelectElement>('select')!;
  const momento = raiz.querySelector<HTMLElement>('.lugares-momento')!;
  const filtro = raiz.querySelector<HTMLInputElement>('input[type="search"]')!;
  const contagem = raiz.querySelector<HTMLElement>('.lugares-contagem')!;
  const lista = raiz.querySelector<HTMLUListElement>('.lugares-resultados')!;

  function atualizarLista() {
    const busca = norm(filtro.value);
    const itens = [];
    for (const lugar of porNome) {
      if (busca && ![lugar.nome, ...(lugar.outros_nomes ?? [])].some((nome) => norm(nome).includes(busca))) continue;
      const [estado, nota] = statusLugar(lugar, t);
      if (estado === 'futuro') continue;
      itens.push(`<li><details>
        <summary><strong>${esc(lugar.nome)}</strong> ${statusChip(estado)}</summary>
        ${nota ? `<p class="nota">${esc(nota)}</p>` : ''}
        <p>${esc(lugar.resumo)}</p>
        ${lugar.depois && estado !== 'ativo' && estado !== 'oculto' ? `<p>${esc(lugar.depois)}</p>` : ''}
        ${visitar ? `<button type="button" class="link" data-lugar="${esc(lugar.id)}">Ver no mapa</button>` : ''}
      </details></li>`);
    }
    lista.innerHTML = itens.join('');
    const data = tempo.rotulo(t);
    const total = itens.length === 0 ? 'Nenhum lugar encontrado' : `${itens.length} ${itens.length === 1 ? 'lugar' : 'lugares'}`;
    contagem.textContent = `${total} · ${data.incerto ? data.secundario : data.principal}`;
  }

  function montarMomento() {
    const era = tempo.eraDe(t);
    eraCampo.value = era.id;
    if (era.datada) {
      momento.innerHTML = `<label>Ano (${esc(era.abrev)}) <input name="ano" type="number" required min="${era.inicio}" max="${era.fim}" value="${tempo.anoDe(t)}"></label>
        <button type="submit">Aplicar ano</button>`;
    } else {
      const eventos = tempo.ordenados.filter(({ ev }) => ev.era === era.id);
      momento.innerHTML = `<label>Acontecimento <select name="acontecimento">${eventos.map(({ ev, t }) => `<option value="${t}">${esc(ev.titulo)}</option>`).join('')}</select></label>`;
      const id = tempo.eventoAtual(t)?.id;
      const atual = eventos.find(({ ev }) => ev.id === id);
      if (atual) momento.querySelector('select')!.value = String(atual.t);
    }
    atualizarLista();
  }

  eraCampo.addEventListener('change', () => {
    const era = eras.find(({ id }) => id === eraCampo.value)!;
    t = tempo.cursor(era.cursor_padrao ?? `${era.id}:inicio`);
    montarMomento();
  });
  momento.addEventListener('change', (e) => {
    const campo = e.target;
    if (!(campo instanceof HTMLSelectElement)) return;
    t = Number(campo.value);
    atualizarLista();
  });
  formulario.addEventListener('submit', (e) => {
    e.preventDefault();
    const ano = momento.querySelector('input');
    if (!ano?.checkValidity()) return;
    t = tempo.tAno(eraCampo.value, ano.valueAsNumber);
    atualizarLista();
  });
  filtro.addEventListener('input', atualizarLista);
  lista.addEventListener('click', (e) => {
    const id = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-lugar]')?.dataset.lugar;
    if (id) visitar?.(id, t);
  });

  montarMomento();
}
