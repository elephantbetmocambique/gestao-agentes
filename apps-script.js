// ============================================================
//  GOOGLE APPS SCRIPT — cole este código no seu Google Sheet
//  Extensões → Apps Script → apague tudo → cole → guarde
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
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const action = (e.parameter && e.parameter.action) || "getAll";
    if (action === "getAll") {
      const sheet = getSheet();
      if (!sheet) return jsonResponse({ error: "Separador 'Agentes' não encontrado." });
      const values = sheet.getDataRange().getValues();
      return jsonResponse({ values });
    }
    return jsonResponse({ error: "Acção desconhecida: " + action });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;
    const sheet  = getSheet();

    if (!sheet) return jsonResponse({ error: "Separador 'Agentes' não encontrado." });

    if (action === "ensureHeader") {
      const firstRow = sheet.getRange(1, 1, 1, SHEET_COLUMNS.length).getValues()[0];
      if (!firstRow[0] || firstRow[0] !== "ID") {
        const headerRange = sheet.getRange(1, 1, 1, SHEET_COLUMNS.length);
        headerRange.setValues([SHEET_COLUMNS]);
        headerRange.setFontWeight("bold");
        headerRange.setBackground("#1f3c90");
        headerRange.setFontColor("#ffffff");
      }
      return jsonResponse({ ok: true });
    }

    if (action === "add") {
      sheet.appendRow(body.row);
      return jsonResponse({ ok: true });
    }

    if (action === "update") {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0].toString() === body.id.toString()) {
          sheet.getRange(i + 1, 1, 1, body.row.length).setValues([body.row]);
          return jsonResponse({ ok: true });
        }
      }
      return jsonResponse({ error: "Agente não encontrado: " + body.id });
    }

    if (action === "delete") {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0].toString() === body.id.toString()) {
          sheet.deleteRow(i + 1);
          return jsonResponse({ ok: true });
        }
      }
      return jsonResponse({ error: "Agente não encontrado: " + body.id });
    }

    if (action === "batch") {
      if (!body.rows || !body.rows.length) return jsonResponse({ ok: true, added: 0 });
      body.rows.forEach(row => sheet.appendRow(row));
      return jsonResponse({ ok: true, added: body.rows.length });
    }

    return jsonResponse({ error: "Acção desconhecida: " + action });

  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}
