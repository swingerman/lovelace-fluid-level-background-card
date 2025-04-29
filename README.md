# Lovelace Fluid Level Background Card by [@swingerman](https://www.github.com/swingerman)

[![hacs_badge](https://img.shields.io/badge/HACS-Default-41BDF5.svg?style=for-the-badge)](https://github.com/swingerman/lovelace-fluid-level-background-card) ![GitHub release (latest by date)](https://img.shields.io/github/downloads/swingerman/lovelace-fluid-level-background-card/total?style=for-the-badge)
![Release](https://img.shields.io/github/v/release/swingerman/lovelace-fluid-level-background-card?style=for-the-badge)

A card that wraps other card or cards and renders a fluid level background behind them. The fluid level is controlled by a sensor entity and the background color can be set to any color. The card is designed to be used with any other card, including grid and stack cards.

<img style="border: 5px solid #767676;border-radius: 10px;box-sizing: border-box;" src="https://github.com/swingerman/lovelace-fluid-level-background-card/blob/master/docs/assets/grid-cards.gif?raw=true" alt="Demo">

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=swingerman&repository=lovelace-fluid-level-background-card&category=Plugin)


## Configurable options

Options can be cofigured in the UI or in the card configuration. The following options are available:

- `entity` - the entity that controls the fluid level
- `fill_entity` - the entity that controls the fill state of the fluid level
- `full_value` - the maximum value of the sensor entity
- `level_color` - the color of the fluid level
- `background_color` - the color of the background
- `severity` - a list of severity levels that will change the color of the fluid level based on the value of the sensor entity


---


[![Donate](https://img.shields.io/badge/Donate-PayPal-yellowgreen?style=for-the-badge&logo=paypal)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=S6NC9BYVDDJMA&source=url)
[![Donate](https://img.shields.io/badge/-buy_me_a%C2%A0coffee-gray?style=for-the-badge&logo=buy-me-a-coffee)](https://www.buymeacoffee.com/swingerman)


The fluid effect is an improved version of [@aarcorcaci](https://github.com/aarcoraci)'s [fluid-meter](https://github.com/aarcoraci/javascript-fluid-meter), improved and ported to typescript.


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
      - 1
background_color:
      - 255
      - 255
      - 0
      - 1
random_start: true
```

### Supported Color Formats

```yaml
level_color: [68,115,159,1]
level_color:
      - 255
      - 255
      - 0
      - 1
level_color: red
level_color: 'red'
level_color: '#ff0000'
level_color: var(--red-color)
level_color: 'var(--red-color)'
level_color: rgb(242,142,28)
level_color: 'rgb(242,142,28)'
level_color: rgba(242,142,28,1)
level_color: 'rgba(242,142,28,1)'
```

Note: RGBA alpha channel can be set only in the yaml configuration.

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

## Severity

You can set the severity of the fluid level by using the `severity` property. The severity is a list of objects with the following properties:

- `value`: The level at which the severity should be applied
- `color`: The color of the severity. use can use any of the [supported color formats](#supported-color-formats)

```yaml
severity:
  - value: 20
    color: red
  - value: 50
    color: yellow
  - value: 80
    color: green
```

## Randomly Delayed Start

You can set the `random_start` property to true to start the fluid level at a random delay. This could be useful when mnay cards are used in the same view and you want to avoid the same start time for all of them.

```yaml

## Support

Hey dude! Help me out for a couple of :beers: or a :coffee:!

[![Donate](https://img.shields.io/badge/Donate-PayPal-yellowgreen?style=for-the-badge&logo=paypal)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=S6NC9BYVDDJMA&source=url)
[![Donate](https://img.shields.io/badge/-buy_me_a%C2%A0coffee-gray?style=for-the-badge&logo=buy-me-a-coffee)](https://www.buymeacoffee.com/swingerman)
