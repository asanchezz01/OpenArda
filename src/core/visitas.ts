import { faseAtual, feicaoPorId, lugarPorId, statusLugar, tempo } from './data';
import type { Lugar, Pt, TempoRef, Vista } from './types';

interface Destino3d {
  id: string;
  padrao: string;
  vista: [distancia: number, rumo: number, inclinacao: number];
  em?: Pt;
  raio?: number;
  agua?: boolean;
  inicio?: TempoRef;
  fases?: Record<string, string>;
  pontos?: { nome: string; dx: number; dy: number; rumo: number; inclinacao: number }[];
  texto: string;
  ressalva: string;
}

const destinos: Destino3d[] = [
  { id: 'avallone', padrao: 'AA:#aa-silmarils', em: [-3166.17, -142], vista: [3.05, 249, 84], agua: true,
    texto: 'A torre branca domina o porto, acima de um cais com duas arcadas. Casas de telhados escuros e pátios sobem pela encosta de Tol Eressëa, diante dos veleiros.',
    ressalva: 'A torre e o porto voltado para leste vêm da Akallabêth. A planta, as fachadas, os patamares e os barcos foram reconstruídos a partir da fotografia do atlas.' },
  { id: 'osgiliath', padrao: 'TE:1000', em: [1761.4, -1337], vista: [3.8, 355, 64],
    fases: { 'SE:3320': 'integra', 'TE:1437': 'incendiada', 'TE:1640': 'ruinas', 'TE:3018': 'ponte-partida' },
    texto: 'Bairros nas duas margens do Anduin, uma grande ponte e a Cúpula das Estrelas. A Contenda e o abandono deixam casas queimadas e a cúpula caída. A ponte aparece partida a partir de 3018 T.E.',
    ressalva: 'A planta, a forma da cúpula e os danos de cada fase são interpretativos. A capital nas duas margens e a perda da cúpula seguem o Apêndice A.' },
  { id: 'rammas-echor', padrao: 'TE:3018', vista: [17, 270, 68],
    texto: 'Siga o muro do Pelennor até as Fortalezas da Calçada, no caminho de Osgiliath. Em 3019 T.E., abrem-se brechas no circuito.',
    ressalva: 'A forma do circuito, a data de início e a posição das brechas são aproximadas. O muro e as Fortalezas da Calçada vêm do Livro V.' },
  { id: 'minas-ithil', padrao: 'TE:3018', vista: [2.1, 85, 65], raio: 0.45,
    fases: { 'SE:3320': 'ithil', 'SE:3429': 'ruinas', 'TE:1': 'ithil', 'TE:2002': 'morgul' },
    texto: 'A mudança de Minas Ithil para Minas Morgul transforma a cidade clara na fortaleza de luz pálida, com a torre e a ponte sobre o vale.',
    ressalva: 'A planta, o desenho do vale e os danos são interpretativos. A luz e a torre de Minas Morgul são descritas no Livro IV, cap. 8.' },
  { id: 'abismo-de-helm', padrao: 'TE:3018', vista: [2.1, 205, 66], raio: 0.5,
    texto: 'O Forte da Trombeta protege a entrada do desfiladeiro. O Muro de Helm atravessa o vale diante do caminho para Aglarond e sofre uma brecha em 3019 T.E.',
    ressalva: 'A forma do forte, a data inicial e a escala do desfiladeiro são aproximadas. O forte, a entrada das cavernas, o bueiro e a brecha seguem o Livro III, cap. 7 e 8.' },
  { id: 'meneltarma', padrao: 'SE:3000', vista: [29, 310, 63],
    texto: 'A estrada sobe em espiral até o santuário de Eru, uma clareira aberta ao céu no cume.',
    ressalva: 'A estrada em espiral e o cume aberto seguem Contos Inacabados. O percurso exato, a largura da estrada e a altitude são interpretações do atlas.' },
  { id: 'andunie', padrao: 'SE:3000', em: [-2564.87, -574.77], vista: [2.65, 156, 62], agua: true,
    fases: { 'SE:32': 'porto', 'SE:630': 'senhorio' },
    texto: 'Cais e armazéns de cantaria ao pé de três terraços. A partir de 630 S.E., o solar dos Senhores de Andúnië aparece no alto da encosta.',
    ressalva: 'Contos Inacabados descreve as habitações na encosta. O solar, os cais e as fachadas foram reconstruídos artisticamente com referências das fotografias do atlas.' },
  { id: 'eldalonde', padrao: 'SE:1200', em: [-2453.94, -771.25], vista: [2.4, 245, 67], agua: true,
    fases: { 'SE:32': 'eldar', 'SE:2251': 'sombra' },
    texto: 'O porto fica na foz do Nunduinë, entre as árvores perfumadas de Nísimaldar. Na fase inicial, veleiros claros representam as visitas de Eressëa.',
    ressalva: 'O porto e as árvores vêm de Contos Inacabados. A maquete usa 2251 S.E., ano da divisão dos Númenóreanos no atlas, para representar o afastamento dos Eldar. Pórtico, cais e embarcações são interpretações.' },
  { id: 'nindamos', padrao: 'SE:3000', em: [-2208, -932.77], vista: [1.9, 23, 65], agua: true,
    texto: 'Uma aldeia de pescadores ocupa os baixios da foz do Siril, com casas baixas, passadiços e pequenas embarcações.',
    ressalva: 'Contos Inacabados situa a aldeia junto aos pântanos do Siril. As estacas, os telhados e a distribuição das casas são interpretações.' },
  { id: 'emerie', padrao: 'SE:882', inicio: 'SE:882', vista: [1.12, 15, 61],
    texto: 'A Casa Branca de Erendis fica entre pastagens. Um redil recorda os rebanhos do Mittalmar e a juventude de Ancalimë.',
    ressalva: 'A casa e os rebanhos vêm de Aldarion e Erendis. O atlas usa o ano da visita de Aldarion como primeira data da maquete. A planta e o alpendre são interpretações.' },
  { id: 'hyarastorni', padrao: 'SE:882', inicio: 'SE:882', vista: [1.5, 5, 60],
    texto: 'A propriedade de Hallatan reúne a casa principal, anexos rurais e muros baixos de pastagem no Mittalmar.',
    ressalva: 'A visita de Aldarion à casa de Hallatan é narrada em Aldarion e Erendis, em 882 S.E. A posição, a planta e os celeiros são interpretações.' },
  { id: 'noirinan', padrao: 'SE:3000', inicio: '#se-elros', vista: [2.45, 0, 66],
    texto: 'Entradas funerárias abrem-se na rocha ao pé do Meneltarma, com uma sepultura em destaque dedicada a Elros.',
    ressalva: 'Contos Inacabados situa os túmulos reais escavados na rocha. A data inicial usa a morte de Elros. A quantidade, a posição das aberturas e a cantaria são interpretações.' },
  { id: 'grande-armada', padrao: 'SE:3318', vista: [3.4, 215, 64], agua: true,
    texto: 'Navios da Grande Armada se reúnem ao largo do oeste de Númenor, antes da partida para Aman.',
    ressalva: 'A preparação da frota é descrita na Akallabêth. O ponto de reunião, os navios e sua quantidade são escolhas artísticas.' },
  { id: 'tol-uinen', padrao: 'SE:3000', vista: [1.2, 260, 66], agua: true,
    texto: 'Uma pequena ilha abriga Calmindon, a torre erguida por Aldarion na baía de Rómenna.',
    ressalva: 'A data usada no atlas, a posição da ilhota e o desenho da torre são aproximados. A construção é relatada em Aldarion e Erendis.' },
  { id: 'orfalch-echor', padrao: 'PE:495', vista: [26, 42, 72],
    fases: { 'PE:116': 'seis', 'PE:473': 'sete', 'PE:510': 'abandonado' },
    texto: 'A passagem reúne os portões de madeira, pedra, bronze, ferro torcido, prata e ouro. O de aço aparece depois da Nirnaeth Arnoediad.',
    ressalva: 'Os materiais e a ordem seguem Contos Inacabados. Posição, dimensões e datas são aproximadas. O estado pós-510 indica o abandono do acesso.' },
  { id: 'mithlond', padrao: 'TE:3021', em: [373.14, -414.04], vista: [2.7, 148, 65], agua: true,
    texto: 'Cais e estaleiros dos Portos Cinzentos, com navios de Círdan voltados para o Golfo de Lhûn.',
    ressalva: 'O porto e as partidas para o oeste são documentados. A implantação local, as oficinas e o desenho dos navios são interpretativos.' },
  { id: 'ost-in-edhil', padrao: 'SE:1590', vista: [2.3, 315, 65], raio: 0.65,
    texto: 'As oficinas dos Gwaith-i-Mírdain se agrupam em torno de um pátio, com forjas e chaminés. Em 1697 S.E., a cidade se torna ruína.',
    ressalva: 'Contos Inacabados situa os ferreiros élficos na cidade. Planta, forjas, posição e materiais do conjunto são interpretativos.' },
  { id: 'annuminas', padrao: 'TE:150', vista: [2.6, 230, 66], raio: 0.4,
    texto: 'A capital de Elendil domina a margem do Nenuial. A cidade ativa dá lugar a ruínas e volta a aparecer restaurada na Quarta Era.',
    ressalva: 'O lago, o abandono e a restauração vêm da tradição do Reino do Norte. A torre, o cais e o traçado são interpretativos.' },
  { id: 'fornost', padrao: 'TE:1400', vista: [2.5, 345, 64], raio: 0.65,
    texto: 'Fortaleza nas Colinas do Norte, com anéis de defesa e um paço. A queda de Arthedain em 1974 T.E. deixa brechas e torres truncadas.',
    ressalva: 'O sítio nas Colinas do Norte e a queda seguem o Apêndice A. O desenho das muralhas e da cidade é interpretativo.' },
  { id: 'carn-dum', padrao: 'TE:1800', vista: [2.7, 345, 67], raio: 0.5,
    texto: 'Uma estrada em zigue-zague leva à fortaleza montanhosa do Rei-bruxo. Ruínas ocupam o sítio após a derrota de Angmar.',
    ressalva: 'Tolkien dá poucos pormenores arquitetônicos. A estrada, as muralhas e as torres deste modelo são uma reconstrução artística.' },
  { id: 'barad-dur', padrao: 'TE:3018', vista: [4.7, 330, 65], raio: 0.85,
    fases: { 'SE:1000': 'construcao', 'SE:1600': 'integra', 'SE:3441': 'alicerces', 'TE:2951': 'integra', 'TE:3019': 'ruinas' },
    texto: 'A fortaleza escura cresce sobre os contrafortes das Ered Lithui. Restam os alicerces após a Última Aliança, e a destruição de 3019 T.E. atinge também a base.',
    ressalva: 'O Apêndice B dá a cronologia da torre. A altura, os contrafortes, as torres e os danos visíveis são interpretativos.' },
  { id: 'angband', padrao: 'PE:400', em: [-258, 275], vista: [34, 355, 81], raio: 0.9,
    texto: 'Os portões de ferro e o caminho fortificado ficam ao pé das três montanhas de escória de Thangorodrim.',
    ressalva: 'A relação com Thangorodrim é descrita. Esta entrada é assentada diante dos picos do relevo do atlas. A escala e as muralhas são interpretativas.' },
  { id: 'tirion', padrao: 'AA:#aa-silmarils', vista: [3.6, 265, 63], raio: 0.7,
    texto: 'Terraços brancos sobem por Túna até o Mindon Eldaliéva, com sua lâmpada de prata voltada para a Calacirya.',
    ressalva: 'A colina, os terraços, a torre e a lâmpada seguem O Silmarillion. A cidade usa a iluminação da era atual. Planta e volumes são interpretativos.' },
  { id: 'valmar', padrao: 'AA:#aa-silmarils', vista: [2.9, 100, 64], raio: 0.65,
    texto: 'Torres com sinos cercam as praças. O portão de oeste se volta para Ezellohar.',
    ressalva: 'Os sinos, o portão ocidental e a relação com o monte vêm de O Silmarillion. Planta, pórticos e torres são interpretativos.' },
  { id: 'khazad-dum', padrao: 'TE:3018', em: [1237, -610], vista: [2.16, 12, 47], raio: 0.3,
    fases: { 'PE:1': 'durin', 'SE:750': 'integra', 'TE:1981': 'abandonado', 'TE:2989': 'balin', 'TE:2994': 'ruinas-de-balin', 'TE:3018': 'lago', 'TE:3019': 'lago-ponte-partida' },
    pontos: [
      { nome: 'Entrada oeste', dx: -0.43, dy: -0.008, rumo: 74, inclinacao: 59 },
      { nome: 'Câmara de Mazarbul', dx: 0.086, dy: 0.278, rumo: 335, inclinacao: 28 },
      { nome: 'Ponte de Durin', dx: 0.53, dy: -0.05, rumo: 358, inclinacao: 54 },
    ],
    texto: 'O corte vai das Portas de Durin e da escadaria ocidental aos Grandes Portões no leste. O Vigésimo Primeiro Salão fica acima do Segundo Salão, de onde a ponte estreita cruza o abismo. Em Mazarbul, a luz entra por um poço oriental e incide sobre o túmulo de Balin. Em 3019 T.E., a ponte aparece desabada.',
    ressalva: 'A travessia e o túmulo seguem A Sociedade do Anel, Livro II, caps. 4 e 5. O corte comprime as distâncias, e a geologia, as proporções e o acabamento da cantaria são reconstruções artísticas.' },
  { id: 'erebor', padrao: 'TE:2941', em: [1816, -192], vista: [2.2, 350, 65], raio: 0.45,
    fases: { 'TE:1999': 'thrain', 'TE:2210': 'abandonado', 'TE:2590': 'integra', 'TE:2770': 'smaug', 'TE:2941': 'restaurada' },
    texto: 'A Porta Principal se abre acima do Rio Corrente. O corte distingue o salão ativo, o abandono e o tesouro acumulado na fase de Smaug.',
    ressalva: 'A porta, o rio e a ocupação de Smaug vêm de O Hobbit. Os salões, a data aproximada do primeiro abandono e a distribuição do tesouro são interpretações.' },
  { id: 'caras-galadhon', padrao: 'TE:3019', vista: [1.85, 330, 67], raio: 0.3,
    texto: 'Mallorns de casca prateada sustentam plataformas, escadas e caminhos suspensos. Um fosso e uma muralha verde protegem a entrada.',
    ressalva: 'Os mallorns, a muralha, o fosso e as plataformas seguem o Livro II. A data inicial, a planta e o início do abandono são aproximações.' },
  { id: 'saloes-thranduil', padrao: 'TE:2941', em: [1772, -228.55], vista: [1.7, 350, 65], raio: 0.15,
    texto: 'Uma ponte atravessa o Rio da Floresta até as portas de pedra. O corte revela o salão de pilares, as adegas e a saída fluvial dos barris.',
    ressalva: 'As portas, os pilares e a rota dos barris vêm de O Hobbit. A data, o corte e a planta são interpretações. A maquete fica na margem norte do rio, perto do marcador do atlas.' },
  { id: 'cinturao-melian', padrao: 'PE:400', vista: [330, 14, 48],
    texto: 'Uma faixa de névoa acompanha a borda do Cinturão até a partida de Melian.',
    ressalva: 'O Silmarillion descreve a barreira de encantamento. A névoa é uma representação artística, assentada no contorno do atlas.' },
];

