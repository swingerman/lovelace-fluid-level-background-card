/**
 * Global setup for Vitest unit tests
 */
import { vi } from 'vitest';

// Mock Home Assistant globals
globalThis.customElements = {
  define: vi.fn(),
  get: vi.fn(),
  whenDefined: vi.fn(() => Promise.resolve()),
} as any;

// Mock window.customCards
globalThis.window = globalThis.window || {};
(globalThis.window as any).customCards = (globalThis.window as any).customCards || [];

// Mock loadCardHelpers
(globalThis.window as any).loadCardHelpers = vi.fn(() =>
  Promise.resolve({
    importMoreInfoControl: vi.fn(),
  })
);

// Mock console methods to reduce noise in tests
globalThis.console.warn = vi.fn();
globalThis.console.error = vi.fn();

// Setup ResizeObserver mock
globalThis.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Setup requestAnimationFrame mock
globalThis.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
globalThis.cancelAnimationFrame = vi.fn();

// Mock canvas context
const mockCanvasContext = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 100 })),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  arc: vi.fn(),
  arcTo: vi.fn(),
  ellipse: vi.fn(),
  rect: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  translate: vi.fn(),
  transform: vi.fn(),
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
} as any;

HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCanvasContext) as any;
