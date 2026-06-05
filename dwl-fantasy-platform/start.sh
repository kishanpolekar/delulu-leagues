#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "   DWL Fantasy League Platform"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[ERROR] Python 3 is not installed${NC}"
    echo "Please install Python 3.9+ from https://python.org"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org"
    exit 1
fi

echo -e "${GREEN}[INFO] Starting Backend Server...${NC}"
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}[INFO] Creating Python virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
source venv/bin/activate
echo -e "${YELLOW}[INFO] Installing Python dependencies...${NC}"
pip install -q fastapi uvicorn pandas openpyxl playwright python-multipart pydantic supabase

# Install playwright browser
echo -e "${YELLOW}[INFO] Installing Playwright browser...${NC}"
playwright install webkit

# Start backend in background
echo -e "${GREEN}[INFO] Starting backend server...${NC}"
python api_server.py &
BACKEND_PID=$!

cd ..

# Wait for backend to start
echo -e "${YELLOW}[INFO] Waiting for backend to start (5 seconds)...${NC}"
sleep 5

# Start frontend
echo -e "${GREEN}[INFO] Starting Frontend...${NC}"
cd frontend

# Install npm dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[INFO] Installing npm dependencies...${NC}"
    npm install
fi

# Start frontend
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo "========================================"
echo -e "${GREEN}   Platform Started Successfully!${NC}"
echo "========================================"
echo ""
echo "   Backend: http://localhost:8000"
echo "   Frontend: http://localhost:3000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "   Press Ctrl+C to stop all servers"
echo "========================================"
echo ""

# Wait for user to press Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait