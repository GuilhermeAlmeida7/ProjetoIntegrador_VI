# 04 · Modelos e experimentos

Corresponde à seção 9 do notebook [03_analise_completa.ipynb](../notebooks/03_analise_completa.ipynb).

## Os dois modelos

### Isolation Forest

O modelo constrói várias árvores. Cada árvore sorteia uma coluna e um ponto de corte, e vai dividindo os dados até cada transação ficar sozinha. Transações estranhas, longe das outras, ficam isoladas com **poucos cortes**. O score é a média de cortes em todas as árvores: quanto menos cortes, mais suspeita.

- **Pontos fortes:** muito rápido, não precisa guardar os dados de treino, não depende de escala.
- **Ponto fraco:** sorteia a coluna de cada corte. Colunas inúteis desperdiçam cortes.
- **Parâmetro testado:** `n_estimators` (número de árvores): 50, 100, 200 e 500.

Referência: Liu, Ting e Zhou, *Isolation Forest*, IEEE ICDM 2008.

### Local Outlier Factor (LOF)

Para cada transação, o LOF olha as `k` vizinhas mais próximas e compara a **densidade em volta dela** com a densidade em volta das vizinhas. Uma transação numa região bem mais vazia que a das vizinhas é suspeita. O score é a razão entre as densidades: perto de 1 é normal; bem acima de 1 é anomalia.

- **Pontos fortes:** capta anomalias "locais", que estão perto de dados normais mas numa região esparsa.
- **Pontos fracos:** mais lento, precisa guardar os dados de treino, sensível à escala e a pontos duplicados.
- **Parâmetro testado:** `n_neighbors` (número de vizinhos): 20, 50 e 100.

Referência: Breunig et al., *LOF: Identifying Density-Based Local Outliers*, ACM SIGMOD 2000.

## Regras iguais para os dois

Para a comparação ser justa:

| Regra | Detalhe |
| --- | --- |
| Mesmos dados de treino | Amostra de **50 mil transações normais** do treino. O LOF ficaria lento demais com as 170 mil |
| Treino sem fraude | Os dois só veem transações normais |
| Mesmo limite | `contamination = 0,00167` (proporção de fraude do treino). O modelo marca como suspeita a fração mais estranha nessa proporção |
| Mesma avaliação | Mesmas métricas, sempre no conjunto de validação |
| Score na mesma direção | `-score_samples(...)`, para que **maior = mais suspeito** nos dois |

**Cuidados específicos do LOF:**

- `novelty=True`: sem isso, o LOF só pontua os dados em que foi treinado e não consegue julgar transações novas.
- **Duplicadas por subconjunto:** mesmo com a base limpa, ao usar só 5 ou 10 colunas, transações diferentes podem ficar iguais nessas colunas. Elas são removidas do treino do LOF em cada experimento (50.000 → 49.446 linhas).

## Os experimentos

2 modelos × 7 subconjuntos de colunas × 3 ou 4 valores de parâmetro = **49 configurações**, todas medidas na validação. Tabelas completas: `resultados/validacao_isolation_forest.csv` e `resultados/validacao_lof.csv`.

### Melhor AUPRC de cada modelo por subconjunto

| Subconjunto | Colunas | Isolation Forest | LOF |
| --- | --- | --- | --- |
| Sem seleção | 30 | 0,165 | 0,642 |
| MI-5 | 5 | 0,678 | 0,744 |
| **MI-10** | 10 | 0,675 | **0,754** |
| MI-15 | 15 | 0,448 | 0,702 |
| MI-20 | 20 | 0,330 | 0,700 |
| **Corr-10** | 10 | **0,699** | 0,718 |
| Corr-15 | 15 | 0,429 | 0,724 |

Gráfico: `resultados/comparacao_validacao.png`.

### O que os experimentos mostraram

