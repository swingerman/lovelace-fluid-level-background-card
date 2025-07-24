import { describe, it, expect } from 'vitest';
import {
    LEVEL_COLOR,
    BACKGROUND_COLOR,
    THEME_BACKGROUND_COLOR_VARIABLE,
    THEME_PRIMARY_COLOR_VARIABLE,
    FULL_VALUE
} from '../../src/const';

describe('Constants', () => {
    it('should export default colors', () => {
        expect(LEVEL_COLOR).toEqual([0, 128, 0]);
        expect(BACKGROUND_COLOR).toEqual([28, 28, 28]);
    });

    it('should export theme variable names', () => {
        expect(THEME_BACKGROUND_COLOR_VARIABLE).toBe('--primary-background-color');
        expect(THEME_PRIMARY_COLOR_VARIABLE).toBe('--primary-color');
    });

    it('should export full value constant', () => {
        expect(FULL_VALUE).toBe(100);
    });
});
