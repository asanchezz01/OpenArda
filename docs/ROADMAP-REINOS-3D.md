# Roadmap — detalhes dos reinos em 3D

O objetivo é aproximar a câmera de um reino e reconhecer sua arquitetura, suas cidades e suas transformações ao longo do tempo. A camada **Detalhes dos reinos em 3D** complementa as fronteiras políticas e o relevo do atlas. Cada reino começa por uma cidade ou fortaleza representativa.

## Primeira entrega: Gondolin

**Implementado nesta versão:** representação procedural sobre Amon Gwareth, no vale de Tumladen. A cidade tem uma muralha com entrada, torres, escadaria, bairros, avenidas, jardins, fontes, pátio de Turgon, Torre do Rei e imagens de Glingal e Belthil.

| Período do atlas | Representação |
| --- | --- |
| Antes de 52 P.E. | Sem cidade |
| 52–115 P.E. | Obras: muralhas e edifícios incompletos |
| 116–509 P.E. | Cidade íntegra |
| 510–586 P.E. | Ruínas: torres truncadas, brechas, escombros e ausência de jardins |
| A partir de 587 P.E. | Modelo ocultado após a submersão de Beleriand |

As fronteiras temporais vêm de `data/lugares.json`. A comparação entre épocas desenha o modelo correspondente a cada lado. A construção e as ruínas são estados ilustrativos; não representam a progressão anual da obra ou uma simulação da batalha.

**Como visitar:** abra **Camadas e legenda → Visitar Gondolin em 3D**, ou a ficha de Gondolin (lugar ou reino) e escolha **Explorar cidade em 3D**. A visita preserva uma época em que existe um modelo; fora dela, abre em 400 P.E. O enquadramento fixo precisa ser destravado para a visita. A camada pode ser desligada independentemente das fronteiras.

**Interpretação visual:** a localização usa a Grade de Arda existente. A malha urbana, os tamanhos, os materiais e as formas dos edifícios são uma reconstrução artística. A muralha da cidade não representa os sete portões da passagem de Orfalch Echor. Não há interiores nem navegação a pé nesta entrega.

**Desempenho:** a geometria só é criada quando a câmera se aproxima a menos de 150 km do centro. Os edifícios repetidos usam instâncias; cada estado é construído uma vez e reutilizado. O exagero do relevo move o assentamento e alonga o suporte rochoso e a escadaria de acesso, preservando as proporções dos edifícios. A visita ajusta a distância da câmera à largura da tela, incluindo o modo de comparação.

### Próximos detalhes de Gondolin

- Modelar os sete portões ao longo de Orfalch Echor, usando o traçado da passagem existente. Distinguir sua localização inferida do material descrito nas fontes.
- Acrescentar pontos de interesse selecionáveis na praça, na torre e na entrada, com fontes específicas.
- Estudar um recorte do vale com aproximação gradual de detalhes e perfis de desempenho em celulares reais.
- Refinar a implantação após cotejar as descrições de Tolkien; manter as dimensões não documentadas como artísticas.

## Ordem de expansão

Esta é uma ordem de implementação, sem datas prometidas. Só Gondolin tem arquitetura 3D nesta entrega; os demais itens estão planejados.

| Ordem | Reino / domínio | Primeiro local | Entrega visual e temporal | Dependência principal |
| --- | --- | --- | --- | --- |
| 1 | **Gondolin** | Gondolin | **Versão inicial implementada**; depois, passagem e sete portões | Validar e refinar a primeira cidade |
| 2 | Gondor | Minas Anor / Minas Tirith | Cidadela, níveis, muralhas e relação com Mindolluin; depois, Osgiliath e suas ruínas | Definir versões por época a partir das fases dos lugares |
| 3 | Rohan | Edoras | Colina, paliçada, habitações e Meduseld | Arquitetura de madeira e implantação no relevo |
| 4 | Númenor | Armenelos; depois Rómenna | Centro régio, vias e porto; desaparecimento na Queda | Relacionar os assentamentos à geografia da ilha |
| 5 | Doriath | Menegroth | Entrada, ponte e representação dos salões subterrâneos | Definir um modo de corte que permita ver o interior |
| 6 | Nargothrond | Nargothrond | Portas, salões, ponte e ruínas junto ao Narog | Reutilizar o modo subterrâneo e datar a ponte |
| 7 | Lindon e Eregion | Mithlond; depois Ost-in-Edhil | Cais, navios estáticos e oficinas; ruínas de Eregion | Acrescentar a cidade de Ost-in-Edhil aos dados com fontes próprias |
| 8 | Arnor e Arthedain | Annúminas e Fornost | Capitais em atividade e ruínas por período | Separar os períodos de cada capital |
| 9 | Angmar | Carn Dûm | Fortaleza e acesso montanhoso | Documentar lacunas e evitar apresentar invenções como descrições |
| 10 | Mordor | Barad-dûr | Fortaleza e estados de destruição/reconstrução | Expandir as fases do lugar quando necessário |
| 11 | Domínio de Morgoth | Angband | Portões e relação com Thangorodrim | Exteriores e relevo antes de interiores |
| 12 | Valinor | Tirion e Valmar | Túna, torres, praças e interação com a iluminação de Aman | Integrar luz das Árvores aos materiais da arquitetura |
| 13 | Reinos anões | Khazad-dûm e Erebor | Portas, salões e estados de ocupação | Cadastrar os reinos/capitais ausentes antes de modelar |
| 14 | Reinos élficos da Terceira Era | Caras Galadhon e salões de Thranduil | Arquitetura arbórea e subterrânea | Cadastrar os reinos e apoiar modelos no terreno e nas árvores |

## Critérios para concluir cada reino

- Cidade localizável pela busca, pela ficha e por um atalho de visita.
- Modelo assentado no relevo, sem aparecer antes da fundação ou depois da remoção/submersão.
- Comparação entre épocas correta, inclusive quando só um dos lados tem arquitetura.
- Camada independente, detalhes limitados à escala local e reutilização de geometrias.
- Fontes, diferenças entre versões e reconstruções artísticas identificadas na ficha.
- Testes de fronteiras temporais, geração determinística, visibilidade e integração; validação dos dados, tipos e build aprovados.
- Inspeção visual em desktop e celular, incluindo zoom, relevo exagerado e comparação. Medir desempenho em hardware real antes de fixar metas de FPS.

## Referências para a primeira entrega

- **O Silmarillion**, “Dos Noldor em Beleriand” e “De Tuor e da Queda de Gondolin”: base narrativa já registrada no atlas.
- **Contos Inacabados**, “De Tuor e sua chegada a Gondolin”: referência para o acesso pelo vale e os portões.
- [Tolkien Gateway — Gondolin](https://tolkiengateway.net/wiki/Gondolin): consulta secundária para conferir muralhas claras, Torre do Rei, fontes e as imagens de Glingal e Belthil. A planta e os volumes deste projeto são autorais; não foram copiados de mapas ou adaptações.

As fontes secundárias não substituem o cotejo das edições. O projeto continua distinguindo o relato publicado das versões antigas; esta entrega não incorpora nomes de ruas ou bairros exclusivos dessas versões.
