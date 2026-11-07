import { describe, expect, it } from 'vitest';
import retratos from '../data/retratos.json';
import { tempo } from '../src/core/data';
import { governoEm, irmaosDe, reinaEm, retratoDe, senhorioDoReino, senhorios, unioesDe } from '../src/core/linhagens';
import type { App } from '../src/app';
import { fichaLinhagem, htmlArvoreTela } from '../src/ui/linhagens';
import { esc } from '../src/ui/util';

const em = (ref: string) => tempo.cursor(ref);
const governante = (id: string, ref: string) => governoEm(senhorios.find((s) => s.id === id)!, em(ref))?.quem;

describe('linhagens', () => {
  it.each(retratos.filter((r) => r.imagem).map((r) => r.id))('exibe o retrato de %s na ficha e nas árvores', (id) => {
    const retrato = retratoDe(id)!;
    const alt = esc(retrato.alt);
    const app = { t: em('TE:3018') } as App;
    const html = fichaLinhagem(app, id);
    expect(html).toContain(`src="${retrato.imagem}" alt="${alt}" width="96" height="96"`);
    expect(html).toContain(`src="${retrato.imagem}" alt="" width="36" height="36" loading="lazy"`);
    expect(htmlArvoreTela(app, id)).toContain(`src="${retrato.imagem}" alt="${alt}" width="56" height="56"`);
    for (const tela of [html, htmlArvoreTela(app, id)]) {
      expect(tela).toContain(`data-acao="retrato" data-id="${id}"`);
      expect(tela).toContain('aria-haspopup="dialog"');
    }
  });

  it('cobre os 24 retratos integrados da etapa 2, preservando a origem cinematográfica', () => {
    const etapa = ['galadriel', 'celeborn', 'elrond', 'arwen', 'aragorn', 'frodo', 'sam', 'merry', 'pippin', 'gandalf', 'legolas', 'gimli', 'boromir', 'bilbo', 'faramir', 'denethor', 'theoden', 'eomer', 'eowyn', 'saruman', 'gollum', 'sauron', 'rei-bruxo', 'grima'];
    for (const id of etapa) {
      const retrato = retratos.find((r) => r.id === id);
      expect(retrato, id).toBeDefined();
      expect(retrato).toHaveProperty('referencia_cinematografica.ator');
    }
  });

  it('cobre os 20 retratos da etapa 3 e registra sua geração', () => {
    const etapa = ['fingolfin', 'finarfin', 'olwe', 'earwen', 'fingon', 'turgon', 'elenwe', 'aredhel', 'idril', 'eol', 'maeglin', 'finrod', 'orodreth', 'angrod', 'aegnor', 'finduilas', 'anaire', 'glorfindel', 'ecthelion', 'voronwe'];
    for (const id of etapa) expect(retratos.find((r) => r.id === id), id).toHaveProperty('geracao.provedor');
    expect(retratos.find((r) => r.id === 'glorfindel')).toHaveProperty('referencia_cinematografica.ator', 'Jarl Benzon');
  });

  it('liga Anairë aos três filhos de Fingolfin já cadastrados', () => {
    expect(unioesDe('fingolfin')[0][0]).toBe('anaire');
    expect(unioesDe('fingolfin')[0][1].map((p) => p.id)).toEqual(['fingon', 'turgon', 'aredhel']);
  });

  it('liga Boromir e Faramir a Denethor sem confundir as duas Finduilas', () => {
    expect(unioesDe('denethor')[0][1].map((p) => p.id)).toEqual(['boromir', 'faramir']);
    expect(unioesDe('denethor')[0][0]).toBe('');
  });

  it('Fëanor tem sete filhos com Nerdanel e meios-irmãos por Indis', () => {
    const u = unioesDe('feanor');
    expect(u).toHaveLength(1);
    expect(u[0][0]).toBe('nerdanel');
    expect(u[0][1]).toHaveLength(7);
    const meios = irmaosDe('feanor').filter((x) => x.meio).map((x) => x.p.id);
    expect(meios).toEqual(['fingolfin', 'finarfin', 'findis', 'lalwen']);
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
    expect(governante('gondor', 'TE:3018')).toEqual(['denethor']);
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
