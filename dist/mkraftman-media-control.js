/**
 * Custom Media Control Card
 *
 * A modified clone of the built-in media-control card with:
 *  - Always maximum depth (full card height, no size shift)
 *  - No power button
 *  - No three-dots menu
 *  - No browse media button
 *  - Configurable transport buttons (default: skip back, previous, play/pause, next, skip forward)
 *  - Draggable seek thumb on progress bar
 *  - Right-aligned artwork with colour fade to left
 *  - Background resets to default on app change or return to home screen
 *  - Automatic artwork fetching from TVmaze for content without entity_picture
 *  - Navigation-based stale data detection via WebSocket event subscription
 *
 * Config options:
 *   entity:             (required) media_player entity
 *   remote_entity:      (optional) remote entity for send_command actions
 *   image_entity:       (optional) input_text entity providing an external image URL override
 *   pending_app_entity: (optional) input_text entity for pending app display during transitions
 *   nav_commands:       (optional) override default navigation commands for stale detection
 *   stale_check_delay:  (optional) ms before stale check fires (default: 2000)
 *   seekable:           (optional) enable/disable seek bar (default: true)
 *   wake_command:       (optional) command to wake from idle (default: "select")
 *   roon_entity:        (optional) Roon media_player entity to use when the Apple TV
 *                       source is Roon (default: media_player.roon_tv_area)
 *   buttons:            (optional) array of button definitions:
 *     - icon: mdi icon name
 *       command: remote command string (uses remote_entity)
 *     - primary: true  (play/pause button, auto-toggles icon)
 */

const SKIP_SECONDS = 10;

const DEVICE_IMAGE_MAP = {
  "apple_tv": "/local/images/apple.png",
  "roku": "/local/images/roku.png",
  "google_tv": "/local/images/google-tv.png",
};

const APP_IMAGE_MAP = {
  "Netflix": "/local/images/netflix.png",
  "Prime Video": "/local/images/prime-video.png",
  "YouTube": "/local/images/youtube.png",
  "Disney+": "/local/images/disney-plus.png",
  "Disney Plus": "/local/images/disney-plus.png",
  "Apple Music": "/local/images/apple-music.png",
  "Spotify": "/local/images/spotify.png",
  "Plex": "/local/images/plex.png",
  "BBC iPlayer": "/local/images/bbc-iplayer.png",
  "bbc.iplayer.android": "/local/images/bbc-iplayer.png",
  "ITVX": "/local/images/itvx.png",
  "ITV Hub": "/local/images/itvx.png",
  "Channel 4": "/local/images/channel4.png",
  "All 4": "/local/images/channel4.png",
  "My5": "/local/images/my5.png",
  "Channel 5": "/local/images/my5.png",
  "Paramount+": "/local/images/paramount-plus.png",
  "Paramount Plus": "/local/images/paramount-plus.png",
  "discovery+": "/local/images/discovery-plus.png",
  "Discovery+": "/local/images/discovery-plus.png",
  "HBO Max": "/local/images/hbo-max.png",
  "Max": "/local/images/hbo-max.png",
  "Hulu": "/local/images/hulu.png",
  "DAZN": "/local/images/dazn.png",
  "Roon": "/local/images/roon.png",
  "TV:Remote": "/local/images/roon.png",
  "BBC Sounds": "/local/images/bbc-sounds.png",
  "Apple TV": "/local/images/apple-tv.png",
  "TV": "/local/images/apple-tv.png",
  "com.apple.TVWatchList": "/local/images/apple-tv.png",
  "Starz": "/local/images/starz.png",
  "STARZ": "/local/images/starz.png",
  "Sky Q": "/local/images/sky.png",
  "Sky": "/local/images/sky.png",
  "Peacock": "/local/images/peacock.png",
  "Peacock TV": "/local/images/peacock.png",
  "U": "/local/images/u.png",
  "UKTV": "/local/images/u.png",
  "UKTV Play": "/local/images/u.png",
  // Android TV package names
  "com.channel4.ondemand": "/local/images/channel4.png",
  "com.channel5.my5": "/local/images/my5.png",
  "uk.co.channel5.my5": "/local/images/my5.png",
  "com.google.android.youtube.tv": "/local/images/youtube.png",
  "com.plexapp.android": "/local/images/plex.png",
  "com.netflix.ninja": "/local/images/netflix.png",
  "com.amazon.amazonvideo.livingroom": "/local/images/prime-video.png",
  "com.disney.disneyplus": "/local/images/disney-plus.png",
  "com.paramountplus": "/local/images/paramount-plus.png",
  "com.discoveryplus.androidtv": "/local/images/discovery-plus.png",
  "com.hbo.hbonow": "/local/images/hbo-max.png",
  "com.wbd.stream": "/local/images/hbo-max.png",
  "com.hulu.livingroomplus": "/local/images/hulu.png",
  "com.peacocktv.peacockandroid": "/local/images/peacock.png",
  "com.spotify.tv.android": "/local/images/spotify.png",
  "com.dazn": "/local/images/dazn.png",
  "com.itv.itvhub": "/local/images/itvx.png",
  "com.stv.stvplayer": "/local/images/itvx.png"
};

// Map Android TV package names (and other IDs) to user-friendly display names
const APP_DISPLAY_NAME = {
  "TV": "Apple TV",
  "Music": "Apple Music",
  "TV:Remote": "Roon",
  "com.apple.TVWatchList": "Apple TV",
  "bbc.iplayer.android": "BBC iPlayer",
  "com.google.android.youtube.tv": "YouTube",
  "com.plexapp.android": "Plex",
  "com.channel4.ondemand": "Channel 4",
  "com.channel5.my5": "My5",
  "uk.co.channel5.my5": "My5",
  "com.netflix.ninja": "Netflix",
  "com.amazon.amazonvideo.livingroom": "Prime Video",
  "com.disney.disneyplus": "Disney+",
  "com.paramountplus": "Paramount+",
  "com.discoveryplus.androidtv": "discovery+",
  "com.hbo.hbonow": "HBO Max",
  "com.wbd.stream": "HBO Max",
  "com.hulu.livingroomplus": "Hulu",
  "Peacock TV": "Peacock",
  "com.peacocktv.peacockandroid": "Peacock",
  "com.spotify.tv.android": "Spotify",
  "com.dazn": "DAZN",
  "com.itv.itvhub": "ITVX",
  "com.stv.stvplayer": "ITVX",
};

