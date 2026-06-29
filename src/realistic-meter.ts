import { ElementSize } from './fluid-level-background-card';
import { FluidMeterInstance, FluidMeterEnv, Layer } from './fluid-meter.interface';
import { rgbaToString, lighten, darken, parseRgb } from './utils/color';
import { clamp } from './utils/clamp';
import { createBubbles } from './bubbles';

// Realistic wave renderer using the "canvas-strip" model: the wave (with surface detail)
// is drawn to a 2×-width bitmap ONCE, then scrolled via a CSS transform — no per-frame
// redraw. Benchmarked as the cheapest option that holds 60fps at scale. Implements
// FluidMeterInstance so it drops in wherever FluidMeter() does. (The "performance" wave style.)
//
// ponytail: level changes snap (no fill tween). Bubbles, when filling, animate on a small
// overlay canvas — the only per-frame work, and only while filling.

// canvases are 200% wide → translateX(-50%) shifts exactly one width: a seamless loop.
// Lives on the host so it sits in the same shadow root as the canvases (@keyframes are
// tree-scoped; keyframes in document.head are invisible inside a shadow root).
const KEYFRAMES =
  '@keyframes rm-scroll-a{from{transform:translateX(0)}to{transform:translateX(-50%)}}' +
  '@keyframes rm-scroll-b{from{transform:translateX(-50%)}to{transform:translateX(0)}}';

// Stroke a wave path along x using the given y(px) function.
function strokeWave(ctx: CanvasRenderingContext2D, w2: number, y: (px: number) => number): void {
  ctx.beginPath();
  ctx.moveTo(0, y(0));
  for (let px = 1; px <= w2; px++) ctx.lineTo(px, y(px));
  ctx.stroke();
}

