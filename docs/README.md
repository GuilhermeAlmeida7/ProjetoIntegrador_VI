# Documentação do projeto

Detecção de fraudes em cartão de crédito com detecção de anomalias. Projeto Integrador VI, PUC-Campinas.

O [README da raiz](../README.md) explica como instalar e rodar. Esta pasta explica **o que foi feito e por quê**.

## Por onde começar

| Se você quer... | Leia |
| --- | --- |
| Entender o projeto em 5 minutos | [01 · Visão geral](01-visao-geral.md) |
| Saber de onde vêm os dados e como foram tratados | [02 · Dados e preparação](02-dados-e-preparacao.md) |
| Entender cada métrica e por que a acurácia não serve | [03 · Métricas](03-metricas.md) |
| Ver como os modelos foram comparados e escolhidos | [04 · Modelos e experimentos](04-modelos-e-experimentos.md) |
| Ver o resultado oficial e a análise do limite | [05 · Avaliação final](05-avaliacao-final.md) |
| Entender as decisões técnicas e as alternativas descartadas | [06 · Decisões técnicas](06-decisoes-tecnicas.md) |
| Mexer na tela, na API ou no código do modelo | [07 · Aplicação web](07-aplicacao-web.md) |
| Saber o que o projeto não resolve | [08 · Limitações e próximos passos](08-limitacoes-e-proximos-passos.md) |
| Consultar um termo | [09 · Glossário](09-glossario.md) |

## O projeto em uma frase

Um **Local Outlier Factor (LOF)** treinado só com transações normais, usando 5 colunas escolhidas por informação mútua, pega **73 de 95 fraudes (77%)** num conjunto que nunca viu, com **AUPRC de 0,665**, e roda numa tela web em Django que simula transações chegando em tempo real.

## De onde vêm os números

Todos os números desta documentação saem do notebook [03_analise_completa.ipynb](../notebooks/03_analise_completa.ipynb) e das tabelas que ele grava em [resultados/](../resultados/). Como tudo usa `random_state=42`, rodar o notebook de novo reproduz os mesmos valores.
