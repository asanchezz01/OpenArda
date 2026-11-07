import { describe, expect, it } from 'vitest';
import retratos from '../data/retratos.json';
import { tempo } from '../src/core/data';
import { governoEm, pessoaPorId, pessoas, sequitoDe, senhorioDoReino } from '../src/core/linhagens';
import type { App } from '../src/app';
import { blocoGovernoReino, fichaLinhagem, fichaSenhorios, fichaValar } from '../src/ui/linhagens';

const em = (ref: string) => tempo.cursor(ref);

describe('Valar e Maiar', () => {
  it('Valinor tem Manwë como governante clicável, com a nota de Ilmarin', () => {
    const s = senhorioDoReino('aman-valinor')!;
    const g = governoEm(s, em('AA:#aa-escurecimento'))!;
    expect(g.quem).toEqual(['manwe']);
    expect(g.nota).toContain('Ilmarin');
  });

  it('a ficha do reino e o painel de governantes levam a Manwë e aos Valar', () => {
    expect(blocoGovernoReino({ t: em('AA:#aa-escurecimento') } as App, 'aman-valinor')).toContain('data-sel="linhagem:manwe"');
    expect(fichaSenhorios({ t: em('AA:#aa-escurecimento') } as App)).toContain('data-sel="valar"');
  });

  it('a galeria reúne os retratos dos Valar e dos Maias', () => {
    const html = fichaValar({ t: em('AA:#aa-escurecimento') } as App);
    for (const r of retratos.filter((x) => x.imagem)) {
      const p = pessoaPorId.get(r.id);
      if (p?.povo !== 'vala' && p?.povo !== 'maia') continue;
      expect(html, `${p.nome} na galeria`).toContain(`data-acao="retrato" data-id="${r.id}"`);
    }
    expect(html).toContain('data-sel="linhagem:manwe"');
    expect(html).toContain('data-sel="linhagem:varda"');
    expect(html).toContain('data-sel="linhagem:eonwe"');
  });

  it('casa, irmãos e séquito seguem a Valaquenta', () => {
    expect(pessoaPorId.get('manwe')?.casa).toEqual(['varda']);
    expect(pessoaPorId.get('varda')?.casa).toEqual(['manwe']);
    expect(pessoaPorId.get('nienna')?.irmaos).toEqual(['mandos', 'irmo']);
    expect(pessoaPorId.get('orome')?.irmaos).toEqual(['nessa']);
    expect(pessoaPorId.get('osse')?.servo_de).toEqual(['ulmo']);
    expect(sequitoDe('manwe').map((p) => p.id)).toEqual(['eonwe']);
  });

  it('as fichas do Manwë e do Eönwë mostram os laços', () => {
    const app = { t: em('AA:#aa-escurecimento') } as App;
    const manwe = fichaLinhagem(app, 'manwe');
    expect(manwe).toContain('><h3>Casa</h3>');
    expect(manwe).toContain('data-sel="linhagem:varda"');
    expect(manwe).toContain('><h3>Séquito</h3>');
    expect(manwe).toContain('data-sel="linhagem:eonwe"');
    const eonwe = fichaLinhagem(app, 'eonwe');
    expect(eonwe).toContain('><h3>A serviço de</h3>');
    expect(eonwe).toContain('data-sel="linhagem:manwe"');
  });
});

describe('todos os Valar têm ficha', () => {
  it.each(pessoas.filter((p) => p.povo === 'vala').map((p) => p.id))('a ficha de %s abre e lista fontes', (id) => {
    const p = pessoaPorId.get(id)!;
    const html = fichaLinhagem({ t: em('AA:#aa-escurecimento') } as App, id);
    expect(html).toContain(`<h2>${p.nome}</h2>`);
    expect(html).toContain('<h3>Fontes</h3>');
    expect(html).toContain('data-acao="linhagens"');
  });
});
