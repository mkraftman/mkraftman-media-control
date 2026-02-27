# Mkraftman Media Control

A custom media control card for Home Assistant.

## Features

- Full-width transport controls (skip back, previous, play/pause, next, skip forward)
- Draggable seek thumb on progress bar
- Right-aligned artwork with extracted colour fade
- Fixed card height (no layout shift between playing/idle)
- Background resets on app change or return to home screen
- No power button, three-dots menu, or browse media button

## Installation

### HACS (Recommended)

1. Open HACS in Home Assistant
2. Go to **Frontend** > three-dot menu > **Custom repositories**
3. Add `https://github.com/mkraftman/mkraftman-media-control` as a **Dashboard** repository
4. Search for "Mkraftman Media Control" and install it
5. Add the resource in **Settings > Dashboards > Resources** (HACS may do this automatically)

### Manual

1. Download `mkraftman-media-control.js` from the [latest release](https://github.com/mkraftman/mkraftman-media-control/releases)
2. Place it in your `www/` folder
3. Add the resource in **Settings > Dashboards > Resources**:
   - URL: `/local/mkraftman-media-control.js`
   - Type: JavaScript Module

## Usage

```yaml
type: custom:custom-media-control-card
entity: media_player.your_entity
```

## Configuration

| Option   | Required | Description              |
|----------|----------|--------------------------|
| `entity` | Yes      | A `media_player` entity  |
