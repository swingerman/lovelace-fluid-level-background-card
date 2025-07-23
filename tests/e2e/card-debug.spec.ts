import { test, expect } from '@playwright/test';

test.describe('Fluid Level Background Card Debug Tests', () => {
    test('should debug card loading process', async ({ page }) => {
        // Navigate to a blank page
        await page.goto('about:blank');

        // Track all console messages
        const messages: string[] = [];
        page.on('console', msg => {
            messages.push(`${msg.type()}: ${msg.text()}`);
        });

        // Try to load the script and see what happens
        try {
            console.log('Loading script from http://127.0.0.1:5000/fluid-level-background-card.js');

            const response = await page.request.get('http://127.0.0.1:5000/fluid-level-background-card.js');
            console.log('Script response status:', response.status());

            if (response.status() === 200) {
                const content = await response.text();
                console.log('Script content length:', content.length);
                console.log('Contains customElements:', content.includes('customElements'));
                console.log('Contains fluid-level-background-card:', content.includes('fluid-level-background-card'));

                // Add the script manually
                await page.evaluate((scriptContent) => {
                    const script = document.createElement('script');
                    script.type = 'module';
                    script.textContent = scriptContent;
                    document.head.appendChild(script);
                    return 'Script added';
                }, content);

                // Wait for the script to execute
                await page.waitForTimeout(2000);

                // Check console messages
                console.log('Console messages:', messages);

                // Check what custom elements are registered
                const customElements = await page.evaluate(() => {
                    return {
                        allKeys: Object.getOwnPropertyNames(window.customElements),
                        hasDefine: typeof window.customElements.define === 'function',
                        hasGet: typeof window.customElements.get === 'function',
                        fluidCard: window.customElements.get('fluid-level-background-card')
                    };
                });

                console.log('Custom elements info:', customElements);

                // Try to manually check if the element definition exists
                const elementCheck = await page.evaluate(() => {
                    try {
                        const el = document.createElement('fluid-level-background-card');
                        return {
                            created: true,
                            tagName: el.tagName,
                            constructor: el.constructor.name,
                            hasSetConfig: typeof el.setConfig === 'function'
                        };
                    } catch (error) {
                        return {
                            created: false,
                            error: error.message
                        };
                    }
                });

                console.log('Element creation test:', elementCheck);
            }

        } catch (error) {
            console.error('Debug test error:', error);
        }
    });
});
