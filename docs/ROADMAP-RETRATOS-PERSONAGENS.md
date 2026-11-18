# Roadmap — rostos dos personagens de Tolkien

Atualizado em **18 de novembro de 2026**. Plano de produção para o OpenArda, começando pela família de Fëanor e expandindo para os personagens centrais de *O Silmarillion*, *O Hobbit*, *O Senhor dos Anéis* e textos complementares do legendário.

**Preferência visual do usuário para a etapa 2 e seguintes:** usar os rostos dos atores dos filmes dirigidos por Peter Jackson como referência sempre que houver uma interpretação correspondente. Essa preferência também está registrada em [AGENTS.md](../AGENTS.md) para orientar as próximas sessões de trabalho. Substitui a orientação anterior que evitava semelhança com atores; os prompts e retratos das etapas já entregues permanecem como histórico.

**Preferência de geração atualizada pelo usuário:** usar primeiro a API local configurada no HopeGym (ComfyUI). Se ela estiver indisponível, preferir a API de imagens do GPT. Reutilizar a configuração/cliente existente, sem acrescentar um serviço de geração ao OpenArda nem alterar os dados do HopeGym. Registrar modelo, seed, prompt, referências consultadas e referências efetivamente enviadas à API. Conferir os familiares lado a lado: se a referência induzir cópias do mesmo rosto, usar um briefing textual dos traços e revisar a variação antes de integrar.

## Ponto de partida e objetivo

O catálogo contém **187 personagens, todos com retrato integrado**. As etapas 0 a 10 estão entregues. A etapa 9 acrescentou Eru Ilúvatar e a etapa 10 acrescentou 36 retratos. [Personagens](../data/linhagens.json) · [Retratos](../data/retratos.json) · [Prompts da etapa 9](retratos-etapa-9-prompts.json) · [Prompts da etapa 10](retratos-etapa-10-prompts.json)

O plano contempla **150 personagens únicos**, incluindo os 75 cadastrados no ponto de partida. Os 150 têm retrato. O catálogo também pode crescer com elos genealógicos fora desta seleção. A lista é uma seleção editorial para a biblioteca inicial, não um inventário de todos os personagens de Tolkien. Versões de um mesmo personagem e a extensão de criaturas não entram nessa contagem.

Os filmes de Peter Jackson (*O Senhor dos Anéis* e *O Hobbit*) têm prioridade como referência facial. Personagens que só aparecem em *Os Anéis de Poder* usam o ator da série. O retrato de Gil-galad da etapa 5 registrou Benjamin Walker como referência histórica daquela entrega. Figuras divinas sem interpretação correspondente seguem a direção artística de beleza sem idade, luz própria e motivos associados a cada personagem.

## Ordem das entregas

As etapas indicam prioridade, sem datas prometidas. Dividir cada etapa em lotes de **4 a 6 personagens**, entregando os aprovados antes de iniciar o lote seguinte. A qualidade e a pesquisa do lote determinam o avanço.

| Etapa | Escopo | Personagens na etapa | Total acumulado previsto | Situação |
| --- | --- | ---: | ---: | --- |
| 0 | Fëanor e os sete filhos | 9 | 9 | Criados e cadastrados na interface |
| 1 | Completar a família imediata | 5 | 14 | Integrados e verificados, com amostra no Chrome |
| 2 | Protagonistas de O Senhor dos Anéis | 24 | 38 | 24 integrados e verificados, com amostra no Chrome |
| 3 | Casa de Finwë, Gondolin e Nargothrond | 20 | 58 | 20 integrados e verificados, com amostra no Chrome |
| 4 | Doriath e os Grandes Contos | 20 | 78 | 20 integrados; Thingol e Dior refeitos |
| 5 | Segunda Era e herdeiros de Númenor | 19 | 97 | 19 integrados; Gil-galad, Isildur, Celebrimbor, Míriel e Ar-Pharazôn com referência dos atores |
| 6 | O Hobbit e a linhagem de Durin | 22 | 119 | 22 integrados; 14 com referência dos filmes de O Hobbit |
| 7 | Valar e outras figuras de Aman e da Terra-média | 21 | 140 | 21 integrados; Valar e Maiar refeitos duas vezes (gênero, depois aparência divina) |
| 8 | Completar os elos genealógicos | 10 | 150 | 10 integrados; Galathil e Amroth refeitos |
| 9 | Eru Ilúvatar | 1 | 151 | Integrado como interpretação de uma presença de luz |
| 10 | Criaturas, governantes e outros personagens citados no atlas | 36 | 187 | 36 pesquisados, gerados no FLUX.2 local e integrados |

