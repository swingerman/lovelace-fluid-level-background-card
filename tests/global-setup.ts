/**
 * Global setup for Playwright E2E tests
 * This runs once before all tests and starts Home Assistant
 */
async function globalSetup(): Promise<void> {
  console.log('🏠 Starting Home Assistant for E2E tests...');

  // Start a browser to check if HA is ready
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Wait for Home Assistant to be ready
  let retries = 30; // 30 * 4 seconds = 2 minutes
  let haReady = false;

  while (retries > 0 && !haReady) {
    try {
      await page.goto('http://localhost:8123', { timeout: 5000 });

      // Check if we can see the HA interface or auth page
      const title = await page.title();
      if (title && (title.includes('Home Assistant') || title.includes('Sign In'))) {
        haReady = true;
        console.log('✅ Home Assistant is ready!');
      }
    } catch (error) {
      console.log(`⏳ Waiting for Home Assistant... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 4000));
      retries--;
    }
  }

  await browser.close();

  if (!haReady) {
    throw new Error('❌ Home Assistant failed to start within the timeout period');
  }

  return Promise.resolve();
}

export default globalSetup;
