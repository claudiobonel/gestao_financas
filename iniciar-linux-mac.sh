#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "========================================"
echo " Gestao Financeira - Inicializacao"
echo "========================================"

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "[ERRO] Node.js nao encontrado."
  echo "Instale em: https://nodejs.org"
  echo
  exit 1
fi

echo "Iniciando servidor em http://localhost:4173"
npm start
