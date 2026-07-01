/* eslint-disable no-underscore-dangle */ // tab modules read the editor's underscore-prefixed members
import { html, TemplateResult } from 'lit';
import { fireEvent, HomeAssistant } from 'custom-card-helpers';
import { localize } from '../localize/localize';
import { MASK_PRESETS } from '../masks';
import type { FluidLevelBackgroundCardEditor } from '../editor';

export function renderShapeTab(editor: FluidLevelBackgroundCardEditor): TemplateResult {
  return html`
    <div class="form-row-dual">
      <ha-selector
        .hass=${editor.hass}
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
        .value=${editor._mask_shape}
        @value-changed=${(ev: CustomEvent) => maskShapeChanged(editor, ev)}
      ></ha-selector>
    </div>
    <div class="help-text">${localize('editor.tab.appearance.labels.mask-image-help')}</div>
    ${editor._mask_shape === 'custom' ? renderMaskImageControl(editor) : ''}
    ${editor._mask_image
      ? html`<div class="form-row-dual">
          <ha-selector
            .hass=${editor.hass}
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
            .value=${editor._mask_size}
            .configValue=${'mask_size'}
            @value-changed=${editor._selectorChanged}
          ></ha-selector>
        </div>`
      : ''}
  `;
}

// HA's picture-upload widget ('+ Pick media', as used by the picture/picture-glance cards) is the
// cleanest browse/upload control, but its chunk isn't loaded for third-party cards by default.
// We force-load it (see ensurePictureUpload); until it's confirmed to render, use a URL text field.
function renderMaskImageControl(editor: FluidLevelBackgroundCardEditor): TemplateResult {
  const label = localize('editor.tab.appearance.labels.mask-image');
  if (editor._pictureUploadReady) {
    return html`<div class="form-row-dual">
      <ha-picture-upload
        .hass=${editor.hass}
        .value=${editor._mask_image || null}
        .label=${label}
        select-media
        @change=${(ev: Event) => maskPictureChanged(editor, ev)}
        @value-changed=${(ev: Event) => maskPictureChanged(editor, ev)}
      ></ha-picture-upload>
    </div>`;
  }
  return html`<div class="form-row-dual">
    <ha-selector
      .hass=${editor.hass}
      .selector=${{ text: {} }}
      .label=${label}
      .value=${editor._mask_image}
      .configValue=${'mask_image'}
      @value-changed=${editor._selectorChanged}
    ></ha-selector>
  </div>`;
}

function maskShapeChanged(editor: FluidLevelBackgroundCardEditor, ev: CustomEvent): void {
  if (!editor._config) {
    return;
  }
  const shape = (ev.detail.value as string) ?? '';

  if (shape === 'custom') {
    editor._maskCustom = true;
    // Drop a preset value so the custom URL field starts empty; keep an existing URL.
    if (MASK_PRESETS.includes(editor._mask_image)) {
      setMaskImage(editor, '');
    }
    return;
  }

  editor._maskCustom = false;
  setMaskImage(editor, shape);
}

function maskPictureChanged(editor: FluidLevelBackgroundCardEditor, ev: Event): void {
  const target = ev.target as { value?: string } | null;
  const value = (ev as CustomEvent).detail?.value ?? target?.value ?? '';
  setMaskImage(editor, value || '');
}

// Set/clear mask_image; clearing also drops mask_size so 'none' fully resets the mask.
function setMaskImage(editor: FluidLevelBackgroundCardEditor, value: string): void {
  if (value) {
    editor._updateConfig('mask_image', value);
    return;
  }
  if (!editor._config) {
    return;
  }
  // Clearing removes both mask keys in a single write.
  const config = { ...editor._config };
  delete config.mask_image;
  delete config.mask_size;
  editor._config = config;
  fireEvent(editor, 'config-changed', { config: editor._config });
}

// ha-picture-upload isn't registered for third-party cards until HA's own picture editor renders
// (its render fires the lazy import). So: build that editor, mount it off-screen so it renders and
// registers the widget, then probe a real instance actually paints; otherwise keep the text field.
export async function ensurePictureUpload(editor: FluidLevelBackgroundCardEditor): Promise<void> {
  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-9999px;top:0;width:320px;height:1px;overflow:hidden';
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const helpers = editor._helpers ?? (await (window as any).loadCardHelpers());
    helpers.createCardElement?.({ type: 'picture', image: '' });
    await customElements.whenDefined('hui-picture-card');
    const cls = customElements.get('hui-picture-card') as { getConfigElement?: () => Promise<unknown> } | undefined;
    const pictureEditor = (await cls?.getConfigElement?.()) as
      | (HTMLElement & { hass?: HomeAssistant; setConfig?: (c: unknown) => void })
      | undefined;
    if (!pictureEditor) {
      return;
    }
    pictureEditor.hass = editor.hass;
    pictureEditor.setConfig?.({ type: 'picture', image: '' });
    holder.appendChild(pictureEditor);
    document.body.appendChild(holder);
    // Wait for the widget to register (bounded, so a future HA change can't hang us here).
    await Promise.race([customElements.whenDefined('ha-picture-upload'), new Promise((r) => setTimeout(r, 4000))]);
    if (!customElements.get('ha-picture-upload')) {
      return;
    }
    const probe = document.createElement('ha-picture-upload') as HTMLElement & { hass?: HomeAssistant };
    probe.hass = editor.hass;
    holder.appendChild(probe);
    await new Promise((r) => setTimeout(r, 100));
    editor._pictureUploadReady = !!probe.shadowRoot && probe.getBoundingClientRect().height > 0;
  } catch {
    // Any failure here just means we keep the URL text-field fallback.
    editor._pictureUploadReady = false;
  } finally {
    holder.remove();
  }
}
