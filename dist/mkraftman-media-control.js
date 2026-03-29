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
 *
 * Config options:
 *   entity:        (required) media_player entity
 *   remote_entity: (optional) remote entity for send_command actions
 *   buttons:       (optional) array of button definitions:
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
  "BBC Sounds": "/local/images/bbc-sounds.png",
  "TV": "/local/images/apple-tv.png",
  "com.apple.TVWatchList": "/local/images/apple-tv.png",
  "Starz": "/local/images/starz.png",
  "STARZ": "/local/images/starz.png",
  "Sky Q": "/local/images/sky.png",
  "Sky": "/local/images/sky.png",
  "Peacock": "/local/images/peacock.png",
  "U": "/local/images/u.png",
  "UKTV": "/local/images/u.png",
  "UKTV Play": "/local/images/u.png"
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
    // Clear artwork cache so we start fresh on reconnect
    this._clearColors();
    this._lastPicture = null;
    this._prevAppName = undefined;
    this._prevMediaDuration = null;
    this._isLiveStream = false;
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

    // Skip if our entity hasn't changed
    const prevEntity = prev && prev.states[this._config.entity];
    if (
      prevEntity &&
      prevEntity.last_updated === entity.last_updated &&
      prevEntity.state === entity.state
    ) {
      return;
    }

    if (!this._built) this._build();

    // Detect app change -> reset background and live stream flag
    const app = entity.attributes.app_name || null;
    if (this._prevAppName !== undefined && app !== this._prevAppName) {
      this._clearColors();
      this._isLiveStream = false;
      this._prevMediaDuration = null;
    }
    this._prevAppName = app;

    // Idle / off / standby -> reset background and live stream flag
    if (["idle", "standby", "off", "unavailable"].includes(entity.state)) {
      this._clearColors();
      this._isLiveStream = false;
      this._prevMediaDuration = null;
    }

    // Detect new content by change in picture OR media title
    const pic =
      entity.attributes.entity_picture ||
      entity.attributes.entity_picture_local ||
      null;
    const title = entity.attributes.media_title || null;
    const dur = entity.attributes.media_duration;
    const phantom = entity.state === "playing" && dur > 0 && dur < 5;
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
    } else if (contentChanged && entity.state === "paused") {
      // Content changed while paused — stale data; clear, don't extract
      this._clearColors();
      this._lastMediaTitle = title;
      this._isLiveStream = false;
      this._prevMediaDuration = null;
    } else if ((!pic || phantom) && this._lastPicture) {
      this._lastPicture = null;
      this._clearColors();
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
    top.append(name);

    // info
    const info = document.createElement("div");
    info.className = "info";

    const title = document.createElement("div");
    title.className = "title";

    const status = document.createElement("div");
    status.className = "status";

    info.append(title, status);

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

    player.append(top, info, controls, prog);
    card.append(bg, player);
    shadow.appendChild(card);

    // store refs
    this._el = {
      card,
      bgColor,
      bgImage,
      bgGrad,
      name,
      title,
      status,
      info,
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
        const entity = this._hass && this._hass.states[this._config.entity];
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
        const entity = this._hass && this._hass.states[this._config.entity];
        if (entity && entity.attributes.media_duration) {
          this._callService("media_seek", {
            seek_position: frac * entity.attributes.media_duration,
          });
        }

        // Small delay before re-enabling to avoid click handler firing
        setTimeout(() => {
          this._dragging = false;
          const ent = this._hass && this._hass.states[this._config.entity];
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

    const isOff = state === "off" || state === "unavailable";
    const hasRealPic = !!(a.entity_picture || a.entity_picture_local);

    // Roku reports "playing" with ~3s phantom durations during menu/home nav;
    // treat that as idle so we don't flip the icon, show fallback art, etc.
    const PHANTOM_THRESHOLD = 5;
    const MIN_DURATION = 60;
    const isPhantomPlay = state === "playing"
      && a.media_duration > 0 && a.media_duration < PHANTOM_THRESHOLD;
    const isPlaying = state === "playing" && !isPhantomPlay;

    // card off styling
    el.card.classList.toggle("off", isOff);

    // top row — entity name when idle, app name when playing
    const isActive = ["playing", "paused", "buffering"].includes(state) && !isPhantomPlay;
    // When paused, treat as active if:
    // - we have extracted colours from a prior playing state (genuine pause), OR
    // - there's a title but no pic (e.g. BBC iPlayer on Google TV — real content, no artwork)
    // Apple TV stale data always has a pic, so the _customBg check catches that.
    const isTrulyActive = isActive && (isPlaying
      || (hasRealPic && this._customBg)
      || (!hasRealPic && !!a.media_title));
    const appName = a.app_name === "TV" ? "Apple TV" : a.app_name;
    const friendlyName = (a.friendly_name || this._config.entity).replace(/ Universal$/, "");
    el.name.textContent = isTrulyActive
      ? (appName || friendlyName)
      : friendlyName;

    // media info — only show title when truly active
    const hasTitle = isTrulyActive && !!a.media_title;
    el.title.textContent = hasTitle ? a.media_title : "\u00A0";
    el.title.style.visibility = hasTitle ? "visible" : "hidden";

    // play / pause icon — use toggle icon when state is ambiguous:
    // "on" = no Cast info at all; "playing" with no media info = Cast state unreliable
    const hasMediaInfo = !!(a.media_title || a.media_duration || a.entity_picture || a.entity_picture_local);
    const ambiguousState = state === "on" || (isPlaying && !hasMediaInfo);
    const ppIcon = ambiguousState ? "mdi:play-pause"
      : (isPlaying ? "mdi:pause" : "mdi:play");
    el.btnMap.pp.ic.setAttribute("icon", ppIcon);

    // artwork background — suppress during phantom plays
    const realPic = !isPhantomPlay
      ? (a.entity_picture || a.entity_picture_local || null) : null;
    const fallbackPic = (!realPic && isTrulyActive && a.app_name)
      ? (APP_IMAGE_MAP[a.app_name] || null) : null;
    if (realPic && this._customBg) {
      el.bgImage.style.backgroundImage = "url('" + realPic + "')";
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
    const dur = a.media_duration;
    if (dur > 0 && this._prevMediaDuration !== null && dur > this._prevMediaDuration + 2) {
      this._isLiveStream = true;
    } else if (dur > 0 && this._prevMediaDuration !== null && dur < this._prevMediaDuration - 2) {
      // Duration decreased significantly = new content, reset
      this._isLiveStream = false;
    }
    if (dur > 0) this._prevMediaDuration = dur;

    const hasProg = isTrulyActive &&
      dur >= MIN_DURATION && a.media_position !== undefined && a.media_position !== null && !this._isLiveStream;
    el.prog.classList.toggle("no-progress", !hasProg);

    if (!hasProg) {
      // Reset progress display so stale data doesn't flash on next show
      el.fill.style.width = "0%";
      el.thumb.style.left = "0%";
      el.pos.textContent = "\u00A0";
      el.dur.textContent = "\u00A0";
    }

    if (hasProg && !this._dragging) {
      const frac = this._fraction(entity);
      el.fill.style.width = frac * 100 + "%";
      el.thumb.style.left = frac * 100 + "%";
      el.pos.textContent = this._formatTime(this._currentPos(entity));
      el.dur.textContent = this._formatTime(a.media_duration);
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
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
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
    const entity = this._hass.states[this._config.entity];
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

  _callService(service, data) {
    if (!this._hass || !this._config) return;
    this._hass.callService("media_player", service, {
      entity_id: this._config.entity,
      ...(data || {}),
    });
  }

  _seekRelative(delta) {
    const entity =
      this._hass && this._hass.states[this._config && this._config.entity];
    if (!entity || entity.attributes.media_position === undefined) return;
    const pos = this._currentPos(entity);
    const dur = entity.attributes.media_duration || Infinity;
    this._callService("media_seek", {
      seek_position: Math.min(dur, Math.max(0, pos + delta)),
    });
  }

  _seekAbsolute(e) {
    const entity =
      this._hass && this._hass.states[this._config && this._config.entity];
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
