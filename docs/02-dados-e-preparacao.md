# 02 · Dados e preparação

Corresponde às seções 3 a 8 do notebook [03_analise_completa.ipynb](../notebooks/03_analise_completa.ipynb).

## A base

**Credit Card Fraud Detection**, publicada pelo Machine Learning Group da ULB (Université Libre de Bruxelles) no Kaggle.

- Transações de cartões europeus em **dois dias de setembro de 2013**.
- **284.807 transações**, **492 fraudes** (0,17%).
- Sem valores nulos.

| Coluna | O que é |
| --- | --- |
| `Time` | Segundos desde a primeira transação da base |
| `V1` a `V28` | Colunas anônimas. O banco aplicou PCA nos dados originais por privacidade, então não dá para saber o que cada uma significa |
| `Amount` | Valor da transação, em euros |
| `Class` | 1 = fraude, 0 = normal |

A base fica em `data/creditcard.zip` e o notebook lê o zip direto, sem descompactar.

## 1. Limpeza: remoção de duplicadas

A base tem **1.081 linhas idênticas** em todas as colunas, inclusive no horário (19 delas são fraudes). Depois da remoção, restam **283.726 transações e 473 fraudes (0,167%)**.

Foram removidas por dois motivos:

- **Vazamento:** uma cópia poderia cair no treino e a outra na avaliação. O modelo seria avaliado numa transação que já viu, e o resultado sairia otimista.
- **LOF:** ele mede distâncias entre transações. Pontos repetidos (distância zero) distorcem a densidade local que ele calcula.

## 2. Verificação: as colunas V já passaram por PCA?

`V1` a `V28` têm média praticamente zero e desvio padrão caindo de 1,95 (`V1`) até 0,33 (`V28`). É a assinatura do PCA, que ordena as componentes da que mais varia para a que menos varia.

`Time` (média 94.811) e `Amount` (média 88, desvio 250) estão em outra escala: **não** passaram pelo PCA e precisam de tratamento.

## 3. Exploração

Os gráficos ficam em `resultados/`.

| Pergunta | Achado | Gráfico |
| --- | --- | --- |
| Qual o tamanho do desbalanceamento? | 283.253 normais contra 473 fraudes | `desbalanceamento.png` |
| A fraude depende do horário? | Sim. Nas horas de pouco movimento a taxa sobe: chega a 1,45% na "hora 2", contra 0,17% na média | `fraude_por_hora.png` |
| A fraude tem valor diferente? | A fraude típica é **menor** (mediana € 9,82 contra € 22,00), mas algumas fraudes altas puxam a média para cima (€ 123,87 contra € 88,41). Valor sozinho não separa as classes | `valor_por_classe.png` |
| As colunas são redundantes? | Não. Entre `V1` e `V28` a correlação é praticamente zero, como esperado do PCA. Não há colunas duplicadas para remover | `correlacao.png` |
| Quais colunas diferenciam fraude? | Em algumas colunas (`V14`, `V17`, `V12`, `V10`...) as curvas de fraude e de normal ficam bem separadas; em outras se sobrepõem | `distribuicao_colunas.png` |

A "hora" é aproximada: `Time` conta a partir da primeira transação, não da meia-noite.

## 4. Divisão dos dados

Os dados são divididos **antes de qualquer cálculo** (média, PCA, ranking de colunas). Assim nada do que é usado para avaliar participa do aprendizado.

| Conjunto | Parte | Linhas | Fraudes | Uso |
| --- | --- | --- | --- | --- |
| Treino | 60% | 170.235 | 284 | O modelo aprende; o ranking de colunas é calculado |
| Validação | 20% | 56.745 | 94 | Comparar configurações e escolher os finalistas |
| Apresentação | 20% | 56.746 | 95 | Avaliação final, usada **uma única vez** |

- Dois `train_test_split` seguidos: o primeiro separa 20% para a apresentação; o segundo divide os 80% restantes com `test_size=0.25` (25% de 80% = 20%).
- `stratify=y` mantém a mesma proporção de fraude nas três partes (0,166% a 0,167%).
- `random_state=42` deixa o sorteio reproduzível.

## 5. Pré-processamento

A regra: **`fit` só no treino, `transform` em tudo.** Validação e apresentação recebem apenas o que foi aprendido no treino, como transações novas num sistema real.

**Passo 1. `Time` e `Amount` viram `V29` e `V30`.** As duas colunas são padronizadas (`StandardScaler`) e passam por um PCA de 2 componentes, para ficarem no mesmo padrão das outras. As originais são descartadas.

**Passo 2. As 30 colunas são padronizadas** (média 0, desvio 1) com outro `StandardScaler`. O LOF mede distâncias, e sem isso colunas com números maiores pesariam mais. O Isolation Forest não precisa de padronização, mas recebe os mesmos dados para a comparação ser justa.

**Conferência:** no treino as colunas ficam com média exatamente 0 e desvio 1; na validação ficam perto disso (por exemplo, desvio 0,98 ou 1,01), mas não exatas. Essa pequena diferença mostra que a validação não participou do aprendizado.

Os três objetos aprendidos (`scaler_time_amount`, `pca_time_amount`, `scaler_geral`) são salvos junto com o modelo, para que a aplicação aplique exatamente as mesmas transformações. Veja [07 · Aplicação web](07-aplicacao-web.md).

## 6. Seleção de colunas

As 30 colunas são ordenadas pela **informação mútua** com a `Class`, calculada só no treino. A correlação de Pearson é calculada junto, só para comparar.

| Posição | Coluna | Informação mútua | Posição na correlação |
| --- | --- | --- | --- |
| 1 | V17 | 0,0079 | 1 |
| 2 | V14 | 0,0079 | 2 |
| 3 | V10 | 0,0071 | 4 |
| 4 | V12 | 0,0071 | 3 |
| 5 | V11 | 0,0063 | 8 |
| 6 | V16 | 0,0058 | 6 |
| 7 | V3 | 0,0046 | 5 |
| 8 | V4 | 0,0046 | 9 |
| 9 | V9 | 0,0040 | 13 |
| 10 | V18 | 0,0039 | 10 |

Tabela completa em `resultados/ranking_colunas.csv`.

- **Os dois critérios concordam no topo** (V17, V14, V10, V12), o que indica uma seleção estável.
- **V11 e V9** sobem bastante na informação mútua em relação à correlação: têm relação não linear com a fraude, que a correlação não capta.
- Os valores de informação mútua são pequenos porque ela não passa da incerteza total da `Class`, que é baixíssima com 0,17% de fraude. O que importa é a ordem.
- `V29` e `V30` (Time e Amount) ficaram em 23º e 24º: confirmam a exploração, que mostrou que valor e horário sozinhos separam pouco.

**Quantas colunas manter** não foi decidido no olho. Foram testados 7 subconjuntos e o desempenho na validação decidiu:

| Nome | Colunas |
| --- | --- |
| Sem seleção | As 30 |
| MI-5, MI-10, MI-15, MI-20 | Top 5, 10, 15 e 20 da informação mútua |
| Corr-10, Corr-15 | Top 10 e 15 da correlação (para comparar os critérios) |

O resultado está em [04 · Modelos e experimentos](04-modelos-e-experimentos.md).
