/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
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

import './editor';
import './fluid-background';

import type { FluidLevelBackgroundCardConfig } from './types';
import { actionHandler } from './action-handler-directive';
import { CARD_VERSION } from './const';
import { localize } from './localize/localize';

/* eslint no-console: 0 */
console.info(
  `%c  fluid-level-background-card \n%c  ${localize('common.version')} ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

// This puts your card into the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'fluid-level-background-card',
  name: 'Fluid Level Background Card',
  description: 'A card that has a fluid level as the background',
});

export interface ElementSize {
  width: number;
  height: number;
}
@customElement('fluid-level-background-card')
export class FluidLevelBackgroundCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public size!: ElementSize;

  @state() protected _card?: LovelaceCard;

  @state() private config!: FluidLevelBackgroundCardConfig;

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('fluid-level-background-card-editor');
  }

  public static getStubConfig(): Record<string, unknown> {
    return {};
  }

  // https://lit.dev/docs/components/properties/#accessors-custom
  public setConfig(config: FluidLevelBackgroundCardConfig): void {
    // TODO Check for required fields and that they are of the proper format
    if (!config) {
      throw new Error(localize('common.invalid_configuration'));
    }

    if (config.test_gui) {
      getLovelace().setEditMode(true);
    }

    this.config = {
      name: 'FluidLevelBackgroundCard',
      ...config,
    };

    this._card = this._createCardElement(config.card);
  }

  requestUpdate(name?: PropertyKey, oldValue?: unknown): void {
    if (name === 'hass' && this.config.entity) {
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
      <div id="container">
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
    const container = this.shadowRoot?.querySelector('#container');
    if (container) {
      this.ro.observe(container as Element);
    }
  }

  private updateSize(newSize: { width; height }): void {
    this.size = { width: newSize.width, height: newSize.height };
  }

  ro = new ResizeObserver((entries) => {
    entries.forEach((entry) => this.updateSize(entry.contentRect));
  });

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
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  static get styles() {
    return css`
      #container {
        position: relative;
      }

      ha-card {
        position: relative;
        background: transparent;
      }
    `;
  }
}