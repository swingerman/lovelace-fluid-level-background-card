// TODO: create constants for required css variables

import { BACKGROUND_COLOR } from '../const';
import { hexToRgb } from './color';

export function parseStyle(): void {
  // TODO: complete funciton
  getComputedStyle(document.querySelector('html') as HTMLElement).getPropertyValue('--primary-text-color');
}

export function getThemeBackgroundColor(): number[] {
  const body = document.querySelector('body') as HTMLElement;
  const fakeCard = document.createElement('ha-card');
  body.appendChild(fakeCard);
  const backgroundColorStr = getComputedStyle(fakeCard).getPropertyValue('--card-background-color');
  const backgroundColor = hexToRgb(backgroundColorStr);
  const backgroundColorArray = backgroundColor ? [backgroundColor.r, backgroundColor.g, backgroundColor.b] : undefined;
  fakeCard.remove();
  return backgroundColorArray || BACKGROUND_COLOR;
}
