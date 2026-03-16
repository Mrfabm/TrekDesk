import pytest
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

@pytest.fixture
def test_app():
    from app.main import app
    return app

@pytest.fixture
def test_client(test_app):
    from fastapi.testclient import TestClient
    return TestClient(test_app) 