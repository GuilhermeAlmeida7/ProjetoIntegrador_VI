# 05 · Avaliação final

Corresponde às seções 10 e 11 do notebook [03_analise_completa.ipynb](../notebooks/03_analise_completa.ipynb).

## A regra

O conjunto de apresentação (20% dos dados, 95 fraudes) ficou guardado desde a divisão e não participou de nenhuma escolha. Os dois finalistas são avaliados nele **uma única vez**.

Depois disso não se volta para mudar colunas, vizinhos ou árvores. Se mudasse, a apresentação passaria a influenciar a escolha e deixaria de ser um teste honesto.

## Resultado oficial

| Métrica | Isolation Forest | **LOF** |
| --- | --- | --- |
| **AUPRC** | 0,519 | **0,665** |
| Precision | 0,377 | **0,468** |
| Recall | 0,758 | **0,768** |
| F1 | 0,503 | **0,582** |
| Jaccard | 0,336 | **0,410** |
| ROC AUC | **0,937** | 0,930 |
| Acurácia | 0,997 | 0,998 |
| Fraudes pegas | 72 de 95 | **73 de 95** |
| Falsos alarmes | 119 | **83** |
| % do valor fraudado pego | 72,6% | **74,3%** |

Arquivo: `resultados/avaliacao_final.csv`. Gráficos: `resultados/curvas_finais.png` e `resultados/matrizes_confusao.png`.

**Leitura:**

- Os dois pegam praticamente as mesmas fraudes (73 contra 72).
- A diferença está nos **falsos alarmes**: o LOF gera 36 a menos (30% menos). Por isso a precision, a F1 e a AUPRC dele são maiores.
- A ROC AUC sai ligeiramente a favor do Isolation Forest, mas ela é pouco sensível a falsos alarmes quando há tantas transações normais (veja [03 · Métricas](03-metricas.md#roc-auc)).

**O LOF foi o modelo escolhido para a aplicação.**

## Teste de overfitting: os quatro conjuntos

Os finalistas foram medidos também nos dados que já conheciam, para ver se só iam bem neles.

| Conjunto | Fraudes | AUPRC Isolation Forest | AUPRC LOF | Recall IF | Recall LOF |
| --- | --- | --- | --- | --- | --- |
| Treino (60%) | 284 | 0,573 | 0,710 | 0,750 | 0,820 |
| Validação (20%) | 94 | 0,662 | 0,740 | 0,840 | 0,883 |
| Treino + validação (80%) | 378 | 0,593 | 0,718 | 0,772 | 0,836 |
| Apresentação (20%) | 95 | 0,519 | 0,665 | 0,758 | 0,768 |

Arquivo: `resultados/comparacao_conjuntos.csv`. Gráfico: `resultados/comparacao_conjuntos.png`.

**Leitura:**

- **Não há sinal de overfitting.** O desempenho no treino não é melhor que nos dados novos. Era esperado: os modelos treinaram só com transações normais e **nunca viram uma fraude**, então não têm como "decorar" as fraudes do treino.
- **A validação teve o melhor resultado nos dois modelos.** As escolhas de colunas e parâmetros foram feitas olhando para ela, então ela sai um pouco otimista. É por isso que o número oficial é o da apresentação.
- **A queda dos 80% para a apresentação é moderada e parecida nos dois** (−0,074 no IF, −0,053 no LOF). Com ~95 fraudes por conjunto, essa variação é esperada.
- **O LOF foi melhor nos quatro conjuntos.** A vantagem dele é consistente, não resultado de uma divisão favorável.

## Análise do limite

O limite padrão (`contamination`) faz o modelo marcar ~0,17% das transações como suspeitas. Mas o limite é uma **decisão de negócio**: um banco pode aceitar revisar mais transações para pegar mais fraudes.

A tabela mostra, na **validação**, o que acontece ao revisar as X% transações mais suspeitas:

| % revisado | Alertas | LOF: fraudes pegas | LOF: recall | LOF: precision | IF: recall | IF: precision |
| --- | --- | --- | --- | --- | --- | --- |
| 0,10% | 57 | 47 | 0,500 | 0,825 | 0,500 | 0,825 |
| **0,17%** (padrão) | 97 | 78 | 0,830 | 0,804 | 0,702 | 0,680 |
| 0,25% | 142 | 82 | 0,872 | 0,577 | 0,819 | 0,542 |
| 0,50% | 284 | 83 | 0,883 | 0,292 | 0,872 | 0,289 |
| 1,00% | 568 | 83 | 0,883 | 0,146 | 0,872 | 0,144 |
| 2,00% | 1.135 | 83 | 0,883 | 0,073 | 0,894 | 0,074 |

Arquivo: `resultados/analise_limite.csv`. Gráfico: `resultados/analise_limite.png`.

**Leitura:**

- **No limite padrão o LOF já captura quase tudo que consegue.** Passar de 0,17% para 0,25% pega mais 4 fraudes e custa 45 alertas a mais. De 0,5% em diante, o LOF não pega nenhuma fraude nova: as ~11 fraudes restantes da validação têm score de transação normal e nenhum limite razoável as separa.
- **A vantagem do LOF está justamente na faixa do limite padrão** (recall 0,830 contra 0,702), que é a faixa operacionalmente viável.
- Na avaliação final o limite usado foi o padrão, definido antes de olhar os resultados.

Na tela, o controle **Limite de decisão** permite repetir essa análise ao vivo: arrastar para a esquerda pega mais fraudes e gera mais falsos alarmes.

## Teste do modelo salvo

O notebook recarrega `modelo_fraude.joblib` e pontua transações cruas da apresentação, como a aplicação faz:

| Score | Suspeita | Valor | Classe real |
| --- | --- | --- | --- |
| 5,460 | sim | € 76,94 | Fraude |
| 5,303 | sim | € 1.354,25 | Fraude |
| 1,659 | não | € 1,00 | Fraude |
| 0,993 | não | € 11,50 | Normal |
| 1,034 | não | € 1,94 | Normal |
| 1,009 | não | € 91,28 | Normal |

Transações normais ficam com score perto de 1. A terceira fraude (score 1,659, abaixo do limite de 1,957) é um exemplo das que passam.
