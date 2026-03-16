import os
import uvicorn
import logging

# Point to SQLite database file (created automatically on first run)
os.environ["DATABASE_URL"] = "sqlite:///./trekdesk.db"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
    )
