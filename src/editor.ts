/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, css, CSSResultGroup } from 'lit';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { customElement, property, state } from 'lit/decorators.js';
import {
  HomeAssistant,
  fireEvent,
  LovelaceCardEditor,
  ActionConfig,
  LovelaceConfig,
  HASSDomEvent,
} from 'custom-card-helpers';

import { FluidLevelBackgroundCardConfig, GUIModeChangedEvent, Severity } from './types';
import { localize } from './localize/localize';
import { FULL_VALUE } from './const';
import { clamp } from './utils/clamp';
import { MASK_PRESETS } from './masks';
import { LovelaceCardConfig } from './lovelace-types';
import { renderColorsTab } from './editor/colors-tab';
import { renderWavesTab } from './editor/waves-tab';
import { renderShapeTab, ensurePictureUpload } from './editor/shape-tab';

export interface EditorTab {
  slug: string;
  localizedLabel: string;
  render: (editor: FluidLevelBackgroundCardEditor) => TemplateResult;
  enabled: boolean;
}

// Card / Entities / Actions render inline on the editor; Colors / Waves / Shape live in ./editor/*.
const editorTabs: EditorTab[] = [
  { slug: 'card', localizedLabel: localize('editor.tab.card.title'), render: (e) => e.renderCardTab(), enabled: true },
  {
    slug: 'entities',
    localizedLabel: localize('editor.tab.entities.title'),
    render: (e) => e.renderEntitiesTab(),
    enabled: true,
  },
  { slug: 'colors', localizedLabel: localize('editor.tab.colors.title'), render: renderColorsTab, enabled: true },
  { slug: 'waves', localizedLabel: localize('editor.tab.waves.title'), render: renderWavesTab, enabled: true },
  { slug: 'shape', localizedLabel: localize('editor.tab.shape.title'), render: renderShapeTab, enabled: true },
  {
    slug: 'actions',
    localizedLabel: localize('editor.tab.actions.title'),
    render: (e) => e.renderActionsTab(),
    enabled: true,
  },
];

