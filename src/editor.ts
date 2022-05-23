/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, css, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  HomeAssistant,
  fireEvent,
  LovelaceCardEditor,
  ActionConfig,
  LovelaceConfig,
  HASSDomEvent,
  LovelaceCardConfig,
} from 'custom-card-helpers';

import { FluidLevelBackgroundCardConfig, GUIModeChangedEvent } from './types';
import { localize } from './localize/localize';

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
    slug: 'actions',
    localizedLabel: localize('editor.tab.actions'),
    renderer: 'renderActionsTab',
    enabled: false,
  },
  {
    slug: 'appearance',
    localizedLabel: localize('editor.tab.appearance'),
    renderer: 'renderAppearanceTab',
    enabled: false,
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

  //@property() protected _card?: LovelaceCard;

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
    return this._config?.tap_action || { action: 'more-info' };
  }

  get _hold_action(): ActionConfig {
    return this._config?.hold_action || { action: 'none' };
  }

  get _double_tap_action(): ActionConfig {
    return this._config?.double_tap_action || { action: 'none' };
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
          <mwc-button @click=${this._handleCardDropped}>Choose a differnt card</mwc-button>
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
            include-domains='["input_boolean","switch", "sensor"]'
            @value-changed=${this._valueChanged}
            allow-custom-entity
          ></ha-entity-picker>
        </div>
      </div>
    `;
  }

  renderActionsTab(): TemplateResult {
    return html`
      <div class="values">
        <div class="option" @click=${this._toggleAction} .option=${'tap'}>
          <div class="row">
            <ha-icon .icon=${`mdi:${options.actions.options.tap.icon}`}></ha-icon>
            <div class="title">${options.actions.options.tap.name}</div>
          </div>
          <div class="secondary">${options.actions.options.tap.secondary}</div>
        </div>
        ${options.actions.options.tap.show
          ? html`
              <div class="values">
                <paper-item>Action Editors Coming Soon</paper-item>
              </div>
            `
          : ''}
        <div class="option" @click=${this._toggleAction} .option=${'hold'}>
          <div class="row">
            <ha-icon .icon=${`mdi:${options.actions.options.hold.icon}`}></ha-icon>
            <div class="title">${options.actions.options.hold.name}</div>
          </div>
          <div class="secondary">${options.actions.options.hold.secondary}</div>
        </div>
        ${options.actions.options.hold.show
          ? html`
              <div class="values">
                <paper-item>Action Editors Coming Soon</paper-item>
              </div>
            `
          : ''}
        <div class="option" @click=${this._toggleAction} .option=${'double_tap'}>
          <div class="row">
            <ha-icon .icon=${`mdi:${options.actions.options.double_tap.icon}`}></ha-icon>
            <div class="title">${options.actions.options.double_tap.name}</div>
          </div>
          <div class="secondary">${options.actions.options.double_tap.secondary}</div>
        </div>
        ${options.actions.options.double_tap.show
          ? html`
              <div class="values">
                <paper-item>Action Editors Coming Soon</paper-item>
              </div>
            `
          : ''}
      </div>
    `;
  }

  renderAppearanceTab(): TemplateResult {
    return html`
      <div class="values">
        <paper-input
          label="Name (Optional)"
          .value=${this._name}
          .configValue=${'name'}
          @value-changed=${this._valueChanged}
        ></paper-input>
        <br />
        <ha-formfield .label=${`Toggle warning ${this._show_warning ? 'off' : 'on'}`}>
          <ha-switch
            .checked=${this._show_warning !== false}
            .configValue=${'show_warning'}
            @change=${this._valueChanged}
          ></ha-switch>
        </ha-formfield>
        <ha-formfield .label=${`Toggle error ${this._show_error ? 'off' : 'on'}`}>
          <ha-switch
            .checked=${this._show_error !== false}
            .configValue=${'show_error'}
            @change=${this._valueChanged}
          ></ha-switch>
        </ha-formfield>
      </div>
    `;
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
