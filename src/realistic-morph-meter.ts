import { ElementSize } from './fluid-level-background-card';
import { FluidMeterInstance, FluidMeterEnv, Layer } from './fluid-meter.interface';
import { rgbaToString, lighten, darken, parseRgb } from './utils/color';
import { clamp } from './utils/clamp';
import { rand } from './utils/random';
import { createBubbles } from './bubbles';

// Per-frame realistic renderer. Like the classic engine, each layer's amplitude oscillates
// (amp = max·sin(angle)) so the waves flatten and invert as well as scroll — the "morphing"
// motion — plus a faint surface sheen on the front layer. Redraws every frame (30fps cap),
// so it costs more than the strip renderer; best for a handful of cards.

interface MorphLayer {
  maxAmp: number;
  angle: number; // degrees — amplitude = maxAmp·sin(angle)
  angularSpeed: number; // deg/s, drives the morph
  hpos: number;
  hspeed: number; // px/s, horizontal scroll
  frequency: number;
  style: string;
}

export function RealisticMorphMeter(): FluidMeterInstance {
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let width = 300;
  let height = 120;
  let fillPercentage = 0;
  let topMargin = 0;
  let bgStyle = 'transparent';
  let levelRgb = [0, 150, 255]; // drives the body gradient (depth) + sheen
  let filling = false;
  const bubbles = createBubbles();
  let stopped = false;
  let lastTime = 0;
  let then = 0;
  let raf = 0;
  const fpsInterval = 1000 / 30;

  // Start the two layers a quarter-cycle apart so their morphs don't peak in sync.
  const fg: MorphLayer = {
    maxAmp: 8,
    angle: 0,
    angularSpeed: 100,
    hpos: 0,
    hspeed: -75,
    frequency: 30,
    style: 'rgba(0,150,255,0.9)',
  };
  const bg: MorphLayer = {
    maxAmp: 6,
    angle: 90,
    angularSpeed: 100,
    hpos: 0,
    hspeed: 75,
    frequency: 30,
    style: 'rgba(0,150,255,0.3)',
  };

  function fluidTop(): number {
    const topMarginPx = (topMargin / 100) * height;
    const usable = height - topMarginPx;
    return height - (clamp(fillPercentage, 0, 100) / 100) * usable;
  }

  function advance(layer: MorphLayer, dt: number): void {
    layer.angle = (layer.angle + layer.angularSpeed * dt) % 360;
    layer.hpos += layer.hspeed * dt;
  }

  function wavePath(y: (x: number) => number): void {
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(0, y(0));
    for (let x = 1; x <= width; x++) ctx.lineTo(x, y(x));
  }

  // edgeFactor (0..1) tapers the chop to flat as the tank nears empty/full.
  function drawLayer(layer: MorphLayer, baseY: number, detail: boolean, edgeFactor: number): void {
    if (!ctx) return;
    const amplitude = layer.maxAmp * Math.sin((layer.angle * Math.PI) / 180) * edgeFactor;
    const y = (x: number): number => baseY + amplitude * Math.sin((x + layer.hpos) / layer.frequency);

    // body
    wavePath(y);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    if (detail) {
      // Vertical depth gradient: lighter at the surface, darker deep — reads as liquid, not paint.
      const g = ctx.createLinearGradient(0, baseY - Math.abs(amplitude) - 2, 0, height);
      g.addColorStop(0, rgbaToString(lighten(levelRgb, 55), 0.85));
      g.addColorStop(1, rgbaToString(darken(levelRgb, 0.55), 0.92));
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = layer.style; // translucent back layer
    }
    ctx.fill();
    if (!detail) return;

    // Soft surface glint: white, faded at the left/right edges, slightly blurred — a sheen, not a line.
    ctx.save();
    const hl = ctx.createLinearGradient(0, 0, width, 0);
    hl.addColorStop(0, 'rgba(255,255,255,0)');
    hl.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    hl.addColorStop(0.65, 'rgba(255,255,255,0.2)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = hl;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 3;
    ctx.shadowColor = 'rgba(255,255,255,0.4)';
    wavePath(y);
    ctx.stroke();
    ctx.restore();
  }

  function draw(now: number): void {
    if (stopped) return;
    const elapsed = now - then;
    if (elapsed > fpsInterval) {
      const dt = (now - (lastTime || now)) / 1000;
      lastTime = now;
      then = now - (elapsed % fpsInterval);
      advance(fg, dt);
      advance(bg, dt);
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        if (bgStyle !== 'transparent') {
          ctx.fillStyle = bgStyle;
          ctx.fillRect(0, 0, width, height);
        }
        const baseY = fluidTop();
        const edge = Math.sin(Math.PI * clamp(fillPercentage / 100, 0, 1)); // 0 at empty/full, 1 mid
        drawLayer(bg, baseY, false, edge);
        drawLayer(fg, baseY, true, edge);
        if (filling) {
          bubbles.step(dt, baseY, height);
          bubbles.draw(ctx, baseY, height);
        }
      }
    }
    raf = requestAnimationFrame(draw);
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
      bgStyle = o.backgroundColor || 'transparent';
      filling = o.drawBubbles === true;
      bubbles.resize(width, height);
      this.setWaveOptions(o.foregroundFluidLayer ?? {}, o.backgroundFluidLayer ?? {});
      fg.style = o.foregroundFluidLayer?.fillStyle || fg.style;
      bg.style = o.backgroundFluidLayer?.fillStyle || bg.style;
      levelRgb = parseRgb(fg.style);

      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.style.cssText = 'position:absolute;top:0;left:0;';
      env.targetContainer.appendChild(canvas);
      ctx = canvas.getContext('2d');
      this.start(o.randomStart);
    },
    setPercentage(percentage: number) {
      fillPercentage = clamp(percentage, 0, 100);
    },
    setDrawBubbles(draw: boolean) {
      filling = draw;
    },
    setColor(foregroundColor: string, backgroundColor: string) {
      fg.style = foregroundColor;
      bg.style = backgroundColor;
      levelRgb = parseRgb(foregroundColor);
    },
    setBackGroundColor(backgroundColor: number[]) {
      if (backgroundColor.length >= 3) {
        const alpha = backgroundColor.length > 3 ? backgroundColor[3] : 1;
        bgStyle = rgbaToString(backgroundColor, alpha);
      }
    },
    setLevelColor(levelColor: number[]) {
      if (levelColor.length < 3) return;
      const alpha = levelColor.length > 3 ? levelColor[3] : 1;
      levelRgb = levelColor.slice(0, 3);
      fg.style = rgbaToString(levelColor, alpha);
      bg.style = rgbaToString(levelColor, alpha * 0.3);
    },
    setWaveOptions(foregroundLayer: Partial<Layer>, backgroundLayer: Partial<Layer>) {
      const apply = (layer: MorphLayer, opt: Partial<Layer>): void => {
        if (opt.maxAmplitude != null) layer.maxAmp = opt.maxAmplitude;
        if (opt.angularSpeed != null) layer.angularSpeed = opt.angularSpeed;
        if (opt.horizontalSpeed != null) layer.hspeed = opt.horizontalSpeed;
        if (opt.frequency != null) layer.frequency = opt.frequency;
      };
      apply(fg, foregroundLayer);
      apply(bg, backgroundLayer);
    },
    setTopMargin(margin: number) {
      topMargin = margin;
    },
    resizeCanvas(size: ElementSize) {
      width = size.width;
      height = size.height;
      bubbles.resize(width, height);
      if (canvas) {
        canvas.width = width;
        canvas.height = height;
        ctx = canvas.getContext('2d');
      }
    },
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
    },
    start(randomStart = false) {
      stopped = false;
      then = 0;
      lastTime = 0;
      if (randomStart) {
        fg.angle = rand() * 360;
        bg.angle = rand() * 360;
      }
      raf = requestAnimationFrame(draw);
    },
  };
}
