/* eslint-disable no-underscore-dangle */ // tab modules read the editor's underscore-prefixed members
import { html, TemplateResult } from 'lit';
import { localize } from '../localize/localize';
import { parseCssColor } from '../utils/color';
import { getThemeColor } from '../utils/theme-parser';
import { clamp } from '../utils/clamp';
import { BACKGROUND_COLOR, LEVEL_COLOR, THEME_BACKGROUND_COLOR_VARIABLE, THEME_PRIMARY_COLOR_VARIABLE } from '../const';
import { mdiMinus, mdiPlus } from '@mdi/js';
import { Severity } from '../types';
import type { FluidLevelBackgroundCardEditor } from '../editor';

// RGB of a config colour (array/string/unset → resolve theme as the fallback), always 3 elements.
function effectiveRgb(value: number[] | string | undefined, themeVar: string, fallback: number[]): number[] {
  if (Array.isArray(value)) return value.slice(0, 3);
  if (typeof value === 'string') {
    const parsed = parseCssColor(value);
    if (parsed) return parsed.slice(0, 3);
  }
  return getThemeColor(themeVar, fallback).slice(0, 3);
}

// Combine rgb + opacity%; drop the alpha element when fully opaque to keep configs tidy.
function withAlpha(rgb: number[], pct: number): number[] {
  const a = clamp(Math.round(pct), 0, 100) / 100;
  return a >= 1 ? rgb.slice(0, 3) : [...rgb.slice(0, 3), a];
}

export function renderColorsTab(editor: FluidLevelBackgroundCardEditor): TemplateResult {
  return html`
    <h3>${localize('editor.tab.appearance.choose-colors')}</h3>
    <p>${localize('editor.tab.appearance.labels.color-description')}</p>
    <div class="form-row-dual">
      <ha-selector
        .hass=${editor.hass}
        .selector=${{ color_rgb: {} }}
        .label=${localize('editor.tab.appearance.labels.level-color')}
        .value=${effectiveRgb(editor._config?.level_color, THEME_PRIMARY_COLOR_VARIABLE, LEVEL_COLOR)}
        .configValue=${'level_color'}
        @value-changed=${(ev: CustomEvent) => levelColorChanged(editor, ev)}
      ></ha-selector>
      <ha-formfield label=${localize('editor.tab.appearance.labels.use-theme-color')}>
        <ha-switch .checked=${editor.usesLevelThemeColor} @change=${() => toggleLevelDefaultColor(editor)}> </ha-switch>
      </ha-formfield>
    </div>
    ${renderOpacitySlider(editor, 'level-opacity', editor._level_opacity, (ev) => levelOpacityChanged(editor, ev))}
    <div class="form-row-dual">
      <ha-selector
        .hass=${editor.hass}
        .selector=${{ color_rgb: {} }}
        .label=${localize('editor.tab.appearance.labels.background-color')}
        .value=${effectiveRgb(editor._config?.background_color, THEME_BACKGROUND_COLOR_VARIABLE, BACKGROUND_COLOR)}
        .configValue=${'background_color'}
        @value-changed=${(ev: CustomEvent) => backgroundColorChanged(editor, ev)}
      ></ha-selector>
      <ha-formfield label=${localize('editor.tab.appearance.labels.use-theme-color')}>
        <ha-switch .checked=${editor.usesBackgroundThemeColor} @change=${() => toggleBackgroundDefaultColor(editor)}>
        </ha-switch>
      </ha-formfield>
    </div>
    ${renderOpacitySlider(
      editor,
      'background-opacity',
      editor._background_opacity,
      (ev) => backgroundOpacityChanged(editor, ev),
    )}
    <div class="form-row-dual">
      <ha-formfield label=${localize('editor.tab.appearance.labels.use-severity')}>
        <ha-switch .checked=${editor._severity.length > 0} @change=${() => toggleSeverity(editor)}> </ha-switch>
      </ha-formfield>
    </div>

    ${severitySection(editor)}
  `;
}

function renderOpacitySlider(
  editor: FluidLevelBackgroundCardEditor,
  labelKey: string,
  value: number,
  handler: (ev: CustomEvent) => void,
): TemplateResult {
  return html`
    <div class="form-row-dual">
      <ha-selector
        .hass=${editor.hass}
        .selector=${{ number: { min: 0, max: 100, step: 1, mode: 'slider' } }}
        .label=${localize(`editor.tab.appearance.labels.${labelKey}`)}
        .value=${value}
        @value-changed=${handler}
      ></ha-selector>
    </div>
  `;
}

