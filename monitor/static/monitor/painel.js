/* VigIA — Terminal de Auditoria, Espaço Radar & Gráficos Nativos Chart.js com Lightbox */
(function () {
  "use strict";

  const config = JSON.parse(document.getElementById("config").textContent);
  const $ = (id) => document.getElementById(id);

  const MAX_PONTOS_RADAR = 60;

  const estado = {
    indice: 0,
    rodando: false,
    timer: null,
    historico: [],
    limite: config.limite,
  };

  const fmtInt = (n) => n.toLocaleString("pt-BR");
  const fmtEuro = (n) => "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtEuroCurto = (n) => "R$ " + Math.round(n).toLocaleString("pt-BR");
  const fmtScore = (n) => n.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  // ---------------------------------------------------------------- Abas
  document.querySelectorAll(".aba-botao").forEach((botao) => {
    botao.addEventListener("click", () => {
      document.querySelectorAll(".aba-botao").forEach((b) => b.setAttribute("aria-selected", "false"));
      document.querySelectorAll(".aba").forEach((a) => { a.hidden = true; });
      botao.setAttribute("aria-selected", "true");
      $(botao.dataset.aba).hidden = false;
    });
  });

  // ---------------------------------------------------------------- Grid 95 Fraudes
  function renderizarGridsFraudes() {
    const containerLOF = $("grid-fraudes-lof");
    const containerIF = $("grid-fraudes-if");

    if (containerLOF) {
      let htmlLOF = "";
      for (let i = 0; i < 73; i++) htmlLOF += '<div class="fraude-quadrado capturada" title="Fraude capturada"></div>';
      for (let i = 0; i < 22; i++) htmlLOF += '<div class="fraude-quadrado escapou" title="Fraude escapou"></div>';
      containerLOF.innerHTML = htmlLOF;
    }

    if (containerIF) {
      let htmlIF = "";
      for (let i = 0; i < 72; i++) htmlIF += '<div class="fraude-quadrado capturada" title="Fraude capturada"></div>';
      for (let i = 0; i < 23; i++) htmlIF += '<div class="fraude-quadrado escapou" title="Fraude escapou"></div>';
      containerIF.innerHTML = htmlIF;
    }
  }

  // ---------------------------------------------------------------- Limite
  function definirLimite(valor) {
    estado.limite = valor;
    $("ticker-corte").textContent = fmtScore(valor);
    if ($("sim-corte")) $("sim-corte").textContent = fmtScore(valor);
    if ($("kpi-corte-val")) $("kpi-corte-val").textContent = fmtScore(valor);
    atualizarTudo();
  }

  const ctrlRange = $("limite-range");
  if (ctrlRange) {
    const logMin = Math.log10(config.scoreMin);
    const logMax = Math.log10(config.scoreMax);
    ctrlRange.min = logMin;
    ctrlRange.max = logMax;
    ctrlRange.step = (logMax - logMin) / 300;
    ctrlRange.value = Math.log10(config.limite);
    ctrlRange.addEventListener("input", () => definirLimite(Math.pow(10, Number(ctrlRange.value))));
  }

  // ---------------------------------------------------------------- Ticker Tape & KPIs
  function atualizarKPIs() {
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
    const tempoMedio = total ? (tempo / total).toFixed(1) : "0,0";

    $("ticker-analisadas").textContent = fmtInt(total);
    $("ticker-alertas").textContent = fmtInt(alertas);
    $("ticker-fraudes").textContent = `${pegas}/${fraudes}`;
    $("ticker-falsos").textContent = fmtInt(falsos);
    $("ticker-valor").textContent = fmtEuroCurto(valorPego);
    $("ticker-latencia").textContent = `${tempoMedio} ms`;

    $("kpi-lat-analisadas").textContent = fmtInt(total);
    $("kpi-lat-alertas").textContent = fmtInt(alertas);
    $("kpi-lat-pegas").textContent = fmtInt(pegas);
    $("kpi-lat-passaram").textContent = fmtInt(passaram);
    $("kpi-lat-falsos").textContent = fmtInt(falsos);
    $("kpi-lat-valor").textContent = fmtEuroCurto(valorPego);
  }

  // ---------------------------------------------------------------- Feed Tape (Com histórico completo acumulado)
  function atualizarFeed() {
    const corpo = $("feed-tape");
    if (!corpo) return;
    
    // Inverte a lista para exibir as transações mais recentes no topo, mantendo todo o histórico acumulado abaixo para scroll
    const hist = [...estado.historico].reverse();
    
    if (!hist.length) {
      corpo.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#64748B;">Aguardando simulação...</td></tr>';
      return;
    }

    let html = "";
    hist.forEach((item) => {
      const eFraude = item.classeReal === 1;
      html += `<tr class="${eFraude ? 'linha-fraude' : ''}">
        <td>${item.id}</td>
        <td class="num">${fmtEuro(item.valor)}</td>
        <td class="num">${fmtScore(item.score)}</td>
      </tr>`;
    });
    corpo.innerHTML = html;
  }

  // ---------------------------------------------------------------- Canvas Radar PCA
  const canvas = $("radar-canvas");
  const ctx = canvas ? canvas.getContext("2d") : null;

  function desenharRadar() {
    if (!ctx) return;
    const w = canvas.width = canvas.parentElement.clientWidth;
    const h = canvas.height = canvas.parentElement.clientHeight || 360;
    const cx = w / 2;
    const cy = h / 2;
    const raioMax = Math.min(w, h) * 0.4;

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = "#152033";
    ctx.lineWidth = 1;
    [0.3, 0.6, 0.85, 1.0].forEach((fator) => {
      ctx.beginPath();
      ctx.arc(cx, cy, raioMax * fator, 0, 2 * Math.PI);
      ctx.stroke();
    });

    const raioLimite = raioMax * 0.7;
    ctx.strokeStyle = "#0284C7";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, raioLimite, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#38BDF8";
    ctx.font = "10px ui-monospace, monospace";
    ctx.fillText(`limite ${fmtScore(estado.limite)}`, cx + 10, cy - raioLimite - 4);

    ctx.fillStyle = "#38BDF8";
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillText("centroide", cx + 8, cy + 3);

    const pontos = estado.historico.slice(-MAX_PONTOS_RADAR);
    pontos.forEach((p, idx) => {
      const angulo = (idx * 137.5) * (Math.PI / 180);
      const distNormalizada = Math.min(1.2, (p.score / (estado.limite * 1.5))) * raioLimite;
      const px = cx + distNormalizada * Math.cos(angulo);
      const py = cy + distNormalizada * Math.sin(angulo);

      const suspeita = p.score >= estado.limite;
      const fraude = p.classeReal === 1;

      ctx.beginPath();
      if (fraude) {
        ctx.fillStyle = "#F43F5E";
        ctx.arc(px, py, 5, 0, 2 * Math.PI);
        ctx.shadowColor = "#F43F5E";
        ctx.shadowBlur = 8;
      } else if (suspeita) {
        ctx.fillStyle = "#F59E0B";
        ctx.arc(px, py, 4, 0, 2 * Math.PI);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = "#38BDF8";
        ctx.arc(px, py, 2.5, 0, 2 * Math.PI);
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  function atualizarTudo() {
    atualizarKPIs();
    atualizarFeed();
    desenharRadar();
  }

  // ---------------------------------------------------------------- Simulação
  async function buscarProxima() {
    if (!estado.rodando) return;
    try {
      const resposta = await fetch(`${config.urls.transacao}${estado.indice}/`);
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      const item = await resposta.json();
      item.chegada = new Date().toLocaleTimeString("pt-BR");
      estado.historico.push(item);
      estado.indice = item.indice + 1;
      atualizarTudo();
    } catch (erro) {
      pausar();
      return;
    }
    if (estado.rodando) estado.timer = setTimeout(buscarProxima, 400);
  }

  function iniciar() {
    estado.rodando = true;
    $("btn-rodar").textContent = "Pausar";
    buscarProxima();
  }

  function pausar() {
    estado.rodando = false;
    clearTimeout(estado.timer);
    $("btn-rodar").textContent = estado.historico.length ? "Continuar" : "Iniciar Simulação";
  }

  $("btn-rodar").addEventListener("click", () => (estado.rodando ? pausar() : iniciar()));
  $("btn-reiniciar").addEventListener("click", () => {
    pausar();
    estado.indice = 0;
    estado.historico = [];
    $("btn-rodar").textContent = "Iniciar Simulação";
    atualizarTudo();
  });

  // ---------------------------------------------------------------- Simulador
  const teste = { original: null, atual: null, score: null };

  function montarControlesSimulador() {
    const caixa = $("controles-sim");
    if (!caixa) return;
    caixa.innerHTML = "";
    config.colunas.forEach((coluna) => {
      const faixa = config.faixas[coluna] || { min: -10, max: 10 };
      const linha = document.createElement("div");
      linha.className = "ctrl-row";

      const rotulo = document.createElement("label");
      rotulo.textContent = coluna;

      const entrada = document.createElement("input");
      entrada.type = "range";
      entrada.min = Math.min(faixa.min, teste.atual[coluna]);
      entrada.max = Math.max(faixa.max, teste.atual[coluna]);
      entrada.step = 0.01;
      entrada.value = teste.atual[coluna];

      const saida = document.createElement("output");
      saida.textContent = Number(teste.atual[coluna]).toFixed(2);

      entrada.addEventListener("input", () => {
        teste.atual[coluna] = Number(entrada.value);
        saida.textContent = Number(entrada.value).toFixed(2);
        pontuarTeste();
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
    teste.score = dados.score;
    atualizarTesteSimulador();
  }

  function atualizarTesteSimulador() {
    if (teste.score === null) return;
    const suspeita = teste.score >= estado.limite;
    const badge = $("sim-badge");
    badge.textContent = suspeita ? "CRÍTICO — SUSPEITA DE FRAUDE" : "APROVADA — PADRÃO NORMAL";
    badge.className = "badge-status " + (suspeita ? "suspeita" : "aprovada");

    const numScore = $("sim-score-num");
    numScore.textContent = fmtScore(teste.score);
    numScore.className = "score-numero " + (suspeita ? "" : "normal");
  }

  async function sortearSimulador(classe) {
    const resposta = await fetch(`${config.urls.amostra}?classe=${classe}`);
    const dados = await resposta.json();
    teste.original = { ...dados.transacao };
    teste.atual = { ...dados.transacao };
    montarControlesSimulador();
    pontuarTeste();
  }

  if ($("btn-sortear-fraude-sim")) $("btn-sortear-fraude-sim").addEventListener("click", () => sortearSimulador(1));
  if ($("btn-sortear-normal-sim")) $("btn-sortear-normal-sim").addEventListener("click", () => sortearSimulador(0));

  // ---------------------------------------------------------------- Renderização e Lightbox de Gráficos Nativos
  let instanciasCharts = {};
  let chartModalInstancia = null;

  function inicializarGraficosNativos() {
    const optionsDefaults = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#8A99AD", font: { family: "sans-serif", size: 11 } } },
        tooltip: { backgroundColor: "#090E17", titleColor: "#FFF", bodyColor: "#8A99AD", borderColor: "#152033", borderWidth: 1 }
      },
      scales: {
        x: { ticks: { color: "#8A99AD", font: { size: 10 } }, grid: { color: "#152033" } },
        y: { ticks: { color: "#8A99AD", font: { size: 10 } }, grid: { color: "#152033" } }
      }
    };

    if ($("chart-roc")) {
      instanciasCharts["chart-roc"] = {
        type: "line",
        data: {
          labels: [0, 0.1, 0.2, 0.4, 0.6, 0.8, 1.0],
          datasets: [
            { label: "LOF (ROC AUC 0,930)", data: [0, 0.82, 0.88, 0.92, 0.95, 0.97, 1.0], borderColor: "#38BDF8", borderWidth: 2, tension: 0.3 },
            { label: "Isolation Forest (0,937)", data: [0, 0.79, 0.85, 0.91, 0.94, 0.96, 1.0], borderColor: "#A855F7", borderWidth: 2, borderDash: [4, 4], tension: 0.3 },
            { label: "Aleatório", data: [0, 0.1, 0.2, 0.4, 0.6, 0.8, 1.0], borderColor: "#475569", borderWidth: 1, borderDash: [2, 2] }
          ]
        },
        options: optionsDefaults
      };
      new Chart($("chart-roc"), instanciasCharts["chart-roc"]);
    }

    if ($("chart-pr")) {
      instanciasCharts["chart-pr"] = {
        type: "line",
        data: {
          labels: [0, 0.2, 0.4, 0.6, 0.76, 0.8, 1.0],
          datasets: [
            { label: "LOF (AUPRC 0,665)", data: [1.0, 0.76, 0.74, 0.77, 0.76, 0.05, 0.02], borderColor: "#38BDF8", borderWidth: 2.5, tension: 0.2 },
            { label: "Isolation Forest (0,519)", data: [1.0, 0.62, 0.58, 0.55, 0.50, 0.03, 0.01], borderColor: "#A855F7", borderWidth: 2, borderDash: [4, 4], tension: 0.2 }
          ]
        },
        options: optionsDefaults
      };
      new Chart($("chart-pr"), instanciasCharts["chart-pr"]);
    }

    if ($("chart-subconjuntos")) {
      instanciasCharts["chart-subconjuntos"] = {
        type: "bar",
        data: {
          labels: ["Sem seleção", "MI-5", "MI-10", "MI-15", "MI-20", "Corr-10", "Corr-15"],
          datasets: [
            { label: "Isolation Forest", data: [0.165, 0.678, 0.675, 0.448, 0.336, 0.699, 0.429], backgroundColor: "#A855F7" },
            { label: "LOF", data: [0.642, 0.744, 0.754, 0.702, 0.708, 0.718, 0.724], backgroundColor: "#38BDF8" }
          ]
        },
        options: { ...optionsDefaults, indexAxis: "y" }
      };
      new Chart($("chart-subconjuntos"), instanciasCharts["chart-subconjuntos"]);
    }

    if ($("chart-recall-fatia")) {
      instanciasCharts["chart-recall-fatia"] = {
        type: "line",
        data: {
          labels: ["0,1%", "0,17%", "0,25%", "0,5%", "1%", "2%"],
          datasets: [
            { label: "LOF", data: [0.51, 0.77, 0.78, 0.79, 0.79, 0.81], borderColor: "#38BDF8", borderWidth: 2.5 },
            { label: "Isolation Forest", data: [0.48, 0.75, 0.76, 0.77, 0.78, 0.80], borderColor: "#A855F7", borderWidth: 2, borderDash: [4, 4] }
          ]
        },
        options: optionsDefaults
      };
      new Chart($("chart-recall-fatia"), instanciasCharts["chart-recall-fatia"]);
    }

    if ($("chart-precision-fatia")) {
      instanciasCharts["chart-precision-fatia"] = {
        type: "line",
        data: {
          labels: ["0,1%", "0,17%", "0,25%", "0,5%", "1%", "2%"],
          datasets: [
            { label: "LOF", data: [0.84, 0.77, 0.56, 0.31, 0.16, 0.08], borderColor: "#38BDF8", borderWidth: 2.5 },
            { label: "Isolation Forest", data: [0.80, 0.66, 0.52, 0.28, 0.14, 0.07], borderColor: "#A855F7", borderWidth: 2, borderDash: [4, 4] }
          ]
        },
        options: optionsDefaults
      };
      new Chart($("chart-precision-fatia"), instanciasCharts["chart-precision-fatia"]);
    }

    if ($("chart-info-mutua")) {
      const cols = ["V17", "V14", "V10", "V12", "V11", "V16", "V3", "V4", "V9", "V18", "V7", "V2", "V21", "V27", "V6", "V5", "V1", "V28", "V8", "V19"];
      const vals = [0.0082, 0.0079, 0.0075, 0.0071, 0.0068, 0.0065, 0.0061, 0.0058, 0.0054, 0.0051, 0.0048, 0.0042, 0.0039, 0.0035, 0.0031, 0.0028, 0.0024, 0.0019, 0.0015, 0.0012];
      const bgColors = cols.map((_, i) => i < 10 ? "#38BDF8" : "#1E293B");

      instanciasCharts["chart-info-mutua"] = {
        type: "bar",
        data: { labels: cols, datasets: [{ label: "Informação Mútua", data: vals, backgroundColor: bgColors }] },
        options: optionsDefaults
      };
      new Chart($("chart-info-mutua"), instanciasCharts["chart-info-mutua"]);
    }

    if ($("chart-volume-hora")) {
      instanciasCharts["chart-volume-hora"] = {
        type: "bar",
        data: {
          labels: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22],
          datasets: [{ label: "Transações", data: [7500, 3100, 3200, 7100, 15400, 16500, 14800, 15500, 15800, 15200, 14800, 8200], backgroundColor: "#A855F7" }]
        },
        options: optionsDefaults
      };
      new Chart($("chart-volume-hora"), instanciasCharts["chart-volume-hora"]);
    }

    if ($("chart-taxa-hora")) {
      instanciasCharts["chart-taxa-hora"] = {
        type: "bar",
        data: {
          labels: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22],
          datasets: [{ label: "% de Fraude", data: [0.15, 1.45, 1.02, 0.12, 0.31, 0.08, 0.30, 0.11, 0.12, 0.14, 0.11, 0.12], backgroundColor: [0.15, 1.45, 1.02].map(v => v > 0.8 ? "#F43F5E" : "#38BDF8") }]
        },
        options: optionsDefaults
      };
      new Chart($("chart-taxa-hora"), instanciasCharts["chart-taxa-hora"]);
    }

    // Configurar Cliques para Abrir no Modal
    document.querySelectorAll(".grafico-clicavel").forEach((card) => {
      card.addEventListener("click", () => {
        const canvasEl = card.querySelector("canvas");
        if (!canvasEl) return;
        const chartId = canvasEl.id;
        const titulo = card.dataset.titulo || "Visualização Gráfica";

        $("modal-titulo").textContent = titulo;
        $("modal-grafico").hidden = false;

        if (chartModalInstancia) {
          chartModalInstancia.destroy();
        }

        const configOriginal = instanciasCharts[chartId];
        if (configOriginal) {
          const cfgCopia = JSON.parse(JSON.stringify(configOriginal));
          cfgCopia.options.maintainAspectRatio = false;
          chartModalInstancia = new Chart($("modal-canvas"), cfgCopia);
        }
      });
    });

    $("modal-fechar").addEventListener("click", () => {
      $("modal-grafico").hidden = true;
      if (chartModalInstancia) {
        chartModalInstancia.destroy();
        chartModalInstancia = null;
      }
    });

    $("modal-grafico").addEventListener("click", (e) => {
      if (e.target === $("modal-grafico")) {
        $("modal-fechar").click();
      }
    });
  }

  window.addEventListener("resize", desenharRadar);
  renderizarGridsFraudes();
  inicializarGraficosNativos();
  definirLimite(config.limite);
})();