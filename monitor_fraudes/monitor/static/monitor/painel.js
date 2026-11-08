/* Monitor de fraudes: simulação ao vivo, teste de transação e abas. */
(function () {
  "use strict";

  const config = JSON.parse(document.getElementById("config").textContent);
  const $ = (id) => document.getElementById(id);

  const MAX_FEED = 12;
  const MAX_PONTOS = 80;

  const estado = {
    indice: 0,
    rodando: false,
    timer: null,
    historico: [],
    limite: config.limite,
  };

  // ---------------------------------------------------------------- formatação
  const fmtInt = (n) => n.toLocaleString("pt-BR");
  const fmtEuro = (n) => "€ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtEuroCurto = (n) => "€ " + Math.round(n).toLocaleString("pt-BR");
  const fmtScore = (n) => n.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const fmtPct = (n) => (n * 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + "%";

  // ---------------------------------------------------------------- abas
  document.querySelectorAll(".aba-botao").forEach((botao) => {
    botao.addEventListener("click", () => {
      document.querySelectorAll(".aba-botao").forEach((b) => b.setAttribute("aria-selected", "false"));
      document.querySelectorAll(".aba").forEach((a) => { a.hidden = true; });
      botao.setAttribute("aria-selected", "true");
      $(botao.dataset.aba).hidden = false;
    });
  });

  // ---------------------------------------------------------------- limite (escala logarítmica)
  const logMin = Math.min(Math.log10(config.scoreMin), Math.log10(config.limite)) - 0.02;
  const logMax = Math.max(Math.log10(config.scoreMax), Math.log10(config.limite)) + 0.02;
  const controleLimite = $("limite");
  controleLimite.min = logMin;
  controleLimite.max = logMax;
  controleLimite.step = (logMax - logMin) / 400;
  controleLimite.value = Math.log10(config.limite);

  function definirLimite(valor) {
    estado.limite = valor;
    $("limite-valor").textContent = fmtScore(valor) + (Math.abs(valor - config.limite) < 1e-9 ? " (padrão do modelo)" : "");
    $("teste-limite").textContent = fmtScore(valor);
    atualizarTudo();
    atualizarTeste();
  }
  controleLimite.addEventListener("input", () => definirLimite(Math.pow(10, Number(controleLimite.value))));
  $("btn-limite-padrao").addEventListener("click", () => {
    controleLimite.value = Math.log10(config.limite);
    definirLimite(config.limite);
  });

  // ---------------------------------------------------------------- classificação
  function resultado(item) {
    const suspeita = item.score >= estado.limite;
    const fraude = item.classeReal === 1;
    if (suspeita && fraude) return { suspeita, texto: "Fraude pega", classe: "res-pega" };
    if (suspeita && !fraude) return { suspeita, texto: "Falso alarme", classe: "res-falso" };
    if (!suspeita && fraude) return { suspeita, texto: "Fraude passou", classe: "res-passou" };
    return { suspeita, texto: "Aprovada corretamente", classe: "res-ok" };
  }

  // ---------------------------------------------------------------- KPIs
  function atualizarKpis() {
    let alertas = 0, pegas = 0, falsos = 0, passaram = 0, fraudes = 0, valorPego = 0, valorFraude = 0, tempo = 0;
    estado.historico.forEach((item) => {
      const suspeita = item.score >= estado.limite;
      const fraude = item.classeReal === 1;
      if (suspeita) alertas++;
      if (fraude) { fraudes++; valorFraude += item.valor; }
      if (suspeita && fraude) { pegas++; valorPego += item.valor; }
      if (suspeita && !fraude) falsos++;
      if (!suspeita && fraude) passaram++;
      tempo += item.tempoMs;
    });
    const total = estado.historico.length;
    const normais = total - fraudes;

    $("kpi-analisadas").textContent = fmtInt(total);
    $("kpi-tempo").textContent = total ? `resposta média do modelo: ${(tempo / total).toFixed(1).replace(".", ",")} ms` : " ";
    $("kpi-alertas").textContent = fmtInt(alertas);
    $("kpi-pegas").textContent = fmtInt(pegas);
    $("kpi-pegas-detalhe").textContent = fraudes ? `de ${fmtInt(fraudes)} fraudes reais (${fmtPct(pegas / fraudes)})` : "nenhuma fraude ainda";
    $("kpi-passaram").textContent = fmtInt(passaram);
    $("kpi-falsos").textContent = fmtInt(falsos);
    $("kpi-falsos-detalhe").textContent = normais ? `${(falsos / normais * 100).toFixed(2).replace(".", ",")}% das transações normais` : " ";
    $("kpi-valor").textContent = fmtEuroCurto(valorPego);
    $("kpi-valor-detalhe").textContent = valorFraude ? `de ${fmtEuroCurto(valorFraude)} em fraudes (${fmtPct(valorPego / valorFraude)})` : " ";
  }

  // ---------------------------------------------------------------- feed
  function atualizarFeed(novo) {
    const corpo = $("feed");
    if (!estado.historico.length) {
      corpo.innerHTML = '<tr class="vazio"><td colspan="7">Clique em <strong>Iniciar simulação</strong> para começar.</td></tr>';
      return;
    }
    const recentes = estado.historico.slice(-MAX_FEED).reverse();
    corpo.innerHTML = "";
    recentes.forEach((item, posicao) => {
      const r = resultado(item);
      const linha = document.createElement("tr");
      if (item.classeReal === 1) linha.classList.add("linha-fraude");
      if (novo && posicao === 0) linha.classList.add("nova");
      const celulas = [
        [item.chegada, ""],
        [item.id, ""],
        [fmtEuro(item.valor), "num"],
        [fmtScore(item.score), "num"],
      ];
      celulas.forEach(([texto, classe]) => {
        const td = document.createElement("td");
        td.textContent = texto;
        if (classe) td.className = classe;
        linha.appendChild(td);
      });
      const decisao = document.createElement("td");
      const pilula = document.createElement("span");
      pilula.className = "pilula " + (r.suspeita ? "pilula-suspeita" : "pilula-aprovada");
      pilula.textContent = r.suspeita ? "Suspeita" : "Aprovada";
      decisao.appendChild(pilula);
      linha.appendChild(decisao);

      const real = document.createElement("td");
      real.textContent = item.classeReal === 1 ? "Fraude" : "Normal";
      linha.appendChild(real);

      const res = document.createElement("td");
      res.className = r.classe;
      res.textContent = r.texto;
      linha.appendChild(res);
      corpo.appendChild(linha);
    });
  }

  // ---------------------------------------------------------------- gráfico
  const grafico = new Chart($("grafico-score"), {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Score",
          data: [],
          borderColor: "#C9CED6",
          borderWidth: 1.5,
          pointRadius: [],
          pointBackgroundColor: [],
          pointBorderWidth: 0,
          tension: 0,
        },
        {
          label: "Limite",
          data: [],
          borderColor: "#1D4ED8",
          borderWidth: 2,
          borderDash: [6, 5],
          pointRadius: 0,
        },
      ],
    },
    options: {
      animation: false,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (itens) => itens.length ? itens[0].label : "",
            label: (ctx) => ctx.datasetIndex === 0
              ? `Score ${fmtScore(ctx.parsed.y)} · ${estado.historico.slice(-MAX_PONTOS)[ctx.dataIndex].classeReal === 1 ? "fraude real" : "normal"}`
              : `Limite ${fmtScore(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: { ticks: { display: false }, grid: { display: false } },
        y: {
          type: "logarithmic",
          title: { display: true, text: "Score (escala log)", color: "#5B6472" },
          ticks: {
            color: "#5B6472",
            autoSkip: false,
            callback: (v) => {
              const mantissa = Number((v / Math.pow(10, Math.floor(Math.log10(v)))).toFixed(5));
              return [1, 2, 3, 5].includes(mantissa) ? Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "";
            },
          },
          grid: { color: "#EEF0F3" },
        },
      },
    },
  });

  function atualizarGrafico() {
    const pontos = estado.historico.slice(-MAX_PONTOS);
    grafico.data.labels = pontos.map((p) => `${p.id} · ${p.chegada}`);
    grafico.data.datasets[0].data = pontos.map((p) => p.score);
    grafico.data.datasets[0].pointBackgroundColor = pontos.map((p) => (p.classeReal === 1 ? "#C2410C" : "#9AA4B2"));
    grafico.data.datasets[0].pointRadius = pontos.map((p) => (p.classeReal === 1 ? 5 : 2.5));
    grafico.data.datasets[1].data = pontos.map(() => estado.limite);
    grafico.update();
  }

  function atualizarTudo(novo) {
    atualizarKpis();
    atualizarFeed(novo);
    atualizarGrafico();
  }

  // ---------------------------------------------------------------- simulação
  async function buscarProxima() {
    if (!estado.rodando) return;
    try {
      const resposta = await fetch(`${config.urls.transacao}${estado.indice}/`);
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      const item = await resposta.json();
      item.chegada = new Date().toLocaleTimeString("pt-BR");
      estado.historico.push(item);
      estado.indice = item.indice + 1;
      atualizarTudo(true);
    } catch (erro) {
      pausar();
      $("status-texto").textContent = "Erro ao consultar o modelo. Veja o terminal do servidor.";
      return;
    }
    if (estado.rodando) estado.timer = setTimeout(buscarProxima, Number($("velocidade").value));
  }

  function iniciar() {
    estado.rodando = true;
    $("btn-rodar").textContent = "Pausar";
    $("status-ponto").classList.add("rodando");
    $("status-texto").textContent = "Simulação rodando";
    buscarProxima();
  }

  function pausar() {
    estado.rodando = false;
    clearTimeout(estado.timer);
    $("btn-rodar").textContent = estado.historico.length ? "Continuar" : "Iniciar simulação";
    $("status-ponto").classList.remove("rodando");
    $("status-texto").textContent = "Pausado";
  }

  $("btn-rodar").addEventListener("click", () => (estado.rodando ? pausar() : iniciar()));
  $("btn-reiniciar").addEventListener("click", () => {
    pausar();
    estado.indice = 0;
    estado.historico = [];
    $("btn-rodar").textContent = "Iniciar simulação";
    atualizarTudo(false);
  });

  const umA = Math.round(config.totalDemo / config.fraudesDemo);
  $("nota-demo").textContent =
    `Demonstração com ${fmtInt(config.totalDemo)} transações reais do conjunto de apresentação, que o modelo nunca viu. ` +
    `A proporção de fraude foi aumentada para cerca de 1 a cada ${umA} transações; na base real, é de 0,17%.`;

  // ---------------------------------------------------------------- testar transação
  const teste = { original: null, atual: null, classe: null, score: null, espera: null };

  function montarControles() {
    const caixa = $("controles");
    caixa.innerHTML = "";
    config.colunas.forEach((coluna) => {
      const faixa = config.faixas[coluna] || { min: -10, max: 10 };
      const linha = document.createElement("div");
      linha.className = "controle";

      const rotulo = document.createElement("label");
      rotulo.htmlFor = `ctrl-${coluna}`;
      rotulo.textContent = coluna;

      const entrada = document.createElement("input");
      entrada.type = "range";
      entrada.id = `ctrl-${coluna}`;
      entrada.min = Math.min(faixa.min, teste.atual[coluna]);
      entrada.max = Math.max(faixa.max, teste.atual[coluna]);
      entrada.step = 0.01;
      entrada.value = teste.atual[coluna];

      const saida = document.createElement("output");
      saida.htmlFor = entrada.id;
      saida.textContent = Number(teste.atual[coluna]).toFixed(2);

      entrada.addEventListener("input", () => {
        teste.atual[coluna] = Number(entrada.value);
        saida.textContent = Number(entrada.value).toFixed(2);
        saida.classList.toggle("alterado", Math.abs(teste.atual[coluna] - teste.original[coluna]) > 0.005);
        $("btn-restaurar").disabled = false;
        clearTimeout(teste.espera);
        teste.espera = setTimeout(pontuarTeste, 120);
      });

      linha.append(rotulo, entrada, saida);
      caixa.appendChild(linha);
    });
  }

  async function pontuarTeste() {
    const resposta = await fetch(config.urls.pontuar, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": config.csrf },
      body: JSON.stringify({ transacao: teste.atual }),
    });
    const dados = await resposta.json();
    if (!resposta.ok) {
      $("veredito").textContent = dados.erro || "Erro ao pontuar a transação";
      return;
    }
    teste.score = dados.score;
    atualizarTeste();
  }

  function atualizarTeste() {
    if (teste.score === null) return;
    const suspeita = teste.score >= estado.limite;
    const veredito = $("veredito");
    veredito.textContent = suspeita ? "Suspeita: gerar alerta" : "Aprovada";
    veredito.className = "veredito " + (suspeita ? "suspeita" : "aprovada");
    $("teste-score").textContent = fmtScore(teste.score);
    $("teste-limite").textContent = fmtScore(estado.limite);

    const posicao = (v) => Math.max(0, Math.min(100, (Math.log10(v) - logMin) / (logMax - logMin) * 100));
    const barra = $("medidor-barra");
    barra.style.width = posicao(teste.score) + "%";
    barra.classList.toggle("suspeita", suspeita);
    $("medidor-limite").style.left = `calc(${posicao(estado.limite)}% - 1px)`;
  }

  async function sortear(classe) {
    const resposta = await fetch(`${config.urls.amostra}?classe=${classe}`);
    const dados = await resposta.json();
    teste.original = { ...dados.transacao };
    teste.atual = { ...dados.transacao };
    teste.classe = dados.classeReal;
    $("teste-classe").textContent = classe === 1 ? "Fraude" : "Normal";
    $("teste-valor").textContent = fmtEuro(teste.atual.Amount);
    const s = Math.floor(teste.atual.Time) % 86400;
    $("teste-hora").textContent = [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60]
      .map((n) => String(n).padStart(2, "0")).join(":");
    $("btn-restaurar").disabled = true;
    montarControles();
    pontuarTeste();
  }

  $("btn-sortear-fraude").addEventListener("click", () => sortear(1));
  $("btn-sortear-normal").addEventListener("click", () => sortear(0));
  $("btn-restaurar").addEventListener("click", () => {
    teste.atual = { ...teste.original };
    $("btn-restaurar").disabled = true;
    montarControles();
    pontuarTeste();
  });

  // ---------------------------------------------------------------- início
  definirLimite(config.limite);
})();
