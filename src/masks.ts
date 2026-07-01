// Built-in mask silhouettes. Filled (opaque) area = where the fluid shows;
// transparent area is clipped away. Hand-authored so there are no third-party assets.
// A mask_image config value is either one of these names or a raw image URL.
const SVG: Record<string, string> = {
  bottle:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140"><path fill="#000" d="M40 6 h20 v14 q0 6 5 11 l8 9 q7 8 7 19 v60 q0 9 -9 9 h-42 q-9 0 -9 -9 v-60 q0 -11 7 -19 l8 -9 q5 -5 5 -11 v-14 z"/></svg>',
  battery:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140"><g fill="#000"><rect x="38" y="6" width="24" height="12" rx="3"/><rect x="20" y="16" width="60" height="118" rx="12"/></g></svg>',
  droplet:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140"><path fill="#000" d="M50 8 C50 8 20 54 20 86 a30 30 0 1 0 60 0 C80 54 50 8 50 8 Z"/></svg>',
  tank: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140"><rect x="22" y="10" width="56" height="120" rx="28" fill="#000"/></svg>',
};

export const MASK_PRESETS = Object.keys(SVG);

// Encode the presets to data-URIs once at load; resolveMask then stays a pure lookup.
const PRESET_URIS: Record<string, string> = Object.fromEntries(
  Object.entries(SVG).map(([name, svg]) => [name, `data:image/svg+xml,${encodeURIComponent(svg)}`]),
);

// Preset name -> inline data-URI; anything else is returned as-is (treated as a URL).
export function resolveMask(value: string): string {
  return value ? (PRESET_URIS[value] ?? value) : '';
}
