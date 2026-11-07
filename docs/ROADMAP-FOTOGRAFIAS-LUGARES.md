# Roadmap — fotografias dos reinos e lugares

Atualizado em **7 de novembro de 2026**. Plano para um **painel de fotografias** no OpenArda: imagens realistas dos reinos, cidades e paisagens, geradas por uma API de criação de imagens a partir das descrições de Tolkien e ligadas à linha do tempo do atlas.

## Objetivo

Hoje o atlas mostra onde fica cada lugar e o que aconteceu com ele. As fotografias mostram **como ele era naquela época**. Por isso, cada imagem pertence a um lugar e a um momento. Gondolin íntegra (400 P.E.) e Gondolin destruída (510 P.E.) são duas fotos diferentes, e o painel exibe a que corresponde ao período selecionado na linha do tempo.

As imagens são **interpretações geradas por IA**. Elas seguem o que Tolkien descreve e preenchem o resto como reconstrução artística, e a interface sempre identifica o que é cada coisa, como já fazem as fichas e os retratos.

## Ponto de partida

- **130 lugares** em [data/lugares.json](../data/lugares.json), muitos com fases (ativo, ruína, destruído, submerso, removido) e campo `aspectos`, que já separa o descrito do artístico.
- **25 reinos** em [data/reinos.json](../data/reinos.json), cada um com capitais por período.
- Precedentes no projeto:
  - os retratos ([ROADMAP-RETRATOS-PERSONAGENS.md](ROADMAP-RETRATOS-PERSONAGENS.md)), com o fluxo pesquisa → prompt → geração → WebP → cadastro por ID;
  - a árvore em tela cheia, cujo padrão de camada sobre o mapa serve para a galeria;
  - os detalhes em 3D ([ROADMAP-REINOS-3D.md](ROADMAP-REINOS-3D.md)), com as mesmas fases temporais.

## Ordem das entregas

As etapas indicam prioridade, sem datas prometidas. Cada etapa é produzida em lotes de **4 a 6 fotos**, com revisão antes do lote seguinte. A primeira etapa inclui o painel; as demais só acrescentam imagens e dados.

| Etapa | Escopo | Fotos | Total | Situação |
| --- | --- | ---: | ---: | --- |
| 1 | Painel + vitrine: os lugares mais conhecidos, uma época cada | 8 | 8 | Prompts prontos (abaixo) |
| 2 | Antes e depois: os mesmos lugares em outras fases | 12 | 20 | Âncoras definidas |
| 3 | Beleriand e a Primeira Era | 12 | 32 | Âncoras definidas |
| 4 | Aman e Númenor | 10 | 42 | Âncoras definidas |
| 5 | Terceira Era: reinos e lugares restantes | 18 | 60 | Lista definida |
| 6 | Regiões e paisagens (florestas, montanhas, mares) | ~15 | ~75 | A planejar |

"Âncoras" são as características que o prompt deve conter, com fonte. O prompt final de cada etapa é escrito e revisado no início dela, no mesmo formato da etapa 1.

## O painel na interface

### Onde as fotos aparecem

1. **Ficha do lugar.** Uma foto de destaque no topo, a da época atual da linha do tempo, com miniaturas das outras épocas. Se não houver foto da época atual, aparece a mais próxima, com o aviso "Imagem de 400 P.E." e o botão **Ir a esta época**.
2. **Ficha do reino.** Usa a foto da capital vigente (campo `capitais`, que já é datado) ou uma foto própria do reino, se existir.
3. **Painel de fotografias**, novo botão **Fotografias** no topo e no menu ☰. Abre em tela cheia, como a árvore genealógica, com uma grade dos lugares que existem na época atual, agrupados por reino. Há uma opção para ver todas as épocas.
4. **Visualizador** (lightbox) em tela cheia, com:
   - a foto grande e a legenda;
   - o que é descrito por Tolkien, com a fonte, e o que é interpretação;
   - os botões **Ver no mapa** (voa até o lugar), **Abrir ficha** e **Ir a esta época**;
   - setas e teclado para passar de foto, e Esc para fechar.

### Regras

