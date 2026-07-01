/* eslint-disable no-underscore-dangle */ // tab modules read the editor's underscore-prefixed members
import { html, TemplateResult } from 'lit';
import { localize } from '../localize/localize';
import type { FluidLevelBackgroundCardEditor } from '../editor';

// A 0..max slider bound to a numeric config key via the editor's shared _selectorChanged.
function renderNumberSlider(
  editor: FluidLevelBackgroundCardEditor,
  labelKey: string,
  configValue: string,
  value: number,
  max: number,
  step: number,
): TemplateResult {
  return html`
    <div class="form-row-dual">
      <ha-selector
        .hass=${editor.hass}
        .selector=${{ number: { min: 0, max, step, mode: 'slider' } }}
        .label=${localize(`editor.tab.appearance.labels.${labelKey}`)}
        .value=${value}
        .configValue=${configValue}
        @value-changed=${editor._selectorChanged}
      ></ha-selector>
    </div>
  `;
}

export function renderWavesTab(editor: FluidLevelBackgroundCardEditor): TemplateResult {
  return html`
    <div class="form-row-dual">
      <ha-selector
        .hass=${editor.hass}
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
        .value=${editor._wave_style}
        .configValue=${'wave_style'}
        @value-changed=${editor._selectorChanged}
      ></ha-selector>
    </div>
    ${renderNumberSlider(editor, 'wave-height', 'wave_height', editor._wave_height, 100, 5)}
    ${renderNumberSlider(editor, 'wave-speed', 'wave_speed', editor._wave_speed, 100, 5)}
    <div class="form-row-dual">
      <ha-formfield label=${localize('editor.tab.appearance.labels.random-start')}>
        <ha-switch .checked=${editor._random_start === true} @change=${() => toggleRandomStart(editor)}> </ha-switch>
      </ha-formfield>
    </div>
    ${renderNumberSlider(editor, 'top-margin', 'top_margin', editor._top_margin, 20, 1)}
  `;
}

function toggleRandomStart(editor: FluidLevelBackgroundCardEditor): void {
  editor._updateConfig('random_start', !editor._random_start);
}
