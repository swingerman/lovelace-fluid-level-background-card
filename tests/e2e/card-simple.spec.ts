/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test';

test.describe('Fluid Level Background Card Simple Tests', () => {
    test('should load the card JavaScript without errors', async ({ page }) => {
        // Navigate to Home Assistant first so it can load properly
        await page.goto('http://localhost:8123');

        // Wait for Home Assistant to fully load
        await page.waitForLoadState('networkidle');

        // Track console errors
        const errors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        // Track network errors
        page.on('requestfailed', request => {
            errors.push(`Network error: ${request.failure()?.errorText} - ${request.url()}`);
        });        // Verify the card dev server is accessible
        const cardUrl = 'http://127.0.0.1:5000/fluid-level-background-card.js';
        const response = await page.request.get(cardUrl);
        expect(response.status()).toBe(200);
        console.log(`Loading card from: ${cardUrl}`);

        // Track module loading errors
        const moduleErrors: any[] = [];
        page.on('pageerror', (error) => {
            console.log('Page error:', error.message);
            moduleErrors.push({ type: 'pageerror', message: error.message, stack: error.stack });
        });

        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                console.log('Console error:', msg.text());
                moduleErrors.push({ type: 'console', message: msg.text() });
            }
        });

        // Load the card script manually
        try {
            // Load the script with better error tracking
            await page.addScriptTag({
                url: cardUrl,
                type: 'module'
            });

            console.log('Script tag added, waiting for custom element definition...');

            // Wait for the custom element to be defined with proper timeout and polling
            await page.waitForFunction(() => {
                // Check if customElements is available and our element is defined
                return typeof customElements !== 'undefined' &&
                    customElements.get('fluid-level-background-card') !== undefined;
            }, {
                timeout: 20000, // 20 seconds should be enough
                polling: 1000   // Check every second
            });

            // Additional verification
            const elementExists = await page.evaluate(() => {
                return typeof customElements !== 'undefined' &&
                    customElements.get('fluid-level-background-card') !== undefined;
            });

            // Check that no errors occurred during loading
            console.log('Console errors:', errors);
            console.log('Element defined:', elementExists);

            expect(errors.length).toBe(0);
            expect(elementExists).toBe(true);

        } catch (error) {
            console.error('Failed to load card script:', error);

            // Log any module loading errors we captured
            if (moduleErrors.length > 0) {
                console.log('Module loading errors captured:', moduleErrors);
            }

            // Add detailed diagnostics
            const diagnostics = await page.evaluate(() => {
                const result: any = {
                    customElementsAvailable: typeof customElements !== 'undefined',
                    elementDefined: false,
                    windowProperties: [],
                    scriptTags: [],
                    errors: [],
                    moduleLoadErrors: [],
                    dependencies: {}
                };

                if (typeof customElements !== 'undefined') {
                    result.elementDefined = customElements.get('fluid-level-background-card') !== undefined;
                }

                // Check for dependencies that should be loaded
                result.dependencies = {
                    lit: typeof (window as any).lit !== 'undefined',
                    customCardHelpers: typeof (window as any).loadCardHelpers !== 'undefined',
                    litElement: typeof (window as any).LitElement !== 'undefined'
                };

                // Get window properties that might be related to our card
                result.windowProperties = Object.keys(window).filter(key =>
                    key.includes('fluid') ||
                    key.includes('card') ||
                    key.includes('lit') ||
                    key.includes('custom')
                );

                // Get all script tags
                const scripts = document.querySelectorAll('script');
                result.scriptTags = Array.from(scripts).map(script => ({
                    src: script.src,
                    type: script.type,
                    loaded: (script as any).readyState || 'unknown'
                }));

                return result;
            });

            console.log('Diagnostic info:', JSON.stringify(diagnostics, null, 2));
            console.log('Console errors:', errors);

            throw error;
        }
    });

    test('should create card element with basic properties', async ({ page }) => {
        // Navigate to a blank page
        await page.goto('about:blank');

        // Verify server is accessible
        const response = await page.request.get('http://127.0.0.1:5000/fluid-level-background-card.js');
        expect(response.status()).toBe(200);

        // Add our card script
        await page.addScriptTag({
            url: 'http://127.0.0.1:5000/fluid-level-background-card.js',
            type: 'module'
        });

        // Wait for the script to load and custom element to be defined
        await page.waitForTimeout(5000);

        // Wait specifically for the custom element to be defined
        await page.waitForFunction(() => {
            return customElements.get('fluid-level-background-card') !== undefined;
        }, { timeout: 10000 });

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

        // Verify server is accessible
        const response = await page.request.get('http://127.0.0.1:5000/fluid-level-background-card.js');
        expect(response.status()).toBe(200);

        // Add our card script
        await page.addScriptTag({
            url: 'http://127.0.0.1:5000/fluid-level-background-card.js',
            type: 'module'
        });

        // Wait for custom element to be defined
        await page.waitForFunction(() => {
            return customElements.get('fluid-level-background-card') !== undefined;
        }, { timeout: 10000 });

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

        // Verify server is accessible
        const response = await page.request.get('http://127.0.0.1:5000/fluid-level-background-card.js');
        expect(response.status()).toBe(200);

        // Add our card script
        await page.addScriptTag({
            url: 'http://127.0.0.1:5000/fluid-level-background-card.js',
            type: 'module'
        });

        // Wait for custom element to be defined
        await page.waitForFunction(() => {
            return customElements.get('fluid-level-background-card') !== undefined;
        }, { timeout: 10000 });

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
