"""Telas e API do monitor de fraudes.

- painel: a página com as abas Ao vivo, Testar transação e Resultados.
- api_transacao: devolve a transação N da demo, pontuada pelo modelo na hora.
- api_amostra: sorteia uma transação (fraude ou normal) para a aba de teste.
- api_pontuar: pontua uma transação enviada pela tela (usada pelos controles).
- grafico: entrega as imagens geradas pelo notebook em resultados/.
"""
import csv
import json
import math
import random
import time

import pandas as pd
from django.http import FileResponse, Http404, JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import render
from django.urls import reverse
from django.views.decorators.http import require_GET, require_POST

from ml import pontuar as pt

PASTA_RESULTADOS = pt.RAIZ / "resultados"

GRAFICOS = {
    "curvas_finais.png": "Curvas ROC e precision-recall no conjunto de apresentação",
    "matrizes_confusao.png": "Matrizes de confusão dos dois modelos no conjunto de apresentação",
    "comparacao_validacao.png": "Melhor AUPRC de cada modelo por subconjunto de colunas (validação)",
    "analise_limite.png": "Fraudes pegas e precisão conforme a fatia de transações revisadas",
    "ranking_info_mutua.png": "Informação mútua de cada coluna com a fraude (treino)",
    "fraude_por_hora.png": "Volume de transações e taxa de fraude por hora do dia",
    "valor_por_classe.png": "Valor das transações normais e das fraudes",
}

METRICAS = [
    ("precision", "Precision"),
    ("recall", "Recall"),
    ("f1", "F1"),
    ("jaccard", "Jaccard"),
    ("auprc", "AUPRC"),
    ("roc_auc", "ROC AUC"),
    ("acuracia", "Acurácia"),
]


def _numero(valor, casas=3):
    return f"{float(valor):.{casas}f}".replace(".", ",")


def _ler_metricas(nome_escolhido):
    caminho = PASTA_RESULTADOS / "avaliacao_final.csv"
    if not caminho.exists():
        return None
    with open(caminho, encoding="utf-8") as arquivo:
        linhas = list(csv.DictReader(arquivo))
    modelos = []
    for linha in linhas:
        modelos.append({
            "nome": linha["modelo"],
            "escolhido": linha["modelo"] == nome_escolhido,
            "valores": [_numero(linha[chave]) for chave, _ in METRICAS],
            "fraudes_pegas": linha.get("fraudes pegas", ""),
            "falsos_alarmes": linha.get("falsos alarmes", ""),
            "valor_pego": _numero(linha.get("% do valor fraudado pego", 0), 1) + "%",
        })
    return {"cabecalho": [rotulo for _, rotulo in METRICAS], "modelos": modelos}


def _hora(segundos):
    segundos = int(segundos) % 86400
    return f"{segundos // 3600:02d}:{segundos % 3600 // 60:02d}:{segundos % 60:02d}"


def _transacao_para_dict(linha):
    return {coluna: float(linha[coluna]) for coluna in pt.COLUNAS_ENTRADA}


def painel(request):
    try:
        pacote = pt.carregar_pacote()
        demo = pt.carregar_demo()
        score_min, score_max = pt.faixa_de_scores()
    except FileNotFoundError as erro:
        return render(request, "monitor/painel.html", {"erro": str(erro)})

    nome = pacote.get("nome", "Modelo")
    config = {
        "nomeModelo": nome,
        "colunas": pacote["colunas"],
        "faixas": pt.faixas_das_colunas(),
        "limite": pt.limite_decisao(),
        "scoreMin": score_min,
        "scoreMax": score_max,
        "totalDemo": int(len(demo)),
        "fraudesDemo": int(demo["Class"].sum()),
        "csrf": get_token(request),
        "urls": {
            "transacao": reverse("monitor:api_transacao", args=[0])[:-2],
            "amostra": reverse("monitor:api_amostra"),
            "pontuar": reverse("monitor:api_pontuar"),
        },
    }
    contexto = {
        "erro": None,
        "nome_modelo": nome,
        "colunas": pacote["colunas"],
        "config": config,
        "metricas": _ler_metricas(nome),
        "graficos": [(arquivo, legenda) for arquivo, legenda in GRAFICOS.items()
                     if (PASTA_RESULTADOS / arquivo).exists()],
    }
    return render(request, "monitor/painel.html", contexto)


@require_GET
def api_transacao(request, indice):
    demo = pt.carregar_demo()
    posicao = indice % len(demo)
    linha = demo.iloc[[posicao]]

    inicio = time.perf_counter()
    resultado = pt.pontuar_transacoes(linha).iloc[0]
    tempo_ms = (time.perf_counter() - inicio) * 1000

    registro = linha.iloc[0]
    return JsonResponse({
        "indice": posicao,
        "id": f"#{100001 + posicao}",
        "hora": _hora(registro["Time"]),
        "valor": float(registro["Amount"]),
        "score": float(resultado["score"]),
        "classeReal": int(registro["Class"]),
        "tempoMs": round(tempo_ms, 1),
    })


@require_GET
def api_amostra(request):
    demo = pt.carregar_demo()
    classe = 1 if request.GET.get("classe") == "1" else 0
    candidatas = demo.index[demo["Class"] == classe]
    linha = demo.loc[random.choice(list(candidatas))]
    return JsonResponse({"transacao": _transacao_para_dict(linha), "classeReal": classe})


@require_POST
def api_pontuar(request):
    try:
        dados = json.loads(request.body)["transacao"]
        valores = {coluna: float(dados[coluna]) for coluna in pt.COLUNAS_ENTRADA}
    except (ValueError, KeyError, TypeError):
        return JsonResponse({"erro": "Envie a transação com Time, V1 a V28 e Amount numéricos."}, status=400)
    if not all(math.isfinite(valor) for valor in valores.values()):
        return JsonResponse({"erro": "Os valores precisam ser números finitos."}, status=400)

    resultado = pt.pontuar_transacoes(pd.DataFrame([valores])).iloc[0]
    return JsonResponse({"score": float(resultado["score"]), "suspeita": bool(resultado["suspeita"])})


@require_GET
def grafico(request, nome):
    if nome not in GRAFICOS:
        raise Http404("Gráfico não encontrado.")
    caminho = PASTA_RESULTADOS / nome
    if not caminho.exists():
        raise Http404("Gráfico não encontrado.")
    return FileResponse(open(caminho, "rb"), content_type="image/png")
