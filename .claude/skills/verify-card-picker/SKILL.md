---
name: verify-card-picker
description: Verify the Fluid Level Background Card shows up and adds correctly in Home Assistant's entity-first card picker (2026.6+). Use when asked to "verify the card picker", "test getEntitySuggestion in the UI", "check the card appears in the picker", or after changing the customCards registration / getEntitySuggestion / getStubConfig.
---

# Verify the card in HA's entity-first card picker

End-to-end check that our card appears under **Community** in HA 2026.6's
"By entity" Add-card flow and adds with the config `getEntitySuggestion`
returns. Driven via the Playwright MCP browser tools against the local Docker HA.

The contract-level check (no HA needed) lives in `tests/e2e/card-picker.spec.ts`
— run that first; only do this UI flow when you need to see the real picker.

## 0. Build + bring HA up

```bash
npm run rollup                                   # refresh dist/ (mounted into HA)
docker compose -f docker-compose.test.yml up -d homeassistant
# poll until ready (image is large on first pull):
for i in $(seq 1 60); do c=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8123/); [ "$c" != "000" ] && { echo "HA $c"; break; }; sleep 4; done
```

HA is pinned to `2026.6` in `Dockerfile.test` (first release with the
entity-first picker). `dist/` is mounted at
`/config/www/community/fluid-level-background-card/`, served at
`/local/community/fluid-level-background-card/fluid-level-background-card.js`.

## 1. Get to a logged-in session

`tests/fixtures/config/.storage` is gitignored but **persists on the host**
between runs. Symptom: a login screen for an unknown account. Reset to a clean,
reproducible state:

```bash
docker compose -f docker-compose.test.yml down
rm -rf tests/fixtures/config/.storage
docker compose -f docker-compose.test.yml up -d homeassistant   # then re-poll
```

Then onboard via the browser (creds per global note: **miklos / boogie**):
navigate `http://localhost:8123/` → "Create my smart home" → fill Name/Username/Password/Confirm
→ "Create account" → Next (location) → Next (country) → Next (analytics) →
"Finish" → log back in with miklos/boogie.

Use `browser_snapshot` to get fresh `ref`s before each click — refs change per snapshot.

## 2. Register the card as a Lovelace resource + make a numeric entity

Two gotchas, both fixed via the HA websocket API in the page (`browser_evaluate`):

- **The default `/home/overview` is a strategy dashboard — it does NOT load
  custom JS resources.** You must use a *classic storage* dashboard.
- The fixture's `input_number.*` entities aren't defined in
  `configuration.yaml`, so create one.

```js
// browser_evaluate — run while a page with home-assistant is loaded
async () => {
  const hass = document.querySelector('home-assistant').hass;
  // register the card resource (idempotent-ish; check first)
  const url = '/local/community/fluid-level-background-card/fluid-level-background-card.js';
  const res = await hass.connection.sendMessagePromise({ type: 'lovelace/resources' });
  if (!res.find(r => r.url === url))
    await hass.connection.sendMessagePromise({ type: 'lovelace/resources/create', res_type: 'module', url });
  // a numeric helper to pick in the picker
  await hass.connection.sendMessagePromise({
    type: 'input_number/create', name: 'Test Battery',
    min: 0, max: 100, step: 1, initial: 55, unit_of_measurement: '%', mode: 'slider'
  });
  // a classic storage dashboard (strategy dashboards skip resources)
  await hass.connection.sendMessagePromise({
    type: 'lovelace/dashboards/create', url_path: 'test-dash', title: 'Test Dash', mode: 'storage', show_in_sidebar: true
  });
  return 'ok';
}
```

Navigate to `http://localhost:8123/test-dash` and confirm the resource loaded:

```js
() => {
  const e = (window.customCards||[]).find(c => c.type === 'fluid-level-background-card');
  return { defined: !!customElements.get('fluid-level-background-card'),
           preview: e?.preview, hasSuggestion: typeof e?.getEntitySuggestion === 'function' };
}
// expect { defined:true, preview:true, hasSuggestion:true }
```

## 3. Drive the picker

1. Click **Edit dashboard** (top-right pencil) → URL gets `?edit=1`.
2. Click **Add card**.
3. Dialog "Add to dashboard" opens on the **By entity** tab.
4. Type `Test Battery` in **Search entities**, click the **Test Battery / Input number** result.
5. Suggestions appear; scroll to the **Community** group → **Fluid Level Background Card**
   renders a live preview ("Test Battery 55%"). Screenshot it.
6. Click it → card is added directly to the dashboard.

## 4. Assert what was added

```js
() => {
  const find = (root, tag, acc=[]) => { root.querySelectorAll('*').forEach(el => {
    if (el.tagName.toLowerCase()===tag) acc.push(el); if (el.shadowRoot) find(el.shadowRoot, tag, acc); }); return acc; };
  const c = find(document, 'fluid-level-background-card')[0];
  return c?.config;  // expect type custom:fluid-level-background-card, entity input_number.test_battery, card {type:tile,...}
}
```

## Teardown

```bash
docker compose -f docker-compose.test.yml down
```

## Gotchas (why this isn't a committed UI spec)

- Needs the full HA stack + onboarding + leftover-`.storage` reset — brittle, slow.
- The bundle reads `localStorage` at load time, so it can't run on `about:blank`
  (only a real origin). The contract spec loads it from the dev-server origin.
- Resource loading is per-dashboard and skipped by strategy dashboards.
