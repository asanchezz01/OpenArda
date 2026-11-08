# Diagnóstico e otimizações de desempenho — 7 de novembro de 2026

Sintoma informado: demora ao clicar nos botões e navegar pelas opções, em computador.

A principal hipótese é a disputa de recursos entre o mapa 3D, que continua trabalhando durante o uso dos painéis, e a apresentação da interface. Há desperdícios confirmados no código do mapa. As medições locais mostram geração rápida do HTML dos painéis; ainda falta uma captura real de interação para separar tempo de JavaScript, layout, pintura e GPU no navegador.

Referência da avaliação inicial: commit `2125361`, com o arquivo público `index-BNSPMWUb.js`. Os achados abaixo descrevem esse estado anterior. As otimizações aplicadas estão registradas ao final. As alterações locais de cadastro de linhagens e retratos foram preservadas.

## Medições e seus limites

Testes locais em Windows, Node.js 26.13.0, Intel Core i5-13450HX. O computador informa Intel UHD e NVIDIA RTX 3050 Laptop; não foi possível confirmar qual GPU o Chrome estava usando.

Os módulos TypeScript foram compilados para uma execução isolada. Os painéis foram medidos em 50 repetições após aquecimento; terreno e worker, em nove repetições após aquecimento. Os números abaixo são medianas. Eles não representam FPS nem INP do navegador.

| Operação | Tempo local |
|---|---:|
| Gerar HTML de Valar e Maiar | 0,033 ms |
| Gerar HTML de Linhagens | 0,091 ms |
| Gerar HTML da linhagem de Finwë | 0,285 ms |
| Gerar HTML da árvore de Finwë | 0,229 ms |
| Gerar HTML da grade de todas as fotografias | 0,226 ms |
| Construir modelo de terreno completo, conforme a época | 15,5–18,8 ms; máximo observado de 32,5 ms |
| Gerar ladrilho de Aman com cálculo da luz das Árvores | 32,9 ms |
| Mesmo ladrilho, sem cálculo dessa luz | 7,0 ms |
| Gerar ladrilho na antiga posição de Aman na Terceira Era, com esse cálculo | 28,5 ms |
| Mesmo ladrilho da Terceira Era, sem esse cálculo | 1,3 ms |

A seleção de ladrilhos, em simulação com dados já carregados e sem renderização WebGL, ficou entre 0,06 e 0,12 ms de mediana. A vista de abertura selecionou aproximadamente 53 ladrilhos e 265 mil triângulos. Isso ajuda a separar o custo da seleção do custo, ainda não medido, de desenhá-los.

A página pública respondeu em 103–160 ms em três requisições feitas deste computador. O JavaScript principal foi transferido em 170 ms, com gzip e cabeçalho de cache; foram aproximadamente 353 KiB transferidos e 1,11 MiB após descompressão. Os botões dos painéis geram conteúdo localmente; esses tempos de rede não medem a resposta a um clique já dentro do aplicativo.

Nas mesmas 5.000 coordenadas da Terra-média, a amostragem do terreno passou de 14,8 ms antes da revisão cartográfica para 16,1 ms depois, aproximadamente 9% nesta amostra. Isso mede somente o cálculo de CPU nessas coordenadas, sem GPU, DOM, navegação ou garantia de representar todas as regiões.

## Achados

### 1. O mapa continua renderizando atrás das telas de conteúdo

[src/app.ts](../src/app.ts) executa terreno, camadas, cena WebGL e rótulos em cada `requestAnimationFrame`. A abertura das fotografias, retratos e árvores em [src/ui/interface.ts](../src/ui/interface.ts) mostra os elementos de conteúdo sem comunicar uma suspensão do mapa à aplicação.

O trabalho contínuo está confirmado no código. A contribuição exata para a demora dos botões ainda precisa de um teste de interação com o mapa suspenso. Em telas opacas que cobrem o mapa inteiro, esse desenho não traz benefício visual ao usuário.

### 2. A resolução automática reage tarde e deixa de ajustar durante o carregamento

Em `App.ajustarResolucao`, a redução só ocorre quando a média ultrapassa 48 ms por quadro, aproximadamente 21 FPS. Há ainda a condição `if (!this.carregando)` antes de chamar o ajuste. Assim, uma execução em aproximadamente 30 FPS pode manter a resolução atual, e o carregamento impede a adaptação justamente durante uma fase de maior trabalho.

