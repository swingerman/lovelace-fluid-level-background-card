// TODO: create constants for required css variables

export function parseStyle(): void {
  // TODO: complete funciton
  getComputedStyle(document.querySelector('html') as HTMLElement).getPropertyValue('--primary-text-color');
}

export function getThemeBackgroundColor(): string {
  const body = document.querySelector('body') as HTMLElement;
  const fakeCard = document.createElement('ha-card');
  body.appendChild(fakeCard);
  const backgroundColor = getComputedStyle(fakeCard).getPropertyValue('--card-background-color');
  fakeCard.remove();
  return backgroundColor || '#ffffff';
}
