import { describe, expect, it, vi } from 'vitest';
import { Interface } from '../src/ui/interface';
import { htmlRetrato } from '../src/ui/linhagens';

function visualizador(aberto = false) {
  const dialog = { open: aberto, innerHTML: '', showModal: vi.fn() };
  const fecharArvoreTela = vi.fn();
  const ui = Object.assign(Object.create(Interface.prototype), { retratoTela: dialog, arvoreTelaId: 'feanor', fecharArvoreTela }) as {
    abrirRetrato(id: string): void;
    teclado(e: KeyboardEvent): void;
  };
  return { ui, dialog, fecharArvoreTela };
}

describe('retratos ampliados', () => {
  it('mostra o retrato inteiro em um quadro, com nome e fechamento acessível', () => {
    const html = htmlRetrato('feanor');
    expect(html).toContain('class="retrato-moldura"');
    expect(html).toContain('width="512" height="512"');
    expect(html).toContain('id="retrato-nome">Fëanor</h2>');
    expect(html).toContain('aria-label="Fechar retrato (Esc)" autofocus');
    expect(htmlRetrato('desconhecido')).toBe('');
    expect(htmlRetrato('beren')).toBe('');
  });

  it('abre o dialog nativo somente para um retrato disponível', () => {
    const { ui, dialog } = visualizador();
    ui.abrirRetrato('beren');
    expect(dialog.showModal).not.toHaveBeenCalled();
    ui.abrirRetrato('feanor');
    expect(dialog.showModal).toHaveBeenCalledOnce();
    expect(dialog.innerHTML).toContain('id="retrato-nome">Fëanor</h2>');
    dialog.open = true;
    ui.abrirRetrato('finwe');
    expect(dialog.showModal).toHaveBeenCalledOnce();
  });

  it('deixa Esc fechar o retrato nativo antes da árvore que está atrás', () => {
    const { ui, dialog, fecharArvoreTela } = visualizador(true);
    const evento = { key: 'Escape', target: {}, preventDefault: vi.fn() } as unknown as KeyboardEvent;
    ui.teclado(evento);
    expect(evento.preventDefault).not.toHaveBeenCalled();
    expect(fecharArvoreTela).not.toHaveBeenCalled();
    dialog.open = false;
    ui.teclado(evento);
    expect(fecharArvoreTela).toHaveBeenCalledOnce();
  });
});
