/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, css, PropertyValues, CSSResult } from 'lit';
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
  Themes,
} from 'custom-card-helpers'; // This is a community maintained npm module with common helper functions/types. https://github.com/custom-cards/custom-card-helpers

import './editor';
import './fluid-background';

import type { FluidLevelBackgroundCardConfig } from './types';
import { actionHandler } from './action-handler-directive';
import { CARD_VERSION, LEVEL_COLOR } from './const';
import { localize } from './localize/localize';
import { getThemeBackgroundColor } from './utils/theme-parser';

export interface FluidThemes extends Themes {
  darkMode: boolean;
}

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
  @property({ attribute: false })
  public hass!: HomeAssistant;

  @property({ attribute: false }) public size!: ElementSize;

  @property({ attribute: false }) public backgroundColor = getThemeBackgroundColor();

  @state() protected _card?: LovelaceCard;

  @state() protected _level_entity?: string;

  @state() protected _fill_entity?: string;

  @state() protected _level_color?: number[];

  @state() private config!: FluidLevelBackgroundCardConfig;

  private _darkModeLastValue!: boolean;

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('fluid-level-background-card-editor');
  }

  public static getStubConfig(): Record<string, unknown> {
    return {};
  }

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

    if (config.card) {
      this._card = this._createCardElement(config.card);
    }

    this._level_entity = config.entity;
    this._fill_entity = config.fill_entity;
    this._level_color = config.level_color || LEVEL_COLOR;
  }

  requestUpdate(name?: PropertyKey, oldValue?: unknown): void {
    if (name === 'hass' && this.config.entity) {
      super.requestUpdate(name, oldValue);
    }

    if (name === 'hass' && this.config.fill_entity) {
      super.requestUpdate(name, oldValue);
    }

    if (name === 'size') {
      super.requestUpdate(name, oldValue);
    }

    if (name === '_level_entity') {
      super.requestUpdate(name, oldValue);
    }

    if (name === '_fill_entity') {
      super.requestUpdate(name, oldValue);
    }

    if (name === '_level_color') {
      super.requestUpdate(name, oldValue);
    }

    if (name === 'config') {
      super.requestUpdate(name, oldValue);
    }
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config) {
      return false;
    }

    if (changedProps.get('hass') === undefined) {
      return true;
    }

    const { themes } = changedProps.get('hass') as HomeAssistant;
    const { darkMode } = themes as FluidThemes;
    const hass = changedProps.get('hass') as HomeAssistant;
    if (this.config && this.config.fill_entity && hass && hass.states[this.config.fill_entity]) {
      if (hass.states[this.config.fill_entity].state !== this.hass.states[this.config.fill_entity].state) {
        return true;
      }
    }
    if (this._darkModeLastValue !== darkMode) {
      this._darkModeLastValue = darkMode;
      this.backgroundColor = getThemeBackgroundColor();
      return true;
    }
    return hasConfigOrEntityChanged(this, changedProps, false);
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (!this._card || (!changedProps.has('hass') && !changedProps.has('editMode'))) {
      return;
    }

    if (this.hass) {
      this._card.hass = this.hass;
    }

    this.backgroundColor = getThemeBackgroundColor();
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this.config) {
      return html``;
    }

    // TODO Check for stateObj or other necessary things and render a warning if missing
    if (this.config.show_warning) {
      return this._showWarning(localize('common.show_warning'));
    }

    if (this.config.show_error) {
      return this._showError(localize('common.show_error'));
    }

    // prettier-ignore
    return html`
      <div id="container">
        ${this.makeFluidBackground()}
        ${this.makeEntityCard()}
      </div>
      <style>
        ha-card, ha-card > * {
          --ha-card-background: transparent;
          --card-background-color: transparent;
          --primary-background-color: transparent;
          --ha-card-box-shadow: none;
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
    if (this.hass && this.config && ev.detail.action && this._hasActionSet(ev.detail.action)) {
      handleAction(this, this.hass, this.config, ev.detail.action);
    }
  }

  private _hasActionSet(event: string): boolean {
    if (this.config && event) {
      const configForAction = this.config[event + '_action'];
      return configForAction !== undefined && configForAction !== 'none';
    }

    return false;
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
    return element;
  }

  private getSafeLevelValue(entityId: string | undefined): number {
    if (!entityId) {
      return 0;
    }

    const value = this.hass.states[entityId].state;

    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      return isNaN(parseInt(value, 10)) ? 0 : parseInt(value, 10);
    }
    return 0;
  }

  private makeFluidBackground(): TemplateResult {
    const value = this.getSafeLevelValue(this._level_entity);
    const filling =
      this._fill_entity && this.hass.states[this._fill_entity]
        ? this.hass.states[this._fill_entity].state === 'on'
        : false;

    return html` <fluid-background
      .size=${this.size}
      .value=${value}
      .backgroundColor=${this.backgroundColor}
      .levelColor=${this._level_color || LEVEL_COLOR}
      .filling=${filling}
    ></fluid-background>`;
  }

  private makeEntityCard(): TemplateResult {
    return html` <ha-card
      @action=${this._handleAction}
      .actionHandler=${actionHandler({
        hasHold: hasAction(this.config.hold_action),
        hasDoubleClick: hasAction(this.config.double_tap_action),
      })}
      tabindex="0"
      .label=${`FluidProgressBar: ${this._level_entity || 'No Entity Defined'}`}
      >${this._card}</ha-card
    >`;
  }

  static get styles(): CSSResult {
    return css`
      #container {
        position: relative;
        border-radius: var(--ha-card-border-radius, 4px);
        box-shadow: var(--ha-card-box-shadow, 0 2px 4px 0 rgba(0, 0, 0, 0.14));
      }

      ha-card {
        position: relative;
        overflow: hidden;
      }
    `;
  }
}
