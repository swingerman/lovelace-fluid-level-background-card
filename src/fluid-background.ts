import { html, LitElement, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators';

@customElement('fluid-background')
export class FluidBackground extends LitElement {
  @property()
  haCard;

  protected render(): TemplateResult | void {
    return html` <div class="fluid-background">${this.haCard}</div> `;
  }
}
