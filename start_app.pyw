import os
import subprocess
import webbrowser
import time

def main():
    # Get the current directory
    app_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Start backend
    backend_dir = os.path.join(app_dir, 'backend')
    os.chdir(backend_dir)
    backend_process = subprocess.Popen(
        'cmd /c "env\\Scripts\\activate && python run.py"',
        shell=True,
        creationflags=subprocess.CREATE_NO_WINDOW
    )

    # Wait for backend to start
    time.sleep(5)

    # Start frontend
    frontend_dir = os.path.join(app_dir, 'frontend')
    os.chdir(frontend_dir)
    frontend_process = subprocess.Popen(
        'npm start',
        shell=True,
        creationflags=subprocess.CREATE_NO_WINDOW
    )

    # Wait for frontend to start
    time.sleep(5)

    # Open browser
    webbrowser.open('http://localhost:3000')

if __name__ == '__main__':
    main() 