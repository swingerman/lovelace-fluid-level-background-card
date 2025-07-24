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

      // Check if we're on auth pages - with trusted_networks this should not happen
      if (currentUrl.includes('/auth/authorize') || currentUrl.includes('/auth/')) {
        console.log('⚠️ Detected auth page - trying to handle OAuth flow...');

        // Try to create a bypass by simulating the auth approval
        // For testing, we'll try to complete the OAuth flow automatically
        try {
          // Look for and click the approve button (common in HA OAuth)
          const approveButton = page.locator('text=Allow').or(page.locator('text=Approve')).or(page.locator('[type="submit"]'));
          if (await approveButton.isVisible({ timeout: 2000 })) {
            console.log('Found approve button, clicking...');
            await approveButton.click();
            await page.waitForTimeout(3000);
          } else {
            console.log('No approve button found, trying direct navigation...');
            // Try to complete the OAuth flow by directly hitting the callback
            const urlParams = new URL(currentUrl).searchParams;
            const redirectUri = urlParams.get('redirect_uri');
            if (redirectUri) {
              const callbackUrl = decodeURIComponent(redirectUri);
              console.log(`Trying callback URL: ${callbackUrl}`);
              await page.goto(callbackUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
              await page.waitForTimeout(2000);
            }
          }
        } catch (authError) {
          console.log(`Auth handling failed: ${authError}`);
          // If auth handling fails, try direct navigation to dashboard
          await page.goto('http://localhost:8123/lovelace/0', {
            waitUntil: 'domcontentloaded',
            timeout: 10000
          });
          await page.waitForTimeout(3000);
        }

        const newUrl = page.url();
        const newTitle = await page.title();
        console.log(`After auth handling - URL: ${newUrl}, Title: ${newTitle}`);

        // Check if we successfully reached a lovelace page
        if (newUrl.includes('/lovelace') || newUrl.includes('auth_callback=1')) {
          console.log('✅ Successfully reached lovelace interface!');
          haReady = true;
          break;
        }

        // If still on auth page, mark as configuration issue but continue
        if (newUrl.includes('/auth/')) {
          console.log('❌ Still stuck on auth page - configuration issue detected');
          retries--; // Continue trying
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
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
      } else {
        console.log('Waiting for Home Assistant to load...');
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
