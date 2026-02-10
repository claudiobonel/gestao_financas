@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo  Gestao Financeira - Inicializacao
echo ========================================

echo Verificando Node.js...
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERRO] Node.js nao encontrado.
  echo Instale em: https://nodejs.org
  echo.
  pause
  exit /b 1
)

echo Iniciando servidor...
start "" http://localhost:4173
npm start
