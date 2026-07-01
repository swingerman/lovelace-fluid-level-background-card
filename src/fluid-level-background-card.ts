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
import { resolveMask } from './masks';
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

// True when the entity carries a 0-100 level we can map to a fluid fill.
function isLevelEntity(hass: HomeAssistant, entityId: string): boolean {
  const stateObj = hass?.states?.[entityId];
  if (!stateObj) return false;
  const domain = entityId.split('.')[0];
  const attrs = (stateObj as any).attributes ?? {};
  return (
    ['number', 'input_number', 'counter'].includes(domain) ||
    attrs.device_class === 'battery' ||
    attrs.unit_of_measurement === '%' ||
    (domain === 'sensor' && !isNaN(parseFloat((stateObj as any).state)))
  );
}

// This puts your card into the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'fluid-level-background-card',
  name: 'Fluid Level Background Card',
  description: 'A card that has a fluid level as the background',
  documentationURL: 'https://github.com/swingerman/lovelace-fluid-level-background-card',
  preview: true,
  // 2026.6 entity-first card picker: suggest wrapping numeric/% entities so the
  // card shows up under "Community" when the user picks such an entity.
  getEntitySuggestion: (hass: HomeAssistant, entityId: string) => {
    if (!isLevelEntity(hass, entityId)) return null;
    return {
      config: {
        type: 'custom:fluid-level-background-card',
        entity: entityId,
        card: { type: 'tile', entity: entityId },
      },
    };
  },
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

  @state() protected _top_margin = 0;

  @state() protected _wave_height = 50;

  @state() protected _wave_speed = 50;

  @state() protected _wave_style: 'classic' | 'realistic' | 'realistic-performance' = 'classic';

  @state() protected _mask_image = '';

  @state() protected _mask_size = 'contain';

  // _mask_image is the raw config value: a preset name, a URL, or a media-source URI.
  // _mask_resolved is the final value handed to the renderer: presets -> data-URI, media-source
  // -> a servable URL (async), URLs pass through. Single resolution point for the mask.
  @state() protected _mask_resolved = '';

  private _maskResolvedFor?: string;

  @state() private config!: FluidLevelBackgroundCardConfig;

  private _darkModeLastValue!: boolean;

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('fluid-level-background-card-editor');
  }

  public static getStubConfig(
    hass?: HomeAssistant,
    entities?: string[],
    entitiesFallback?: string[],
  ): Record<string, unknown> {
    const pick = (list?: string[]) => list?.find((e) => hass && isLevelEntity(hass, e)) ?? list?.[0];
    const entity = pick(entities) ?? pick(entitiesFallback);
    // preview: true needs a renderable default; without an entity fall back to empty.
    return entity ? { entity, card: { type: 'tile', entity } } : {};
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
        this._top_margin = config.top_margin ?? 0;
        this._wave_height = config.wave_height ?? 50;
        this._wave_speed = config.wave_speed ?? 50;
        this._wave_style =
          config.wave_style === 'realistic' || config.wave_style === 'realistic-performance'
            ? config.wave_style
            : 'classic';
        this._mask_image = config.mask_image ?? '';
        this._mask_size = config.mask_size || 'contain';
        this.updateResolvedMask();
      });
    }
  }

  // Property changes that always drive a re-render. hass is special: it ticks constantly, so we
  // only re-render on it when a relevant entity is configured (and _card only when there's a card).
  private static readonly RENDER_PROPS = new Set<PropertyKey>([
    'size',
    '_level_entity',
    '_fill_entity',
    '_level_color',
    '_background_color',
    '_full_value',
    '_severity',
    '_random_start',
    'config',
    '_mask_resolved',
  ]);

  requestUpdate(name?: PropertyKey, oldValue?: unknown): void {
    const shouldRender =
      (name !== undefined && FluidLevelBackgroundCard.RENDER_PROPS.has(name)) ||
      (name === '_card' && !!this.config?.card) ||
      (name === 'hass' && !!(this.config?.entity || this.config?.fill_entity));
    if (shouldRender) {
      super.requestUpdate(name, oldValue);
    }
  }

  // Turn the raw mask value into the final one the renderer uses: media-source URIs resolve to a
  // servable URL (async, needs hass), presets -> data-URI and URLs pass through (via resolveMask).
  // Guarded by _maskResolvedFor so it only does work when the raw value actually changes.
  private updateResolvedMask(): void {
    const raw = this._mask_image;
    if (this._maskResolvedFor === raw) {
      return;
    }
    if (!raw.startsWith('media-source://')) {
      this._maskResolvedFor = raw;
      this._mask_resolved = resolveMask(raw);
      return;
    }
    if (!this.hass) {
      return; // hass not ready yet; updated() retries once it is
    }
    this._maskResolvedFor = raw;
    this.hass.connection
      .sendMessagePromise<{ url: string }>({ type: 'media_source/resolve_media', media_content_id: raw })
      .then((res) => {
        this._mask_resolved = res.url;
      })
      .catch(() => {
        this._mask_resolved = '';
      });
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
    this.updateResolvedMask(); // cheap no-op unless the raw mask changed or hass just became available

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

  // An active severity colour replaces the level colour; reuse the level's opacity so the
  // opacity slider applies to severity colours too (an explicit alpha on the severity wins).
  private resolveLevelColor(severityColor: string | number[] | undefined): number[] | undefined {
    if (!severityColor) {
      return this._level_color;
    }
    const parsed = parseCssColor(severityColor);
    if (!parsed || parsed.length > 3) {
      return parsed;
    }
    const alpha = this._level_color && this._level_color.length > 3 ? this._level_color[3] : 1;
    return [...parsed, alpha];
  }

  private makeFluidBackground(): TemplateResult {
    const value = this.getSafeLevelValue(this._level_entity);
    const severityColor = this._severity.length > 0 ? this._severity.find((s) => s.value <= value)?.color : undefined;
    const levelColor = this.resolveLevelColor(severityColor);

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
      .topMargin=${this._top_margin}
      .waveHeight=${this._wave_height}
      .waveSpeed=${this._wave_speed}
      .waveStyle=${this._wave_style}
      .maskImage=${this._mask_resolved}
      .maskSize=${this._mask_size}
    ></fluid-background>`;
  }

  private makeEntityCard(): TemplateResult {
    if (!this._card) {
      return html``;
    }

    // If click-through is enabled, don't add action handlers to allow inner card interactions
    if (this.config.allow_click_through) {
      const cardLabel = `FluidProgressBar: ${this._level_entity || 'No Entity Defined'}`;
      return html` <ha-card tabindex="0" .label=${cardLabel}> ${this._card} </ha-card> `;
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
