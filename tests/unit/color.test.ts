import { describe, it, expect } from 'vitest';
import { parseCssColor, rgbaToString } from '../../src/utils/color';

describe('Color Utilities', () => {
    describe('parseCssColor', () => {
        it('should parse RGB color correctly', () => {
            const result = parseCssColor('rgb(255, 128, 0)');
            expect(result).toEqual([255, 128, 0]);
        });

        it('should parse RGBA color correctly', () => {
            const result = parseCssColor('rgba(255, 128, 0, 0.5)');
            expect(result).toEqual([255, 128, 0, 0.5]);
        });

        it('should handle invalid color gracefully', () => {
            const result = parseCssColor('invalid-color');
            expect(result).toBeUndefined();
        });

        it('should handle empty string', () => {
            const result = parseCssColor('');
            expect(result).toBeUndefined();
        });

        it('should return array as-is when passed', () => {
            const color = [255, 128, 0, 1];
            const result = parseCssColor(color);
            expect(result).toBe(color);
        });
    });

    describe('rgbaToString', () => {
        it('should convert color array to RGBA string', () => {
            const result = rgbaToString([255, 128, 0], 0.8);
            expect(result).toBe('rgba(255, 128, 0, 0.8)');
        });

        it('should handle full opacity', () => {
            const result = rgbaToString([100, 50, 25], 1);
            expect(result).toBe('rgba(100, 50, 25, 1)');
        });
    });
});