class MkraftmanMediaControl extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this._config = null;
    this._hass = null;
    this._el = {};
    this._built = false;

    this._prevAppName = undefined;
    this._lastPicture = null;
    this._lastMediaTitle = null;
    this._customBg = null;
    this._customFg = null;
    this._extractedForApp = null;

    // FIX 4: Track whether we've seen genuinely playing content in the current
    // session, so we can distinguish a real pause from stale leftover state.
    this._hadRealContent = false;

    // FIX 5: Generation counter — incremented by _clearColors() so that async
    // _extractColors() callbacks arriving after a clear are discarded. This
    // prevents the race where: play content → _extractColors starts loading →
    // navigate away → _clearColors resets state → image finishes loading →
    // onload callback re-sets _customBg with stale colours.
    this._colorGeneration = 0;

    // FIX 6: Navigation-based stale detection — subscribe to call_service
    // events on the HA WebSocket to detect when remote navigation commands
    // (home, menu, d-pad) are sent. After a short delay, if the entity is
    // not genuinely playing, clear stale artwork/title. This is the only
    // reliable way to handle pyatv retaining stale attributes after the
    // user navigates away from content.
    this._eventUnsub = null;
    this._staleCheckTimer = null;

    // TVmaze artwork auto-fetch: when content plays without entity_picture,
    // the card searches TVmaze by media_title and displays the result.
    // Eliminates the need for external automations, shell_commands, and
    // input_text helpers to provide fallback artwork.
    this._tvmazeCache = {};       // title → image URL (persists within session)
    this._fetchedArtwork = null;  // active TVmaze URL for current content
    this._artworkGeneration = 0;  // invalidates stale async fetch results

    // When true, suppress the knownApp bypass so the card falls back to
    // device name/image instead of app name/image. Starts true because on
    // initial load, entity data may be stale and cannot be trusted until
    // genuine playback is observed. Also set by idle transitions, stale
    // navigation detection, and disconnectedCallback.
    this._navStale = true;

    // Last app_name confirmed by genuine playback. Used to override the
    // entity's app_name when the entity isn't playing, because pyatv can
    // report stale/incorrect app_name values during app menu navigation
    // (e.g. reporting "HBO Max" when still in ITVX).
    this._confirmedApp = null;

    this._progressTimer = null;
    this._dragging = false;
    this._cardHeight = 0;
    this._prevMediaDuration = null;
    this._isLiveStream = false;
    this._resizeObserver = null;
    this._resizeTimeout = null;
  }

  /* ------------------------------------------------------------------ */
  /*  Config & sizing                                                    */
  /* ------------------------------------------------------------------ */

  setConfig(config) {
    if (!config.entity) throw new Error("Please define an entity");
    this._config = config;
    if (this._built) this._update();
    else this._build();
  }

  getCardSize() {
    return 4;
  }

  getGridOptions() {
    return { rows: 4, columns: 12, min_rows: 4, min_columns: 6 };
  }

  /* ------------------------------------------------------------------ */
  /*  Lifecycle                                                          */
  /* ------------------------------------------------------------------ */

  connectedCallback() {
    if (this._hass && this._config) {
      const e = this._hass.states[this._config.entity];
      if (e && e.state === "playing") this._startTimer();
    }
  }

  disconnectedCallback() {
    this._stopTimer();
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._resizeTimeout) {
      clearTimeout(this._resizeTimeout);
      this._resizeTimeout = null;
    }
    // When the card disconnects (Lovelace navigation away), mark as stale
    // so that reconnection doesn't show stale app name/logo from pyatv's
    // retained attributes. Cleared when genuine content plays.
    this._navStale = true;

    // FIX 6: Unsubscribe from call_service events and cancel pending stale check
    if (this._eventUnsub) {
      this._eventUnsub();
      this._eventUnsub = null;
    }
    if (this._staleCheckTimer) {
      clearTimeout(this._staleCheckTimer);
      this._staleCheckTimer = null;
    }
    // Clear artwork cache so we start fresh on reconnect
    this._clearColors();
    this._lastPicture = null;
    this._prevAppName = undefined;
    this._prevMediaDuration = null;
    this._isLiveStream = false;
    this._hadRealContent = false;
    this._confirmedApp = null;
    this._colorGeneration = 0;
    this._fetchedArtwork = null;
    this._artworkGeneration = 0;
    this._hass = null;
  }

  /* ------------------------------------------------------------------ */
  /*  hass property                                                      */
  /* ------------------------------------------------------------------ */

  set hass(hass) {
    const prev = this._hass;
    this._hass = hass;
    if (!this._config) return;

    const entity = hass.states[this._config.entity];
    if (!entity) return;

    // Skip if our entity hasn't changed — but also check image_entity and
    // pending_app_entity, since those are separate HA helpers that the card
    // reads in _update(). If only one of those changed (e.g. an automation
    // cleared input_text.roku_media_image), the media player last_updated
    // won't have moved, so we'd bail out and the image would never refresh
    // until something else triggered a media player update.
    const prevEntity = prev && prev.states[this._config.entity];
    const imageEntityId = this._config.image_entity;
    const prevImageState = prev && imageEntityId && prev.states[imageEntityId];
    const currImageState = imageEntityId && hass.states[imageEntityId];
    const imageEntityChanged = imageEntityId && (
      !prevImageState ||
      (prevImageState.state !== (currImageState && currImageState.state))
    );
    const pendingEntityId = this._config.pending_app_entity;
    const prevPendingState = prev && pendingEntityId && prev.states[pendingEntityId];
    const currPendingState = pendingEntityId && hass.states[pendingEntityId];
    const pendingEntityChanged = pendingEntityId && (
      !prevPendingState ||
      (prevPendingState.state !== (currPendingState && currPendingState.state))
    );
    // When Roon is the active source, the new track comes from the Roon entity,
    // which moves independently of the Apple TV. React whenever it changes so
    // the card doesn't bail out and miss the update. Detection is by the Roon
    // entity's own state (see _isRoonActive) because pyatv reports the Apple
    // TV's app_name as "Music" during Roon playback, not "TV:Remote".
    const roonId = this._roonEntityId();
    const prevRoon = prev && prev.states[roonId];
    const currRoon = hass.states[roonId];
    const roonEntityChanged = currRoon && (
      !prevRoon ||
      prevRoon.last_updated !== currRoon.last_updated ||
      prevRoon.state !== currRoon.state
    );
    if (
      prevEntity &&
      prevEntity.last_updated === entity.last_updated &&
      prevEntity.state === entity.state &&
      !imageEntityChanged &&
      !pendingEntityChanged &&
      !roonEntityChanged
    ) {
      return;
    }

    if (!this._built) this._build();

    // FIX 6: Subscribe to remote command events (once) so we can detect
    // navigation and clear stale data that pyatv never updates.
    this._subscribeRemoteEvents();

    // Roon mode: Roon is the active source on the Apple TV. Roon reports
    // state/artwork reliably, so drive colour extraction straight from it and
    // skip the Apple TV stale-attribute heuristics below.
    if (this._isRoonActive()) {
      const rpic = currRoon.attributes.entity_picture
        || currRoon.attributes.entity_picture_local || null;
      const rtitle = currRoon.attributes.media_title || null;
      if (rpic !== this._lastPicture || rtitle !== this._lastMediaTitle) {
        this._lastPicture = rpic;
        this._lastMediaTitle = rtitle;
        this._isLiveStream = false;
        this._prevMediaDuration = null;
        if (rpic) this._extractColors(rpic);
        else this._clearColors();
      }
      // Track the app so leaving Roon is detected as a genuine app change.
      this._prevAppName = entity.attributes.app_name;
      this._update();
      return;
    }

    // Compute content attributes early — needed for both app-change and
    // content-change detection below.
    const pic =
      entity.attributes.entity_picture ||
      entity.attributes.entity_picture_local ||
      null;
    const title = entity.attributes.media_title || null;
    const dur = entity.attributes.media_duration;
    const phantom = entity.state === "playing" && dur > 0 && dur < 5;

    // Detect app change -> reset background and live stream flag
    const app = entity.attributes.app_name || null;
    if (this._prevAppName !== undefined && app !== this._prevAppName) {
      // Only treat as genuine app change if the entity is actually playing
      // (new app started) or idle/off (left all apps). When paused with a
      // _confirmedApp, pyatv often reports stale/incorrect app_name values
      // during in-app menu navigation — suppress the clear in that case.
      const isGenuineAppChange = !this._confirmedApp
        || ["playing", "buffering", "standby", "off", "unavailable"].includes(entity.state);
      if (isGenuineAppChange) {
        this._clearColors();
        this._hadRealContent = false;
        this._navStale = false;
        this._isLiveStream = false;
        this._prevMediaDuration = null;
        // Snapshot current entity_picture/media_title as "already seen" so that
        // contentChanged doesn't immediately re-fire on the stale entity data.
        // Apple TV often keeps the previous app's media attributes for a brief
        // period after app_name changes (pyatv is slow to clear them). Without
        // this, we'd re-extract colors and re-set _hadRealContent from stale data,
        // completely undoing the clear we just did.
        this._lastPicture = pic;
        this._lastMediaTitle = title;
      }
      // else: suppressed — pyatv reported stale app_name while paused.
      // Don't clear; _confirmedApp will override in _update().
    }
    this._prevAppName = app;

    // Idle / off / standby -> reset background and live stream flag
    if (["idle", "standby", "off", "unavailable"].includes(entity.state)) {
      this._clearColors();
      this._hadRealContent = false;
      // Preserve _confirmedApp through idle — the device is still on and may
      // still be in the app. pyatv reports idle during in-app menu navigation.
      // _confirmedApp overrides stale app_name in _update() so the correct
      // app name/logo shows while browsing app menus after exiting content.
      // Only clear on standby/off/unavailable (device actually powered down).
      // Home screen transition is handled by _scheduleStaleCheck (detects
      // Home command via WebSocket) and disconnectedCallback (dashboard nav).
      if (["standby", "off", "unavailable"].includes(entity.state)) {
        this._confirmedApp = null;
      }
      this._isLiveStream = false;
      this._prevMediaDuration = null;
    }

    // Detect new content by change in picture OR media title
    // Note: pic, title, dur, phantom computed above
    const contentChanged =
      (pic !== this._lastPicture) || (title !== this._lastMediaTitle);

    if (
      contentChanged &&
      (entity.state === "playing" || entity.state === "buffering") &&
      !phantom
    ) {
      this._lastPicture = pic;
      this._lastMediaTitle = title;
      // New content — reset live stream detection so progress bar works
      this._isLiveStream = false;
      this._prevMediaDuration = null;
      if (pic) {
        this._extractColors(pic);
      } else {
        this._clearColors();
        // Restore tracking so we detect the next change
        this._lastPicture = pic;
        this._lastMediaTitle = title;
      }
      // FIX 4: We've seen real content playing — mark it so paused state is trusted
      if (title || pic) {
        this._hadRealContent = true;
        this._navStale = false;
        this._confirmedApp = app;
      }
    } else if (contentChanged && entity.state === "paused") {
      // Content changed while paused — stale data; clear, don't extract
      this._clearColors();
      this._hadRealContent = false;
      this._lastMediaTitle = title;
      this._isLiveStream = false;
      this._prevMediaDuration = null;
    } else if ((!pic || phantom) && this._lastPicture) {
      this._lastPicture = null;
      this._clearColors();
      this._hadRealContent = false;
    } else if (entity.state === "playing" && !phantom && (title || pic)) {
      // FIX 4: Catch the case where we transitioned playing→paused→playing with
      // the same content (no contentChanged), but _hadRealContent was lost (e.g.
      // after a reconnect). Re-mark it so paused detection works correctly next time.
      this._hadRealContent = true;
      this._navStale = false;
      if (!this._confirmedApp) this._confirmedApp = app;
    }

    // Auto-fetch artwork from TVmaze when playing content has a title but
    // no entity_picture. Async: on success, sets _fetchedArtwork and calls
    // _update() again to display the result. Cached per title within session.
    if (
      (entity.state === "playing" || entity.state === "buffering") &&
      !phantom && title && !pic
    ) {
      this._fetchArtwork(title);
    }

    this._update();
  }

  /* ------------------------------------------------------------------ */
  /*  DOM construction (runs once)                                       */
  /* ------------------------------------------------------------------ */

  _build() {
    const shadow = this.shadowRoot;
    shadow.innerHTML = "";

    /* --- static styles --- */
    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: block;
        --mc-fg: var(--primary-text-color, #fff);
      }
      ha-card {
        position: relative;
        overflow: hidden;
        height: 100%;
        box-sizing: border-box;
        background: #132532;
        transition: filter 0.3s, opacity 0.3s;
      }
      ha-card.off {
        filter: grayscale(1);
        opacity: 0.4;
      }

      /* --- background layers --- */
      .bg { position: absolute; inset: 0; overflow: hidden; }
      .bg-color {
        position: absolute; inset: 0;
        transition: background-color 0.8s ease;
      }
      .bg-image {
        position: absolute;
        right: 0; top: 0; bottom: 0;
        width: 0;
        background-size: cover;
        background-position: center;
        opacity: 0;
        transition: width 0.8s ease, opacity 0.8s ease;
      }
      .bg-gradient {
        position: absolute;
        right: 0; top: 0; bottom: 0;
        width: 0;
        opacity: 0;
        transition: width 0.8s ease, opacity 0.8s ease;
      }

      /* --- player content --- */
      .player {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        padding: 16px;
        height: 100%;
        box-sizing: border-box;
        color: var(--mc-fg);
      }

      /* top row */
      .top {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }
      .name {
        font-size: 18px;
        font-weight: 500;
        opacity: 0.85;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--mc-fg);
        flex: 1;
        min-width: 0;
      }
      .name-right {
        font-size: 18px;
        font-weight: 500;
        opacity: 0.85;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--mc-fg);
        flex-shrink: 0;
        max-width: 50%;
        text-align: right;
      }

      /* media info */
      .info {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        overflow: hidden;
        min-height: 0;
      }
      .title {
        font-size: 22px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--mc-fg);
        margin-bottom: 2px;
      }
      .album {
        font-size: 18px;
        font-weight: 500;
        opacity: 0.85;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--mc-fg);
      }
      /* tightened spacing only when the album (third line) is shown */
      .three-line .top { margin-bottom: 0; }
      .three-line .title { margin-bottom: 0; line-height: 1.2; }
      .three-line .name,
      .three-line .name-right,
      .three-line .album { line-height: 1.2; }
      .status {
        display: none;
      }

      /* controls */
      .controls {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        padding: 4px 0;
        gap: 4px;
      }
      .ctrl {
        background: none;
        border: none;
        cursor: pointer;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10px;
        flex: 1;
        max-width: 72px;
        transition: background-color 0.15s;
        color: var(--mc-fg);
        -webkit-tap-highlight-color: transparent;
        outline: none;
      }
      .ctrl ha-icon {
        --mdc-icon-size: 40px;
        color: var(--mc-fg);
      }
      .ctrl.pp {
        max-width: 132px;
      }
      .ctrl.pp ha-icon {
        --mdc-icon-size: 65px;
      }
      .ctrl.spacer {
        pointer-events: none;
        visibility: hidden;
      }
      .ctrl.skip ha-icon {
        --mdc-icon-size: 28px;
      }
      .ctrl:hover  { background-color: rgba(255,255,255,0.1); }
      .ctrl:active { background-color: rgba(255,255,255,0.2); }

      /* progress */
      .prog {
        margin-top: auto;
        padding-top: 4px;
      }
      .prog.no-progress {
        visibility: hidden;
      }
      .bar {
        width: 100%;
        height: 4px;
        background: rgba(255,255,255,0.2);
        border-radius: 2px;
        overflow: visible;
        cursor: pointer;
        position: relative;
        padding: 8px 0;
        background-clip: content-box;
      }
      .fill {
        height: 4px;
        border-radius: 2px;
        width: 0%;
        transition: width 1s linear;
        opacity: 0.8;
        background: var(--mc-fg);
        position: absolute;
        top: 8px;
        left: 0;
      }
      .thumb {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--mc-fg);
        position: absolute;
        top: 50%;
        left: 0%;
        transform: translate(-50%, -50%);
        cursor: grab;
        z-index: 2;
        transition: left 1s linear;
        box-shadow: 0 0 4px rgba(0,0,0,0.3);
      }
      .thumb:active, .thumb.dragging {
        cursor: grabbing;
        transform: translate(-50%, -50%) scale(1.3);
      }
      .times {
        display: flex;
        justify-content: space-between;
        font-size: 18px;
        opacity: 0.6;
        margin-top: 4px;
        color: var(--mc-fg);
      }
    `;
    shadow.appendChild(style);

    /* --- structure --- */
    const card = document.createElement("ha-card");
    // Force overflow clipping — ha-card shadow DOM may override CSS rules
    card.style.overflow = "hidden";
    card.style.position = "relative";

    // background
    const bg = document.createElement("div");
    bg.className = "bg";

    const bgColor = document.createElement("div");
    bgColor.className = "bg-color";

    const bgImage = document.createElement("div");
    bgImage.className = "bg-image";

    const bgGrad = document.createElement("div");
    bgGrad.className = "bg-gradient";

    bg.append(bgColor, bgImage, bgGrad);

    // player
    const player = document.createElement("div");
    player.className = "player";

    // top row
    const top = document.createElement("div");
    top.className = "top";

    const name = document.createElement("span");
    name.className = "name";
    const nameRight = document.createElement("span");
    nameRight.className = "name-right";
    nameRight.style.display = "none";
    top.append(name, nameRight);

    // info
    const info = document.createElement("div");
    info.className = "info";

    const title = document.createElement("div");
    title.className = "title";

    const album = document.createElement("div");
    album.className = "album";
    album.style.display = "none";

    const status = document.createElement("div");
    status.className = "status";

    info.append(title, album, status);

    // controls
    const controls = document.createElement("div");
    controls.className = "controls";

    const btns = this._getButtonDefs();

    const btnMap = {};
    for (const b of btns) {
      const btn = document.createElement("button");
      btn.className = b.cls;
      const ic = document.createElement("ha-icon");
      ic.setAttribute("icon", b.icon);
      btn.appendChild(ic);
      controls.appendChild(btn);
      btnMap[b.id] = { btn, ic };
    }

    // Roon control row — shown only when the Roon source ("TV:Remote") is
    // active on the Apple TV. Fixed transport set (previous / play-pause /
    // next); all three target the Roon entity via _mediaEntityId().
    const roonControls = document.createElement("div");
    roonControls.className = "controls roon-controls";
    roonControls.style.display = "none";
    const roonBtnDefs = [
      { id: "roon_prev", icon: "mdi:skip-previous", cls: "ctrl", service: "media_previous_track" },
      { id: "roon_pp", icon: "mdi:play", cls: "ctrl pp", service: "media_play_pause" },
      { id: "roon_next", icon: "mdi:skip-next", cls: "ctrl", service: "media_next_track" },
    ];
    for (const b of roonBtnDefs) {
      const btn = document.createElement("button");
      btn.className = b.cls;
      const ic = document.createElement("ha-icon");
      ic.setAttribute("icon", b.icon);
      btn.appendChild(ic);
      btn.addEventListener("click", () => this._callService(b.service));
      roonControls.appendChild(btn);
      btnMap[b.id] = { btn, ic };
    }

    // progress
    const prog = document.createElement("div");
    prog.className = "prog";

    const bar = document.createElement("div");
    bar.className = "bar";

    const fill = document.createElement("div");
    fill.className = "fill";

    const thumb = document.createElement("div");
    thumb.className = "thumb";

    bar.append(fill, thumb);

    const times = document.createElement("div");
    times.className = "times";

    const pos = document.createElement("span");
    pos.textContent = "\u00A0";
    const dur = document.createElement("span");
    dur.textContent = "\u00A0";
    times.append(pos, dur);

    prog.append(bar, times);

    player.append(top, info, controls, roonControls, prog);
    card.append(bg, player);
    shadow.appendChild(card);

    // store refs
    this._el = {
      card,
      bgColor,
      bgImage,
      bgGrad,
      name,
      nameRight,
      title,
      album,
      status,
      info,
      controls,
      roonControls,
      btnMap,
      prog,
      bar,
      fill,
      thumb,
      pos,
      dur,
    };

    // events — wire up each button based on its action type
    const buttonDefs = this._getButtonDefs();
    for (const b of buttonDefs) {
      if (!btnMap[b.id]) continue;
      const handler = () => {
        switch (b.action) {
          case "play_pause": this._handlePlayPause(); break;
          case "previous": this._callService("media_previous_track"); break;
          case "next": this._callService("media_next_track"); break;
          case "skip_back": this._seekRelative(-SKIP_SECONDS); break;
          case "skip_forward": this._seekRelative(SKIP_SECONDS); break;
          case "remote_command": this._sendRemoteCommand(b.command); break;
        }
      };
      btnMap[b.id].btn.addEventListener("click", handler);
    }
    // Seek support — disabled by seekable: false config
    const seekable = this._config.seekable !== false;
    if (seekable) {
      bar.addEventListener("click", (e) => {
        if (!this._dragging) this._seekAbsolute(e);
      });
      this._initDrag();
    } else {
      thumb.style.display = "none";
      bar.style.cursor = "default";
    }

    // ResizeObserver for artwork sizing
    this._resizeObserver = new ResizeObserver((entries) => {
      if (this._resizeTimeout) clearTimeout(this._resizeTimeout);
      this._resizeTimeout = setTimeout(() => {
        for (const entry of entries) {
          this._cardHeight = entry.contentRect.height;
        }
        this._updateBgSize();
      }, 250);
    });
    this._resizeObserver.observe(card);

    // apply default colours
    this._applyColors();

    this._built = true;

    if (this._hass) this._update();
  }

  /* ------------------------------------------------------------------ */
  /*  Button definitions                                                 */
  /* ------------------------------------------------------------------ */

  _getButtonDefs() {
    if (this._config.buttons) {
      return this._config.buttons.map((b, i) => {
        if (b.primary) {
          return { id: "pp", icon: "mdi:play", cls: "ctrl pp", action: "play_pause" };
        }
        if (b.spacer) {
          return { id: "spacer" + i, icon: "", cls: "ctrl spacer", action: "none" };
        }
        const cls = b.size === "skip" ? "ctrl skip" : "ctrl";
        return {
          id: "btn" + i,
          icon: b.icon,
          cls: cls,
          action: "remote_command",
          command: b.command,
        };
      });
    }
    // Default: Apple TV style
    return [
      { id: "sb", icon: "mdi:rewind-10", cls: "ctrl skip", action: "skip_back" },
      { id: "prev", icon: "mdi:skip-previous", cls: "ctrl", action: "previous" },
      { id: "pp", icon: "mdi:play", cls: "ctrl pp", action: "play_pause" },
      { id: "next", icon: "mdi:skip-next", cls: "ctrl", action: "next" },
      { id: "sf", icon: "mdi:fast-forward-10", cls: "ctrl skip", action: "skip_forward" },
    ];
  }

  /* ------------------------------------------------------------------ */
  /*  Drag support for seek thumb                                        */
  /* ------------------------------------------------------------------ */

  _initDrag() {
    const bar = this._el.bar;
    const thumb = this._el.thumb;

    const onStart = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._dragging = true;
      thumb.classList.add("dragging");
      // Disable transitions during drag for instant feedback
      this._el.fill.style.transition = "none";
      this._el.thumb.style.transition = "none";
      this._stopTimer();

      const onMove = (ev) => {
        const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
        const rect = bar.getBoundingClientRect();
        const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        this._el.fill.style.width = frac * 100 + "%";
        this._el.thumb.style.left = frac * 100 + "%";
        // Update position display during drag
        const entity = this._hass && this._hass.states[this._mediaEntityId()];
        if (entity && entity.attributes.media_duration) {
          this._el.pos.textContent = this._formatTime(frac * entity.attributes.media_duration);
        }
      };

      const onEnd = (ev) => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onEnd);
        document.removeEventListener("touchmove", onMove);
        document.removeEventListener("touchend", onEnd);
        thumb.classList.remove("dragging");

        // Restore transitions
        this._el.fill.style.transition = "";
        this._el.thumb.style.transition = "";

        // Commit seek
        const clientX = ev.changedTouches ? ev.changedTouches[0].clientX : ev.clientX;
        const rect = bar.getBoundingClientRect();
        const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const entity = this._hass && this._hass.states[this._mediaEntityId()];
        if (entity && entity.attributes.media_duration) {
          this._callService("media_seek", {
            seek_position: frac * entity.attributes.media_duration,
          });
        }

        // Small delay before re-enabling to avoid click handler firing
        setTimeout(() => {
          this._dragging = false;
          const ent = this._hass && this._hass.states[this._mediaEntityId()];
          if (ent && ent.state === "playing") this._startTimer();
        }, 50);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onEnd);
      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onEnd);
    };

    thumb.addEventListener("mousedown", onStart);
    thumb.addEventListener("touchstart", onStart, { passive: false });
    // Also allow drag from anywhere on the bar
    bar.addEventListener("mousedown", (e) => {
      if (e.target !== thumb) onStart(e);
    });
    bar.addEventListener("touchstart", (e) => {
      if (e.target !== thumb) onStart(e);
    }, { passive: false });
  }

  /* ------------------------------------------------------------------ */
  /*  Update DOM                                                         */
  /* ------------------------------------------------------------------ */

  _update() {
    if (!this._built || !this._hass || !this._config) return;

    const entity = this._hass.states[this._config.entity];
    if (!entity) return;

    const { state } = entity;
    const a = entity.attributes;
    const el = this._el;

    // Roon mode: when Roon is the active source (see _isRoonActive), media
    // info, artwork and transport come from the Roon entity instead of the
    // Apple TV. mEntity/m/mState alias the active media source — they equal
    // the configured entity when Roon isn't active, so the normal (non-Roon)
    // path is byte-for-byte unchanged.
    const roonId = this._roonEntityId();
    const roonEntity = this._hass.states[roonId];
    const roonActive = this._isRoonActive();
    const mEntity = roonActive ? roonEntity : entity;
    const m = mEntity.attributes;
    const mState = mEntity.state;

    // Swap the transport row: dedicated Roon controls (prev / play-pause /
    // next) in Roon mode, the normal controls otherwise.
    if (el.controls) el.controls.style.display = roonActive ? "none" : "";
    if (el.roonControls) el.roonControls.style.display = roonActive ? "" : "none";

    const isOff = state === "off" || state === "unavailable";
    const hasRealPic = !!(m.entity_picture || m.entity_picture_local);

    // Roku reports "playing" with ~3s phantom durations during menu/home nav;
    // treat that as idle so we don't flip the icon, show fallback art, etc.
    const PHANTOM_THRESHOLD = 5;
    const MIN_DURATION = 60;
    const isPhantomPlay = !roonActive && mState === "playing"
      && m.media_duration > 0 && m.media_duration < PHANTOM_THRESHOLD;
    const isPlaying = mState === "playing" && !isPhantomPlay;

    // card off styling
    el.card.classList.toggle("off", isOff);

    // top row — entity name when idle, app name when playing
    const isActive = ["playing", "paused", "buffering"].includes(mState) && !isPhantomPlay;

    // When paused, treat as active if:
    // - we have extracted colours from a prior playing state (genuine pause), OR
    // - there's a title but no pic — but ONLY if we previously saw real content
    //   (_hadRealContent) to avoid stale Apple TV attributes showing after returning home.
    //   FIX 3: The old `(!hasRealPic && !!a.media_title)` check was too permissive;
    //   Apple TV retains media_title/entity_picture after content ends/returning home.
    //   We now require _hadRealContent to be set (proves we genuinely played this content)
    //   before trusting a bare media_title in paused state.
    // - on Google TV only: valid progress info (duration + position) — Cast clears this
    //   reliably on home/app switch unlike Apple TV which keeps stale data
    const isGoogleTV = this._config.entity && this._config.entity.includes("google_tv");
    const hasProgress = m.media_duration > 0 && m.media_position !== undefined && m.media_position !== null;
    const isTrulyActive = isActive && (roonActive || isPlaying
      // FIX: guard all paused-state branches with _hadRealContent to prevent
      // stale Roku/Google TV attributes showing after content ends. Roku often
      // stays paused with entity_picture + customBg intact; Google TV can retain
      // progress data across Cast sessions. _hadRealContent is only set when we
      // observe genuine playing state, so a real pause still passes through.
      || (hasRealPic && this._customBg && this._hadRealContent)
      || (!hasRealPic && !!m.media_title && (isPlaying || this._hadRealContent))
      || (isGoogleTV && hasProgress && this._hadRealContent));

    // Use _confirmedApp when the entity isn't playing and we have one —
    // pyatv can report stale/wrong app_name during in-app menu navigation.
    // In Roon mode the app is always "TV:Remote" (displayed as "Roon").
    const rawApp = roonActive ? "TV:Remote"
      : ((!isPlaying && this._confirmedApp) ? this._confirmedApp : a.app_name);
    const appName = APP_DISPLAY_NAME[rawApp] || rawApp;
    // Whether the current app is recognised in APP_IMAGE_MAP (including package names)
    const knownApp = !!(rawApp && APP_IMAGE_MAP[rawApp]);
    const friendlyName = (a.friendly_name || this._config.entity).replace(/ Universal$/, "");

    // play / pause icon — use toggle icon when state is ambiguous:
    // "on" = no Cast info at all; "playing" with no media info = Cast state unreliable
    const hasMediaInfo = !!(m.media_title || m.media_duration || m.entity_picture || m.entity_picture_local);
    const ambiguousState = !roonActive && (state === "on" || (isPlaying && !hasMediaInfo));
    const ppIcon = ambiguousState ? "mdi:play-pause"
      : (isPlaying ? "mdi:pause" : "mdi:play");
    el.btnMap.pp.ic.setAttribute("icon", ppIcon);
    if (el.btnMap.roon_pp) {
      el.btnMap.roon_pp.ic.setAttribute("icon", isPlaying ? "mdi:pause" : "mdi:play");
    }

    // Pending app: set by launch scripts to show correct app immediately
    // before the entity updates. Cleared when real content starts playing.
    const pendingEntity = this._config.pending_app_entity
      && this._hass.states[this._config.pending_app_entity];
    const pendingApp = pendingEntity && pendingEntity.state && pendingEntity.state.length > 0
      ? pendingEntity.state : null;

    // Check whether the entity's app matches what the pending app expects.
    // During app transitions the entity may still report the previous app.
    const appMatchesPending = !pendingApp || (appName && appName === pendingApp);

    // Clear pending app when:
    // 1. The expected app is now playing with real content, OR
    // 2. A completely different app has loaded (pending is stale)
    if (!roonActive && pendingApp && appMatchesPending && isPlaying && !ambiguousState) {
      this._hass.callService("input_text", "set_value", {
        entity_id: this._config.pending_app_entity,
        value: "",
      });
    } else if (!roonActive && pendingApp && !appMatchesPending && isPlaying) {
      // Only clear pending on app mismatch when genuinely playing.
      // When paused/idle, pyatv may report stale app_name that doesn't
      // match the pending app — don't clear pending in that case.
      this._hass.callService("input_text", "set_value", {
        entity_id: this._config.pending_app_entity,
        value: "",
      });
    }

    // Show pending app when the entity hasn't caught up yet (stale data from
    // previous app) OR when the player isn't truly active yet
    const showPending = !roonActive && pendingApp && (!isTrulyActive || !appMatchesPending);
    const trustApp = knownApp && !this._navStale;
    const appText = roonActive ? "Roon"
      : (showPending
        ? pendingApp
        : ((isTrulyActive || trustApp) ? (appName || friendlyName) : friendlyName));

    // media info — only show title when truly active AND not showing stale data
    const hasTitle = isTrulyActive && !showPending && !!m.media_title;
    el.title.textContent = hasTitle ? m.media_title : "\u00A0";
    el.title.style.visibility = hasTitle ? "visible" : "hidden";

    // When real media is playing and an artist is reported, show the artist in
    // the app-name position (left) and move the app name to the right edge.
    const showArtist = hasTitle && !!m.media_artist;
    if (showArtist) {
      el.name.textContent = m.media_artist;
      el.nameRight.textContent = appText;
      el.nameRight.style.display = "";
    } else {
      el.name.textContent = appText;
      el.nameRight.textContent = "";
      el.nameRight.style.display = "none";
    }

    // Third line: album name (when present). Tighten line spacing via the
    // .three-line class so all three lines clear the play controls.
    const showAlbum = hasTitle && !!m.media_album_name;
    el.album.textContent = showAlbum ? m.media_album_name : "";
    el.album.style.display = showAlbum ? "" : "none";
    el.card.classList.toggle("three-line", showAlbum);

    // artwork background — suppress during phantom plays and app transitions
    const realPic = !isPhantomPlay && !showPending
      ? (m.entity_picture || m.entity_picture_local || null) : null;
    // image_entity: external image URL from an input_text helper (e.g. BBC iPlayer API)
    const imageEntity = this._config.image_entity
      && this._hass.states[this._config.image_entity];
    const externalPic = imageEntity && imageEntity.state && imageEntity.state.length > 0
      ? imageEntity.state : null;
    const fallbackAppName = showPending ? pendingApp : ((isTrulyActive || trustApp) ? rawApp : null);
    const fallbackPic = fallbackAppName
      ? (APP_IMAGE_MAP[fallbackAppName] || null) : null;
    // Show entity_picture immediately when available, without waiting
    // for async colour extraction to complete. The default background
    // (#132532) shows until _extractColors finishes, then transitions
    // smoothly via CSS. _hadRealContent guards against stale artwork.
    if (realPic && (this._hadRealContent || roonActive)) {
      el.bgImage.style.backgroundImage = "url('" + realPic + "')";
      el.bgImage.style.opacity = "1";
      this._updateBgSize();
    } else if (externalPic) {
      el.bgImage.style.backgroundImage = "url('" + externalPic + "')";
      el.bgImage.style.opacity = "1";
      this._updateBgSize();
    } else if (this._fetchedArtwork && isTrulyActive) {
      // TVmaze artwork — auto-fetched when no entity_picture available.
      // If _extractColors succeeded on this URL, bgColor and gradient
      // already reflect the artwork colours via _applyColors().
      el.bgImage.style.backgroundImage = "url('" + this._fetchedArtwork + "')";
      el.bgImage.style.opacity = "1";
      this._updateBgSize();
    } else if (fallbackPic) {
      el.bgImage.style.backgroundImage = "url('" + fallbackPic + "')";
      el.bgImage.style.opacity = "1";
      this._updateBgSize();
    } else {
      // Show device image as default background, or hide if none
      const devicePic = this._deviceImage();
      if (devicePic) {
        el.bgImage.style.backgroundImage = "url('" + devicePic + "')";
        el.bgImage.style.opacity = "1";
        this._updateBgSize();
      } else {
        el.bgImage.style.opacity = "0";
        el.bgImage.style.width = "0";
        el.bgGrad.style.opacity = "0";
        el.bgGrad.style.width = "0";
      }
    }

    // progress — use visibility:hidden to reserve space (no card height shift)
    // Detect live TV: duration growing over time means DVR buffer (live stream)
    const dur = m.media_duration;
    if (dur > 0 && this._prevMediaDuration !== null && dur > this._prevMediaDuration + 2) {
      this._isLiveStream = true;
    } else if (dur > 0 && this._prevMediaDuration !== null && dur < this._prevMediaDuration - 2) {
      // Duration decreased significantly = new content, reset
      this._isLiveStream = false;
    }
    if (dur > 0) this._prevMediaDuration = dur;

    const hasProg = isTrulyActive &&
      dur >= MIN_DURATION && m.media_position !== undefined && m.media_position !== null && !this._isLiveStream;
    el.prog.classList.toggle("no-progress", !hasProg);

    if (!hasProg) {
      // Reset progress display so stale data doesn't flash on next show
      el.fill.style.width = "0%";
      el.thumb.style.left = "0%";
      el.pos.textContent = "\u00A0";
      el.dur.textContent = "\u00A0";
    }

    if (hasProg && !this._dragging) {
      const frac = this._fraction(mEntity);
      el.fill.style.width = frac * 100 + "%";
      el.thumb.style.left = frac * 100 + "%";
      el.pos.textContent = this._formatTime(this._currentPos(mEntity));
      el.dur.textContent = this._formatTime(m.media_duration);
    }

    // timer
    if (isPlaying && !this._dragging) this._startTimer();
    else if (!isPlaying) this._stopTimer();
  }

  /* ------------------------------------------------------------------ */
  /*  Background colour extraction                                       */
  /* ------------------------------------------------------------------ */

  _applyColors() {
    const el = this._el;
    if (!el.bgColor) return;

    const bg = this._customBg || "#132532";
    const fg = this._customFg || "var(--primary-text-color, #fff)";

    el.bgColor.style.backgroundColor = bg;
    el.bgGrad.style.background =
      "linear-gradient(to right, " + bg + " 0%, transparent 100%)";
    this.style.setProperty("--mc-fg", fg);
  }

  _updateBgSize() {
    const el = this._el;
    if (!el.bgImage || !this._cardHeight) return;
    const h = this._cardHeight + "px";
    el.bgImage.style.width = h;
    el.bgGrad.style.width = h;
    el.bgGrad.style.opacity = "1";
  }

  _clearColors() {
    // Increment generation counters to invalidate any in-flight async
    // callbacks: _extractColors image loads and _fetchArtwork API calls.
    this._colorGeneration++;
    this._fetchedArtwork = null;
    this._artworkGeneration++;
    this._customBg = null;
    this._customFg = null;
    this._lastPicture = null;
    this._lastMediaTitle = null;
    const el = this._el;
    if (el.bgImage) {
      el.bgImage.style.opacity = "0";
      el.bgImage.style.width = "0";
    }
    if (el.bgGrad) {
      el.bgGrad.style.opacity = "0";
      el.bgGrad.style.width = "0";
    }
    this._applyColors();
  }

  _extractColors(url) {
    // FIX 5: Capture generation at call time. If _clearColors() fires before
    // the image loads, the generation will have advanced and the onload
    // callback will bail out instead of re-applying stale colours.
    const gen = this._colorGeneration;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Stale extraction — a clear happened since we started loading
      if (gen !== this._colorGeneration) return;
      try {
        const c = document.createElement("canvas");
        const ctx = c.getContext("2d");
        c.width = 16;
        c.height = 16;
        ctx.drawImage(img, 0, 0, 16, 16);
        const d = ctx.getImageData(0, 0, 16, 16).data;

        let r = 0,
          g = 0,
          b = 0,
          n = 0;
        for (let i = 0; i < d.length; i += 4) {
          const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
          if (lum > 30 && lum < 220) {
            r += d[i];
            g += d[i + 1];
            b += d[i + 2];
            n++;
          }
        }
        if (n === 0) return;

        r = Math.round(r / n);
        g = Math.round(g / n);
        b = Math.round(b / n);

        const dr = Math.round(r * 0.35);
        const dg = Math.round(g * 0.35);
        const db = Math.round(b * 0.35);

        this._customBg = "rgb(" + dr + "," + dg + "," + db + ")";
        const brightness = (dr * 299 + dg * 587 + db * 114) / 1000;
        this._customFg = brightness > 128 ? "#111" : "#fff";

        this._applyColors();
        this._update();
      } catch (_) {
        /* canvas taint or other - ignore */
      }
    };
    img.onerror = () => {};
    img.src = url;
  }

  /* ------------------------------------------------------------------ */
  /*  TVmaze artwork auto-fetch                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Fetch show artwork from TVmaze by title. Uses an in-memory cache
   * (keyed by title) so each show is looked up at most once per session.
   *
   * On success: sets _fetchedArtwork, attempts _extractColors for colour-
   * matched background, and calls _update() to display the artwork.
   *
   * On failure (no match, network error, CORS block): silently falls
   * through to the app-logo fallback in _update().
   *
   * The _artworkGeneration counter (incremented by _clearColors) ensures
   * that results arriving after a content/app change are discarded.
   */
  _fetchArtwork(title) {
    if (!title) return;

    // Cache hit — use immediately
    if (this._tvmazeCache[title]) {
      if (this._fetchedArtwork !== this._tvmazeCache[title]) {
        this._fetchedArtwork = this._tvmazeCache[title];
        this._extractColors(this._fetchedArtwork);
      }
      return;
    }

    const gen = this._artworkGeneration;

    fetch(
      "https://api.tvmaze.com/singlesearch/shows?q=" +
        encodeURIComponent(title) + "&embed=images"
    )
      .then(resp => {
        if (!resp.ok || gen !== this._artworkGeneration) return null;
        return resp.json();
      })
      .then(data => {
        if (!data || gen !== this._artworkGeneration) return;

        let url = null;

        // Prefer background (landscape) images for the card's right-aligned artwork
        const images = (data._embedded && data._embedded.images) || [];
        for (let i = 0; i < images.length; i++) {
          if (images[i].type === "background") {
            const res = images[i].resolutions || {};
            url = (res.original && res.original.url) || (res.medium && res.medium.url);
            if (url) break;
          }
        }

        // Fall back to the show's main poster image
        if (!url && data.image) {
          url = data.image.original || data.image.medium;
        }

        if (!url || gen !== this._artworkGeneration) return;

        this._tvmazeCache[title] = url;
        this._fetchedArtwork = url;
        this._extractColors(url);
        this._update();
      })
      .catch(() => {
        // Network error, CORS block, JSON parse failure — silently ignore.
        // The card falls through to the app-logo fallback.
      });
  }

  /* ------------------------------------------------------------------ */
  /*  FIX 6: Navigation-based stale data detection                       */
  /* ------------------------------------------------------------------ */

  /**
   * Subscribe (once) to HA call_service WebSocket events. When a
   * remote.send_command targeting our remote_entity is detected with a
   * navigation command, schedule a stale-data check.
   */
  _subscribeRemoteEvents() {
    if (this._eventUnsub) return;          // already subscribed
    const conn = this._hass && this._hass.connection;
    if (!conn) return;

    const remoteEntity = this._config.remote_entity ||
      this._config.entity.replace("media_player.", "remote.");

    // Default navigation commands — override via config nav_commands: [...]
    const navCommands = this._config.nav_commands || [
      "home", "top_menu",
    ];
    // Case-insensitive matching — Apple TV uses "home", Roku uses "home",
    // Google TV (Android TV Remote) uses "HOME".
    const navSet = new Set(navCommands.map(c => c.toLowerCase()));

    conn.subscribeEvents((event) => {
      const d = event.data;
      if (d.domain !== "remote" || d.service !== "send_command") return;

      // Entity ID may be in service_data or target (HA 2024.8+ format)
      const sdEnt = d.service_data && d.service_data.entity_id;
      const tgtEnt = d.target && d.target.entity_id;
      const candidates = [].concat(sdEnt || [], tgtEnt || []);
      if (!candidates.includes(remoteEntity)) return;

      // Check if any sent command is a navigation command
      const cmd = d.service_data && d.service_data.command;
      const cmds = Array.isArray(cmd) ? cmd : cmd ? [cmd] : [];
      if (!cmds.some(c => navSet.has(c.toLowerCase()))) return;

      this._scheduleStaleCheck();
    }, "call_service").then(unsub => {
      this._eventUnsub = unsub;
    });
  }

  /**
   * Schedule a delayed stale-data check. If the entity is not genuinely
   * playing when the timer fires, clear the card's internal state so it
   * falls back to the idle / app-logo display. The delay allows time for
   * pyatv to report new playing state if the navigation actually started
   * content (e.g. pressing select on a title).
   *
   * Each new navigation command resets the timer so rapid d-pad presses
   * don't cause flickering.
   */
  _scheduleStaleCheck() {
    if (!this._hadRealContent && !this._confirmedApp) return;  // nothing to clear
    if (this._staleCheckTimer) clearTimeout(this._staleCheckTimer);

    const delay = this._config.stale_check_delay || 2000;
    this._staleCheckTimer = setTimeout(() => {
      this._staleCheckTimer = null;
      if (!this._hass || !this._config) return;
      const entity = this._hass.states[this._config.entity];
      if (!entity) return;

      // If content is genuinely playing right now, leave it alone —
      // the navigation was probably within the player (e.g. subtitles menu)
      if (entity.state === "playing") return;

      // Clear stale state. Unlike the app-change handler, we do NOT snapshot
      // the current pic/title — we want _lastPicture to stay null so that
      // when content genuinely resumes (even with the same entity_picture),
      // contentChanged fires and _extractColors re-runs.
      this._clearColors();
      this._hadRealContent = false;
      this._confirmedApp = null;
      this._navStale = true;
      this._isLiveStream = false;
      this._prevMediaDuration = null;
      // Deliberately NOT snapshotting _lastPicture/_lastMediaTitle here
      // (unlike the app-change handler). _clearColors() leaves them null,
      // so when genuine content resumes — even with the same entity_picture —
      // contentChanged evaluates to true and _extractColors fires again.
      this._update();
    }, delay);
  }

  /* ------------------------------------------------------------------ */
  /*  Progress timer                                                     */
  /* ------------------------------------------------------------------ */

  _startTimer() {
    if (this._progressTimer) return;
    this._progressTimer = setInterval(() => this._tickProgress(), 1000);
  }

  _stopTimer() {
    if (this._progressTimer) {
      clearInterval(this._progressTimer);
      this._progressTimer = null;
    }
  }

  _tickProgress() {
    if (!this._hass || !this._config || !this._built || this._dragging) return;
    const entity = this._hass.states[this._mediaEntityId()];
    if (!entity || !entity.attributes.media_duration) return;

    const frac = this._fraction(entity);
    this._el.fill.style.width = frac * 100 + "%";
    this._el.thumb.style.left = frac * 100 + "%";
    this._el.pos.textContent = this._formatTime(this._currentPos(entity));
  }

  _currentPos(entity) {
    let p = entity.attributes.media_position || 0;
    if (
      entity.state === "playing" &&
      entity.attributes.media_position_updated_at
    ) {
      const elapsed =
        (Date.now() -
          new Date(entity.attributes.media_position_updated_at).getTime()) /
        1000;
      p += elapsed;
    }
    return Math.max(0, p);
  }

  _fraction(entity) {
    const dur = entity.attributes.media_duration;
    if (!dur || dur <= 0) return 0;
    return Math.min(Math.max(this._currentPos(entity) / dur, 0), 1);
  }

  /* ------------------------------------------------------------------ */
  /*  Service calls                                                      */
  /* ------------------------------------------------------------------ */

  _handlePlayPause() {
    if (!this._hass || !this._config) return;
    const entity = this._hass.states[this._config.entity];
    if (!entity) return;

    if (["idle", "standby"].includes(entity.state)) {
      // After screensaver, media_play_pause doesn't work; send wake command via remote
      const remoteId = this._config.remote_entity ||
        this._config.entity.replace("media_player.", "remote.");
      if (this._hass.states[remoteId]) {
        this._hass.callService("remote", "send_command", {
          entity_id: remoteId,
          command: this._config.wake_command || "select",
        });
        return;
      }
    }
    this._callService("media_play_pause");
  }

  _sendRemoteCommand(command) {
    if (!this._hass || !this._config) return;
    const remoteEntity = this._config.remote_entity ||
      this._config.entity.replace("media_player.", "remote.");
    if (!remoteEntity) return;
    this._hass.callService("remote", "send_command", {
      entity_id: remoteEntity,
      command: command,
    });
  }

  _roonEntityId() {
    return (this._config && this._config.roon_entity) || "media_player.roon_tv_area";
  }

  /* Roon is the active source when its media_player is actively playing or
     buffering, or paused while the Apple TV is still in its music/Roon
     context. pyatv reports the Apple TV's app_name as "Music" (app_id
     com.apple.TVMusic) during Roon playback and only "TV:Remote" at the
     launcher, so app_name alone is unreliable — the Roon entity's own state
     is the dependable signal. */
  _isRoonActive() {
    if (!this._hass || !this._config) return false;
    const primary = this._hass.states[this._config.entity];
    const roon = this._hass.states[this._roonEntityId()];
    if (!primary || !roon) return false;
    if (roon.state === "playing" || roon.state === "buffering") return true;
    if (roon.state !== "paused") return false;
    const ap = primary.attributes;
    return ap.app_id === "com.apple.TVMusic"
      || ap.app_name === "Music"
      || ap.app_name === "TV:Remote";
  }

  /* Returns the entity that media info and transport controls target: the
     Roon entity when Roon is the active source, else the configured entity. */
  _mediaEntityId() {
    if (!this._hass || !this._config) return this._config && this._config.entity;
    if (this._isRoonActive()) return this._roonEntityId();
    return this._config.entity;
  }

  _callService(service, data) {
    if (!this._hass || !this._config) return;
    this._hass.callService("media_player", service, {
      entity_id: this._mediaEntityId(),
      ...(data || {}),
    });
  }

  _seekRelative(delta) {
    const entity =
      this._hass && this._hass.states[this._mediaEntityId()];
    if (!entity || entity.attributes.media_position === undefined) return;
    const pos = this._currentPos(entity);
    const dur = entity.attributes.media_duration || Infinity;
    this._callService("media_seek", {
      seek_position: Math.min(dur, Math.max(0, pos + delta)),
    });
  }

  _seekAbsolute(e) {
    const entity =
      this._hass && this._hass.states[this._mediaEntityId()];
    if (!entity || !entity.attributes.media_duration) return;
    const rect = this._el.bar.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    this._callService("media_seek", {
      seek_position: frac * entity.attributes.media_duration,
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Utilities                                                          */
  /* ------------------------------------------------------------------ */

  _deviceImage() {
    if (!this._config || !this._config.entity) return null;
    const id = this._config.entity;
    for (const key in DEVICE_IMAGE_MAP) {
      if (id.includes(key)) return DEVICE_IMAGE_MAP[key];
    }
    return null;
  }

  _formatTime(sec) {
    if (sec === undefined || sec === null || isNaN(sec)) return "";
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h > 0
      ? h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0")
      : m + ":" + String(s).padStart(2, "0");
  }
}

/* -------------------------------------------------------------------- */
/*  Registration                                                         */
/* -------------------------------------------------------------------- */

customElements.define("mkraftman-media-control", MkraftmanMediaControl);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "mkraftman-media-control",
  name: "Mkraftman Media Control",
  description:
    "Modified media control card: no power/menu/browse, full-width transport controls, draggable seek, right-aligned artwork.",
});
