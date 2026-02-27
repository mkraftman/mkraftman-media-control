/**
 * Custom Media Control Card
 *
 * A modified clone of the built-in media-control card with:
 *  - Always maximum depth (full card height, no size shift)
 *  - No power button
 *  - No three-dots menu
 *  - No browse media button
 *  - Always-visible full-width controls: skip back, previous, play/pause, next, skip forward
 *  - Draggable seek thumb on progress bar
 *  - Right-aligned artwork with colour fade to left
 *  - Background resets to default on app change or return to home screen
 */

const SKIP_SECONDS = 10;

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
    this._customBg = null;
    this._customFg = null;

    this._progressTimer = null;
    this._dragging = false;
    this._cardHeight = 0;
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

    // Detect app change -> reset background
    const app = entity.attributes.app_name || null;
    if (this._prevAppName !== undefined && app !== this._prevAppName) {
      this._clearColors();
    }
    this._prevAppName = app;

    // Idle / off / standby -> reset background
    if (["idle", "standby", "off", "unavailable"].includes(entity.state)) {
      this._clearColors();
    }

    // New artwork -> extract colours
    const pic =
      entity.attributes.entity_picture ||
      entity.attributes.entity_picture_local ||
      null;
    if (
      pic &&
      pic !== this._lastPicture &&
      ["playing", "paused", "buffering"].includes(entity.state)
    ) {
      this._lastPicture = pic;
      this._extractColors(pic);
    } else if (!pic && this._lastPicture) {
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
        transition: filter 0.3s, opacity 0.3s;
      }
      ha-card.off {
        filter: grayscale(1);
        opacity: 0.4;
      }

      /* --- background layers --- */
      .bg { position: absolute; inset: 0; }
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
      .top ha-icon {
        --mdc-icon-size: 24px;
        flex-shrink: 0;
        opacity: 0.85;
        color: var(--mc-fg);
      }
      .name {
        font-size: 14px;
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
        font-size: 18px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--mc-fg);
        margin-bottom: 2px;
      }
      .secondary {
        font-size: 14px;
        opacity: 0.7;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--mc-fg);
      }
      .status {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        opacity: 0.4;
        color: var(--mc-fg);
        text-transform: capitalize;
      }
      .hidden { display: none !important; }

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
        max-width: 88px;
      }
      .ctrl.pp ha-icon {
        --mdc-icon-size: 52px;
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
        font-size: 12px;
        opacity: 0.6;
        margin-top: 4px;
        color: var(--mc-fg);
      }
    `;
    shadow.appendChild(style);

    /* --- structure --- */
    const card = document.createElement("ha-card");

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

    const icon = document.createElement("ha-icon");
    const name = document.createElement("span");
    name.className = "name";
    top.append(icon, name);

    // info
    const info = document.createElement("div");
    info.className = "info";

    const title = document.createElement("div");
    title.className = "title";

    const secondary = document.createElement("div");
    secondary.className = "secondary";

    const status = document.createElement("div");
    status.className = "status";

    info.append(title, secondary, status);

    // controls
    const controls = document.createElement("div");
    controls.className = "controls";

    const btns = [
      { id: "sb", icon: "mdi:rewind-10", cls: "ctrl" },
      { id: "prev", icon: "mdi:skip-previous", cls: "ctrl" },
      { id: "pp", icon: "mdi:play", cls: "ctrl pp" },
      { id: "next", icon: "mdi:skip-next", cls: "ctrl" },
      { id: "sf", icon: "mdi:fast-forward-10", cls: "ctrl" },
    ];

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
    const dur = document.createElement("span");
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
      icon,
      name,
      title,
      secondary,
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

    // events
    btnMap.sb.btn.addEventListener("click", () => this._seekRelative(-SKIP_SECONDS));
    btnMap.prev.btn.addEventListener("click", () => this._callService("media_previous_track"));
    btnMap.pp.btn.addEventListener("click", () => this._callService("media_play_pause"));
    btnMap.next.btn.addEventListener("click", () => this._callService("media_next_track"));
    btnMap.sf.btn.addEventListener("click", () => this._seekRelative(SKIP_SECONDS));
    bar.addEventListener("click", (e) => {
      if (!this._dragging) this._seekAbsolute(e);
    });

    // drag support for seek thumb
    this._initDrag();

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
    const isPlaying = state === "playing";

    // card off styling
    el.card.classList.toggle("off", isOff);

    // icon & name
    const iconName =
      a.icon ||
      (a.device_class === "tv"
        ? "mdi:television"
        : a.device_class === "speaker"
          ? "mdi:speaker"
          : a.device_class === "receiver"
            ? "mdi:audio-video"
            : "mdi:cast");
    el.icon.setAttribute("icon", iconName);
    el.name.textContent = a.friendly_name || this._config.entity;

    // media info
    const hasTitle = !!a.media_title;
    el.title.textContent = a.media_title || "";
    el.title.classList.toggle("hidden", !hasTitle);

    const sec = a.media_artist || a.app_name || "";
    el.secondary.textContent = sec;
    el.secondary.classList.toggle("hidden", !hasTitle || !sec);

    const statusText = isOff
      ? state
      : ["idle", "standby"].includes(state)
        ? state
        : hasTitle
          ? ""
          : "No media";
    el.status.textContent = statusText;
    el.status.classList.toggle("hidden", hasTitle);

    // play / pause icon
    el.btnMap.pp.ic.setAttribute("icon", isPlaying ? "mdi:pause" : "mdi:play");

    // artwork background
    const pic = a.entity_picture || a.entity_picture_local || null;
    if (pic && this._customBg) {
      el.bgImage.style.backgroundImage = "url('" + pic + "')";
      el.bgImage.style.opacity = "1";
      this._updateBgSize();
    } else {
      el.bgImage.style.opacity = "0";
      el.bgImage.style.width = "0";
      el.bgGrad.style.opacity = "0";
      el.bgGrad.style.width = "0";
    }

    // progress — use visibility:hidden to reserve space (no card height shift)
    const hasProg =
      a.media_duration > 0 && a.media_position !== undefined && a.media_position !== null;
    el.prog.classList.toggle("no-progress", !hasProg);

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

    const bg = this._customBg || "var(--card-background-color, var(--ha-card-background, #1c1c1c))";
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
