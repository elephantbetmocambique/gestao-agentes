// ============================================================
//  GOOGLE APPS SCRIPT — cole no Google Sheet
//  Extensões → Apps Script → apague tudo → cole → guarde → Implementar
// ============================================================

const SHEET_NAME = "Agentes";
const SHEET_COLUMNS = [
  "ID", "Nome", "Género", "Supervisor", "Localização",
  "Tipo", "IMEI", "SIM", "Operadora", "Status",
  "Barril", "M-Pesa", "PremierLoto", "BalcaoOutro",
  "Placa LotoFoot", "Placa Resultado", "Placa Quiosque", "Sombra",
  "Data Cadastro", "Última Actualização",
];

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) throw new Error("Separador '" + SHEET_NAME + "' não encontrado. Crie-o e tente novamente.");
  return sh;
}

// Resposta JSON com cabeçalhos CORS
function jsonOk(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonErr(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── GET — leitura ────────────────────────────────────────────
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "getAll";

    if (action === "getAll") {
      const sheet  = getSheet();
      // FIX: só lê colunas A:T para não desperdiçar quota
      const last   = sheet.getLastRow();
      if (last < 1) return jsonOk({ values: [] });
      const values = sheet.getRange(1, 1, last, SHEET_COLUMNS.length).getValues();
      return jsonOk({ values });
    }

    return jsonErr("Acção desconhecida: " + action);
  } catch (err) {
    return jsonErr(err.message);
  }
}

// ── POST — escrita ───────────────────────────────────────────
function doPost(e) {
  try {
    if (!e || !e.postData) return jsonErr("Sem dados POST.");
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;

    // ── ensureHeader ─────────────────────────────────────────
    if (action === "ensureHeader") {
      const sheet    = getSheet();
      const firstRow = sheet.getRange(1, 1, 1, SHEET_COLUMNS.length).getValues()[0];
      if (!firstRow[0] || firstRow[0].toString().trim() !== "ID") {
        const range = sheet.getRange(1, 1, 1, SHEET_COLUMNS.length);
        range.setValues([SHEET_COLUMNS]);
        range.setFontWeight("bold");
        range.setBackground("#1f3c90");
        range.setFontColor("#ffffff");
        // Congela a primeira linha
        sheet.setFrozenRows(1);
      }
      return jsonOk({ ok: true });
    }

    // ── add ──────────────────────────────────────────────────
    if (action === "add") {
      if (!body.row || !body.row[0]) return jsonErr("Linha inválida: ID em falta.");
      getSheet().appendRow(body.row);
      return jsonOk({ ok: true });
    }

    // ── update ───────────────────────────────────────────────
    if (action === "update") {
      if (!body.id) return jsonErr("ID em falta para update.");
      const sheet = getSheet();
      const last  = sheet.getLastRow();
      if (last < 2) return jsonErr("Sem dados no Sheet.");
      // FIX: lê só a coluna A para encontrar o ID — mais rápido
      const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) {
        if (ids[i][0].toString().trim() === body.id.toString().trim()) {
          sheet.getRange(i + 2, 1, 1, body.row.length).setValues([body.row]);
          return jsonOk({ ok: true });
        }
      }
      return jsonErr("Agente não encontrado: " + body.id);
    }

    // ── delete ───────────────────────────────────────────────
    if (action === "delete") {
      if (!body.id) return jsonErr("ID em falta para delete.");
      const sheet = getSheet();
      const last  = sheet.getLastRow();
      if (last < 2) return jsonErr("Sem dados para eliminar.");
      const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) {
        if (ids[i][0].toString().trim() === body.id.toString().trim()) {
          sheet.deleteRow(i + 2);
          return jsonOk({ ok: true });
        }
      }
      return jsonErr("Agente não encontrado: " + body.id);
    }

    // ── batch ────────────────────────────────────────────────
    if (action === "batch") {
      if (!body.rows || !Array.isArray(body.rows) || body.rows.length === 0) {
        return jsonOk({ ok: true, added: 0 });
      }
      // FIX: valida cada linha antes de escrever
      const valid = body.rows.filter(r => Array.isArray(r) && r[0] && r[1]);
      if (!valid.length) return jsonErr("Nenhuma linha válida no batch.");

      const sheet     = getSheet();
      const lastRow   = Math.max(sheet.getLastRow(), 1);
      // FIX: usa setValues de uma vez — muito mais rápido do que appendRow em loop
      const range     = sheet.getRange(lastRow + 1, 1, valid.length, SHEET_COLUMNS.length);
      // Garante que todas as linhas têm o número certo de colunas
      const padded    = valid.map(r => {
        const row = r.slice(0, SHEET_COLUMNS.length);
        while (row.length < SHEET_COLUMNS.length) row.push("");
        return row;
      });
      range.setValues(padded);
      return jsonOk({ ok: true, added: valid.length });
    }

    return jsonErr("Acção desconhecida: " + action);

  } catch (err) {
    return jsonErr(err.message);
  }
}
