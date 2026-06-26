/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test';

// Verifies the 2026.6 entity-first card picker contract: the customCards entry
// must advertise preview + documentationURL and expose getEntitySuggestion so
// the card appears under "Community" when a numeric/% entity is picked.
const CARD_URL = 'http://127.0.0.1:5000/fluid-level-background-card.js';

test.describe('Card picker registration (HA 2026.6)', () => {
  test.beforeEach(async ({ page }) => {
    // Load from the dev-server origin (not about:blank) — the bundle reads
    // localStorage at load time, which throws on an opaque origin.
    await page.goto('http://127.0.0.1:5000/');
    const res = await page.request.get(CARD_URL);
    expect(res.status()).toBe(200);
    await page.addScriptTag({ url: CARD_URL, type: 'module' });
    await page.waitForFunction(
      () => customElements.get('fluid-level-background-card') !== undefined,
      { timeout: 10000 },
    );
  });

  test('registers with preview, documentationURL and getEntitySuggestion', async ({ page }) => {
    const entry = await page.evaluate(() => {
      const e = (window as any).customCards?.find(
        (c: any) => c.type === 'fluid-level-background-card',
      );
      return e && {
        preview: e.preview,
        hasDoc: typeof e.documentationURL === 'string' && e.documentationURL.length > 0,
        hasSuggestion: typeof e.getEntitySuggestion === 'function',
      };
    });
    expect(entry).toEqual({ preview: true, hasDoc: true, hasSuggestion: true });
  });

  test('getEntitySuggestion wraps a numeric entity and ignores others', async ({ page }) => {
    const result = await page.evaluate(() => {
      const entry = (window as any).customCards.find(
        (c: any) => c.type === 'fluid-level-background-card',
      );
      const hass = {
        states: {
          'sensor.batt': { state: '55', attributes: { device_class: 'battery', unit_of_measurement: '%' } },
          'light.lamp': { state: 'on', attributes: {} },
        },
      };
      return {
        battery: entry.getEntitySuggestion(hass, 'sensor.batt'),
        light: entry.getEntitySuggestion(hass, 'light.lamp'),
        missing: entry.getEntitySuggestion(hass, 'sensor.nope'),
      };
    });

    expect(result.battery?.config).toMatchObject({
      type: 'custom:fluid-level-background-card',
      entity: 'sensor.batt',
      card: { type: 'tile', entity: 'sensor.batt' },
    });
    expect(result.light).toBeNull();
    expect(result.missing).toBeNull();
  });

  test('getStubConfig returns a renderable default for preview', async ({ page }) => {
    const stub = await page.evaluate(() => {
      const ctor = customElements.get('fluid-level-background-card') as any;
      const hass = { states: { 'input_number.x': { state: '40', attributes: {} } } };
      return ctor.getStubConfig(hass, ['input_number.x'], []);
    });
    expect(stub).toMatchObject({
      entity: 'input_number.x',
      card: { type: 'tile', entity: 'input_number.x' },
    });
  });
});
