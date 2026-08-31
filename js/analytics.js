<script>
(function () {
    const supabaseUrl = 'https://dpixswlqxredyfahgjvy.supabase.co';
    const supabaseKey = 'sb_publishable_8ldstp8OyQSyypz9jyrDFQ_jHbMUUY7';
    const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

    const CHAT_STAGE_ORDER = ["risk", "estabelecimento", "instalacoes", "processo"];
    const STAGE_LABELS = { risk: "Risco", estabelecimento: "Estabelecimento", instalacoes: "Instalações", processo: "Processo", null: "Não iniciou (sem nome)" };
    const RISK_LABELS = { R1: "Risco I", R2: "Risco II", R3: "Risco III" };

    let allSessions = [];
    let allEvents = [];
    let filtered = [];
    const charts = {};

    function $(sel) { return document.querySelector(sel); }
    function fmtPct(n) { return (Math.round(n * 1000) / 10) + "%"; }
    function fmtDuration(ms) {
      if (!isFinite(ms) || ms <= 0) return "–";
      const totalSec = Math.round(ms / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      return m > 0 ? (m + "min " + s + "s") : (s + "s");
    }
    function escapeHtml(s) {
      return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&", "<": "<", ">": ">", '"': """, "'": "'" }[c]));
    }

    const PALETTE = ["#174e3a", "#cda348", "#236a50", "#a33b32", "#68736d", "#8a6517", "#4f7d68", "#d9b877", "#3c5c4e", "#b98f3e"];

    async function loadData() {
      $("#loadingNote").style.display = "block";
      $("#errorNote").style.display = "none";
      $("#dashboard").style.display = "none";
      try {
        const [sessionsRes, eventsRes] = await Promise.all([
          supabaseClient.from("chatbot_sessions").select("*").order("started_at", { ascending: true }),
          supabaseClient.from("chatbot_events").select("session_id,event_type,payload,created_at").order("created_at", { ascending: true })
        ]);
        if (sessionsRes.error) throw sessionsRes.error;
        if (eventsRes.error) throw eventsRes.error;
        allSessions = sessionsRes.data || [];
        allEvents = eventsRes.data || [];
        $("#filtersRow").style.display = "flex";
        applyFilters();
      } catch (e) {
        console.error(e);
        $("#errorNote").textContent = "Não foi possível carregar os dados do Supabase: " + (e.message || e);
        $("#errorNote").style.display = "block";
      } finally {
        $("#loadingNote").style.display = "none";
      }
    }

    function applyFilters() {
      const from = $("#filterFrom").value ? new Date($("#filterFrom").value + "T00:00:00Z") : null;
      const to = $("#filterTo").value ? new Date($("#filterTo").value + "T23:59:59Z") : null;
      const status = $("#filterStatus").value;
      filtered = allSessions.filter(s => {
        const started = s.started_at ? new Date(s.started_at) : null;
        if (from && started && started < from) return false;
        if (to && started && started > to) return false;
        if (status === "completed" && !s.completed) return false;
        if (status === "incomplete" && s.completed) return false;
        return true;
      });
      render();
    }

    function clearFilters() {
      $("#filterFrom").value = "";
      $("#filterTo").value = "";
      $("#filterStatus").value = "all";
      applyFilters();
    }

    function destroyChart(id) {
      if (charts[id]) { charts[id].destroy(); delete charts[id]; }
    }

    function makeChart(id, config) {
      destroyChart(id);
      const ctx = document.getElementById(id);
      if (!ctx) return;
      charts[id] = new Chart(ctx, config);
    }

    function render() {
      $("#dashboard").style.display = "block";
      const total = filtered.length;
      const completed = filtered.filter(s => s.completed);
      const incomplete = filtered.filter(s => !s.completed);

      $("#kpiTotal").textContent = total;
      $("#kpiTotalSub").textContent = total === 0 ? "Nenhuma interação no período" : "no período selecionado";
      $("#kpiCompleted").textContent = completed.length;
      $("#kpiCompletedSub").textContent = total ? fmtPct(completed.length / total) + " do total" : "";
      $("#kpiIncomplete").textContent = incomplete.length;
      $("#kpiIncompleteSub").textContent = total ? fmtPct(incomplete.length / total) + " do total" : "";
      $("#kpiRate").textContent = total ? fmtPct(completed.length / total) : "0%";
      $("#kpiRateSub").textContent = "concluíram o questionário até o PDF";

      // Tempo médio de conclusão — sempre usando os DOIS timestamps do mesmo lado (nunca
      // início do servidor com fim do cliente, ou vice-versa). Prioriza o par do servidor
      // (started_at/completed_at); só cai para o par do cliente quando falta algum dos dois
      // do servidor para aquela sessão, e sinaliza isso ao usuário do painel.
      let usedClientFallback = false;
      const durations = [];
      completed.forEach(s => {
        let pair = null;
        if (s.started_at && s.completed_at) {
          pair = [s.started_at, s.completed_at];
        } else if (s.client_started_at && s.client_completed_at) {
          pair = [s.client_started_at, s.client_completed_at];
          usedClientFallback = true;
        }
        if (!pair) return; // falta um timestamp do par — não mistura fontes, só ignora esta sessão no cálculo
        const d = new Date(pair[1]) - new Date(pair[0]);
        if (d > 0 && d < 1000 * 60 * 60 * 2) durations.push(d); // descarta outliers > 2h (aba deixada aberta)
      });
      const avgDuration = durations.length ? durations.reduce((a, b) = a + b, 0) / durations.length : NaN;
      $("#kpiAvgTime").textContent = fmtDuration(avgDuration);
      const avgTimeSub = $("#kpiAvgTime").closest(".kpi-card")?.querySelector(".kpi-sub");
      if (avgTimeSub) {
        avgTimeSub.textContent = usedClientFallback
          ? "do nome digitado ao PDF gerado — ⚠ parte usando horário do usuário (servidor indisponível para algumas sessões)"
          : "do nome digitado ao PDF gerado (horário do servidor)";
      }
    }

    function dayKey(d) {
      const dt = new Date(d);
      return dt.toISOString().slice(0, 10);
    }

    function renderTimeline() {
      const byDay = {};
      filtered.forEach(s => {
        if (!s.started_at) return;
        const k = dayKey(s.started_at);
        if (!byDay[k]) byDay[k] = { completed: 0, incomplete: 0 };
        byDay[k][s.completed ? "completed" : "incomplete"] += 1;
      });
      const days = Object.keys(byDay).sort();
      if (!days.length) { destroyChart("chartTimeline"); return; }
      makeChart("chartTimeline", {
        type: "bar",
        data: {
          labels: days,
          datasets: [
            { label: "Completadas", data: days.map(d => byDay[d].completed), backgroundColor: PALETTE[0] },
            { label: "Não completadas", data: days.map(d => byDay[d].incomplete), backgroundColor: PALETTE[1] }
          ]
        },
        options: { responsive: true, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { position: "bottom" } } }
      );
    }

    function renderFunnel(incomplete) {
      const counts = { null: 0, risk: 0, estabelecimento: 0, instalacoes: 0, processo: 0 };
      incomplete.forEach(s => {
        const stage = s.last_stage && CHAT_STAGE_ORDER.includes(s.last_stage) ? s.last_stage : "null";
        counts[stage] = (counts[stage] || 0) + 1;
      });
      const labels = ["null", ...CHAT_STAGE_ORDER].map(k => STAGE_LABELS[k]);
      const data = ["null", ...CHAT_STAGE_ORDER].map(k => counts[k] || 0);
      if (!incomplete.length) { destroyChart("chartFunnel"); return; }
      makeChart("chartFunnel", {
        type: "bar",
        data: { labels, datasets: [{ label: "Conversas paradas nesta etapa", data, backgroundColor: PALETTE[2] }] },
        options: { indexAxis: "y", responsive: true, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { display: false } } }
      });
    }

    function renderRisk(completed) {
      const counts = { R1: 0, R2: 0, R3: 0, "—": 0 };
      completed.forEach(s => { counts[RISK_LABELS[s.risk] ? s.risk : "—"] = (counts[RISK_LABELS[s.risk] ? s.risk : "—"] || 0) + 1; });
      const labels = ["R1", "R2", "R3", "—"].filter(k => counts[k] > 0).map(k => k === "—" ? "Não identificado" : RISK_LABELS[k]);
      const data = ["R1", "R2", "R3", "—"].filter(k => counts[k] > 0).map(k => counts[k]);
      if (!completed.length) { destroyChart("chartRisk"); return; }
      makeChart("chartRisk", {
        type: "doughnut",
        data: { labels, datasets: [{ data, backgroundColor: PALETTE }] },
        options: { responsive: true, plugins: { legend: { position: "bottom" } } }
      });
    }

    function renderEstabType(completed) {
      const counts = {};
      completed.forEach(s => {
        const t = s.establishment_type || "—";
        counts[t] = (counts[t] || 0) + 1;
      });
      const labels = Object.keys(counts).sort();
      const data = labels.map(k => counts[k]);
      if (!labels.length) { destroyChart("chartEstabType"); return; }
      makeChart("chartEstabType", {
        type: "bar",
        data: { labels, datasets: [{ label: "Conversas completadas", data, backgroundColor: PALETTE[3] }] },
        options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { display: false } } }
      });
    }

    function renderDevice(list) {
      const counts = {};
      list.forEach(s => { const d = s.device_type || "desconhecido"; counts[d] = (counts[d] || 0) + 1; });
      const labels = Object.keys(counts);
      const data = labels.map(k => counts[k]);
      if (!labels.length) { destroyChart("chartDevice"); return; }
      makeChart("chartDevice", {
        type: "pie",
        data: { labels, datasets: [{ data, backgroundColor: PALETTE }] },
        options: { responsive: true, plugins: { legend: { position: "bottom" } } }
      });
    }

    function renderBrowserLanguage(list) {
      const browserCounts = {};
      list.forEach(s => { const b = s.browser || "outro"; browserCounts[b] = (browserCounts[b] || 0) + 1; });
      const bLabels = Object.keys(browserCounts);
      const bData = bLabels.map(k => browserCounts[k]);
      if (bLabels.length) {
        makeChart("chartBrowser", {
          type: "bar",
          data: { labels: bLabels, datasets: [{ label: "Sessões", data: bData, backgroundColor: PALETTE[4] }] },
          options: { indexAxis: "y", responsive: true, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { display: false } } }
        });
      } else { destroyChart("chartBrowser"); }

      const langCounts = {};
      list.forEach(s => { const l = s.language || "—"; langCounts[l] = (langCounts[l] || 0) + 1; });
      const rows = Object.entries(langCounts).sort((a, b) => b[1] - a[1]);
      const el = $("#languageTable");
      if (!rows.length) { el.innerHTML = '<div class="empty-note">Sem dados.</div>'; return; }
      el.innerHTML = "<table><thead><tr><th>Idioma do navegador</th><th>Sessões</th></tr></thead><tbody>" +
        rows.map(([lang, n]) => `<tr><td>${escapeHtml(lang)}</td><td>${n}</td></tr>`).join("") +
        "</tbody></table>";
    }

    function renderTopEstabelecimentos(completed) {
      const counts = {};
      completed.forEach(s => {
        const id = s.establishment_id || "—";
        counts[id] = (counts[id] || 0) + 1;
      });
      const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
      const el = $("#topEstabTable");
      if (!rows.length) { el.innerHTML = '<div class="empty-note">Sem conversas completadas ainda.</div>'; return; }
      el.innerHTML = "<table><thead><tr><th>Estabelecimento</th><th>Conversas</th></tr></thead><tbody>" +
        rows.map(([id, n]) => `<tr><td>${escapeHtml(id)}</td><td>${n}</td></tr>`).join("") +
        "</tbody></table>";
    }

    function renderEngagement(completed) {
      const el = $("#engagementTable");
      const total = completed.length;
      if (!total) { el.innerHTML = '<div class="empty-note">Sem conversas completadas ainda.</div>'; return; }
      const docsClicks = completed.filter(s => s.clicked_docs_button).length;
      const wppClicks = completed.filter(s => s.clicked_whatsapp).length;
      const avgBack = completed.reduce((a, s) => a + (s.back_clicks || 0), 0) / total;
      const restarts = completed.filter(s => (s.restart_count || 0) > 0).length;
      el.innerHTML = `<table><tbody>
        <tr><td>Clicaram em "Documentos AVCB"</td><td>${docsClicks} (${fmtPct(docsClicks/total)})</td></tr>
        <tr><td>Clicaram para falar no WhatsApp</td><td>${wppClicks} (${fmtPct(wppClicks/total)})</td></tr>
        <tr><td>Média de cliques em "Voltar"</td><td>${(Math.round(avgBack*10)/10)}</td></tr>
        <tr><td>Reiniciaram a conversa ao menos uma vez</td><td>${restarts} (${fmtPct(restarts/total)})</td></tr>
      </tbody></table>`;
    }

    // ---- Downloads ----
    function csvEscape(v) {
      if (v === null || v === undefined) return "";
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }

    function downloadFile(filename, content, mime) {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }

    function downloadRaw() {
      if (!allSessions.length) return;
      const cols = Object.keys(allSessions[0]);
      const lines = [cols.join(",")];
      allSessions.forEach(row => lines.push(cols.map(c => csvEscape(row[c])).join(",")));
      downloadFile("chatbot_sessions_" + new Date().toISOString().slice(0, 10) + ".csv", lines.join("\n"), "text/csv;charset=utf-8");
    }

    function downloadReport() {
      const total = filtered.length;
      const completed = filtered.filter(s => s.completed);
      const chartImgs = {};
      ["chartTimeline", "chartFunnel", "chartRisk", "chartEstabType", "chartDevice", "chartBrowser"].forEach(id => {
        if (charts[id]) chartImgs[id] = charts[id].toBase64Image();
      });
      const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
        <title>Relatório Analytics — Chatbot AVCB — ${new Date().toLocaleDateString("pt-BR")}</title>
        <style>
          body{font-family:Inter,Arial,sans-serif;color:#17211b;max-width:900px;margin:40px auto;padding:0 20px;}
          h1{font-size:1.6rem} h2{font-size:1.1rem;margin-top:36px;border-bottom:1px solid #deddd5;padding-bottom:6px}
          img{max-width:100%;border:1px solid #deddd5;border-radius:8px;margin:12px 0}
          table{width:100%;border-collapse:collapse;font-size:.9rem} td,th{padding:6px 10px;border-bottom:1px solid #eee;text-align:left}
          .kpi{display:inline-block;margin:8px 20px 8px 0}
          .kpi b{font-size:1.4rem;display:block}
        </style></head><body>
        <h1>Relatório de Analytics — Chatbot AVCB</h1>
        <p>Gerado em ${new Date().toLocaleString("pt-BR")} · ${total} interação(ões) no período filtrado.</p>
        <div>
          <div class="kpi"><b>${total}</b>Total</div>
          <div class="kpi"><b>${completed.length}</b>Completadas</div>
          <div class="kpi"><b>${total ? fmtPct(completed.length/total) : "0%"}</b>Taxa de conclusão</div>
          <div class="kpi"><b>${$("#kpiAvgTime").textContent}</b>Tempo médio</div>
        </div>
        ${Object.entries(chartImgs).map(([id, img]) => `<h2>${document.querySelector('#'+id).closest('.card').querySelector('h3').textContent}</h2><img src="${img}">`).join("")}
        <h2>Top estabelecimentos</h2>
        ${$("#topEstabTable").innerHTML}
        <h2>Engajamento pós-questionário</h2>
        ${$("#engagementTable").innerHTML}
        </body></html>`;
      downloadFile("relatorio_analytics_" + new Date().toISOString().slice(0, 10) + ".html", html, "text/html;charset=utf-8");
    }

    function openDownloadModal() { $("#downloadModalOverlay").hidden = false; }
    function closeDownloadModal() { $("#downloadModalOverlay").hidden = true; }

    $("#refreshBtn").addEventListener("click", loadData);
    $("#applyFiltersBtn").addEventListener("click", applyFilters);
    $("#clearFiltersBtn").addEventListener("click", clearFilters);
    $("#downloadBtn").addEventListener("click", openDownloadModal);
    $("#downloadModalClose").addEventListener("click", closeDownloadModal);
    $("#downloadModalOverlay").addEventListener("click", (e) => { if (e.target.id === "downloadModalOverlay") closeDownloadModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#downloadModalOverlay").hidden) closeDownloadModal(); });
    $("#downloadRawBtn").addEventListener("click", () => { downloadRaw(); closeDownloadModal(); });
    $("#downloadReportBtn").addEventListener("click", () => { downloadReport(); closeDownloadModal(); });

    loadData();
  })();
</script>