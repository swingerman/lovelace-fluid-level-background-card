import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getThemeColor } from '../../src/utils/theme-parser';

// Mock the DOM methods and elements
const mockAppendChild = vi.fn();
const mockRemove = vi.fn();
const mockGetPropertyValue = vi.fn();

const mockDiv = {
    style: { color: '' },
    remove: mockRemove,
};

const mockBody = {
    appendChild: mockAppendChild,
};

const mockFakeCard = {
    remove: mockRemove,
};

const mockDocument = {
    querySelector: vi.fn().mockReturnValue(mockBody),
    createElement: vi.fn((tag: string) => {
        if (tag === 'div') return mockDiv;
        if (tag === 'ha-card') return mockFakeCard;
        return mockDiv;
    }),
    body: mockBody,
};

const mockGetComputedStyle = vi.fn();

// Setup global mocks
Object.defineProperty(global, 'document', {
    value: mockDocument,
    writable: true,
});

Object.defineProperty(global, 'getComputedStyle', {
    value: mockGetComputedStyle,
    writable: true,
});

describe('Theme Parser', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetComputedStyle.mockReturnValue({
            getPropertyValue: mockGetPropertyValue,
            color: 'rgb(0, 0, 0)',
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getThemeColor', () => {
        it('should return parsed theme color when CSS variable is valid', () => {
            mockGetPropertyValue.mockReturnValue('rgb(255, 128, 0)');
            mockGetComputedStyle
                .mockReturnValueOnce({
                    getPropertyValue: mockGetPropertyValue,
                })
                .mockReturnValueOnce({
                    color: 'rgb(255, 128, 0)',
                });

            const result = getThemeColor('--primary-color', [0, 0, 0]);

            expect(mockDocument.querySelector).toHaveBeenCalledWith('body');
            expect(mockAppendChild).toHaveBeenCalledWith(mockFakeCard);
            expect(mockRemove).toHaveBeenCalled();
            expect(result).toEqual([255, 128, 0]);
        });

        it('should return default color when CSS variable is not found', () => {
            mockGetPropertyValue.mockReturnValue('');
            mockGetComputedStyle
                .mockReturnValueOnce({
                    getPropertyValue: mockGetPropertyValue,
                })
                .mockReturnValueOnce({
                    color: '',
                });

            const defaultColor = [100, 100, 100];
            const result = getThemeColor('--missing-color', defaultColor);

            expect(result).toBe(defaultColor);
        });

        it('should clean up DOM elements after color extraction', () => {
            mockGetPropertyValue.mockReturnValue('rgba(0, 0, 0, 1)');
            mockGetComputedStyle
                .mockReturnValueOnce({
                    getPropertyValue: mockGetPropertyValue,
                })
                .mockReturnValueOnce({
                    color: 'rgb(0, 0, 0)',
                });

            getThemeColor('--test-color', [255, 255, 255]);

            expect(mockRemove).toHaveBeenCalledTimes(2); // Both fake card and div should be removed
        });
    });
});
