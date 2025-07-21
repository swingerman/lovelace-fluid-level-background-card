/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, css, PropertyValues, CSSResult } from 'lit';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { customElement, property, state } from 'lit/decorators.js';
import {
  HomeAssistant,
  hasConfigOrEntityChanged,
  hasAction,
  ActionHandlerEvent,
  handleAction,
  LovelaceCardEditor,
  getLovelace,
  Themes,
} from 'custom-card-helpers'; // This is a community maintained npm module with common helper functions/types. https://github.com/custom-cards/custom-card-helpers

import './editor';
import './fluid-background';

import type { FluidLevelBackgroundCardConfig, Severity } from './types';
import { actionHandler } from './action-handler-directive';
import {
  BACKGROUND_COLOR,
  FULL_VALUE,
  LEVEL_COLOR,
  THEME_BACKGROUND_COLOR_VARIABLE,
  THEME_PRIMARY_COLOR_VARIABLE,
} from './const';
import pjson from '../package.json';
import { localize } from './localize/localize';
import { getThemeColor } from './utils/theme-parser';
import { parseCssColor } from './utils/color';
import { LovelaceCard, LovelaceCardConfig } from './lovelace-types';

export interface FluidThemes extends Themes {
  darkMode: boolean;
}

// define loadCardHelpers on window object
declare global {
  interface Window {
    loadCardHelpers: () => Promise<any>;
  }
}

// define loadCardHelpers on window object
declare global {
  interface Window {
    loadCardHelpers: () => Promise<any>;
  }
}

