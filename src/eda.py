#!/usr/bin/env python
# coding: utf-8

# # Detecção de Fraudes Financeiras — Análise Exploratória (EDA)
# 
# Notebook da etapa de exploração da base *Credit Card Fraud Detection* (Kaggle/ULB).
# Aqui a gente carrega os dados, entende como eles estão estruturados, confere o que já passou por PCA e prepara o z-score de cada coluna. **A seleção de features ainda não foi definida**, então o notebook termina no cálculo do z-score.

# ## 1. Carregamento dos dados
# Importamos as bibliotecas e lemos o `creditcard.csv`, que está na pasta `data/` do projeto.

# In[1]:


import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from pathlib import Path

CAMINHO_CSV = Path(__file__).resolve().parent.parent / "data" / "creditcard.csv"
df = pd.read_csv(CAMINHO_CSV)


# ## 2. Primeira olhada na base
# Antes de mexer em qualquer coisa, a gente quer saber o tamanho e a cara dos dados.
# 
# **Tamanho:** quantas linhas e colunas existem.

# In[2]:


df.shape


# **Amostra das primeiras linhas:** serve para ver como são as colunas (`Time`, `V1` a `V28`, `Amount` e `Class`) e como os valores se parecem.

# In[3]:


df.head(50)


# **Tipos de dado e valores preenchidos:** o `info()` mostra o tipo de cada coluna e quantos valores não nulos ela tem.

# In[4]:


df.info()


# **Valores nulos:** soma total de células vazias na base inteira. O resultado foi `0`, então não precisamos tratar dado faltante.

# In[5]:


df.isnull().sum().sum()


# **Estatísticas gerais:** contagem, média, desvio padrão, mínimo, quartis e máximo de cada coluna. É daqui que sai a checagem de PCA logo abaixo.

# In[6]:


df.describe()


# ## 3. Verificação de padronização (PCA)
# O professor pediu para confirmar se todas as colunas já passaram por PCA. Para isso olhamos só a **média** e o **desvio padrão** de cada uma.
# 
# O que esperamos de uma coluna que veio de PCA: média praticamente zero e desvio padrão decrescente de `V1` para `V28`, porque os componentes são ordenados por variância explicada.

# In[7]:


resumo = df.describe().T[["mean", "std"]]
resumo


# **Leitura do resultado:**
# - `V1` a `V28` têm média na ordem de 1e-15 (zero na prática) e desvio padrão caindo de ~1,96 até ~0,33. Isso é o comportamento típico de PCA.
# - `Time` e `Amount` têm médias e desvios em escalas totalmente diferentes (`Amount` com média ~88 e desvio ~250), então **não** passaram por PCA.

# ## 4. Colocando `Time` e `Amount` no mesmo padrão
# Como essas duas colunas ficaram de fora do PCA, a ideia é aplicar nelas o mesmo tipo de transformação. O PCA é sensível à escala, então primeiro padronizamos as duas (z-score com o `StandardScaler`, que o professor liberou para esta etapa).

# In[8]:


from sklearn.preprocessing import StandardScaler

scaler = StandardScaler()
dados_normalizados = scaler.fit_transform(df[["Time", "Amount"]])


# Agora aplicamos o PCA nas duas colunas já padronizadas. Isso gera dois componentes, que salvamos como `V29` e `V30` para seguir a numeração das demais.
# 
# Repare que `Time` e `Amount` originais continuam no `df`. Só acrescentamos `V29` e `V30`, nada foi removido.

# In[9]:


from sklearn.decomposition import PCA

pca = PCA(n_components=2)
componentes = pca.fit_transform(dados_normalizados)

df["V29"] = componentes[:, 0]
df["V30"] = componentes[:, 1]

df[["V29", "V30"]].describe()


# ## 5. Z-score de cada coluna (função própria)
# Aqui o professor não quer a biblioteca. Então escrevemos a função na mão, com a fórmula
# 
# $$z = \frac{x - \mu}{\sigma}$$
# 
# onde μ é a média e σ o desvio padrão da própria coluna. Aplicamos a função em todas as colunas, menos a `Class`, que é o alvo e não deve ser padronizada, e guardamos o resultado em `zscores`. O `df` original não é alterado.
# 
# Daqui em diante entra a parte de decidir quais colunas ficam, que ainda não está definida.

# In[14]:


def calcular_zscore(coluna):
    media = coluna.mean()
    desvio = coluna.std()
    return (coluna - media) / desvio

colunas_features = df.drop(columns=["Class"]).columns

zscores = df[colunas_features].apply(calcular_zscore)
zscores["Class"] = df["Class"].values 

zscores.head()


# In[12]:


df_padronizado = df.drop(columns=["Time", "Amount"])
df_padronizado.head()


# In[15]:


df_padronizado.shape

print(df_padronizado.head(100))

