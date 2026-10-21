/**
 * VocabForge — GPU-cheap animated background
 *
 * A single full-screen canvas particle field: a dense low-detail "dust" layer for
 * density and a small "node" layer that links to its neighbours for structure.
 *
 * Why it stays cheap (these are the decisions that matter):
 *  - fillRect for dust, never arc+fill. A 1-2px rect is materially cheaper than a
 *    circle and nobody can tell the difference.
 *  - A canvas state change (fillStyle/globalAlpha) costs about as much as the draw
 *    itself, so setting alpha per speck doubles the whole pass. Instead alpha is
 *    quantised into 8 buckets and specks are grouped by (colour, bucket), so the
 *    entire dust layer costs ~16 fillStyle writes per frame instead of thousands.
 *  - Linking is O(n²) so only the small node set pays for it.
 *  - DPR capped at 2. Deterministic PRNG so the field is identical on every load.
 *
 * Non-negotiables:
 *  - prefers-reduced-motion draws ONE static frame and never starts the loop.
 *  - IntersectionObserver pauses the loop when the canvas is off-screen.
 *  - visibilitychange pauses it when the tab is hidden.
 *  - ResizeObserver (not window resize) sizes the canvas; clientWidth is 0 on first
 *    paint and a window resize never fires to rescue it.
 *  - Draw one frame immediately on mount so the canvas is never briefly empty.
 *  - Full cleanup on unmount.
 *
 * Exposes window.VFBackground with mount(canvas), unmount(), refreshColors().
 */
