// Test helper utilities for setting up Home Assistant environment
import { Page } from '@playwright/test';

interface MockEntity {
  entity_id: string;
  state: string;
  attributes: {
    unit_of_measurement?: string;
    friendly_name: string;
    icon?: string;
  };
}

interface MockCardConfig {
  type: string;
  entity: string;
  name: string;
  show_name: boolean;
  show_state: boolean;
  show_units: boolean;
  full: number;
  severity: Array<{
    from: number;
    to: number;
    color: string;
  }>;
}

// TypeScript interface for card configuration
interface CardElement extends HTMLElement {
  setConfig(config: MockCardConfig): void;
}

// Mock Home Assistant entities that the card might use
export const mockHassEntities: Record<string, MockEntity> = {
  'sensor.water_tank': {
    entity_id: 'sensor.water_tank',
    state: '75',
    attributes: {
      unit_of_measurement: '%',
      friendly_name: 'Water Tank Level',
      icon: 'mdi:water-percent'
    }
  },
  'sensor.battery': {
    entity_id: 'sensor.battery',
    state: '87',
    attributes: {
      unit_of_measurement: '%',
      friendly_name: 'Battery Level',
      icon: 'mdi:battery'
    }
  }
};

// Mock Home Assistant configuration for the card
export const mockCardConfig: MockCardConfig = {
  type: 'custom:fluid-level-background-card',
  entity: 'sensor.water_tank',
  name: 'Water Tank',
  show_name: true,
  show_state: true,
  show_units: true,
  full: 100,
  severity: [
    { from: 0, to: 20, color: '#FF0000' },
    { from: 21, to: 50, color: '#FFAA00' },
    { from: 51, to: 100, color: '#00AA00' }
  ]
};

// Setup a Home Assistant page environment
export async function setupHomeAssistantPage(page: Page): Promise<Page> {
  // Navigate to a minimal HTML page that will host our card
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Home Assistant</title>
      <style>
        body { 
          margin: 0; 
          padding: 20px; 
          font-family: "Roboto", "Noto", sans-serif;
          background: #f5f5f5;
        }
        .card-container {
          width: 300px;
          margin: 20px auto;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          overflow: hidden;
        }
      </style>
    </head>
    <body>
      <div class="card-container">
        <div id="card-root"></div>
      </div>
    </body>
    </html>
  `);

  // Mock Home Assistant globals
  await page.evaluate((entities) => {
    // Mock the hass object
    (window as unknown as { hass: unknown }).hass = {
      states: entities,
      config: {
        unit_system: {
          length: 'km',
          mass: 'kg',
          temperature: '°C',
          volume: 'L'
        }
      },
      user: {
        is_admin: true,
        name: 'Test User'
      }
    };

    // Mock customElements if not available
    if (!window.customElements) {
      (window as unknown as { customElements: unknown }).customElements = {
        define: (): void => { /* mock */ },
        get: () => undefined,
        upgrade: (): void => { /* mock */ },
        whenDefined: () => Promise.resolve()
      };
    }

    // Mock LitElement and other dependencies
    (window as unknown as { LitElement: unknown }).LitElement = class MockLitElement extends HTMLElement {
      static get properties(): Record<string, unknown> { return {}; }
      connectedCallback(): void { /* mock */ }
      render(): string { return ''; }
      updated(): void { /* mock */ }
    };

    // Mock card helpers
    (window as unknown as { loadCardHelpers: unknown }).loadCardHelpers = () => Promise.resolve({
      createCardElement: () => document.createElement('div'),
      getLovelaceCollection: () => ({ subscribeUpdates: (): void => { /* mock */ } })
    });

  }, mockHassEntities);

  return page;
}

// Wait for card to render
export async function waitForCardRender(page: Page, timeout = 5000): Promise<void> {
  // Wait for the card element to be present
  await page.waitForSelector('#card-root', { timeout });
  
  // Give it a moment to render
  await page.waitForTimeout(500);
}

// Test card configuration changes
export async function testCardConfigChange(page: Page, newConfig: MockCardConfig): Promise<unknown> {
  return page.evaluate((config) => {
    const cardElement = document.querySelector('#card-root') as CardElement | null;
    if (cardElement && 'setConfig' in cardElement) {
      cardElement.setConfig(config);
    }
  }, newConfig);
}
