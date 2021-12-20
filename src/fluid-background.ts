import { css, html, LitElement, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators';
import { FluidMeter, FluidMeterEnv } from './fliud-meter';
import { ElementSize } from './fluid-progressbar-card';

@customElement('fluid-background')
export class FluidBackground extends LitElement {
  @property()
  haCard;

  @property()
  size!: ElementSize;

  protected render(): TemplateResult | void {
    return html` <div id="fluid-background"></div> `;
  }

  static get styles() {
    return css`
      :host {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }

      #fluid-background {
        background: var(--ha-card-background, var(--card-background-color, white));
      }
    `;
  }

  protected firstUpdated(): void {
    window.setTimeout(() => {
      const fm = FluidMeter();
      const container = this.shadowRoot?.querySelector('#fluid-background');

      const env: FluidMeterEnv = {
        targetContainer: container,
        fillPercentage: 15,
        options: {
          fontFamily: 'Raleway',
          drawPercentageSign: false,
          drawBubbles: true,
          drawShadow: false,
          drawText: false,
          size: Math.max(this.size.widht, this.size.height),
          width: this.size.widht,
          height: this.size.height,
          borderWidth: 0,
          backgroundColor: 'rgb(28, 28, 28)',
          foregroundColor: '#fafafa',
          foregroundFluidLayer: {
            fillStyle: 'purple',
            angularSpeed: 100,
            maxAmplitude: 12,
            frequency: 30,
            horizontalSpeed: -150,
          },
          backgroundFluidLayer: {
            fillStyle: 'pink',
            angularSpeed: 100,
            maxAmplitude: 9,
            frequency: 30,
            horizontalSpeed: 150,
          },
        },
      };
      fm.init(env);
    }, 0);
  }
}
