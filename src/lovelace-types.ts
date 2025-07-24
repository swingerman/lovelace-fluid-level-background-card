import { HomeAssistant } from 'custom-card-helpers';

export type LovelaceLayoutOptions = {
  grid_columns?: number;
  grid_rows?: number;
};

export interface LovelaceCard extends HTMLElement {
  hass?: HomeAssistant;
  isPanel?: boolean;
  editMode?: boolean;
  getCardSize(): number | Promise<number>;
  getLayoutOptions?(): LovelaceLayoutOptions;
  setConfig(config: LovelaceCardConfig): void;
}

export interface LovelaceCardConfig {
  index?: number;
  view_index?: number;
  view_layout?: unknown;
  layout_options?: LovelaceLayoutOptions;
  type: string;
  [key: string]: unknown;
}
