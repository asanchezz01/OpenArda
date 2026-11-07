// Valida a integridade dos dados do atlas: ids únicos, referências cruzadas,
// referências temporais, fontes existentes e campos obrigatórios.
// Uso: npm run validate
import { existsSync, readFileSync } from 'node:fs';

const ler = (n) => JSON.parse(readFileSync(new URL(`../data/${n}.json`, import.meta.url), 'utf8'));
const terreno = ler('terreno');
const eras = ler('eras');
const eventos = ler('eventos');
const lugares = ler('lugares');
const reinos = ler('reinos');
const fontes = ler('fontes');
const jornadas = ler('jornadas');

const erros = [];
const avisos = [];
const erro = (m) => erros.push(m);

const ids = (lista, nome) => {
  const s = new Set();
  for (const x of lista) {
    if (!x.id) erro(`${nome}: item sem id`);
    if (s.has(x.id)) erro(`${nome}: id repetido ${x.id}`);
    s.add(x.id);
  }
  return s;
};
const idEras = ids(eras, 'eras');
const idEventos = ids(eventos, 'eventos');
const idLugares = ids(lugares, 'lugares');
const idReinos = ids(reinos, 'reinos');
const idFontes = ids(fontes, 'fontes');
const idFeicoes = ids(terreno.feicoes, 'feições');
ids(jornadas, 'jornadas');

const CERT = new Set(['descrito', 'inferido', 'artistico']);

