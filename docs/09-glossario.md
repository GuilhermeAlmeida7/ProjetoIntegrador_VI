# 09 · Glossário

| Termo | Significado |
| --- | --- |
| **Anomalia** | Transação muito diferente do padrão das transações normais |
| **AUPRC** | Área sob a curva precision-recall. Mede quão bem o score ordena as transações, em todos os limites. Métrica principal do projeto. Aleatório ≈ 0,0017; perfeito = 1 |
| **Conjunto de apresentação** | Os 20% dos dados guardados desde o início e usados uma única vez, na avaliação final. Em outros materiais costuma se chamar "conjunto de teste" |
| **Conjunto de treino** | Os 60% dos dados em que o modelo aprende e o ranking de colunas é calculado |
| **Conjunto de validação** | Os 20% dos dados usados para comparar configurações e escolher os finalistas |
| **`contamination`** | Parâmetro dos dois modelos: a fração de transações que o modelo deve marcar como anômala. Define o limite de decisão |
| **Desbalanceamento** | Uma classe muito mais frequente que a outra. Aqui: 99,83% normais, 0,17% fraudes |
| **Falso alarme (falso positivo)** | Transação normal marcada como suspeita |
| **Fraude que passou (falso negativo)** | Fraude aprovada sem alerta |
| **`fit` / `transform`** | `fit`: a ferramenta aprende algo dos dados (média, desvio, direções do PCA). `transform`: aplica o que aprendeu. No projeto, `fit` só no treino |
| **Informação mútua** | Quanto saber o valor de uma coluna reduz a incerteza sobre a classe. Capta relações não lineares, ao contrário da correlação |
| **Isolation Forest** | Modelo que isola transações com cortes aleatórios. Anomalias ficam isoladas com poucos cortes |
| **Limite de decisão** | Score a partir do qual a transação vira alerta. No modelo final: 1,957 |
| **LOF (Local Outlier Factor)** | Modelo que compara a densidade em volta de uma transação com a densidade em volta das vizinhas. Modelo escolhido |
| **MI-5, MI-10...** | Subconjuntos com as 5, 10... colunas de maior informação mútua. Corr-10 e Corr-15 usam a correlação |
| **`novelty=True`** | Modo do LOF que permite pontuar transações que não estavam no treino |
| **Overfitting** | Modelo que vai bem nos dados que conhece e mal em dados novos |
| **PCA** | Análise de componentes principais. Gera colunas novas, independentes entre si, ordenadas pela variância. O banco usou para anonimizar V1–V28 |
| **Precision** | Dos alertas, quantos eram fraude |
| **`random_state`** | Semente dos sorteios. Fixada em 42 para os resultados serem reproduzíveis |
| **Recall** | Das fraudes, quantas foram pegas |
| **ROC AUC** | Área sob a curva ROC. Sai alta mesmo com muitos falsos alarmes quando há muitas normais, por isso não é usada para escolher |
| **Score de anomalia** | Número devolvido pelo modelo para cada transação. Maior = mais suspeita. No LOF, ~1 é normal |
| **`StandardScaler`** | Padronização: deixa cada coluna com média 0 e desvio 1 |
| **`stratify`** | Opção da divisão que mantém a mesma proporção de fraude em todos os conjuntos |
| **Vazamento de dados** | Quando informação dos dados de avaliação entra no treino, deixando o resultado otimista |
| **Verdadeiro positivo** | Fraude pega |