/* eslint no-console: 0 */
console.info(
  `%c  fluid-level-background-card \n%c  ${localize('common.version')} ${pjson.version}    `,
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

  @property({ attribute: false }) public backgroundColor = getThemeColor(
    THEME_BACKGROUND_COLOR_VARIABLE,
    BACKGROUND_COLOR,
  );

  @state() protected _card?: LovelaceCard;

  @state() protected _level_entity?: string;

  @state() protected _fill_entity?: string;

  @state() protected _background_color?: number[];

  @state() protected _level_color?: number[];

  @state() protected _full_value: number = FULL_VALUE;

  @state() protected _severity: Severity[] = [];

  @state() protected _random_start = false;

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
      window.loadCardHelpers().then(({ createCardElement }) => {
        this._card = this._createCardElement(createCardElement, config.card);

        this._level_entity = config.entity;
        this._fill_entity = config.fill_entity;
        this._level_color =
          (config.level_color && parseCssColor(config.level_color)) ||
          getThemeColor(THEME_PRIMARY_COLOR_VARIABLE, LEVEL_COLOR);
        this._background_color =
          (config.background_color && parseCssColor(config.background_color)) ||
          getThemeColor(THEME_BACKGROUND_COLOR_VARIABLE, BACKGROUND_COLOR);
        this._full_value = config.full_value ?? FULL_VALUE;
        this._severity = config.severity ? [...config.severity].sort((a, b) => b.value - a.value) : [];
        this._random_start = config.random_start || false;
      });
    }
  }

  requestUpdate(name?: PropertyKey, oldValue?: unknown): void {
    if (name === '_card' && this.config.card) {
      super.requestUpdate(name, oldValue);
    }

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

    if (name === '_background_color') {
      super.requestUpdate(name, oldValue);
    }

    if (name === '_full_value') {
      super.requestUpdate(name, oldValue);
    }

    if (name === '_severity') {
      super.requestUpdate(name, oldValue);
    }

    if (name === '_random_start') {
      super.requestUpdate(name, oldValue);
    }

    if (name === 'config') {
      super.requestUpdate(name, oldValue);
    }
  }

  private _createCardElement(createCardElement: any, cardConfig?: LovelaceCardConfig) {
    const element = createCardElement(cardConfig) as LovelaceCard;
    if (this.hass) {
      element.hass = this.hass;
    }
    element.addEventListener(
      'll-rebuild',
      (ev) => {
        ev.stopPropagation();
        this._rebuildCard(createCardElement, cardConfig);
      },
      { once: true },
    );

    return element;
  }

  private _rebuildCard(createCardElement: any, config?: LovelaceCardConfig): void {
    this._card = this._createCardElement(createCardElement, config);
    if (this.lastChild) {
      this.replaceChild(this._card, this.lastChild);
    }
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config) {
      return false;
    }

    if (changedProps.get('hass') === undefined) {
      return true;
    }

    if (this.hasFillEntityChanged(changedProps)) {
      return true;
    }

    if (this.hsDarkModeChchanged()) {
      return true;
    }

    if (this.hasCardEntityChanged(changedProps)) {
      return true;
    }

    if (this.hasCardEntitiesChanged(changedProps)) {
      return true;
    }

    return hasConfigOrEntityChanged(this, changedProps, false);
  }

  /**
   * Checks if the dark mode has changed
   * @returns boolean
   */
  private hsDarkModeChchanged(): boolean {
    const { themes } = this.hass;
    const { darkMode } = themes as FluidThemes;

    if (this._darkModeLastValue !== darkMode) {
      this._darkModeLastValue = darkMode;
      this.backgroundColor = getThemeColor(THEME_BACKGROUND_COLOR_VARIABLE, BACKGROUND_COLOR);
      return true;
    }
    return false;
  }

  /**
   * Checks if the fill entity has changed
   * @param changedProps
   * @returns boolean
   */
  private hasFillEntityChanged(changedProps: PropertyValues): boolean {
    const oldHass = changedProps.get('hass') as HomeAssistant;
    if (this.config?.fill_entity && oldHass?.states[this.config.fill_entity]) {
      if (oldHass.states[this.config.fill_entity].state !== this.hass.states[this.config.fill_entity].state) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks if the card entities have changed
   * @param changedProps
   * @returns boolean
   */
  private hasCardEntitiesChanged(changedProps: PropertyValues): boolean {
    const oldHass = changedProps.get('hass') as HomeAssistant;
    const cardEntities = this._card && (this._card as any)._config.entities;

    if (cardEntities && oldHass && changedProps.has('hass')) {
      const newHass = this.hass;
      for (const entity of cardEntities) {
        if (oldHass.states[entity] !== newHass.states[entity]) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Checks if the card entity has changed
   * @param changedProps
   * @returns boolean
   */
  private hasCardEntityChanged(changedProps: PropertyValues): boolean {
    const oldHass = changedProps.get('hass') as HomeAssistant;
    const cardEntity = this._card && (this._card as any)._config.entity;

    if (cardEntity && oldHass?.states[cardEntity] && changedProps.has('hass')) {
      const newHass = this.hass;
      if (oldHass.states[cardEntity] !== newHass.states[cardEntity]) {
        return true;
      }
    }
    return false;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (!this._card || (!changedProps.has('hass') && !changedProps.has('editMode'))) {
      return;
    }

    if (this.hass) {
      this._card.hass = this.hass;
    }

    this.backgroundColor = getThemeColor(THEME_BACKGROUND_COLOR_VARIABLE, BACKGROUND_COLOR);
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this.config) {
      return html``;
    }

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
      this.resizeObserver.observe(container as Element);
    }
  }

  private updateSize(newSize: { width; height }): void {
    this.size = { width: newSize.width, height: newSize.height };
  }

  resizeObserver = new ResizeObserver((entries) => {
    window.requestAnimationFrame(() => {
      entries.forEach((entry) => this.updateSize(entry.contentRect));
    });
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

  private getSafeLevelValue(entityId: string | undefined): number {
    if (!entityId) {
      return 0;
    }

    const entityValue = this.hass.states[entityId]?.state || 0;
    let safeEntityValue = 0;

    if (typeof entityValue === 'number') {
      safeEntityValue = entityValue;
    }
    if (typeof entityValue === 'string') {
      safeEntityValue = isNaN(parseFloat(entityValue)) ? 0 : parseFloat(entityValue);
    }

    if (safeEntityValue >= 0) {
      // calculate the percentage based on the full value
      return (safeEntityValue / this._full_value) * 100;
    }
    return 0;
  }

  private makeFluidBackground(): TemplateResult {
    const value = this.getSafeLevelValue(this._level_entity);
    const severityColor = this._severity.length > 0 ? this._severity.find((s) => s.value <= value)?.color : undefined;
    const levelColor = severityColor ? parseCssColor(severityColor) : this._level_color;

    const filling =
      this._fill_entity && this.hass.states[this._fill_entity]
        ? this.hass.states[this._fill_entity].state === 'on'
        : false;

    return html` <fluid-background
      .size=${this.size}
      .value=${value}
      .backgroundColor=${this._background_color || this.backgroundColor}
      .levelColor=${levelColor || LEVEL_COLOR}
      .filling=${filling}
      .randomStart=${this._random_start}
    ></fluid-background>`;
  }

  private makeEntityCard(): TemplateResult {
    if (!this._card) {
      return html``;
    }
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
        border-radius: var(--ha-card-border-radius, 12px);
        border-style: solid;
        border-width: var(--ha-card-border-width, 1px);
        border-color: transparent;
        overflow: hidden;
      }

      .edit-mode #container {
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
      }

      ha-card {
        border: none;
      }
    `;
  }
}
