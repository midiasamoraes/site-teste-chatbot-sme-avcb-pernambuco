(function () {
    const supabaseClient = window.supabaseUtils.getSupabaseClient();

    const RISK_LABELS = window.CONFIG.RISK_LABELS;
    const STATUS_LABELS = window.CONFIG.STATUS_LABELS;
    const PALETTE = window.CONFIG.PALETTE;

    let allSessions = [];
    let leadTempFilterValue = "all";
    let leadStatusFilterValue = "all";

    function $(sel) { return document.querySelector(sel); }

    async function loadData() {
        $("#loadingNote").style.display = "block";
        $("#errorNote").style.display = "none";
        $("#dashboard").style.display = "none";
        try {
            const { data, error } = await supabaseClient.from("chatbot_sessions").select("*").order("started_at", { ascending: false });
            if (error) throw error;
            allSessions = data || [];
            $("#dashboard").style.display = "block";
            render();
        } catch (e) {
            console.error(e);
            $("#errorNote").textContent = "Não foi possível carregar os dados do Supabase: " + (e.message || e);
            $("#errorNote").style.display = "block";
        } finally {
            $("#loadingNote").style.display = "none";
        }
    }

    function render() {
        const leads = allSessions.filter(s => leadTemperature(s) !== "none");
        const hot = leads.filter(s => leadTemperature(s) === "hot");
        const warm = leads.filter(s => leadTemperature(s) === "warm");
        const cold = leads.filter(s => leadTemperature(s) === "cold");
        $("#kpiHotLeads").textContent = hot.length;
        $("#kpiWarmLeads").textContent = warm.length;
        $("#kpiColdLeads").textContent = cold.length;

        renderUtmChart(allSessions);
        renderPriorityChart(leads.filter(s => s.completed));
        renderLeadsTable(leads);
    }

    function renderUtmChart(sessions) {
        const groups = {};
        sessions.forEach(s => {
            const key = s.utm_source || (s.referrer ? (new URL(s.referrer, "http://x").hostname || s.referrer) : "Direto/sem origem");
            if (!groups[key]) groups[key] = { total: 0, completed: 0 };
            groups[key].total += 1;
            if (s.completed) groups[key].completed += 1;
        });
        const labels = Object.keys(groups);
        if (!labels.length) { window.chartUtils.destroyChart("chartUtm"); return; }
        const rateData = labels.map(k => groups[k].total ? Math.round((groups[k].completed / groups[k].total) * 100) : 0);
        const totalData = labels.map(k => groups[k].total);
        window.chartUtils.makeChart("chartUtm", {
            type: "bar",
            data: {
                labels,
                datasets: [
                    { label: "Volume", data: totalData, backgroundColor: PALETTE[4], yAxisID: "y" },
                    { label: "Taxa de conversão (%)", data: rateData, backgroundColor: PALETTE[0], yAxisID: "y1" }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, position: "left", ticks: { precision: 0 } },
                    y1: { beginAtZero: true, position: "right", grid: { drawOnChartArea: false }, max: 100 }
                },
                plugins: { legend: { position: "bottom" } }
            }
        });
    }

    function renderPriorityChart(completedSessions) {
        const counts = { Alta: 0, Média: 0, Baixa: 0 };
        completedSessions.forEach(s => { counts[leadPriority(s)] += 1; });
        if (!completedSessions.length) { window.chartUtils.destroyChart("chartPriority"); return; }
        window.chartUtils.makeChart("chartPriority", {
            type: "bar",
            data: { labels: ["Alta", "Média", "Baixa"], datasets: [{ label: "Conversas completadas", data: [counts.Alta, counts["Média"], counts.Baixa], backgroundColor: [PALETTE[3], PALETTE[1], PALETTE[4]] }] },
            options: { indexAxis: "y", responsive: true, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { display: false } } }
        });
    }

    function tempBadge(temp) {
        if (temp === "hot") return '<span class="badge badge-hot">Quente</span>';
        if (temp === "warm") return '<span class="badge badge-warm">Morno</span>';
        return '<span class="badge badge-cold">Frio recuperável</span>';
    }

    function priorityBadge(p) {
        if (p === "Alta") return '<span class="badge badge-hot">Alta</span>';
        if (p === "Média") return '<span class="badge badge-warm">Média</span>';
        return '<span class="badge badge-cold">Baixa</span>';
    }

    function renderLeadsTable(leads) {
        const filtered = leads.filter(s => {
            const temp = leadTemperature(s);
            if (leadTempFilterValue !== "all" && temp !== leadTempFilterValue) return false;
            const status = s.lead_status || "novo";
            if (leadStatusFilterValue !== "all" && status !== leadStatusFilterValue) return false;
            return true;
        });
        const tbody = $("#leadsTableBody");
        if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="8"><div class="empty-note">Nenhum lead encontrado com esses filtros.</div></td></tr>'; return; }
        tbody.innerHTML = filtered.map(s => {
            const temp = leadTemperature(s);
            const priority = leadPriority(s);
            const status = s.lead_status || "novo";
            const whatsapp = "https://wa.me/5581997460029?text=" + encodeURIComponent("Olá " + (s.user_name || "") + ", aqui é da Sá Moraes Engenharia sobre sua pré-análise de AVCB.");
            const statusOptions = Object.keys(STATUS_LABELS).map(k => `<option value="${k}" ${k === status ? "selected" : ""}>${STATUS_LABELS[k]}</option>`).join("");
            return `<tr>
                <td>${window.escapeUtils.escapeHtml(s.user_name || "—")}</td>
                <td>${window.escapeUtils.escapeHtml(s.establishment_id || "—")}</td>
                <td>${window.escapeUtils.escapeHtml(window.CONFIG.RISK_LABELS[s.risk] || "—")}</td>
                <td>${priorityBadge(priority)}</td>
                <td>${tempBadge(temp)}</td>
                <td><select class="status-select" data-session="${window.escapeUtils.escapeHtml(s.session_id)}">${statusOptions}</select></td>
                <td>${leadDateLabel(s)}</td>
                <td><a class="btn btn-invert" style="min-height:30px;padding:0 10px;font-size:.75rem;" href="${whatsapp}" target="_blank" rel="noopener">WhatsApp</a></td>
            </tr>`;
        }).join("");

        tbody.querySelectorAll(".status-select").forEach(sel => {
            sel.addEventListener("change", async () => {
                const sessionId = sel.getAttribute("data-session");
                const newStatus = sel.value;
                sel.disabled = true;
                try {
                    const { error } = await supabaseClient.from("chatbot_sessions").update({ lead_status: newStatus }).eq("session_id", sessionId);
                    if (error) throw error;
                    const s = allSessions.find(x => x.session_id === sessionId);
                    if (s) s.lead_status = newStatus;
                } catch (e) {
                    console.error("Não foi possível salvar o status do lead — a coluna lead_status existe no Supabase?", e);
                    alert("Não foi possível salvar o status. É provável que a migração SQL (coluna lead_status) ainda não tenha sido rodada no Supabase.");
                } finally {
                    sel.disabled = false;
                }
            });
        });
    }

    $("#leadTempFilter").addEventListener("change", (e) => { leadTempFilterValue = e.target.value; render(); });
    $("#leadStatusFilter").addEventListener("change", (e) => { leadStatusFilterValue = e.target.value; render(); });

    // ---- Busca por hex (CRM simples) ----
    $("#hexLookupBtn").addEventListener("click", () => {
        const code = ($("#hexLookupInput").value || "").trim().toUpperCase().replace(/[^0-9A-F]/g, "");
        const box = $("#hexLookupResult");
        if (!code) { box.innerHTML = '<div class="empty-note">Cole um código válido.</div>'; return; }
        const match = allSessions.find(s => (s.hex_code || "").toUpperCase() === code);
        if (!match) {
            box.innerHTML = '<div class="empty-note">Nenhuma sessão encontrada com esse código exato (o código muda a cada geração — tente o código mais recente que o cliente enviou).</div>';
            return;
        }
        box.innerHTML = `<table><tbody>
            <tr><th>Nome</th><td>${window.escapeUtils.escapeHtml(match.user_name || "—")}</td></tr>
            <tr><th>Estabelecimento</th><td>${window.escapeUtils.escapeHtml(match.establishment_id || "—")}</td></tr>
            <tr><th>Risco</th><td>${window.escapeUtils.escapeHtml(window.CONFIG.RISK_LABELS[match.risk] || "—")}</td></tr>
            <tr><th>Documentos</th><td>${match.doc_count ?? "—"}</td></tr>
            <tr><th>Concluiu?</th><td>${match.completed ? "Sim" : "Não"}</td></tr>
            <tr><th>Status (CRM)</th><td>${window.CONFIG.STATUS_LABELS[match.lead_status || "novo"]}</td></tr>
            <tr><th>Data</th><td>${leadDateLabel(match)}</td></tr>
        </tbody></table>`;
    });

    // ---- Tempo real: presença (quantas pessoas conversando agora) ----
    function startPresence() {
        try {
            const channel = supabaseClient.channel("chatbot-online", { config: { presence: { key: Math.random().toString(36).slice(2) } } });
            channel
                .on("presence", { event: "sync" }, () => {
                    const state = channel.presenceState();
                    const count = Object.keys(state).length;
                    $("#kpiOnlineNow").textContent = count;
                })
                .subscribe(async (status) => {
                    if (status === "SUBSCRIBED") {
                        await channel.track({ online_at: new Date().toISOString() });
                    }
                });
        } catch (e) {
            console.error("Presença em tempo real indisponível", e);
            $("#onlineSub").textContent = "tempo real indisponível no momento";
        }
    }

    // ---- Tempo real: alerta de lead quente ----
    function startHotLeadAlerts() {
        try {
            const channel = supabaseClient.channel("chatbot-hotleads");
            channel.on("postgres_changes", { event: "*", schema: "public", table: "chatbot_sessions" }, (payload) => {
                const s = payload.new;
                if (!s) return;
                const isHot = s.completed && (s.risk === "R3" || s.clicked_whatsapp);
                if (!isHot) return;
                addHotLeadFeedItem(s);
                // Atualiza os dados em memória e re-renderiza a lista/KPIs sem precisar recarregar a página.
                const idx = allSessions.findIndex(x => x.session_id === s.session_id);
                if (idx >= 0) allSessions[idx] = s; else allSessions.unshift(s);
                render();
            }).subscribe((status) => {
                if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                    $("#realtimeNote").textContent = "⚠ Tempo real indisponível — provavelmente falta rodar a migração SQL que habilita o Realtime na tabela chatbot_sessions.";
                }
            });
        } catch (e) {
            console.error("Alerta em tempo real indisponível", e);
            $("#realtimeNote").textContent = "⚠ Tempo real indisponível neste navegador.";
        }
    }

    function addHotLeadFeedItem(s) {
        const feed = $("#hotleadFeed");
        if (feed.querySelector(".empty-note")) feed.innerHTML = "";
        const reason = s.risk === "R3" ? "Risco III concluído" : "Clicou no WhatsApp";
        const item = document.createElement("div");
        item.className = "hotlead-item";
        item.innerHTML = `<strong>${window.escapeUtils.escapeHtml(s.user_name || "Alguém")}</strong> — ${window.escapeUtils.escapeHtml(reason)}<span class="hotlead-time">${new Date().toLocaleTimeString("pt-BR")}</span>`;
        feed.prepend(item);
        while (feed.children.length > 8) feed.removeChild(feed.lastChild);
    }

    $("#refreshBtn").addEventListener("click", loadData);

    loadData();
    startPresence();
    startHotLeadAlerts();
})();