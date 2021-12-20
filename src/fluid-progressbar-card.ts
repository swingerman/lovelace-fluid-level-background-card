/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, css, PropertyValues, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import {
  HomeAssistant,
  hasConfigOrEntityChanged,
  hasAction,
  ActionHandlerEvent,
  handleAction,
  LovelaceCardEditor,
  getLovelace,
} from 'custom-card-helpers'; // This is a community maintained npm module with common helper functions/types. https://github.com/custom-cards/custom-card-helpers

import './editor';
import './fluid-background';

import type { FluidProgressBarCardConfig } from './types';
import { actionHandler } from './action-handler-directive';
import { CARD_VERSION } from './const';
import { localize } from './localize/localize';

/* eslint no-console: 0 */
console.info(
  `%c  fluid-progressbar-card \n%c  ${localize('common.version')} ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

// This puts your card into the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'fluid-progressbar-card',
  name: 'Fluid Progress Bar Card',
  description: 'A card that has a fluid progress bar as a background',
});

export interface ElementSize {
  widht: number;
  height: number;
}

@customElement('fluid-progressbar-card')
export class FluidProgressBarCard extends LitElement {
  //size: ElementSize = { widht: 0, height: 0 };

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('fluid-progressbar-card-editor');
  }

  public static getStubConfig(): Record<string, unknown> {
    return {};
  }

  // TODO Add any properities that should cause your element to re-render here
  // https://lit.dev/docs/components/properties/
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public size!: ElementSize;

  @state() private config!: FluidProgressBarCardConfig;

  // https://lit.dev/docs/components/properties/#accessors-custom
  public setConfig(config: FluidProgressBarCardConfig): void {
    // TODO Check for required fields and that they are of the proper format
    if (!config) {
      throw new Error(localize('common.invalid_configuration'));
    }

    if (config.test_gui) {
      getLovelace().setEditMode(true);
    }

    this.config = {
      name: 'FluidProgressBar',
      ...config,
    };
  }

  // https://lit.dev/docs/components/lifecycle/#reactive-update-cycle-performing
  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config) {
      return false;
    }

    return hasConfigOrEntityChanged(this, changedProps, false);
  }

  // https://lit.dev/docs/components/rendering/
  // https://developpaper.com/realization-of-html5-canvas-background-animation-by-levitation-of-div-layer/
  protected render(): TemplateResult | void {
    // TODO Check for stateObj or other necessary things and render a warning if missing
    if (this.config.show_warning) {
      return this._showWarning(localize('common.show_warning'));
    }

    if (this.config.show_error) {
      return this._showError(localize('common.show_error'));
    }

    const haCard = html` <ha-card
      .header=${this.config.name}
      @action=${this._handleAction}
      .actionHandler=${actionHandler({
        hasHold: hasAction(this.config.hold_action),
        hasDoubleClick: hasAction(this.config.double_tap_action),
      })}
      tabindex="0"
      .label=${`Boilerplate: ${this.config.entity || 'No Entity Defined'}`}
    ></ha-card>`;

    return html`
      <div class="container">
        <fluid-background .size=${this.size}></fluid-background>
        ${haCard}
      </div>
    `;
  }

  firstUpdated(): void {
    window.setTimeout(() => {
      const container = this.shadowRoot?.querySelector('.container');
      this.size = { widht: container?.clientWidth as number, height: container?.clientHeight as number };
    }, 0);
  }

  private _handleAction(ev: ActionHandlerEvent): void {
    if (this.hass && this.config && ev.detail.action) {
      handleAction(this, this.hass, this.config, ev.detail.action);
    }
  }

  private _showWarning(warning: string): TemplateResult {
    return html` <hui-warning>${warning}</hui-warning> `;
  }

  private _showError(error: string): TemplateResult {
    const errorCard = document.createElement('hui-error-card');
    errorCard.setConfig({
      type: 'error',
      error,
      origConfig: this.config,
    });

    return html` ${errorCard} `;
  }

  // https://lit.dev/docs/components/styles/
  static get styles() {
    return css`
      .container {
        position: relative;
      }

      ha-card {
        position: relative;
      }
    `;
  }
}
