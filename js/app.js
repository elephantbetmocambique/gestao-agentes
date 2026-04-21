// ============================================================
//  App — estado, render e eventos
// ============================================================

const App = (() => {
  let state = {
    agents: [],
    loading: false,
    editId: null,       // ID do agente em edição
    deleteId: null,
    view: "list",       // "list" | "import"
    filters: { q: "", status: "", tipo: "", genero: "", supervisor: "" },
    toast: null,
  };

  // ---------- utilitários ----------

  function initials(name) {
    return (name || "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }

  function yn(v) { return v ? "Sim" : "Não"; }

  function now() { return new Date().toLocaleDateString("pt-MZ"); }

  function showToast(msg, type = "success") {
    state.toast = { msg, type };
    renderToast();
    setTimeout(() => { state.toast = null; renderToast(); }, 3500);
  }

  function setLoading(v) {
    state.loading = v;
    document.getElementById("loadingBar").style.display = v ? "block" : "none";
  }

  // ---------- render helpers ----------

  const STATUS_LABEL = { ativo: "Ativo", inativo: "Inativo", manut: "Manutenção", extrav: "Extraviado" };
  const STATUS_CLS   = { ativo: "b-ativo", inativo: "b-inativo", manut: "b-manut", extrav: "b-extrav" };

  function badgeStatus(s) {
    return `<span class="badge ${STATUS_CLS[s] || "b-inativo"}">${STATUS_LABEL[s] || s}</span>`;
  }
  function badgeGen(g) {
    return `<span class="badge ${g === "F" ? "b-F" : "b-M"}">${g === "F" ? "Feminino" : "Masculino"}</span>`;
  }

  // ---------- render principal ----------

  function getFiltered() {
    const { q, status, tipo, genero, supervisor } = state.filters;
    return state.agents.filter((a) => {
      const mq = !q || (a.id + a.nome + a.supervisor + a.local + a.imei + a.tipo).toLowerCase().includes(q.toLowerCase());
      return mq
        && (!status || a.status === status)
        && (!tipo || a.tipo === tipo)
        && (!genero || a.genero === genero)
        && (!supervisor || a.supervisor === supervisor);
    });
  }

  function renderMetrics() {
    const all = state.agents;
    document.getElementById("metricTotal").textContent  = all.length;
    document.getElementById("metricAtivo").textContent  = all.filter((a) => a.status === "ativo").length;
    document.getElementById("metricManut").textContent  = all.filter((a) => a.status === "manut").length;
    document.getElementById("metricExtrav").textContent = all.filter((a) => a.status === "extrav").length;
  }

  function renderSupervisorFilter() {
    const sups = [...new Set(state.agents.map((a) => a.supervisor).filter(Boolean))].sort();
    const sel = document.getElementById("filterSup");
    const cur = sel.value;
    sel.innerHTML = `<option value="">Todos os supervisores</option>` +
      sups.map((s) => `<option value="${s}"${s === cur ? " selected" : ""}>${s}</option>`).join("");
  }

  function renderTable() {
    const filtered = getFiltered();
    const tbody = document.getElementById("agentTableBody");
    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-row">Nenhum agente encontrado.</td></tr>`;
      return;
    }
    tbody.innerHTML = filtered.map((a) => `
      <tr>
        <td class="mono">${a.id}</td>
        <td class="fw500">${a.nome}</td>
        <td>${badgeGen(a.genero)}</td>
        <td class="muted">${a.supervisor || "—"}</td>
        <td>${a.tipo}</td>
        <td class="muted">${a.local || "—"}</td>
        <td>${badgeStatus(a.status)}</td>
        <td>
          <div class="row-actions">
            <button class="btn sm" onclick="App.openDetail('${a.id}')">Ver</button>
            <button class="btn sm" onclick="App.openEdit('${a.id}')">Editar</button>
            <button class="btn sm danger" onclick="App.confirmDelete('${a.id}')">Eliminar</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  function renderToast() {
    const el = document.getElementById("toast");
    if (!state.toast) { el.className = "toast"; el.textContent = ""; return; }
    el.textContent = state.toast.msg;
    el.className = `toast show ${state.toast.type}`;
  }

  function render() {
    renderMetrics();
    renderSupervisorFilter();
    renderTable();
  }

  // ---------- modal de detalhe ----------

  function openDetail(id) {
    const a = state.agents.find((x) => x.id === id);
    if (!a) return;
    const balcao = [a.bBarril && "Barril", a.bMpesa && "M-Pesa", a.bPremier && "PremierLoto", a.bOutro && "Outro"].filter(Boolean).join(", ") || "—";
    const placas = [a.pLotofoot && "LotoFoot", a.pResultado && "Resultado", a.pQuiosque && "Quiosque"].filter(Boolean).join(", ") || "—";
    document.getElementById("detailContent").innerHTML = `
      <div class="detail-header">
        <div class="avatar">${initials(a.nome)}</div>
        <div>
          <div class="detail-name">${a.nome}</div>
          <div class="detail-sub">${a.id} · ${badgeStatus(a.status)} · ${badgeGen(a.genero)}</div>
        </div>
      </div>
      <div class="detail-grid">
        <div class="drow"><span class="dlabel">Supervisor</span><span class="dval">${a.supervisor || "—"}</span></div>
        <div class="drow"><span class="dlabel">Localização</span><span class="dval">${a.local || "—"}</span></div>
        <div class="drow"><span class="dlabel">Tipo de equipamento</span><span class="dval">${a.tipo}</span></div>
        <div class="drow"><span class="dlabel">IMEI</span><span class="dval mono">${a.imei || "—"}</span></div>
        <div class="drow"><span class="dlabel">Número SIM</span><span class="dval mono">${a.sim || "—"}</span></div>
        <div class="drow"><span class="dlabel">Operadora SIM</span><span class="dval">${a.operadora || "—"}</span></div>
        <div class="drow"><span class="dlabel">Balcão</span><span class="dval">${balcao}</span></div>
        <div class="drow"><span class="dlabel">Placas</span><span class="dval">${placas}</span></div>
        <div class="drow"><span class="dlabel">Sombra</span><span class="dval">${yn(a.sombra)}</span></div>
        <div class="drow"><span class="dlabel">Data cadastro</span><span class="dval">${a.dataCadastro || "—"}</span></div>
        <div class="drow"><span class="dlabel">Última actualização</span><span class="dval">${a.dataUpdate || "—"}</span></div>
      </div>
      <div class="modal-actions">
        <button class="btn" onclick="App.closeDetail()">Fechar</button>
        <button class="btn danger" onclick="App.closeDetail(); App.confirmDelete('${a.id}')">Eliminar</button>
        <button class="btn primary" onclick="App.closeDetail(); App.openEdit('${a.id}')">Actualizar equipamento</button>
      </div>
    `;
    document.getElementById("detailModal").classList.add("open");
  }

  function closeDetail() {
    document.getElementById("detailModal").classList.remove("open");
  }

  // ---------- modal de edição/criação ----------

  function openEdit(id) {
    state.editId = id || null;
    const a = id ? state.agents.find((x) => x.id === id) : {};
    document.getElementById("modalTitle").textContent = id ? "Actualizar agente" : "Novo agente";

    const fields = ["fId","fNome","fSupervisor","fLocal","fImei","fSim"];
    const keys   = ["id", "nome","supervisor","local","imei","sim"];
    fields.forEach((f, i) => { document.getElementById(f).value = a[keys[i]] || ""; });

    document.getElementById("fGenero").value    = a.genero    || "M";
    document.getElementById("fTipo").value      = a.tipo      || "Sunmi";
    document.getElementById("fOperadora").value = a.operadora || "";
    document.getElementById("fStatus").value    = a.status    || "ativo";

    const bools = ["bBarril","bMpesa","bPremier","bOutro","pLotofoot","pResultado","pQuiosque","fSombra"];
    const bkeys = ["bBarril","bMpesa","bPremier","bOutro","pLotofoot","pResultado","pQuiosque","sombra"];
    bools.forEach((f, i) => { document.getElementById(f).checked = !!(a[bkeys[i]]); });

    document.getElementById("fId").disabled = !!id; // não permite alterar o ID em edição
    document.getElementById("editModal").classList.add("open");
  }

  function closeEdit() {
    document.getElementById("editModal").classList.remove("open");
  }

  async function saveAgent() {
    const id   = document.getElementById("fId").value.trim();
    const nome = document.getElementById("fNome").value.trim();
    if (!id || !nome) { alert("ID e Nome são obrigatórios."); return; }

    const agent = {
      id, nome,
      genero:     document.getElementById("fGenero").value,
      supervisor: document.getElementById("fSupervisor").value.trim(),
      local:      document.getElementById("fLocal").value.trim(),
      tipo:       document.getElementById("fTipo").value,
      imei:       document.getElementById("fImei").value.trim(),
      sim:        document.getElementById("fSim").value.trim(),
      operadora:  document.getElementById("fOperadora").value,
      status:     document.getElementById("fStatus").value,
      bBarril:    document.getElementById("bBarril").checked,
      bMpesa:     document.getElementById("bMpesa").checked,
      bPremier:   document.getElementById("bPremier").checked,
      bOutro:     document.getElementById("bOutro").checked,
      pLotofoot:  document.getElementById("pLotofoot").checked,
      pResultado: document.getElementById("pResultado").checked,
      pQuiosque:  document.getElementById("pQuiosque").checked,
      sombra:     document.getElementById("fSombra").checked,
    };

    setLoading(true);
    try {
      if (state.editId) {
        await SheetsAPI.update(agent);
        const idx = state.agents.findIndex((a) => a.id === state.editId);
        if (idx !== -1) state.agents[idx] = { ...state.agents[idx], ...agent, dataUpdate: now() };
        showToast("Agente actualizado com sucesso!");
      } else {
        // verifica ID duplicado
        if (state.agents.find((a) => a.id === id)) {
          alert(`O ID "${id}" já existe. Use um ID diferente.`); setLoading(false); return;
        }
        await SheetsAPI.add(agent);
        state.agents.push({ ...agent, dataCadastro: now(), dataUpdate: now() });
        showToast("Agente adicionado com sucesso!");
      }
      closeEdit();
      render();
    } catch (e) {
      alert("Erro: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  // ---------- eliminar ----------

  function confirmDelete(id) {
    state.deleteId = id;
    const a = state.agents.find((x) => x.id === id);
    document.getElementById("confirmMsg").textContent =
      `Tem certeza que deseja eliminar "${a?.nome}" (${id})? Esta acção não pode ser desfeita.`;
    document.getElementById("confirmModal").classList.add("open");
  }

  function closeConfirm() {
    document.getElementById("confirmModal").classList.remove("open");
  }

  async function doDelete() {
    setLoading(true);
    try {
      await SheetsAPI.remove(state.deleteId);
      state.agents = state.agents.filter((a) => a.id !== state.deleteId);
      closeConfirm();
      showToast("Agente eliminado.", "warning");
      render();
    } catch (e) {
      alert("Erro ao eliminar: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  // ---------- exportar CSV ----------

  function exportCSV() {
    const headers = ["ID","Nome","Género","Supervisor","Localização","Tipo","IMEI","SIM","Operadora","Status","Barril","M-Pesa","PremierLoto","BalcaoOutro","Placa LotoFoot","Placa Resultado","Placa Quiosque","Sombra","Data Cadastro","Última Actualização"];
    const rows = getFiltered().map((a) => [
      a.id, a.nome, a.genero, a.supervisor, a.local, a.tipo, a.imei, a.sim, a.operadora, a.status,
      yn(a.bBarril), yn(a.bMpesa), yn(a.bPremier), yn(a.bOutro),
      yn(a.pLotofoot), yn(a.pResultado), yn(a.pQuiosque), yn(a.sombra),
      a.dataCadastro, a.dataUpdate,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${(v||"").toString().replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "agentes.csv"; link.click();
    URL.revokeObjectURL(url);
  }

  // ---------- importar Excel/CSV em lote ----------

  function switchView(v) {
    state.view = v;
    document.getElementById("viewList").style.display   = v === "list"   ? "block" : "none";
    document.getElementById("viewImport").style.display = v === "import" ? "block" : "none";
  }

  // ---------- arranque ----------

  async function init() {
    document.title = CONFIG.APP_NAME;
    document.getElementById("appTitle").textContent = CONFIG.APP_NAME;

    // eventos filtros
    ["filterSearch","filterStatus","filterTipo","filterGenero","filterSup"].forEach((id) => {
      document.getElementById(id).addEventListener("input", (e) => {
        const key = { filterSearch:"q", filterStatus:"status", filterTipo:"tipo", filterGenero:"genero", filterSup:"supervisor" }[id];
        state.filters[key] = e.target.value;
        render();
      });
    });

    setLoading(true);
    try {
      await SheetsAPI.ensureHeader();
      state.agents = await SheetsAPI.getAll();
      render();
    } catch (e) {
      document.getElementById("agentTableBody").innerHTML =
        `<tr><td colspan="8" class="empty-row" style="color:#A32D2D">Erro ao carregar dados: ${e.message}<br><small>Verifique o SHEET_ID e API_KEY em js/config.js</small></td></tr>`;
    } finally {
      setLoading(false);
    }
  }

  return {
    init, render, exportCSV, switchView,
    openDetail, closeDetail,
    openEdit, closeEdit, saveAgent,
    confirmDelete, closeConfirm, doDelete,
  };
})();

// Importador em lote (reutiliza lógica do protótipo)
const Importer = (() => {
  const SYSTEM_FIELDS = [
    { key:"id",        label:"ID do agente",           required:true  },
    { key:"nome",      label:"Nome do agente",          required:true  },
    { key:"genero",    label:"Género (M/F)",            required:false },
    { key:"supervisor",label:"Supervisor",              required:false },
    { key:"local",     label:"Localização",             required:false },
    { key:"tipo",      label:"Tipo de equipamento",     required:false },
    { key:"imei",      label:"IMEI da máquina",         required:false },
    { key:"sim",       label:"Número do SIM",           required:false },
    { key:"operadora", label:"Operadora SIM",           required:false },
    { key:"status",    label:"Status",                  required:false },
    { key:"bBarril",   label:"Balcão Barril (Sim/Não)", required:false },
    { key:"bMpesa",    label:"Balcão M-Pesa (Sim/Não)", required:false },
    { key:"bPremier",  label:"Balcão PremierLoto",      required:false },
    { key:"bOutro",    label:"Balcão Outro",            required:false },
    { key:"pLotofoot", label:"Placa LotoFoot",          required:false },
    { key:"pResultado",label:"Placa Resultado",         required:false },
    { key:"pQuiosque", label:"Placa Quiosque",          required:false },
    { key:"sombra",    label:"Sombra (Sim/Não)",        required:false },
  ];
  const BOOL_KEYS = ["bBarril","bMpesa","bPremier","bOutro","pLotofoot","pResultado","pQuiosque","sombra"];

  let rawRows = [], fileCols = [], mapping = {}, parsedRows = [];

  function norm(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, ""); }

  const HINTS = {
    id:["id","idagente"], nome:["nome","name","agente"], genero:["genero","género","sexo"],
    supervisor:["supervisor","chefe"], local:["local","localização","localizacao","cidade","provincia"],
    tipo:["tipo","equipamento"], imei:["imei"], sim:["sim","numsim","cartoesim"],
    operadora:["operadora","rede"], status:["status","estado"],
    bBarril:["barril"], bMpesa:["mpesa"], bPremier:["premierloto","premier"], bOutro:["outro"],
    pLotofoot:["lotofoot"], pResultado:["resultado"], pQuiosque:["quiosque"], sombra:["sombra"],
  };

  function autoMap() {
    mapping = {};
    fileCols.forEach((col) => {
      const nc = norm(col);
      for (const [key, alts] of Object.entries(HINTS)) {
        if (!mapping[key] && alts.some((a) => nc.includes(a))) mapping[key] = col;
      }
    });
  }

  function parseRow(r) {
    const d = {};
    SYSTEM_FIELDS.forEach((f) => {
      const col = mapping[f.key];
      const val = col ? (r[col] || "").toString().trim() : "";
      d[f.key] = BOOL_KEYS.includes(f.key)
        ? val.toLowerCase() === "sim" || val === "1" || val.toLowerCase() === "true"
        : val;
    });
    if (!d.status) d.status = "ativo";
    if (!d.genero) d.genero = "M";
    if (!d.tipo)   d.tipo   = "Sunmi";
    return d;
  }

  function validate(d) {
    const errs = [];
    if (!d.id)   errs.push("ID em falta");
    if (!d.nome) errs.push("Nome em falta");
    return errs;
  }

  function buildUI() {
    // Mapeamento
    document.getElementById("mappingArea").innerHTML = SYSTEM_FIELDS.map((f) => `
      <div class="map-row">
        <select id="map_${f.key}" onchange="Importer.updateMap('${f.key}', this.value)">
          <option value="">— não mapeado —</option>
          ${fileCols.map((c) => `<option value="${c}"${mapping[f.key]===c?" selected":""}>${c}</option>`).join("")}
        </select>
        <span class="map-arrow">→</span>
        <div class="map-field${f.required?" req":""}">${f.label}</div>
      </div>
    `).join("");
    buildPreview();
  }

  function updateMap(key, val) {
    if (val) mapping[key] = val; else delete mapping[key];
    buildPreview();
  }

  function buildPreview() {
    parsedRows = rawRows.map((r) => { const d = parseRow(r); return { d, errs: validate(d) }; });
    const ok = parsedRows.filter((r) => !r.errs.length).length;
    const bad = parsedRows.filter((r) => r.errs.length).length;
    document.getElementById("importSummary").innerHTML = `
      <div class="mc"><div class="mc-l">Total de linhas</div><div class="mc-v blue">${rawRows.length}</div></div>
      <div class="mc"><div class="mc-l">Prontos</div><div class="mc-v green">${ok}</div></div>
      <div class="mc"><div class="mc-l">Com erros</div><div class="mc-v red">${bad}</div></div>
    `;
    const preview = parsedRows.slice(0, 8);
    const cols = ["id","nome","genero","supervisor","local","tipo","status"];
    document.getElementById("previewTable").innerHTML = `
      <table>
        <thead><tr>${cols.map((k) => `<th>${k}</th>`).join("")}<th>Validação</th></tr></thead>
        <tbody>${preview.map(({ d, errs }) => `
          <tr>
            ${cols.map((k) => `<td>${d[k]||"—"}</td>`).join("")}
            <td>${errs.length ? `<span class="badge b-err">${errs.join(", ")}</span>` : `<span class="badge b-ok">OK</span>`}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    `;
    const btn = document.getElementById("doImportBtn");
    btn.disabled = ok === 0;
    btn.textContent = `Importar ${ok} agente${ok !== 1 ? "s" : ""}`;
  }

  async function doImport() {
    const valid = parsedRows.filter((r) => !r.errs.length).map((r) => r.d);
    App.switchView("list"); // volta à lista enquanto importa
    App.render();
    document.getElementById("loadingBar").style.display = "block";
    try {
      await SheetsAPI.addBatch(valid);
      // recarrega tudo do Sheet para garantir consistência
      const all = await SheetsAPI.getAll();
      // injeta no state via acesso directo (App é IIFE mas partilhamos via reload)
      location.reload(); // forma mais simples: recarrega a página
    } catch (e) {
      alert("Erro na importação: " + e.message);
      document.getElementById("loadingBar").style.display = "none";
    }
  }

  function handleFile(file) {
    const ext = file.name.split(".").pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = ext === "csv"
          ? XLSX.read(ev.target.result, { type: "string" })
          : XLSX.read(ev.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (!rawRows.length) { alert("Ficheiro vazio."); return; }
        fileCols = Object.keys(rawRows[0]);
        autoMap();
        document.getElementById("importSteps").style.display = "block";
        document.getElementById("fileLabel").textContent = `${file.name} — ${rawRows.length} linha(s)`;
        buildUI();
      } catch (_) { alert("Erro ao ler o ficheiro."); }
    };
    if (ext === "csv") reader.readAsText(file, "UTF-8"); else reader.readAsBinaryString(file);
  }

  function downloadTemplate() {
    const headers = ["ID","Nome","Género","Supervisor","Localização","Tipo","IMEI","Número do SIM","Operadora","Status","Barril","M-Pesa","PremierLoto","BalcaoOutro","Placa LotoFoot","Placa Resultado","Placa Quiosque","Sombra"];
    const example = ["AG-0001","Ana Matos","F","Carlos Vaz","Maputo","Sunmi","356938035643809","8425800000000001","Vodacom","ativo","Sim","Não","Sim","Não","Sim","Não","Não","Sim"];
    const csv = [headers, example].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "agentes_modelo.csv"; a.click();
  }

  return { handleFile, updateMap, doImport, downloadTemplate };
})();

window.addEventListener("DOMContentLoaded", App.init);
