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
import {
  BACKGROUND_COLOR,
  FULL_VALUE,
  LEVEL_COLOR,
  THEME_BACKGROUND_COLOR_VARIABLE,
  THEME_PRIMARY_COLOR_VARIABLE,
} from './const';
import { getThemeColor } from './utils/theme-parser';
import { parseCssColor } from './utils/color';
import { clamp } from './utils/clamp';
import { MASK_PRESETS } from './masks';
import { mdiMinus, mdiPlus } from '@mdi/js';
import { LovelaceCardConfig } from './lovelace-types';

export interface EditorTab {
  slug: string;
  localizedLabel: string;
  renderer: string;
  enabled: boolean;
}

const editorTabs = [
  {
    slug: 'card',
    localizedLabel: localize('editor.tab.card.title'),
    renderer: 'renderCardTab',
    enabled: true,
  },
  {
    slug: 'entities',
    localizedLabel: localize('editor.tab.entities.title'),
    renderer: 'renderEntitiesTab',
    enabled: true,
  },
  {
    slug: 'colors',
    localizedLabel: localize('editor.tab.colors.title'),
    renderer: 'renderColorsTab',
    enabled: true,
  },
  {
    slug: 'waves',
    localizedLabel: localize('editor.tab.waves.title'),
    renderer: 'renderWavesTab',
    enabled: true,
  },
  {
    slug: 'shape',
    localizedLabel: localize('editor.tab.shape.title'),
    renderer: 'renderShapeTab',
    enabled: true,
  },
  {
    slug: 'actions',
    localizedLabel: localize('editor.tab.actions.title'),
    renderer: 'renderActionsTab',
    enabled: true,
  },
];

const options = {
  required: {
    icon: 'tune',
    name: 'Required',
    secondary: 'Required options for this card to function',
    show: true,
  },
  actions: {
    icon: 'gesture-tap-hold',
    name: 'Actions',
    secondary: 'Perform actions based on tapping/clicking',
    show: false,
    options: {
      tap: {
        icon: 'gesture-tap',
        name: 'Tap',
        secondary: 'Set the action to perform on tap',
        show: false,
      },
      hold: {
        icon: 'gesture-tap-hold',
        name: 'Hold',
        secondary: 'Set the action to perform on hold',
        show: false,
      },
      double_tap: {
        icon: 'gesture-double-tap',
        name: 'Double Tap',
        secondary: 'Set the action to perform on double tap',
        show: false,
      },
    },
  },
  appearance: {
    icon: 'palette',
    name: 'Appearance',
    secondary: 'Customize the name, icon, etc',
    show: false,
  },
};

