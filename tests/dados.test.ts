import { describe, expect, it } from 'vitest';
import { estadoTerreno, faseAtual, lugarPorId, statusLugar, tempo, territoriosAtivos } from '../src/core/data';
import { ModeloTerreno, novaAmostra } from '../src/terrain/model';
import { terreno } from '../src/core/data';
import { primeiroMomento, ultimoMomento } from '../src/ui/fichas';

const t3318 = tempo.tAno('SE', 3318);
const t3319 = tempo.tAno('SE', 3319);

describe('estados por período', () => {
  it('Númenor existe em 3318 e está submersa em 3319', () => {
    const n = lugarPorId.get('numenor')!;
    expect(statusLugar(n, t3318)[0]).toBe('ativo');
    expect(statusLugar(n, t3319)[0]).toBe('submerso');
    expect(statusLugar(n, tempo.cursor('#aa-silmarils'))[0]).toBe('futuro');
  });

  it('a visita a um lugar desaparecido vai ao seu último período', () => {
    expect(tempo.anoDe(ultimoMomento(lugarPorId.get('numenor')!)!)).toBe(3318);
    expect(tempo.anoDe(ultimoMomento(lugarPorId.get('gondolin')!)!)).toBe(509);
    expect(tempo.anoDe(primeiroMomento(lugarPorId.get('numenor')!)!)).toBe(1);
  });

  it('Gondolin aparece como cidade ativa, destruída e submersa', () => {
    const g = lugarPorId.get('gondolin')!;
    expect(statusLugar(g, tempo.tAno('PE', 300))[0]).toBe('ativo');
    expect(statusLugar(g, tempo.tAno('PE', 510))[0]).toBe('destruido');
    expect(statusLugar(g, tempo.tAno('TE', 1000))[0]).toBe('submerso');
  });

  it('lugares que somem nas catástrofes dizem o que aconteceu', () => {
    const se = tempo.tAno('SE', 10);
    expect(statusLugar(lugarPorId.get('hithlum')!, se)[0]).toBe('submerso');
    expect(faseAtual(lugarPorId.get('himring')!, se)?.evento).toBe('pe-ruina-beleriand');
    expect(statusLugar(lugarPorId.get('alqualonde')!, t3319)[0]).toBe('removido');
    expect(statusLugar(lugarPorId.get('romenna')!, t3319)[0]).toBe('submerso');
    expect(faseAtual(lugarPorId.get('eldalonde')!, t3319)?.evento).toBe('se-queda');
  });

  it('Gondor tem território a partir de 3320 S.E.', () => {
    const ids = (t: number) => territoriosAtivos(t).map((a) => a.reino.id);
    expect(ids(t3319)).not.toContain('gondor');
    expect(ids(tempo.tAno('SE', 3320))).toContain('gondor');
    expect(ids(tempo.tAno('TE', 2510))).toContain('rohan');
    expect(ids(tempo.tAno('TE', 2509))).not.toContain('rohan');
  });

  it('o relevo muda de assinatura na Queda e não muda entre anos sem transformação', () => {
    expect(estadoTerreno(t3318).assinatura).not.toBe(estadoTerreno(t3319).assinatura);
    expect(estadoTerreno(tempo.tAno('SE', 3000)).assinatura).toBe(estadoTerreno(t3318).assinatura);
  });
});

describe('modelo de terreno', () => {
  const amostra = (t: number, x: number, y: number) => {
    const est = estadoTerreno(t);
    const m = new ModeloTerreno(est.feicoes, terreno.cadeias, terreno.limites);
    return m.amostrar(x, y, novaAmostra());
  };

  it('o centro de Númenor é terra antes da Queda e mar depois', () => {
    expect(amostra(t3318, -2250, -700).h).toBeGreaterThan(1);
    expect(amostra(t3319, -2250, -700).h).toBeLessThan(0);
  });

  it('Beleriand é terra na Primeira Era e Himling é ilha na Segunda', () => {
    const pe = tempo.tAno('PE', 400);
    expect(amostra(pe, -300, -250).h).toBeGreaterThan(0); // Doriath
    expect(amostra(tempo.tAno('SE', 10), -300, -250).h).toBeLessThan(0);
    expect(amostra(tempo.tAno('SE', 10), 0, 0).h).toBeGreaterThan(0); // Himling
  });

  it('a Calacirya é uma passagem baixa entre picos altos das Pelóri', () => {
    const t = tempo.cursor('#aa-silmarils');
    const passo = amostra(t, -3590, -121).h;
    const norte = amostra(t, -3570, 150).h;
    expect(passo).toBeLessThan(1.5);
    expect(norte).toBeGreaterThan(3);
  });
}, 60000);
