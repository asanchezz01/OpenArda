import { describe, expect, it } from 'vitest';
import { lugarPorId, reinoPorId, tempo } from '../src/core/data';
import { fotos, fotosDoLugar, fotosDoReino, fotosEm, momento, validade } from '../src/core/fotografias';
import type { App } from '../src/app';
import { fichaLugar, fichaReino } from '../src/ui/fichas';
import { htmlPainelFotos, htmlVisualizador } from '../src/ui/fotografias';

const em = (ref: string) => tempo.cursor(ref);

describe('fotografias dos lugares', () => {
  // a existência dos arquivos é conferida por scripts/validate-data.mjs
  it('cada foto aprovada vale no momento que retrata', () => {
    expect(fotos.length).toBe(8);
    for (const f of fotos) {
      const [a, b] = validade(f);
      expect(momento(f)).toBeGreaterThanOrEqual(a);
      expect(momento(f)).toBeLessThan(b);
    }
  });

  it('mostra a foto da época ou avisa que é de outra época', () => {
    expect(fotosDoLugar('gondolin', em('PE:400'))).toMatchObject({ destaque: { id: 'gondolin-pe400' }, outraEpoca: false });
    // depois da queda, a única foto de Gondolin é a da cidade íntegra
    expect(fotosDoLugar('gondolin', em('PE:520'))).toMatchObject({ destaque: { id: 'gondolin-pe400' }, outraEpoca: true });
    // a luz das Árvores acaba no Escurecimento
    expect(fotosDoLugar('tirion', em('#aa-silmarils')).outraEpoca).toBe(false);
    expect(fotosDoLugar('tirion', em('PE:100')).outraEpoca).toBe(true);
    // Edoras só vale depois do Longo Inverno
    expect(fotosDoLugar('edoras', em('TE:2758')).outraEpoca).toBe(true);
    expect(fotosDoLugar('edoras', em('TE:3018')).outraEpoca).toBe(false);
    expect(fotosDoLugar('valmar', em('TE:3018')).destaque).toBeUndefined();
  });

  it('o reino usa a foto da capital vigente', () => {
    expect(fotosDoReino('rohan', em('TE:3018')).destaque?.id).toBe('edoras-te3018');
    expect(fotosDoReino('gondor', em('TE:3018')).destaque?.id).toBe('minas-anor-te3018');
    expect(fotosDoReino('angband', em('PE:400')).destaque).toBeUndefined();
  });

  it('o painel lista só os lugares fotografados que existem na época', () => {
    expect(fotosEm(em('TE:3018')).map((f) => f.lugar).sort()).toEqual(['argonath', 'edoras', 'imladris', 'khazad-dum', 'lothlorien', 'minas-anor']);
    expect(fotosEm(null)).toHaveLength(8);
    const vazio = htmlPainelFotos({ t: em('AL:inicio') } as App, false);
    expect(vazio).toContain('Nenhum lugar fotografado existe');
    expect(htmlPainelFotos({ t: em('AL:inicio') } as App, true)).toContain('data-id="tirion-aa"');
  });

  it('fichas e visualizador mostram a foto, o selo de IA e o que é descrito', () => {
    const app = { t: em('TE:3018') } as App;
    const ficha = fichaLugar(app, lugarPorId.get('minas-anor')!);
    expect(ficha).toContain('src="fotografias/minas-anor-te3018.webp"');
    expect(ficha).toContain('Imagem gerada por IA');
    expect(fichaReino(app, reinoPorId.get('rohan')!)).toContain('fotografias/edoras-te3018.webp');
    const v = htmlVisualizador(app, 'gondolin-pe400');
    expect(v).toContain('Descrito por Tolkien');
    expect(v).toContain('data-acao="tempo"'); // em 3018 T.E. a foto é de outra época
    expect(htmlVisualizador({ t: em('PE:400') } as App, 'gondolin-pe400')).not.toContain('data-acao="tempo"');
  });
});
