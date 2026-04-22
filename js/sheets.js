// ============================================================
//  Google Sheets via Apps Script — leitura e escrita
//  Compatível com GitHub Pages (sem CORS)
// ============================================================

const SheetsAPI = (() => {

  // Converte linha do Sheet em objecto de agente
  function rowToAgent(row) {
    const b = (v) => (v || "").toString().toLowerCase() === "sim";
    return {
      id:          (row[0]  || "").toString().trim(),
      nome:        (row[1]  || "").toString().trim(),
      genero:      (row[2]  || "M").toString().trim(),
      supervisor:  (row[3]  || "").toString().trim(),
      local:       (row[4]  || "").toString().trim(),
      tipo:        (row[5]  || "Sunmi").toString().trim(),
      imei:        (row[6]  || "").toString().trim(),
      sim:         (row[7]  || "").toString().trim(),
      operadora:   (row[8]  || "").toString().trim(),
      status:      (row[9]  || "ativo").toString().trim(),
      bBarril:     b(row[10]),
      bMpesa:      b(row[11]),
      bPremier:    b(row[12]),
      bOutro:      b(row[13]),
      pLotofoot:   b(row[14]),
      pResultado:  b(row[15]),
      pQuiosque:   b(row[16]),
      sombra:      b(row[17]),
      dataCadastro: (row[18] || "").toString().trim(),
      dataUpdate:   (row[19] || "").toString().trim(),
    };
  }

  // Converte objecto de agente em linha do Sheet
  function agentToRow(a) {
    const yn = (v) => (v ? "Sim" : "Não");
    const hoje = new Date().toLocaleDateString("pt-MZ");
    return [
      a.id, a.nome, a.genero, a.supervisor, a.local,
      a.tipo, a.imei, a.sim, a.operadora, a.status,
      yn(a.bBarril), yn(a.bMpesa), yn(a.bPremier), yn(a.bOutro),
      yn(a.pLotofoot), yn(a.pResultado), yn(a.pQuiosque), yn(a.sombra),
      a.dataCadastro || hoje,
      hoje,
    ];
  }

  // Chamada ao Apps Script (GET — para leitura)
  async function scriptGet(params) {
    const url = new URL(CONFIG.APPS_SCRIPT_URL);
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error("Erro de rede: " + res.status);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  // Chamada ao Apps Script (POST — para escrita)
  async function scriptPost(body) {
    const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Erro de rede: " + res.status);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  // Lê todos os agentes
  async function getAll() {
    const data = await scriptGet({ action: "getAll" });
    const rows = data.values || [];
    // ignora o header (linha 1) e linhas vazias
    return rows.slice(1).filter(r => r[0]).map(rowToAgent);
  }

  // Adiciona um agente novo
  async function add(agent) {
    return scriptPost({ action: "add", row: agentToRow(agent) });
  }

  // Actualiza um agente existente pelo ID
  async function update(agent) {
    return scriptPost({ action: "update", id: agent.id, row: agentToRow(agent) });
  }

  // Elimina um agente pelo ID
  async function remove(id) {
    return scriptPost({ action: "delete", id });
  }

  // Importação em lote
  async function addBatch(agents) {
    return scriptPost({ action: "batch", rows: agents.map(agentToRow) });
  }

  // Garante que o header existe no Sheet
  async function ensureHeader() {
    return scriptPost({ action: "ensureHeader", columns: SHEET_COLUMNS });
  }

  return { getAll, add, update, remove, addBatch, ensureHeader };
})();
