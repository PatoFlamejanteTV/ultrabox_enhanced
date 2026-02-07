import asyncio
import os
from playwright.async_api import async_playwright

async def verify():
    screenshot_path = os.environ.get("SCREENSHOT_PATH", "verification_final.png")
    screenshot_dir = os.path.dirname(screenshot_path)
    if screenshot_dir and not os.path.exists(screenshot_dir):
        os.makedirs(screenshot_dir)

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        try:
            page = await browser.new_page()
            page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
            page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

            print("Going to page...")
            await page.goto("http://localhost:8080/website/index.html", timeout=30000)

            print("Waiting for selector...")
            await page.wait_for_selector("#beepboxEditorContainer", timeout=30000)

            print(f"Selector found. Taking screenshot at {screenshot_path}...")
            await page.screenshot(path=screenshot_path, full_page=True)
            print("Verification screenshot saved.")
        except Exception as e:
            print(f"Error during verification: {e}")
            raise e
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(verify())