export const NOVAS_VISITAS = destinos.map((d) => {
  const lugar = lugarPorId.get(d.id)!;
  const [x, y] = d.em ?? lugar.em;
  const [distancia, rumo, inclinacao] = d.vista;
  const vista: Vista = { x, y, d: distancia, rumo, inclinacao };
  const inicio = tempo.fronteira(d.inicio, -Infinity);
  return { ...d, lugar, vista, fase: (t: number) => t < inicio ? null : faseVisita(lugar, d.fases, t) };
});

const trecho = feicaoPorId.get('orfalch-echor')!.pts!;
export const PORTOES_ECHOR = ['Madeira', 'Pedra', 'Bronze', 'Ferro Torcido', 'Prata', 'Ouro', 'Aço'].map((nome, i) => {
  const a = trecho[i < 3 ? 2 : 1], b = trecho[i < 3 ? 1 : 0];
  const t = i < 3 ? (i + 1) / 4 : (i - 2) / 5;
  const em: Pt = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  return { nome, em, rumo: Math.atan2(b[0] - a[0], b[1] - a[1]) * 180 / Math.PI };
});

export const PONTOS_GONDOLIN = [
  { nome: 'Entrada da cidade', dx: 0, dy: -2.67, d: 2.1, nota: 'A escadaria e a entrada na muralha foram reconstruídas a partir de O Silmarillion, cap. 15 e 23.' },
  { nome: 'Praça da fonte', dx: 0, dy: -0.57, d: 3.2, nota: 'As fontes são mencionadas em O Silmarillion, cap. 15. A praça e a bacia são interpretações.' },
  { nome: 'Torre do Rei', dx: 0, dy: 0.58, d: 4.3, nota: 'A Torre do Rei aparece no relato da queda, em O Silmarillion, cap. 23.' },
];

function faseVisita(lugar: Lugar, fases: Destino3d['fases'], t: number): string | null {
  const [estado] = statusLugar(lugar, t);
  if (['futuro', 'ausente', 'removido', 'submerso'].includes(estado)) return null;
  const fase = faseAtual(lugar, t);
  return fases ? (fase ? fases[fase.de] ?? null : null) : estado;
}