A conferência no Chrome percorreu as fichas e os retratos ampliados de Finwë, Aragorn e Fingolfin, em 1280 × 800 e em 390 × 844. A validação automatizada cobre o cadastro e os arquivos do conjunto.

### Etapa 0 — Fëanor e os sete filhos

**Personagens (9):** Fëanor; Nerdanel; Maedhros; Maglor; Celegorm; Caranthir; Curufin; Amrod; Amras.

**Entrega:** Preservar a identidade visual dos nove retratos; acompanhar a integração já em andamento.

### Etapa 1 — Completar a família imediata

**Personagens (5):** Finwë; Míriel Serindë; Indis; Mahtan; Celebrimbor.

**Entrega realizada:** cinco retratos gerados e integrados pelo cadastro existente, com fontes, inferências e notas de versão. Os testes verificam a imagem na ficha e no cartão de cada personagem; o build e o carregamento dos arquivos passaram.

### Etapa 2 — Protagonistas de O Senhor dos Anéis

**Personagens (24):** Galadriel; Celeborn; Elrond; Arwen; Aragorn II Elessar; Frodo; Samwise Gamgi; Meriadoc Brandebuque; Peregrin Tûk; Gandalf; Legolas; Gimli; Boromir; Bilbo; Faramir; Denethor II; Théoden; Éomer; Éowyn; Saruman; Gollum/Sméagol; Sauron; Rei-bruxo de Angmar; Gríma Língua de Cobra.

**Entrega realizada:** 24 personagens pesquisados, 24 retratos criados e 24 integrados/verificados automaticamente, com atores, filmes, épocas e diferenças literárias registrados. Gandalf foi concluído pela API local do HopeGym durante a entrega da etapa 3. Os WebP têm 512 × 512 e menos de 100 KiB. Consulte a [galeria e as notas da etapa 2](RETRATOS-ETAPA-2.md) e os [prompts utilizados](retratos-etapa-2-prompts.json).

### Etapa 3 — Casa de Finwë, Gondolin e Nargothrond

**Personagens (20):** Fingolfin; Finarfin; Olwë; Eärwen; Fingon; Turgon; Elenwë; Aredhel; Idril Celebrindal; Eöl; Maeglin; Finrod Felagund; Orodreth; Angrod; Aegnor; Finduilas de Nargothrond; Anairë; Glorfindel; Ecthelion da Fonte; Voronwë.

**Entrega realizada:** 20 personagens pesquisados, 20 retratos criados e 20 integrados/verificados automaticamente, usando ComfyUI/FLUX.2 Klein 9B local. Foram acrescentadas as fichas de Anairë, Glorfindel, Ecthelion e Voronwë; Anairë foi ligada aos três filhos já cadastrados. Glorfindel usa Jarl Benzon como referência facial, com a ressalva da identificação em material de cartas/divulgação; os demais seguem fontes literárias e variação familiar. Os arquivos têm 512 × 512 e menos de 100 KiB. Build aprovado com 152 testes; miniaturas inspecionadas. Veja a [galeria e as decisões da etapa 3](RETRATOS-ETAPA-3.md) e os [prompts e parâmetros](retratos-etapa-3-prompts.json).

### Etapa 4 — Doriath e os Grandes Contos

