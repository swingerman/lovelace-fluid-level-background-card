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
    slug: 'appearance',
    localizedLabel: localize('editor.tab.appearance.title'),
    renderer: 'renderAppearanceTab',
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

  get _allow_click_through(): boolean {
    return this._config?.allow_click_through || false;
  }

  private _lastUsedBackgroundColor: number[] | undefined;
  private _lastUsedLevelColor: number[] | undefined;

  get usesLevelThemeColor(): boolean {
    return this._config?.level_color === undefined;
  }

  get usesBackgroundThemeColor(): boolean {
    return this._config?.background_color === undefined;
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._helpers) {
      return html``;
    }

    // The climate more-info has ha-switch and paper-dropdown-menu elements that are lazy loaded unless explicitly done here
    this._helpers.importMoreInfoControl('climate');

    const tab = editorTabs[this._selectedTab];

    return this[tab.renderer] && tab.enabled
      ? html`
          <div class="card-config">
            ${this.renderToolbar()}
            <div id="editor">${this[tab.renderer]()}</div>
          </div>
        `
      : html``;
  }

  private _initialize(): void {
    if (this.hass === undefined) return;
    if (this._config === undefined) return;
    if (this._helpers === undefined) return;
    this._initialized = true;
  }

  renderToolbar(): TemplateResult {
    const selected = this._selectedTab;
    const numTabs = editorTabs.length;

    return html` <div class="toolbar">
      <paper-tabs .selected=${selected} @iron-activate=${this._handleSelectedCard}>
        ${editorTabs.map((_tab) => (_tab.enabled ? html` <paper-tab> ${_tab.localizedLabel} </paper-tab> ` : null))}
      </paper-tabs>
      <paper-tabs
        id="add-card"
        .selected=${selected === numTabs ? '0' : undefined}
        @iron-activate=${this._handleSelectedCard}
      >
      </paper-tabs>
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
    const actions = ['more-info', 'toggle', 'navigate', 'url', 'call-service', 'none'];
    return html`
      <div class="form-row-dual">
        <ha-formfield label=${localize('editor.tab.actions.labels.allow-click-through')}>
          <ha-switch .checked=${this._allow_click_through === true} @change=${this._toggleClickThrough}> </ha-switch>
        </ha-formfield>
      </div>
      <div class="help-text">${localize('editor.tab.actions.labels.allow-click-through-help')}</div>

      <hui-action-editor
        .label="${this.hass?.localize('ui.panel.lovelace.editor.card.generic.tap_action')} (${this.hass?.localize(
          'ui.panel.lovelace.editor.card.config.optional',
        )})"
        .hass=${this.hass}
        .config=${this._tap_action}
        .actions=${actions}
        .configValue=${'tap_action'}
        .tooltipText=${this.hass?.localize('ui.panel.lovelace.editor.card.button.default_action_help')}
        @value-changed=${this._actionChanged}
        .disabled=${this._allow_click_through}
      ></hui-action-editor>
      <hui-action-editor
        .label="${this.hass?.localize('ui.panel.lovelace.editor.card.generic.hold_action')} (${this.hass?.localize(
          'ui.panel.lovelace.editor.card.config.optional',
        )})"
        .hass=${this.hass}
        .config=${this._hold_action}
        .actions=${actions}
        .configValue=${'hold_action'}
        .tooltipText=${this.hass?.localize('ui.panel.lovelace.editor.card.button.default_action_help')}
        @value-changed=${this._actionChanged}
        .disabled=${this._allow_click_through}
      ></hui-action-editor>
    `;
  }

  renderAppearanceTab(): TemplateResult {
    const themePrimaryColor = getThemeColor(THEME_PRIMARY_COLOR_VARIABLE, LEVEL_COLOR);
    const themeBackgroundColor = getThemeColor(THEME_BACKGROUND_COLOR_VARIABLE, BACKGROUND_COLOR);

    return html`
      <h3>${localize('editor.tab.appearance.choose-colors')}</h3>
      <p>${localize('editor.tab.appearance.labels.color-description')}</p>
      <div class="form-row-dual">
        <ha-selector
          .hass=${this.hass}
          .selector=${{ color_rgb: {} }}
          .label=${localize('editor.tab.appearance.labels.level-color')}
          .value=${this._config?.level_color || themePrimaryColor}
          .configValue=${'level_color'}
          @value-changed=${this._levelColorChanged}
        ></ha-selector>
        <ha-formfield label=${localize('editor.tab.appearance.labels.use-theme-color')}>
          <ha-switch .checked=${this.usesLevelThemeColor} @change=${this._toggleLevelDefaultColor}> </ha-switch>
        </ha-formfield>
      </div>
      <div class="form-row-dual">
        <ha-selector
          .hass=${this.hass}
          .selector=${{ color_rgb: {} }}
          .label=${localize('editor.tab.appearance.labels.background-color')}
          .value=${this._config?.background_color || themeBackgroundColor}
          .configValue=${'background_color'}
          @value-changed=${this._backgroundColorChanged}
        ></ha-selector>
        <ha-formfield label=${localize('editor.tab.appearance.labels.use-theme-color')}>
          <ha-switch .checked=${this.usesBackgroundThemeColor} @change=${this._toggleBackgroundDefaultColor}>
          </ha-switch>
        </ha-formfield>
      </div>
      <div class="form-row-dual">
        <ha-formfield label=${localize('editor.tab.appearance.labels.random-start')}>
          <ha-switch .checked=${this._random_start === true} @change=${this._toggelRandomStart}> </ha-switch>
        </ha-formfield>
      </div>
      <div class="form-row-dual">
        <ha-formfield label=${localize('editor.tab.appearance.labels.use-severity')}>
          <ha-switch .checked=${this._severity.length > 0} @change=${this._toggleSeverity}> </ha-switch>
        </ha-formfield>
      </div>

      ${this.severitySection()}
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
    const newValue = !this._allow_click_through;
    this._config = { ...this._config, allow_click_through: newValue };

    // If enabling click-through, clear any existing tap/hold actions since they won't work
    if (newValue) {
      this._config = {
        ...this._config,
        tap_action: { action: 'none' },
        hold_action: { action: 'none' },
      };
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

  protected _removeSeverity(ev): void {
    if (!this._config) {
      return;
    }
    const [index] = this._getSeverityItemFormEvent(ev);

    this._config = { ...this._config, severity: this._severity.filter((_, i) => i !== index) };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  protected _severityColorChanged(ev): void {
    if (!this._config) {
      return;
    }
    let severityItem = this._severity[ev.target.index];
    const color = ev.detail.value;
    const severity = [...this._severity];

    severityItem = { ...severityItem, color };
    severity[ev.target.index] = severityItem;

    this._config = { ...this._config, severity };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  protected _severityValueChanged(ev): void {
    if (!this._config) {
      return;
    }
    const index = ev.target.index;
    const value = ev.target.value;
    let severityItem = this._severity[index];
    const severity = [...this._severity];

    severityItem = { ...severityItem, value: parseFloat(value) };
    severity[index] = severityItem;

    this._config = { ...this._config, severity };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _getSeverityItemFormEvent(ev): [number, any, Severity] {
    const index = ev.target.index;
    return [index, ev.target.value, this._severity[index]];
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  protected _handleCardPicked(ev): void {
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
  protected _handleConfigChanged(ev): void {
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

  private _toggleAction(ev): void {
    this._toggleThing(ev, options.actions.options);
  }

  private _toggleOption(ev): void {
    this._toggleThing(ev, options);
  }

  private _toggleThing(ev, optionList): void {
    const show = !optionList[ev.target.option].show;
    for (const [key] of Object.entries(optionList)) {
      optionList[key].show = false;
    }
    optionList[ev.target.option].show = show;
    this._toggle = !this._toggle;
  }

  private _levelColorChanged(ev: CustomEvent): void {
    if (!this._config) {
      return;
    }
    const color = ev.detail.value;
    this._lastUsedLevelColor = color;
    this._config = { ...this._config, level_color: color };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _backgroundColorChanged(ev: CustomEvent): void {
    if (!this._config) {
      return;
    }
    const color = ev.detail.value;
    this._lastUsedBackgroundColor = color;
    this._config = { ...this._config, background_color: color };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _valueChanged(ev): void {
    if (!this._config || !this.hass || ev.target.value === '') {
      return;
    }
    const target = ev.target;
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

  private _actionChanged(ev): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target!;
    const value = ev.detail.value;

    if (this[`_${target.configValue}`] === value) {
      return;
    }
    let newConfig;
    if (target.configValue) {
      if (value !== false && !value) {
        newConfig = { ...this._config };
        delete newConfig[target.configValue!];
      } else {
        newConfig = {
          ...this._config,
          [target.configValue!]: value,
        };
      }
    }
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _handleSelectedCard(ev) {
    this._selectedTab = parseInt(ev.detail.selected, 10);
  }

  static get styles(): CSSResultGroup {
    return css`
      .toolbar {
        display: flex;
        --paper-tabs-selection-bar-color: var(--primary-color);
        --paper-tab-ink: var(--primary-color);
      }
      paper-tabs {
        display: flex;
        font-size: 14px;
        flex-grow: 1;
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
