/**
 * Convert a number (0-100) to a color using HSL
 * Red = high values, Green = low values
 */
export function numberToColorHsl(i: number): string {
  // as the function expects a value between 0 and 100, and red = 100° and green = 0°
  // we convert the input to the appropriate hue value
  const hue = ((100 - i) * 1.2) / 360;
  // we convert hsl to rgb (saturation 100%, lightness 50%)
  const rgb = hslToRgb(hue, 0.9, 0.4);
  // we format to css value and return
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number;
  let g: number;
  let b: number;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

/**
 * Format duration in milliseconds
 */
export function formatDuration(ms: number | undefined): string {
  if (ms === undefined || isNaN(ms)) return "N/A";
  if (ms < 1) return `${ms.toFixed(3)} ms`;
  if (ms < 1000) return `${ms.toFixed(2)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/**
 * Format rows count
 */
export function formatRows(rows: number | undefined): string {
  if (rows === undefined || isNaN(rows)) return "N/A";
  if (rows < 1000) return rows.toFixed(0);
  if (rows < 1000000) return `${(rows / 1000).toFixed(1)}K`;
  if (rows < 1000000000) return `${(rows / 1000000).toFixed(1)}M`;
  return `${(rows / 1000000000).toFixed(1)}B`;
}

/**
 * Format cost
 */
export function formatCost(cost: number | undefined): string {
  if (cost === undefined || isNaN(cost)) return "N/A";
  if (cost < 1000) return cost.toFixed(2);
  if (cost < 1000000) return `${(cost / 1000).toFixed(1)}K`;
  return `${(cost / 1000000).toFixed(1)}M`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number | undefined): string {
  if (value === undefined || isNaN(value)) return "N/A";
  return `${value.toFixed(1)}%`;
}