@customElement('fluid-level-background-card-editor')
export class FluidLevelBackgroundCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public lovelace?: LovelaceConfig;

  @state() protected _config?: FluidLevelBackgroundCardConfig;

  @state() protected _selectedTab = 0;

  @state() protected _GUImode = true;

  @state() protected _guiModeAvailable? = true;

  @state() private _toggle?: boolean;

  @state() private _helpers?: any;

  private _initialized = false;

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

  get _name(): string {
    return this._config?.name || '';
  }

  get _entity(): string {
    return this._config?.entity || '';
  }

  get _fill_entity(): string {
    return this._config?.fill_entity || '';
  }

  get _show_warning(): boolean {
    return this._config?.show_warning || false;
  }

  get _show_error(): boolean {
    return this._config?.show_error || false;
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

  // 'custom' chosen in the dropdown but no URL typed yet (transient, UI-only).
  @state() private _maskCustom = false;

  // True once HA's picture-upload widget is loaded & confirmed to render; until then a URL field shows.
  @state() private _pictureUploadReady = false;

  private _pictureUploadTried = false;

  // Dropdown value: '' (none) | preset name | 'custom'.
  get _mask_shape(): string {
    const v = this._mask_image;
    if (v && !MASK_PRESETS.includes(v)) return 'custom';
    if (this._maskCustom) return 'custom';
    return v;
  }

  private _lastUsedBackgroundColor: number[] | undefined;
  private _lastUsedLevelColor: number[] | undefined;

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

  // RGB of a config colour (array/string/unset → resolve theme as the fallback), always 3 elements.
  private _effectiveRgb(value: number[] | string | undefined, themeVar: string, fallback: number[]): number[] {
    if (Array.isArray(value)) return value.slice(0, 3);
    if (typeof value === 'string') {
      const parsed = parseCssColor(value);
      if (parsed) return parsed.slice(0, 3);
    }
    return getThemeColor(themeVar, fallback).slice(0, 3);
  }

  // Combine rgb + opacity%; drop the alpha element when fully opaque to keep configs tidy.
  private _withAlpha(rgb: number[], pct: number): number[] {
    const a = clamp(Math.round(pct), 0, 100) / 100;
    return a >= 1 ? rgb.slice(0, 3) : [...rgb.slice(0, 3), a];
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
      this._ensurePictureUpload();
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
      <div class="tab-panel">${this[activeTab.renderer]()}</div>
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

  renderColorsTab(): TemplateResult {
    return html`
      <h3>${localize('editor.tab.appearance.choose-colors')}</h3>
      <p>${localize('editor.tab.appearance.labels.color-description')}</p>
      <div class="form-row-dual">
        <ha-selector
          .hass=${this.hass}
          .selector=${{ color_rgb: {} }}
          .label=${localize('editor.tab.appearance.labels.level-color')}
          .value=${this._effectiveRgb(this._config?.level_color, THEME_PRIMARY_COLOR_VARIABLE, LEVEL_COLOR)}
          .configValue=${'level_color'}
          @value-changed=${this._levelColorChanged}
        ></ha-selector>
        <ha-formfield label=${localize('editor.tab.appearance.labels.use-theme-color')}>
          <ha-switch .checked=${this.usesLevelThemeColor} @change=${this._toggleLevelDefaultColor}> </ha-switch>
        </ha-formfield>
      </div>
      ${this.renderOpacitySlider('level-opacity', this._level_opacity, this._levelOpacityChanged)}
      <div class="form-row-dual">
        <ha-selector
          .hass=${this.hass}
          .selector=${{ color_rgb: {} }}
          .label=${localize('editor.tab.appearance.labels.background-color')}
          .value=${this._effectiveRgb(this._config?.background_color, THEME_BACKGROUND_COLOR_VARIABLE, BACKGROUND_COLOR)}
          .configValue=${'background_color'}
          @value-changed=${this._backgroundColorChanged}
        ></ha-selector>
        <ha-formfield label=${localize('editor.tab.appearance.labels.use-theme-color')}>
          <ha-switch .checked=${this.usesBackgroundThemeColor} @change=${this._toggleBackgroundDefaultColor}>
          </ha-switch>
        </ha-formfield>
      </div>
      ${this.renderOpacitySlider('background-opacity', this._background_opacity, this._backgroundOpacityChanged)}
      <div class="form-row-dual">
        <ha-formfield label=${localize('editor.tab.appearance.labels.use-severity')}>
          <ha-switch .checked=${this._severity.length > 0} @change=${this._toggleSeverity}> </ha-switch>
        </ha-formfield>
      </div>

      ${this.severitySection()}
    `;
  }

  renderOpacitySlider(labelKey: string, value: number, handler: (ev: CustomEvent) => void): TemplateResult {
    return html`
      <div class="form-row-dual">
        <ha-selector
          .hass=${this.hass}
          .selector=${{ number: { min: 0, max: 100, step: 1, mode: 'slider' } }}
          .label=${localize(`editor.tab.appearance.labels.${labelKey}`)}
          .value=${value}
          @value-changed=${handler}
        ></ha-selector>
      </div>
    `;
  }

  renderWavesTab(): TemplateResult {
    return html`
      <div class="form-row-dual">
        <ha-selector
          .hass=${this.hass}
          .selector=${{
            select: {
              mode: 'dropdown',
              options: [
                { value: 'classic', label: localize('editor.tab.appearance.labels.wave-style-classic') },
                { value: 'realistic', label: localize('editor.tab.appearance.labels.wave-style-realistic') },
                {
                  value: 'realistic-performance',
                  label: localize('editor.tab.appearance.labels.wave-style-realistic-performance'),
                },
              ],
            },
          }}
          .label=${localize('editor.tab.appearance.labels.wave-style')}
          .value=${this._wave_style}
          .configValue=${'wave_style'}
          @value-changed=${this._selectorChanged}
        ></ha-selector>
      </div>
      ${this.renderNumberSlider('wave-height', 'wave_height', this._wave_height, 100, 5)}
      ${this.renderNumberSlider('wave-speed', 'wave_speed', this._wave_speed, 100, 5)}
      <div class="form-row-dual">
        <ha-formfield label=${localize('editor.tab.appearance.labels.random-start')}>
          <ha-switch .checked=${this._random_start === true} @change=${this._toggelRandomStart}> </ha-switch>
        </ha-formfield>
      </div>
      ${this.renderNumberSlider('top-margin', 'top_margin', this._top_margin, 20, 1)}
    `;
  }

  renderShapeTab(): TemplateResult {
    return html`
      <div class="form-row-dual">
        <ha-selector
          .hass=${this.hass}
          .selector=${{
            select: {
              mode: 'dropdown',
              options: [
                { value: '', label: localize('editor.tab.appearance.labels.mask-shape-none') },
                ...MASK_PRESETS.map((p) => ({
                  value: p,
                  label: localize(`editor.tab.appearance.labels.mask-shape-${p}`),
                })),
                { value: 'custom', label: localize('editor.tab.appearance.labels.mask-shape-custom') },
              ],
            },
          }}
          .label=${localize('editor.tab.appearance.labels.mask-shape')}
          .value=${this._mask_shape}
          @value-changed=${this._maskShapeChanged}
        ></ha-selector>
      </div>
      <div class="help-text">${localize('editor.tab.appearance.labels.mask-image-help')}</div>
      ${this._mask_shape === 'custom' ? this.renderMaskImageControl() : ''}
      ${this._mask_image
        ? html`<div class="form-row-dual">
            <ha-selector
              .hass=${this.hass}
              .selector=${{
                select: {
                  mode: 'dropdown',
                  options: [
                    { value: 'contain', label: localize('editor.tab.appearance.labels.mask-size-contain') },
                    { value: 'cover', label: localize('editor.tab.appearance.labels.mask-size-cover') },
                    { value: '100% 100%', label: localize('editor.tab.appearance.labels.mask-size-stretch') },
                  ],
                },
              }}
              .label=${localize('editor.tab.appearance.labels.mask-size')}
              .value=${this._mask_size}
              .configValue=${'mask_size'}
              @value-changed=${this._selectorChanged}
            ></ha-selector>
          </div>`
        : ''}
    `;
  }

  renderNumberSlider(labelKey: string, configValue: string, value: number, max: number, step: number): TemplateResult {
    return html`
      <div class="form-row-dual">
        <ha-selector
          .hass=${this.hass}
          .selector=${{ number: { min: 0, max, step, mode: 'slider' } }}
          .label=${localize(`editor.tab.appearance.labels.${labelKey}`)}
          .value=${value}
          .configValue=${configValue}
          @value-changed=${this._selectorChanged}
        ></ha-selector>
      </div>
    `;
  }

  severitySection(): TemplateResult {
    if (this._severity.length > 0) {
      return html`
        <h3>${localize('editor.tab.appearance.choose-severity')}</h3>
        <ha-icon-button
          .label=${this.hass?.localize('ui.common.add') || 'Add'}
          .path=${mdiPlus}
          @click=${this._addSeverity}
        ></ha-icon-button>
        ${this._severity.map((severity) => this.severityItem(severity))}
      `;
    }
    return html``;
  }

  severityItem(severity: Severity): TemplateResult {
    const severityColor = parseCssColor(severity.color);
    const index = this._severity.indexOf(severity);
    return html`
      <div class="form-row-tripple">
        <ha-selector
          .hass=${this.hass}
          .selector=${{ color_rgb: {} }}
          .value=${severityColor}
          .index=${index}
          @value-changed=${this._severityColorChanged}
        ></ha-selector>

        <ha-textfield
          type="number"
          .configValue=${'full_value'}
          .value=${severity.value}
          .index=${index}
          @change=${this._severityValueChanged}
        ></ha-textfield>

        <ha-icon-button
          .label=${this.hass?.localize('ui.common.remove') || 'Remove'}
          .path=${mdiMinus}
          .index=${index}
          @click=${this._removeSeverity}
        ></ha-icon-button>
      </div>
    `;
  }

  protected _toggleLevelDefaultColor(): void {
    if (!this._config) {
      return;
    }

    if (!this.usesLevelThemeColor) {
      this._config = { ...this._config, level_color: undefined };
    } else {
      this._config = { ...this._config, level_color: this._lastUsedLevelColor };
    }
    fireEvent(this, 'config-changed', { config: this._config });
  }

  protected _toggleBackgroundDefaultColor(): void {
    if (!this._config) {
      return;
    }
    if (!this.usesBackgroundThemeColor) {
      this._config = { ...this._config, background_color: undefined };
    } else {
      this._config = { ...this._config, background_color: this._lastUsedBackgroundColor };
    }
    fireEvent(this, 'config-changed', { config: this._config });
  }

  protected _toggleSeverity(): void {
    if (!this._config) {
      return;
    }
    if (this._severity.length > 0) {
      this._config = { ...this._config, severity: [] };
    } else {
      this._config = { ...this._config, severity: [{ color: '#FF0000', value: 0 }] };
    }
    fireEvent(this, 'config-changed', { config: this._config });
  }

  protected _toggelRandomStart(): void {
    if (!this._config) {
      return;
    }
    this._config = { ...this._config, random_start: !this._random_start };
    fireEvent(this, 'config-changed', { config: this._config });
  }

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

  protected _addSeverity(): void {
    if (!this._config) {
      return;
    }
    this._config = { ...this._config, severity: [...this._severity, { color: '#FF0000', value: 0 }] };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  protected _removeSeverity(ev: Event): void {
    if (!this._config) {
      return;
    }
    const [index] = this._getSeverityItemFormEvent(ev);

    this._config = { ...this._config, severity: this._severity.filter((_, i) => i !== index) };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  protected _severityColorChanged(ev: CustomEvent): void {
    if (!this._config) {
      return;
    }
    const target = ev.target as any;
    let severityItem = this._severity[target.index];
    const color = ev.detail.value;
    const severity = [...this._severity];

    severityItem = { ...severityItem, color };
    severity[target.index] = severityItem;

    this._config = { ...this._config, severity };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  protected _severityValueChanged(ev: Event): void {
    if (!this._config) {
      return;
    }
    const target = ev.target as any;
    const index = target.index;
    const value = target.value;
    let severityItem = this._severity[index];
    const severity = [...this._severity];

    severityItem = { ...severityItem, value: parseFloat(value) };
    severity[index] = severityItem;

    this._config = { ...this._config, severity };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _getSeverityItemFormEvent(ev: Event): [number, any, Severity] {
    const target = ev.target as any;
    const index = target.index;
    return [index, target.value, this._severity[index]];
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

  private _toggleAction(ev: Event): void {
    this._toggleThing(ev, options.actions.options);
  }

  private _toggleOption(ev: Event): void {
    this._toggleThing(ev, options);
  }

  private _toggleThing(ev: Event, optionList: any): void {
    const target = ev.target as any;
    const show = !optionList[target.option].show;
    for (const [key] of Object.entries(optionList)) {
      optionList[key].show = false;
    }
    optionList[target.option].show = show;
    this._toggle = !this._toggle;
  }

  private _levelColorChanged(ev: CustomEvent): void {
    if (!this._config) {
      return;
    }
    // Picker gives [r,g,b]; keep the current opacity so changing the hue doesn't reset it.
    const color = this._withAlpha(ev.detail.value, this._level_opacity);
    this._lastUsedLevelColor = color;
    this._config = { ...this._config, level_color: color };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _backgroundColorChanged(ev: CustomEvent): void {
    if (!this._config) {
      return;
    }
    const color = this._withAlpha(ev.detail.value, this._background_opacity);
    this._lastUsedBackgroundColor = color;
    this._config = { ...this._config, background_color: color };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  // Opacity sliders: pin the colour's RGB (materialising the theme colour) and set its alpha.
  private _levelOpacityChanged(ev: CustomEvent): void {
    if (!this._config) {
      return;
    }
    const rgb = this._effectiveRgb(this._config.level_color, THEME_PRIMARY_COLOR_VARIABLE, LEVEL_COLOR);
    const color = this._withAlpha(rgb, ev.detail.value);
    this._lastUsedLevelColor = color;
    this._config = { ...this._config, level_color: color };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _backgroundOpacityChanged(ev: CustomEvent): void {
    if (!this._config) {
      return;
    }
    const rgb = this._effectiveRgb(this._config.background_color, THEME_BACKGROUND_COLOR_VARIABLE, BACKGROUND_COLOR);
    const color = this._withAlpha(rgb, ev.detail.value);
    this._lastUsedBackgroundColor = color;
    this._config = { ...this._config, background_color: color };
    fireEvent(this, 'config-changed', { config: this._config });
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

  private _maskShapeChanged(ev: CustomEvent): void {
    if (!this._config) {
      return;
    }
    const shape = (ev.detail.value as string) ?? '';

    if (shape === 'custom') {
      this._maskCustom = true;
      // Drop a preset value so the custom URL field starts empty; keep an existing URL.
      if (MASK_PRESETS.includes(this._mask_image)) {
        this._setMaskImage('');
      }
      return;
    }

    this._maskCustom = false;
    this._setMaskImage(shape);
  }

  // HA's picture-upload widget ('+ Pick media', as used by the picture/picture-glance cards) is the
  // cleanest browse/upload control, but its chunk isn't loaded for third-party cards by default.
  // We force-load it (see _ensurePictureUpload); until it's confirmed to render, use a URL text field.
  renderMaskImageControl(): TemplateResult {
    const label = localize('editor.tab.appearance.labels.mask-image');
    if (this._pictureUploadReady) {
      return html`<div class="form-row-dual">
        <ha-picture-upload
          .hass=${this.hass}
          .value=${this._mask_image || null}
          .label=${label}
          select-media
          @change=${this._maskPictureChanged}
          @value-changed=${this._maskPictureChanged}
        ></ha-picture-upload>
      </div>`;
    }
    return html`<div class="form-row-dual">
      <ha-selector
        .hass=${this.hass}
        .selector=${{ text: {} }}
        .label=${label}
        .value=${this._mask_image}
        .configValue=${'mask_image'}
        @value-changed=${this._selectorChanged}
      ></ha-selector>
    </div>`;
  }

  private _maskPictureChanged(ev: Event): void {
    const target = ev.target as { value?: string } | null;
    const value = (ev as CustomEvent).detail?.value ?? target?.value ?? '';
    this._setMaskImage(value || '');
  }

  // ha-picture-upload isn't registered for third-party cards until HA's own picture editor renders
  // (its render fires the lazy import). So: build that editor, mount it off-screen so it renders and
  // registers the widget, then probe a real instance actually paints; otherwise keep the text field.
  private async _ensurePictureUpload(): Promise<void> {
    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-9999px;top:0;width:320px;height:1px;overflow:hidden';
    try {
      const helpers = this._helpers ?? (await (window as any).loadCardHelpers());
      helpers.createCardElement?.({ type: 'picture', image: '' });
      await customElements.whenDefined('hui-picture-card');
      const cls = customElements.get('hui-picture-card') as { getConfigElement?: () => Promise<unknown> } | undefined;
      const pictureEditor = (await cls?.getConfigElement?.()) as (HTMLElement & { hass?: HomeAssistant; setConfig?: (c: unknown) => void }) | undefined;
      if (!pictureEditor) {
        return;
      }
      pictureEditor.hass = this.hass;
      pictureEditor.setConfig?.({ type: 'picture', image: '' });
      holder.appendChild(pictureEditor);
      document.body.appendChild(holder);
      // Wait for the widget to register (bounded, so a future HA change can't hang us here).
      await Promise.race([customElements.whenDefined('ha-picture-upload'), new Promise((r) => setTimeout(r, 4000))]);
      if (!customElements.get('ha-picture-upload')) {
        return;
      }
      const probe = document.createElement('ha-picture-upload') as HTMLElement & { hass?: HomeAssistant };
      probe.hass = this.hass;
      holder.appendChild(probe);
      await new Promise((r) => setTimeout(r, 100));
      this._pictureUploadReady = !!probe.shadowRoot && probe.getBoundingClientRect().height > 0;
    } catch {
      // Any failure here just means we keep the URL text-field fallback.
      this._pictureUploadReady = false;
    } finally {
      holder.remove();
    }
  }

  // Set/clear mask_image; clearing also drops mask_size so 'none' fully resets the mask.
  private _setMaskImage(value: string): void {
    if (!this._config) {
      return;
    }
    const config = { ...this._config };
    if (value) {
      config.mask_image = value;
    } else {
      delete config.mask_image;
      delete config.mask_size;
    }
    this._config = config;
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _selectorChanged(ev: CustomEvent): void {
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

  private _updateConfig(configKey: string, value: any): void {
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
