# Mkraftman Media Control

A custom Lovelace media control card for Home Assistant with automatic artwork fetching, intelligent stale-data detection, and colour-matched backgrounds.

![HACS Badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)

## Features

- **Automatic artwork from TVmaze (TV) and TMDB (movies)** — when content plays without artwork (common with BBC iPlayer, Hulu, Peacock, Paramount+), the card searches TVmaze by title for TV shows and, with an optional TMDB key, falls back to TMDB for movies — displaying artwork with colour-matched backgrounds. No automations, helpers, or scripts required. See [Movie artwork](#movie-artwork-tmdb-fallback).
- **Navigation-based stale detection** — subscribes to HA WebSocket events to detect when Home/Top Menu commands are sent, automatically clearing stale media info that integrations like pyatv retain after the user navigates away.
- **Colour-extracted backgrounds** — samples artwork colours to generate a tinted background with gradient fade, creating a cohesive look per show.
- **Full-width transport controls** — configurable button row (skip back, previous, play/pause, next, skip forward) or custom remote commands.
- **Draggable seek bar** — touch/mouse drag on the progress thumb with live position feedback.
- **Right-aligned artwork** — content artwork displayed on the right with gradient fade to the extracted background colour on the left.
- **Fixed card height** — no layout shift between playing and idle states.
- **App and device logos** — known streaming apps show their logo; unrecognised apps fall back to the device logo (Apple TV, Roku, Google TV).
- **Pending app display** — shows the correct app name immediately during launch transitions before the entity updates.
- **Roon support (Apple TV)** — when Roon is the selected source, the card drives media info and transport from a dedicated Roon `media_player` entity with its own previous / play-pause / next controls. See [Roon support](#roon-support-new-in-v2).
- **Live stream detection** — hides the progress bar when DVR buffer growth is detected.
- **Phantom play filtering** — ignores Roku's brief "playing" states during menu navigation.
- **Clean design** — no power button, three-dots menu, or browse media button.

## Roon support (new in v2)

When the Apple TV's selected source is Roon (the `TV:Remote` source, displayed as **Roon**), the card switches into **Roon mode**: media title, artist, album, artwork and transport are driven by a separate Roon `media_player` entity (default `media_player.roon_tv_area`) instead of the Apple TV, with a dedicated **previous / play-pause / next** control row. Media reads are aliased to the active source, so the normal (non-Roon) path is unchanged.

Roon mode is detected from the **pending app**, not the Apple TV's `app_name`. The Apple TV integration (pyatv) reports `app_name` unreliably during and after Roon use — it can still read "Netflix" while the Roon screen is showing — so the card keys off `pending_app_entity` instead, which the dashboard launch flow sets to `Roon` when the Roon source is chosen.

Because of this:

- **At the launcher, before anything is playing,** the card is already in Roon mode, so the play button targets Roon and starts playback.
- **Pause/resume and track changes** are reflected from the Roon entity throughout the session.
- **Selecting any other app** overwrites the pending app, so Roon mode drops immediately — even if Roon is still streaming in the background.
- **Returning to Roon** picks the session back up, including paused media, which resumes on play.

### Requirements

- A Roon `media_player` entity (set `roon_entity` if it isn't `media_player.roon_tv_area`).
- `pending_app_entity` configured on the card, with your launch flow setting it to `Roon` for the Roon source. Roon mode only engages while the pending app reads exactly `Roon`.

### Minimal Roon config

```yaml
type: custom:mkraftman-media-control
entity: media_player.apple_tv_living_room
pending_app_entity: input_text.apple_tv_pending_app
roon_entity: media_player.roon_tv_area   # optional; this is the default
```

> **Note:** if you switch away from Roon using the Apple TV's *own* remote (rather than the dashboard), no launch action runs to update the pending app, so the card stays in Roon mode until the pending app is changed. In a dashboard-driven setup this path doesn't occur.

## Movie artwork (TMDB fallback)

TVmaze is a TV database, so movies that play without their own `entity_picture` (some Paramount+ titles, for example) get no artwork from it. Providing an optional TMDB API key enables a movie-artwork fallback: when TVmaze returns no match for a title, the card searches [TMDB](https://www.themoviedb.org/) and uses the movie's landscape backdrop (falling back to the portrait poster).

The fallback is entirely opt-in — without `tmdb_api_key` the card uses TVmaze exactly as before. TVmaze is always tried first, so TV shows are unaffected.

### Requirements

- A **TMDB v3 API key** (the ~32-character key, *not* the v4 "Read Access Token"). Create a free account at themoviedb.org, then go to **Settings → API** and copy the **API Key (v3 auth)**.
- Add `tmdb_api_key` to the card config for any surface where image-less movies play.

### Config

```yaml
type: custom:mkraftman-media-control
entity: media_player.apple_tv_living_room
tmdb_api_key: "your_tmdb_v3_api_key"
```

> **Notes**
> - The key is passed to TMDB as a query parameter, so it's visible in the dashboard config and in the browser's network requests. For a local kiosk with a low-privilege read-only key this is low risk, but bear it in mind before adding it to publicly visible surfaces.
> - Results are cached per title for the session — including "no match" outcomes — so image-less content doesn't repeatedly query the APIs.
> - The colour-tinted background may be skipped for TMDB images if `image.tmdb.org` doesn't return CORS headers for the colour-sampling step. The artwork itself still displays regardless.

### Overriding an app's own artwork

Some apps *do* provide an `entity_picture`, but it isn't good artwork — for example, Paramount+ supplies a distinct per-title image for movies that isn't a real poster or backdrop. Because the card faithfully shows whatever `entity_picture` an app provides, there's normally no way to improve on it.

`image_override_apps` fixes that: list the app names whose native image you want ignored, and the card treats those titles as if they had no `entity_picture` — running the same **TVmaze → TMDB** cascade (TVmaze first for TV, TMDB for movies).

```yaml
type: custom:mkraftman-media-control
entity: media_player.apple_tv_living_room
tmdb_api_key: "your_tmdb_v3_api_key"
image_override_apps:
  - Paramount+
```

Notes and trade-offs:

- It's **app-wide** — every title from a listed app uses the fetch cascade, including TV episodes. If that app supplied good per-episode artwork for its TV content, you'll lose it in favour of a TVmaze show-level image. There's no per-content-type switch, because the card can't reliably tell a movie from an episode.
- **Roon is never affected** (its artwork comes from the Roon entity).
- If neither TVmaze nor TMDB finds a match, the card shows the **app logo** rather than the app's own image.
- Movies need `tmdb_api_key` set; without it, a movie from an overridden app falls through to the logo (TVmaze won't match it).

## Installation

### HACS (Recommended)

1. Open HACS in Home Assistant
2. Go to **Frontend** → three-dot menu → **Custom repositories**
3. Add `https://github.com/mkraftman/mkraftman-media-control` as a **Dashboard** repository
4. Search for "Mkraftman Media Control" and install it
5. Add the resource in **Settings → Dashboards → Resources** (HACS may do this automatically)

### Manual

1. Download `mkraftman-media-control.js` from the [latest release](https://github.com/mkraftman/mkraftman-media-control/releases)
2. Place it in your `www/` folder
3. Add the resource in **Settings → Dashboards → Resources**:
   - URL: `/local/mkraftman-media-control.js`
   - Type: JavaScript Module

## Usage

```yaml
type: custom:mkraftman-media-control
entity: media_player.apple_tv_living_room
```

### With all options

```yaml
type: custom:mkraftman-media-control
entity: media_player.apple_tv_living_room
remote_entity: remote.apple_tv_living_room
pending_app_entity: input_text.apple_tv_pending_app
roon_entity: media_player.roon_tv_area
tmdb_api_key: "your_tmdb_v3_api_key"
image_override_apps:
  - Paramount+
image_entity: input_text.custom_image_override
nav_commands:
  - home
  - top_menu
stale_check_delay: 2000
seekable: true
wake_command: select
buttons:
  - icon: mdi:rewind-10
    command: skipBackward
    size: skip
  - icon: mdi:skip-previous
    command: previousTrack
  - primary: true
  - icon: mdi:skip-next
    command: nextTrack
  - icon: mdi:fast-forward-10
    command: skipForward
    size: skip
```

## Configuration

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `entity` | **Yes** | — | A `media_player` entity |
| `remote_entity` | No | Derived from entity | The `remote` entity for send_command actions. If omitted, derived by replacing `media_player.` with `remote.` in the entity ID |
| `pending_app_entity` | No | — | An `input_text` entity set by launch scripts to show the correct app name during transitions. Also drives Roon mode (see [Roon support](#roon-support-new-in-v2)) |
| `roon_entity` | No | `media_player.roon_tv_area` | The Roon `media_player` entity the card switches to for media info and transport when the selected source is Roon. Roon mode is triggered by `pending_app_entity` reading `Roon`, so that option must also be set |
| `tmdb_api_key` | No | — | A [TMDB](https://www.themoviedb.org/) **v3** API key. Enables a movie-artwork fallback (via TMDB) for titles TVmaze can't match. Without it, only TVmaze is used. See [Movie artwork](#movie-artwork-tmdb-fallback) |
| `image_override_apps` | No | — | Array of app names (e.g. `["Paramount+"]`) whose own `entity_picture` is ignored so the card uses the artwork cascade (TVmaze first, then TMDB) instead — for apps that supply poor per-title images. App-wide (affects that app's TV episodes too); movies need `tmdb_api_key`. See [Overriding an app's artwork](#overriding-an-apps-own-artwork) |
| `image_entity` | No | — | An `input_text` entity providing an external image URL override. Takes priority over TVmaze/TMDB auto-fetch. Retained for backward compatibility; most users won't need this |
| `nav_commands` | No | `["home", "top_menu"]` | Remote commands that trigger stale-data detection. Matched case-insensitively, so `home` matches Apple TV's `home`, Roku's `home`, and Google TV's `HOME` |
| `stale_check_delay` | No | `2000` | Milliseconds to wait after a navigation command before checking for stale data. Allows time for new content to start playing |
| `seekable` | No | `true` | Set to `false` to hide the seek thumb and disable seek-on-click |
| `wake_command` | No | `"select"` | Remote command sent when play/pause is pressed while the device is idle/standby |
| `buttons` | No | Apple TV defaults | Array of button definitions for the transport control row |

### Button definitions

Each entry in the `buttons` array can be:

- **Primary (play/pause):** `{ primary: true }` — auto-toggles between play and pause icons
- **Remote command:** `{ icon: "mdi:skip-next", command: "nextTrack" }` — sends the command via `remote.send_command`
- **Spacer:** `{ spacer: true }` — invisible placeholder for layout alignment
- **Skip size:** Add `size: "skip"` for a smaller button (28px icon vs 40px)

> In Roon mode the configured `buttons` row is replaced by a fixed previous / play-pause / next row that targets the Roon entity.

### Artwork display cascade

The card resolves background artwork in this priority order:

1. **Native artwork** — `entity_picture` from the integration, with extracted colours
2. **External override** — URL from `image_entity` (if configured)
3. **TVmaze auto-fetch (TV)** — searched by title when no `entity_picture` exists, cached per session
4. **TMDB auto-fetch (movies)** — when TVmaze has no match and `tmdb_api_key` is set, searched by title; prefers the landscape backdrop, then the poster
5. **App logo** — from the built-in APP_IMAGE_MAP (Netflix, Disney+, BBC iPlayer, etc.)
6. **Device logo** — from DEVICE_IMAGE_MAP based on entity ID (Apple TV, Roku, Google TV)
7. **Hidden** — no background image

> Apps listed in `image_override_apps` skip step 1 — their native `entity_picture` is ignored — so they resolve via steps 3–4 (with step 5 as the fallback).

### Supported app logos

The card includes built-in logos for: Netflix, Prime Video, YouTube, Disney+, Apple Music, Spotify, Plex, BBC iPlayer, ITVX, Channel 4, My5, Paramount+, discovery+, HBO Max / Max, Hulu, DAZN, Roon, BBC Sounds, Apple TV, Starz, Sky Q, Peacock, UKTV Play — plus Android TV package name variants for all of the above.

## Changelog

### v2.2.0

**Override an app's own artwork (`image_override_apps`)**

Some apps supply an `entity_picture` that isn't real title artwork — e.g. Paramount+ provides a distinct per-title image for movies that isn't a poster or backdrop. The card previously had no way to improve on a provided image. The new `image_override_apps` list names apps whose native image should be ignored, so those titles use the TVmaze → TMDB cascade instead.

- App-wide: every title from a listed app uses the fetch cascade (TVmaze first, TMDB for movies). TV episodes from that app therefore also switch to fetched artwork, trading per-episode images for a TVmaze show-level one
- Never affects Roon; unlisted apps are unchanged
- A title neither source can match falls back to the app logo

### v2.1.0

**TMDB movie-artwork fallback**

Added an optional TMDB fallback for movie artwork. TVmaze (a TV database) can't match movies, so titles playing without their own `entity_picture` — e.g. some Paramount+ movies — previously fell straight through to the app logo. When a `tmdb_api_key` is configured and TVmaze returns no match, the card now searches TMDB and uses the landscape backdrop (falling back to the poster).

- Opt-in via the new `tmdb_api_key` option; without it, behaviour is unchanged (TVmaze only)
- TVmaze is always tried first, so TV shows are unaffected
- The key is sent as an `api_key` query parameter (a simple GET, so no CORS preflight)
- The per-title artwork cache now records confirmed misses too, and an in-flight guard de-dupes lookups, so image-less content no longer re-queries the APIs on every state update

### v2.0.5

**Show the movie title when apps put it in `media_artist`**

Some Apple TV movie apps populate only `media_artist` (with the movie title) and leave `media_title` blank. The card gated the title row on `media_title` and the artist row on the title, so neither rendered — only the artwork showed. The card now uses an effective title (`media_title`, falling back to `media_artist`): the movie title appears in the title slot, the separate artist line is suppressed so it isn't shown twice, and the effective title also drives content-change detection and the artwork lookup. When `media_title` is present, behaviour is unchanged.

### v2.0.4

**Documentation**

Documented Roon support and the `roon_entity` option in the README. No code changes.

### v2.0.3

**Roon detection via the pending app**

Roon mode is now keyed off `pending_app_entity` (state `Roon`) rather than the Apple TV's `app_name`. pyatv reports `app_name` unreliably around Roon — often a stale value such as "Netflix" while the Roon screen is showing — so the earlier `app_name`-based detection could never engage reliably. The pending app is set by the dashboard launch flow and stays stable for the whole Roon session.

- Roon mode engages at the launcher before playback, so the play button targets Roon and starts it
- No longer requires Roon to be playing — the pending app alone (plus the Roon entity existing) is the signal
- Selecting another app changes the pending value and drops Roon mode immediately, independent of Roon's playback state
- The idle launcher falls back to the Roon logo, since forcing Roon mode at idle bypasses the previous pending-app draw path

### v2.0.0

**Roon support for Apple TV**

When the Apple TV source is Roon, the card drives media info, artwork and transport from a separate Roon `media_player` entity (default `media_player.roon_tv_area`) instead of the Apple TV, and shows a dedicated previous / play-pause / next control row. Media reads are aliased to the active source, so the non-Roon path is unchanged. New `roon_entity` config option.

### v1.9.1

**Preserve _confirmedApp through idle state**

When exiting content on Apple TV, pyatv often transitions through `idle` before settling into `paused` with a stale `app_name`. The idle handler was clearing `_confirmedApp`, removing the protection before the stale `app_name` change arrived.

- Only clear `_confirmedApp` on `standby`/`off`/`unavailable` (device actually powered down), not on `idle` (device still on, likely still in the app)
- Remove `idle` from `isGenuineAppChange` trusted states — an `app_name` change during idle with `_confirmedApp` set is not trustworthy

Recovery paths when `_confirmedApp` persists: Home command (stale check clears it), dashboard navigation (disconnect sets `_navStale`), new content plays (updates it), device powers off (standby/off clears it).

### v1.9.0

**Work around pyatv stale app_name during in-app navigation**

pyatv reports incorrect `app_name` values when the Apple TV entity is not actively playing content. For example, while navigating ITVX's menus after exiting playback, pyatv may report `app_name` as "HBO Max". This caused two bugs:

- **(a) Exiting media to app menu:** The card detected an `app_name` change and treated it as a genuine app switch — clearing ITVX branding and showing HBO Max.
- **(b) Returning from the streaming dashboard:** The pending app was set to "ITVX" by the launch script, but the entity reported "HBO Max". The mismatch cleared the pending app, showing HBO Max instead.

New field: `_confirmedApp` — stores the `app_name` from the last genuine playback session. When the entity isn't playing, the card trusts `_confirmedApp` over the entity's potentially stale `app_name`.

**How it works:**
- Set to `app_name` when genuine content is detected playing
- Used in place of `app_name` for display, logo lookup, and pending app matching when the entity isn't playing
- App-change detection suppressed when entity is paused and `_confirmedApp` is set (stale pyatv data)
- Pending app clearing on mismatch now requires the entity to be genuinely playing
- Cleared on idle/off, stale navigation detection, and disconnect

### v1.8.3

**Case-insensitive nav command matching for Google TV**

Navigation-based stale detection now matches commands case-insensitively. Apple TV uses `home` (lowercase), Roku uses `home`, and Google TV (Android TV Remote) uses `HOME` (uppercase) — all now match the single default entry `home`. Simplified default `nav_commands` to `["home", "top_menu"]` with no duplicate casing variants needed.

### v1.8.2

**Remove menu/back from default nav_commands**

`menu` and `back` navigate within an app (closing overlays, returning to episode lists) rather than leaving the app entirely. Triggering the stale check on these caused false clears during normal in-app browsing. Default `nav_commands` trimmed to only commands that genuinely leave the app.

### v1.8.1

**Fall back to device name/image after stale navigation**

After stale detection cleared content info, the card still displayed the app name and app logo because pyatv retains `app_name` in entity attributes. The `knownApp` check bypassed the `isTrulyActive` guard, so stale app info kept showing instead of the device fallback.

New `_navStale` flag suppresses the `knownApp` bypass after stale navigation detection or Lovelace page changes. When set, the card falls back to the device friendly name and device logo. Cleared when genuine content plays or a real app change occurs.

**Two cases handled:**
- **(a) Home screen navigation:** home/top_menu command detected, entity not playing after delay
- **(b) Dashboard navigation:** Lovelace page change (disconnect/reconnect) with stale entity attributes

### v1.8.0

**Built-in TVmaze artwork fetching**

The card now automatically fetches show artwork from TVmaze's public API when content is playing with a `media_title` but no `entity_picture`. This is entirely client-side — no automations, shell commands, Python scripts, or input_text helpers required.

**Infrastructure this replaces:**
- 6 automations (fetch/clear for Apple TV, Roku, and BBC iPlayer)
- 3 `input_text` helpers (`apple_tv_media_image`, `roku_media_image`, `bbc_iplayer_image`)
- 2 `shell_command` entries (`fetch_tvmaze_image`, `fetch_bbc_iplayer_image`)
- 2 Python scripts (`fetch_tvmaze_image.py`, `fetch_bbc_image.py`)

**How it works:**
1. Detects playing content with `media_title` but no `entity_picture`
2. Searches TVmaze: `https://api.tvmaze.com/singlesearch/shows?q={title}&embed=images`
3. Prefers landscape "background" images; falls back to show poster
4. Caches results per title for the browser session (at most one API call per show)
5. Runs colour extraction on the fetched artwork for background tinting
6. Generation counter (`_artworkGeneration`) invalidates stale async results after content/app changes

The `image_entity` config option is retained for backward compatibility but is no longer needed for the standard case.

### v1.7.1

**Fix artwork not returning after stale clear**

After the v1.7.0 stale navigation check cleared stale data, returning to the same content failed to restore artwork. The `_scheduleStaleCheck` method was snapshotting `_lastPicture` to the current (stale) value. When content resumed with the same `entity_picture`, `contentChanged` evaluated to false and `_extractColors` never fired — `_customBg` stayed null and the artwork branch failed.

Fixed by not snapshotting `_lastPicture`/`_lastMediaTitle` after clearing. Now `_lastPicture` stays null (as set by `_clearColors`), so the next genuine play triggers `contentChanged = true` and re-extracts colours.

Also removed `select` and d-pad commands (`up`, `down`, `left`, `right`) from default `nav_commands` — these fire too frequently during normal in-app browsing.

### v1.7.0

**Navigation-based stale data detection**

Subscribed to HA WebSocket `call_service` events to detect when remote navigation commands are sent to the configured remote entity. After a configurable delay (default 2 seconds), if the media player is not genuinely playing, the card clears stale artwork, title, and colours.

This is the definitive fix for pyatv (and similar integrations) retaining stale media attributes after the user navigates away from content. The entity data never changes in these cases, so there was previously no trigger for the card to re-evaluate its display state.

**How it works:**
1. `_subscribeRemoteEvents()` subscribes to `call_service` events on the HA WebSocket connection (once, on first `set hass`)
2. Filters for `remote.send_command` calls targeting the card's remote entity with a navigation command
3. `_scheduleStaleCheck()` starts a debounced timer — rapid navigation resets it to avoid flickering
4. When the timer fires, if the entity state is not `playing`, clears all card state (colours, artwork, `_hadRealContent`, `_navStale`) and calls `_update()`
5. If the entity *is* playing (e.g. the user pressed select to start content), the clear is skipped

**Config options:**
- `nav_commands`: override the default navigation command list
- `stale_check_delay`: override the delay in milliseconds (default: 2000)

### v1.6.5

**Fix stale artwork from async colour extraction race condition**

Added a generation counter (`_colorGeneration`) to prevent a race condition in the async colour extraction pipeline.

**The race condition:** when content starts playing, `_extractColors()` creates an `Image` and starts loading it asynchronously. If the user navigates away before it finishes, `_clearColors()` fires and resets the card state. But then the image load completes and the `onload` callback sets `_customBg` back to the old content's colours, re-showing stale artwork.

**The fix:**
1. `_clearColors()` increments `_colorGeneration`
2. `_extractColors()` captures the generation at call time
3. The `onload` callback checks `gen !== this._colorGeneration` and bails out if a clear happened since the extraction started

Also added `_hadRealContent` guard to the artwork display branch (`realPic && this._customBg && this._hadRealContent`) as defence in depth.

## License

MIT