function verificarTempo(ref, onde) {
  if (ref == null || ref === '-inf' || ref === '+inf') return;
  const m = String(ref).match(/^(?:([A-Z]{2}):)?(#?)(.+)$/);
  if (!m) return erro(`${onde}: referência temporal inválida "${ref}"`);
  const [, era, hash, resto] = m;
  if (era && !idEras.has(era)) erro(`${onde}: era desconhecida "${era}" em "${ref}"`);
  if (hash) {
    if (!idEventos.has(resto)) erro(`${onde}: evento desconhecido "${resto}" em "${ref}"`);
    return;
  }
  if (!era) return erro(`${onde}: referência sem era "${ref}"`);
  if (resto === 'inicio' || resto === 'fim') return;
  const e = eras.find((x) => x.id === era);
  if (!e.datada) return erro(`${onde}: era ${era} não tem anos; use um acontecimento (#id) em "${ref}"`);
  const ano = Number(resto);
  if (!Number.isInteger(ano)) return erro(`${onde}: ano inválido em "${ref}"`);
  if (ano < e.inicio || ano > e.fim) erro(`${onde}: ano ${ano} fora da ${e.nome} (${e.inicio}–${e.fim})`);
}

function verificarFontes(lista, onde) {
  for (const f of lista ?? []) if (!idFontes.has(f.fonte)) erro(`${onde}: fonte desconhecida "${f.fonte}"`);
}

// eras
for (const e of eras) {
  if (e.datada && (e.inicio == null || e.fim == null)) erro(`era ${e.id}: datada sem início/fim`);
  verificarTempo(e.cursor_padrao, `era ${e.id}`);
}

// eventos
for (const e of eventos) {
  const onde = `evento ${e.id}`;
  if (!idEras.has(e.era)) erro(`${onde}: era desconhecida`);
  const era = eras.find((x) => x.id === e.era);
  if (era && era.datada && e.ano == null) erro(`${onde}: era datada exige ano (use "aprox" e "nota_data" quando incerto)`);
  if (era && !era.datada && e.ano != null) erro(`${onde}: era sem datas não aceita ano — não invente anos`);
  if (era && !era.datada && e.seq == null) erro(`${onde}: era sem datas exige "seq"`);
  if (!CERT.has(e.cert)) erro(`${onde}: certeza inválida`);
  if (!e.fontes?.length) erro(`${onde}: sem fontes`);
  verificarFontes(e.fontes, onde);
  for (const l of e.lugares ?? []) if (!idLugares.has(l)) erro(`${onde}: lugar desconhecido "${l}"`);
  for (const r of e.reinos ?? []) if (!idReinos.has(r)) erro(`${onde}: reino desconhecido "${r}"`);
}

// lugares
for (const l of lugares) {
  const onde = `lugar ${l.id}`;
  if (!Array.isArray(l.em) || l.em.length !== 2) erro(`${onde}: coordenada inválida`);
  if (!(l.posto >= 1 && l.posto <= 5)) erro(`${onde}: posto deve ser 1–5`);
  verificarTempo(l.de, onde);
  verificarTempo(l.ate, onde);
  for (const f of l.fases ?? []) {
    verificarTempo(f.de, `${onde} (fase)`);
    verificarTempo(f.ate, `${onde} (fase)`);
    if (f.evento && !idEventos.has(f.evento)) erro(`${onde}: evento de fase desconhecido "${f.evento}"`);
  }
  for (const e of l.eventos ?? []) if (!idEventos.has(e)) erro(`${onde}: evento desconhecido "${e}"`);
  if (l.reino && !idReinos.has(l.reino)) erro(`${onde}: reino desconhecido "${l.reino}"`);
  if (l.feicao && !idFeicoes.has(l.feicao)) erro(`${onde}: feição desconhecida "${l.feicao}"`);
  if (l.cert && !CERT.has(l.cert)) erro(`${onde}: certeza inválida`);
  verificarFontes(l.fontes, onde);
  for (const a of l.aspectos ?? []) {
    if (!CERT.has(a.cert)) erro(`${onde}: certeza inválida no aspecto "${a.aspecto}"`);
    verificarFontes(a.fontes, `${onde} (aspecto)`);
  }
  for (const n of l.notas_versoes ?? []) verificarFontes(n.fontes, `${onde} (nota de versão)`);
  if (!l.fontes?.length) avisos.push(`${onde}: sem fontes`);
}

// reinos
const TIPOS = new Set(['dominio', 'ocupacao', 'influencia']);
const BORDAS = new Set(['documentada', 'aproximada', 'difusa']);
for (const r of reinos) {
  const onde = `reino ${r.id}`;
  verificarTempo(r.de, onde);
  verificarTempo(r.ate, onde);
  verificarTempo(r.ultimo_periodo, onde);
  for (const c of r.comparar ?? []) verificarTempo(c, `${onde} (comparar)`);
  if (r.evento_fundacao && !idEventos.has(r.evento_fundacao)) erro(`${onde}: evento de fundação desconhecido`);
  for (const c of r.capitais) {
    if (!idLugares.has(c.lugar)) erro(`${onde}: capital desconhecida "${c.lugar}"`);
    verificarTempo(c.de, onde);
    verificarTempo(c.ate, onde);
  }
  for (const t of r.transformacoes) {
    verificarTempo(t.quando, `${onde} (transformação)`);
    if (t.evento && !idEventos.has(t.evento)) erro(`${onde}: evento desconhecido "${t.evento}"`);
  }
  r.territorios.forEach((t, i) => {
    const o = `${onde} território ${i}`;
    if (!TIPOS.has(t.tipo)) erro(`${o}: tipo inválido "${t.tipo}"`);
    if (!BORDAS.has(t.borda)) erro(`${o}: borda inválida "${t.borda}"`);
    if (!t.contorno && !t.feicao) erro(`${o}: sem contorno`);
    if (t.feicao && !idFeicoes.has(t.feicao)) erro(`${o}: feição desconhecida`);
    if (t.contorno && t.contorno.length < 3) erro(`${o}: contorno com menos de 3 pontos`);
    verificarTempo(t.de, o);
    verificarTempo(t.ate, o);
    verificarFontes(t.fontes, o);
  });
  for (const lg of r.ligacoes ?? []) {
    if (lg.lugar && !idLugares.has(lg.lugar)) erro(`${onde}: ligação a lugar desconhecido`);
    if (lg.reino && !idReinos.has(lg.reino)) erro(`${onde}: ligação a reino desconhecido`);
    if (lg.evento && !idEventos.has(lg.evento)) erro(`${onde}: ligação a evento desconhecido`);
    verificarTempo(lg.quando, onde);
  }
  if (!r.fontes?.length) erro(`${onde}: sem fontes`);
  verificarFontes(r.fontes, onde);
}

// terreno
for (const f of terreno.feicoes) {
  const onde = `feição ${f.id}`;
  verificarTempo(f.de, onde);
  verificarTempo(f.ate, onde);
  if (f.cert && !CERT.has(f.cert)) erro(`${onde}: certeza inválida`);
  verificarFontes(f.fontes, onde);
  for (const c of f.contorno ?? []) if (typeof c === 'string' && !terreno.cadeias[c.replace(/^!/, '')]) erro(`${onde}: cadeia desconhecida "${c}"`);
}
for (const m of terreno.marcos) verificarFontes(m.fontes, `marco ${m.id}`);

// jornadas
for (const j of jornadas) {
  j.passos.forEach((p, i) => {
    const onde = `jornada ${j.id} passo ${i + 1}`;
    verificarTempo(p.quando, onde);
    for (const c of p.comparar ?? []) verificarTempo(c, onde);
    if (p.selecionar) {
      const [tipo, id] = p.selecionar.split(':');
      const conj = { lugar: idLugares, reino: idReinos, evento: idEventos }[tipo];
      if (!conj || !conj.has(id)) erro(`${onde}: seleção inválida "${p.selecionar}"`);
    }
    verificarFontes(p.fontes, onde);
  });
}

// linhagens
const linhagens = ler('linhagens');
const retratos = ler('retratos');
const idPessoas = ids(linhagens.pessoas, 'pessoas');
ids(linhagens.senhorios, 'senhorios');
const POVOS = new Set(['noldor', 'sindar', 'teleri', 'vanyar', 'maia', 'edain', 'meio', 'dunedain', 'hobbit', 'anao', 'homem']);
for (const p of linhagens.pessoas) {
  const onde = `pessoa ${p.id}`;
  if (!POVOS.has(p.povo)) erro(`${onde}: povo inválido "${p.povo}"`);
  for (const q of p.pais ?? []) if (!idPessoas.has(q) || q === p.id) erro(`${onde}: genitor inválido "${q}"`);
  if (p.elo && !p.pais?.length) erro(`${onde}: "elo" sem pais`);
  if (!p.fontes?.length) erro(`${onde}: sem fontes`);
  verificarFontes(p.fontes, onde);
}
for (const s of linhagens.senhorios) {
  const onde = `senhorio ${s.id}`;
  if (s.reino && !idReinos.has(s.reino)) erro(`${onde}: reino desconhecido "${s.reino}"`);
  for (const lu of s.lugares ?? []) if (!idLugares.has(lu)) erro(`${onde}: lugar desconhecido "${lu}"`);
  if (!s.reino && !s.nome) erro(`${onde}: sem nome nem reino`);
  if (!s.governos?.length) erro(`${onde}: sem governos`);
  for (const g of s.governos ?? []) {
    verificarTempo(g.de, onde);
    verificarTempo(g.ate, onde);
    if (!g.quem?.length && !g.rotulo) erro(`${onde}: governo sem "quem" nem "rotulo"`);
    for (const q of g.quem ?? []) if (!idPessoas.has(q)) erro(`${onde}: pessoa desconhecida "${q}"`);
  }
  verificarFontes(s.fontes, onde);
}
for (const r of retratos) {
  if (!idPessoas.has(r.id)) avisos.push(`retrato ${r.id}: sem pessoa em linhagens.json`);
  if (!r.imagem || !existsSync(new URL(`../public/${r.imagem}`, import.meta.url))) erro(`retrato ${r.id}: arquivo de imagem ausente`);
}

// fotografias (docs/ROADMAP-FOTOGRAFIAS-LUGARES.md)
const fotografias = ler('fotografias');
ids(fotografias, 'fotografias');
for (const f of fotografias) {
  const onde = `fotografia ${f.id}`;
  if (!idLugares.has(f.lugar)) erro(`${onde}: lugar desconhecido "${f.lugar}"`);
  verificarTempo(f.quando, onde);
  verificarTempo(f.de, onde);
  verificarTempo(f.ate, onde);
  if (!f.fontes?.length) erro(`${onde}: sem fontes`);
  verificarFontes(f.fontes, onde);
  if (!f.alt || !f.titulo) erro(`${onde}: sem título ou texto alternativo`);
  if (f.imagem && !existsSync(new URL(`../public/${f.imagem}`, import.meta.url))) erro(`${onde}: arquivo ausente public/${f.imagem}`);
}

// fontes: lacunas registradas explicitamente
for (const f of fontes) if (f.acesso === 'lacuna' && !/LACUNA/.test(f.nota)) avisos.push(`fonte ${f.id}: acesso "lacuna" sem nota explicando a lacuna`);

const resumo = `${eventos.length} acontecimentos, ${lugares.length} lugares, ${reinos.length} reinos, ${terreno.feicoes.length} feições de terreno, ${fontes.length} fontes (${fontes.filter((f) => f.acesso === 'lacuna').length} lacunas registradas), ${jornadas.length} jornadas`;
for (const a of avisos) console.warn('aviso:', a);
if (erros.length) {
  for (const e of erros) console.error('erro:', e);
  console.error(`\n${erros.length} erro(s). ${resumo}`);
  process.exit(1);
}
console.log(`Dados válidos: ${resumo}.`);
