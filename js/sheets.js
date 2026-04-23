// ============================================================
//  Google Sheets via Apps Script
//  Correcções: batch em chunks, retry, erros robustos
// ============================================================

const SheetsAPI = (() => {

  const CHUNK_SIZE = 50; // max agentes por chamada ao Apps Script
  const MAX_RETRIES = 3;

  function rowToAgent(row) {
    const b = (v) => (v || "").toString().toLowerCase() === "sim";
    return {
      id:           (row[0]  || "").toString().trim(),
      nome:         (row[1]  || "").toString().trim(),
      genero:       (row[2]  || "M").toString().trim(),
      supervisor:   (row[3]  || "").toString().trim(),
      local:        (row[4]  || "").toString().trim(),
      tipo:         (row[5]  || "Sunmi").toString().trim(),
      imei:         (row[6]  || "").toString().trim(),
      sim:          (row[7]  || "").toString().trim(),
      operadora:    (row[8]  || "").toString().trim(),
      status:       (row[9]  || "ativo").toString().trim(),
      bBarril:      b(row[10]),
      bMpesa:       b(row[11]),
      bPremier:     b(row[12]),
      bOutro:       b(row[13]),
      pLotofoot:    b(row[14]),
      pResultado:   b(row[15]),
      pQuiosque:    b(row[16]),
      sombra:       b(row[17]),
      dataCadastro: (row[18] || "").toString().trim(),
      dataUpdate:   (row[19] || "").toString().trim(),
    };
  }

  function agentToRow(a) {
    const yn  = (v) => (v ? "Sim" : "Não");
    const hj  = new Date().toLocaleDateString("pt-MZ");
    return [
      a.id, a.nome, a.genero, a.supervisor, a.local,
      a.tipo, a.imei, a.sim, a.operadora, a.status,
      yn(a.bBarril), yn(a.bMpesa), yn(a.bPremier), yn(a.bOutro),
      yn(a.pLotofoot), yn(a.pResultado), yn(a.pQuiosque), yn(a.sombra),
      a.dataCadastro || hj,
      hj,
    ];
  }

  // Chamada GET com retry
  async function scriptGet(params, attempt = 1) {
    try {
      const url = new URL(CONFIG.APPS_SCRIPT_URL);
      Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    } catch (e) {
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 800 * attempt));
        return scriptGet(params, attempt + 1);
      }
      throw new Error("Falha após " + MAX_RETRIES + " tentativas: " + e.message);
    }
  }

  // Chamada POST com retry
  async function scriptPost(body, attempt = 1) {
    try {
      const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    } catch (e) {
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 800 * attempt));
        return scriptPost(body, attempt + 1);
      }
      throw new Error("Falha após " + MAX_RETRIES + " tentativas: " + e.message);
    }
  }

  // Divide array em chunks
  function chunks(arr, size) {
    const result = [];
    for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
    return result;
  }

  // Lê todos os agentes
  async function getAll() {
    const data = await scriptGet({ action: "getAll" });
    const rows = data.values || [];
    return rows.slice(1).filter(r => r[0] && r[0].toString().trim()).map(rowToAgent);
  }

  // Adiciona um agente
  async function add(agent) {
    return scriptPost({ action: "add", row: agentToRow(agent) });
  }

  // Actualiza um agente pelo ID
  async function update(agent) {
    return scriptPost({ action: "update", id: agent.id, row: agentToRow(agent) });
  }

  // Elimina um agente pelo ID
  async function remove(id) {
    return scriptPost({ action: "delete", id });
  }

  // Importação em lote — divide em chunks de 50 para evitar timeout
  // onProgress(done, total) chamado a cada chunk concluído
  async function addBatch(agents, onProgress) {
    if (!agents.length) return { added: 0 };
    const rows    = agents.map(agentToRow);
    const batches = chunks(rows, CHUNK_SIZE);
    let added = 0;
    for (let i = 0; i < batches.length; i++) {
      await scriptPost({ action: "batch", rows: batches[i] });
      added += batches[i].length;
      if (onProgress) onProgress(added, rows.length);
    }
    return { added };
  }

  // Garante que o header existe
  async function ensureHeader() {
    return scriptPost({ action: "ensureHeader", columns: SHEET_COLUMNS });
  }

  return { getAll, add, update, remove, addBatch, ensureHeader };
})();
