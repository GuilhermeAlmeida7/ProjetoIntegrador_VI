# Monitor de Fraudes — guia rápido

Tela de demonstração do modelo de detecção de fraudes, feita como um app Django (`monitor`) dentro do projeto do grupo.

## O que a tela tem

- **Ao vivo:** simula transações chegando uma a uma. Cada transação é enviada ao modelo, que devolve o score na hora. Mostra o feed, os contadores (fraudes pegas, fraudes que passaram, falsos alarmes, valor protegido) e o gráfico do score com a linha do limite. O limite pode ser ajustado e os contadores são recalculados na hora.
- **Testar transação:** sorteia uma fraude ou uma transação normal e permite mexer nas colunas que o modelo usa, para ver o score mudar.
- **Resultados do modelo:** tabela da avaliação final e os gráficos gerados pelo notebook.

Funciona sem internet: o Chart.js está incluído em `monitor/static/monitor/`.

## Como rodar

Na raiz do projeto, com o `venv` ativo:

```bash
python -m pip install -r requirements.txt
python manage.py runserver
```

Abra http://127.0.0.1:8000/ no navegador.

**Arquivos necessários** (gerados pelo notebook `notebooks/03_analise_completa.ipynb`):

| Arquivo | Seção do notebook |
| --- | --- |
| `modelos/modelo_fraude.joblib` | 12. Salvando o modelo |
| `demo/transacoes_demo.csv` | célula da demo, no fim da seção 12 |
| `resultados/*.png` e `resultados/avaliacao_final.csv` | gerados ao longo do notebook |

Se o modelo não estiver na pasta, a página mostra uma mensagem dizendo como gerá-lo.

**Importante:** o modelo precisa ser carregado com as mesmas versões de Python e scikit-learn usadas para salvá-lo (veja o `requirements.txt`). Com versões diferentes, o `joblib.load` pode falhar.

## Roteiro sugerido para a apresentação

1. **Ao vivo:** clique em *Iniciar simulação* em 5 por segundo. Explique que as transações vêm do conjunto de apresentação, que o modelo nunca viu, e que a proporção de fraude foi aumentada para a demonstração.
2. Quando aparecer uma fraude (ponto laranja no gráfico), pause e mostre na tabela se ela foi pega.
3. Arraste o **limite de decisão** para a esquerda: mais fraudes pegas, mais falsos alarmes. Clique em *Voltar ao limite do modelo*.
4. **Testar transação:** sorteie uma fraude, mostre que ela é suspeita e mova um controle (por exemplo V14 ou V17) em direção a zero até ela virar "Aprovada". Isso mostra quais colunas pesam na decisão.
5. **Resultados do modelo:** feche com a tabela final e as curvas.

## Para quem for mexer no código

| Arquivo | O que faz |
| --- | --- |
| `ml/pontuar.py` | Carrega o modelo uma vez e pontua transações cruas (`Time`, `V1`–`V28`, `Amount`) |
| `monitor/views.py` | Página e API |
| `monitor/urls.py` | Rotas |
| `monitor/templates/monitor/painel.html` | Estrutura da página |
| `monitor/static/monitor/painel.js` | Simulação, gráfico e aba de teste |
| `monitor/static/monitor/painel.css` | Visual |

**Rotas da API:**

- `GET /api/transacao/<n>/`: pontua a transação n da demo e devolve id, valor, score, classe real e tempo de resposta.
- `GET /api/amostra/?classe=1` (ou `0`): sorteia uma fraude (ou uma normal) da demo.
- `POST /api/pontuar/`: recebe `{"transacao": {"Time": ..., "V1": ..., ..., "Amount": ...}}` e devolve `{"score": ..., "suspeita": ...}`. Exige o token CSRF.
- `GET /graficos/<arquivo>.png`: imagens de `resultados/`.

**Mudanças em arquivos que já existiam:**

- `projetointegrador_vi/settings.py`: `'monitor'` adicionado em `INSTALLED_APPS`.
- `projetointegrador_vi/urls.py`: `path('', include('monitor.urls'))` e o import de `include`.
- `requirements.txt`: `Django==5.2.9` adicionado.
