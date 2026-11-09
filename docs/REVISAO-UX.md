# Revisão de navegação e usabilidade

9 de novembro de 2026.

Revisão do frontend do OpenArda usando Impeccable, Frontend Design e o mapa de relações existente do Graphify. Foram examinados abertura, busca, menu, navegação da câmera, fichas, linha do tempo, comparação, jornadas, fotografias, retratos e linhagens. O mapa continua sendo a superfície principal, com a paleta azul e ouro e a tipografia já utilizadas pelo atlas.

## Melhorias aplicadas

| Prioridade | Problema observado no código | Resultado implementado |
|---|---|---|
| P1 | Fontes consultadas numa fotografia abriam atrás da tela modal | A fotografia fecha antes de abrir a fonte; o histórico permite voltar à ficha anterior |
| P1 | Jornadas e comparação substituíam o controle focado | O foco acompanha o controle equivalente e retorna a uma entrada disponível ao encerrar |
| P1 | Árvore e fotografias declaravam modalidade sem isolamento nativo | As duas telas usam `dialog.showModal()`, acompanhando o padrão já usado nos retratos |
| P1 | O canvas recebia foco sem indicador visível | Indicador específico de foco dentro da área do mapa |
| P1 | Abertura de ficha em dispositivo de toque podia deixar o foco no menu oculto | O conteúdo da ficha recebe foco em todos os tipos de ponteiro |
| P2 | Consultar uma fonte ou outro personagem apagava o caminho percorrido | Botão Voltar com histórico das fichas e restauração de rolagem |
| P2 | No celular, a ficha ocultava a linha do tempo exigida pelas instruções de linhagens | Ficha posicionada acima da linha do tempo, com conteúdo rolável e expansão acessível |
| P2 | Busca não encontrava personagens e usava semântica de seleção para uma lista de ações | Personagens levam às linhagens; resultados são botões numa região nomeada, com contagem anunciada |
| P2 | Busca vazia não indicava um próximo passo | Sugestões ao focar e exemplos quando não há resultados |
| P2 | Menu misturava seções e seis cidades, sem fechamento consistente | Seções agrupadas e cidades num grupo expansível; fechar, Esc e toque fora sincronizam `aria-expanded` |
| P2 | Controles pequenos dificultavam o toque | Alvos principais, controles temporais e ações de linhagem com área mínima de 44 px |
| P2 | Controles de ano sugeriam datas inexistentes nos Anos das Árvores | Rótulos mudam para acontecimento anterior/próximo nas eras por sequência |
| P2 | Editor podia começar em outro acontecimento e aceitava ano vazio | Acontecimento atual selecionado, ano obrigatório e validação nativa do intervalo e de inteiros |
| P2 | Eventos anterior/próximo estavam ocultos no celular | Saltos também disponíveis em Alterar data; Fixar e Comparar mantêm texto visível |
| P2 | Última parada da jornada terminava num botão desabilitado | Ação Concluir jornada |
| P2 | Aviso de acontecimento desaparecia com sua ação focada | Expiração suspensa durante foco ou passagem do ponteiro; limite da fila preserva avisos em uso |
| P2 | Valar e Maiar mandava tocar em nomes que eram texto estático | Nomes abrem as fichas usando o helper existente |
| P2 | Restaurar link sem trava podia manter a câmera fixada | Estado de trava é restaurado tanto para verdadeiro quanto para falso |
| P2 | Boas-vindas reapareciam em visitas já concluídas | Preferência salva é respeitada; links diretos não mostram a introdução de Aman |
| P2 | Falha de WebGL expunha erro técnico sem recuperação | Mensagem com orientação e botão Tentar novamente; detalhes seguem no console |
| P3 | Animação de altura na ficha e supressão global de animações | Expansão imediata; movimento reduzido tratado nas animações específicas |

As fotografias mantêm a distinção entre descrição de Tolkien, inferência e interpretação artística. Não houve produção ou substituição de retratos, fotografias ou dados históricos.

## Evidência e método

Houve duas avaliações independentes: A, de fluxos e identidade visual; B, de detector e verificação técnica. A terminou antes da consolidação dos achados do detector. As correções acima incluem os problemas confirmados nas duas avaliações.

A avaliação A atribuiu **26/40** ao estado intermediário, antes da última rodada de correções. Essa pontuação é provisória e não representa uma avaliação visual do resultado final:

| Heurística | Nota intermediária /4 |
|---|---|
| Estado do sistema | 3 |
| Linguagem natural | 3 |
| Controle e liberdade | 3 |
| Consistência | 2 |
| Prevenção de erros | 3 |
| Reconhecimento | 2 |
| Eficiência | 2 |
| Estética e economia | 3 |
| Recuperação | 3 |
| Ajuda | 2 |

O detector foi executado com `impeccable.cmd detect --json index.html src`. Retornou três avisos: borda lateral das eras, borda superior dos cartões de povos e transição de altura. Os dois primeiros foram classificados como sinalização de categorias existentes, sem defeito funcional demonstrado. A transição de altura foi removida. O detector não certifica acessibilidade ou qualidade visual.

Os tokens de texto examinados sobre o fundo sólido `#0d1420` têm contraste superior a 8,7:1. Isso não comprova contraste em todas as composições transparentes sobre o mapa.

Referências técnicas: [diálogos modais da W3C](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) e [limites do padrão listbox para conteúdo com botões](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/).

## Verificação

- `npm run build`: valida os dados, verifica TypeScript, executa todos os testes e gera `dist/`.
- Resultado final: **383 testes aprovados em 13 arquivos**, incluindo 26 novos cenários em `tests/navegacao.test.ts`.
- Os testes de navegação exercitam busca, Escape, foco, menu, histórico, fontes das fotografias, árvores, comparação, jornadas, avisos, editor de data e interrupção de arrasto.
- `jsdom` foi adicionado somente como dependência de desenvolvimento, compatível com o requisito Node.js 18. Não entra no bundle do atlas.
- Os testes existentes dos atalhos 3D foram ajustados para utilizar o protótipo real da interface, incluindo o fechamento compartilhado do menu.

## Pendências de validação

O navegador Chrome conectado falhou antes de carregar o endereço local, com erro de infraestrutura envolvendo `timeoutMs`. O navegador integrado estava indisponível. Foram usadas as capturas históricas de desktop e celular para conhecer a identidade existente; elas **não validam a aparência nova**.

Ainda é necessário conferir no navegador real: desktop, celular em retrato e paisagem, zoom de 200%, teclado e leitor de tela. Verificar especialmente a ficha acima da linha do tempo e a disposição dos controles em telas baixas. O ambiente jsdom não implementa a camada modal: os testes conferem o acionamento e o ciclo de abertura/fechamento, com métodos simulados, sem comprovar isolamento real de foco ou gestos físicos.

`npm audit` também apontou cinco alertas nas dependências de desenvolvimento já existentes: Vite, Vitest e suas dependências. Não foram ampliadas as atualizações de ferramentas nesta revisão de UX; esses alertas merecem uma manutenção separada.

Não foi feita publicação ou mudança de serviços externos. A revisão foi concluída no código local; a confirmação visual permanece pendente.