O mapa usa antialias e resolução de até duas vezes a dimensão CSS em computadores. Dobrar as duas dimensões quadruplica a quantidade de pixels. Reduzir somente o buffer do mapa, preservando os textos HTML, é uma estratégia recomendada nas [boas práticas de WebGL da MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#consider_rendering_to_a_smaller_back_buffer).

### 3. A visibilidade da luz das Árvores é calculada sem consultar a época

O provedor de luz em `App` retorna sempre `EZELLOHAR`. Em [src/terrain/terrain.worker.ts](../src/terrain/terrain.worker.ts), a presença dessa luz pode disparar uma grade de 33 × 33 raios, cada um com até 140 passos, nos ladrilhos próximos.

O teste da antiga posição de Aman na Terceira Era passou de 1,3 para 28,5 ms por ladrilho ao ativar esse cálculo. É aproximadamente 22 vezes o custo naquele caso, embora a luz não seja exibida nessa época. Esse custo ocorre no worker, não diretamente no manipulador do botão; ele prolonga trabalho de fundo e carregamento.

Diminuir apenas a malha de 48 para 24 subdivisões não resolve essa parte: a grade de raios continua em 33 × 33. No teste de Aman, o tempo total caiu apenas de 32,9 para 28,0 ms.

### 4. As galerias usam os arquivos completos como miniaturas

Valar e Maiar gera 25 imagens sem carregamento adiado, usando retratos de 512 × 512 para cartões que declaram 96 × 96. Os arquivos somam aproximadamente 1,02 MiB; as imagens RGBA equivalem a 25 MiB antes de outras despesas do navegador.

A grade de fotografias usa os originais de 1536 × 1024. Os 75 arquivos disponíveis somam aproximadamente 14 MiB. Se todos estivessem decodificados simultaneamente, os pixels RGBA equivaleriam a 450 MiB. A grade já possui `loading="lazy"`, portanto esse número é um limite de referência, não memória efetivamente observada nem carga inicial da galeria.

Esses achados se aplicam especialmente às telas com imagens. O pequeno custo de geração das strings HTML não inclui decodificação, inserção no DOM, layout ou pintura.

### 5. Há trabalho síncrono e atualizações que podem ser reduzidos

`App.modeloDe` constrói um modelo completo na thread principal quando falta uma entrada no cache. A construção observada pode consumir mais de um orçamento de quadro de 16,7 ms. [src/render/overlay.ts](../src/render/overlay.ts) também pode gastar um orçamento de 6 ms por atualização ao produzir novas texturas de camadas, além do envio dessas texturas à GPU.

É possível priorizar a resposta visual do botão e distribuir a preparação de conteúdo/camadas por tarefas menores. O orçamento de 6 ms é configurado no código; não foi medido como custo constante de todos os quadros. A interface também atualiza bússola e estado e projeta rótulos continuamente, inclusive quando a câmera está parada.

## Ordem recomendada

| Prioridade | Mudança | Validação necessária |
|---|---|---|
| 1 | Suspender desenho e refinamento do mapa quando uma tela opaca o cobre; reduzir a atividade do mapa ao usar painéis. | Comparar cliques com mapa ativo e suspenso; conferir retomada da câmera, relógio e linha do tempo. |
| 1 | Ajustar a resolução também durante o carregamento e adotar uma meta de fluidez mais próxima de 50–60 FPS, com estabilidade antes de voltar a aumentar a qualidade. | Medir tempo por quadro e INP; preservar nitidez dos controles HTML e recuperar a qualidade do mapa quando houver folga. |
| 2 | Calcular a máscara da luz das Árvores somente quando necessária. | Incluir o modo de iluminação na política de cache; verificar sombras ao alternar entre Anos das Árvores e eras solares. |
| 2 | Usar miniaturas próprias nas galerias e retratos, carregamento adiado e decodificação assíncrona; reservar os originais para ampliação. | Medir tráfego e memória real ao abrir/rolar as galerias; conferir aparência e ampliação. |
| 3 | Distribuir construção de modelos e texturas por tarefas menores; atualizar rótulos e interface conforme mudanças de estado. | Registrar tarefas longas e tempo de resposta dos botões antes/depois; preservar transições entre eras. |

O primeiro experimento deve ser clicar nos mesmos botões com o mapa ativo e suspenso, no mesmo enquadramento e com as imagens já em cache. Esse teste separa o custo persistente do mapa do primeiro carregamento das galerias. A segunda rodada deve medir a primeira abertura das imagens. A redução de trabalho repetido também segue as [orientações de otimização de canvas da MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas).

Metas propostas: resposta visual do controle em até 100 ms, INP até 200 ms e enquadramento de navegação buscando aproximadamente 16,7–20 ms por quadro. São critérios de aceite, não resultados já obtidos.

## Limitação de confirmação

A automação do navegador falhou ao tentar executar comandos na aba. Não foram capturados INP, FPS real, uso de GPU ou o trecho de Performance do clique. As medições e a leitura do código identificam desperdícios concretos e orientam os próximos ajustes, mas não comprovam sozinhas qual deles domina cada clique no Chrome.

## Otimizações aplicadas

- Fotografias, árvores em tela cheia e retratos ampliados suspendem o desenho e os novos pedidos de ladrilhos do mapa. Pedidos já em andamento terminam normalmente. A linha do tempo e os voos da câmera continuam atualizando seu estado; o mapa retoma ao fechar a última tela que o cobre. A aba oculta também suspende os pedidos.
- Com uma ficha ou o menu de camadas aberto, o desenho do mapa fica limitado a aproximadamente 30 FPS, liberando recursos para os controles. A navegação no mapa sem esses painéis mantém a cadência normal.
- A resolução começa a reduzir quando a média supera 22 ms por quadro, inclusive durante o carregamento. Reduções aguardam ao menos um segundo; aumentos aguardam quatro segundos com média abaixo de 17,5 ms, sem carregamento nem painel aberto. O limite mínimo continua em 0,6 e `?qualidade=fixa` continua disponível. Só o canvas do mapa muda de resolução.
- Os pedidos de terreno levam a luz de Ezellohar somente nos Anos das Árvores antes do Escurecimento. A assinatura do cache distingue essa iluminação mesmo quando o relevo das duas épocas coincide, preservando as máscaras ao voltar no tempo ou comparar épocas diferentes.
- Galerias, fichas e árvores usam miniaturas WebP; os visualizadores ampliados mantêm os originais. As galerias usam carregamento adiado e decodificação assíncrona. Foram geradas 225 miniaturas: retratos de até 192 px e fotografias de até 640 px. O conjunto passou de 19,10 MiB em originais para 3,35 MiB em miniaturas, redução de aproximadamente 82,5% para essas prévias. Isso mede arquivos, sem afirmar a memória efetivamente usada pelo navegador.
- Miniaturas têm hash de conteúdo no nome e cache permanente no Nginx. O build verifica a presença dos arquivos referenciados. Depois de aprovar imagens novas, executar `python scripts/gerar-miniaturas.py` (Pillow, já usado no fluxo de imagens) e incluir manifesto e arquivos gerados. Não é necessário Python no servidor ou no build Node; enquanto não houver miniatura, a interface usa o original.

Validação: `npm run build` concluiu com validação dos dados, TypeScript, 326 testes e empacotamento de produção. Os novos testes cobrem suspensão/retomada dos workers, cancelamento durante pausa, continuidade da linha do tempo, limite de quadros com painel, resolução e separação do cache de luz. Os testes de imagens conferem miniaturas, carregamento adiado e preservação dos originais na ampliação. O teste existente de parentesco passou a consultar `irmaosDe`, compatível com as relações do cadastro local.

Para o teste manual, abrir Linhagens/Valar, rolar a galeria, ampliar um retrato e fechá-lo; abrir uma árvore em tela cheia, ampliar um retrato sobre ela e fechar ambos; abrir Fotografias e alternar entre grade e ampliação. Conferir a retomada do mapa, a comparação entre épocas e a volta dos Anos das Árvores após visitar o Escurecimento e a Primeira Era. Repetir os cliques com as imagens já carregadas para separar rede e resposta da interface.

A divisão da construção de modelos/texturas em tarefas menores permanece como próximo passo caso a captura real de interação ainda mostre tarefas longas. Não foi adicionada dependência nem alterado o relevo para obter esses ganhos.
