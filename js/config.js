// ============================================================
//  CONFIGURAÇÃO DA APLICAÇÃO — edite apenas este ficheiro
// ============================================================

const CONFIG = {
  // 1. Cole aqui o ID do seu Google Sheet
  //    (encontra-o no URL: docs.google.com/spreadsheets/d/ESTE_ID_AQUI/edit)
  SHEET_ID: "1p6tOgkmiqP6SwEAQCwcLrOhZL4usl9yiSk7g38IVAto",

  // 2. Cole aqui a sua API Key do Google Cloud Console
  //    (Google Cloud → APIs → Credenciais → Criar chave de API)
  API_KEY: "AIzaSyBelSgmaQj6T62rDzgakxjq92XrUPgE9Po",

  // 3. Nome exacto do separador/aba dentro do Google Sheet
  SHEET_TAB: "Agentes",

  // 4. Nome da aplicação (aparece no título e header)
  APP_NAME: "gestao-gentes",

  // 5. Logo (URL de imagem) — deixe vazio para usar só o texto
  LOGO_URL: "",
};

// Colunas esperadas no Google Sheet (não altere a ordem)
const SHEET_COLUMNS = [
  "ID", "Nome", "Género", "Supervisor", "Localização",
  "Tipo", "IMEI", "SIM", "Operadora", "Status",
  "Barril", "M-Pesa", "PremierLoto", "BalcaoOutro",
  "Placa LotoFoot", "Placa Resultado", "Placa Quiosque", "Sombra",
  "Data Cadastro", "Última Actualização",
];
