// Gera o contorno de Númenor usado em data/terreno.json (feição "numenor").
// A forma segue a descrição de Contos Inacabados ("Uma Descrição de Númenor"):
// estrela de cinco pontas com região central de ~250 milhas (~400 km) e
// cinco promontórios. A orientação dos braços segue o mapa de Christopher Tolkien.
// A posição no Grande Mar é uma inferência (ver data/fontes.json).
const C = [-2250, -700];
const arms = [
  { n: 'Forostar', a: 86, L: 400, w: 15 },
  { n: 'Orrostar', a: 16, L: 390, w: 13 },
  { n: 'Hyarrostar', a: -56, L: 420, w: 17 },
  { n: 'Hyarnustar', a: -128, L: 430, w: 18 },
  { n: 'Andustar', a: 158, L: 410, w: 14 },
];
const inner = 175;
const bays = [ { a: 195, depth: 35, w: 9 }, { a: -20, depth: 45, w: 7 }, { a: 128, depth: 25, w: 6 } ];
const pts = [];
for (let i = 0; i < 150; i++) {
  const th = (i / 150) * 360;
  let r = inner;
  for (const A of arms) {
    const d = ((((th - A.a) % 360) + 540) % 360) - 180;
    r = Math.max(r, inner + (A.L - inner) * Math.pow(Math.exp(-(d * d) / (2 * A.w * A.w)), 0.9));
  }
  for (const B of bays) {
    const d = ((((th - B.a) % 360) + 540) % 360) - 180;
    r -= B.depth * Math.exp(-(d * d) / (2 * B.w * B.w));
  }
  const rad = (th * Math.PI) / 180;
  pts.push([Math.round(C[0] + Math.cos(rad) * r), Math.round(C[1] + Math.sin(rad) * r)]);
}
const out = [pts[0]];
for (const p of pts) { const q = out[out.length - 1]; if (Math.hypot(p[0] - q[0], p[1] - q[1]) > 14) out.push(p); }
console.log(JSON.stringify(out));