function severitySection(editor: FluidLevelBackgroundCardEditor): TemplateResult {
  if (editor._severity.length > 0) {
    return html`
      <h3>${localize('editor.tab.appearance.choose-severity')}</h3>
      <ha-icon-button
        .label=${editor.hass?.localize('ui.common.add') || 'Add'}
        .path=${mdiPlus}
        @click=${() => addSeverity(editor)}
      ></ha-icon-button>
      ${editor._severity.map((severity) => severityItem(editor, severity))}
    `;
  }
  return html``;
}

function severityItem(editor: FluidLevelBackgroundCardEditor, severity: Severity): TemplateResult {
  const severityColor = parseCssColor(severity.color);
  const index = editor._severity.indexOf(severity);
  return html`
    <div class="form-row-tripple">
      <ha-selector
        .hass=${editor.hass}
        .selector=${{ color_rgb: {} }}
        .value=${severityColor}
        .index=${index}
        @value-changed=${(ev: CustomEvent) => severityColorChanged(editor, ev)}
      ></ha-selector>

      <ha-textfield
        type="number"
        .configValue=${'full_value'}
        .value=${severity.value}
        .index=${index}
        @change=${(ev: Event) => severityValueChanged(editor, ev)}
      ></ha-textfield>

      <ha-icon-button
        .label=${editor.hass?.localize('ui.common.remove') || 'Remove'}
        .path=${mdiMinus}
        .index=${index}
        @click=${(ev: Event) => removeSeverity(editor, ev)}
      ></ha-icon-button>
    </div>
  `;
}

function levelColorChanged(editor: FluidLevelBackgroundCardEditor, ev: CustomEvent): void {
  // Picker gives [r,g,b]; keep the current opacity so changing the hue doesn't reset it.
  const color = withAlpha(ev.detail.value, editor._level_opacity);
  editor._lastUsedLevelColor = color;
  editor._updateConfig('level_color', color);
}

function backgroundColorChanged(editor: FluidLevelBackgroundCardEditor, ev: CustomEvent): void {
  const color = withAlpha(ev.detail.value, editor._background_opacity);
  editor._lastUsedBackgroundColor = color;
  editor._updateConfig('background_color', color);
}

// Opacity sliders: pin the colour's RGB (materialising the theme colour) and set its alpha.
function levelOpacityChanged(editor: FluidLevelBackgroundCardEditor, ev: CustomEvent): void {
  const rgb = effectiveRgb(editor._config?.level_color, THEME_PRIMARY_COLOR_VARIABLE, LEVEL_COLOR);
  const color = withAlpha(rgb, ev.detail.value);
  editor._lastUsedLevelColor = color;
  editor._updateConfig('level_color', color);
}

function backgroundOpacityChanged(editor: FluidLevelBackgroundCardEditor, ev: CustomEvent): void {
  const rgb = effectiveRgb(editor._config?.background_color, THEME_BACKGROUND_COLOR_VARIABLE, BACKGROUND_COLOR);
  const color = withAlpha(rgb, ev.detail.value);
  editor._lastUsedBackgroundColor = color;
  editor._updateConfig('background_color', color);
}

// Theme on → restore the last explicit colour; theme off → drop the colour (undefined = use theme).
function toggleLevelDefaultColor(editor: FluidLevelBackgroundCardEditor): void {
  editor._updateConfig('level_color', editor.usesLevelThemeColor ? editor._lastUsedLevelColor : undefined);
}

function toggleBackgroundDefaultColor(editor: FluidLevelBackgroundCardEditor): void {
  editor._updateConfig(
    'background_color',
    editor.usesBackgroundThemeColor ? editor._lastUsedBackgroundColor : undefined,
  );
}

function toggleSeverity(editor: FluidLevelBackgroundCardEditor): void {
  editor._updateConfig('severity', editor._severity.length > 0 ? [] : [{ color: '#FF0000', value: 0 }]);
}

function addSeverity(editor: FluidLevelBackgroundCardEditor): void {
  editor._updateConfig('severity', [...editor._severity, { color: '#FF0000', value: 0 }]);
}

function removeSeverity(editor: FluidLevelBackgroundCardEditor, ev: Event): void {
  const index = (ev.target as unknown as { index?: number }).index;
  editor._updateConfig(
    'severity',
    editor._severity.filter((_, i) => i !== index),
  );
}

function severityColorChanged(editor: FluidLevelBackgroundCardEditor, ev: CustomEvent): void {
  const index = (ev.target as unknown as { index: number }).index;
  const severity = [...editor._severity];
  severity[index] = { ...severity[index], color: ev.detail.value };
  editor._updateConfig('severity', severity);
}

function severityValueChanged(editor: FluidLevelBackgroundCardEditor, ev: Event): void {
  const target = ev.target as unknown as { index: number; value: string };
  const severity = [...editor._severity];
  severity[target.index] = { ...severity[target.index], value: Number.parseFloat(target.value) };
  editor._updateConfig('severity', severity);
}
