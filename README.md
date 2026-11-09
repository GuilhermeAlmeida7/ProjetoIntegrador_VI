# Detecção de Fraudes em Cartão de Crédito

Projeto Integrador VI — PUC-Campinas.

Modelo de detecção de anomalias (LOF e Isolation Forest) treinado no dataset Credit Card Fraud Detection, do Kaggle, e uma tela web em Django que simula transações chegando em tempo real e mostra a decisão do modelo.

Este guia mostra como rodar tudo do zero: o ambiente, os notebooks e a tela.

A explicação do projeto (dados, métricas, modelos, resultados e decisões técnicas) está em [docs/](docs/README.md).

---

## O que você precisa ter instalado

- **Python 3.14** (de preferência a mesma versão usada para treinar o modelo). Confira com `python3 --version` (Mac/Linux) ou `python --version` (Windows).
- **Git**.
- **VS Code**, com as extensões **Python** e **Jupyter** (para abrir os notebooks).

---

## 1. Baixar o projeto

```bash
git clone https://github.com/GuilhermeAlmeida7/ProjetoIntegrador_VI.git Projeto-Fraude
cd Projeto-Fraude
git switch staging
```

Evite colocar o projeto em pastas sincronizadas (iCloud, OneDrive) ou com espaços e acentos no caminho. Elas costumam quebrar o ambiente virtual.

---

## 2. Criar o ambiente virtual e instalar as bibliotecas

**Mac / Linux**

```bash
python3 -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
```

**Windows (PowerShell)**

```powershell
python -m venv venv
venv\Scripts\activate
python -m pip install -r requirements.txt
```

O terminal passa a mostrar `(venv)` no começo da linha. Sempre que abrir um terminal novo para trabalhar no projeto, ative o ambiente de novo com a segunda linha.

Para usar esse ambiente nos notebooks, registre-o como kernel (uma vez só):

```bash
python -m ipykernel install --user --name projeto-fraude --display-name "Projeto Fraude (venv)"
```

---

## 3. Rodar a tela

O modelo treinado (`modelos/modelo_fraude.joblib`), as transações da demo e os gráficos já vêm junto com o projeto. Não é preciso baixar a base nem rodar notebook.

1. Na raiz do projeto, com o `(venv)` ativo:

```bash
python manage.py migrate
python manage.py runserver
```

O `migrate` só precisa ser rodado na primeira vez.

2. Abra **http://127.0.0.1:8000/** no navegador. Deixe o terminal aberto enquanto usa a tela. Para desligar, use `Ctrl+C`.

A tela tem três abas:

- **Ao vivo:** simula transações chegando e mostra a decisão do modelo em cada uma.
- **Testar transação:** sorteia uma transação real e permite mexer nas colunas que o modelo usa.
- **Resultados do modelo:** tabela da avaliação final e gráficos.

O roteiro sugerido para a demonstração está em `monitor/LEIA-ME.md`.

A tela funciona sem internet.

---

## 4. Rodar os notebooks (opcional: refazer a análise e o modelo)

Só é necessário para quem quiser reproduzir a análise. A tela funciona sem isso.

### 4.1 Baixar a base de dados

A base não fica no GitHub (cerca de 150 MB).

1. Baixe o **Credit Card Fraud Detection** no Kaggle: https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud
2. Descompacte e salve o arquivo como `data/creditcard.csv` (crie a pasta `data` se ela não existir).

### 4.2 Abrir e rodar

1. No VS Code, abra a **pasta do projeto** (File → Open Folder), e não um arquivo solto.
2. Abra o notebook desejado em `notebooks/`.
3. No canto superior direito, clique em **Select Kernel** → **Jupyter Kernel...** → **Projeto Fraude (venv)**.
4. Clique em **Run All**.

| Notebook | O que faz |
| --- | --- |
| `01_eda.ipynb` | Análise exploratória inicial |
| `02_modelagem.ipynb` | Primeira versão dos experimentos |
| `03_analise_completa.ipynb` | **Versão final:** limpeza, divisão, seleção de features, comparação Isolation Forest × LOF, avaliação final e geração do modelo |

O `03_analise_completa.ipynb` leva alguns minutos e gera:

- `modelos/modelo_fraude.joblib`: o modelo usado pela tela.
- `demo/transacoes_demo.csv`: as transações da simulação.
- `resultados/`: gráficos e tabelas usados no relatório e na tela.

Como tudo usa `random_state=42`, rodar de novo dá sempre os mesmos resultados. Por isso, se depois de rodar o Git mostrar esses arquivos como modificados, não é preciso commitá-los: descarte com `git restore modelos demo resultados`.

---

## Estrutura do projeto

```
Projeto-Fraude/
├── data/                  # creditcard.csv (não vai para o GitHub)
├── notebooks/             # análise e modelagem
├── ml/                    # código do modelo (pontuar.py carrega e usa o modelo)
├── modelos/               # modelo treinado usado pela tela
├── demo/                  # transações usadas na simulação
├── resultados/            # gráficos e tabelas gerados pelos notebooks
├── monitor/               # app Django da tela (views, templates, JS e CSS)
├── docs/                  # documentação do projeto
├── projetointegrador_vi/  # configurações do Django
├── login/                 # app Django do grupo
├── manage.py
└── requirements.txt
```

---

## Problemas comuns

| Problema | Solução |
| --- | --- |
| `command not found: pip` ou `python` | Use `python3 -m pip ...` e `python3 ...` (Mac/Linux), ou confira se o `(venv)` está ativo. |
| `No module named 'matplotlib'` (ou outra biblioteca) no notebook | O notebook está usando o Python errado. Selecione o kernel **Projeto Fraude (venv)**. |
| "Running cells with Python requires the ipykernel package" | Mesmo caso: kernel errado. Não instale nada no Python do sistema; escolha o kernel do venv. |
| Kernel não inicia (timeout) | Atualize as extensões Python e Jupyter do VS Code e recarregue a janela (`Ctrl/Cmd+Shift+P` → *Developer: Reload Window*). |
| A tela mostra "Modelo não encontrado" | Falta o `modelos/modelo_fraude.joblib`. Rode `git pull` na branch `staging`. |
| A página mostra o foguete do Django | O código da tela não está no seu projeto. Rode `git pull` na branch `staging`. |
| Erro ao carregar o modelo (`joblib.load`) | Versões diferentes de Python ou scikit-learn. Reinstale com `python -m pip install -r requirements.txt` e use a mesma versão de Python. |
| `Error: That port is already in use` | Já tem um servidor rodando. Feche o outro terminal ou use `python manage.py runserver 8001`. |
| `FileNotFoundError: ../data/creditcard.csv` | A base não está em `data/creditcard.csv` (seção 4.1). |