// ============================================================
//  Auth — autenticação e gestão de sessão
// ============================================================
const Auth = (() => {
  const SESSION_KEY = "ga_session";

  function login(username, password) {
    const user = USERS.find(u => u.username === username && u.password === password);
    if (!user) return false;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      username: user.username, nome: user.nome, role: user.role
    }));
    return true;
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    showLogin();
  }

  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; }
  }

  function can(permission) {
    const s = getSession();
    return !!(s && PERMISSIONS[s.role] && PERMISSIONS[s.role][permission]);
  }

  function isAdmin() {
    const s = getSession();
    return !!(s && s.role === "admin");
  }

  function showLogin() {
    document.getElementById("loginScreen").style.display = "flex";
    document.getElementById("appScreen").style.display   = "none";
    document.getElementById("loginError").textContent    = "";
    document.getElementById("loginUser").value           = "";
    document.getElementById("loginPass").value           = "";
  }

  function showApp() {
    const s = getSession();
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("appScreen").style.display   = "block";
    document.getElementById("userNome").textContent      = s.nome;
    document.getElementById("userRoleBadge").textContent = s.role === "admin" ? "Administrador" : "Assistente";
    document.getElementById("userRoleBadge").className   = "role-badge " + s.role;
  }

  function handleLogin() {
    const u = document.getElementById("loginUser").value.trim();
    const p = document.getElementById("loginPass").value;
    if (!u || !p) {
      document.getElementById("loginError").textContent = "Preencha utilizador e senha.";
      return;
    }
    if (login(u, p)) {
      showApp();
      App.init();
    } else {
      document.getElementById("loginError").textContent = "Utilizador ou senha incorrectos.";
      document.getElementById("loginPass").value = "";
    }
  }

  // FIX: init() só corre uma vez — listeners não duplicam
  let _booted = false;
  function init() {
    if (!_booted) {
      _booted = true;
      document.getElementById("loginPass").addEventListener("keydown", e => {
        if (e.key === "Enter") handleLogin();
      });
      document.getElementById("loginUser").addEventListener("keydown", e => {
        if (e.key === "Enter") document.getElementById("loginPass").focus();
      });
    }
    const s = getSession();
    if (s) { showApp(); App.init(); }
    else   { showLogin(); }
  }

  return { init, logout, getSession, can, isAdmin, handleLogin };
})();