- Toda foto exibe o selo **"Imagem gerada por IA, interpretação a partir de Tolkien"** e o texto alternativo.
- A troca de época na linha do tempo troca a foto. A transição de catástrofes (a Queda de Númenor, a submersão de Beleriand) mostra a foto do "depois" quando ela existir.
- Lugares removidos do mundo (Aman depois de 3319 S.E.) mostram a última foto com a nota "Retirado dos círculos do mundo".
- As fotos são carregadas sob demanda, com dimensões declaradas e um estado vazio legível enquanto carregam.

### Dados: `data/fotografias.json`

Um cadastro por foto, ligado aos IDs existentes. O formato segue `retratos.json`:

```json
{
  "id": "minas-anor-te3018",
  "lugar": "minas-anor",
  "quando": "TE:3018",
  "de": "TE:2872",
  "ate": "TE:3019",
  "titulo": "Minas Tirith ao amanhecer",
  "documentado": ["Sete níveis com muralha e portão cada; portões alternados", "..."],
  "inferido": ["..."],
  "artistico": ["Casas, ruas e vegetação", "..."],
  "fontes": [{ "fonte": "sda", "local": "Livro V, cap. 1" }],
  "imagem": "fotografias/minas-anor-te3018.webp",
  "alt": "Minas Tirith ao amanhecer, vista do Pelennor...",
  "prompt": "docs/fotografias-etapa-1-prompts.json#minas-anor-te3018",
  "geracao": { "api": "...", "modelo": "...", "data": "2026-11-..", "tentativas": 2 }
}
```

- `quando` é o momento retratado.
- `de` e `ate` dão o intervalo em que a foto vale, normalmente a fase do lugar que contém `quando`. Quando omitidos, valem os limites dessa fase.
- Um campo opcional `reino` permite fotos de reino que não são de uma cidade (Rohan, o Condado).
- `scripts/validate-data.mjs` ganha verificações para:
  - lugar ou reino existente;
  - `quando` válido e dentro do período do lugar;
  - arquivo presente;
  - pelo menos uma fonte.

### Código previsto

| Arquivo | Papel |
| --- | --- |
| `src/core/fotografias.ts` | Carrega o cadastro; `fotosDoLugar(id, t)` e `fotosDoReino(id, t)` devolvem a foto vigente e as outras épocas, reutilizando `tempo.valido`. |
| `src/ui/fotografias.ts` | HTML do destaque nas fichas, da grade do painel e do visualizador. |
| `src/ui/interface.ts` | Botão **Fotografias**, camada em tela cheia e teclado, no mesmo padrão de `#arvore-tela`. |
| `tests/fotografias.test.ts` | Foto certa por época, fallback para a época mais próxima, foto da capital no reino, cadastro × arquivos. |

## Geração das imagens

### Fluxo por lote

| Passo | Entrega verificável |
| --- | --- |
| Pesquisa | Para cada foto: lugar, época, ponto de vista, características descritas com obra e capítulo, e o que fica como interpretação. Reaproveitar os `aspectos` de `lugares.json`. |
| Prompt | Uma entrada em `docs/fotografias-etapa-N-prompts.json`, com prompt base, prompt da foto, câmera e restrições. |
| Geração | Duas a quatro variações por foto. Escolher uma e refazer só o que falhar na revisão. |
| Revisão | Checklist abaixo. Reprovar e regerar em vez de "consertar" na legenda. |
| Preparação | WebP 1536 × 1024 (paisagem 3:2), alvo de **250 KiB**. Guardar o original fora do bundle. |
| Cadastro | Entrada em `data/fotografias.json` com documentado, inferido, artístico, fontes, alt e dados da geração. |
| Integração | Foto visível na ficha e no painel, na época certa. Validação de dados, testes e build aprovados. |

### A API

- **Quem chama a API:** um script de desenvolvimento, `scripts/gerar-fotografias.mjs`, nunca o navegador. As imagens aprovadas entram no repositório como arquivos estáticos em `public/fotografias/`, e o atlas publicado não chama a API nem precisa de chave.
- **Provedor:** a escolha fica em aberto, por exemplo a API de imagens da OpenAI ou o Imagen, do Google. Antes da etapa 1:
  - conferir o modelo atual, o preço por imagem, os tamanhos disponíveis e a saída em WebP;
  - medir o custo real do primeiro lote antes de estimar o resto.
