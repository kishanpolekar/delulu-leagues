#!/usr/bin/env python3
"""
DWL Fantasy League Platform Launcher
Run with: python start.py
"""

import subprocess
import sys
import os
import time
import platform
import threading
import webbrowser

def print_colored(text, color='white'):
    colors = {
        'red': '\033[91m',
        'green': '\033[92m',
        'yellow': '\033[93m',
        'blue': '\033[94m',
        'white': '\033[0m'
    }
    if platform.system() == 'Windows':
        print(text)
    else:
        print(f"{colors.get(color, colors['white'])}{text}{colors['white']}")

def run_command(cmd, cwd=None, shell=True):
    """Run a command and return the process"""
    return subprocess.Popen(cmd, cwd=cwd, shell=shell)

def main():
    print_colored("=" * 50, 'green')
    print_colored("   DWL Fantasy League Platform", 'green')
    print_colored("=" * 50, 'green')
    print()
    
    def install_with_winget(package_name, display_name):
        """Attempt to install using Windows Package Manager"""
        if platform.system() == "Windows":
            try:
                print_colored(f"Attempting to install {display_name} using winget...", 'yellow')
                result = subprocess.run(['winget', 'install', package_name, '--accept-package-agreements'], 
                                    capture_output=True, text=True)
                if result.returncode == 0:
                    print_colored(f"✓ {display_name} installed successfully!", 'green')
                    return True
                else:
                    print_colored(f"✗ Failed to install {display_name} via winget", 'red')
                    return False
            except FileNotFoundError:
                print_colored("winget not found (Windows 10/11 should have it)", 'yellow')
                return False
        return False

    def provide_install_instructions(software, url, package_name, winget_command):
        """Provide installation instructions"""
        print_colored(f"\n📦 To install {software} easily:", 'cyan')
        print(f"  • Download from: {url}")
        
        if platform.system() == "Windows":
            print(f"  • Using winget (Windows 10/11): {winget_command}")
            print(f"  • Using Chocolatey: choco install {package_name}")
        elif platform.system() == "Darwin":  # macOS
            print(f"  • Using Homebrew: brew install {package_name}")
        elif platform.system() == "Linux":
            if package_name == "python":
                print(f"  • Ubuntu/Debian: sudo apt install python3 python3-pip")
                print(f"  • RHEL/Fedora: sudo dnf install python3")
            else:  # node
                print(f"  • Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo bash - && sudo apt install nodejs")
                print(f"  • RHEL/Fedora: sudo dnf install nodejs")

    # Check Python
    try:
        subprocess.run([sys.executable, '--version'], capture_output=True, check=True)
        print_colored("✓ Python is installed", 'green')
    except:
        print_colored("[ERROR] Python is not installed or not in PATH", 'red')
        
        # Try automatic installation on Windows
        if platform.system() == "Windows":
            if install_with_winget("Python.Python.3.12", "Python"):
                # Re-check after installation
                try:
                    subprocess.run([sys.executable, '--version'], capture_output=True, check=True)
                    print_colored("✓ Python installed and working!", 'green')
                except:
                    print_colored("⚠️ Please restart your terminal and run this script again", 'yellow')
                    input("Press Enter to exit...")
                    sys.exit(1)
            else:
                provide_install_instructions("Python", "https://python.org", "python", "winget install Python.Python.3.12")
                print_colored("\n⚠️ IMPORTANT: Check 'Add Python to PATH' during installation!", 'yellow')
                input("\nPress Enter after installing Python...")
                # Re-check
                try:
                    subprocess.run([sys.executable, '--version'], capture_output=True, check=True)
                    print_colored("✓ Great! Python is now installed.", 'green')
                except:
                    print_colored("Still can't find Python. Please restart your terminal and try again.", 'red')
                    sys.exit(1)
        else:
            provide_install_instructions("Python", "https://python.org", "python", "winget install Python.Python.3.12")
            input("\nPress Enter to exit...")
            sys.exit(1)

    # Check Node.js
    try:
        subprocess.run(['node', '--version'], capture_output=True, check=True)
        print_colored("✓ Node.js is installed", 'green')
    except:
        print_colored("[ERROR] Node.js is not installed or not in PATH", 'red')
        
        # Try automatic installation on Windows
        if platform.system() == "Windows":
            if install_with_winget("OpenJS.NodeJS.LTS", "Node.js"):
                # Re-check after installation
                try:
                    subprocess.run(['node', '--version'], capture_output=True, check=True)
                    print_colored("✓ Node.js installed and working!", 'green')
                except:
                    print_colored("⚠️ Please restart your terminal and run this script again", 'yellow')
                    input("Press Enter to exit...")
                    sys.exit(1)
            else:
                provide_install_instructions("Node.js", "https://nodejs.org", "nodejs", "winget install OpenJS.NodeJS.LTS")
                input("\nPress Enter after installing Node.js...")
                # Re-check
                try:
                    subprocess.run(['node', '--version'], capture_output=True, check=True)
                    print_colored("✓ Great! Node.js is now installed.", 'green')
                except:
                    print_colored("Still can't find Node.js. Please restart your terminal and try again.", 'red')
                    sys.exit(1)
        else:
            provide_install_instructions("Node.js", "https://nodejs.org", "nodejs", "winget install OpenJS.NodeJS.LTS")
            input("\nPress Enter to exit...")
            sys.exit(1)

    print_colored("\n✓ All dependencies are installed!", 'green')
    
    processes = []
    
    # Backend setup
    print_colored("[INFO] Starting Backend Server...", 'blue')
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    
    if not os.path.exists(backend_dir):
        print_colored(f"[ERROR] Backend directory not found: {backend_dir}", 'red')
        input("Press Enter to exit...")
        sys.exit(1)
    
    # Create virtual environment
    venv_path = os.path.join(backend_dir, 'venv')
    if not os.path.exists(venv_path):
        print_colored("[INFO] Creating Python virtual environment...", 'yellow')
        subprocess.run([sys.executable, '-m', 'venv', 'venv'], cwd=backend_dir, check=True)
    
    # Install dependencies
    print_colored("[INFO] Installing Python dependencies...", 'yellow')
    if platform.system() == 'Windows':
        python_exe = os.path.join(venv_path, 'Scripts', 'python')
        pip_exe = os.path.join(venv_path, 'Scripts', 'pip')
    else:
        python_exe = os.path.join(venv_path, 'bin', 'python')
        pip_exe = os.path.join(venv_path, 'bin', 'pip')
    
    subprocess.run([pip_exe, 'install', '-q', 'fastapi', 'uvicorn', 'pandas', 
                   'openpyxl', 'playwright', 'python-multipart', 'pydantic', 'supabase'], 
                   cwd=backend_dir, check=True)
    
    # Install playwright
    print_colored("[INFO] Installing Playwright browser...", 'yellow')
    subprocess.run([pip_exe, 'install', '-q', 'playwright'], cwd=backend_dir)
    subprocess.run([python_exe, '-m', 'playwright', 'install', 'webkit'], cwd=backend_dir)
    
    # Start backend
    print_colored("[INFO] Starting backend server...", 'blue')
    backend_process = subprocess.Popen(
        [python_exe, 'api_server.py'],
        cwd=backend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        creationflags=subprocess.CREATE_NEW_CONSOLE if platform.system() == 'Windows' else 0
    )
    processes.append(backend_process)
    
    # Wait for backend to start
    print_colored("[INFO] Waiting for backend to start (5 seconds)...", 'yellow')
    time.sleep(5)
    
    # Frontend setup
    print_colored("[INFO] Starting Frontend...", 'blue')
    frontend_dir = os.path.join(os.path.dirname(__file__), 'frontend')
    
    if not os.path.exists(frontend_dir):
        print_colored(f"[ERROR] Frontend directory not found: {frontend_dir}", 'red')
        input("Press Enter to exit...")
        sys.exit(1)
    
    # Install npm dependencies
    node_modules_path = os.path.join(frontend_dir, 'node_modules')
    if not os.path.exists(node_modules_path):
        print_colored("[INFO] Installing npm dependencies...", 'yellow')
        subprocess.run(['npm', 'install'], cwd=frontend_dir, check=True)
    
    # Start frontend
    frontend_process = subprocess.Popen(
        ['npm', 'run', 'dev'],
        cwd=frontend_dir,
        creationflags=subprocess.CREATE_NEW_CONSOLE if platform.system() == 'Windows' else 0
    )
    processes.append(frontend_process)
    
    # Open browser
    print_colored("[INFO] Opening browser...", 'blue')
    webbrowser.open('http://localhost:3000')
    
    print()
    print_colored("=" * 50, 'green')
    print_colored("   Platform Started Successfully!", 'green')
    print_colored("=" * 50, 'green')
    print()
    print_colored("   Backend: http://localhost:8000", 'white')
    print_colored("   Frontend: http://localhost:3000", 'white')
    print_colored("   API Docs: http://localhost:8000/docs", 'white')
    print()
    print_colored("   Close this window to stop all servers", 'yellow')
    print_colored("=" * 50, 'green')
    print()
    
    try:
        # Wait for processes
        for p in processes:
            p.wait()
    except KeyboardInterrupt:
        print_colored("\n[INFO] Shutting down servers...", 'yellow')
        for p in processes:
            p.terminate()
            time.sleep(1)
            if p.poll() is None:
                p.kill()

if __name__ == '__main__':
    main()