**Personagens (20):** Elu Thingol; Melian; Lúthien; Beren; Barahir; Dior; Nimloth; Elwing; Eärendil; Elros Tar-Minyatur; Húrin; Morwen Eledhwen; Túrin Turambar; Niënor Níniel; Huor; Rían; Tuor; Beleg Cúthalion; Gwindor; Haleth.

**Entrega:** Ligar os Grandes Contos à linhagem de Eärendil e dos Meio-Elfos.

### Etapa 5 — Segunda Era e herdeiros de Númenor

**Personagens (19):** Gil-galad; Círdan; Elendil; Isildur; Anárion; Ar-Pharazôn; Amandil; Meneldil; Valandil, filho de Isildur; Arathorn II; Gilraen; Celebrían; Elladan; Elrohir; Eldarion; Tar-Aldarion; Erendis; Tar-Ancalimë; Tar-Míriel.

**Entrega:** Mostrar a continuidade entre os reinos da Segunda Era e seus herdeiros.

### Etapa 6 — O Hobbit e a linhagem de Durin

**Personagens (22):** Thorin Escudo de Carvalho; Balin; Dwalin; Fíli; Kíli; Glóin; Óin; Dori; Nori; Ori; Bifur; Bofur; Bombur; Dáin II Pé de Ferro; Bard; Thranduil; Beorn; Durin I; Thrór; Thráin II; Azog; Bolg.

**Entrega:** Completar a companhia de Thorin, a família de Durin e os personagens centrais da jornada.

### Etapa 7 — Valar e outras figuras de Aman e da Terra-média

**Personagens (21):** Manwë; Varda; Ulmo; Aulë; Yavanna; Námo/Mandos; Vairë; Irmo/Lórien; Estë; Nienna; Oromë; Vána; Tulkas; Nessa; Melkor/Morgoth; Eönwë; Ossë; Uinen; Radagast; Tom Bombadil; Fruta d'Ouro.

**Entrega:** Tratar manifestações dos Ainur e personagens singulares com critérios próprios.

### Etapa 8 — Completar os elos genealógicos

**Personagens (10):** Elmo; Galadhon; Galathil; Eluréd; Elurín; Galdor de Dor-lómin; Amdír; Amroth; Findis; Írimë/Lalwen.

**Entrega:** Fechar os retratos do catálogo genealógico atual e acrescentar as duas filhas de Indis.

### Etapa 10 — Criaturas, governantes e personagens citados no atlas

Em 18 de novembro de 2026, seis lotes de seis foram gerados no ComfyUI local com FLUX.2 klein 9B. Os 36 retratos aprovados têm WebP de 512 × 512 e miniaturas de 192 × 192. O catálogo registra o modelo e a seed de cada imagem. O arquivo de prompts registra a variante aprovada e os fotogramas enviados ao ComfyUI. [Catálogo de retratos](../data/retratos.json) · [Prompts da etapa 10](retratos-etapa-10-prompts.json)