(function () {
  'use strict';

  var DPR_CAP = 2;
  var DUST_DENSITY = 1 / 9000;   // specks per px², before the floor
  var DUST_FLOOR = 900;
  var NODE_COUNT = 130;
  var LINK_DIST = 130;
  var LINK_DIST_SQ = LINK_DIST * LINK_DIST;
  var BUCKETS = 8;
  var COLOURS = 2;

  var _canvas = null;
  var _ctx = null;
  var _raf = 0;
  var _running = false;
  var _inView = true;
  var _docVisible = true;

  var _w = 0, _h = 0, _dpr = 1;
  var _dust = [], _nodes = [];
  var _t = 0, _last = 0;

  var _mx = 0.5, _my = 0.5;      // pointer, normalised
  var _px = 0, _py = 0;          // eased pointer

  var _io = null, _ro = null;
  var _reduceMotionQuery = null;

  // Colour groups: COLOURS x BUCKETS reused arrays, reset each frame.
  var _dustGroups = [];
  var _nodeGroups = [];
  var _linkGroups = [];

  // Theme colours, refreshed on theme change.
  var _accent = [34, 211, 238];   // cyan default
  var _warm = [251, 146, 60];     // warm secondary

  // Deterministic PRNG so the field is identical every load (art-directable,
  // and it means a resize never visibly "re-rolls" the design).
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hexToRgb(css) {
    var hex = (css || '').replace('#', '').trim();
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    if (hex.length !== 6) return null;
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return [r, g, b];
  }

  function refreshColors() {
    var root = document.documentElement;
    var a = hexToRgb(getComputedStyle(root).getPropertyValue('--accent'));
    var b = hexToRgb(getComputedStyle(root).getPropertyValue('--bg'));
    if (a) _accent = a;
    // The secondary colour is a warm counterpoint to the accent; derive it from the
    // accent's complement so it stays in harmony with every theme.
    _warm = [255 - _accent[0], Math.max(60, 255 - _accent[1]), Math.min(255, 255 - _accent[2])];
    void b;
  }

  // ── Field construction ────────────────────────────────────────────────────
  function buildField() {
    var rnd = mulberry32(0x9E3779B9);
    var area = _w * _h;
    var count = Math.max(DUST_FLOOR, Math.round(area * DUST_DENSITY));

    _dust = [];
    var i;
    for (i = 0; i < count; i++) {
      _dust.push({
        x: rnd() * _w,
        y: rnd() * _h,
        vx: (rnd() - 0.5) * 0.2,
        vy: (rnd() - 0.5) * 0.2,
        size: rnd() < 0.75 ? 1 : 2,
        phase: rnd() * Math.PI * 2,
        rate: 0.6 + rnd() * 1.6,
        colour: rnd() < 0.82 ? 0 : 1
      });
    }

    _nodes = [];
    for (i = 0; i < NODE_COUNT; i++) {
      _nodes.push({
        x: rnd() * _w,
        y: rnd() * _h,
        vx: (rnd() - 0.5) * 0.12,
        vy: (rnd() - 0.5) * 0.12,
        r: 1.6 + rnd() * 1.8,
        phase: rnd() * Math.PI * 2,
        rate: 0.4 + rnd() * 1.0,
        colour: rnd() < 0.82 ? 0 : 1
      });
    }

    // Pre-allocate the group arrays.
    var groups, j;
    _dustGroups = []; _nodeGroups = []; _linkGroups = [];
    for (j = 0; j < COLOURS * BUCKETS; j++) {
      _dustGroups.push([]);
      _nodeGroups.push([]);
    }
    for (j = 0; j < COLOURS * BUCKETS; j++) _linkGroups.push([]);
  }

  // ── Sizing ────────────────────────────────────────────────────────────────
  function resize() {
    if (!_canvas) return;
    var rect = _canvas.getBoundingClientRect();
    var w = Math.round(rect.width);
    var h = Math.round(rect.height);
    if (w <= 0 || h <= 0) return;

    _dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    _canvas.width = Math.round(w * _dpr);
    _canvas.height = Math.round(h * _dpr);
    _ctx.setTransform(_dpr, 0, 0, _dpr, 0, 0);
    _w = w; _h = h;

    // Rebuild only if the field is empty or the box genuinely changed.
    if (_dust.length === 0 || _dust[0]._builtFor !== w + 'x' + h) {
      buildField();
      for (var i = 0; i < _dust.length; i++) _dust[i]._builtFor = w + 'x' + h;
      for (var k = 0; k < _nodes.length; k++) _nodes[k]._builtFor = w + 'x' + h;
    }
    drawFrame(0);
  }

  // ── Rendering ─────────────────────────────────────────────────────────────
  function drawFrame(dt) {
    if (!_ctx) return;
    _t += dt;
    var t = _t;

    // Ease the parallax offset toward the pointer. Dust parallaxes ~1.9x further
    // than the nodes for cheap depth; nothing attracts or repels.
    _px += (_mx - _px) * 0.045;
    _py += (_my - _py) * 0.045;
    var ox = (_px - 0.5) * -18;
    var oy = (_py - 0.5) * -18;

    _ctx.clearRect(0, 0, _w, _h);

    var i, p, a, bucket, key, groups, x, y, j, n;

    // ── DUST ──
    for (j = 0; j < _dustGroups.length; j++) _dustGroups[j].length = 0;

    for (i = 0; i < _dust.length; i++) {
      p = _dust[i];
      // Cheap standing-wave flow field: two trig calls bend the paths enough that
      // the field swirls instead of travelling in straight lines.
      p.vx += Math.sin(p.y * 0.0045 + t * 0.34) * 0.02;
      p.vy += Math.cos(p.x * 0.0052 - t * 0.29) * 0.02;
      p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx; p.y += p.vy;

      if (p.x < -24) p.x = _w + 24; else if (p.x > _w + 24) p.x = -24;
      if (p.y < -24) p.y = _h + 24; else if (p.y > _h + 24) p.y = -24;

      // Individual twinkle so the field reads as alive, not a sliding texture.
      a = 0.62 + 0.38 * Math.sin(t * p.rate + p.phase);
      bucket = Math.min(BUCKETS - 1, Math.max(0, Math.floor(a * BUCKETS)));
      key = p.colour * BUCKETS + bucket;
      _dustGroups[key].push(p.x + ox * 1.9, p.y + oy * 1.9, p.size);
    }

    // ONE fillStyle per group, then every rect in that group.
    for (j = 0; j < _dustGroups.length; j++) {
      groups = _dustGroups[j];
      if (!groups.length) continue;
      var ci = Math.floor(j / BUCKETS);
      var bi = j % BUCKETS;
      var col = ci === 0 ? _accent : _warm;
      var alpha = ((bi + 1) / BUCKETS) * 0.55;
      _ctx.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + alpha.toFixed(3) + ')';
      for (i = 0; i < groups.length; i += 3) {
        _ctx.fillRect(groups[i], groups[i + 1], groups[i + 2], groups[i + 2]);
      }
    }

    // ── NODES ──
    for (j = 0; j < _nodeGroups.length; j++) _nodeGroups[j].length = 0;
    for (j = 0; j < _linkGroups.length; j++) _linkGroups[j].length = 0;

    for (i = 0; i < _nodes.length; i++) {
      n = _nodes[i];
      n.vx += Math.sin(n.y * 0.003 + t * 0.2) * 0.012;
      n.vy += Math.cos(n.x * 0.0034 - t * 0.17) * 0.012;
      n.vx *= 0.97; n.vy *= 0.97;
      n.x += n.vx; n.y += n.vy;

      if (n.x < -24) n.x = _w + 24; else if (n.x > _w + 24) n.x = -24;
      if (n.y < -24) n.y = _h + 24; else if (n.y > _h + 24) n.y = -24;

      a = 0.55 + 0.45 * Math.sin(t * n.rate + n.phase);
      bucket = Math.min(BUCKETS - 1, Math.max(0, Math.floor(a * BUCKETS)));
      _nodeGroups[n.colour * BUCKETS + bucket].push(n.x + ox, n.y + oy, n.r);
    }

    for (j = 0; j < _nodeGroups.length; j++) {
      groups = _nodeGroups[j];
      if (!groups.length) continue;
      var nci = Math.floor(j / BUCKETS);
      var nbi = j % BUCKETS;
      var ncol = nci === 0 ? _accent : _warm;
      var nalpha = ((nbi + 1) / BUCKETS) * 0.8;
      _ctx.fillStyle = 'rgba(' + ncol[0] + ',' + ncol[1] + ',' + ncol[2] + ',' + nalpha.toFixed(3) + ')';
      for (i = 0; i < groups.length; i += 3) {
        _ctx.beginPath();
        _ctx.arc(groups[i], groups[i + 1], groups[i + 2], 0, 6.2832);
        _ctx.fill();
      }
    }

    // Links between close neighbours — O(n²) but n is small.
    for (i = 0; i < _nodes.length; i++) {
      var a1 = _nodes[i];
      var ax = a1.x + ox, ay = a1.y + oy;
      for (var k = i + 1; k < _nodes.length; k++) {
        var a2 = _nodes[k];
        var bx = a2.x + ox, by = a2.y + oy;
        var dx = ax - bx, dy = ay - by;
        var d2 = dx * dx + dy * dy;
        if (d2 < LINK_DIST_SQ) {
          var al = 1 - Math.sqrt(d2) / LINK_DIST;
          var b2 = Math.min(BUCKETS - 1, Math.max(0, Math.floor(al * BUCKETS)));
          var key2 = a1.colour * BUCKETS + b2;
          var g = _linkGroups[key2];
          g.push(ax, ay, bx, by);
        }
      }
    }

    for (j = 0; j < _linkGroups.length; j++) {
      groups = _linkGroups[j];
      if (!groups.length) continue;
      var lci = Math.floor(j / BUCKETS);
      var lbi = j % BUCKETS;
      var lcol = lci === 0 ? _accent : _warm;
      var lalpha = ((lbi + 1) / BUCKETS) * 0.35;
      _ctx.strokeStyle = 'rgba(' + lcol[0] + ',' + lcol[1] + ',' + lcol[2] + ',' + lalpha.toFixed(3) + ')';
      _ctx.lineWidth = 1;
      _ctx.beginPath();
      for (i = 0; i < groups.length; i += 4) {
        _ctx.moveTo(groups[i], groups[i + 1]);
        _ctx.lineTo(groups[i + 2], groups[i + 3]);
      }
      _ctx.stroke();
    }
  }

  // ── Loop control ──────────────────────────────────────────────────────────
  function loop(now) {
    if (!_running) return;
    var dt = _last ? Math.min((now - _last) / 1000, 0.05) : 0.016;
    _last = now;
    drawFrame(dt);
    _raf = requestAnimationFrame(loop);
  }

  function shouldRun() {
    return _running && _inView && _docVisible && !_reduceMotionQuery.matches;
  }

  function sync() {
    if (shouldRun()) {
      if (!_raf) { _last = 0; _raf = requestAnimationFrame(loop); }
    } else if (_raf) {
      cancelAnimationFrame(_raf);
      _raf = 0;
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  function mount(canvas) {
    if (!canvas) return;
    _canvas = canvas;
    _ctx = canvas.getContext('2d', { alpha: true });
    if (!_ctx) return;

    refreshColors();

    _reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    var onMotionChange = function () {
      if (_reduceMotionQuery.matches) {
        // One static frame, then stop. Never start the loop.
        if (_raf) { cancelAnimationFrame(_raf); _raf = 0; }
        drawFrame(0);
      } else {
        sync();
      }
    };
    if (_reduceMotionQuery.addEventListener) {
      _reduceMotionQuery.addEventListener('change', onMotionChange);
    } else if (_reduceMotionQuery.addListener) {
      _reduceMotionQuery.addListener(onMotionChange);
    }
    _reduceMotionQuery._vfHandler = onMotionChange;

    var onPointer = function (e) {
      _mx = e.clientX / Math.max(1, window.innerWidth);
      _my = e.clientY / Math.max(1, window.innerHeight);
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    window._vfBgPointer = onPointer;

    var onVisibility = function () {
      _docVisible = !document.hidden;
      sync();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window._vfBgVisibility = onVisibility;

    _io = new IntersectionObserver(function (entries) {
      _inView = entries[0].isIntersecting;
      sync();
    }, { threshold: 0 });
    _io.observe(canvas);

    _ro = new ResizeObserver(function () { resize(); });
    _ro.observe(canvas);

    _running = true;
    resize();          // draws one frame immediately
    if (_reduceMotionQuery.matches) {
      // Reduced motion: the single frame above is all there is.
      _running = true;
      sync();
    } else {
      sync();
    }
  }

  function unmount() {
    _running = false;
    if (_raf) { cancelAnimationFrame(_raf); _raf = 0; }
    if (_io) { _io.disconnect(); _io = null; }
    if (_ro) { _ro.disconnect(); _ro = null; }

    if (_reduceMotionQuery && _reduceMotionQuery._vfHandler) {
      if (_reduceMotionQuery.removeEventListener) {
        _reduceMotionQuery.removeEventListener('change', _reduceMotionQuery._vfHandler);
      } else if (_reduceMotionQuery.removeListener) {
        _reduceMotionQuery.removeListener(_reduceMotionQuery._vfHandler);
      }
      _reduceMotionQuery._vfHandler = null;
    }
    if (window._vfBgPointer) {
      window.removeEventListener('pointermove', window._vfBgPointer);
      window._vfBgPointer = null;
    }
    if (window._vfBgVisibility) {
      document.removeEventListener('visibilitychange', window._vfBgVisibility);
      window._vfBgVisibility = null;
    }

    _canvas = null; _ctx = null; _dust = []; _nodes = [];
    _dustGroups = []; _nodeGroups = []; _linkGroups = [];
  }

  window.VFBackground = {
    mount: mount,
    unmount: unmount,
    refreshColors: refreshColors,
    isRunning: function () { return _running && !!_raf; }
  };
})();
