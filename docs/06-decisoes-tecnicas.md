# 06 · Decisões técnicas

Cada decisão importante do projeto: o que foi escolhido, o que foi descartado e por quê.

---

## Modelagem

### D1. Detecção de anomalias em vez de classificação supervisionada

**Decisão:** usar modelos que aprendem só o comportamento normal (Isolation Forest e LOF).

**Alternativa descartada:** classificadores supervisionados (regressão logística, random forest, XGBoost) treinados com fraudes e normais.

**Por quê:**
- Só existem 473 fraudes. Um classificador supervisionado aprenderia o padrão dessas fraudes específicas.
- Fraudes novas, de um tipo nunca visto, tendem a ser diferentes das antigas. Um detector de anomalias marca qualquer coisa que fuja do normal, sem depender de exemplos de fraude.
- No mundo real o rótulo de fraude chega com atraso (depois da contestação do cliente). Um modelo que treina só com transações normais não depende desse rótulo para treinar.

**Custo:** classificadores supervisionados costumam ter AUPRC maior nesta base específica. O projeto aceita esse custo em troca de não depender de exemplos de fraude. Os rótulos são usados **só para avaliar**.

### D2. AUPRC como métrica de escolha

**Decisão:** escolher modelos e configurações pela AUPRC.

**Alternativas descartadas:** acurácia (enganosa com 0,17% de fraude), ROC AUC (pouco sensível a falsos alarmes quando há muitas normais), F1 (depende do limite escolhido).

**Detalhes:** [03 · Métricas](03-metricas.md).

### D3. Divisão em três conjuntos, feita antes de tudo

**Decisão:** treino 60% / validação 20% / apresentação 20%, com `stratify` e `random_state=42`, feita logo após a limpeza.

**Alternativa descartada:** treino/teste (80/20), escolhendo o modelo direto no teste.

**Por quê:** foram testadas 49 configurações. Escolher a melhor entre muitas num mesmo conjunto deixa o número desse conjunto otimista (a validação teve o melhor resultado nos dois modelos, como esperado). Um terceiro conjunto, usado uma única vez, dá o número honesto.

**Alternativa também descartada:** validação cruzada (k-fold). Com o LOF levando de 1 a 16 segundos por configuração, multiplicar tudo por 5 tornaria o notebook lento para o grupo rodar, e com 473 fraudes a divisão estratificada simples já dá ~95 fraudes por conjunto.

### D4. Remover duplicadas antes da divisão

**Decisão:** `drop_duplicates()` na base inteira, antes de dividir.