- **Chave:** apenas em variável de ambiente local (ex.: `IMAGENS_API_KEY`), nunca em código, `.env` versionado ou cliente.
- **O script:**
  - lê o arquivo de prompts da etapa e gera as variações em `fontes-imagens/<id>/` (fora do git, que deve entrar no `.gitignore`);
  - registra modelo, data e parâmetros;
  - não sobrescreve uma foto aprovada sem a opção `--refazer`.
- **Dependências:** pedir a saída já em WebP no tamanho final. Se a API não oferecer isso, converter com uma ferramenta de linha de comando instalada na máquina, sem acrescentar dependências ao projeto.

### Direção visual comum (prompt base)

Os prompts ficam em **inglês**, porque os modelos de imagem respondem melhor nessa língua. A documentação e as legendas ficam em português.

```
Photorealistic landscape photograph of an imagined place, as if taken on location in the real world.
Full-frame camera, natural lens (24–50 mm), 3:2 landscape, 1536x1024. Realistic geology, vegetation,
weather, water and stone. Pre-industrial world: no modern buildings, roads, vehicles, power lines,
contrails, plastic or modern clothing. People, if any, only as small distant figures in simple
pre-modern dress. No text, letters, logos, signatures, watermarks or frames. No visible magic glow
unless the scene describes a light source. Not in the style of any specific artist, illustrator,
film or game; do not imitate known production designs.
```

Regras que valem para todos os prompts:

1. **Luz da época.** Esta é a regra que mais afeta o realismo.
   - **Anos das Lâmpadas:** a luz das duas Lâmpadas.
   - **Anos das Árvores:** não existem Sol nem Lua. Aman recebe a luz de prata (Telperion) e de ouro (Laurelin), e a Terra-média fica sob as estrelas.
   - **A partir da Primeira Era:** Sol e Lua.
2. **Geografia coerente com o mapa do atlas.** O ponto de vista e a direção da luz devem bater com a Grade de Arda. Exemplos: o Mindolluin fica a oeste de Minas Tirith; Edoras fica ao norte das Ered Nimrais; Tirion fica na Calacirya, com o mar a leste.
3. **Escala descrita.** Usar as medidas que Tolkien dá:
   - 700 pés até a Cidadela de Minas Tirith;
   - 50 braças da Torre Branca;
   - 500 pés de Orthanc.
4. **Paráfrase, nunca citação.** Os prompts descrevem com palavras próprias e não copiam trechos dos livros.
5. **Sem referência a filmes ou artistas.** Os retratos usam os atores dos filmes de Peter Jackson por preferência registrada em [AGENTS.md](../AGENTS.md), mas essa preferência trata de rostos. Para os lugares, a base é o texto de Tolkien, como foi pedido. Os prompts não devem citar filmes, locações nem ilustradores. Se o usuário quiser outra direção, registrar no AGENTS.md antes da etapa 1.

### Checklist de revisão

- [ ] Tudo o que está em "documentado" aparece e está certo (número de níveis, cores, materiais, posição relativa).
- [ ] Nada contradiz o texto: Sol nos Anos das Árvores, telhado errado de Meduseld, muralhas onde não há.
- [ ] Sem anacronismos nem objetos modernos; sem texto ou letras inventadas legíveis.
- [ ] Geografia coerente com o atlas (montanha do lado certo, direção da luz).
- [ ] Sem semelhança evidente com imagens de filmes ou obras de artistas conhecidos.
- [ ] Funciona como miniatura (480 px) e em tela cheia; sem deformações nas bordas.
- [ ] Legenda, `alt` e a divisão documentado/inferido/artístico preenchidos.

## Etapa 1 — vitrine (prompts prontos)

Oito lugares conhecidos, bem descritos e, em três casos, já presentes em 3D, o que permite comparar foto e modelo. Os prompts abaixo acrescentam ao prompt base o assunto e o enquadramento. Na produção, cada um vira uma entrada de `docs/fotografias-etapa-1-prompts.json`.

### 1. Minas Tirith — 3018 T.E. (`minas-anor`)

