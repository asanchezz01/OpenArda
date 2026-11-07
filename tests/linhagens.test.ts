import { describe, expect, it } from 'vitest';
import { tempo } from '../src/core/data';
import { governoEm, irmaosDe, reinaEm, retratoDe, senhorioDoReino, senhorios, unioesDe } from '../src/core/linhagens';
import type { App } from '../src/app';
import { fichaLinhagem } from '../src/ui/linhagens';

const em = (ref: string) => tempo.cursor(ref);
const governante = (id: string, ref: string) => governoEm(senhorios.find((s) => s.id === id)!, em(ref))?.quem;

describe('linhagens', () => {
  it.each(['finwe', 'miriel', 'indis', 'mahtan', 'celebrimbor'])('exibe o retrato de %s na ficha e no cartão da árvore', (id) => {
    const retrato = retratoDe(id)!;
    const html = fichaLinhagem({ t: em('PE:400') } as App, id);
    expect(html).toContain(`src="${retrato.imagem}" alt="${retrato.alt}" width="96" height="96"`);
    expect(html).toContain(`src="${retrato.imagem}" alt="" width="36" height="36" loading="lazy"`);
  });

  it('Fëanor tem sete filhos com Nerdanel e meios-irmãos por Indis', () => {
    const u = unioesDe('feanor');
    expect(u).toHaveLength(1);
    expect(u[0][0]).toBe('nerdanel');
    expect(u[0][1]).toHaveLength(7);
    const meios = irmaosDe('feanor').filter((x) => x.meio).map((x) => x.p.id);
    expect(meios).toEqual(['fingolfin', 'finarfin']);
  });

  it('Finwë tem filhos de duas uniões', () => {
    expect(unioesDe('finwe').map(([o]) => o)).toEqual(['miriel', 'indis']);
  });

  it('o governante muda com o período', () => {
    expect(governante('alto-rei-noldor', '#aa-silmarils')).toEqual(['finwe']);
    expect(governante('alto-rei-noldor', '#aa-fratricidio')).toEqual(['feanor']);
    expect(governante('alto-rei-noldor', 'PE:400')).toEqual(['fingolfin']);
    expect(governante('alto-rei-noldor', 'PE:490')).toEqual(['turgon']);
    expect(governante('nargothrond', 'PE:464')).toEqual(['finrod']);
    expect(governante('nargothrond', 'PE:465')).toEqual(['orodreth']);
    expect(governante('nargothrond', 'PE:495')).toBeUndefined();
    expect(governante('gondor', 'TE:3018')).toBeUndefined();
    expect(governante('gondor', 'TE:3019')).toEqual(['aragorn']);
  });

  it('a coroa aparece só durante o reinado', () => {
    expect(reinaEm('maedhros', em('PE:400')).map((x) => x.s.id)).toEqual(['marcha-maedhros']);
    expect(reinaEm('maedhros', em('PE:480'))).toHaveLength(0);
  });

  it('reinos do mapa encontram seu senhorio', () => {
    expect(senhorioDoReino('doriath')?.governos[1].quem).toEqual(['dior']);
  });
});
