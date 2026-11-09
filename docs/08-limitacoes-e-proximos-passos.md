# 08 · Limitações e próximos passos

## Limitações

### Dos dados

- **PCA feito na base inteira.** `V1` a `V28` vieram prontas do Kaggle, com o PCA aplicado a todas as transações antes de qualquer divisão. Informação da validação e da apresentação já está "dentro" dessas colunas. É um vazamento que não dá para corrigir e tende a deixar as métricas um pouco otimistas.
- **Colunas anônimas.** Não dá para explicar a um analista *por que* uma transação foi marcada ("V14 muito negativa" não significa nada para o negócio).
- **Dados antigos e curtos.** Dois dias de 2013, de um único banco europeu. Padrões de fraude mudam; o modelo não foi testado ao longo do tempo.
- **Sem dados de cliente.** Não há identificador de cartão, então o modelo não compara a transação com o histórico do próprio cliente, que é a informação mais forte em sistemas reais.

### Da avaliação

- **Poucas fraudes na avaliação.** ~95 fraudes na validação e na apresentação. Uma fraude a mais ou a menos muda o recall em ~1 ponto percentual. Diferenças pequenas de AUPRC (como entre MI-5 e MI-10 no LOF) podem ser só ruído.
- **Divisão aleatória, não temporal.** O treino tem transações dos dois dias, misturadas com as de avaliação. Em produção, o modelo seria treinado no passado e usado no futuro. Uma divisão por `Time` seria mais realista.
- **Validação otimista.** 49 configurações escolhidas na mesma validação. É por isso que existe o conjunto de apresentação, e o número oficial é o dele.

### Do modelo

- **Amostra de treino.** 50 mil das 170 mil normais, por causa do custo do LOF.
- **~23% das fraudes passam.** 22 das 95 fraudes da apresentação têm score de transação normal. A análise do limite mostra que baixar o limite não as recupera: elas não são anomalias nas colunas usadas.
- **O LOF guarda os dados de treino.** O arquivo do modelo carrega as 49 mil transações e cada pontuação compara com elas. Escala pior que o Isolation Forest.
- **Limite fixo.** O limite foi definido pelo `contamination`, não por custo real (quanto custa uma fraude perdida contra um falso alarme).

### Da aplicação

- **A demo tem 5% de fraude.** Os falsos alarmes na tela não representam os reais.
- **Pré-processamento duplicado.** O mesmo código existe no notebook e em `ml/pontuar.py`, e a pasta `monitor_fraudes/` duplica a tela inteira.
- **Configuração de desenvolvimento.** Ver [07 · Aplicação web](07-aplicacao-web.md#antes-de-publicar-fora-da-máquina-local).
- **Sem testes automatizados.**

## Próximos passos

Em ordem aproximada de impacto:

1. **Limite por custo.** Atribuir um custo a cada fraude perdida (o valor dela) e a cada falso alarme (custo de revisão) e escolher o limite que minimiza o custo total na validação.
2. **Comparar com um modelo supervisionado** (por exemplo, regressão logística ou random forest com `class_weight="balanced"`), para medir quanto a abordagem não supervisionada perde ou ganha nesta base.
3. **Combinar os dois modelos.** O LOF e o Isolation Forest erram em fraudes diferentes? Uma média dos scores normalizados pode pegar mais fraudes.
4. **Validação temporal.** Treinar no primeiro dia e avaliar no segundo.
5. **Validação cruzada estratificada** para ter intervalo de confiança da AUPRC, em vez de um número só.
6. **Um único `Pipeline` do scikit-learn** com o pré-processamento e o modelo, eliminando a duplicação entre notebook e `pontuar.py`.
7. **Testes** para `ml/pontuar.py` (o score de uma transação conhecida não muda) e para as rotas da API.
8. **Explicação por transação**, mostrando qual coluna mais contribuiu para o score, mesmo sendo colunas anônimas.
