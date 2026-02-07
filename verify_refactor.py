import asyncio
from playwright.async_api import async_playwright

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))
        try:
            print("Going to page...")
            await page.goto("http://localhost:8080/website/index.html", timeout=30000)
            print("Waiting for selector...")
            await page.wait_for_selector("#beepboxEditorContainer", timeout=30000)
            print("Selector found. Taking screenshot...")
            await page.screenshot(path="/home/jules/verification/verification_final.png", full_page=True)
            print("Verification screenshot saved.")
        except Exception as e:
            print(f"Error during verification: {e}")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify())
