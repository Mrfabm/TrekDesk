"""
TrekDesk Scraper Tray App
- Shows a gorilla icon in the Windows notification area
- Runs the full 2-year scrape continuously in the background
- Tooltip shows live batch progress
- Right-click menu: Scrape Now, View Log, Exit
"""
import pystray
from PIL import Image, ImageEnhance
import asyncio
import sys
import threading
import os
import time
import logging

# ── paths ──────────────────────────────────────────────────────────────────────
ROOT_DIR    = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
LOG_FILE    = os.path.join(BACKEND_DIR, "scrapers.log")
ICON_PATH   = os.path.join(ROOT_DIR, "app_icon.png")

# Add backend to path so we can import the scrapers
sys.path.insert(0, BACKEND_DIR)

# ── logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)

# ── state ──────────────────────────────────────────────────────────────────────
_state = {
    "active": False,
    "text": "TrekDesk Scraper - Starting...",
    "force_now": threading.Event(),
    "stop": False,
}
_tray: pystray.Icon = None


# ── icon helpers ───────────────────────────────────────────────────────────────
def _load_icon(active: bool) -> Image.Image:
    try:
        img = Image.open(ICON_PATH).convert("RGBA").resize((64, 64), Image.LANCZOS)
        if not active:
            # Greyscale + dimmed for idle state
            grey = img.convert("LA").convert("RGBA")
            img = ImageEnhance.Brightness(grey).enhance(0.6)
        return img
    except Exception:
        # Fallback coloured circle
        img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        from PIL import ImageDraw
        draw = ImageDraw.Draw(img)
        colour = (34, 197, 94, 255) if active else (120, 120, 120, 255)
        draw.ellipse([4, 4, 60, 60], fill=colour)
        return img


def _set_status(text: str, active: bool = True):
    _state["text"] = f"TrekDesk Scraper - {text}"
    _state["active"] = active
    if _tray:
        _tray.title = _state["text"]
        _tray.icon  = _load_icon(active)


# ── scraper ────────────────────────────────────────────────────────────────────
TOTAL_BATCHES = 25   # 2 years in 30-day batches
BATCH_SIZE    = 30


async def _run_all_batches():
    from async_panda_headless import scrape_slots
    from async_golden_monkey import scrape_golden_monkey_slots

    logger.info(f"=== Starting full 2-year scrape ({TOTAL_BATCHES} batches) ===")

    for batch in range(TOTAL_BATCHES):
        if _state["stop"]:
            break
        start_offset = batch * BATCH_SIZE
        logger.info(f"Batch {batch + 1}/{TOTAL_BATCHES} — gorilla")
        _set_status(f"Batch {batch + 1}/{TOTAL_BATCHES} — Gorilla scrape")
        try:
            await scrape_slots(start_offset=start_offset)
        except Exception as e:
            logger.error(f"Gorilla batch {batch + 1} error: {e}")

        await asyncio.sleep(30)

        if _state["stop"]:
            break
        logger.info(f"Batch {batch + 1}/{TOTAL_BATCHES} — golden monkey")
        _set_status(f"Batch {batch + 1}/{TOTAL_BATCHES} — Golden Monkey scrape")
        try:
            await scrape_golden_monkey_slots(start_offset=start_offset)
        except Exception as e:
            logger.error(f"Golden Monkey batch {batch + 1} error: {e}")

        if batch < TOTAL_BATCHES - 1:
            await asyncio.sleep(30)

    logger.info("=== Full 2-year scrape complete ===")


def _scraper_thread_fn():
    if sys.platform == "win32":
        loop = asyncio.ProactorEventLoop()
    else:
        loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(_run_all_batches())
    except Exception as e:
        logger.error(f"Scraper error: {e}")
    finally:
        loop.close()


def _scraper_loop():
    """Continuous loop: scrape → idle briefly → scrape again."""
    while not _state["stop"]:
        _state["force_now"].clear()
        _set_status("Scraping...", active=True)

        t = threading.Thread(target=_scraper_thread_fn, daemon=True)
        t.start()
        t.join()  # wait for full 2-year cycle to finish

        if _state["stop"]:
            break

        # Brief pause between cycles, but allow force-trigger
        _set_status("Idle — waiting to restart", active=False)
        logger.info("Cycle complete. Restarting in 5 minutes...")
        _state["force_now"].wait(timeout=5 * 60)


# ── tray menu actions ──────────────────────────────────────────────────────────
def _on_scrape_now(icon, item):
    _state["force_now"].set()  # wake up the idle wait immediately
    logger.info("Manual scrape triggered from tray")


def _on_view_log(icon, item):
    os.startfile(LOG_FILE)


def _on_exit(icon, item):
    _state["stop"] = True
    _state["force_now"].set()
    icon.stop()


# ── main ───────────────────────────────────────────────────────────────────────
def main():
    global _tray

    # Start scraper in background thread
    scraper = threading.Thread(target=_scraper_loop, daemon=True)
    scraper.start()

    menu = pystray.Menu(
        pystray.MenuItem("Scrape Now", _on_scrape_now),
        pystray.MenuItem("View Log",   _on_view_log),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Exit",       _on_exit),
    )

    _tray = pystray.Icon(
        name  = "TrekDesk Scraper",
        icon  = _load_icon(True),
        title = "TrekDesk Scraper - Starting...",
        menu  = menu,
    )

    _tray.run()


if __name__ == "__main__":
    main()
