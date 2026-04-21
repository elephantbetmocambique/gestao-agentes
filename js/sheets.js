// ============================================================
//  Google Sheets API — leitura e escrita
// ============================================================

const SheetsAPI = (() => {
  const base = "https://sheets.googleapis.com/v4/spreadsheets";

  function range(tab, from, to) {
    return encodeURIComponent(`${tab}!${from}:${to}`);
  }

  function rowToAgent(row) {
    const b = (v) => (v || "").toString().toLowerCase() === "sim";
    return {
      id:          row[0]  || "",
      nome:        row[1]  || "",
      genero:      row[2]  || "M",
      supervisor:  row[3]  || "",
      local:       row[4]  || "",
      tipo:        row[5]  || "Sunmi",
      imei:        row[6]  || "",
      sim:         row[7]  || "",
      operadora:   row[8]  || "",
      status:      row[9]  || "ativo",
      bBarril:     b(row[10]),
      bMpesa:      b(row[11]),
      bPremier:    b(row[12]),
      bOutro:      b(row[13]),
      pLotofoot:   b(row[14]),
      pResultado:  b(row[15]),
      pQuiosque:   b(row[16]),
      sombra:      b(row[17]),
      dataCadastro:  row[18] || "",
      dataUpdate:    row[19] || "",
    };
  }

  function agentToRow(a) {
    const yn = (v) => (v ? "Sim" : "Não");
    const now = new Date().toLocaleDateString("pt-MZ");
    return [
      a.id, a.nome, a.genero, a.supervisor, a.local,
      a.tipo, a.imei, a.sim, a.operadora, a.status,
      yn(a.bBarril), yn(a.bMpesa), yn(a.bPremier), yn(a.bOutro),
      yn(a.pLotofoot), yn(a.pResultado), yn(a.pQuiosque), yn(a.sombra),
      a.dataCadastro || now,
      now,
    ];
  }

  // Lê todos os agentes do Sheet
  async function getAll() {
    const url = `${base}/${CONFIG.SHEET_ID}/values/${range(CONFIG.SHEET_TAB, "A2", "T9999")}?key=${CONFIG.API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Erro ao ler o Google Sheet");
    }
    const data = await res.json();
    return (data.values || []).map(rowToAgent);
  }

  // Encontra a linha de um agente pelo ID (retorna número da linha, base 1, incluindo header)
  async function findRow(id) {
    const agents = await getAll();
    const idx = agents.findIndex((a) => a.id === id);
    return idx === -1 ? -1 : idx + 2; // +2 porque linha 1 é o header
  }

  // Adiciona um novo agente (append)
  async function add(agent) {
    const url = `${base}/${CONFIG.SHEET_ID}/values/${range(CONFIG.SHEET_TAB, "A", "T")}:append?valueInputOption=USER_ENTERED&key=${CONFIG.API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: [agentToRow(agent)] }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Erro ao adicionar agente");
    }
    return await res.json();
  }

  // Actualiza um agente existente pela linha
  async function update(agent) {
    const rowNum = await findRow(agent.id);
    if (rowNum === -1) throw new Error(`Agente ${agent.id} não encontrado no Sheet`);
    const url = `${base}/${CONFIG.SHEET_ID}/values/${range(CONFIG.SHEET_TAB, `A${rowNum}`, `T${rowNum}`)}?valueInputOption=USER_ENTERED&key=${CONFIG.API_KEY}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: [agentToRow(agent)] }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Erro ao actualizar agente");
    }
    return await res.json();
  }

  // Elimina um agente (limpa a linha)
  async function remove(id) {
    const rowNum = await findRow(id);
    if (rowNum === -1) throw new Error(`Agente ${id} não encontrado`);
    // Usa batchUpdate para eliminar a linha completamente
    const url = `${base}/${CONFIG.SHEET_ID}:batchUpdate?key=${CONFIG.API_KEY}`;
    // Primeiro precisamos do sheetId interno
    const metaRes = await fetch(`${base}/${CONFIG.SHEET_ID}?key=${CONFIG.API_KEY}`);
    const meta = await metaRes.json();
    const sheet = meta.sheets.find((s) => s.properties.title === CONFIG.SHEET_TAB);
    if (!sheet) throw new Error("Separador não encontrado no Sheet");
    const sheetId = sheet.properties.sheetId;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowNum - 1,
              endIndex: rowNum,
            },
          },
        }],
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Erro ao eliminar agente");
    }
    return await res.json();
  }

  // Importação em lote (append múltiplas linhas de uma vez)
  async function addBatch(agents) {
    const url = `${base}/${CONFIG.SHEET_ID}/values/${range(CONFIG.SHEET_TAB, "A", "T")}:append?valueInputOption=USER_ENTERED&key=${CONFIG.API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: agents.map(agentToRow) }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Erro na importação em lote");
    }
    return await res.json();
  }

  // Cria o header no Sheet se ainda não existir
  async function ensureHeader() {
    const url = `${base}/${CONFIG.SHEET_ID}/values/${range(CONFIG.SHEET_TAB, "A1", "T1")}?key=${CONFIG.API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const firstRow = (data.values || [[]])[0] || [];
    if (firstRow.length === 0 || firstRow[0] !== "ID") {
      const writeUrl = `${base}/${CONFIG.SHEET_ID}/values/${range(CONFIG.SHEET_TAB, "A1", "T1")}?valueInputOption=USER_ENTERED&key=${CONFIG.API_KEY}`;
      await fetch(writeUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: [SHEET_COLUMNS] }),
      });
    }
  }

  return { getAll, add, update, remove, addBatch, ensureHeader };
})();
