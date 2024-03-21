// TODO: create constants for required css variables

import { parseCssColor } from './color';

export function parseStyle(): void {
  // TODO: complete funciton
  getComputedStyle(document.querySelector('html') as HTMLElement).getPropertyValue('--primary-text-color');
}

export function getThemeColor(cssColorVariable: string, defaultColor: number[]): number[] {
  const body = document.querySelector('body') as HTMLElement;
  const fakeCard = document.createElement('ha-card');
  body.appendChild(fakeCard);
  const backgroundColorStr = getComputedStyle(fakeCard).getPropertyValue(cssColorVariable);
  const backgroundColor = parseCssColor(backgroundColorStr);
  fakeCard.remove();
  return backgroundColor || defaultColor;
}
