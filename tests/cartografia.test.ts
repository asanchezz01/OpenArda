import { describe, expect, it } from 'vitest';
import referencias from './fixtures/cartografia-lotrproject.json';
import { estadoTerreno, estradasAtivas, jornadas, lugarPorId, lugares, reinos, statusLugar, tempo, terreno } from '../src/core/data';
import type { Pt } from '../src/core/types';
import { ModeloTerreno, resolverContorno } from '../src/terrain/model';
import { ROTAS } from '../src/render/overlay';

const pe = tempo.cursor('PE:400');
const te = tempo.cursor('TE:3018');
const modelos = new Map([pe, te].map((t) => [t, new ModeloTerreno(estadoTerreno(t).feicoes, terreno.cadeias, terreno.limites)]));
const feicao = (id: string) => terreno.feicoes.find((f) => f.id === id)!;
const ultima = (pts: Pt[]) => pts[pts.length - 1];

function cruza(p: Pt[]): boolean {
  const lado = (a: Pt, b: Pt, c: Pt) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  for (let i = 0; i < p.length; i++) {
    for (let j = i + 2; j < p.length; j++) {
      if (i === 0 && j === p.length - 1) continue;
      const a = p[i], b = p[(i + 1) % p.length], c = p[j], d = p[(j + 1) % p.length];
      if (lado(a, b, c) * lado(a, b, d) < 0 && lado(c, d, a) * lado(c, d, b) < 0) return true;
    }
  }
  return false;
}

function distanciaLinha(p: Pt, pts: Pt[]): number {
  let menor = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    menor = Math.min(menor, Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy));
  }
  return menor;
}

describe('revisão cartográfica do LotrProject', () => {
  it('mantém as duas escalas registradas e os marcos da referência', () => {
    for (const mapa of Object.values(referencias)) {
      for (const ponto of mapa.pontos) {
        const [x, y] = lugarPorId.get(ponto.lugar)!.em;
        const esperado = ponto.em.map((n, i) => (n - mapa.origem[i]) * mapa.escala);
        expect(Math.hypot(x - esperado[0], y - esperado[1]), ponto.lugar).toBeLessThan(6);
      }
    }
    expect(lugarPorId.get('himring')!.em).toEqual(lugarPorId.get('himling')!.em);
    expect(lugarPorId.get('erebor')!.em[1]).toBeLessThan(lugarPorId.get('himling')!.em[1]);
    expect(lugarPorId.get('khazad-dum')!.em[0]).toBeLessThan(lugarPorId.get('imladris')!.em[0]);
  });

  it('costas, lagos, florestas e territórios não se cruzam', () => {
    for (const f of terreno.feicoes.filter((f) => f.contorno || f.circulo)) {
      expect(cruza(resolverContorno(f, terreno.cadeias).pts), f.id).toBe(false);
    }
    for (const r of reinos) for (const t of r.territorios) {
      if (t.contorno) expect(cruza(t.contorno), r.id).toBe(false);
    }
  });

  it.each([pe, te])('cidades, portos e ilhas ativos ficam em terra no instante %s', (t) => {
    for (const l of lugares) {
      if (!['ativo', 'oculto'].includes(statusLugar(l, t)[0])) continue;
      if (!['cidade', 'porto', 'fortaleza', 'ilha', 'montanha', 'colina'].includes(l.tipo)) continue;
      // A margem subquilométrica acomoda rótulos antigos no limite da costa fractal.
      expect(modelos.get(t)!.distCosta(...l.em), l.id).toBeGreaterThan(-0.5);
    }
  });

  it('as fozes dos rios principais chegam ao mar', () => {
    for (const id of ['rio-sirion', 'rio-gelion', 'rio-brithon', 'rio-nenning', 'rio-lhun', 'rio-baranduin', 'rio-gwathlo', 'rio-isen', 'rio-anduin', 'rio-morthond', 'rio-gilrain', 'rio-harnen']) {
      const f = feicao(id);
      const modelo = modelos.get(f.ate === 'PE:587' ? pe : te)!;
      expect(modelo.distCosta(...ultima(f.pts!)), id).toBeLessThanOrEqual(0);
    }
  });

  it.each([
    ['rio-teiglin', 'rio-sirion'], ['rio-narog', 'rio-sirion'], ['rio-esgalduin', 'rio-sirion'],
    ['rio-aros', 'rio-sirion'], ['rio-celon', 'rio-aros'], ['rio-mindeb', 'rio-sirion'],
    ['rio-ascar', 'rio-gelion'], ['rio-thalos', 'rio-gelion'], ['rio-legolin', 'rio-gelion'],
    ['rio-brilthor', 'rio-gelion'], ['rio-duilwen', 'rio-gelion'], ['rio-adurant', 'rio-gelion'],
    ['rio-rivil', 'rio-sirion'], ['rio-ginglith', 'rio-narog'], ['rio-malduin', 'rio-teiglin'],
    ['rio-entagua', 'rio-anduin'], ['rio-veio-de-prata', 'rio-anduin'], ['rio-limclaro', 'rio-anduin'],
    ['rio-carnen', 'rio-celduin'], ['rio-poros', 'rio-anduin'], ['rio-encantado', 'rio-floresta'],
    ['rio-langwell', 'rio-anduin'], ['rio-greylin', 'rio-anduin'], ['rio-rhimdath', 'rio-anduin'],
    ['rio-ringlo', 'rio-morthond'], ['rio-ciril', 'rio-ringlo'], ['rio-serni', 'rio-gilrain'],
    ['rio-sirith', 'rio-anduin'], ['rio-erui', 'rio-anduin'], ['rio-snowbourn', 'rio-entagua'],
  ])('%s encontra %s sem lacuna entre os cursos', (afluente, receptor) => {
    expect(distanciaLinha(ultima(feicao(afluente).pts!), feicao(receptor).pts!)).toBeLessThan(1);
  });

  it('as estradas e rotas continuam ligadas aos lugares reposicionados', () => {
    const leste = estradasAtivas(te).find((f) => f.id === 'estrada-leste')!.pts!;
    expect(leste[0]).toEqual(lugarPorId.get('mithlond')!.em);
    expect(ultima(leste)).toEqual(lugarPorId.get('imladris')!.em);
    for (const f of estradasAtivas(te).filter((f) => ['estrada-leste', 'estrada-verde'].includes(f.id))) {
      for (const p of f.pts!) expect(modelos.get(te)!.distCosta(...p), f.id).toBeGreaterThan(0);
    }
    expect(ultima(ROTAS.find((r) => r.id === 'elendil')!.pts)).toEqual(lugarPorId.get('mithlond')!.em);
    expect(ultima(ROTAS.find((r) => r.id === 'filhos')!.pts)).toEqual(lugarPorId.get('pelargir')!.em);
  });

  it('a jornada mantém a mesma câmera antes e depois da Guerra da Ira', () => {
    const passos = jornadas.find((j) => j.id === 'beleriand-ira')!.passos;
    expect(passos.find((p) => p.titulo === 'A Guerra da Ira')!.vista).toEqual(passos.find((p) => p.titulo === 'O mar invade Beleriand')!.vista);
  });
});
