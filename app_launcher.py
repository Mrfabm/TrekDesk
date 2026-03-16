import os
import sys
import subprocess
import webbrowser
import time
import signal
import psutil
from pathlib import Path

def check_directory_structure(base_dir):
    print(f"Current working directory: {os.getcwd()}")
    print(f"Base directory: {base_dir}")
    print("\nChecking for required directories:")
    backend_dir = os.path.join(base_dir, 'backend')
    frontend_dir = os.path.join(base_dir, 'frontend')
    
    print(f"Backend directory ({backend_dir}): {'exists' if os.path.exists(backend_dir) else 'NOT FOUND'}")
    if os.path.exists(backend_dir):
        print("Backend contents:", os.listdir(backend_dir))
    
    print(f"Frontend directory ({frontend_dir}): {'exists' if os.path.exists(frontend_dir) else 'NOT FOUND'}")
    if os.path.exists(frontend_dir):
        print("Frontend contents:", os.listdir(frontend_dir))

def kill_process_on_port(port):
    try:
        # Try using netstat command instead of psutil
        if sys.platform == 'win32':
            os.system(f'for /f "tokens=5" %a in (\'netstat -aon ^| find ":{port}" ^| find "LISTENING"\') do taskkill /f /pid %a >nul 2>&1')
        else:
            os.system(f'lsof -ti:{port} | xargs kill -9')
        time.sleep(1)
    except Exception as e:
        print(f"Warning: Could not kill process on port {port}: {e}")

def main():
    # Get the directory where the script/exe is located
    if getattr(sys, 'frozen', False):
        app_dir = sys._MEIPASS  # Use PyInstaller's temp directory
    else:
        app_dir = os.path.dirname(os.path.abspath(__file__))

    # Check directory structure
    check_directory_structure(app_dir)

    # Kill any processes using our ports
    kill_process_on_port(8000)  # Backend port
    kill_process_on_port(3000)  # Frontend port

    # Start backend server
    backend_dir = os.path.join(app_dir, 'backend')
    if not os.path.exists(backend_dir):
        print(f"Error: Backend directory not found at {backend_dir}")
        return
    os.chdir(backend_dir)
    
    # Create startupinfo to hide windows
    startupinfo = subprocess.STARTUPINFO()
    startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    startupinfo.wShowWindow = subprocess.SW_HIDE

    # Start backend server with virtual env
    backend_process = subprocess.Popen(
        f'cmd /c "env\\Scripts\\activate && python run.py"',
        shell=True,
        startupinfo=startupinfo,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    # Wait for backend to start
    time.sleep(5)

    # Start frontend
    frontend_dir = os.path.join(app_dir, 'frontend')
    if not os.path.exists(frontend_dir):
        print(f"Error: Frontend directory not found at {frontend_dir}")
        return
    os.chdir(frontend_dir)
    
    # Start frontend server (npm doesn't use startupinfo, so we redirect output)
    frontend_process = subprocess.Popen(
        'npm start',
        shell=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        startupinfo=startupinfo
    )

    # Wait for frontend to start
    time.sleep(5)

    # Open browser
    webbrowser.open('http://localhost:3000')

    try:
        # Keep the script running
        while True:
            time.sleep(1)
            # Check if processes are still running
            if backend_process.poll() is not None or frontend_process.poll() is not None:
                print("One of the servers stopped unexpectedly")
                break
    except KeyboardInterrupt:
        pass
    finally:
        # Clean up
        try:
            if sys.platform == 'win32':
                backend_process.terminate()
                frontend_process.terminate()
                # Force kill any remaining processes
                os.system('taskkill /F /T /PID %d >nul 2>&1' % backend_process.pid)
                os.system('taskkill /F /T /PID %d >nul 2>&1' % frontend_process.pid)
            else:
                backend_process.terminate()
                frontend_process.terminate()
        except Exception as e:
            print(f"Error during cleanup: {e}")

if __name__ == '__main__':
    main() 