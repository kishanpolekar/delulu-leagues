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

# Function to detect OS
detect_os() {
    case "$(uname -s)" in
        Linux*)     echo "Linux";;
        Darwin*)    echo "MacOS";;
        CYGWIN*|MINGW*|MSYS*) echo "Windows";;
        *)          echo "Unknown";;
    esac
}

# Function to provide installation instructions
provide_instructions() {
    local software=$1
    local os=$(detect_os)
    
    echo -e "${YELLOW}Easy installation options for $software:${NC}"
    
    case $software in
        "Python")
            if [[ "$os" == "MacOS" ]]; then
                echo "  • Using Homebrew: brew install python@3.12"
                echo "  • Download from: https://python.org"
            elif [[ "$os" == "Linux" ]]; then
                echo "  • Ubuntu/Debian: sudo apt update && sudo apt install python3 python3-pip"
                echo "  • RHEL/Fedora: sudo dnf install python3"
                echo "  • Arch Linux: sudo pacman -S python"
            elif [[ "$os" == "Windows" ]]; then
                echo "  • Using winget: winget install Python.Python.3.12"
                echo "  • Using Chocolatey: choco install python"
                echo "  • Download from: https://python.org (✓ Check 'Add Python to PATH')"
            fi
            ;;
        "Node.js")
            if [[ "$os" == "MacOS" ]]; then
                echo "  • Using Homebrew: brew install node@20"
                echo "  • Download LTS from: https://nodejs.org"
            elif [[ "$os" == "Linux" ]]; then
                echo "  • Using NodeSource (Ubuntu/Debian):"
                echo "    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo bash -"
                echo "    sudo apt install -y nodejs"
                echo "  • RHEL/Fedora: sudo dnf install nodejs"
                echo "  • Arch Linux: sudo pacman -S nodejs npm"
            elif [[ "$os" == "Windows" ]]; then
                echo "  • Using winget: winget install OpenJS.NodeJS.LTS"
                echo "  • Using Chocolatey: choco install nodejs-lts"
                echo "  • Download LTS from: https://nodejs.org"
            fi
            ;;
    esac
}

# Function to attempt automatic installation on supported platforms
auto_install() {
    local software=$1
    local os=$(detect_os)
    
    if [[ "$os" == "MacOS" ]] && command -v brew &> /dev/null; then
        echo -e "${YELLOW}Attempting to install $software via Homebrew...${NC}"
        if [[ "$software" == "Python" ]]; then
            brew install python@3.12
        else
            brew install node@20
        fi
        return $?
    elif [[ "$os" == "Linux" ]] && command -v apt &> /dev/null; then
        echo -e "${YELLOW}Attempting to install $software via apt...${NC}"
        if [[ "$software" == "Python" ]]; then
            sudo apt update && sudo apt install -y python3 python3-pip
        else
            curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo bash -
            sudo apt install -y nodejs
        fi
        return $?
    else
        return 1
    fi
}

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[ERROR] Python 3 is not installed${NC}"
    echo ""
    
    # Try auto-installation (uncomment if you want auto-install)
    # if auto_install "Python"; then
    #     echo -e "${GREEN}✓ Python installed successfully!${NC}"
    # else
        provide_instructions "Python"
        echo -e "${BLUE}After installation, restart your terminal and run this script again.${NC}"
    # fi
    
    exit 1
else
    PYTHON_VERSION=$(python3 --version 2>&1)
    echo -e "${GREEN}✓ $PYTHON_VERSION is installed${NC}"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed${NC}"
    echo ""
    
    # Try auto-installation (uncomment if you want auto-install)
    # if auto_install "Node.js"; then
    #     echo -e "${GREEN}✓ Node.js installed successfully!${NC}"
    # else
        provide_instructions "Node.js"
        echo -e "${BLUE}After installation, restart your terminal and run this script again.${NC}"
    # fi
    
    exit 1
else
    NODE_VERSION=$(node --version 2>&1)
    echo -e "${GREEN}✓ Node.js $NODE_VERSION is installed${NC}"
fi

echo -e "${GREEN}✅ All dependencies are satisfied!${NC}"

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