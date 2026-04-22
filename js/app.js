// ============================================================
//  App — estado, render e eventos
// ============================================================

const App = (() => {
  let state = {
    agents: [],
    loading: false,
    editId: null,
    deleteId: null,
    view: "list",
    filters: { q: "", status: "", tipo: "", genero: "", supervisor: "" },
  };

  // ---------- utilitários ----------
  function initials(name) {
    return (name || "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }
  function yn(v) { return v ? "Sim" : "Não"; }
  function hoje() { return new Date().toLocaleDateString("pt-MZ"); }

  function showToast(msg, type = "success") {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.className = "toast show " + type;
    setTimeout(() => { el.className = "toast"; }, 3500);
  }

  function setLoading(v) {
    state.loading = v;
    document.getElementById("loadingBar").style.display = v ? "block" : "none";
  }

  function checkConfig() {
    if (!CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL === "COLE_AQUI_O_URL_DO_APPS_SCRIPT") {
      document.getElementById("agentTableBody").innerHTML = `
        <tr><td colspan="8" class="empty-row" style="color:#A32D2D;line-height:1.8">
          <strong>Configuração incompleta</strong><br>
          Abra o ficheiro <code>js/config.js</code> e cole o URL do seu Google Apps Script.<br>
          <small>Consulte o ficheiro INSTALL.md para instruções detalhadas.</small>
        </td></tr>`;
      return false;
    }
    return true;
  }

  // ---------- labels e classes ----------
  const STATUS_LABEL = { ativo: "Ativo", inativo: "Inativo", manut: "Manutenção", extrav: "Extraviado" };
  const STATUS_CLS   = { ativo: "b-ativo", inativo: "b-inativo", manut: "b-manut", extrav: "b-extrav" };

  function badgeStatus(s) {
    return `<span class="badge ${STATUS_CLS[s] || "b-inativo"}">${STATUS_LABEL[s] || s}</span>`;
  }
  function badgeGen(g) {
    return `<span class="badge ${g === "F" ? "b-F" : "b-M"}">${g === "F" ? "Feminino" : "Masculino"}</span>`;
  }

  // ---------- filtros ----------
  function getFiltered() {
    const { q, status, tipo, genero, supervisor } = state.filters;
    return state.agents.filter((a) => {
      const mq = !q || (a.id + a.nome + a.supervisor + a.local + a.imei + a.tipo)
        .toLowerCase().includes(q.toLowerCase());
      return mq
        && (!status     || a.status     === status)
        && (!tipo       || a.tipo       === tipo)
        && (!genero     || a.genero     === genero)
        && (!supervisor || a.supervisor === supervisor);
    });
  }

  // ---------- render ----------
  function renderMetrics() {
    const all = state.agents;
    document.getElementById("metricTotal").textContent  = all.length;
    document.getElementById("metricAtivo").textContent  = all.filter(a => a.status === "ativo").length;
    document.getElementById("metricManut").textContent  = all.filter(a => a.status === "manut").length;
    document.getElementById("metricExtrav").textContent = all.filter(a => a.status === "extrav").length;
  }

  function renderSupervisorFilter() {
    const sups = [...new Set(state.agents.map(a => a.supervisor).filter(Boolean))].sort();
    const sel = document.getElementById("filterSup");
    const cur = sel.value;
    sel.innerHTML = `<option value="">Todos os supervisores</option>` +
      sups.map(s => `<option value="${s}"${s === cur ? " selected" : ""}>${s}</option>`).join("");
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

  function render() {
    renderMetrics();
    renderSupervisorFilter();
    renderTable();
  }

  // ---------- detalhe ----------
  function openDetail(id) {
    const a = state.agents.find(x => x.id === id);
    if (!a) return;
    const balcao = [a.bBarril && "Barril", a.bMpesa && "M-Pesa", a.bPremier && "PremierLoto", a.bOutro && "Outro"]
      .filter(Boolean).join(", ") || "—";
    const placas = [a.pLotofoot && "LotoFoot", a.pResultado && "Resultado", a.pQuiosque && "Quiosque"]
      .filter(Boolean).join(", ") || "—";

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

  // ---------- edição ----------
  function openEdit(id) {
    state.editId = id || null;
    const a = id ? (state.agents.find(x => x.id === id) || {}) : {};
    document.getElementById("modalTitle").textContent = id ? "Actualizar agente" : "Novo agente";

    document.getElementById("fId").value         = a.id         || "";
    document.getElementById("fNome").value        = a.nome       || "";
    document.getElementById("fSupervisor").value  = a.supervisor || "";
    document.getElementById("fLocal").value       = a.local      || "";
    document.getElementById("fImei").value        = a.imei       || "";
    document.getElementById("fSim").value         = a.sim        || "";
    document.getElementById("fGenero").value      = a.genero     || "M";
    document.getElementById("fTipo").value        = a.tipo       || "Sunmi";
    document.getElementById("fOperadora").value   = a.operadora  || "";
    document.getElementById("fStatus").value      = a.status     || "ativo";

    ["bBarril","bMpesa","bPremier","bOutro","pLotofoot","pResultado","pQuiosque"].forEach(f => {
      document.getElementById(f).checked = !!(a[f]);
    });
    document.getElementById("fSombra").checked = !!(a.sombra);
    document.getElementById("fId").disabled = !!id;
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
        const idx = state.agents.findIndex(a => a.id === state.editId);
        if (idx !== -1) state.agents[idx] = { ...state.agents[idx], ...agent, dataUpdate: hoje() };
        showToast("Agente actualizado com sucesso!");
      } else {
        if (state.agents.find(a => a.id === id)) {
          alert(`O ID "${id}" já existe. Use um ID diferente.`);
          setLoading(false);
          return;
        }
        await SheetsAPI.add(agent);
        state.agents.push({ ...agent, dataCadastro: hoje(), dataUpdate: hoje() });
        showToast("Agente adicionado com sucesso!");
      }
      closeEdit();
      render();
    } catch (e) {
      alert("Erro ao guardar: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  // ---------- eliminar ----------
  function confirmDelete(id) {
    state.deleteId = id;
    const a = state.agents.find(x => x.id === id);
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
      state.agents = state.agents.filter(a => a.id !== state.deleteId);
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
    const headers = SHEET_COLUMNS;
    const rows = getFiltered().map(a => [
      a.id, a.nome, a.genero, a.supervisor, a.local, a.tipo, a.imei, a.sim, a.operadora, a.status,
      yn(a.bBarril), yn(a.bMpesa), yn(a.bPremier), yn(a.bOutro),
      yn(a.pLotofoot), yn(a.pResultado), yn(a.pQuiosque), yn(a.sombra),
      a.dataCadastro, a.dataUpdate,
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${(v || "").toString().replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "agentes.csv"; link.click();
    URL.revokeObjectURL(url);
  }

  // ---------- vista importar ----------
  function switchView(v) {
    state.view = v;
    document.getElementById("viewList").style.display   = v === "list"   ? "block" : "none";
    document.getElementById("viewImport").style.display = v === "import" ? "block" : "none";
  }

  // ---------- arranque ----------
  async function init() {
    document.title = CONFIG.APP_NAME;
    document.getElementById("appTitle").textContent = CONFIG.APP_NAME;

    // eventos dos filtros
    const filterMap = {
      filterSearch: "q", filterStatus: "status",
      filterTipo: "tipo", filterGenero: "genero", filterSup: "supervisor"
    };
    Object.entries(filterMap).forEach(([elId, key]) => {
      document.getElementById(elId).addEventListener("input", e => {
        state.filters[key] = e.target.value;
        render();
      });
    });

    if (!checkConfig()) return;

    setLoading(true);
    try {
      await SheetsAPI.ensureHeader();
      state.agents = await SheetsAPI.getAll();
      render();
    } catch (e) {
      document.getElementById("agentTableBody").innerHTML = `
        <tr><td colspan="8" class="empty-row" style="color:#A32D2D;line-height:1.8">
          <strong>Erro ao carregar dados:</strong> ${e.message}<br>
          <small>Verifique o URL do Apps Script em js/config.js e confirme que o script está publicado como aplicação web.</small>
        </td></tr>`;
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

// ============================================================
//  Importador em lote
// ============================================================
const Importer = (() => {
  const FIELDS = [
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
  const HINTS = {
    id:["id","idagente"], nome:["nome","name","agente"], genero:["genero","género","sexo"],
    supervisor:["supervisor","chefe"], local:["local","localização","localizacao","cidade"],
    tipo:["tipo","equipamento"], imei:["imei"], sim:["sim","numsim"],
    operadora:["operadora","rede"], status:["status","estado"],
    bBarril:["barril"], bMpesa:["mpesa"], bPremier:["premierloto"], bOutro:["outro"],
    pLotofoot:["lotofoot"], pResultado:["resultado"], pQuiosque:["quiosque"], sombra:["sombra"],
  };

  let rawRows = [], fileCols = [], mapping = {}, parsedRows = [];

  function norm(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, ""); }

  function autoMap() {
    mapping = {};
    fileCols.forEach(col => {
      const nc = norm(col);
      for (const [key, alts] of Object.entries(HINTS)) {
        if (!mapping[key] && alts.some(a => nc.includes(a))) mapping[key] = col;
      }
    });
  }

  function parseRow(r) {
    const d = {};
    FIELDS.forEach(f => {
      const col = mapping[f.key];
      const val = col ? (r[col] || "").toString().trim() : "";
      d[f.key] = BOOL_KEYS.includes(f.key)
        ? val.toLowerCase() === "sim" || val === "1"
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
    document.getElementById("mappingArea").innerHTML = FIELDS.map(f => `
      <div class="map-row">
        <select id="map_${f.key}" onchange="Importer.updateMap('${f.key}', this.value)">
          <option value="">— não mapeado —</option>
          ${fileCols.map(c => `<option value="${c}"${mapping[f.key]===c?" selected":""}>${c}</option>`).join("")}
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
    parsedRows = rawRows.map(r => { const d = parseRow(r); return { d, errs: validate(d) }; });
    const ok  = parsedRows.filter(r => !r.errs.length).length;
    const bad = parsedRows.filter(r =>  r.errs.length).length;
    document.getElementById("importSummary").innerHTML = `
      <div class="mc"><div class="mc-l">Total de linhas</div><div class="mc-v blue">${rawRows.length}</div></div>
      <div class="mc"><div class="mc-l">Prontos</div><div class="mc-v green">${ok}</div></div>
      <div class="mc"><div class="mc-l">Com erros</div><div class="mc-v red">${bad}</div></div>
    `;
    const cols = ["id","nome","genero","supervisor","local","tipo","status"];
    document.getElementById("previewTable").innerHTML = `
      <table>
        <thead><tr>${cols.map(k=>`<th>${k}</th>`).join("")}<th>Validação</th></tr></thead>
        <tbody>${parsedRows.slice(0,8).map(({d,errs})=>`
          <tr>
            ${cols.map(k=>`<td>${d[k]||"—"}</td>`).join("")}
            <td>${errs.length?`<span class="badge b-err">${errs.join(", ")}</span>`:`<span class="badge b-ok">OK</span>`}</td>
          </tr>`).join("")}
        </tbody>
      </table>`;
    const btn = document.getElementById("doImportBtn");
    btn.disabled = ok === 0;
    btn.textContent = `Importar ${ok} agente${ok !== 1 ? "s" : ""}`;
  }

  async function doImport() {
    const valid = parsedRows.filter(r => !r.errs.length).map(r => r.d);
    App.switchView("list");
    document.getElementById("loadingBar").style.display = "block";
    try {
      await SheetsAPI.addBatch(valid);
      showToast(`${valid.length} agentes importados com sucesso!`);
      const all = await SheetsAPI.getAll();
      // Recarrega dados
      location.reload();
    } catch (e) {
      alert("Erro na importação: " + e.message);
      document.getElementById("loadingBar").style.display = "none";
    }
  }

  function showToast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.className = "toast show success";
    setTimeout(() => { el.className = "toast"; }, 3500);
  }

  function handleFile(file) {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb = ext === "csv"
          ? XLSX.read(ev.target.result, { type: "string" })
          : XLSX.read(ev.target.result, { type: "binary" });
        rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
        if (!rawRows.length) { alert("Ficheiro vazio."); return; }
        fileCols = Object.keys(rawRows[0]);
        autoMap();
        document.getElementById("importSteps").style.display = "block";
        document.getElementById("fileLabel").textContent = `${file.name} — ${rawRows.length} linha(s) detectada(s)`;
        buildUI();
      } catch (_) { alert("Erro ao ler o ficheiro. Verifique o formato."); }
    };
    if (ext === "csv") reader.readAsText(file, "UTF-8");
    else reader.readAsBinaryString(file);
  }

  function downloadTemplate() {
    const headers = ["ID","Nome","Género","Supervisor","Localização","Tipo","IMEI","Número do SIM","Operadora","Status","Barril","M-Pesa","PremierLoto","BalcaoOutro","Placa LotoFoot","Placa Resultado","Placa Quiosque","Sombra"];
    const example = ["AG-0001","Ana Matos","F","Carlos Vaz","Maputo","Sunmi","356938035643809","8425800000000001","Vodacom","ativo","Sim","Não","Sim","Não","Sim","Não","Não","Sim"];
    const csv = [headers, example].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "agentes_modelo.csv";
    a.click();
  }

  return { handleFile, updateMap, doImport, downloadTemplate };
})();

window.addEventListener("DOMContentLoaded", App.init);
