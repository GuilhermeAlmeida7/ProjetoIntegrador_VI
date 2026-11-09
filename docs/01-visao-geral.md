# 01 · Visão geral

## O problema

Fraude em cartão de crédito é rara. Na base usada, **0,17% das transações** são fraude: uma a cada 600. Isso cria dois problemas:

1. **Acertar "quase tudo" é fácil e inútil.** Um sistema que aprova toda transação acerta 99,83% das vezes e não impede nenhuma fraude.
2. **Há poucos exemplos de fraude para aprender.** São 473 fraudes contra 283 mil transações normais.

## A abordagem: detecção de anomalias

Em vez de ensinar o modelo a reconhecer fraude (o que exigiria muitos exemplos dela), o projeto ensina o modelo a reconhecer **o que é uma transação normal**. Tudo que foge muito do normal vira alerta.

- O modelo **treina só com transações normais**. Nunca vê uma fraude durante o treino.
- Para cada transação nova, devolve um **score de anomalia**: quanto maior, mais estranha.
- Se o score passa de um **limite de decisão**, a transação é marcada como suspeita.

Foram comparados dois algoritmos de detecção de anomalias: **Isolation Forest** e **Local Outlier Factor (LOF)**. O LOF venceu.

## O caminho, de ponta a ponta

```
creditcard.zip (Kaggle)
   │
   ├─ 1. Limpeza ............ remove 1.081 linhas duplicadas
   ├─ 2. Divisão ............ treino 60% · validação 20% · apresentação 20%
   ├─ 3. Pré-processamento .. Time e Amount viram V29 e V30; tudo padronizado
   ├─ 4. Seleção de colunas . ranking por informação mútua (só no treino)
   ├─ 5. Experimentos ....... 2 modelos × 7 subconjuntos × vários parâmetros, na validação
   ├─ 6. Avaliação final .... finalistas testados uma única vez na apresentação
   └─ 7. Modelo salvo ....... modelos/modelo_fraude.joblib
                                   │
                                   └─ Tela Django (monitor) ── simula transações ao vivo
```

Cada etapa tem um documento próprio: [02](02-dados-e-preparacao.md) cobre 1 a 4, [04](04-modelos-e-experimentos.md) cobre 5 e [05](05-avaliacao-final.md) cobre 6.

## O resultado

No conjunto de apresentação (20% dos dados, guardados desde o início e usados uma única vez):

| Modelo | AUPRC | Precision | Recall | Fraudes pegas | Falsos alarmes | Valor fraudado pego |
| --- | --- | --- | --- | --- | --- | --- |
| **LOF** (escolhido) | **0,665** | **0,468** | **0,768** | **73 de 95** | **83** | **74,3%** |
| Isolation Forest | 0,519 | 0,377 | 0,758 | 72 de 95 | 119 | 72,6% |

Os dois pegam quase as mesmas fraudes, mas o LOF gera 30% menos falsos alarmes. Para comparação, um modelo que sorteasse scores teria AUPRC de cerca de 0,0017.

O que significam essas métricas está em [03 · Métricas](03-metricas.md).

## O modelo final

| Item | Valor |
| --- | --- |
| Algoritmo | `LocalOutlierFactor(n_neighbors=50, novelty=True)` |
| Colunas usadas | `V17`, `V14`, `V10`, `V12`, `V11` (Top 5 da informação mútua) |
| Dados de treino | 49.446 transações normais (amostra de 50 mil, sem duplicadas) |
| Limite de decisão | score ≥ 1,957 |
| Arquivo | `modelos/modelo_fraude.joblib` (modelo + scaler + PCA + lista de colunas) |

## A tela

Um app Django (`monitor`) carrega o modelo salvo e mostra três abas:

- **Ao vivo:** transações do conjunto de apresentação chegam uma a uma, o modelo pontua cada uma na hora e a tela mostra a decisão, contadores e um gráfico do score. O limite pode ser ajustado e tudo é recalculado.
- **Testar transação:** sorteia uma fraude ou uma transação normal e deixa mexer nas 5 colunas do modelo para ver o score mudar.
- **Resultados do modelo:** tabela da avaliação final e os gráficos do notebook.

Detalhes em [07 · Aplicação web](07-aplicacao-web.md).

## Estrutura do repositório

| Pasta | Conteúdo |
| --- | --- |
| `notebooks/` | `01_eda` (exploração inicial), `02_modelagem` (primeiros experimentos), `03_analise_completa` (**versão final**) |
| `ml/` | `pontuar.py`: carrega o modelo e pontua transações cruas. `eda.py`: versão em script do notebook 01 |
| `modelos/` | O modelo treinado |
| `demo/` | As 1.900 transações usadas na simulação |
| `resultados/` | Gráficos e tabelas gerados pelo notebook 03 |
| `monitor/` | App Django da tela |
| `projetointegrador_vi/` | Configuração do Django |
| `login/` | App Django do grupo (ainda vazio) |
| `monitor_fraudes/` | Cópia empacotada da tela e do `pontuar.py`, para integrar em outro projeto Django |
| `data/` | `creditcard.zip`, a base do Kaggle |
| `docs/` | Esta documentação |
