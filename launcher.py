import os
import sys
import subprocess
import webbrowser
import time
import signal
import psutil
from pathlib import Path
import http.server
import socketserver
import threading

def kill_process_on_port(port):
    for proc in psutil.process_iter(['pid', 'name', 'connections']):
        try:
            for conn in proc.connections():
                if conn.laddr.port == port:
                    os.kill(proc.pid, signal.SIGTERM)
                    time.sleep(1)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

def serve_frontend():
    # Serve the static frontend files
    os.chdir(os.path.join(app_dir, 'frontend', 'build'))
    
    class Handler(http.server.SimpleHTTPRequestHandler):
        def end_headers(self):
            # Enable CORS
            self.send_header('Access-Control-Allow-Origin', '*')
            super().end_headers()
            
    with socketserver.TCPServer(("", 3000), Handler) as httpd:
        print("Frontend server started at port 3000")
        httpd.serve_forever()

def main():
    global app_dir
    # Get the directory where the executable is located
    if getattr(sys, 'frozen', False):
        # If running as compiled executable
        app_dir = sys._MEIPASS  # Use PyInstaller's temp directory
    else:
        # If running as script
        app_dir = os.path.dirname(os.path.abspath(__file__))

    # Kill any processes using our ports
    kill_process_on_port(8000)  # Backend port
    kill_process_on_port(3000)  # Frontend port

    # Start backend server
    backend_dir = os.path.join(app_dir, 'backend')
    os.chdir(backend_dir)
    
    # Start backend server (no virtual env needed as dependencies are bundled)
    if sys.platform == 'win32':
        backend_process = subprocess.Popen(
            'start cmd /c "python run.py"',
            shell=True
        )
    else:
        backend_process = subprocess.Popen(
            'python run.py',
            shell=True
        )

    # Wait for backend to start
    time.sleep(5)

    # Start frontend in a separate thread
    frontend_thread = threading.Thread(target=serve_frontend, daemon=True)
    frontend_thread.start()

    # Wait for frontend server to start
    time.sleep(2)

    # Open browser
    webbrowser.open('http://localhost:3000')

    try:
        # Keep the script running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        # Handle cleanup when Ctrl+C is pressed
        if sys.platform == 'win32':
            os.system('taskkill /F /T /PID %d' % backend_process.pid)
        else:
            backend_process.terminate()

if __name__ == '__main__':
    main() 