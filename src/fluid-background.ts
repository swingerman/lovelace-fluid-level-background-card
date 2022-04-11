import { css, html, LitElement, TemplateResult } from 'lit';
import { customElement, property } from 'lit-element';
import { FluidMeter, FluidMeterEnv } from './fliud-meter';
import { ElementSize } from './fluid-level-background-card';

@customElement('fluid-background')
export class FluidBackground extends LitElement {
  @property()
  haCard;

  @property()
  size!: ElementSize | null;

  @property()
  value!: number;

  fm = FluidMeter();

  protected render(): TemplateResult | void {
    return html` <div class="fluid-background"></div> `;
  }

  requestUpdate(name?: PropertyKey, oldValue?: unknown): void {
    if (name === 'value' || name === 'size') {
      this.updateSize();
      this.fm.setPercentage(this.value);
      super.requestUpdate(name, oldValue);
    }
  }

  private updateSize(): void {
    if (this.size && this.size.width && this.size.height) {
      this.fm.start();
      this.fm.resizeCanvas(this.size as ElementSize);
      return;
    }
    this.fm.stop();
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
    const env: FluidMeterEnv = {
      targetContainer: container,
      fillPercentage: this.value,
      options: {
        fontFamily: 'Raleway',
        drawPercentageSign: false,
        drawBubbles: true,
        drawShadow: false,
        drawText: false,
        size: Math.max(this.size?.width as number, this.size?.height as number),
        levelOffset: this.size ? Math.abs((this.size?.width as number) - this.size?.height) : 0,
        width: this.size?.width,
        height: this.size?.height,
        borderWidth: 0,
        backgroundColor: 'rgb(28, 28, 28)',
        foregroundColor: 'rgba(28, 28, 28,.5)',
        foregroundFluidLayer: {
          fillStyle: 'rgba(0, 128, 0,1)',
          angularSpeed: 100,
          maxAmplitude: 8,
          frequency: 30,
          horizontalSpeed: -75,
        },
        backgroundFluidLayer: {
          fillStyle: 'rgba(0, 128, 0,.3)',
          angularSpeed: 100,
          maxAmplitude: 6,
          frequency: 30,
          horizontalSpeed: 75,
        },
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
        border-radius: var(--ha-card-border-radius, 4px);
        overflow: hidden;
      }

      .fluid-background {
        background: var(--ha-card-background, var(--card-background-color, white));
      }
    `;
  }
}
