import { describe, expect, it } from 'vitest';
import { tempo } from '../src/core/data';

describe('linha do tempo', () => {
  it('avança de 3318 para 3319 da Segunda Era', () => {
    const t = tempo.tAno('SE', 3318);
    expect(tempo.anoDe(tempo.passoAno(t, 1))).toBe(3319);
    expect(tempo.rotulo(tempo.passoAno(t, 1)).principal).toBe('3319 S.E.');
  });

  it('atravessa a fronteira entre eras datadas', () => {
    const fim = tempo.tAno('SE', 3441);
    const prox = tempo.passoAno(fim, 1);
    expect(tempo.eraDe(prox).id).toBe('TE');
    expect(tempo.anoDe(prox)).toBe(1);
    expect(tempo.eraDe(tempo.passoAno(prox, -1)).id).toBe('SE');
  });

  it('não inventa anos nas eras sem datas', () => {
    const t = tempo.cursor('#aa-silmarils');
    expect(tempo.anoDe(t)).toBeNull();
    const r = tempo.rotulo(t);
    expect(r.incerto).toBe(true);
    expect(r.secundario).toContain('Silmarils');
    // nas eras sem datas, o passo "de ano" anda pela sequência dos acontecimentos
    expect(tempo.eventoAtual(tempo.passoAno(t, 1))?.id).toBe('aa-formenos');
  });

  it('ordena acontecimentos e fronteiras de validade', () => {
    expect(tempo.fronteira('AA:#aa-escurecimento', 0)).toBeLessThan(tempo.fronteira('PE:1', 0));
    expect(tempo.fronteira('SE:3319', 0)).toBeLessThan(tempo.tAno('SE', 3319));
    expect(tempo.fronteira('SE:3319', 0)).toBeGreaterThan(tempo.tAno('SE', 3318));
    expect(tempo.valido(tempo.tAno('SE', 3318), 'SE:1', 'SE:3319')).toBe(true);
    expect(tempo.valido(tempo.tAno('SE', 3319), 'SE:1', 'SE:3319')).toBe(false);
  });

  it('serializa e restaura o tempo para os links', () => {
    for (const t of [tempo.tAno('SE', 3318), tempo.cursor('#aa-tirion'), tempo.tAno('QE', 6)]) {
      expect(tempo.desserializar(tempo.serializar(t))).toBeCloseTo(t, 9);
    }
    expect(tempo.desserializar('XX.12')).toBeNull();
  });

  it('salta entre acontecimentos nos dois sentidos', () => {
    const t = tempo.tAno('PE', 500);
    const prox = tempo.passoEvento(t, 1);
    const ant = tempo.passoEvento(prox, -1);
    expect(prox).toBeGreaterThan(t);
    expect(ant).toBeLessThan(prox);
  });
});
