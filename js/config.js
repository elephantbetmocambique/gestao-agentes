// ============================================================
//  CONFIGURAÇÃO — edite apenas este ficheiro
// ============================================================

const CONFIG = {
  // URL do Google Apps Script (obtém no Passo 2 do INSTALL.md)
  APPS_SCRIPT_URL: "1p6tOgkmiqP6SwEAQCwcLrOhZL4usl9yiSk7g38IVAto",
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
  // { username: "joao", password: "pass123", nome: "João Silva", role: "admin" },
  // { username: "maria", password: "pass456", nome: "Maria Costa", role: "assistente" },
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
