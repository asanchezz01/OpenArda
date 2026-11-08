import { describe, expect, it } from 'vitest';
import { lugarPorId, reinoPorId, tempo } from '../src/core/data';
import { fotos, fotosDoLugar, fotosDoReino, fotosEm, momento, validade } from '../src/core/fotografias';
import type { App } from '../src/app';
import { fichaLugar, fichaReino } from '../src/ui/fichas';
import { htmlPainelFotos, htmlVisualizador } from '../src/ui/fotografias';
import { miniatura } from '../src/ui/util';

const em = (ref: string) => tempo.cursor(ref);

describe('fotografias dos lugares', () => {
  // a existência dos arquivos é conferida por scripts/validate-data.mjs
  it('cada foto aprovada vale no momento que retrata', () => {
    expect(fotos.length).toBeGreaterThanOrEqual(8);
    for (const f of fotos) {
      const [a, b] = validade(f);
      expect(momento(f)).toBeGreaterThanOrEqual(a);
      expect(momento(f)).toBeLessThan(b);
    }
  });

  it('mostra a foto da época ou avisa que é de outra época', () => {
    expect(fotosDoLugar('gondolin', em('PE:400'))).toMatchObject({ destaque: { id: 'gondolin-pe400' }, outraEpoca: false });
    // depois da queda vale a foto das ruínas; depois da submersão (587), a mais próxima é a das ruínas
    expect(fotosDoLugar('gondolin', em('PE:520'))).toMatchObject({ destaque: { id: 'gondolin-pe510' }, outraEpoca: false });
    expect(fotosDoLugar('gondolin', em('SE:100'))).toMatchObject({ destaque: { id: 'gondolin-pe510' }, outraEpoca: true });
    // Isengard troca de foto com Saruman e com os Ents
    expect(fotosDoLugar('isengard', em('TE:2700')).destaque?.id).toBe('isengard-te2700');
    expect(fotosDoLugar('isengard', em('TE:3000')).destaque?.id).toBe('isengard-te3018');
    expect(fotosDoLugar('isengard', em('TE:3019')).destaque?.id).toBe('isengard-te3019');
    // a luz das Árvores acaba no Escurecimento
    expect(fotosDoLugar('tirion', em('#aa-silmarils')).outraEpoca).toBe(false);
    expect(fotosDoLugar('tirion', em('PE:100')).outraEpoca).toBe(true);
    // Edoras tem a foto do Longo Inverno (2758) e a de depois dele
    expect(fotosDoLugar('edoras', em('TE:2758')).destaque?.id).toBe('edoras-te2758');
    expect(fotosDoLugar('edoras', em('TE:3018')).destaque?.id).toBe('edoras-te3018');
    expect(fotosDoLugar('edoras', em('TE:2600')).outraEpoca).toBe(true); // antes de 2758 não há foto
    // Aman saiu do mundo em 3319 S.E.: Valmar mostra a foto dos Anos das Árvores como de outra época
    expect(fotosDoLugar('valmar', em('TE:3018'))).toMatchObject({ destaque: { id: 'valmar-aa' }, outraEpoca: true });
    expect(fotosDoLugar('mahanaxar', em('TE:3018')).destaque).toBeUndefined();
  });

  it('o reino usa a foto da capital vigente', () => {
    expect(fotosDoReino('rohan', em('TE:3018')).destaque?.id).toBe('edoras-te3018');
    expect(fotosDoReino('gondor', em('TE:3018')).destaque?.id).toBe('minas-anor-te3018');
    expect(fotosDoReino('angband', em('PE:400')).destaque?.id).toBe('angband-pe400');
    // Minas Ithil vira Minas Morgul em 2002
    expect(fotosDoLugar('minas-ithil', em('TE:2001')).destaque?.id).toBe('minas-ithil-te1000');
    expect(fotosDoLugar('minas-ithil', em('TE:2002')).destaque?.id).toBe('minas-morgul-te3018');
  });

  it('o painel lista só os lugares fotografados que existem na época', () => {
    const lugares3018 = fotosEm(em('TE:3018')).map((f) => f.lugar);
    expect(lugares3018).toEqual(expect.arrayContaining(['argonath', 'edoras', 'imladris', 'khazad-dum', 'lothlorien', 'minas-anor']));
    expect(lugares3018).not.toContain('gondolin');
    expect(lugares3018).not.toContain('tirion');
    expect(fotosEm(null)).toHaveLength(fotos.length);
    // em "todas as épocas" a grade vem agrupada por era
    const todas = htmlPainelFotos({ t: em('TE:3018') } as App, true);
    expect(todas).toContain('<h3 class="fotos-era">Anos das Árvores</h3>');
    expect(todas).toContain('data-id="tirion-aa"');
    expect(htmlPainelFotos({ t: em('TE:3018') } as App, false)).not.toContain('data-id="tirion-aa"');
  });

  it('fichas e visualizador mostram a foto, o selo de IA e o que é descrito', () => {
    const app = { t: em('TE:3018') } as App;
    const ficha = fichaLugar(app, lugarPorId.get('minas-anor')!);
    expect(ficha).toContain(`src="${miniatura('fotografias/minas-anor-te3018.webp')}"`);
    expect(ficha).toContain('Imagem gerada por IA');
    expect(fichaReino(app, reinoPorId.get('rohan')!)).toContain(miniatura('fotografias/edoras-te3018.webp'));
    const v = htmlVisualizador(app, 'gondolin-pe400');
    expect(v).toContain('src="fotografias/gondolin-pe400.webp"');
    expect(v).toContain('Descrito por Tolkien');
    expect(v).toContain('data-acao="tempo"'); // em 3018 T.E. a foto é de outra época
    expect(htmlVisualizador({ t: em('PE:400') } as App, 'gondolin-pe400')).not.toContain('data-acao="tempo"');
  });
});
