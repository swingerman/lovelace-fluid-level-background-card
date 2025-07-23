/* eslint-disable @typescript-eslint/no-unused-vars */
import { css, html, LitElement, TemplateResult } from 'lit';
import { ElementSize } from './fluid-level-background-card';
import { FluidMeterEnv } from './fluid-meter.interface';
import { FluidMeter } from './fliud-meter';
import { rgbaToString } from './utils/color';
import { BACKGROUND_COLOR, LEVEL_COLOR } from './const';
import { customElement, property } from 'lit/decorators.js';

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

  fm = FluidMeter();

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

    if (name === 'topMargin') {
      // Reinitialize the fluid meter with new top margin
      const container = this.shadowRoot?.querySelector('.fluid-background');
      if (container) {
        this.fm.stop();
        this.initFluidMeter(container);
      }
    }
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
    window.setTimeout(() => {
      const container = this.shadowRoot?.querySelector('.fluid-background');
      if (container) {
        this.initFluidMeter(container);
      }
    }, 0);
  }

  private initFluidMeter(container: Element): void {
    const maxSize = Math.max(this.size?.width as number, this.size?.height as number);
    const alpha = this.levelColor.length > 3 ? this.levelColor[3] : 1;
    const backgroundAlpha = alpha * 0.3;

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
        foregroundFluidLayer: {
          fillStyle: rgbaToString(this.levelColor, backgroundAlpha),
          angularSpeed: 100,
          maxAmplitude: 8,
          frequency: 30,
          horizontalSpeed: -75,
        },
        backgroundFluidLayer: {
          fillStyle: rgbaToString(this.levelColor, backgroundAlpha),
          angularSpeed: 100,
          maxAmplitude: 6,
          frequency: 30,
          horizontalSpeed: 75,
        },
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fluid-background': FluidBackground;
  }
}
