import { css, html, LitElement, TemplateResult } from 'lit';
import { customElement, property } from 'lit-element';
import { ElementSize } from './fluid-level-background-card';
import { FluidMeterEnv } from './fluid-meter.interface';
import { FluidMeter } from './fliud-meter';

@customElement('fluid-background')
export class FluidBackground extends LitElement {
  @property()
  haCard;

  @property({ type: Object })
  size!: ElementSize | null;

  @property({ type: Number })
  value!: number;

  @property({ type: String })
  backgroundColor = 'rgb(28, 28, 28)';

  @property({ type: Boolean, attribute: false })
  filling = false;

  fm = FluidMeter();

  private _previuosvValue = this.value;

  protected render(): TemplateResult | void {
    return html` <div class="fluid-background"></div> `;
  }

  requestUpdate(name?: PropertyKey, oldValue?: unknown): void {
    if (name === 'value') {
      this.fm.setPercentage(this.value);
      super.requestUpdate(name, oldValue);

      this.filling = this.value > this._previuosvValue;
      this._previuosvValue = this.value;
    }

    if (name === 'size') {
      this.updateSize();
      this.fm.setPercentage(this.value);
      super.requestUpdate(name, oldValue);
    }

    if (name === 'backgroundColor') {
      this.setBackgroundcolor(this.backgroundColor);
    }

    if (name === 'filling') {
      this.setBubbles(this.filling);
    }
  }

  private setBubbles(filling: boolean): void {
    if (this.fm) {
      this.fm.setDrawBubbles(filling);
      this.fm.start();
    }
  }

  private setBackgroundcolor(backgroundColor: string): void {
    if (this.fm) {
      this.fm.setBackGroundColor(backgroundColor);
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
        drawBubbles: this.filling,
        drawShadow: false,
        drawText: false,
        size: Math.max(this.size?.width as number, this.size?.height as number),
        levelOffset: this.size ? Math.abs((this.size?.width as number) - this.size?.height) : 0,
        width: this.size?.width,
        height: this.size?.height,
        borderWidth: 0,
        backgroundColor: this.backgroundColor,
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
    `;
  }
}
