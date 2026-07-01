/* eslint-disable @typescript-eslint/no-unused-vars */
import { css, html, LitElement, TemplateResult } from 'lit';
import { ElementSize } from './fluid-level-background-card';
import { FluidMeterEnv, FluidMeterInstance, Layer } from './fluid-meter.interface';
import { FluidMeter } from './fliud-meter';
import { RealisticMeter } from './realistic-meter';
import { RealisticMorphMeter } from './realistic-morph-meter';
import { rgbaToString } from './utils/color';
import { clamp } from './utils/clamp';
import { BACKGROUND_COLOR, LEVEL_COLOR } from './const';
import { customElement, property } from 'lit/decorators.js';

// Slider value that maps to the default wave look; multiplier = value / WAVE_NEUTRAL.
const WAVE_NEUTRAL = 50;

type WaveParams = Pick<Layer, 'angularSpeed' | 'maxAmplitude' | 'horizontalSpeed'>;

@customElement('fluid-background')
export class FluidBackground extends LitElement {
  @property()
  haCard;

  @property({ type: Object })
  size!: ElementSize | null;

  @property({ type: Number })
  value!: number;

  @property({ type: Array })
  backgroundColor = BACKGROUND_COLOR;

  @property({ type: Array })
  levelColor = LEVEL_COLOR;

  @property({ type: Boolean })
  filling = false;

  @property({ type: Boolean })
  randomStart = false;

  @property({ type: Number })
  topMargin = 0;

  // 0-100 sliders, WAVE_NEUTRAL = current default look. multiplier = value / WAVE_NEUTRAL (0..2x)
  @property({ type: Number })
  waveHeight = WAVE_NEUTRAL;

  @property({ type: Number })
  waveSpeed = WAVE_NEUTRAL;

  // classic = original; realistic = per-frame morphing waves; realistic-performance = cheap strip.
  @property()
  waveStyle: 'classic' | 'realistic' | 'realistic-performance' = 'classic';

  // Fully-resolved mask: a data-URI or image URL (the card does preset/media-source resolution).
  // Empty = no mask.
  @property()
  maskImage = '';

  // CSS mask-size: contain (default) | cover | '100% 100%' (stretch) | any CSS value.
  @property()
  maskSize = 'contain';

  fm: FluidMeterInstance = FluidMeter();

  protected render(): TemplateResult | void {
    return html` <div class="fluid-background"></div> `;
  }

  requestUpdate(name?: PropertyKey, oldValue?: unknown): void {
    if (name === 'value') {
      this.fm.setPercentage(this.value);
      super.requestUpdate(name, oldValue);
    }

    if (name === 'size') {
      if (
        (oldValue as ElementSize)?.width !== this.size?.width ||
        (oldValue as ElementSize)?.height !== this.size?.height
      ) {
        this.updateSize();
      }
    }

    if (name === 'backgroundColor') {
      this.setBackgroundColor(this.backgroundColor);
    }

    if (name === 'levelColor') {
      this.setLevelColor(this.levelColor);
    }

    if (name === 'filling') {
      this.setBubbles(this.filling);
    }

    if (name === 'randomStart') {
      this.setRandomStart(this.randomStart);
    }

    if (name === 'waveHeight' || name === 'waveSpeed') {
      this.setWaveLayers();
    }

    if (name === 'topMargin') {
      this.setTopMargin(this.topMargin);
    }

    // Switching renderers needs a fresh meter + clean container.
    if (name === 'waveStyle') {
      this.rebuildMeter();
    }

    if (name === 'maskImage' || name === 'maskSize') {
      this.applyMask();
    }
  }

  // CSS mask clips the painted canvas to the image's alpha shape. Native, no JS per frame.
  private applyMask(): void {
    const container = this.shadowRoot?.querySelector('.fluid-background') as HTMLElement | null;
    if (!container) {
      return;
    }
    const value = this.maskImage ? `url("${this.maskImage}")` : '';
    const size = this.maskSize || 'contain';
    // -webkit- prefixes via setProperty (the camelCase DOM props are deprecated) for Safari/older WebKit.
    container.style.setProperty('-webkit-mask-image', value);
    container.style.maskImage = value;
    container.style.setProperty('-webkit-mask-size', size);
    container.style.maskSize = size;
  }