- **Documentado** (*SdA* Livro V, cap. 1):
  - sete níveis escavados na colina, cada um com muralha e portão;
  - portões em direções alternadas;
  - uma proa de rocha que corta os círculos até o topo;
  - a Cidadela a 700 pés da planície e a Torre Branca de Ecthelion;
  - a muralha externa negra;
  - o Mindolluin atrás e o Pelennor à frente.
- **Artístico:** casas, ruas, nuvens, estação do ano.

```
Subject: a great fortified city of white stone built into the eastern face of a mountain spur at sunrise.
Seven concentric tiers climb the hill, each ringed by its own white wall with a gate, the gates of
successive tiers offset to alternate sides. A colossal natural prow of rock juts eastward from the hill
like the keel of a ship, splitting every tier except the lowest and rising to the summit. On the summit
a citadel about 700 feet above the plain, crowned by one slender, very tall white tower (about 300 feet)
with a pinnacle. The outermost wall at the foot of the hill is black, smooth and unscalable. Behind the
city rises a dark, massive mountain with purple shadows. Foreground: a wide green plain with farmsteads,
a few poplars and a distant low outer wall around the fields. Viewpoint from the plain to the east,
looking west, low morning sun lighting the white stone. Calm, clear early-spring air.
```

### 2. Edoras — 3018 T.E. (`edoras`)

- **Documentado** (*SdA* Livro III, cap. 6):
  - colina verde junto a um riacho que sai do vale das montanhas;
  - fosso, muralha forte e cerca de espinhos;
  - casas na encosta;
  - no alto, num terraço verde, o grande salão Meduseld, cujo telhado parece de ouro e brilha de longe;
  - as Ered Nimrais nevadas atrás;
  - túmulos dos reis ao lado do caminho, cobertos de flores brancas (simbelmynë).
- **Artístico:** o tamanho da colina, o número de casas e a forma exata do salão.

```
Subject: a hill-town of wooden halls on an isolated green hill at the mouth of a mountain valley.
The hill is ringed by a ditch, a strong earthen and stone wall and a fence of thorns. Timber houses
with thatched roofs climb its slopes. On the summit, on a raised green terrace reached by a stone stair,
stands one long great hall of carved timber whose thatched roof gleams like gold in the sun, visible
from far away. Behind rise high snow-capped mountains; a clear, cold stream runs past the hill.
Foreground: a road leading to the gates between two rows of grassy burial mounds, their slopes
sprinkled with small white star-like flowers. Viewpoint on the road among the mounds, looking south
toward the hill and the mountains, bright morning, wind in the grass.
```

### 3. Gondolin — 400 P.E. (`gondolin`)

- **Documentado:**
  - a cidade sobre a colina de Amon Gwareth, no meio da planície de Tumladen, cercada pelo anel de montanhas Echoriath;
  - muralhas brancas, escadarias, fontes, a Torre do Rei;
  - fonte: *O Silmarillion*, cap. 15 e 23.
- **Inferido:**
  - a vista de quem chega pela passagem nas montanhas, como Tuor;
  - fonte: *Contos Inacabados*, "De Tuor e sua chegada a Gondolin".
- **Artístico:** a planta urbana e os volumes.

```
Subject: a hidden white city on a rocky hill rising from the middle of a wide, perfectly round green
plain, entirely enclosed by a ring of steep, snow-capped mountains with no visible pass. The city is
pale white stone with high walls, many stairs, terraces, fountains catching the light and one tall
white tower at its heart. The plain is green meadow with a few groves and streams. Viewpoint from high
on the inner slope of the encircling mountains, as if just emerging from a hidden ravine, looking down
and across the plain toward the city at dawn, the sun rising over the eastern peaks.
```

### 4. Imladris (Valfenda) — 3018 T.E. (`imladris`)

- **Documentado:**
  - um vale estreito e escondido que surge de repente no planalto;
  - descida íngreme;
  - o som do rio Bruinen e de cachoeiras;
  - pinheiros e árvores nas encostas;
  - a casa de Elrond no fundo do vale, com luzes ao entardecer;
  - fontes: *O Hobbit*, cap. 3; *SdA* Livro II, cap. 1.
- **Artístico:** a arquitetura da casa e a estação (outono, pela data do Conselho).

