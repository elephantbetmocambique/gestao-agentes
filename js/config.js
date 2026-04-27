// ============================================================
//  CONFIGURAÇÃO — edite apenas este ficheiro
// ============================================================

const CONFIG = {
  // URL do Google Apps Script (obtém no Passo 2 do INSTALL.md)
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxMBEvH9uGMCXw17WSqY8JsM-641gEPJSvG0VrXtTfbhtfs3sumMbvB5v5idnlKJRYEkw/exec",
  APP_NAME: "Gestão de Agentes",
};

// ============================================================
//  UTILIZADORES E PERFIS (roles)
//  Adicione, edite ou remova utilizadores aqui
//  roles disponíveis: "admin" | "assistente"
// ============================================================
const USERS = [
  {
    username: "admin",
    password: "admin123",
    nome: "Administrador",
    role: "admin",
  },
  {
    username: "assistente",
    password: "assist123",
    nome: "Assistente",
    role: "assistente",
  },
  // Adicione mais utilizadores abaixo:
  { username: "nilza.nhantumbo", password: "nnhantumbo", nome: "Nilza Nhantumbo", role: "assistente" },
  { username: "lurdes.cossa", password: "lcossa", nome: "Lurdes Cossa", role: "assistente" },
];

// ============================================================
//  PERMISSÕES POR ROLE (não altere)
// ============================================================
const PERMISSIONS = {
  admin: {
    canCreate: true,
    canEdit:   true,
    canDelete: true,
    canImport: true,
    canExport: true,
    canManageUsers: true,
  },
  assistente: {
    canCreate: false,
    canEdit:   false,
    canDelete: false,
    canImport: false,
    canExport: true,
    canManageUsers: false,
  },
};

// Colunas do Google Sheet (não altere)
const SHEET_COLUMNS = [
  "ID", "Nome", "Género", "Supervisor", "Localização",
  "Tipo", "IMEI", "SIM", "Operadora", "Status",
  "Barril", "M-Pesa", "PremierLoto", "BalcaoOutro",
  "Placa LotoFoot", "Placa Resultado", "Placa Quiosque", "Sombra",
  "Data Cadastro", "Última Actualização",
];
