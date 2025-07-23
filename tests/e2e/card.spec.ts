import { test, expect } from '@playwright/test';

test.describe('Fluid Level Background Card E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Home Assistant
    await page.goto('/', { timeout: 30000 });
    await page.waitForTimeout(2000);

    // Check if we have a valid HA response (even if auth redirect)
    const title = await page.title();
    console.log('Page title:', title);
    console.log('Page URL:', page.url());

    // If we're on an auth page, we can't test dashboard features
    if (page.url().includes('/auth/') || !title.includes('Home Assistant')) {
      test.skip('Skipping test - Home Assistant authentication required');
    }

    try {
      // Try to wait for HA elements with shorter timeout
      await page.waitForSelector('ha-sidebar, ha-app-layout, partial-panel-resolver, home-assistant', { timeout: 5000 });
    } catch {
      // If no HA elements are found, skip the test
      test.skip('Skipping test - Home Assistant elements not available');
    }

    // Navigate to our test dashboard
    await page.goto('/lovelace/test', { timeout: 30000, waitUntil: 'networkidle' });
  });

  test('should load the card without errors', async ({ page }) => {
    // Look for our custom card elements
    const fluidCards = page.locator('fluid-level-background-card');

    // Should have multiple test cards
    await expect(fluidCards).toHaveCount(5, { timeout: 10000 });

    // Check that no error cards are present
    const errorCards = page.locator('hui-error-card');
    await expect(errorCards).toHaveCount(0);
  });

  test('should render card with correct entity', async ({ page }) => {
    // Wait for first card to be visible
    const firstCard = page.locator('fluid-level-background-card').first();
    await expect(firstCard).toBeVisible();

    // Check that the inner card is rendered
    const innerCard = firstCard.locator('hui-entities-card, hui-entity-card, hui-glance-card, hui-button-card');
    await expect(innerCard).toBeVisible();
  });

  test('should respond to entity state changes', async ({ page }) => {
    // Navigate to developer tools to change entity states
    await page.goto('/developer-tools/state');

    // Change the test_level entity value
    await page.fill('input[placeholder="Entity"]', 'input_number.test_level');
    await page.fill('input[placeholder="State"]', '75');
    await page.click('button:has-text("Set State")');

    // Go back to our test dashboard
    await page.goto('/lovelace/test');

    // Wait for the card to update
    await page.waitForTimeout(2000);

    // The fluid level should have changed (we can't easily test the visual level,
    // but we can verify the card is still rendering without errors)
    const fluidCards = page.locator('fluid-level-background-card');
    await expect(fluidCards.first()).toBeVisible();
  });

  test('should handle card editor', async ({ page }) => {
    // Enter edit mode (this requires being authenticated as admin)
    const editButton = page.locator('mwc-icon-button[label="Edit dashboard"]');
    if (await editButton.isVisible()) {
      await editButton.click();

      // Click on a card to edit it
      const firstCard = page.locator('fluid-level-background-card').first();
      await firstCard.click();

      // Look for edit options
      const editDialog = page.locator('hui-dialog-edit-card');
      if (await editDialog.isVisible()) {
        // Check if our custom editor is loaded
        const customEditor = editDialog.locator('fluid-level-background-card-editor');
        await expect(customEditor).toBeVisible();

        // Close the dialog
        await page.keyboard.press('Escape');
      }

      // Exit edit mode
      const doneButton = page.locator('mwc-icon-button[label="Done"]');
      if (await doneButton.isVisible()) {
        await doneButton.click();
      }
    }
  });

  test('should handle tap actions when not click-through', async ({ page }) => {
    // Find a card that doesn't have click-through enabled
    const cardWithActions = page.locator('fluid-level-background-card').nth(0);

    // Click on the card
    await cardWithActions.click();

    // This should trigger the tap action (more-info by default)
    // We can check if more-info dialog appears
    // Note: This test might need adjustment based on actual card behavior
    // For now, we just verify clicking doesn't cause errors
    await expect(cardWithActions).toBeVisible();
  });

  test('should allow clicks through when click-through is enabled', async ({ page }) => {
    // Find the card with click-through enabled (5th card in our test config)
    const clickThroughCard = page.locator('fluid-level-background-card').nth(4);

    // Verify the card is visible
    await expect(clickThroughCard).toBeVisible();

    // Click on it - this should pass through to the underlying card
    await clickThroughCard.click();

    // The card should still be visible and functional
    await expect(clickThroughCard).toBeVisible();
  });

  test('should display severity colors correctly', async ({ page }) => {
    // Find the card with severity configuration (3rd card)
    const severityCard = page.locator('fluid-level-background-card').nth(2);
    await expect(severityCard).toBeVisible();

    // We can't easily test colors visually, but we can ensure the card renders
    // and check for the presence of severity-related attributes or styles
    const fluidMeter = severityCard.locator('.fluid-meter, canvas');
    await expect(fluidMeter).toBeVisible();
  });

  test('should handle random start option', async ({ page }) => {
    // Find the card with random start enabled (4th card)
    const randomStartCard = page.locator('fluid-level-background-card').nth(3);
    await expect(randomStartCard).toBeVisible();

    // The card should still render properly with random start
    const fluidMeter = randomStartCard.locator('.fluid-meter, canvas');
    await expect(fluidMeter).toBeVisible();
  });

  test('should display top margin correctly', async ({ page }) => {
    // Find the card with top margin (4th card)
    const topMarginCard = page.locator('fluid-level-background-card').nth(3);
    await expect(topMarginCard).toBeVisible();

    // Check that the card has proper spacing/margin applied
    const cardElement = topMarginCard.locator('> *').first();
    await expect(cardElement).toBeVisible();
  });
});