```
Subject: a deep, narrow hidden valley opening suddenly below the edge of a bare upland moor. Steep
slopes covered with pines and autumn-coloured broadleaf trees, a fast river in a rocky bed at the
bottom and several waterfalls falling from the valley sides. On a shelf above the river, a large,
graceful but unfortified house of pale stone and timber with terraces, porches and gardens, its windows
lit warmly in the dusk. Viewpoint from the rim of the valley at the top of a steep winding path,
looking down into it in late autumn, golden evening light and mist over the river.
```

### 5. Lothlórien (Caras Galadhon) — 3019 T.E. (`lothlorien`)

- **Documentado** (*SdA* Livro II, cap. 6–7):
  - os mallorns, de casca lisa cinza-prateada, cujas folhas douradas ficam nas árvores no inverno e só caem na primavera;
  - Caras Galadhon numa colina com as maiores árvores, cercada por um fosso e um muro verde;
  - lâmpadas nas árvores ao anoitecer;
  - plataformas nas copas.
- **Artístico:** a forma das plataformas e das escadas.

```
Subject: a city built in a grove of gigantic smooth-barked trees on a low hill. The trees have pale
silver-grey trunks rising like pillars and crowns of golden leaves, still on the branches in winter,
with a carpet of fallen gold on the ground. Around the hill runs a deep green ditch and a high green
earthen wall with a single white bridge-like entrance. High among the branches, wooden platforms and
white ladders; at dusk, many small lamps of silver, green and gold glow among the leaves. Viewpoint
outside the green wall at twilight, looking up at the hill of trees, cool winter air, soft mist.
```

### 6. Khazad-dûm, a Porta Oeste — 3019 T.E. (`khazad-dum`)

- **Documentado** (*SdA* Livro II, cap. 4):
  - as Portas de Durin numa parede de rocha lisa;
  - dois azevinhos dos lados;
  - diante delas, um lago escuro e parado formado pelo represamento de um riacho;
  - desenhos de prata (ithildin) visíveis só à luz da lua e das estrelas: árvores, estrelas, coroa, martelo e bigorna.
- **Artístico:** a textura da rocha. A inscrição aparece como ornamento ilegível.

```
Subject: a sheer, smooth cliff face at the foot of great mountains at night under a bright moon. In the
cliff, the outline of tall closed doors, invisible as stone except for delicate glowing silver tracery
drawn on the rock: an arch, two trees, a crown above seven stars, a hammer and anvil and a central
star, plus decorative abstract script that is not legible. Two old holly trees stand at either side of
the doors. In front, a dark, still, stagnant lake fills the hollow, reflecting the moonlight. Viewpoint
from the shore of the lake, cold, silent, slightly ominous atmosphere, no figures.
```

### 7. Argonath — 3019 T.E. (`argonath`)

- **Documentado** (*SdA* Livro II, cap. 9):
  - duas estátuas imensas de reis sobre pináculos de rocha, uma de cada lado do Anduin;
  - a mão esquerda erguida com a palma para fora, em advertência, e um machado na direita;
  - elmos e coroas gastos pelo tempo;
  - o rio estreito e rápido entre penhascos.
- **Artístico:** os rostos e o estado exato do desgaste.

```
Subject: two colossal ancient stone statues of crowned kings, tall as towers, carved from pinnacles of
rock standing in a great river on either side of a narrow gorge. Each holds the left hand raised with
the palm outward in a gesture of warning and an axe in the right hand; helmets and crowns are weathered
and cracked, stained by ages of rain. The river runs swift and deep between sheer cliffs. Viewpoint low
on the water, from a small grey boat approaching the statues, looking up at them under an overcast
sky, spray and mist.
```

### 8. Tirion sob as Árvores — Anos das Árvores (`tirion`)

- **Documentado** (*O Silmarillion*, cap. 5):
  - a cidade de muralhas e terraços brancos no alto da colina de Túna, na fenda da Calacirya;
  - a torre de Ingwë, Mindon Eldaliéva, com uma lâmpada de prata que brilha longe sobre o mar;
  - a luz das Árvores passa pela Calacirya até a baía.
- **Documentado por regra da época:** não há Sol nem Lua, só a luz de prata e ouro e as estrelas.
- **Artístico:** a arquitetura e a vegetação.

