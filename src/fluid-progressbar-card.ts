/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import {
  HomeAssistant,
  hasConfigOrEntityChanged,
  hasAction,
  ActionHandlerEvent,
  handleAction,
  LovelaceCardEditor,
  getLovelace,
  LovelaceCard,
  LovelaceCardConfig,
  createThing,
} from 'custom-card-helpers'; // This is a community maintained npm module with common helper functions/types. https://github.com/custom-cards/custom-card-helpers
//import { createCardElement } from 'home-assistant-frontend/src/panels/lovelace/custom-card-helpers';

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
  width: number;
  height: number;
}

@customElement('fluid-progressbar-card')
export class FluidProgressBarCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public size!: ElementSize;

  @state() protected _card?: LovelaceCard;

  @state() private config!: FluidProgressBarCardConfig;

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('fluid-progressbar-card-editor');
  }

  public static getStubConfig(): Record<string, unknown> {
    return {};
  }

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

    this._card = this._createCardElement(config.card);
  }

  requestUpdate(name?: PropertyKey, oldValue?: unknown): void {
    if (name === 'hass' && this.config.entity) {
      console.log(this[name].states[this.config.entity].state, oldValue);
      super.requestUpdate(name, oldValue);
    }

    if (name === 'size') {
      super.requestUpdate(name, oldValue);
    }
  }

  // https://lit.dev/docs/components/lifecycle/#reactive-update-cycle-performing
  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config) {
      return false;
    }

    return hasConfigOrEntityChanged(this, changedProps, false);
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._card || (!changedProps.has('hass') && !changedProps.has('editMode'))) {
      return;
    }

    //for (const element of this._cards) {
    if (this.hass) {
      this._card.hass = this.hass;
    }
    // if (this.editMode !== undefined) {
    //   this._card.editMode = this.editMode;
    // }
    //}
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

    const value = this.config.entity ? parseInt(this.hass.states[this.config.entity].state, 10) : 50;

    const haCard = html` <ha-card
      @action=${this._handleAction}
      .actionHandler=${actionHandler({
        hasHold: hasAction(this.config.hold_action),
        hasDoubleClick: hasAction(this.config.double_tap_action),
      })}
      tabindex="0"
      .label=${`FluidProgressBar: ${this.config.entity || 'No Entity Defined'}`}
      >${this._card}</ha-card
    >`;

    return html`
      <div class="container">
        <fluid-background .size=${this.size} .value=${value}></fluid-background>
        ${haCard}
      </div>
      <style>
        ha-card {
          --ha-card-background: transparent;
          --card-background-color: transparent;
        }
      </style>
    `;
  }

  firstUpdated(): void {
    window.setTimeout(() => {
      const container = this.shadowRoot?.querySelector('.container');
      this.size = { width: container?.clientWidth as number, height: container?.clientHeight as number };
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

  private _createCardElement(cardConfig: LovelaceCardConfig) {
    const element = createThing(cardConfig) as LovelaceCard;
    console.log(element);
    if (this.hass) {
      element.hass = this.hass;
    }
    element.addEventListener(
      'll-rebuild',
      (ev) => {
        ev.stopPropagation();
        this._rebuildCard(element, cardConfig);
      },
      { once: true },
    );
    return element;
  }

  private _rebuildCard(cardElToReplace: LovelaceCard, config: LovelaceCardConfig): void {
    const newCardEl = this._createCardElement(config);
    if (cardElToReplace.parentElement) {
      cardElToReplace.parentElement.replaceChild(newCardEl, cardElToReplace);
    }
    this._card = newCardEl;
  }

  // https://lit.dev/docs/components/styles/
  static get styles() {
    return css`
      .container {
        position: relative;
      }

      ha-card {
        position: relative;
        background: transparent;
      }
    `;
  }
}
