"""Pontuação de transações com o modelo salvo pelo notebook 03_analise_completa.

Uso:
    from ml.pontuar import pontuar_transacoes
    resultado = pontuar_transacoes(df_com_Time_V1_a_V28_Amount)

O arquivo do modelo (modelos/modelo_fraude.joblib) traz, além do modelo,
as transformações aprendidas no treino: o scaler e o PCA de Time/Amount,
o scaler geral e a lista de colunas usadas. Uma transação nova chega "crua"
e passa pelas mesmas etapas do treino antes de ir para o modelo.
"""
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
CAMINHO_MODELO = RAIZ / "modelos" / "modelo_fraude.joblib"
CAMINHO_DEMO = RAIZ / "demo" / "transacoes_demo.csv"

COLUNAS_ENTRADA = ["Time"] + [f"V{i}" for i in range(1, 29)] + ["Amount"]


class ModeloNaoEncontrado(FileNotFoundError):
    pass


@lru_cache(maxsize=1)
def carregar_pacote():
    """Carrega o modelo uma única vez e guarda em memória."""
    if not CAMINHO_MODELO.exists():
        raise ModeloNaoEncontrado(
            f"Modelo não encontrado em {CAMINHO_MODELO}. "
            "Rode a seção 12 do notebook 03_analise_completa.ipynb para gerá-lo."
        )
    return joblib.load(CAMINHO_MODELO)


def limite_decisao():
    """Score a partir do qual o modelo marca a transação como suspeita."""
    return float(-carregar_pacote()["modelo"].offset_)


def preparar(transacoes):
    """Aplica nas transações cruas as mesmas transformações do treino."""
    pacote = carregar_pacote()
    X = transacoes[COLUNAS_ENTRADA].astype(float).copy()
    novos = pacote["pca_time_amount"].transform(
        pacote["scaler_time_amount"].transform(X[["Time", "Amount"]]))
    X["V29"] = novos[:, 0]
    X["V30"] = novos[:, 1]
    X = X.drop(columns=["Time", "Amount"])
    X = pd.DataFrame(pacote["scaler_geral"].transform(X), columns=X.columns, index=X.index)
    return X[pacote["colunas"]]


def pontuar_transacoes(transacoes):
    """Devolve, para cada transação, o score (maior = mais suspeito) e se é suspeita."""
    modelo = carregar_pacote()["modelo"]
    X = preparar(transacoes)
    score = -modelo.score_samples(X)
    return pd.DataFrame({"score": score, "suspeita": score >= limite_decisao()},
                        index=transacoes.index)


@lru_cache(maxsize=1)
def carregar_demo():
    """Transações da demonstração (saem do conjunto de apresentação, que o modelo nunca viu)."""
    if not CAMINHO_DEMO.exists():
        raise FileNotFoundError(
            f"Arquivo da demo não encontrado em {CAMINHO_DEMO}. "
            "Rode a célula que gera transacoes_demo.csv no notebook 03_analise_completa.ipynb."
        )
    return pd.read_csv(CAMINHO_DEMO)


@lru_cache(maxsize=1)
def faixa_de_scores():
    """Faixa típica de scores na demo, usada para a escala do controle de limite."""
    scores = pontuar_transacoes(carregar_demo())["score"]
    return float(np.percentile(scores, 1)), float(np.percentile(scores, 99.5))


def faixas_das_colunas():
    """Mínimo e máximo de cada coluna usada pelo modelo, para os controles da tela."""
    demo = carregar_demo()
    faixas = {}
    for coluna in carregar_pacote()["colunas"]:
        if coluna in demo:
            faixas[coluna] = {"min": float(np.floor(demo[coluna].min())),
                              "max": float(np.ceil(demo[coluna].max()))}
    return faixas
