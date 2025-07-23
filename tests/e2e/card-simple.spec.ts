/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test';

test.describe('Fluid Level Background Card Simple Tests', () => {
    test('should load the card JavaScript without errors', async ({ page }) => {
        // Navigate to a blank page
        await page.goto('about:blank');

        // Track console errors
        const errors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        // Add our card script via external URL (not inline text)
        try {
            await page.addScriptTag({
                url: 'http://127.0.0.1:5000/fluid-level-background-card.js',
                type: 'module'
            });

            // Wait longer for the module to load and execute
            await page.waitForTimeout(3000);

            // Check that no errors occurred during loading
            console.log('Console errors:', errors);
            expect(errors.length).toBe(0);

            // Check that the custom element is defined
            const isElementDefined = await page.evaluate(() => {
                return customElements.get('fluid-level-background-card') !== undefined;
            });
            console.log('Element defined:', isElementDefined);
            expect(isElementDefined).toBe(true);

        } catch (error) {
            console.error('Failed to load card script:', error);
            throw error;
        }
    });

    test('should create card element with basic properties', async ({ page }) => {
        // Navigate to a blank page
        await page.goto('about:blank');

        // Add our card script
        await page.addScriptTag({
            url: 'http://127.0.0.1:5000/fluid-level-background-card.js',
            type: 'module'
        });

        // Wait for the script to load
        await page.waitForTimeout(3000);

        // Create a card element
        const cardResult = await page.evaluate(() => {
            const card = document.createElement('fluid-level-background-card') as any;
            document.body.appendChild(card);

            return {
                tagName: card.tagName,
                hasSetConfig: typeof card.setConfig === 'function',
                hasGetCardSize: typeof card.getCardSize === 'function'
            };
        });

        expect(cardResult.tagName).toBe('FLUID-LEVEL-BACKGROUND-CARD');
        expect(cardResult.hasSetConfig).toBe(true);
        expect(cardResult.hasGetCardSize).toBe(true);
    });

    test('should handle basic configuration', async ({ page }) => {
        // Navigate to a blank page
        await page.goto('about:blank');

        // Add our card script
        await page.addScriptTag({
            url: 'http://127.0.0.1:5000/fluid-level-background-card.js',
            type: 'module'
        });

        await page.waitForTimeout(3000);

        // Test basic configuration
        const configResult = await page.evaluate(() => {
            const card = document.createElement('fluid-level-background-card') as any;
            document.body.appendChild(card);

            try {
                // Set a basic configuration
                card.setConfig({
                    entity: 'input_number.battery_level',
                    card: {
                        type: 'entity',
                        entity: 'input_number.battery_level'
                    }
                });

                return {
                    success: true,
                    error: null
                };
            } catch (error: any) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        expect(configResult.success).toBe(true);
        expect(configResult.error).toBe(null);
    });

    test('should render fluid background element', async ({ page }) => {
        // Navigate to a blank page
        await page.goto('about:blank');

        // Add our card script
        await page.addScriptTag({
            url: 'http://127.0.0.1:5000/fluid-level-background-card.js',
            type: 'module'
        });

        await page.waitForTimeout(3000);

        // Create and configure the card
        const renderResult = await page.evaluate(() => {
            const card = document.createElement('fluid-level-background-card') as any;
            document.body.appendChild(card);

            // Set configuration
            card.setConfig({
                entity: 'input_number.battery_level',
                card: {
                    type: 'entity',
                    entity: 'input_number.battery_level'
                }
            });

            // Wait a moment for rendering
            return new Promise((resolve) => {
                setTimeout(() => {
                    const fluidBackground = card.shadowRoot?.querySelector('fluid-background');
                    const hasCanvas = fluidBackground?.shadowRoot?.querySelector('canvas') !== null;

                    resolve({
                        hasFluidBackground: fluidBackground !== null,
                        hasCanvas: hasCanvas
                    });
                }, 500);
            });
        });

        const result = renderResult as { hasFluidBackground: boolean; hasCanvas: boolean };
        expect(result.hasFluidBackground).toBe(true);
        expect(result.hasCanvas).toBe(true);
    });
});