```
Subject: a city of white walls and terraces on a green hill rising inside a deep cleft between immense
mountains, seen from the sea. At the city's summit, one very slender, very tall white tower with a
silver lamp burning at its top, its beam reaching far over the water. There is no sun and no moon: the
light comes from beyond the mountains through the cleft, a soft mingling of silver and pale gold that
falls on the city and spills out across a calm bay, while the sky above is deep blue with bright stars.
Viewpoint from the water of the bay, looking west into the cleft. Serene, luminous, timeless.
```

## Etapa 2 — antes e depois (âncoras)

Os mesmos lugares em outras fases, para que a troca de época no atlas também troque a foto.

| Foto | Quando | Âncoras com fonte |
| --- | --- | --- |
| Gondolin em ruínas | PE 510 | Muralhas brancas quebradas, torre caída, fumaça sobre Tumladen; *Silm.* cap. 23 |
| Edoras no Longo Inverno | TE 2758 | Neve funda sobre a colina e os telhados; *SdA* Apêndice A, II |
| Isengard antes de Saruman | TE 2700 | Orthanc (torre negra de 500 pés, quatro pilares, rocha inquebrável), círculo de rocha, gramados e árvores; *SdA* Livro III, cap. 8 |
| Isengard industrial | TE 3018 | O mesmo círculo com poços, forjas, fumaça e árvores cortadas; idem |
| Isengard inundada | TE 3019 | Água e vapor dentro do círculo depois dos Ents; Orthanc intacta; idem, cap. 9 |
| Osgiliath íntegra | TE 1000 | Cidade dos dois lados do Anduin, a grande ponte de pedra e a Cúpula das Estrelas; *SdA* Apêndice A, I (iv) |
| Osgiliath em ruínas | TE 3018 | Ponte partida, casas vazias; *SdA* Livro V |
| Minas Ithil | TE 1000 | Torre branca da Lua no Vale; Apêndice A |
| Minas Morgul | TE 3018 | Luz pálida de cadáver, a torre de topo giratório; *SdA* Livro IV, cap. 8 |
| Barad-dûr | TE 3018 | Fortaleza imensa de ferro e trevas, vista ao longe entre nuvens; *SdA* Livro VI |
| Armenelos e o Meneltarma | SE 3000 | Cidade dos reis no centro da ilha, montanha com o santuário vazio no topo; *Akallabêth*, *Contos Inacabados* |
| A Queda de Númenor | SE 3319 | Onda gigantesca e o Meneltarma afundando; *Akallabêth* |

## Etapa 3 — Beleriand e a Primeira Era (âncoras)

| Foto | Quando | Âncoras |
| --- | --- | --- |
| Menegroth | PE 400 | Mil cavernas, ponte sobre o Esgalduin, pilares esculpidos como faias; *Silm.* cap. 10 |
| Nargothrond | PE 400 | Portas na margem do Narog e a ponte que Túrin mandou construir (antes de 495); *Silm.* cap. 13 e 21 |
| Thangorodrim e Angband | PE 400 | Três picos de escória e fumaça sobre os portões; *Silm.* cap. 9 e 13 |
| Himring | PE 400 | Colina fortificada, sempre fria; *Silm.* cap. 14 |
| Tol Sirion | PE 400 | Torre de Finrod na ilha do Sirion; *Silm.* cap. 15 |
| Portos do Sirion | PE 530 | Refúgio na foz, navios de Eärendil; *Silm.* cap. 24 |
| Brithombar | PE 400 | Porto amuralhado de Círdan; *Silm.* cap. 10 e 20 |
| Vinyamar | PE 60 | Casas de pedra de Turgon junto ao mar, sob o Monte Taras; *Contos Inacabados* |
| Anfauglith | PE 460 | Planície queimada depois da Bragollach; *Silm.* cap. 18 |
| Nan Elmoth | PE 300 | Floresta escura e silenciosa; *Silm.* cap. 16 |
| Cabed-en-Aras | PE 501 | Garganta do Teiglin; *Silm.* cap. 21 |
| Doriath | PE 400 | Florestas de Neldoreth e Region; *Silm.* cap. 10 e 14 |

## Etapa 4 — Aman e Númenor (âncoras)