  private rebuildMeter(): void {
    const container = this.shadowRoot?.querySelector('.fluid-background');
    if (!container) {
      return;
    }
    this.fm.stop();
    container.replaceChildren();
    this.initFluidMeter(container);
    this.applyMask();
  }

  // The setters below guard this.fm: field initializers fire requestUpdate during construction,
  // before fm is set. Initial values are applied in initFluidMeter; these only handle later changes.
  private setWaveLayers(): void {
    if (this.fm) {
      const { fg, bg } = this.waveLayers();
      this.fm.setWaveOptions(fg, bg);
    }
  }

  private setTopMargin(topMargin: number): void {
    if (this.fm) {
      this.fm.setTopMargin(topMargin);
    }
  }

  // Base wave params at WAVE_NEUTRAL, scaled by the slider values (clamped so YAML can't blow them up).
  private waveLayers(): { fg: WaveParams; bg: WaveParams } {
    const h = clamp(this.waveHeight, 0, 100) / WAVE_NEUTRAL;
    const s = clamp(this.waveSpeed, 0, 100) / WAVE_NEUTRAL;
    return {
      fg: { angularSpeed: 100 * s, maxAmplitude: 8 * h, horizontalSpeed: -75 * s },
      bg: { angularSpeed: 100 * s, maxAmplitude: 6 * h, horizontalSpeed: 75 * s },
    };
  }

  private setRandomStart(randomStart: boolean): void {
    if (this.fm) {
      this.fm.start(randomStart);
    }
  }

  private setBubbles(filling: boolean): void {
    if (this.fm) {
      this.fm.setDrawBubbles(filling);
    }
  }

  private setBackgroundColor(backgroundColor: number[]): void {
    if (this.fm && backgroundColor) {
      this.fm.setBackGroundColor(backgroundColor);
    }
  }

  private setLevelColor(levelColor: number[]): void {
    if (this.fm && levelColor) {
      this.fm.setLevelColor(levelColor);
    }
  }

  private updateSize(): void {
    if (this.size && this.size.width && this.size.height) {
      this.fm.resizeCanvas(this.size as ElementSize);
      return;
    }
  }

  protected firstUpdated(): void {
    // Go through rebuildMeter (which clears first) so an early waveStyle change can't leave
    // a second meter + canvas stacked on top.
    window.setTimeout(() => this.rebuildMeter(), 0);
  }

  private initFluidMeter(container: Element): void {
    this.fm =
      this.waveStyle === 'realistic'
        ? RealisticMorphMeter()
        : this.waveStyle === 'realistic-performance'
          ? RealisticMeter()
          : FluidMeter();
    const maxSize = Math.max(this.size?.width as number, this.size?.height as number);
    const alpha = this.levelColor.length > 3 ? this.levelColor[3] : 1;
    const backgroundAlpha = alpha * 0.3;
    const fillStyle = rgbaToString(this.levelColor, backgroundAlpha);
    const { fg, bg } = this.waveLayers();

    const env: FluidMeterEnv = {
      targetContainer: container,
      fillPercentage: this.value,
      options: {
        fontFamily: 'Raleway',
        drawPercentageSign: false,
        drawBubbles: this.filling,
        drawShadow: false,
        drawText: false,
        size: maxSize,
        levelOffset: 0,
        width: this.size?.width,
        height: this.size?.height,
        borderWidth: 0,
        backgroundColor: rgbaToString(this.backgroundColor, alpha),
        foregroundColor: 'rgba(28, 28, 28,.5)',
        foregroundFluidLayer: { fillStyle, frequency: 30, ...fg },
        backgroundFluidLayer: { fillStyle, frequency: 30, ...bg },
        randomStart: this.randomStart,
        top_margin: this.topMargin,
      },
    };
    this.fm.init(env);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  static get styles() {
    return css`
      :host {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }
      .fluid-background {
        width: 100%;
        height: 100%;
        /* mask-image + mask-size are set inline; these stay constant */
        -webkit-mask-repeat: no-repeat;
        -webkit-mask-position: center;
        mask-repeat: no-repeat;
        mask-position: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fluid-background': FluidBackground;
  }
}
