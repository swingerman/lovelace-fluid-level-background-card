import { ActionConfig, EntityConfig, HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import { LovelaceCard, LovelaceCardConfig } from './lovelace-types';

declare global {
  interface HTMLElementTagNameMap {
    'fluid-level-background-card-editor': LovelaceCardEditor;
    'hui-error-card': LovelaceCard;
  }
}
export interface GUIModeChangedEvent {
  guiMode: boolean;
  guiModeAvailable: boolean;
}

export interface Condition {
  entity: string;
  state?: string;
  state_not?: string;
}

export interface UIConfigChangedEvent extends Event {
  detail: {
    config: LovelaceCardConfig | LovelaceRowConfig;
  };
}

export interface ButtonsRowConfig {
  type: 'buttons';
  entities: Array<string | EntityConfig>;
}
export interface ActionRowConfig extends EntityConfig {
  action_name?: string;
}
export interface EntityFilterEntityConfig extends EntityConfig {
  state_filter?: Array<{ key: string } | string>;
}
export interface DividerConfig {
  type: 'divider';
  style?: Record<string, string>;
}
export interface SectionConfig {
  type: 'section';
  label: string;
}
export interface WeblinkConfig {
  type: 'weblink';
  name?: string;
  icon?: string;
  url: string;
  new_tab?: boolean;
  download?: boolean;
}
export interface TextConfig {
  type: 'text';
  name: string;
  icon?: string;
  text: string;
}
export interface CallServiceConfig extends EntityConfig {
  type: 'call-service';
  service: string;
  service_data?: Record<string, unknown>;
  action_name?: string;
}
export interface ButtonRowConfig extends EntityConfig {
  type: 'button';
  action_name?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}
export interface CastConfig {
  type: 'cast';
  icon?: string;
  name?: string;
  view: string | number;
  dashboard?: string;
  // Hide the row if either unsupported browser or no API available.
  hide_if_unavailable?: boolean;
}
export interface ButtonsRowConfig {
  type: 'buttons';
  entities: Array<string | EntityConfig>;
}
export type LovelaceRowConfig =
  | EntityConfig
  | DividerConfig
  | SectionConfig
  | WeblinkConfig
  | CallServiceConfig
  | CastConfig
  | ButtonRowConfig
  | ButtonsRowConfig
  | ConditionalRowConfig
  | AttributeRowConfig
  | TextConfig;

export interface LovelaceRow extends HTMLElement {
  hass?: HomeAssistant;
  editMode?: boolean;
  setConfig(config: LovelaceRowConfig);
}

export interface ConditionalRowConfig extends EntityConfig {
  row: EntityConfig;
  conditions: Condition[];
}

export interface AttributeRowConfig extends EntityConfig {
  attribute: string;
  prefix?: string;
  suffix?: string;
  //format?: TimestampRenderingFormat;
}

export interface LovelaceRow extends HTMLElement {
  hass?: HomeAssistant;
  editMode?: boolean;
  setConfig(config: LovelaceRowConfig);
}

export interface Severity {
  color: string | number[];
  value: number;
}

export interface FluidLevelBackgroundCardConfig extends LovelaceCardConfig {
  type: string;
  name?: string;
  card: LovelaceCardConfig | undefined;
  show_warning?: boolean;
  show_error?: boolean;
  test_gui?: boolean;
  entity?: string;
  fill_entity?: string;
  full_value?: number;
  background_color?: number[] | string;
  level_color?: number[] | string;
  severity: Severity[];
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  random_start?: boolean;
  allow_click_through?: boolean;
}
