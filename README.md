# Gestão Financeira — Aplicativo pronto para baixar e rodar

Este projeto já está preparado para uso por usuários não técnicos.

## Opção 1 (mais simples): Windows
1. Baixe e extraia a pasta do projeto.
2. Dê duplo clique em **`iniciar-windows.bat`**.
3. O navegador abrirá automaticamente em `http://localhost:4173`.

## Opção 2: Linux/macOS
1. Baixe e extraia a pasta do projeto.
2. No terminal, entre na pasta e execute:
   ```bash
   chmod +x iniciar-linux-mac.sh
   ./iniciar-linux-mac.sh
   ```
3. Abra `http://localhost:4173` no navegador.

---

## Requisito único
Você só precisa ter o **Node.js (LTS)** instalado:
- https://nodejs.org

---

## Gerar pacote ZIP para distribuição
Se quiser criar um arquivo pronto para enviar a outras pessoas:

```bash
npm run package
```

Isso gera: `dist/gestao-financeira-app.zip`

---

## Encerrar o aplicativo
No terminal/janela que iniciou o app, pressione `Ctrl + C`.
