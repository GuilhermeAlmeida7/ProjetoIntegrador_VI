# 03 · Métricas

Como o projeto mede se um modelo é bom, e por que escolheu essas medidas.

## Por que a acurácia não serve

Com 0,17% de fraude, um "modelo" que responde **normal para tudo** tem acurácia de **99,83%** e não pega nenhuma fraude. Os dois modelos do projeto também ficam em torno de 99,8%. A acurácia não distingue um modelo útil de um inútil, então **não é usada para escolher nada**. Ela aparece nas tabelas só para mostrar por que engana.

Todas as métricas usadas olham para as fraudes.

## A matriz de confusão

Toda métrica de classificação sai destes quatro números. Exemplo real: LOF no conjunto de apresentação (95 fraudes, 56.651 normais).

| | Previsto normal | Previsto fraude |
| --- | --- | --- |
| **Real normal** | **56.568** · verdadeiro negativo (VN): aprovada corretamente | **83** · falso positivo (FP): falso alarme |
| **Real fraude** | **22** · falso negativo (FN): fraude que passou | **73** · verdadeiro positivo (VP): fraude pega |

- O canto inferior direito (VP) é o que se quer maximizar.
- O canto inferior esquerdo (FN) é o prejuízo direto: fraude aprovada.
- O canto superior direito (FP) é o custo operacional: cliente bloqueado sem motivo ou analista revisando à toa.

Gráfico: `resultados/matrizes_confusao.png`.

## As métricas, uma a uma

Os exemplos usam os números do LOF acima.

### Precision

> Das transações marcadas como fraude, quantas eram fraude?

`VP / (VP + FP)` = 73 / 156 = **0,468**

Mede o custo dos alertas. Precision de 0,468 quer dizer que, de cada 2 alertas, quase 1 é fraude de verdade.

### Recall (sensibilidade)

> Das fraudes reais, quantas o modelo pegou?

`VP / (VP + FN)` = 73 / 95 = **0,768**

Mede a proteção. Recall de 0,768 quer dizer que 77% das fraudes foram barradas.

### F1

> Um número só que equilibra precision e recall.

`2 · P · R / (P + R)` = **0,582**

É a média harmônica: só fica alta se as duas forem altas. Um modelo com recall 1,0 e precision 0,01 teria F1 de apenas 0,02.

### Jaccard

> Acertos de fraude divididos por tudo que é fraude **ou** foi marcado como fraude.

`VP / (VP + FP + FN)` = 73 / 178 = **0,410**

Ignora os verdadeiros negativos (os acertos fáceis), por isso é mais exigente que a F1.

### AUPRC (área sob a curva precision-recall): a métrica principal

> Quão bem o score ordena as transações, considerando todos os limites de corte possíveis.

Precision, recall, F1 e Jaccard dependem do limite escolhido. A AUPRC não: ela varre todos os limites e resume a curva precision × recall num número de 0 a 1.

- **Referência de um modelo aleatório:** igual à proporção de fraude, **≈ 0,0017**.
- **Modelo perfeito:** 1,0.
- **LOF:** **0,665**, cerca de 390 vezes o aleatório.

É a métrica usada para **escolher** entre modelos e configurações, por dois motivos:

1. Não depende do limite, que é uma decisão de negócio separada (veja [05 · Avaliação final](05-avaliacao-final.md#análise-do-limite)).
2. Foca na classe rara. Não é inflada pela quantidade enorme de transações normais.

No código: `sklearn.metrics.average_precision_score`.

### ROC AUC

> Probabilidade de uma fraude sorteada ter score maior que uma normal sorteada.

Sai alta para os dois modelos (0,930 e 0,937), mas **não é usada para escolher**. A curva ROC usa a taxa de falsos positivos, `FP / (FP + VN)`. Com 56 mil normais no denominador, 83 falsos alarmes viram uma taxa de 0,15%, que parece desprezível. Para fraude rara, a AUPRC mostra a diferença entre os modelos com mais honestidade.

Um exemplo dessa diferença: o Isolation Forest tem ROC AUC **maior** que o LOF (0,937 contra 0,930), mas AUPRC bem **menor** (0,519 contra 0,665) e 36 falsos alarmes a mais.

### % do valor fraudado pego

> Da soma em euros de todas as fraudes, quanto foi barrado?

LOF: **74,3%**. Traduz o resultado para a linguagem de negócio. Fica perto do recall porque o modelo não pega preferencialmente fraudes grandes ou pequenas.

## Resumo: qual métrica responde qual pergunta

| Pergunta | Métrica |
| --- | --- |
| Qual modelo ordena melhor as transações? | **AUPRC** |
| Quantas fraudes eu barro? | Recall |
| Quanto do trabalho de revisão é útil? | Precision |
| Equilíbrio entre as duas | F1 |
| Quanto dinheiro foi protegido? | % do valor fraudado pego |
| Por que não usar acurácia? | Ver início desta página |

## Os contadores da tela

A aba **Ao vivo** mostra a matriz de confusão em forma de contadores, recalculados a cada transação:

| Contador | Equivale a |
| --- | --- |
| Transações analisadas | Total |
| Alertas gerados | VP + FP |
| Fraudes pegas | VP (e o recall entre parênteses) |
| Fraudes que passaram | FN |
| Falsos alarmes | FP (e a taxa sobre as normais) |
| Valor protegido | Soma do valor das fraudes pegas, e o % do valor fraudado |
| Resposta média do modelo | Tempo médio para pontuar uma transação no servidor |

**Cuidado ao comparar com o notebook.** A demo tem **5% de fraude** (95 fraudes e 1.805 normais), contra 0,17% na base real, para que as fraudes apareçam com frequência na apresentação. As 95 fraudes são exatamente as do conjunto de apresentação, então o recall é o mesmo (73 de 95). Mas como há bem menos transações normais, aparecem bem menos falsos alarmes: rodando as 1.900 transações, a tela mostra **1 falso alarme**, contra 83 no conjunto de apresentação completo. **A precision vista na tela não representa a real.**
