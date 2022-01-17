# Lovelace Fluid Level Background Card by [@swingerman](https://www.github.com/swingerman)

A card that wraps other card or cards and renders a fluid level background behind them.

<img style="border: 5px solid #767676;border-radius: 10px;box-sizing: border-box;" src="https://github.com/swingerman/lovelace-fluid-level-background-card/blob/master/docs/assets/grid-card.jpg?raw=true" alt="Demo">

[![GitHub Release][releases-shield]][releases]
[![License][license-shield]](LICENSE.md)
[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://github.com/swingerman/lovelace-fluid-level-background-card)

![Project Maintenance][maintenance-shield]
[![GitHub Activity][commits-shield]][commits]

## Support

Hey dude! Help me out for a couple of :beers: or a :coffee:!

[![coffee](https://www.buymeacoffee.com/assets/img/custom_images/black_img.png)](https://www.buymeacoffee.com/swingerman)

## Options

| Name              | Type    | Requirement  | Description                                 | Default             |
| ----------------- | ------- | ------------ | ------------------------------------------- | ------------------- |
| type              | string  | **Required** | `custom:fluid-level-background-card`        |
| name              | string  | **Optional** | Card name                                   | `Boilerplate`       |
| show_error        | boolean | **Optional** | Show what an error looks like for the card  | `false`             |
| show_warning      | boolean | **Optional** | Show what a warning looks like for the card | `false`             |
| entity            | string  | **Optional** | Home Assistant entity ID.                   | `none`              |
| tap_action        | object  | **Optional** | Action to take on tap                       | `action: more-info` |
| hold_action       | object  | **Optional** | Action to take on hold                      | `none`              |
| double_tap_action | object  | **Optional** | Action to take on double tap                | `none`              |

## Action Options

| Name            | Type   | Requirement  | Description                                                                                        | Default     |
| --------------- | ------ | ------------ | -------------------------------------------------------------------------------------------------- | ----------- |
| action          | string | **Required** | Action to perform (more-info, toggle, call-service, navigate url, none)                            | `more-info` |
| navigation_path | string | **Optional** | Path to navigate to (e.g. /lovelace/0/) when action defined as navigate                            | `none`      |
| url             | string | **Optional** | URL to open on click when action is url. The URL will open in a new tab                            | `none`      |
| service         | string | **Optional** | Service to call (e.g. media_player.media_play_pause) when action defined as call-service           | `none`      |
| service_data    | object | **Optional** | Service data to include (e.g. entity_id: media_player.bedroom) when action defined as call-service | `none`      |
| haptic          | string | **Optional** | Haptic feedback _success, warning, failure, light, medium, heavy, selection_                       | `none`      |
| repeat          | number | **Optional** | How often to repeat the `hold_action` in milliseconds.                                             | `none`      |