@customElement('fluid-level-background-card-editor')
export class FluidLevelBackgroundCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public lovelace?: LovelaceConfig;

  @state() _config?: FluidLevelBackgroundCardConfig;

  @state() protected _selectedTab = 0;

  @state() protected _GUImode = true;

  @state() protected _guiModeAvailable? = true;

  @state() _helpers?: any;

  private _initialized = false;

  // 'custom' chosen in the dropdown but no URL typed yet (transient, UI-only).
  @state() _maskCustom = false;

  // True once HA's picture-upload widget is loaded & confirmed to render; until then a URL field shows.
  @state() _pictureUploadReady = false;

  private _pictureUploadTried = false;

  _lastUsedBackgroundColor: number[] | undefined;
  _lastUsedLevelColor: number[] | undefined;

  public setConfig(config: FluidLevelBackgroundCardConfig): void {
    this._config = config;
    this.loadCardHelpers();
  }

  protected shouldUpdate(): boolean {
    if (!this._initialized) {
      this._initialize();
    }

    return true;
  }

  get _entity(): string {
    return this._config?.entity || '';
  }

  get _fill_entity(): string {
    return this._config?.fill_entity || '';
  }

  get _tap_action(): ActionConfig {
    return this._config?.tap_action || { action: 'none' };
  }

  get _hold_action(): ActionConfig {
    return this._config?.hold_action || { action: 'none' };
  }

  get _double_tap_action(): ActionConfig {
    return this._config?.double_tap_action || { action: 'none' };
  }

  get _full_value(): number {
    return this._config?.full_value ?? FULL_VALUE;
  }

  get _severity(): Severity[] {
    return this._config?.severity || [];
  }

  get _random_start(): boolean {
    return this._config?.random_start || false;
  }

  // Coerce a numeric config value into [0, max], falling back when unset/invalid.
  private _clampedNumber(value: unknown, fallback: number, max: number): number {
    if (typeof value !== 'number' || isNaN(value)) return fallback;
    return clamp(Math.round(value), 0, max);
  }

  get _top_margin(): number {
    return this._clampedNumber(this._config?.top_margin, 0, 20);
  }

  get _allow_click_through(): boolean {
    return this._config?.allow_click_through || false;
  }

  get _wave_height(): number {
    return this._clampedNumber(this._config?.wave_height, 50, 100);
  }

  get _wave_speed(): number {
    return this._clampedNumber(this._config?.wave_speed, 50, 100);
  }

  get _wave_style(): string {
    const v = this._config?.wave_style;
    return v === 'realistic' || v === 'realistic-performance' ? v : 'classic';
  }

  get _mask_image(): string {
    return this._config?.mask_image || '';
  }

  get _mask_size(): string {
    return this._config?.mask_size || 'contain';
  }

  // Dropdown value: '' (none) | preset name | 'custom'.
  get _mask_shape(): string {
    const v = this._mask_image;
    if (v && !MASK_PRESETS.includes(v)) return 'custom';
    if (this._maskCustom) return 'custom';
    return v;
  }

  get usesLevelThemeColor(): boolean {
    return this._config?.level_color === undefined;
  }

  get usesBackgroundThemeColor(): boolean {
    return this._config?.background_color === undefined;
  }

  // Opacity (0-100%) read from a colour's 4th array element; full when absent.
  private _opacityOf(color: number[] | string | undefined): number {
    return Array.isArray(color) && color.length > 3 ? Math.round(clamp(color[3], 0, 1) * 100) : 100;
  }

  get _level_opacity(): number {
    return this._opacityOf(this._config?.level_color);
  }

  get _background_opacity(): number {
    return this._opacityOf(this._config?.background_color);
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._helpers) {
      return html``;
    }

    // The climate more-info has ha-switch and paper-dropdown-menu elements that are lazy loaded unless explicitly done here
    this._helpers.importMoreInfoControl('climate');

    return html` <div class="card-config">${this.renderToolbar()}</div> `;
  }

  protected updated(): void {
    // Lazily force-load the picture-upload widget the first time a custom mask is being edited.
    if (this._mask_shape === 'custom' && !this._pictureUploadTried) {
      this._pictureUploadTried = true;
      ensurePictureUpload(this);
    }
  }

  private _initialize(): void {
    if (this.hass === undefined) return;
    if (this._config === undefined) return;
    if (this._helpers === undefined) return;
    this._initialized = true;
  }

  renderToolbar(): TemplateResult {
    const activeTab = editorTabs[this._selectedTab] ?? editorTabs[0];

    // HA 2026.6 replaced Shoelace (sl-tab-group) with its own ha-tab-group (Web Awesome based).
    return html` <div class="toolbar">
      <ha-tab-group .active=${activeTab.slug} @wa-tab-show=${this._handleTabShow}>
        ${editorTabs.map((_tab) =>
          _tab.enabled
            ? html`<ha-tab-group-tab slot="nav" panel=${_tab.slug} ?active=${_tab.slug === activeTab.slug}>
                ${_tab.localizedLabel}
              </ha-tab-group-tab>`
            : null,
        )}
      </ha-tab-group>
      <div class="tab-panel">${activeTab.render(this)}</div>
    </div>`;
  }

  renderCardTab(): TemplateResult {
    return this._config?.card
      ? html`
          <hui-card-element-editor
            .hass=${this.hass}
            .value=${this._config?.card}
            .lovelace=${this.lovelace}
            @config-changed=${this._handleConfigChanged}
            @GUImode-changed=${this._handleGUIModeChanged}
          ></hui-card-element-editor>
          <mwc-button @click=${this._handleCardDropped}>Choose a different card</mwc-button>
        `
      : html`
          <h3>${localize('editor.tab.card.chose-card')} (${localize('common.required')})</h3>
          <hui-card-picker
            .hass=${this.hass}
            .lovelace=${this.lovelace}
            @config-changed=${this._handleCardPicked}
          ></hui-card-picker>
        `;
  }

  renderEntitiesTab(): TemplateResult {
    if (!this.hass || !this._helpers) {
      return html``;
    }

    return html`
      <h3>${localize('editor.tab.entities.chose-entities')} (${localize('common.required')})</h3>
      <div class="entities">
        <div class="entity-row">
          <ha-entity-picker
            .hass=${this.hass}
            .value=${this._config?.entity}
            .label="${localize('editor.tab.entities.labels.level-entity')} (${localize('common.required')})"
            .configValue=${'entity'}
            .required=${true}
            include-domains='["input_number","sensor"]'
            @value-changed=${this._valueChanged}
            allow-custom-entity
          ></ha-entity-picker>
        </div>
        <div class="entity-row">
          <ha-entity-picker
            .hass=${this.hass}
            .value=${this._config?.fill_entity}
            .label="${localize('editor.tab.entities.labels.fill-entity')} (${localize('common.optional')})"
            .configValue=${'fill_entity'}
            include-domains='["input_boolean","switch", "sensor", "binary_sensor"]'
            @value-changed=${this._valueChanged}
            allow-custom-entity
          ></ha-entity-picker>
        </div>
        <div class="entity-row">
          <ha-textfield
            type="number"
            .label="${localize('editor.tab.entities.labels.full-value')} (${localize(
              'editor.tab.entities.labels.full-value-description',
            )})"
            .configValue=${'full_value'}
            .value=${this._full_value}
            @change=${this._valueChanged}
          ></ha-textfield>
        </div>
      </div>
    `;
  }

  renderActionsTab(): TemplateResult {
    return html`
      <div class="form-row-dual">
        <ha-formfield label=${localize('editor.tab.actions.labels.allow-click-through')}>
          <ha-switch .checked=${this._allow_click_through} @change=${this._toggleClickThrough}> </ha-switch>
        </ha-formfield>
      </div>
      <div class="help-text">${localize('editor.tab.actions.labels.allow-click-through-help')}</div>

      ${this._renderActionEditors()}
    `;
  }

  private _renderActionEditors(): TemplateResult | string {
    if (this._allow_click_through) {
      return '';
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${{
          tap_action: this._tap_action,
          hold_action: this._hold_action,
          double_tap_action: this._double_tap_action,
        }}
        .schema=${[
          {
            name: 'tap_action',
            selector: {
              ui_action: {
                default_action: 'more-info',
              },
            },
          },
          {
            name: 'hold_action',
            selector: {
              ui_action: {
                default_action: 'more-info',
              },
            },
          },
          {
            name: 'double_tap_action',
            selector: {
              ui_action: {
                default_action: 'none',
              },
            },
          },
        ]}
        .computeLabel=${this._computeActionLabel}
        @value-changed=${this._actionChanged}
      ></ha-form>
    `;
  }

  private readonly _computeActionLabel = (schema: { name: string }): string => {
    switch (schema.name) {
      case 'tap_action':
        return `${this.hass?.localize('ui.panel.lovelace.editor.card.generic.tap_action')} (${this.hass?.localize('ui.panel.lovelace.editor.card.config.optional')})`;
      case 'hold_action':
        return `${this.hass?.localize('ui.panel.lovelace.editor.card.generic.hold_action')} (${this.hass?.localize('ui.panel.lovelace.editor.card.config.optional')})`;
      case 'double_tap_action':
        return `${this.hass?.localize('ui.panel.lovelace.editor.card.generic.double_tap_action')} (${this.hass?.localize('ui.panel.lovelace.editor.card.config.optional')})`;
      default:
        return schema.name;
    }
  };

  protected _toggleClickThrough(): void {
    if (!this._config) {
      return;
    }

    if (this._allow_click_through) {
      this._config = { ...this._config, allow_click_through: false };
    } else {
      this._config = { ...this._config, allow_click_through: true };
    }

    fireEvent(this, 'config-changed', { config: this._config });
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  protected _handleCardPicked(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config) {
      return;
    }
    const config = ev.detail.config;
    const card = config;
    this._config = { ...this._config, card };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  protected _handleCardDropped(): void {
    if (!this._config) {
      return;
    }
    this._config = { ...this._config, card: undefined };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  protected _handleConfigChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config) {
      return;
    }
    const card = ev.detail.config as LovelaceCardConfig;
    this._config = { ...this._config, card };
    this._guiModeAvailable = ev.detail.guiModeAvailable;
    fireEvent(this, 'config-changed', { config: this._config });
  }

  protected _handleGUIModeChanged(ev: HASSDomEvent<GUIModeChangedEvent>): void {
    ev.stopPropagation();
    this._GUImode = ev.detail.guiMode;
    this._guiModeAvailable = ev.detail.guiModeAvailable;
  }

  private async loadCardHelpers(): Promise<void> {
    this._helpers = await (window as any).loadCardHelpers();
  }

  private _valueChanged(ev: Event): void {
    if (!this._config || !this.hass || (ev.target as any)?.value === '') {
      return;
    }
    const target = ev.target as any;
    if (this[`_${target.configValue}`] === target.value) {
      return;
    }
    if (target.configValue) {
      if (target.value === '') {
        const tmpConfig = { ...this._config };
        delete tmpConfig[target.configValue];
        this._config = tmpConfig;
      } else {
        this._config = {
          ...this._config,
          [target.configValue]: target.value,
        };
      }
    }
    fireEvent(this, 'config-changed', { config: this._config });
  }

  // Shared selector handler used by the wave and shape tabs (mask size / wave sliders / etc.).
  _selectorChanged(ev: CustomEvent): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target as any;
    const rawValue = ev.detail.value;
    const configKey = target.configValue;

    if (!configKey) {
      return;
    }

    // Validate and sanitize the value
    const sanitizedValue = this._sanitizeConfigValue(configKey, rawValue);

    // Check if the value actually changed
    if (this[`_${configKey}`] === sanitizedValue) {
      return;
    }

    // Update the configuration
    this._updateConfig(configKey, sanitizedValue);
  }

  private _sanitizeConfigValue(configKey: string, rawValue: any): any {
    if (configKey === 'top_margin') {
      const numValue = typeof rawValue === 'number' ? rawValue : parseFloat(rawValue);
      return this._clampedNumber(numValue, 0, 20);
    }

    return rawValue;
  }

  // Shared config writer used by _selectorChanged and by the ./editor/* tab modules: sets the key
  // (or deletes it when empty/undefined, unless always-kept) and fires config-changed.
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  _updateConfig(configKey: string, value: any): void {
    if (!this._config) {
      return;
    }

    // Special handling for certain config keys
    if (this._shouldAlwaysKeepConfigKey(configKey)) {
      this._setConfigValue(configKey, value);
    } else if (value === '' || value === null || value === undefined) {
      // Default behavior: remove empty/null/undefined values
      const tmpConfig = { ...this._config };
      delete tmpConfig[configKey];
      this._config = tmpConfig;
    } else {
      this._setConfigValue(configKey, value);
    }

    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _setConfigValue(configKey: string, value: any): void {
    if (!this._config) {
      return;
    }
    this._config = {
      ...this._config,
      [configKey]: value,
    };
  }

  private _shouldAlwaysKeepConfigKey(configKey: string): boolean {
    // Config keys that should always be kept with a valid value (never deleted)
    const alwaysKeepKeys = ['top_margin'];
    return alwaysKeepKeys.includes(configKey);
  }

  private _actionChanged(ev: CustomEvent): void {
    if (!this._config || !this.hass) {
      return;
    }

    const formData = ev.detail.value;
    if (!formData || typeof formData !== 'object') {
      return;
    }

    // Update config with the form data
    const newConfig = { ...this._config };

    // Update tap_action if present
    if (formData.tap_action !== undefined) {
      if (!formData.tap_action || formData.tap_action.action === 'none') {
        delete newConfig.tap_action;
      } else {
        newConfig.tap_action = formData.tap_action;
      }
    }

    // Update hold_action if present
    if (formData.hold_action !== undefined) {
      if (!formData.hold_action || formData.hold_action.action === 'none') {
        delete newConfig.hold_action;
      } else {
        newConfig.hold_action = formData.hold_action;
      }
    }

    // Update double_tap_action if present
    if (formData.double_tap_action !== undefined) {
      if (!formData.double_tap_action || formData.double_tap_action.action === 'none') {
        delete newConfig.double_tap_action;
      } else {
        newConfig.double_tap_action = formData.double_tap_action;
      }
    }

    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _handleTabShow(ev: CustomEvent): void {
    const index = editorTabs.findIndex((tab) => tab.slug === ev.detail.name);
    if (index >= 0) {
      this._selectedTab = index;
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      .toolbar {
        display: flex;
        flex-direction: column;
      }
      .tab-panel {
        padding: 16px 0;
      }
      .option {
        padding: 4px 0px;
        cursor: pointer;
      }
      .entities {
        display: flex;
        flex-direction: column;
      }
      .entity-row {
        display: flex;
        margin-bottom: 14px;
        flex-grow: 1;
      }
      .entity-row > * {
        min-width: 100%;
      }
      .form-row-dual {
        margin-bottom: 14px;
        display: grid;
        grid-template-columns: 1fr auto;
      }
      .form-row-dual > :last-child {
        margin-inline: 8px;
      }
      .form-row-tripple {
        margin-bottom: 14px;
        display: grid;
        grid-template-columns: 1fr 1fr 48px;
      }
      .form-row-tripple > :not(:first-child) {
        margin-inline: 8px;
      }
      .title {
        padding-left: 16px;
        margin-top: -6px;
        pointer-events: none;
      }
      .secondary {
        padding-left: 40px;
        color: var(--secondary-text-color);
        pointer-events: none;
      }
      .values {
        padding-left: 16px;
        background: var(--secondary-background-color);
        display: grid;
      }
      ha-formfield {
        padding-bottom: 8px;
      }
      #editor {
        border: 1px solid var(--divider-color);
        padding: 12px;
      }
    `;
  }
}