**Por quê:** evita que uma cópia fique no treino e a outra na avaliação (vazamento) e evita distâncias zero no LOF. Detalhes em [02 · Dados e preparação](02-dados-e-preparacao.md#1-limpeza-remoção-de-duplicadas).

### D5. Transformar Time e Amount com PCA em vez de descartá-las

**Decisão:** padronizar `Time` e `Amount` e aplicar PCA de 2 componentes, gerando `V29` e `V30`.

**Alternativas:** descartar as duas, ou só padronizar.

**Por quê:** deixa as 30 colunas no mesmo formato (componentes de PCA padronizadas) e mantém a informação de horário e valor disponível para a seleção de colunas decidir. No fim, `V29` e `V30` ficaram em 23º e 24º no ranking e não entraram no modelo final.

**Observação honesta:** com só duas colunas, o PCA praticamente gira os eixos (as componentes explicam 50,6% e 49,4% da variância). O efeito prático é parecido com só padronizar. A escolha manteve o padrão pedido na disciplina.

### D6. Padronização para os dois modelos

**Decisão:** `StandardScaler` em todas as colunas, `fit` só no treino.

**Por quê:** o LOF mede distâncias e precisa de colunas na mesma escala. O Isolation Forest não precisa, mas recebe os mesmos dados para a comparação ser justa.

### D7. Seleção de colunas por informação mútua, com o número decidido pela validação

**Decisão:** ranking por `mutual_info_classif` no treino; testar Top 5, 10, 15, 20 e todas.

**Alternativas descartadas:**
- Corte fixo por valor de correlação: a correlação com a `Class` fica achatada com fraude tão rara, então qualquer valor de corte seria arbitrário.
- Escolher o número de colunas no olho, pelo gráfico do ranking.

**Por quê:** a informação mútua capta relações não lineares. A correlação (Corr-10, Corr-15) foi testada em paralelo para confirmar: os dois critérios empataram.

**Efeito:** a seleção quadruplicou a AUPRC do Isolation Forest (0,165 → 0,678) e melhorou a do LOF (0,642 → 0,754).

### D8. Treinar com amostra de 50 mil normais

**Decisão:** os dois modelos treinam com 50 mil das ~170 mil transações normais do treino.

**Por quê:** o LOF precisa calcular vizinhos para cada ponto, e o custo cresce rápido com o número de pontos. O Isolation Forest usa a mesma amostra para a comparação ser justa (ele próprio sorteia só 256 pontos por árvore, então não perde nada).

### D9. `contamination` igual à proporção de fraude do treino

**Decisão:** `contamination = 0,00167`.

**Por quê:** é a única referência disponível antes de ver resultados: se 0,17% das transações são fraude, marcar 0,17% como suspeitas é o ponto de partida natural. O limite pode ser ajustado depois por critério de negócio (seção [Análise do limite](05-avaliacao-final.md#análise-do-limite)), mas a avaliação oficial usa este.

### D10. LOF com `novelty=True`

**Decisão:** treinar o LOF no modo *novelty*.

**Por quê:** no modo padrão, o LOF só dá score para os pontos usados no `fit`. Com `novelty=True` ele pode pontuar transações novas, o que é obrigatório para a validação, a apresentação e a aplicação.

### D11. Finalistas fixados antes da avaliação final

**Decisão:** Isolation Forest MI-10 com 200 árvores e LOF MI-5 com 50 vizinhos, escritos no código como `FINALISTAS`.

**Por quê:** se o finalista fosse "o melhor desta execução", qualquer mudança no notebook poderia trocar a escolha. Fixar mantém a avaliação final reproduzível e honesta. Detalhes em [04 · Modelos e experimentos](04-modelos-e-experimentos.md#os-finalistas).

### D12. LOF como modelo da aplicação

**Decisão:** salvar o LOF.

**Alternativa:** Isolation Forest, mais indicado para tempo real (mais rápido e não guarda os dados de treino).

**Por quê:** o notebook estabelecia que, se a diferença fosse pequena, o Isolation Forest seria preferido. A diferença não foi pequena: AUPRC de 0,665 contra 0,519 e 36 falsos alarmes a menos, com vantagem em todos os quatro conjuntos. O custo de latência do LOF ficou aceitável: ~20 ms por transação na tela, já incluindo o pré-processamento.

---

## Aplicação

### D13. Salvar um pacote com modelo + transformações

**Decisão:** o `joblib` salva um dicionário com o modelo, os dois scalers, o PCA e a lista de colunas.

**Alternativa:** salvar só o modelo.

**Por quê:** uma transação nova chega crua (`Time`, `V1`–`V28`, `Amount`). Sem as transformações exatas do treino, o modelo receberia números em outra escala e daria scores errados sem nenhum erro aparente.

**Alternativa também viável:** um `sklearn.pipeline.Pipeline`. O dicionário foi usado porque a transformação de Time/Amount em V29/V30 não é um passo padrão do scikit-learn, e o dicionário deixa cada peça visível para o grupo.

### D14. Django para a tela

**Decisão:** um app Django (`monitor`) dentro do projeto Django do grupo (`projetointegrador_vi`).

**Por quê:** o grupo já tinha um projeto Django (com o app `login`). O modelo é Python, então servi-lo no mesmo processo evita uma API separada.

### D15. Carregar o modelo uma vez, em memória

**Decisão:** `@lru_cache(maxsize=1)` em `carregar_pacote()` e `carregar_demo()`.

**Por quê:** carregar o `joblib` a cada requisição custaria muito mais que pontuar. Com o cache, o primeiro acesso carrega e os seguintes reaproveitam.

### D16. O navegador pede uma transação por vez

**Decisão:** a tela chama `GET /api/transacao/<n>/` a cada tick, e o servidor pontua a transação na hora.

**Alternativa:** pontuar as 1.900 de uma vez e mandar tudo para o navegador.

**Por quê:** simula o cenário real (cada transação passa pelo modelo quando chega) e permite medir e mostrar o tempo de resposta do modelo.

### D17. Demo com 5% de fraude

**Decisão:** `demo/transacoes_demo.csv` tem as 95 fraudes do conjunto de apresentação e 1.805 normais sorteadas dele (1 fraude a cada 20).

**Por quê:** na proporção real, a plateia veria uma fraude a cada ~600 transações, ou seja, a cada 2 minutos a 5 por segundo. A tela avisa que a proporção foi aumentada. Efeito colateral: os falsos alarmes aparecem bem menos que no uso real (veja [03 · Métricas](03-metricas.md#os-contadores-da-tela)).

### D18. Limite ajustável na tela, em escala logarítmica

**Decisão:** o controle do limite e o eixo do gráfico usam escala log.

**Por quê:** os scores do LOF ficam perto de 1 para transações normais e vão a mais de 10 em algumas fraudes. Numa escala linear, toda a região interessante (1 a 3) ocuparia uma faixa minúscula do controle.

### D19. Funcionar sem internet

**Decisão:** o Chart.js 4.4.1 fica em `monitor/static/monitor/chart.umd.js`, sem CDN.

**Por quê:** a apresentação não pode depender da rede da sala.

### D20. Tabela de transações com o histórico completo

**Decisão:** a tabela "Transações chegando" mostra todas as transações da sessão numa área com rolagem e cabeçalho fixo. A cada transação nova, só a linha dela é inserida; a tabela inteira só é redesenhada quando o limite muda (porque aí as decisões antigas mudam).

**Por quê:** permite voltar a uma fraude que já passou durante a apresentação, sem pesar no navegador mesmo com as 1.900 linhas.
