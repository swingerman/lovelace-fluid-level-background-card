# Lovelace Fluid Level Background Card by [@swingerman](https://www.github.com/swingerman)

A card that wraps other card or cards and renders a fluid level background behind them.

---

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://github.com/swingerman/lovelace-fluid-level-background-card) ![GitHub release (latest by date)](https://img.shields.io/github/downloads/swingerman/lovelace-fluid-level-background-card/v0.0.1-beta7/total?style=for-the-badge)
[![Donate](https://img.shields.io/badge/Donate-PayPal-yellowgreen?style=for-the-badge&logo=paypal)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=S6NC9BYVDDJMA&source=url)

<div style="display: flex; margin-bottom: 20px;">

<img style="margin-right: 30px; border: 5px solid #767676;border-radius: 10px;box-sizing: border-box;" src="https://github.com/swingerman/lovelace-fluid-level-background-card/blob/master/docs/assets/fluid-person-card.gif?raw=true" alt="Demo">

<div>

```yaml
type: custom:fluid-level-background-card
card:
    type: glance
    entities:
    - entity: person.xxx
        style: |
        state-badge { width: 60px; height: 60px }
entity: sensor.battery_level
```

</div>
</div>

## How To Install

Install it using HACS:

1. add custom repository: https://github.com/swingerman/lovelace-fluid-level-background-card
2. reload lvoelace

## How To Use

Note: This card is a wrapper. This means that it's designed to wrap other existing lovelace cards, so you welcome to use any card (including grid and stack cards)

1. Add this card using the UI (serach for fluid level background card)
2. Select the card you would like to render for your entities
3. Select the level entity - this will control the level

## Known Issues

- Controlling click/tap actions is not yet configurable. Currently on tap the "level" entity's more info will trigger.
- The editor UI is not so user friendly, the level entity selector is below the card type selector
- You cannot change the color of the floud at this point
- You cannot fine tune the fluid effect at this point

## Planned Features

- Level based colors
- Change default color
- Bubbles if level increases
- Better editor UI

## Support

Hey dude! Help me out for a couple of :beers: or a :coffee:!

[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=S6NC9BYVDDJMA&source=url)

[![coffee](https://www.buymeacoffee.com/assets/img/custom_images/black_img.png)](https://www.buymeacoffee.com/swingerman)

## Options

TBD
