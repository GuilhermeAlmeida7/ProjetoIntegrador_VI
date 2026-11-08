from django.urls import path

from . import views

app_name = "monitor"

urlpatterns = [
    path("", views.painel, name="painel"),
    path("api/transacao/<int:indice>/", views.api_transacao, name="api_transacao"),
    path("api/amostra/", views.api_amostra, name="api_amostra"),
    path("api/pontuar/", views.api_pontuar, name="api_pontuar"),
    path("graficos/<str:nome>", views.grafico, name="grafico"),
]
