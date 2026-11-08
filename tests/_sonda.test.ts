import { it } from 'vitest';
import { estadoTerreno, tempo, terreno } from '../src/core/data';
import { ModeloTerreno } from '../src/terrain/model';
it('sonda', () => {
  const m = new ModeloTerreno(estadoTerreno(tempo.tAno('SE', 3000)).feicoes, terreno.cadeias, terreno.limites);
  // primeira água ao longo de cada linha
  for (let y = -729; y >= -737; y -= 0.5) {
    let x = -2132; while (m.altura(x, y) > 0 && x < -2110) x += 0.05;
    const perfil = [-1, -0.5, -0.2, -0.05].map((d) => (m.altura(x + d, y) * 1000).toFixed(1)).join(' ');
    console.log('y', y, 'agua em x', x.toFixed(2), 'alturas(m) a -1,-0.5,-0.2,-0.05 km:', perfil, 'mar +0.5:', (m.altura(x + 0.5, y) * 1000).toFixed(1));
  }
});
