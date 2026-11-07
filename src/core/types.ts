// Tipos dos dados do Atlas de Arda. Os dados ficam em /data/*.json, separados
// do código, para que a cobertura possa ser ampliada sem alterar o motor.

export type Pt = [number, number];

/** Grau de certeza de uma informação geográfica ou histórica. */
export type Certeza = 'descrito' | 'inferido' | 'artistico';

export interface FonteRef {
  fonte: string; // id em data/fontes.json
  local?: string; // capítulo, apêndice, mapa, página
  nota?: string;
}

export interface Aspecto {
  aspecto: string; // ex.: "Curso", "Profundidade"
  cert: Certeza;
  nota?: string;
  fontes?: FonteRef[];
}

/** Referência temporal: "SE:3319", "AA:#evento", "#evento", "-inf", "+inf". */
export type TempoRef = string;

export interface Cadeia {
  aspereza?: number;
  pts: Pt[];
}

export interface Feicao {
  id: string;
  tipo:
    | 'terra'
    | 'lago'
    | 'cordilheira'
    | 'pico'
    | 'passo'
    | 'planalto'
    | 'bacia'
    | 'rio'
    | 'floresta'
    | 'bioma'
    | 'gelo'
    | 'estrada'
    | 'zona';
  nome?: string;
  contorno?: (string | Pt)[];
  circulo?: [number, number, number];
  pts?: Pt[];
  em?: Pt;
  h?: number;
  w?: number;
  r?: number;
  piso?: number;
  borda?: number;
  nivel?: number | Certeza;
  cert?: Certeza;
  prof?: number;
  ordem?: number;
  especie?: 'folhosa' | 'conifera' | 'dourada' | 'aman' | 'sombria';
  bioma?: 'pantano' | 'arido' | 'cinzas' | 'neve' | 'exuberante';
  densidade?: number;
  aspereza?: number;
  fechada?: boolean;
  forma?: 'cone' | 'domo';
  de?: TempoRef;
  ate?: TempoRef;
  fontes?: FonteRef[];
  grupo?: string;
  nota?: string;
}

export interface DadosTerreno {
  versao: string;
  grade: {
    nome: string;
    unidade: string;
    origem: string;
    eixos: string;
    descricao: string;
  };
  limites: [number, number, number, number];
  marcos: Marco[];
  cadeias: Record<string, Cadeia>;
  feicoes: Feicao[];
}

export interface Marco {
  id: string;
  nome: string;
  em: Pt;
  descricao: string;
  aparece_em: { mapa: string; como: string }[];
  fontes: FonteRef[];
}

export interface Era {
  id: string;
  nome: string;
  abrev: string;
  datada: boolean;
  inicio?: number;
  fim?: number;
  peso: number;
  cor: string;
  descricao: string;
  nota_datas?: string;
  vista?: Vista;
  cursor_padrao?: TempoRef;
}

export interface Vista {
  x: number;
  y: number;
  d: number; // distância da câmera ao alvo (km)
  rumo: number; // graus, 0 = norte
  inclinacao: number; // graus, 0 = vertical
}

export type StatusLugar = 'ativo' | 'ruina' | 'destruido' | 'submerso' | 'abandonado' | 'oculto' | 'removido';

export interface FaseLugar {
  de: TempoRef;
  ate?: TempoRef;
  status: StatusLugar;
  nota?: string;
  evento?: string;
}

export interface Lugar {
  id: string;
  nome: string;
  outros_nomes?: string[];
  tipo: string; // cidade, fortaleza, porto, regiao, ilha, montanha, rio, floresta, colina, passo, lago, mar, reino
  em: Pt;
  area?: Pt[]; // pegada (para toques e para lugares desaparecidos)
  posto: number; // 1 = mais importante (aparece de longe)
  de?: TempoRef;
  ate?: TempoRef;
  fases?: FaseLugar[];
  resumo: string;
  depois?: string; // o que restou no local depois do fim
  reino?: string;
  eventos?: string[];
  fontes?: FonteRef[];
  aspectos?: Aspecto[];
  vista?: Partial<Vista>;
  cert?: Certeza;
  regiao?: boolean;
  notas_versoes?: NotaVersao[];
  feicao?: string;
}

export interface NotaVersao {
  titulo: string;
  texto: string;
  fontes: FonteRef[];
}

export type TipoTerritorio = 'dominio' | 'ocupacao' | 'influencia';
export type Borda = 'documentada' | 'aproximada' | 'difusa';

export interface Territorio {
  de: TempoRef;
  ate?: TempoRef;
  tipo: TipoTerritorio;
  borda: Borda;
  contorno?: Pt[];
  feicao?: string; // usa o contorno de uma feição do terreno
  nota?: string;
  fontes?: FonteRef[];
  rotulo?: string;
}

export interface Reino {
  id: string;
  nome: string;
  outros_nomes?: string[];
  tipo: string;
  cor: string;
  de: TempoRef;
  ate?: TempoRef;
  periodo_texto: string;
  capitais: { lugar: string; de?: TempoRef; ate?: TempoRef; nota?: string }[];
  povos: string[];
  governantes?: { nome: string; nota?: string }[];
  origem: string;
  transformacoes: { quando: TempoRef; texto: string; evento?: string }[];
  destino: string;
  territorios: Territorio[];
  evento_fundacao?: string;
  ultimo_periodo?: TempoRef;
  comparar?: [TempoRef, TempoRef];
  ligacoes?: { texto: string; lugar?: string; reino?: string; quando?: TempoRef; evento?: string }[];
  fontes: FonteRef[];
  notas_versoes?: NotaVersao[];
  em: Pt;
}

export interface Evento {
  id: string;
  era: string;
  ano?: number;
  aprox?: boolean;
  seq?: number; // ordem dentro da era (obrigatória em eras sem datas)
  titulo: string;
  resumo: string;
  lugares?: string[];
  reinos?: string[];
  fontes: FonteRef[];
  cert: Certeza;
  nota_data?: string;
  datas_alternativas?: string;
  vista?: Partial<Vista>;
  importante?: boolean;
}

export interface Fonte {
  id: string;
  titulo: string;
  titulo_original?: string;
  autor: string;
  ano: string;
  tipo: 'primaria' | 'primaria-postuma' | 'mapa' | 'secundaria' | 'indice' | 'institucional';
  edicao_br?: string;
  acesso: 'consultado' | 'indireto' | 'lacuna';
  nota: string;
  versao_legendario?: string;
  url?: string;
}

export interface PassoJornada {
  titulo: string;
  texto: string;
  quando: TempoRef;
  vista: Vista;
  selecionar?: string; // "lugar:id" | "reino:id" | "evento:id"
  hora_arvores?: number;
  comparar?: [TempoRef, TempoRef];
  modo?: 'caminho-reto';
  fontes?: FonteRef[];
}

export interface Jornada {
  id: string;
  titulo: string;
  subtitulo: string;
  passos: PassoJornada[];
}
