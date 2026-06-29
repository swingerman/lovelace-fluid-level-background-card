export function rgbaToString(color: number[], alpha: number): string {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

// Shared by the realistic renderers for the vertical depth gradient + sheen.
export const lighten = (color: number[], amount: number): number[] =>
  color.map((v) => Math.min(255, Math.round(v + amount)));

export const darken = (color: number[], factor: number): number[] => color.map((v) => Math.round(v * factor));

export const parseRgb = (style: string): number[] => {
  const m = style.match(/rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/);
  return m ? [+m[1], +m[2], +m[3]] : [0, 150, 255];
};

export function parseCssColor(colorToParse: string | number[]): number[] | undefined {
  if (typeof colorToParse !== 'string') {
    return colorToParse;
  }

  const div = document.createElement('div');
  document.body.appendChild(div);
  div.style.color = colorToParse;
  const res = getComputedStyle(div)
    .color.match(/[\.\d]+/g)
    ?.map(Number);
  div.remove();
  return res;
}
