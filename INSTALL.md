# Guia de Instalação — GitHub Pages + Google Sheets

## Como funciona
```
Browser (GitHub Pages) ←→ Google Apps Script ←→ Google Sheet
```

---

## PASSO 1 — Criar o Google Sheet

1. Aceda a sheets.google.com
2. Crie um novo ficheiro em branco
3. Clique duas vezes no separador "Folha1" → escreva Agentes → Enter
4. Copie o ID do URL (o código longo entre /d/ e /edit)

---

## PASSO 2 — Instalar o Apps Script

1. No Google Sheet: Extensões → Apps Script
2. Apague tudo (Ctrl+A → Delete)
3. Abra o ficheiro apps-script.js desta pasta com Bloco de Notas
4. Copie todo o conteúdo e cole no Apps Script → Guardar (Ctrl+S)
5. Clique em Implementar → Nova implementação → Aplicação Web
6. Configure: Executar como = Eu mesmo | Quem tem acesso = Qualquer pessoa
7. Clique Implementar → autorize → copie o URL gerado (começa com https://script.google.com/macros/s/...)

---

## PASSO 3 — Configurar o config.js

Abra js/config.js com o Bloco de Notas e substitua:

  APPS_SCRIPT_URL: "COLE_AQUI_O_URL_DO_APPS_SCRIPT",

pelo URL copiado no Passo 2. Guarde (Ctrl+S).

---

## PASSO 4 — Publicar no GitHub Pages

1. Aceda a github.com → faça login → clique + → New repository
2. Nome: gestao-agentes | Marque Public | Clique Create repository
3. Clique em "uploading an existing file"
4. Arraste: index.html + pasta css/ + pasta js/
5. Clique Commit changes
6. Vá a Settings → Pages → Branch: main → Save
7. Aguarde 2 minutos → o link aparece no topo da página

Link final: https://SEU_USUARIO.github.io/gestao-agentes/

---

## Problemas comuns

- Tabela não carrega → verifique o URL no config.js
- Separador não encontrado → confirme que se chama exactamente "Agentes"
- Página em branco → aguarde 3 minutos após activar o Pages
- Erro ao guardar → re-publique o Apps Script com nova versão