**1. A seleção de colunas é decisiva para o Isolation Forest.** Com as 30 colunas a AUPRC é 0,165; com as 5 melhores, 0,678: **4 vezes mais**. Como ele sorteia a coluna de cada corte, com 30 colunas a maioria dos cortes cai em colunas que não diferenciam fraude. Acima de 10 colunas o desempenho despenca.

**2. O LOF é mais robusto ao número de colunas.** Vai de 0,642 (30 colunas) a 0,754 (10 colunas). Ele usa todas as colunas de uma vez para medir distância, então colunas inúteis atrapalham menos.

**3. O número de vizinhos é o parâmetro decisivo do LOF.** Com 20 vizinhos, o LOF vai mal em quase todos os subconjuntos. Exemplo no MI-10: 0,158 com 20 vizinhos, 0,754 com 50. Com poucos vizinhos, um grupo de fraudes parecidas entre si forma uma "região densa" e parece normal. Com 50 ou mais, o LOF olha longe o bastante para perceber que o grupo inteiro está isolado.

**4. O número de árvores pouco importa no Isolation Forest.** De 100 para 500 árvores a AUPRC muda pouco (MI-5: 0,677 → 0,656) e o tempo de treino quadruplica. Com 50 árvores o score fica instável.

**5. Informação mútua e correlação empatam.** Nos subconjuntos de 10 colunas, cada critério venceu num modelo (Corr-10 no Isolation Forest, MI-10 no LOF). As colunas do topo são quase as mesmas nos dois rankings, então a escolha do critério pesa pouco. A informação mútua foi mantida como principal por captar relações não lineares.

**6. O LOF foi melhor em todos os 7 subconjuntos.**

### Histórico: por que o LOF quase foi descartado

Na primeira rodada (notebook `02_modelagem` e `resultados/comparacao_validacao.csv`), o LOF foi testado com o padrão do scikit-learn (`n_neighbors=20`) e sem remover duplicadas por subconjunto. O resultado foi péssimo: AUPRC de 0,08 a 0,14 nos subconjuntos com seleção, contra 0,68 do Isolation Forest.

Duas mudanças inverteram o resultado:

1. Remover as duplicadas do treino em cada subconjunto de colunas.
2. Testar 50 e 100 vizinhos (`resultados/lof_ajuste_vizinhos.csv`).

A lição: **comparar modelos com os parâmetros padrão pode levar à conclusão errada.**

## Os finalistas

Os finalistas foram fixados na primeira rodada de experimentos completos, **antes de olhar o conjunto de apresentação**, e não mudaram depois.

| Modelo | Finalista | AUPRC na validação | Melhor configuração desta execução |
| --- | --- | --- | --- |
| Isolation Forest | MI-10, 200 árvores | 0,662 | Corr-10, 100 árvores (0,699) |
| LOF | **MI-5, 50 vizinhos** | 0,740 | MI-10, 50 vizinhos (0,754) |

**Por que o finalista não é exatamente o "melhor" da tabela:**

- **LOF MI-5 em vez de MI-10:** empataram na prática (0,740 a 0,744 contra 0,747 a 0,754, conforme os vizinhos). Com ~94 fraudes na validação, trocar uma ou duas fraudes de posição já mudaria a ordem. Com 5 colunas o modelo é mais simples e mais rápido, e de quebra a aba "Testar transação" fica com 5 controles em vez de 10.
- **Não trocar o finalista depois:** se o finalista fosse trocado a cada execução para o "melhor da vez", a escolha passaria a se ajustar ao ruído da validação. Fixar a escolha mantém a avaliação final honesta.

A comparação lado a lado está no notebook, na célula "Os finalistas", por transparência.

## Como os modelos separam as classes

Os histogramas do score na validação (`resultados/scores_isolation_forest.png` e `resultados/scores_lof.png`) mostram as transações normais concentradas à esquerda do limite e a maior parte das fraudes à direita.

O score do LOF vai de ~1 (normal) a valores acima de 10 em algumas fraudes. Por isso o gráfico do LOF, e também o da tela, usam escala logarítmica.
