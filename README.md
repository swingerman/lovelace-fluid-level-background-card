# Lovelace Fluid Level Background Card by [@swingerman](https://www.github.com/swingerman)

A card that wraps other card or cards and renders a fluid level background behind them.

---

[![hacs_badge](https://img.shields.io/badge/HACS-Default-41BDF5.svg?style=for-the-badge)](https://github.com/swingerman/lovelace-fluid-level-background-card) ![GitHub release (latest by date)](https://img.shields.io/github/downloads/swingerman/lovelace-fluid-level-background-card/total?style=for-the-badge)
[![Donate](https://img.shields.io/badge/Donate-PayPal-yellowgreen?style=for-the-badge&logo=paypal)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=S6NC9BYVDDJMA&source=url)

The fluid effect is an improved version of [@aarcorcaci](https://github.com/aarcoraci)'s [fluid-meter](https://github.com/aarcoraci/javascript-fluid-meter), improved and ported to typescript.

<img style="border: 5px solid #767676;border-radius: 10px;box-sizing: border-box;" src="https://github.com/swingerman/lovelace-fluid-level-background-card/blob/master/docs/assets/grid-cards.gif?raw=true" alt="Demo">

### Example config

```yaml
type: custom:fluid-level-background-card
card:
    type: glance
    entities:
    - entity: person.john_doe
entity: sensor.battery_level
fill_entity: binary_sensor.charging
full_value: 100
level_color:
      - 68
      - 115
      - 159
background_color:
      - 255
      - 255
      - 0
```

### Supported Color Formats

```yaml
level_color: [68,115,159]
level_color:
      - 255
      - 255
      - 0
level_color: red
level_color: 'red'
level_color: '#ff0000'
level_color: var(--red-color)
level_color: 'var(--red-color)'
level_color: rgb(242,142,28) # or rgba()
level_color: 'rgb(242,142,28)' # or rgba()
```

## How To Install

Install it using HACS:

1. Add custom repository: <https://github.com/swingerman/lovelace-fluid-level-background-card>
2. Reload lovelace

## How To Use

Note: This card is a wrapper. This means that it's designed to wrap other existing lovelace cards, so you welcome to use any card (including grid and stack cards)

1. Add this card using the UI (serach for fluid level background card)
2. Select the card you would like to render for your entities
3. Select the level entity - this will control the level
4. select a fill state entity - this will enable bubbles while on
5. set the dsired color for the fluid leve
6. set the desired color for the background
7. set actions. Note: as this card is a wrapper only set actions if you aim to interact with the level entity, otherwise set actions to none.

## Use sensor value instead percentage

If you want to use a sensor value instead of a percentage, you can use the `full_value` property to set the maximum value of the sensor. The card will then calculate the percentage based on the sensor value and the `full_value` property.

## Support

Hey dude! Help me out for a couple of :beers: or a :coffee:!

[![Donate](https://img.shields.io/badge/Donate-PayPal-yellowgreen?style=for-the-badge&logo=paypal)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=S6NC9BYVDDJMA&source=url)
[![coffee](https://www.buymeacoffee.com/assets/img/custom_images/black_img.png)](https://www.buymeacoffee.com/swingerman)
