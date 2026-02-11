#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"

# ---------- colours ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

cleanup() {
  echo ""
  echo -e "${CYAN}Shutting down...${NC}"
  [[ -n "${BACKEND_PID:-}" ]] && kill "$BACKEND_PID" 2>/dev/null
  [[ -n "${FRONTEND_PID:-}" ]] && kill "$FRONTEND_PID" 2>/dev/null
  wait 2>/dev/null
  echo -e "${GREEN}Done.${NC}"
}
trap cleanup EXIT INT TERM

# ---------- check prerequisites ----------
for cmd in python3 node npm; do
  if ! command -v "$cmd" &>/dev/null; then
    echo -e "${RED}Error: $cmd is not installed.${NC}" >&2
    exit 1
  fi
done

# ---------- .env check ----------
if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo -e "${CYAN}No .env found — copying .env.example → .env${NC}"
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  echo -e "${RED}⚠  Please edit backend/.env with your Databricks credentials, then re-run.${NC}"
  exit 1
fi

# ---------- backend deps ----------
echo -e "${CYAN}Installing backend dependencies...${NC}"
pip3 install -q -r "$BACKEND_DIR/requirements.txt"

# ---------- frontend deps ----------
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo -e "${CYAN}Installing frontend dependencies...${NC}"
  (cd "$FRONTEND_DIR" && npm install --silent)
fi

# ---------- start backend ----------
echo -e "${GREEN}Starting backend on http://localhost:8000${NC}"
(cd "$BACKEND_DIR" && python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload) &
BACKEND_PID=$!

# give uvicorn a moment to bind
sleep 2

# ---------- start frontend ----------
echo -e "${GREEN}Starting frontend on http://localhost:5173${NC}"
(cd "$FRONTEND_DIR" && npx vite --host) &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Open http://localhost:5173 in your browser${NC}"
echo -e "${GREEN}  Press Ctrl+C to stop both servers${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

wait
