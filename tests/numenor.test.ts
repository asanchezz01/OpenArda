import { describe, expect, it } from 'vitest';
import { estradasAtivas, estadoTerreno, lugarPorId, terreno, tempo } from '../src/core/data';
import type { Pt } from '../src/core/types';
import { ModeloTerreno, novaAmostra } from '../src/terrain/model';
import { ROTAS } from '../src/render/overlay';

const antes = estadoTerreno(tempo.tAno('SE', 3318)).feicoes.filter((f) => f.grupo === 'numenor');
const depois = estadoTerreno(tempo.tAno('SE', 3319)).feicoes.filter((f) => f.grupo === 'numenor');
const modelo = new ModeloTerreno(antes, terreno.cadeias, [-2800, -1150, -1700, -250]);
const costa = antes.find((f) => f.id === 'numenor')!.contorno as Pt[];
const amostra = (x: number, y: number) => modelo.amostrar(x, y, novaAmostra());

describe('geografia de Númenor', () => {
  it('a costa não cruza as próprias reentrâncias', () => {
    const lado = (a: Pt, b: Pt, p: Pt) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    for (let i = 0; i < costa.length; i++) {
      const a = costa[i], b = costa[(i + 1) % costa.length];
      expect(a).not.toEqual(b);
      for (let j = i + 2; j < costa.length; j++) {
        if (i === 0 && j === costa.length - 1) continue;
        const c = costa[j], d = costa[(j + 1) % costa.length];
        expect(lado(a, b, c) * lado(a, b, d) < 0 && lado(c, d, a) * lado(c, d, b) < 0).toBe(false);
      }
    }
  });

  it('as cinco regiões e os lugares do interior permanecem em terra', () => {
    for (const id of ['forostar', 'andustar', 'hyarnustar', 'hyarrostar', 'orrostar', 'mittalmar', 'meneltarma', 'armenelos', 'emerie', 'hyarastorni', 'noirinan', 'nisimaldar']) {
      const [x, y] = lugarPorId.get(id)!.em;
      expect(modelo.distCosta(x, y), id).toBeGreaterThan(0);
    }
  });

  it('os portos acompanham as baías em vez de ficar no interior ou em alto-mar', () => {
    for (const id of ['andunie', 'romenna', 'eldalonde', 'nindamos']) {
      const [x, y] = lugarPorId.get(id)!.em;
      const distancia = modelo.distCosta(x, y);
      expect(distancia, id).toBeGreaterThan(0);
      expect(distancia, id).toBeLessThan(12);
    }
    for (const [x, y] of [[-2520, -795], [-2006, -780], [-2250, -970]]) {
      expect(modelo.distCosta(x, y), `${x},${y}`).toBeLessThan(0);
    }
  });

  it('Meneltarma domina o relevo e as cristas do norte e sudoeste se destacam das pastagens', () => {
    const pastagem = amostra(-2308, -822).h;
    expect(amostra(-2250, -700).h).toBeGreaterThan(2.5);
    expect(amostra(-2231, -459).h).toBeGreaterThan(pastagem + 0.3);
    expect(amostra(-2597, -968).h).toBeGreaterThan(pastagem + 0.3);
    expect(amostra(-1990, -925).floresta).toBeGreaterThan(amostra(-2308, -822).floresta + 0.2);
  });

  it('os dois rios chegam ao mar e Nísinen continua sendo um lago', () => {
    for (const id of ['rio-siril', 'rio-nunduine']) {
      const rio = antes.find((f) => f.id === id)!;
      for (const [x, y] of rio.pts!.slice(0, -1)) expect(modelo.distCosta(x, y), id).toBeGreaterThan(0);
      const [x, y] = rio.pts![rio.pts!.length - 1];
      expect(modelo.distCosta(x, y), id).toBeLessThan(0);
    }
    const lago = amostra(-2375, -740);
    expect(lago.agua).toBeGreaterThan(0);
    expect(lago.h).toBeLessThan(lago.agua);
  });

  it('estrada e rotas continuam conectadas aos portos reposicionados', () => {
    const estrada = estradasAtivas(tempo.tAno('SE', 3318)).find((f) => f.id === 'estrada-numenor')!.pts!;
    expect(estrada[0]).toEqual(lugarPorId.get('romenna')!.em);
    expect(estrada[estrada.length - 1]).toEqual(lugarPorId.get('andunie')!.em);
    for (const [x, y] of estrada) expect(modelo.distCosta(x, y)).toBeGreaterThan(0);
    for (const id of ['elendil', 'filhos', 'armada']) {
      const rota = ROTAS.find((r) => r.id === id)!;
      expect(rota.pts[0]).toEqual(lugarPorId.get(id === 'armada' ? 'andunie' : 'romenna')!.em);
      for (const [x, y] of rota.pts.slice(1, 3)) expect(modelo.distCosta(x, y), id).toBeLessThan(0);
    }
  });

  it('costa, montanhas, rios e vegetação desaparecem juntos na Queda', () => {
    expect(depois).toEqual([]);
    const mar = new ModeloTerreno(depois, terreno.cadeias, [-2800, -1150, -1700, -250]);
    for (const id of ['forostar', 'andustar', 'hyarnustar', 'hyarrostar', 'orrostar', 'meneltarma']) {
      const [x, y] = lugarPorId.get(id)!.em;
      expect(mar.amostrar(x, y, novaAmostra()).h).toBeLessThan(0);
    }
  });
});
