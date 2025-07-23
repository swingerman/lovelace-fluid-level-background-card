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
      await page.goto('http://localhost:8123', {
        timeout: 5000,
        waitUntil: 'domcontentloaded'
      });

      // Wait a moment for any redirects to settle
      await page.waitForTimeout(1000);

      // Check if we're on the main HA interface (not auth pages)
      const currentUrl = page.url();
      const title = await page.title();

      console.log(`Current URL: ${currentUrl}, Title: ${title}`);

      // With auth_required: false, we should not see any auth pages
      if (currentUrl.includes('/auth/authorize') || currentUrl.includes('/auth/')) {
        console.log('Still on auth page, waiting...');
      } else if (title && title.includes('Home Assistant')) {
        // Check if we can see any HA UI elements
        const hasHaElements = await page.evaluate(() => {
          return document.querySelector('home-assistant') !== null ||
            document.querySelector('ha-app-layout') !== null ||
            document.querySelector('[data-page="lovelace"]') !== null;
        });

        if (hasHaElements || currentUrl === 'http://localhost:8123/' || currentUrl.endsWith('/lovelace/')) {
          haReady = true;
          console.log('✅ Home Assistant is ready!');
        } else {
          console.log('HA title found but no UI elements detected yet...');
        }
      }
    } catch (error) {
      console.log(`⏳ Waiting for Home Assistant... (${retries} retries left)`);
      console.log(`Error details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    if (!haReady) {
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