export function RealisticMeter(): FluidMeterInstance {
  let host: HTMLDivElement | null = null;
  let back: HTMLCanvasElement | null = null;
  let front: HTMLCanvasElement | null = null;

  // Bubbles animate on a separate overlay canvas, only while filling.
  let filling = false;
  let bubbleCanvas: HTMLCanvasElement | null = null;
  let bubbleCtx: CanvasRenderingContext2D | null = null;
  let bubbleRaf = 0;
  let bubbleLast = 0;
  const bubbles = createBubbles();

  let width = 300;
  let height = 120;
  let fillPercentage = 0;
  let topMargin = 0;
  // All wave params come from the same Layer options the card feeds the classic renderer,
  // so both styles share every control (height, speed, wavelength, colours).
  // The classic amplitude oscillates 0..max (avg ≈ 2/π); use that average so a steady
  // strip reads at the same height as classic at the same wave_height.
  const AMP_AVG = 0.64;
  let frontAmp = 8 * AMP_AVG;
  let backAmp = 6 * AMP_AVG;
  let frontSpeed = 75; // px/s, |horizontalSpeed|; matches classic
  let backSpeed = 75;
  let frequency = 30; // classic wave frequency → wavelength ≈ 2π·frequency
  // Translucent layer fills, taken from / mirrored on the classic renderer so the
  // foreground/background opacity blend (the depth) matches the classic look exactly.
  let frontStyle = 'rgba(0,150,255,0.3)';
  let backStyle = 'rgba(0,150,255,0.3)';
  let levelRgb = [0, 150, 255]; // drives the vertical depth gradient on the front layer

  function fluidTop(): number {
    const topMarginPx = (topMargin / 100) * height;
    const usable = height - topMarginPx;
    return height - (clamp(fillPercentage, 0, 100) / 100) * usable;
  }

  // edgeFactor (0..1) tapers the chop to flat as the tank nears empty/full — matches the
  // morph renderer so both Realistic styles look the same.
  function drawStrip(
    canvas: HTMLCanvasElement,
    amp: number,
    fill: string,
    detail: boolean,
    edgeFactor: number,
    extraCycles = 0,
  ): void {
    const w2 = 2 * width;
    canvas.width = w2;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w2, height);

    const a = amp * edgeFactor;
    const baseY = fluidTop();
    // Match the classic wavelength (≈ 2π·frequency), snapped to a whole number of cycles
    // across one width so the pattern lines up seamlessly when scrolled by a width.
    // extraCycles detunes a layer: two layers with a 1-cycle difference scrolling at the
    // same speed beat against each other → the surface appears to rise and dip (fake morph).
    const wavelength = 2 * Math.PI * frequency;
    const cycles = Math.max(1, Math.round(width / wavelength) + extraCycles);
    const k = (2 * Math.PI * cycles) / width;
    const waveY = (px: number): number => baseY + a * Math.sin(px * k);

    ctx.beginPath();
    ctx.moveTo(0, waveY(0));
    for (let px = 1; px <= w2; px++) ctx.lineTo(px, waveY(px));
    ctx.lineTo(w2, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    if (detail) {
      // Vertical depth gradient: lighter at the surface, darker deep — reads as liquid.
      const g = ctx.createLinearGradient(0, baseY - Math.abs(a) - 2, 0, height);
      g.addColorStop(0, rgbaToString(lighten(levelRgb, 55), 0.85));
      g.addColorStop(1, rgbaToString(darken(levelRgb, 0.55), 0.92));
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = fill;
    }
    ctx.fill();

    if (!detail) return;
    // A faint sheen right on the surface line — a hint of light, not a hard edge.
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    strokeWave(ctx, w2, (px) => waveY(px));
  }

  function render(): void {
    if (!front || !back || !host) return;
    host.style.width = `${width}px`;
    host.style.height = `${height}px`;
    const edge = Math.sin(Math.PI * clamp(fillPercentage / 100, 0, 1)); // flatten near empty/full
    drawStrip(back, backAmp, backStyle, false, edge, 1); // detuned → beats with the front
    drawStrip(front, frontAmp, frontStyle, true, edge);
    // Duration = width / speed → same px/s scroll as classic, independent of card width.
    front.style.animationDuration = `${(width / Math.max(frontSpeed, 1)).toFixed(2)}s`;
    back.style.animationDuration = `${(width / Math.max(backSpeed, 1)).toFixed(2)}s`;
  }

  function mkCanvas(animation: string): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.style.cssText = `position:absolute;top:0;left:0;width:200%;height:100%;${animation}`;
    return c;
  }

  function startBubbles(): void {
    if (!host || bubbleRaf) return;
    if (!bubbleCanvas) {
      bubbleCanvas = document.createElement('canvas');
      bubbleCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
      host.appendChild(bubbleCanvas);
    }
    bubbleCanvas.width = width;
    bubbleCanvas.height = height;
    bubbleCtx = bubbleCanvas.getContext('2d');
    bubbles.resize(width, height);
    bubbleLast = 0;
    const loop = (now: number): void => {
      if (!filling || !bubbleCtx) {
        bubbleRaf = 0;
        return;
      }
      const dt = (now - (bubbleLast || now)) / 1000;
      bubbleLast = now;
      const top = fluidTop();
      bubbleCtx.clearRect(0, 0, width, height);
      bubbles.step(dt, top, height);
      bubbles.draw(bubbleCtx, top, height);
      bubbleRaf = requestAnimationFrame(loop);
    };
    bubbleRaf = requestAnimationFrame(loop);
  }

  function stopBubbles(): void {
    if (bubbleRaf) cancelAnimationFrame(bubbleRaf);
    bubbleRaf = 0;
    if (bubbleCtx) bubbleCtx.clearRect(0, 0, width, height);
  }

  return {
    init(env: FluidMeterEnv) {
      if (!env.targetContainer) {
        throw new Error('empty or invalid container');
      }
      const o = env.options;
      width = o.width ?? 300;
      height = o.height ?? 120;
      fillPercentage = clamp(env.fillPercentage, 0, 100);
      topMargin = o.top_margin ?? 0;
      this.setWaveOptions(o.foregroundFluidLayer ?? {}, o.backgroundFluidLayer ?? {});
      // Take the same translucent fills the card hands the classic renderer.
      frontStyle = o.foregroundFluidLayer?.fillStyle || frontStyle;
      backStyle = o.backgroundFluidLayer?.fillStyle || backStyle;
      levelRgb = parseRgb(frontStyle);

      host = document.createElement('div');
      host.style.cssText = 'position:absolute;top:0;left:0;overflow:hidden;';
      host.style.background = o.backgroundColor || 'transparent';
      const keyframes = document.createElement('style');
      keyframes.textContent = KEYFRAMES;
      host.appendChild(keyframes);
      back = mkCanvas('animation:rm-scroll-b linear infinite;');
      front = mkCanvas('animation:rm-scroll-a linear infinite;');
      host.appendChild(back);
      host.appendChild(front);
      env.targetContainer.appendChild(host);

      render();
      this.start(o.randomStart);
      if (o.drawBubbles === true) {
        filling = true;
        startBubbles();
      }
    },
    setPercentage(percentage: number) {
      fillPercentage = clamp(percentage, 0, 100);
      render();
    },
    setDrawBubbles(draw: boolean) {
      filling = draw;
      if (draw) startBubbles();
      else stopBubbles();
    },
    setColor(foregroundColor: string, backgroundColor: string) {
      frontStyle = foregroundColor;
      backStyle = backgroundColor;
      levelRgb = parseRgb(foregroundColor);
      render();
    },
    setBackGroundColor(backgroundColor: number[]) {
      if (host && backgroundColor.length >= 3) {
        const alpha = backgroundColor.length > 3 ? backgroundColor[3] : 1;
        host.style.background = rgbaToString(backgroundColor, alpha);
      }
    },
    setLevelColor(levelColor: number[]) {
      if (levelColor.length < 3) return;
      // Same split the classic renderer uses: solid front, translucent (0.3) back.
      const alpha = levelColor.length > 3 ? levelColor[3] : 1;
      levelRgb = levelColor.slice(0, 3);
      frontStyle = rgbaToString(levelColor, alpha);
      backStyle = rgbaToString(levelColor, alpha * 0.3);
      render();
    },
    setWaveOptions(foregroundLayer: Partial<Layer>, backgroundLayer: Partial<Layer>) {
      if (foregroundLayer.maxAmplitude != null) frontAmp = foregroundLayer.maxAmplitude * AMP_AVG;
      if (backgroundLayer.maxAmplitude != null) backAmp = backgroundLayer.maxAmplitude * AMP_AVG;
      if (foregroundLayer.horizontalSpeed != null) frontSpeed = Math.abs(foregroundLayer.horizontalSpeed);
      if (backgroundLayer.horizontalSpeed != null) backSpeed = Math.abs(backgroundLayer.horizontalSpeed);
      if (foregroundLayer.frequency != null) frequency = foregroundLayer.frequency;
      render();
    },
    setTopMargin(margin: number) {
      topMargin = margin;
      render();
    },
    resizeCanvas(size: ElementSize) {
      width = size.width;
      height = size.height;
      if (bubbleCanvas) {
        bubbleCanvas.width = width;
        bubbleCanvas.height = height;
        bubbles.resize(width, height);
      }
      render();
    },
    stop() {
      if (front) front.style.animationPlayState = 'paused';
      if (back) back.style.animationPlayState = 'paused';
      stopBubbles();
    },
    start(randomStart = false) {
      const delay = randomStart ? `-${(Math.random() * 4).toFixed(2)}s` : '0s';
      [front, back].forEach((c) => {
        if (!c) return;
        c.style.animationPlayState = 'running';
        c.style.animationDelay = delay;
      });
      if (filling) startBubbles();
    },
  };
}