Smaug usa a anatomia do dragão de Weta Digital. Girion e Tar-Palantir usam os rostos de Luke Evans e Ken Blackburn nas cenas correspondentes. As imagens finais reconstroem os retratos com enquadramento próprio. [Smaug](https://www.fxguide.com/fxfeatured/meet-smaug/) · [Girion](https://tolkiengateway.net/wiki/File:The_Hobbit_-_The_Desolation_of_Smaug_-_Girion.jpg) · [Tar-Palantir](https://tolkiengateway.net/wiki/File:The_Rings_of_Power_(TV_series)_-_Tar-Palantir.png)

## Etapa 1 entregue: pesquisa dos cinco rostos

As informações abaixo foram conferidas em índices especializados, que remetem aos textos de Tolkien. As passagens e decisões adotadas estão em data/retratos.json e na documentação da etapa 1. Consulta por remissão não equivale a consulta direta ao livro.

| Personagem | Base para a criação | Dependência ou decisão antes de gerar |
| --- | --- | --- |
| Finwë | Cabelo negro e longo; olhos azul-acinzentados. [Referência](https://tolkiengateway.net/wiki/Finw%C3%AB). | Comparar com Fëanor e Curufin já criados, preservando um rosto próprio. |
| Míriel Serindë | Há descrições de cabelo prateado e de cabelo escuro em textos diferentes. [Referência](https://tolkiengateway.net/wiki/M%C3%ADriel). | Escolher uma tradição textual para o retrato principal e registrar a alternativa; não chamar uma das cores de certeza universal. |
| Indis | Cabelo dourado e porte alto. [Referência](https://tolkiengateway.net/wiki/Indis). | Estabelecer uma referência visual para Finarfin e sua descendência, sem transformar parentes em cópias. |
| Mahtan | Cabelo castanho-avermelhado, barba e diadema de cobre. [Referência](https://tolkiengateway.net/wiki/Mahtan). | Usar Nerdanel, Maedhros e os gêmeos como referências familiares; preservar a barba descrita, sem aplicar uma regra genérica de elfos imberbes. |
| Celebrimbor | A linha Curufin → Celebrimbor é a adotada no catálogo do projeto. [Referência para pesquisa](https://tolkiengateway.net/wiki/Celebrimbor). | Partir do retrato de Curufin; características físicas não localizadas na pesquisa devem ficar como inferidas, com nota sobre variantes de origem quando pertinentes. |

O lote **Finwë → Míriel → Indis → Mahtan → Celebrimbor** foi criado preservando os nove rostos anteriores. Míriel usa a tradição de cabelo prateado, com a alternativa escura registrada; a semelhança de Celebrimbor com Curufin é identificada como inferência. Os prompts completos estão em [retratos-etapa-1-prompts.json](retratos-etapa-1-prompts.json).

## Como pesquisar e decidir a aparência

1. **Fixar identidade e época.** Usar o ID existente quando houver cadastro. Escolher a fase de vida representada e resolver homônimos: Míriel Serindë e Tar-Míriel, Finduilas de Nargothrond e Finduilas de Dol Amroth, Galdor de Dor-lómin e o Galdor de Gondolin são pessoas distintas.
2. **Levantar características explícitas.** Registrar cabelo, olhos, pele, idade aparente, barba, cicatrizes e traços particulares somente quando sustentados pela passagem consultada. Citar obra, capítulo/seção, edição e página quando disponível; não inventar referências.
3. **Separar descrição de inferência.** Na falta de descrição individual, usar variações dos parentes com ligação documentada. Se nenhum parente fornecer base suficiente, registrar a escolha como reconstrução artística. “Não localizado nas fontes consultadas” é diferente de “Tolkien nunca descreveu”.
4. **Tratar divergências.** Manter a narrativa genealógica do projeto, que segue o *Silmarillion* publicado, e identificar complementos ou versões alternativas. Uma mudança de ascendência entre versões não deve ser aplicada silenciosamente só para justificar uma aparência.
5. **Escolher a referência facial e revisar em família.** Quando houver interpretação nos filmes dirigidos por Peter Jackson, priorizar o ator caracterizado como o personagem. Usar as imagens dos parentes para orientar semelhanças sem apagar essa identidade. Sem interpretação correspondente, seguir as fontes e os parentes aprovados. Adoção, tutela, casamento e pertencer ao mesmo povo não demonstram parentesco biológico; não derivar o rosto de Elrond do de Maglor por sua criação.
6. **Registrar a decisão.** Reutilizar os campos existentes de características documentadas, inferidas, fontes e notas de versão em `data/retratos.json`, além de guardar os prompts e as imagens de referência. Para referências cinematográficas, registrar no documento do lote o ator, o personagem, o filme, a época visual e a origem da imagem consultada. Distinguir essa base das características descritas por Tolkien.

A pesquisa deve partir das obras e consultar Tolkien Gateway ou Encyclopedia of Arda para localizar remissões. Priorizar *O Senhor dos Anéis* e apêndices, *O Hobbit*, *O Silmarillion* e *Contos Inacabados*; conforme o personagem, consultar *Os Filhos de Húrin*, *Beren e Lúthien*, *A Queda de Gondolin*, *The History of Middle-earth*, *The Nature of Middle-earth*, cartas e notas linguísticas. Registrar se a obra foi consultada diretamente ou apenas por fonte secundária.

## Direção visual comum

Preservar a direção dos nove retratos de Fëanor: realismo fotográfico, textura de pele natural, iluminação suave, fundo discreto e enquadramento que funcione em miniatura. Produzir primeiro **um retrato principal por personagem**, usando, a partir da etapa 2, o rosto do ator que o interpretou nos filmes dirigidos por Peter Jackson sempre que houver correspondência. Buscar semelhança reconhecível com a caracterização da época do filme, em vez de usar automaticamente uma fotografia recente do ator.

As características literárias continuam registradas com suas fontes. Quando a caracterização cinematográfica trouxer escolhas próprias, identificá-las como referência dos filmes. Para personagens sem interpretação nesses filmes, manter a reconstrução literária e familiar, sem atribuir atores por associação ou importar automaticamente o elenco de outras adaptações.

Personagens com próteses, CGI, rosto oculto ou invisível exigem referência à aparência que têm na tela. O rosto humano de quem fez voz ou captura de movimento não substitui automaticamente a identidade visual do personagem. Uma mudança de ator entre fases da vida deve acompanhar a época escolhida para o retrato.

As semelhanças familiares devem orientar os traços, sem impor a mesma cor de cabelo, a mesma idade aparente ou o mesmo formato de rosto a toda a família. Não aplicar olhos cinzentos, cabelo longo ou um único tom de pele como regra automática de todos os elfos, homens ou outros povos.

Comparar cada lote com os parentes e com personagens sem parentesco. Conferir a legibilidade em recorte circular e quadrado, especialmente em 48–64 px, mantendo olhos e boca visíveis.

## Casos que precisam de decisão própria

| Caso | Tratamento previsto |
| --- | --- |
| Celegorm | Preservar o retrato atual e sua nota de versão sobre cabelo dourado; novas fontes não devem apagar a decisão registrada. |
| Amrod e Amras | Preservar a distinção visual e a nota sobre versões dos gêmeos; semelhança não exige duplicar a imagem. |
| Legolas | Usar o intérprete dos filmes de Jackson como referência facial. Se mantido o cabelo loiro da caracterização, identificá-lo como escolha cinematográfica, sem apresentá-lo como descrição individual confirmada por Tolkien. [Referência](https://tolkiengateway.net/wiki/Elven_characteristics). |
| Galadriel | Preservar o dourado com prata descrito para o cabelo, em vez de reduzi-lo a loiro genérico. [Referência](https://tolkiengateway.net/wiki/Hair_of_Galadriel). |
| Sauron | Escolher a manifestação e a época antes de gerar; Annatar e o Senhor do Escuro não são identidades diferentes no catálogo. Não adotar automaticamente o Olho cinematográfico como único retrato. [Referência](https://tolkiengateway.net/wiki/Sauron#Physical_form). |
| Gandalf | Manter uma identidade facial entre o Cinzento e o Branco; uma segunda imagem só entra quando a interface puder mostrar a diferença temporal. |
| Bilbo, Aragorn e outros mortais | Fixar a época do primeiro retrato. Não produzir todas as idades antes de existir uso na interface. |
| Círdan, Mahtan e demais elfos | Pesquisar barba e envelhecimento por personagem; evitar regras universais que eliminem exceções descritas. |
| Eluréd e Elurín | Representar a idade apropriada ao episódio escolhido; não reutilizar automaticamente o padrão de adulto jovem da família de Fëanor. |
| Valar e Maiar | Representar uma manifestação descrita ou uma interpretação artística identificada. Semelhança familiar não funciona como regra humana de herança para os Ainur. |
| Rei-bruxo e outros espectros | Trabalhar o rosto oculto ou a manifestação invisível conforme a cena; não inventar um retrato humano identificado como documental. |

Nomes alternativos não criam novas pessoas: Fëanor/Curufinwë, Gandalf/Olórin, Sauron/Annatar, Melkor/Morgoth e Gollum/Sméagol devem continuar ligados à mesma identidade. As versões visuais são contabilizadas separadamente dos 150 personagens.

## Produção e integração por lote

Reutilizar o fluxo já iniciado no projeto, sem criar um gerador ou serviço de imagens dentro da aplicação.

| Passo | Entrega verificável |
| --- | --- |
| Pesquisa | Ficha de cada personagem com identidade, época, características, fontes e decisões de versão. |
| Briefing visual | Prompt por personagem, referência do ator e da caracterização nos filmes de Jackson quando houver correspondência, referências familiares e diferenças que devem ser preservadas. |
| Geração | Uma imagem principal por personagem; refazer apenas imagens com defeito ou desacordo com o briefing. |
| Preparação | Arquivo final WebP de 512 × 512; preservar a imagem de origem e registrar o prompt usado. |
| Cadastro | Entrada em `data/retratos.json` ligada ao ID correto de `data/linhagens.json`. Novos personagens recebem ficha e fontes antes de aparecerem na árvore; parentes desconhecidos podem permanecer ausentes. |
| Integração | Retrato visível no cartão e na ficha, texto alternativo adequado e identificação acessível das inferências e versões. |
| Validação | Referências locais existentes, imagem sem distorção ou corte inadequado, comparação familiar e conferência no computador e no celular. |

Os nove arquivos existentes permanecem em `public/retratos/feanor/`. Novos arquivos podem usar `public/retratos/<id>.webp`; não mover os atuais só para uniformizar pastas. Os prompts podem seguir o padrão documental já usado em [retratos-feanor-prompts.json](retratos-feanor-prompts.json).

Hoje, [src/core/linhagens.ts](../src/core/linhagens.ts) consulta os retratos por ID. Reutilizar esse mecanismo. Antes de integrar hobbits, anões, Valar e Orcs, ampliar os grupos aceitos apenas na medida necessária aos personagens do lote, preservando os IDs existentes. Não forçar um novo povo a uma categoria inadequada para conseguir exibir sua ficha.

Usar **100 KiB por WebP** como alvo inicial de otimização, conferindo a qualidade do rosto; avaliar exceções individualmente. Carregar sob demanda os retratos fora da área visível, informar dimensões e manter um estado de ausência legível até o retrato estar pronto.

### Verificação local da etapa 10

Em 18 de novembro de 2026, as duas instâncias do ComfyUI do HopeGym responderam com o FLUX.2 klein 9B disponível. Uma delas gerou o piloto de Huan em 14 s. A variante aprovada foi refeita com anatomia de cão de caça. Os PNGs e os registros de modelo, seed e prompt ficam no diretório local `fontes-imagens/retratos/`.

Os três retratos com fotogramas usaram `ReferenceLatent` no ComfyUI. Os arquivos originais, os recortes enviados e a origem de cada cena estão registrados no diretório local `fontes-imagens/referencias/`. [Prompts da etapa 10](retratos-etapa-10-prompts.json)

## Critérios para concluir uma entrega

- Todos os personagens do lote têm imagem, cadastro e época de referência definidos.
- Cada característica foi classificada como documentada, inferida ou reconstrução artística; divergências relevantes têm nota.
- Os parentes apresentam semelhanças coerentes, com rostos distintos e sem contradizer características explícitas.
- Quando houver interpretação nos filmes dirigidos por Peter Jackson, a referência facial e a caracterização usadas estão registradas; diferenças entre livro e filme são identificadas pela origem.
- Nomes alternativos não duplicam personagens e nenhum vínculo genealógico foi inventado para justificar o retrato.
- As imagens funcionam em miniatura e na ficha, com texto alternativo e carregamento correto.
- A integração passa pelas verificações do projeto pertinentes aos arquivos alterados. A pesquisa e a criação da imagem, isoladamente, não bastam para marcar a integração como concluída.

Acompanhar três números por etapa: **pesquisados**, **retratos criados** e **integrados/verificados**. Só avançar o estado de cada item quando sua entrega correspondente existir; não contar arquivos planejados como cobertura.

## Extensão de criaturas

O briefing abaixo cobre os dez personagens da extensão. O enquadramento deve mostrar a anatomia que distingue cada criatura e dar uma referência de escala no ambiente. A miniatura deve continuar legível a 36 px. Nas adaptações de Jackson, use a criatura em cena como referência visual. Registre edição, cena e imagem consultada junto ao prompt. Consulte [AGENTS.md](../AGENTS.md) para o fluxo de produção.

| Lote | Personagem | Âncora literária e direção |
| --- | --- | --- |
| 1 | Fangorn / Barbárvore | *O Senhor dos Anéis*, III, 4. Corpo de Ent, casca e olhos atentos. Conferir a criatura em *As Duas Torres*, no encontro com Merry e Pippin. |
| 1 | Smaug | *O Hobbit*, caps. 12 e 14. Dragão alado sobre o tesouro, com ventre incrustado. Conferir a criatura em *A Desolação de Smaug*. |
| 1 | Laracna | *O Senhor dos Anéis*, IV, 9. Corpo de aranha na toca, com peso e escala perceptíveis. Conferir a criatura em *O Retorno do Rei*. |
| 1 | Gwaihir | *O Senhor dos Anéis*, II, 2 e VI, 4. Grande águia em voo. Conferir o resgate de Gandalf em Orthanc em *A Sociedade do Anel*. A identificação da águia em *O Hobbit* permanece aberta. |
| 1 | Bregalad | *O Senhor dos Anéis*, III, 4. Ent mais jovem associado às sorveiras, com silhueta esguia. A espécie das folhas e a agilidade orientam a diferenciação de Barbárvore. |
| 2 | Glaurung | *O Silmarillion*, cap. 21. Dragão sem asas, com a massa apoiada no chão do Narog. A coloração pode dialogar com a maquete de Nargothrond. |
| 2 | Ancalagon | *O Silmarillion*, cap. 24. Dragão alado da Guerra da Ira acima de Thangorodrim. A escala exata e a anatomia são interpretação. |
| 2 | Ungoliant | *O Silmarillion*, cap. 8. Forma aracnídea e escuridão ao redor em Avathar. Diferenciar da silhueta e do ambiente de Laracna. |
| 2 | Huan | *O Silmarillion*, cap. 19. Cão de caça associado a Valinor e a Lúthien. Pelagem, conformação e cenário do retrato são interpretação. |
| 2 | Thorondor | *O Silmarillion*, caps. 13 e 18. Grande águia das Echoriath. Diferenciar de Gwaihir pela postura, enquadramento e época. |

Smaug, Glaurung, Ancalagon, Ungoliant, Huan e Thorondor foram entregues na etapa 10. Fangorn/Barbárvore, Laracna, Gwaihir e Bregalad permanecem previstos neste briefing. [Prompts da etapa 10](retratos-etapa-10-prompts.json)

Nimrodel, Haldir e os Magos Azuis podem entrar conforme as fichas e jornadas forem ampliadas.

## Limites deste roadmap

A biblioteca inicial de 150 personagens, Eru Ilúvatar e os 36 da etapa 10 somam 187 retratos integrados. Os apontamentos de fontes indicam os capítulos de referência. O cotejo direto das edições permanece aberto.

Referência do trabalho já realizado [galeria e notas dos retratos de Fëanor](RETRATOS-FEANOR.md).