// ============================================================
//  App — estado, render e eventos
// ============================================================
const App = (() => {
  let state = {
    agents:  [],
    loading: false,
    editId:  null,
    deleteId: null,
    view:    "list",
    filters: { q: "", status: "", tipo: "", genero: "", supervisor: "" },
  };

  // FIX: flag para garantir que os listeners dos filtros só são registados uma vez
  let _filtersReady = false;

  // ---------- utilitários ----------
  function initials(n) {
    return (n || "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  }
  function yn(v) { return v ? "Sim" : "Não"; }
  function hoje() { return new Date().toLocaleDateString("pt-MZ"); }

  function showToast(msg, type = "success") {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.className   = "toast show " + type;
    setTimeout(() => { el.className = "toast"; }, 4000);
  }

  function setLoading(v) {
    state.loading = v;
    document.getElementById("loadingBar").style.display = v ? "block" : "none";
  }

  function checkConfig() {
    if (!CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL.includes("COLE_AQUI")) {
      document.getElementById("agentTableBody").innerHTML = `
        <tr><td colspan="8" class="empty-row" style="color:#b91c1c;line-height:2">
          <strong>Configuração incompleta</strong><br>
          Abra <code>js/config.js</code> e cole o URL do Apps Script na variável APPS_SCRIPT_URL.
        </td></tr>`;
      return false;
    }
    return true;
  }

  // ---------- labels e classes ----------
  const STATUS_LABEL = { ativo: "Activo", inativo: "Inactivo", manut: "Manutenção" };
  const STATUS_CLS   = { ativo: "b-ativo", inativo: "b-inativo", manut: "b-manut" };

  function badgeStatus(s) {
    return `<span class="badge ${STATUS_CLS[s] || "b-inativo"}">${STATUS_LABEL[s] || s}</span>`;
  }
  function badgeGen(g) {
    return `<span class="badge ${g === "F" ? "b-F" : "b-M"}">${g === "F" ? "Feminino" : "Masculino"}</span>`;
  }

  // ---------- visibilidade por role ----------
  function applyRoleUI() {
    const admin = Auth.isAdmin();
    document.querySelectorAll(".admin-only").forEach(el => {
      el.style.display = admin ? "" : "none";
    });
    const banner = document.getElementById("readonlyBanner");
    if (banner) banner.style.display = admin ? "none" : "flex";
  }

  // ---------- filtros ----------
  function getFiltered() {
    const { q, status, tipo, genero, supervisor } = state.filters;
    const ql = q.toLowerCase();
    return state.agents.filter(a => {
      if (q && !(a.id + a.nome + a.supervisor + a.local + a.imei + a.tipo).toLowerCase().includes(ql)) return false;
      if (status     && a.status     !== status)     return false;
      if (tipo       && a.tipo       !== tipo)       return false;
      if (genero     && a.genero     !== genero)     return false;
      if (supervisor && a.supervisor !== supervisor) return false;
      return true;
    });
  }

  // ---------- render ----------
  function renderMetrics() {
    const all = state.agents;
    document.getElementById("metricTotal").textContent   = all.length;
    document.getElementById("metricAtivo").textContent   = all.filter(a => a.status === "ativo").length;
    document.getElementById("metricInativo").textContent = all.filter(a => a.status === "inativo").length;
    document.getElementById("metricManut").textContent   = all.filter(a => a.status === "manut").length;
  }

  function renderSupervisorFilter() {
    const sups = [...new Set(state.agents.map(a => a.supervisor).filter(Boolean))].sort();
    const sel  = document.getElementById("filterSup");
    const cur  = sel.value;
    sel.innerHTML = `<option value="">Todos os supervisores</option>` +
      sups.map(s => `<option value="${s}"${s === cur ? " selected" : ""}>${s}</option>`).join("");
  }

  function renderTable() {
    const admin    = Auth.isAdmin();
    const filtered = getFiltered();
    const tbody    = document.getElementById("agentTableBody");
    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-row">Nenhum agente encontrado.</td></tr>`;
      return;
    }
    // FIX: usa DocumentFragment para renderizar de uma vez — mais eficiente para listas grandes
    tbody.innerHTML = filtered.map(a => `
      <tr>
        <td class="mono">${escHtml(a.id)}</td>
        <td class="fw500">${escHtml(a.nome)}</td>
        <td>${badgeGen(a.genero)}</td>
        <td class="muted">${escHtml(a.supervisor || "—")}</td>
        <td>${escHtml(a.tipo)}</td>
        <td class="muted">${escHtml(a.local || "—")}</td>
        <td>${badgeStatus(a.status)}</td>
        <td>
          <div class="row-actions">
            <button class="btn sm" onclick="App.openDetail('${escAttr(a.id)}')">Ver</button>
            ${admin ? `
              <button class="btn sm" onclick="App.openEdit('${escAttr(a.id)}')">Editar</button>
              <button class="btn sm danger" onclick="App.confirmDelete('${escAttr(a.id)}')">Eliminar</button>
            ` : ""}
          </div>
        </td>
      </tr>`).join("");
  }

  // FIX: escape para evitar XSS em IDs ou nomes com caracteres especiais
  function escHtml(s) {
    return (s || "").toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  function escAttr(s) {
    return (s || "").toString().replace(/'/g, "\\'");
  }

  function render() {
    renderMetrics();
    renderSupervisorFilter();
    renderTable();
    applyRoleUI();
  }

  // ---------- detalhe ----------
  function openDetail(id) {
    const a = state.agents.find(x => x.id === id);
    if (!a) return;
    const admin  = Auth.isAdmin();
    const balcao = [a.bBarril && "Barril", a.bMpesa && "M-Pesa", a.bPremier && "PremierLoto", a.bOutro && "Outro"]
      .filter(Boolean).join(", ") || "—";
    const placas = [a.pLotofoot && "LotoFoot", a.pResultado && "Resultado", a.pQuiosque && "Quiosque"]
      .filter(Boolean).join(", ") || "—";

    document.getElementById("detailContent").innerHTML = `
      <div class="detail-header">
        <div class="avatar">${initials(a.nome)}</div>
        <div>
          <div class="detail-name">${escHtml(a.nome)}</div>
          <div class="detail-sub">${escHtml(a.id)} · ${badgeStatus(a.status)} · ${badgeGen(a.genero)}</div>
        </div>
      </div>
      <div class="detail-grid">
        <div class="drow"><span class="dlabel">Supervisor</span><span class="dval">${escHtml(a.supervisor||"—")}</span></div>
        <div class="drow"><span class="dlabel">Localização</span><span class="dval">${escHtml(a.local||"—")}</span></div>
        <div class="drow"><span class="dlabel">Tipo de equipamento</span><span class="dval">${escHtml(a.tipo)}</span></div>
        <div class="drow"><span class="dlabel">IMEI</span><span class="dval mono">${escHtml(a.imei||"—")}</span></div>
        <div class="drow"><span class="dlabel">Número SIM</span><span class="dval mono">${escHtml(a.sim||"—")}</span></div>
        <div class="drow"><span class="dlabel">Operadora SIM</span><span class="dval">${escHtml(a.operadora||"—")}</span></div>
        <div class="drow"><span class="dlabel">Balcão</span><span class="dval">${escHtml(balcao)}</span></div>
        <div class="drow"><span class="dlabel">Placas</span><span class="dval">${escHtml(placas)}</span></div>
        <div class="drow"><span class="dlabel">Sombra</span><span class="dval">${yn(a.sombra)}</span></div>
        <div class="drow"><span class="dlabel">Data cadastro</span><span class="dval">${escHtml(a.dataCadastro||"—")}</span></div>
        <div class="drow"><span class="dlabel">Última actualização</span><span class="dval">${escHtml(a.dataUpdate||"—")}</span></div>
      </div>
      <div class="modal-actions">
        <button class="btn" onclick="App.closeDetail()">Fechar</button>
        ${admin ? `
          <button class="btn danger" onclick="App.closeDetail();App.confirmDelete('${escAttr(a.id)}')">Eliminar</button>
          <button class="btn primary" onclick="App.closeDetail();App.openEdit('${escAttr(a.id)}')">Actualizar</button>
        ` : ""}
      </div>`;
    document.getElementById("detailModal").classList.add("open");
  }

  function closeDetail() {
    document.getElementById("detailModal").classList.remove("open");
  }

  // ---------- edição ----------
  function openEdit(id) {
    if (id && !Auth.can("canEdit"))   { showToast("Sem permissão para editar.", "warning"); return; }
    if (!id && !Auth.can("canCreate")){ showToast("Sem permissão para criar.", "warning"); return; }
    state.editId = id || null;
    const a = id ? (state.agents.find(x => x.id === id) || {}) : {};
    document.getElementById("modalTitle").textContent   = id ? "Actualizar agente" : "Novo agente";
    document.getElementById("fId").value                = a.id         || "";
    document.getElementById("fNome").value              = a.nome       || "";
    document.getElementById("fSupervisor").value        = a.supervisor || "";
    document.getElementById("fLocal").value             = a.local      || "";
    document.getElementById("fImei").value              = a.imei       || "";
    document.getElementById("fSim").value               = a.sim        || "";
    document.getElementById("fGenero").value            = a.genero     || "M";
    document.getElementById("fTipo").value              = a.tipo       || "Sunmi";
    document.getElementById("fOperadora").value         = a.operadora  || "";
    document.getElementById("fStatus").value            = a.status     || "ativo";
    ["bBarril","bMpesa","bPremier","bOutro","pLotofoot","pResultado","pQuiosque"].forEach(f => {
      document.getElementById(f).checked = !!(a[f]);
    });
    document.getElementById("fSombra").checked = !!(a.sombra);
    document.getElementById("fId").disabled    = !!id;
    document.getElementById("editModal").classList.add("open");
  }

  function closeEdit() {
    document.getElementById("editModal").classList.remove("open");
  }

  async function saveAgent() {
    if (!Auth.can("canEdit") && !Auth.can("canCreate")) {
      showToast("Sem permissão.", "warning"); return;
    }
    const id   = document.getElementById("fId").value.trim();
    const nome = document.getElementById("fNome").value.trim();
    if (!id)   { alert("ID é obrigatório."); return; }
    if (!nome) { alert("Nome é obrigatório."); return; }

    const agent = {
      id, nome,
      genero:    document.getElementById("fGenero").value,
      supervisor:document.getElementById("fSupervisor").value.trim(),
      local:     document.getElementById("fLocal").value.trim(),
      tipo:      document.getElementById("fTipo").value,
      imei:      document.getElementById("fImei").value.trim(),
      sim:       document.getElementById("fSim").value.trim(),
      operadora: document.getElementById("fOperadora").value,
      status:    document.getElementById("fStatus").value,
      bBarril:   document.getElementById("bBarril").checked,
      bMpesa:    document.getElementById("bMpesa").checked,
      bPremier:  document.getElementById("bPremier").checked,
      bOutro:    document.getElementById("bOutro").checked,
      pLotofoot: document.getElementById("pLotofoot").checked,
      pResultado:document.getElementById("pResultado").checked,
      pQuiosque: document.getElementById("pQuiosque").checked,
      sombra:    document.getElementById("fSombra").checked,
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
          alert(`O ID "${id}" já existe.`); setLoading(false); return;
        }
        await SheetsAPI.add(agent);
        // FIX: adiciona ao estado local — sem reload
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
    if (!Auth.can("canDelete")) { showToast("Sem permissão para eliminar.", "warning"); return; }
    state.deleteId = id;
    const a = state.agents.find(x => x.id === id);
    document.getElementById("confirmMsg").textContent =
      `Eliminar "${a?.nome}" (${id})? Esta acção não pode ser desfeita.`;
    document.getElementById("confirmModal").classList.add("open");
  }

  function closeConfirm() {
    document.getElementById("confirmModal").classList.remove("open");
  }

  async function doDelete() {
    setLoading(true);
    try {
      await SheetsAPI.remove(state.deleteId);
      // FIX: remove do estado local — sem reload
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

  // ---------- exportar ----------
  function exportCSV() {
    if (!Auth.can("canExport")) { showToast("Sem permissão para exportar.", "warning"); return; }
    const rows = getFiltered().map(a => [
      a.id, a.nome, a.genero, a.supervisor, a.local, a.tipo,
      a.imei, a.sim, a.operadora, a.status,
      yn(a.bBarril), yn(a.bMpesa), yn(a.bPremier), yn(a.bOutro),
      yn(a.pLotofoot), yn(a.pResultado), yn(a.pQuiosque), yn(a.sombra),
      a.dataCadastro, a.dataUpdate,
    ]);
    const csv = [SHEET_COLUMNS, ...rows]
      .map(r => r.map(v => `"${(v||"").toString().replace(/"/g,'""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "agentes.csv"; link.click();
    URL.revokeObjectURL(url);
  }

  // ---------- vista ----------
  function switchView(v) {
    if (v === "import" && !Auth.can("canImport")) {
      showToast("Sem permissão para importar.", "warning"); return;
    }
    state.view = v;
    document.getElementById("viewList").style.display   = v === "list"   ? "block" : "none";
    document.getElementById("viewImport").style.display = v === "import" ? "block" : "none";
  }

  // ---------- arranque ----------
  async function init() {
    document.title = CONFIG.APP_NAME;
    document.getElementById("appTitle").textContent = CONFIG.APP_NAME;
    applyRoleUI();

    // FIX: só regista os listeners de filtros uma vez
    if (!_filtersReady) {
      _filtersReady = true;
      const filterMap = {
        filterSearch: "q", filterStatus: "status",
        filterTipo: "tipo", filterGenero: "genero", filterSup: "supervisor"
      };
      Object.entries(filterMap).forEach(([elId, key]) => {
        const el = document.getElementById(elId);
        if (el) el.addEventListener("input", e => { state.filters[key] = e.target.value; render(); });
      });
    }

    if (!checkConfig()) return;
    setLoading(true);
    try {
      await SheetsAPI.ensureHeader();
      state.agents = await SheetsAPI.getAll();
      render();
    } catch (e) {
      document.getElementById("agentTableBody").innerHTML = `
        <tr><td colspan="8" class="empty-row" style="color:#b91c1c;line-height:2">
          <strong>Erro ao carregar dados:</strong> ${escHtml(e.message)}<br>
          <small>Verifique o URL do Apps Script em js/config.js e confirme que o script está publicado.</small>
        </td></tr>`;
    } finally {
      setLoading(false);
    }
  }

  // Recarrega dados do servidor sem reload da página
  async function reload() {
    setLoading(true);
    try {
      state.agents = await SheetsAPI.getAll();
      render();
    } catch (e) {
      showToast("Erro ao actualizar dados: " + e.message, "warning");
    } finally {
      setLoading(false);
    }
  }

  return {
    init, reload, render, exportCSV, switchView,
    openDetail, closeDetail,
    openEdit, closeEdit, saveAgent,
    confirmDelete, closeConfirm, doDelete,
  };
})();

// ============================================================
//  Importador em lote — corrigido
// ============================================================
const Importer = (() => {
  const FIELDS = [
    { key:"id",         label:"ID do agente",                required:true  },
    { key:"nome",       label:"Nome do agente",              required:true  },
    { key:"genero",     label:"Género (M/F)",                required:false },
    { key:"supervisor", label:"Supervisor",                  required:false },
    { key:"local",      label:"Localização",                 required:false },
    { key:"tipo",       label:"Tipo de equipamento",         required:false },
    { key:"imei",       label:"IMEI da máquina",             required:false },
    { key:"sim",        label:"Número do SIM",               required:false },
    { key:"operadora",  label:"Operadora SIM",               required:false },
    { key:"status",     label:"Status (ativo/inativo/manut)",required:false },
    { key:"bBarril",    label:"Balcão Barril (Sim/Não)",     required:false },
    { key:"bMpesa",     label:"Balcão M-Pesa (Sim/Não)",     required:false },
    { key:"bPremier",   label:"Balcão PremierLoto (Sim/Não)",required:false },
    { key:"bOutro",     label:"Balcão Outro (Sim/Não)",      required:false },
    { key:"pLotofoot",  label:"Placa LotoFoot (Sim/Não)",    required:false },
    { key:"pResultado", label:"Placa Resultado (Sim/Não)",   required:false },
    { key:"pQuiosque",  label:"Placa Quiosque (Sim/Não)",    required:false },
    { key:"sombra",     label:"Sombra (Sim/Não)",            required:false },
  ];

  const BOOL_KEYS = ["bBarril","bMpesa","bPremier","bOutro","pLotofoot","pResultado","pQuiosque","sombra"];

  const HINTS = {
    id:["id","idagente"],  nome:["nome","name","agente"],  genero:["genero","género","sexo"],
    supervisor:["supervisor","chefe"],  local:["local","localização","localizacao","cidade","provincia"],
    tipo:["tipo","equipamento"],  imei:["imei"],  sim:["sim","numsim","cartoesim"],
    operadora:["operadora","rede"],  status:["status","estado"],
    bBarril:["barril"],  bMpesa:["mpesa"],  bPremier:["premierloto","premier"],  bOutro:["outro"],
    pLotofoot:["lotofoot","placalotofoot"],  pResultado:["resultado","placaresultado"],
    pQuiosque:["quiosque","placaquiosque"],  sombra:["sombra"],
  };

  let rawRows = [], fileCols = [], mapping = {}, parsedRows = [];

  function norm(s) { return (s||"").toLowerCase().replace(/[^a-z0-9]/g, ""); }

  function autoMap() {
    mapping = {};
    fileCols.forEach(col => {
      const nc = norm(col);
      for (const [key, alts] of Object.entries(HINTS)) {
        if (!mapping[key] && alts.some(a => nc.includes(a))) { mapping[key] = col; break; }
      }
    });
  }

  function parseRow(r) {
    const d = {};
    FIELDS.forEach(f => {
      const col = mapping[f.key];
      const val = col ? (r[col] || "").toString().trim() : "";
      d[f.key] = BOOL_KEYS.includes(f.key)
        ? val.toLowerCase() === "sim" || val === "1" || val.toLowerCase() === "true"
        : val;
    });
    if (!d.status || !["ativo","inativo","manut"].includes(d.status.toLowerCase())) d.status = "ativo";
    else d.status = d.status.toLowerCase();
    if (!d.genero || !["M","F"].includes(d.genero.toUpperCase())) d.genero = "M";
    else d.genero = d.genero.toUpperCase();
    if (!d.tipo) d.tipo = "Sunmi";
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
        <select id="map_${f.key}" onchange="Importer.updateMap('${f.key}',this.value)">
          <option value="">— não mapeado —</option>
          ${fileCols.map(c => `<option value="${c}"${mapping[f.key]===c?" selected":""}>${c}</option>`).join("")}
        </select>
        <span class="map-arrow">→</span>
        <div class="map-field${f.required?" req":""}">${f.label}</div>
      </div>`).join("");
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
      <div class="mc"><div class="mc-l">Com erros</div><div class="mc-v red">${bad}</div></div>`;

    const cols = ["id","nome","genero","supervisor","local","tipo","status"];
    document.getElementById("previewTable").innerHTML = `
      <table>
        <thead><tr>${cols.map(k=>`<th>${k}</th>`).join("")}<th>Validação</th></tr></thead>
        <tbody>${parsedRows.slice(0,10).map(({d,errs})=>`
          <tr>
            ${cols.map(k=>`<td>${d[k]||"—"}</td>`).join("")}
            <td>${errs.length
              ? `<span class="badge b-err">${errs.join(", ")}</span>`
              : `<span class="badge b-ok">OK</span>`}
            </td>
          </tr>`).join("")}
        </tbody>
      </table>`;

    const btn = document.getElementById("doImportBtn");
    btn.disabled    = ok === 0;
    btn.textContent = `Importar ${ok} agente${ok !== 1 ? "s" : ""}`;
  }

  // FIX: importação em chunks com barra de progresso — SEM location.reload()
  async function doImport() {
    if (!Auth.can("canImport")) return;
    const valid = parsedRows.filter(r => !r.errs.length).map(r => r.d);
    if (!valid.length) return;

    // Mostra progresso
    const btn = document.getElementById("doImportBtn");
    btn.disabled = true;
    document.getElementById("loadingBar").style.display = "block";

    const progressEl = document.getElementById("importProgress");
    if (progressEl) progressEl.style.display = "block";

    try {
      const { added } = await SheetsAPI.addBatch(valid, (done, total) => {
        const pct = Math.round((done / total) * 100);
        if (progressEl) {
          progressEl.querySelector(".prog-fill").style.width  = pct + "%";
          progressEl.querySelector(".prog-label").textContent = `${done} / ${total} agentes enviados...`;
        }
      });

      // FIX: recarrega dados do servidor e actualiza UI sem fazer reload da página
      App.switchView("list");
      await App.reload();
      App.showToastPublic(`${added} agente${added !== 1 ? "s" : ""} importado${added !== 1 ? "s" : ""} com sucesso!`);

      // Limpa o importador para a próxima utilização
      rawRows = []; fileCols = []; mapping = {}; parsedRows = [];
      document.getElementById("importSteps").style.display = "none";
      document.getElementById("fileLabel").textContent     = "";
      document.getElementById("xlsxFile") && (document.getElementById("xlsxFile").value = "");

    } catch (e) {
      alert("Erro na importação: " + e.message);
    } finally {
      document.getElementById("loadingBar").style.display = "none";
      if (progressEl) progressEl.style.display = "none";
      btn.disabled = false;
    }
  }

  function handleFile(file) {
    if (!file) return;
    const ext    = file.name.split(".").pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb = ext === "csv"
          ? XLSX.read(ev.target.result, { type: "string" })
          : XLSX.read(ev.target.result, { type: "binary" });
        rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
        if (!rawRows.length) { alert("Ficheiro vazio ou sem dados."); return; }
        fileCols = Object.keys(rawRows[0]);
        autoMap();
        document.getElementById("importSteps").style.display = "block";
        document.getElementById("fileLabel").textContent = `${file.name} — ${rawRows.length} linha(s) detectada(s)`;
        buildUI();
      } catch (_) { alert("Erro ao ler o ficheiro. Verifique se está no formato correcto."); }
    };
    ext === "csv" ? reader.readAsText(file, "UTF-8") : reader.readAsBinaryString(file);
  }

  function downloadTemplate() {
    const headers = ["ID","Nome","Género","Supervisor","Localização","Tipo","IMEI","Número do SIM","Operadora","Status","Barril","M-Pesa","PremierLoto","BalcaoOutro","Placa LotoFoot","Placa Resultado","Placa Quiosque","Sombra"];
    const example = ["AG-0001","Ana Matos","F","Carlos Vaz","Maputo","Sunmi","356938035643809","8425800000000001","Vodacom","ativo","Sim","Não","Sim","Não","Sim","Não","Não","Sim"];
    const csv = [headers, example].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "agentes_modelo.csv"; a.click();
  }

  return { handleFile, updateMap, doImport, downloadTemplate };
})();

// Expõe showToast para o Importer usar após reload
App.showToastPublic = function(msg, type) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className   = "toast show " + (type || "success");
  setTimeout(() => { el.className = "toast"; }, 4000);
};

window.addEventListener("DOMContentLoaded", Auth.init);