| Foto | Quando | Âncoras |
| --- | --- | --- |
| Ezellohar e as Duas Árvores | AA | Telperion (prata) e Laurelin (ouro) no monte verde, luz que cresce e míngua; *Silm.* cap. 1 |
| Valmar | AA | Cidade dos Valar, de muitos sinos; *Silm.* cap. 1 |
| Taniquetil | AA | Montanha mais alta, com os salões de Manwë no topo; *Silm.* Valaquenta |
| Alqualondë | AA | Porto dos Cisnes, arco de rocha, navios em forma de cisne, pérolas; *Silm.* cap. 5 |
| Avallónë em Tol Eressëa | AA | Porto e torre voltados para o leste; *Silm.* Akallabêth |
| A Calacirya | AA | Fenda nas Pelóri por onde a luz chega ao mar; *Silm.* cap. 5 |
| Escurecimento de Valinor | AA | As Árvores mortas, a Não-Luz de Ungoliant; *Silm.* cap. 8 |
| O Helcaraxë | AA | Gelo moído e névoas entre Araman e a Terra-média; *Silm.* cap. 9 |
| Rómenna | SE 3000 | Porto oriental dos Fiéis; *Akallabêth* |
| Andúnië | SE 3000 | Porto ocidental, senhorio dos Fiéis; *Akallabêth* |

## Etapa 5 — Terceira Era, reinos e lugares restantes

O Condado; Bri; Erebor e Valle; Esgaroth; a Floresta das Trevas; Dol Guldur; Fangorn; o Abismo de Helm; Pelargir; Dol Amroth; Annúminas; Fornost; Amon Sûl (Topo do Vento); Carn Dûm; Orodruin; o planalto de Gorgoroth; Rauros; Emyn Beraid e Mithlond. Âncoras a pesquisar no início da etapa, com prioridade para os reinos que ainda não têm foto da capital.

## Etapa 6 — regiões e paisagens

Florestas, cordilheiras, mares e regiões que hoje só existem como áreas no mapa: as Hithaeglir, as Ered Nimrais, as Pelóri, Belegaer, Mar de Rhûn, os Pântanos Mortos. Útil para a consulta "o que havia aqui?" em lugares sem cidade.

## Casos que precisam de decisão própria

| Caso | Tratamento previsto |
| --- | --- |
| Lugares nunca descritos em detalhe (Nogrod, Carn Dûm, Umbar) | Gerar só depois de registrar o que se sabe. Na legenda, a foto aparece como predominantemente artística. |
| Interiores (Menegroth, Khazad-dûm, Aglarond) | Uma foto de exterior primeiro. Interiores ficam para depois do modo de corte dos detalhes 3D. |
| Sauron, o Olho, o Balrog e criaturas | Fora das fotos de lugar. Paisagens não incluem figuras sobrenaturais em primeiro plano. |
| Aman depois de 3319 S.E. | Sem foto nova: a última foto com a nota "Retirado dos círculos do mundo". |
| Versões divergentes (forma de Gondolin, posição de portões) | Seguir *O Silmarillion* publicado, como o resto do atlas, e registrar a alternativa na nota. |
| Fotos de batalhas | Retratar o lugar depois do acontecimento (ruínas, fumaça), não a batalha em si. |

## Critérios para concluir uma etapa

- Todas as fotos da etapa estão aprovadas pelo checklist, cadastradas e visíveis na ficha e no painel, na época certa.
- Cada foto tem documentado, inferido e artístico preenchidos, com fontes, e um `alt` que descreve a cena.
- `npm run build` passa (validação de dados, tipos, testes e build).
- Conferência visual no computador e no celular, incluindo a troca de época na linha do tempo.
- Três números acompanhados por etapa: **pesquisadas**, **geradas e aprovadas**, **integradas**. Um prompt pronto não conta como foto.

## Limites deste roadmap

Os prompts da etapa 1 estão prontos, mas **nenhuma imagem foi gerada**. O painel ainda não existe no código, e as âncoras das etapas 2 a 4 precisam ser conferidas nas edições antes de virar prompt. As fontes listadas foram indicadas a partir de conhecimento prévio das obras e índices; não equivalem a consulta direta ao livro. Custo e prazo dependem da API escolhida e são medidos no primeiro lote.
