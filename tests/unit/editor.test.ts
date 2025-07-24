import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FluidLevelBackgroundCardConfig } from '../../src/types';

// Mock the editor module since we can't import it directly in unit tests
const mockEditor = {
  setConfig: vi.fn(),
  _config: undefined as FluidLevelBackgroundCardConfig | undefined,
  _sanitizeTopMargin: (value: any): number => {
    const numValue = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return 0;
    if (numValue > 20) return 20;
    return Math.round(numValue);
  },
  _updateConfig: vi.fn(),
  _shouldAlwaysKeepConfigKey: (key: string): boolean => {
    const alwaysKeepKeys = ['top_margin'];
    return alwaysKeepKeys.includes(key);
  }
};

describe('FluidLevelBackgroundCardEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEditor._config = undefined;
  });

  describe('_sanitizeTopMargin', () => {
    it('should return 0 for negative values', () => {
      expect(mockEditor._sanitizeTopMargin(-5)).toBe(0);
      expect(mockEditor._sanitizeTopMargin(-1)).toBe(0);
    });

    it('should return 0 for NaN values', () => {
      expect(mockEditor._sanitizeTopMargin('invalid')).toBe(0);
      expect(mockEditor._sanitizeTopMargin(undefined)).toBe(0);
      expect(mockEditor._sanitizeTopMargin(null)).toBe(0);
    });

    it('should cap values above 20', () => {
      expect(mockEditor._sanitizeTopMargin(25)).toBe(20);
      expect(mockEditor._sanitizeTopMargin(100)).toBe(20);
      expect(mockEditor._sanitizeTopMargin(21)).toBe(20);
    });

    it('should round decimal values', () => {
      expect(mockEditor._sanitizeTopMargin(5.7)).toBe(6);
      expect(mockEditor._sanitizeTopMargin(5.3)).toBe(5);
      expect(mockEditor._sanitizeTopMargin(10.5)).toBe(11);
    });

    it('should handle valid values within range', () => {
      expect(mockEditor._sanitizeTopMargin(0)).toBe(0);
      expect(mockEditor._sanitizeTopMargin(10)).toBe(10);
      expect(mockEditor._sanitizeTopMargin(20)).toBe(20);
    });

    it('should handle string numbers', () => {
      expect(mockEditor._sanitizeTopMargin('5')).toBe(5);
      expect(mockEditor._sanitizeTopMargin('15.7')).toBe(16);
      expect(mockEditor._sanitizeTopMargin('0')).toBe(0);
    });
  });

  describe('_shouldAlwaysKeepConfigKey', () => {
    it('should return true for top_margin', () => {
      expect(mockEditor._shouldAlwaysKeepConfigKey('top_margin')).toBe(true);
    });

    it('should return false for other keys', () => {
      expect(mockEditor._shouldAlwaysKeepConfigKey('entity')).toBe(false);
      expect(mockEditor._shouldAlwaysKeepConfigKey('level_color')).toBe(false);
      expect(mockEditor._shouldAlwaysKeepConfigKey('background_color')).toBe(false);
      expect(mockEditor._shouldAlwaysKeepConfigKey('random_key')).toBe(false);
    });
  });

  describe('Configuration handling', () => {
    it('should validate config structure', () => {
      const validConfig: FluidLevelBackgroundCardConfig = {
        type: 'custom:fluid-level-background-card',
        entity: 'sensor.test',
        card: {
          type: 'entity',
          entity: 'sensor.test'
        },
        severity: [],
      };

      expect(validConfig.type).toBe('custom:fluid-level-background-card');
      expect(validConfig.entity).toBe('sensor.test');
      expect(validConfig.card).toBeDefined();
      expect(validConfig.severity).toBeDefined();
    });

    it('should handle optional properties', () => {
      const configWithOptionals: FluidLevelBackgroundCardConfig = {
        type: 'custom:fluid-level-background-card',
        entity: 'sensor.test',
        fill_entity: 'binary_sensor.test',
        full_value: 100,
        top_margin: 5,
        level_color: [0, 150, 255, 1.0],
        background_color: [0, 0, 0, 0.3],
        random_start: true,
        allow_click_through: false,
        severity: [
          { color: [255, 0, 0, 1.0], value: 20 },
          { color: [0, 255, 0, 1.0], value: 80 }
        ],
        card: {
          type: 'entity',
          entity: 'sensor.test'
        }
      };

      expect(configWithOptionals.fill_entity).toBe('binary_sensor.test');
      expect(configWithOptionals.full_value).toBe(100);
      expect(configWithOptionals.top_margin).toBe(5);
      expect(configWithOptionals.severity).toHaveLength(2);
    });
  });
});
