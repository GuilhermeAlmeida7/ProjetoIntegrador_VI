# 07 · Aplicação web

Como a tela funciona por dentro. Para rodar, veja o [README da raiz](../README.md#3-rodar-a-tela). Para o roteiro da apresentação, veja [monitor/LEIA-ME.md](../monitor/LEIA-ME.md).

## Arquitetura

```
Navegador (painel.js + Chart.js)
   │  fetch a cada tick / ao mexer nos controles
   ▼
Django: monitor/views.py ──────────── resultados/*.png, avaliacao_final.csv
   │
   ▼
ml/pontuar.py
   ├─ carregar_pacote() ─► modelos/modelo_fraude.joblib   (carregado 1 vez)
   ├─ carregar_demo()   ─► demo/transacoes_demo.csv       (carregado 1 vez)
   └─ pontuar_transacoes(): transação crua → pré-processamento → score
```

Não há banco de dados envolvido na tela. O `db.sqlite3` existe só porque o Django pede `migrate` para os apps padrão.

## Do dado cru ao score: `ml/pontuar.py`

É o único ponto do projeto que usa o modelo. Repete exatamente o pré-processamento do notebook:

1. Recebe um DataFrame com `Time`, `V1`–`V28`, `Amount`.
2. `scaler_time_amount` + `pca_time_amount` transformam `Time` e `Amount` em `V29` e `V30`.
3. `scaler_geral` padroniza as 30 colunas.
4. Mantém só as 5 colunas do modelo (`V17`, `V14`, `V10`, `V12`, `V11`).
5. `score = -modelo.score_samples(X)` (maior = mais suspeito).
6. `suspeita = score >= limite`, com `limite = -modelo.offset_` = **1,957**.

| Função | O que faz |
| --- | --- |
| `carregar_pacote()` | Lê o `joblib` uma vez (`lru_cache`). Se o arquivo não existe, levanta `ModeloNaoEncontrado` com instruções |
| `limite_decisao()` | O score de corte aprendido pelo modelo a partir do `contamination` |
| `preparar(df)` | Passos 2 a 4 |
| `pontuar_transacoes(df)` | Devolve `score` e `suspeita` para cada linha |
| `carregar_demo()` | Lê as 1.900 transações da demo uma vez |
| `faixa_de_scores()` | Percentis 1 e 99,5 dos scores da demo (0,97 a 12,46), usados como escala do controle de limite |
| `faixas_das_colunas()` | Mínimo e máximo de cada coluna do modelo na demo, usados nos controles da aba "Testar" |

**Atenção:** a transformação está escrita em dois lugares, no notebook (`pontuar_transacoes`, seção 12) e em `ml/pontuar.py`. Se o pré-processamento mudar no notebook, o `pontuar.py` precisa mudar junto.

## Rotas

Definidas em `monitor/urls.py`, incluídas na raiz por `projetointegrador_vi/urls.py`.

| Método e rota | View | Resposta |
| --- | --- | --- |
| `GET /` | `painel` | A página. Passa ao JavaScript um JSON com nome do modelo, colunas, limite, faixas, tamanho da demo, token CSRF e URLs |
| `GET /api/transacao/<n>/` | `api_transacao` | Pontua a transação `n` da demo: `id`, `hora`, `valor`, `score`, `classeReal`, `tempoMs`. Usa `n % 1900`, então a simulação recomeça do início se passar do fim |
| `GET /api/amostra/?classe=1` | `api_amostra` | Sorteia uma fraude (`1`) ou uma normal (`0`) da demo e devolve as 30 colunas cruas |
| `POST /api/pontuar/` | `api_pontuar` | Recebe `{"transacao": {"Time": ..., "V1": ..., "Amount": ...}}` e devolve `{"score", "suspeita"}`. Exige token CSRF |
| `GET /graficos/<arquivo>.png` | `grafico` | Serve uma imagem de `resultados/` |
| `/admin/` | Django | Admin padrão |

**Validações:**
- `api_pontuar` recusa (HTTP 400) campos faltando, não numéricos, `NaN` ou infinito.
- `grafico` só serve arquivos que estão na lista `GRAFICOS` da view. Isso impede pedir qualquer outro arquivo do servidor pela URL.
- Se o modelo ou a demo não existem, a página mostra uma mensagem explicando como gerá-los, em vez de um erro 500.

## O front-end: `painel.js`

Um único arquivo, sem framework. Todo o estado fica num objeto `estado` (índice atual, histórico de transações, limite).

### Aba "Ao vivo"

- **Simulação:** `buscarProxima()` chama a API, adiciona a transação ao histórico e agenda a próxima com `setTimeout` conforme a velocidade escolhida. *Pausar* cancela o timer; *Reiniciar* zera o histórico.
- **Classificação no navegador:** a API devolve só o score. A decisão (`score >= limite`) e o resultado ("Fraude pega", "Falso alarme", "Fraude passou", "Aprovada corretamente") são calculados no JavaScript. É isso que permite mudar o limite e recalcular tudo na hora, sem chamar o servidor de novo.
- **Contadores:** recalculados sobre todo o histórico a cada atualização. Significado de cada um em [03 · Métricas](03-metricas.md#os-contadores-da-tela).
- **Tabela:** histórico completo, mais recente no topo, com rolagem e cabeçalho fixo.
- **Gráfico:** Chart.js com as últimas 80 transações, eixo Y logarítmico, fraudes reais em laranja e a linha tracejada do limite.
- **Limite de decisão:** controle deslizante em escala log entre os percentis 1 e 99,5 dos scores. *Voltar ao limite do modelo* restaura 1,957.

### Aba "Testar transação"

1. *Sortear uma fraude* ou *uma normal* chama `/api/amostra/`.
2. Um controle deslizante é criado para cada coluna do modelo.
3. Ao mexer num controle, a tela espera 120 ms sem novas mudanças (para não disparar uma requisição a cada pixel) e chama `POST /api/pontuar/` com a transação alterada.
4. O veredito, o score e um medidor com a posição do limite são atualizados.

Serve para mostrar quais colunas pesam: numa fraude, levar `V14` ou `V17` em direção a zero costuma derrubar o score para baixo do limite.

### Aba "Resultados do modelo"

Renderizada no servidor. A tabela vem de `resultados/avaliacao_final.csv` (com a linha do modelo escolhido destacada) e os gráficos da lista `GRAFICOS` em `views.py`.

## Arquivos

| Arquivo | Papel |
| --- | --- |
| `ml/pontuar.py` | Carrega o modelo e pontua |
| `monitor/views.py` | Página e API |
| `monitor/urls.py` | Rotas |
| `monitor/templates/monitor/painel.html` | Estrutura das três abas |
| `monitor/static/monitor/painel.js` | Simulação, gráfico, limite, aba de teste |
| `monitor/static/monitor/painel.css` | Visual |
| `monitor/static/monitor/chart.umd.js` | Chart.js 4.4.1 local (licença MIT em `chart.LICENSE.md`) |

Os links para `painel.css` e `painel.js` no template levam `?v=2`. Ao alterar um desses arquivos, aumente o número para forçar o navegador a baixar a versão nova em vez de usar o cache.

## A pasta `monitor_fraudes/`

Cópia empacotada da tela: o app `monitor`, o `ml/pontuar.py`, os `settings.py`/`urls.py` com as alterações já feitas e o `requirements.txt`. Serve para colar a tela em outra cópia do projeto Django do grupo.

**Ela não é usada quando se roda o projeto a partir da raiz.** Alterações em `monitor/` ou `ml/pontuar.py` precisam ser copiadas para lá manualmente.

## Requisitos de versão

O `joblib` guarda o objeto Python do modelo. Ele só carrega com segurança na **mesma versão de scikit-learn** usada para salvar (1.9.1, Python 3.14; veja `requirements.txt`). Com outra versão, `joblib.load` pode falhar ou emitir avisos.

## Antes de publicar fora da máquina local

A configuração atual é de desenvolvimento e serve para a demonstração local:

- `DEBUG = True` e `SECRET_KEY` fixa no `settings.py`.
- `ALLOWED_HOSTS = []` (só aceita `localhost`).
- `runserver` é o servidor de desenvolvimento do Django.

Para publicar seria preciso, no mínimo, ler a `SECRET_KEY` de variável de ambiente, desligar o `DEBUG`, preencher o `ALLOWED_HOSTS`, rodar `collectstatic` e usar um servidor como gunicorn.
