import { describe, expect, it } from 'vitest';
import { lugarPorId, reinoPorId, tempo } from '../src/core/data';
import { governoEm, senhoriosDoLugar } from '../src/core/linhagens';
import type { App } from '../src/app';
import { fichaLugar, fichaReino } from '../src/ui/fichas';

const em = (ref: string) => tempo.cursor(ref);
/** Governantes atuais de uma cidade, na ordem exibida na ficha. */
const governantes = (lugarId: string, ref: string) =>
  senhoriosDoLugar(lugarId, lugarPorId.get(lugarId)!.reino, em(ref)).map((s) => governoEm(s, em(ref))?.quem ?? governoEm(s, em(ref))?.rotulo ?? null);

describe('quem governa cada cidade', () => {
  it.each([
    ['gondolin', 'PE:400', [['turgon']]],
    ['menegroth', 'PE:400', [['thingol']]],
    ['menegroth', 'PE:504', [['dior']]],
    ['nargothrond', 'PE:470', [['orodreth']]],
    ['tirion', '#aa-silmarils', [['finwe']]],
    ['tirion', 'PE:400', [['finarfin']]],
    ['edoras', 'TE:3018', [['theoden']]],
    ['edoras', 'TE:3019', [['eomer']]],
    ['minas-anor', 'TE:3018', [['denethor']]],
    ['minas-ithil', 'TE:3018', [['rei-bruxo']]],
    ['minas-ithil', 'TE:1000', ['Reis de Gondor, de Cemendur a Ciryandil']],
    ['isengard', 'TE:3018', [['saruman']]],
    ['mithlond', 'SE:100', [['cirdan'], ['gilgalad']]],
    ['carn-dum', 'TE:1500', [['rei-bruxo']]],
  ])('%s em %s', (lugar, ref, esperado) => {
    expect(governantes(lugar, ref)).toEqual(esperado);
  });

  it('a ficha da cidade e a do reino levam à árvore do governante', () => {
    const app = { t: em('PE:400') } as App;
    expect(fichaLugar(app, lugarPorId.get('gondolin')!)).toContain('data-sel="linhagem:turgon"');
    expect(fichaReino({ t: em('TE:3018') } as App, reinoPorId.get('rohan')!)).toContain('data-sel="linhagem:theoden"');
    expect(fichaReino({ t: em('TE:3018') } as App, reinoPorId.get('mordor')!)).toContain('data-sel="linhagem:sauron"');
  });
});
