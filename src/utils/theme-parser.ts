// TODO: create constants for required css variables

export function parseStyle(): void {
  // TODO: complete funciton
  getComputedStyle(document.querySelector('html') as HTMLElement).getPropertyValue('--primary-text-color');
}
