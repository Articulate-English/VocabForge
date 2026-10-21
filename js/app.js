/* ============================================================
   VocabForge — App Skeleton
   ============================================================ */

var VF = {

  /* ---------- State ---------- */
  screen: 'home',

  user: {
    xp: 0,
    level: 1,
    hearts: 5,
    streak: 0,
    bestStreak: 0,
    wordsLearned: [],
    achievements: [],
    sessions: [],
    _sessionStart: 0
  },

  settings: {
    sound: true,
    tts: true,
    theme: 'eloquent',
    font: 'nunito',
    dailyGoal: 100,
    glowStrength: 12,    /* px, 0-40 */
    outlineWidth: 2,     /* px, 0-4 */
    themeIntensity: 1.0  /* 0-1, multiplies accent overlays on background */
  },

  /* Theme definitions: key -> label, color */
  themes: [
    { key: 'eloquent',  label: 'Eloquent',  color: '#22d3ee' },
    { key: 'charlime',  label: 'Char-Lime',  color: '#a3e635' },
    { key: 'midnight',  label: 'Midnight',   color: '#818cf8' },
    { key: 'sunset',    label: 'Sunset',     color: '#fb923c' },
    { key: 'forest',    label: 'Forest',     color: '#34d399' },
    { key: 'rose',      label: 'Rose',       color: '#fb7185' },
    { key: 'violet',    label: 'Violet',     color: '#a78bfa' },
    { key: 'ocean',     label: 'Ocean',      color: '#38bdf8' },
    { key: 'amber',     label: 'Amber',      color: '#fbbf24' },
    { key: 'crimson',   label: 'Crimson',    color: '#f87171' },
    { key: 'teal',      label: 'Teal',       color: '#2dd4bf' },
    { key: 'sakura',    label: 'Sakura',     color: '#f9a8d4' },
    { key: 'ice',       label: 'Ice',        color: '#67e8f9' },
    { key: 'burgundy',  label: 'Burgundy',   color: '#e879f9' },
    { key: 'slime',     label: 'Slime',      color: '#a855f7' },
    { key: 'geranium',  label: 'Geranium',   color: '#fb7185' },
    { key: 'light',     label: 'Light',      color: '#2563eb' }
  ],
  _themeIndex: 0,

  /* Font definitions */
  fonts: [
    { key: 'nunito',    label: 'Nunito',    family: "'Nunito', sans-serif" },
    { key: 'fredoka',   label: 'Fredoka',   family: "'Fredoka', sans-serif" },
    { key: 'quicksand', label: 'Quicksand', family: "'Quicksand', sans-serif" },
    { key: 'comfortaa', label: 'Comfortaa', family: "'Comfortaa', cursive" },
    { key: 'baloo',     label: 'Baloo 2',   family: "'Baloo 2', cursive" },
    { key: 'poppins',   label: 'Poppins',   family: "'Poppins', sans-serif" }
  ],
  _fontKey: 'nunito',

  /* Vocab definitions lookup: word (lowercase) → definition */
  vocabDefs: {},

  /* Session tracking */
  _sessionXP: 0,

  /* ---------- Confetti System ---------- */
  _confettiCanvas: null,
  _confettiCtx: null,
  _confettiParticles: [],
  _confettiAnimId: null,
  _confettiCleanupTimer: null,

  initConfettiSystem: function() {
    if (this._confettiCanvas) return;
    var container = document.createElement('div');
    container.className = 'confetti-container';
    container.id = 'confettiContainer';
    var canvas = document.createElement('canvas');
    canvas.id = 'confettiCanvas';
    container.appendChild(canvas);
    document.body.appendChild(container);
    this._confettiCanvas = canvas;
    this._confettiCtx = canvas.getContext('2d');
    this._resizeConfetti();
    var self = this;
    window.addEventListener('resize', function() { self._resizeConfetti(); });
  },

  _resizeConfetti: function() {
    if (!this._confettiCanvas) return;
    this._confettiCanvas.width = window.innerWidth;
    this._confettiCanvas.height = window.innerHeight;
  },

  fireConfetti: function(x, y) {
    this.initConfettiSystem();

    // Default to center of screen
    if (x === undefined || x === null) x = window.innerWidth / 2;
    if (y === undefined || y === null) y = window.innerHeight / 2;

    var colors = [
      'var(--accent)', 'var(--success)', 'var(--warning)',
      '#22d3ee', '#a78bfa', '#fb923c', '#f472b6', '#60a5fa'
    ];

    var particleCount = 60;
    for (var i = 0; i < particleCount; i++) {
      var angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      var speed = 3 + Math.random() * 8;
      this._confettiParticles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        opacity: 1,
        gravity: 0.12 + Math.random() * 0.08,
        shape: Math.random() > 0.5 ? 'rect' : 'circle'
      });
    }

    // Play confetti sound
    if (typeof VFAudio !== 'undefined') VFAudio.playConfetti();

    // Start animation loop if not running
    if (!this._confettiAnimId) {
      this._animateConfetti();
    }

    // Auto-cleanup after 3 seconds
    if (this._confettiCleanupTimer) clearTimeout(this._confettiCleanupTimer);
    var self = this;
    this._confettiCleanupTimer = setTimeout(function() {
      self._cleanupConfetti();
    }, 3000);
  },

  _animateConfetti: function() {
    var ctx = this._confettiCtx;
    var canvas = this._confettiCanvas;
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var alive = [];
    for (var i = 0; i < this._confettiParticles.length; i++) {
      var p = this._confettiParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.99;
      p.rotation += p.rotationSpeed;
      p.opacity -= 0.008;

      if (p.opacity > 0) {
        alive.push(p);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    this._confettiParticles = alive;

    if (this._confettiParticles.length > 0) {
      var self = this;
      this._confettiAnimId = requestAnimationFrame(function() { self._animateConfetti(); });
    } else {
      this._confettiAnimId = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  },

  _cleanupConfetti: function() {
    this._confettiParticles = [];
    if (this._confettiAnimId) {
      cancelAnimationFrame(this._confettiAnimId);
      this._confettiAnimId = null;
    }
    if (this._confettiCtx && this._confettiCanvas) {
      this._confettiCtx.clearRect(0, 0, this._confettiCanvas.width, this._confettiCanvas.height);
    }
  },

  /* ---------- Heart Break Animation ---------- */
  triggerHeartBreak: function() {
    var heartsDisplay = document.getElementById('heartsDisplay');
    if (!heartsDisplay) return;

    // Add shake class
    heartsDisplay.classList.add('hearts-shake');

    // Flash red on the hearts text
    var heartsText = document.getElementById('heartsText');
    if (heartsText) {
      heartsText.style.color = 'var(--danger)';
      heartsText.style.transition = 'color 0.2s ease';
    }

    // Play heart loss sound
    if (typeof VFAudio !== 'undefined') VFAudio.playHeartLoss();

    // Remove shake class after animation
    var self = this;
    setTimeout(function() {
      heartsDisplay.classList.remove('hearts-shake');
      if (heartsText) {
        setTimeout(function() {
          heartsText.style.color = '';
        }, 400);
      }
    }, 500);

    // If hearts reach 0, show game over modal with stats
    if (this.user.hearts <= 0) {
      setTimeout(function() {
        self._showGameOver();
      }, 600);
    }
  },

  _showGameOver: function() {
    var elScore = document.getElementById('goScore');
    var elCorrect = document.getElementById('goCorrect');
    if (elScore) elScore.textContent = this.user.streak;
    if (elCorrect) elCorrect.textContent = this.user.bestStreak;
    // Log the session for analytics
    if (this.user._sessionStart) {
      var dur = Math.round((Date.now() - this.user._sessionStart) / 1000);
      this.recordSession('vocab', this._lastSessionScore || 0, dur, this._lastSessionWords || []);
      this.user._sessionStart = 0;
    }
    this.openModal('modalGameOver');
  },

  /* ---------- Level Up Celebration ---------- */
  triggerLevelUp: function() {
    var newLevel = this.user.level;

    // Update modal content
    var el = document.getElementById('levelUpTo');
    if (el) el.textContent = 'Level ' + newLevel;

    var xpEl = document.getElementById('levelUpXP');
    if (xpEl) xpEl.textContent = '+' + this._sessionXP + ' XP this session';

    // Mark a level-up milestone in the session log
    if (this.user._sessionStart && this.user.sessions.length) {
      var last = this.user.sessions[this.user.sessions.length - 1];
      last.levelUp = newLevel;
      this.save();
    }

    // Open modal
    this.openModal('modalLevelUp');

    // Fire confetti from center
    this.fireConfetti(window.innerWidth / 2, window.innerHeight / 2);

    // Play success sound
    if (typeof VFAudio !== 'undefined') VFAudio.playLevelUp();
  },

  /* ---------- Init ---------- */
  init: function() {
    this._themeIndex = this.themes.findIndex(function(t) { return t.key === VF.settings.theme; });
    if (this._themeIndex < 0) this._themeIndex = 0;

    this._sessionXP = 0;

    this.load();
    this._fontKey = this.settings.font || 'nunito';
    this.bindNav();
    this.bindSettings();
    this.applyTheme();
    this.mountBackground();
    this.renderStats();
    this.updateHeader();
    this.showScreen(this.screen);
    this.renderThemeGrid();
    this.applyFont();

    // Init audio system
    if (typeof VFAudio !== 'undefined') VFAudio.init();

    // Init confetti system (hidden until needed)
    this.initConfettiSystem();

    // Wire up TTS model/voice selectors
    var selTtsModel = document.getElementById('selTtsModel');
    var selTtsVoice = document.getElementById('selTtsVoice');
    var ttsVoices = {
      speechma: ['US Female','US Male','UK Female','UK Male','AU Female','IN Female'],
      naturalreader: ['US Female','US Male','UK Female','UK Male','AU Female'],
      lovevoice: ['Amy (UK)','Josh (US)','Joanna (US)','Matthew (US)','Brian (UK)']
    };
    function populateTtsVoices() {
      var model = selTtsModel ? selTtsModel.value : 'speechma';
      var voices = ttsVoices[model] || ttsVoices.speechma;
      if (selTtsVoice) {
        selTtsVoice.innerHTML = '';
        voices.forEach(function(v, i) {
          var opt = document.createElement('option');
          opt.value = i;
          opt.textContent = v;
          selTtsVoice.appendChild(opt);
        });
      }
      if (typeof VFAudio !== 'undefined') VFAudio.setTtsModel(model, 0);
    }
    if (selTtsModel) {
      selTtsModel.addEventListener('change', populateTtsVoices);
    }
    if (selTtsVoice) {
      selTtsVoice.addEventListener('change', function() {
        if (typeof VFAudio !== 'undefined') VFAudio.setTtsModel(selTtsModel ? selTtsModel.value : 'speechma', parseInt(selTtsVoice.value) || 0);
      });
    }
    populateTtsVoices();

    // Wire up settings button in header
    var btnSettings = document.getElementById('btnSettings');
    if (btnSettings) {
      btnSettings.addEventListener('click', function() {
        VF.openModal('modalSettings');
      });
    }

    // Wire up export/import buttons
    var btnExport = document.getElementById('btnExportProgress');
    if (btnExport) {
      btnExport.addEventListener('click', function() { VF.exportProgress(); });
    }
    var btnImport = document.getElementById('btnImportProgress');
    if (btnImport) {
      btnImport.addEventListener('click', function() { VF.importProgress(); });
    }
    var btnReset = document.getElementById('btnResetProgress');
    if (btnReset) {
      btnReset.addEventListener('click', function() { VF.resetProgressPrompt(); });
    }

    // Close modals on overlay click
    var self = this;
    document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          overlay.setAttribute('data-visible', 'false');
        }
      });
    });

    // Play click sounds on all buttons
    document.addEventListener('click', function(e) {
      if (e.target.closest('button') || e.target.closest('.nav-tab') || e.target.closest('.quiz-option') || e.target.closest('.game-card')) {
        if (typeof VFAudio !== 'undefined') VFAudio.playClick();
      }
    });

    // Vocab word click → show definition popup
    document.addEventListener('click', function(e){
      var vw = e.target.closest('.vocab-word');
      if (vw) {
        var word = vw.textContent.trim();
        var def = vw.dataset.def || VF.vocabDefs && VF.vocabDefs[word.toLowerCase()];
        if (def) {
          VF.showVocabPopup(word, def, vw);
          e.stopPropagation();
        }
      } else if (!e.target.closest('.vocab-popup')) {
        VF.hideVocabPopup();
      }
    });

    console.log('VocabForge initialized');
  },

  /* ---------- Screen Router ---------- */
  showScreen: function(name) {
    // Hide all screens
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) {
      screens[i].setAttribute('data-active', 'false');
    }

    // Show target screen
    var target = document.querySelector('.screen[data-screen="' + name + '"]');
    if (target) {
      target.setAttribute('data-active', 'true');
    }

    // Update nav tabs
    var tabs = document.querySelectorAll('.nav-tab');
    for (var j = 0; j < tabs.length; j++) {
      if (tabs[j].getAttribute('data-nav') === name) {
        tabs[j].setAttribute('data-active', 'true');
      } else {
        tabs[j].setAttribute('data-active', 'false');
      }
    }

    this.screen = name;

    // Default topic hint per screen (renderers can override via setTopicBg)
    if (typeof this.setTopicBg === 'function') {
      var screenTopics = {
        home: 'people',         // generic social
        learn: 'education',
        'games-menu': 'play',
        grammar: 'work',
        dictionary: 'travel',   // exploration
        analytics: 'time',      // reflection
        stats: 'time',
        flashcards: 'education',
        'game-quiz': 'education',
        'game-typing': 'work',
        'game-memory': 'home',
        'game-wordsearch': 'nature',
        settings: 'home'
      };
      // Map: if a known topic exists in VFImages, use it; otherwise leave current
      var hint = screenTopics[name];
      if (hint && typeof VFImages !== 'undefined' && VFImages[hint]) {
        this.setTopicBg(hint);
      }
    }

    // Call screen-specific renderer
    var renderer = this['render' + name.replace(/(^|-)([a-z])/g, function(m, d, c) { return c.toUpperCase(); })];
    if (typeof renderer === 'function') {
      renderer.call(this);
    }
  },

  /* ---------- Topic-Aware Background System ---------- */
  _currentTopic: null,
  _topicImgCache: {}, // topic -> loaded?

  _normalizeTopic: function(topic) {
    if (!topic) return null;
    var t = String(topic).toLowerCase().split('-')[0]; // strip pack prefix like 'it-' or 'med-'
    return t;
  },

  /**
   * Resolve a topic to an image URL (uses VFImages first slot for that topic).
   * Returns null if no match.
   */
  resolveTopicImage: function(topic) {
    if (typeof VFImages === 'undefined') return null;
    var key = this._normalizeTopic(topic);
    if (!key) return null;
    var imgs = VFImages[key];
    return (imgs && imgs[0]) ? imgs[0] : null;
  },

  /**
   * Set the main body bg to a topic image. Crossfades via opacity.
   * Call with null/empty topic to clear.
   */
  setTopicBg: function(topic) {
    var key = this._normalizeTopic(topic);
    if (key === this._currentTopic) return; // no-op
    this._currentTopic = key;
    var url = this.resolveTopicImage(key);
    var root = document.documentElement;
    if (!url) {
      root.style.setProperty('--topic-bg', 'none');
      root.style.setProperty('--topic-bg-opacity', '0');
      return;
    }
    root.style.setProperty('--topic-bg', "url('" + url + "')");
    root.style.setProperty('--topic-bg-opacity', '0.36');
    // Preload so crossfade looks clean next time
    if (!this._topicImgCache[url]) {
      var img = new Image();
      img.onload = function() { /* no-op, just warms cache */ };
      img.src = url;
      this._topicImgCache[url] = true;
    }
  },

  /* ---------- Placeholder Screen Renderers ---------- */
  renderHome: function() {
    // Set hero image
    var hero = document.getElementById('homeHero');
    if(hero && typeof VFImages !== 'undefined'){
      var topics = Object.keys(VFImages);
      var randomTopic = topics[Math.floor(Math.random() * topics.length)];
      var heroImg = (VFImages[randomTopic] && VFImages[randomTopic][0]) || '';
      if (heroImg) hero.style.backgroundImage = "url('" + heroImg + "')";
      // Also set page bg to the same topic
      this.setTopicBg(randomTopic);
    } else {
      this.setTopicBg(null);
    }
    // Update daily goal
    var goalFill = document.getElementById('dailyGoalFill');
    var goalText = document.getElementById('dailyGoalText');
    if(goalFill && goalText){
      var pct = Math.min(100, Math.round((this.user.xp / this.settings.dailyGoal) * 100));
      goalFill.style.width = pct + '%';
      goalText.textContent = this.user.xp + ' / ' + this.settings.dailyGoal + ' XP';
    }
  },

  renderFlashcards: function() {
    var container = document.querySelector('.screen[data-screen="flashcards"] .screen-content');
    if (!container) return;
    if (container.getAttribute('data-initialized') === 'true') return;
    container.setAttribute('data-initialized', 'true');
    container.innerHTML = '';
    var self = this;
    if (typeof window.FlashcardGame !== 'undefined') {
      window.FlashcardGame.init(container);
      // Hook into FlashcardGame's word change to update topic bg
      var lastWord = null;
      var pollInterval = setInterval(function() {
        var w = window.FlashcardGame && window.FlashcardGame.currentWord;
        if (w && w !== lastWord) {
          lastWord = w;
          if (w.topic) self.setTopicBg(w.topic);
        }
        // Stop polling if the game is unmounted
        if (!document.querySelector('.screen[data-screen="flashcards"][data-active="true"]')) {
          clearInterval(pollInterval);
        }
      }, 600);
    } else {
      container.innerHTML = '<div class="coming-soon"><p>Flashcards failed to load.</p></div>';
    }
  },

  renderGamesMenu: function() {
    // Games menu is static
  },

  renderGrammar: function() {
    var container = document.querySelector('.screen[data-screen="grammar"] .screen-content');
    if (!container) return;
    if (container.getAttribute('data-initialized') === 'true') return;
    container.setAttribute('data-initialized', 'true');
    container.innerHTML = '';
    if (typeof window.GrammarDrill !== 'undefined') {
      window.GrammarDrill.init(container);
    } else {
      container.innerHTML = '<div class="coming-soon"><p>Grammar drills failed to load.</p></div>';
    }
  },

  renderStats: function() {
    var elXP = document.getElementById('statXP');
    var elStreak = document.getElementById('statStreak');
    var elBest = document.getElementById('statBestStreak');
    var elWords = document.getElementById('statWords');

    if (elXP) elXP.textContent = this.user.xp;
    if (elStreak) elStreak.textContent = this.user.streak;
    if (elBest) elBest.textContent = this.user.bestStreak;
    if (elWords) elWords.textContent = this.user.wordsLearned.length;
  },

  renderSettings: function() {
    // Settings rendered via modal
  },

  renderGameQuiz: function() {
    var container = document.querySelector('.screen[data-screen="game-quiz"] .screen-content');
    if (!container) return;
    // Only init once — if already rendered, skip
    if (container.getAttribute('data-initialized') === 'true') return;
    container.setAttribute('data-initialized', 'true');
    container.innerHTML = '';
    if (typeof window.QuizGame !== 'undefined') {
      window.QuizGame.init(container);
    } else {
      container.innerHTML = '<div class="coming-soon"><p>Quiz game failed to load.</p></div>';
    }
  },

  renderGameTyping: function() {
    var container = document.querySelector('.screen[data-screen="game-typing"] .screen-content');
    if (!container) return;
    if (container.getAttribute('data-initialized') === 'true') return;
    container.setAttribute('data-initialized', 'true');
    container.innerHTML = '';
    if (typeof window.TypingGame !== 'undefined') {
      window.TypingGame.init(container);
    } else {
      container.innerHTML = '<div class="coming-soon"><p>Typing game failed to load.</p></div>';
    }
  },

  renderGameMemory: function() {
    var container = document.querySelector('.screen[data-screen="game-memory"] .screen-content');
    if (!container) return;
    // Only init once — if already rendered, skip
    if (container.getAttribute('data-initialized') === 'true') return;
    container.setAttribute('data-initialized', 'true');
    container.innerHTML = '';
    if (typeof window.MemoryGame !== 'undefined') {
      window.MemoryGame.init(container);
    } else {
      container.innerHTML = '<div class="coming-soon"><p>Memory game failed to load.</p></div>';
    }
  },

  renderGameWordsearch: function() {
    var container = document.querySelector('.screen[data-screen="game-wordsearch"] .screen-content');
    if (!container) return;
    // Only init once — if already rendered, skip
    if (container.getAttribute('data-initialized') === 'true') return;
    container.setAttribute('data-initialized', 'true');
    container.innerHTML = '';
    if (typeof window.WordSearchGame !== 'undefined') {
      window.WordSearchGame.init(container);
    } else {
      container.innerHTML = '<div class="coming-soon"><p>Word Search game failed to load.</p></div>';
    }
  },

  renderDictionary: function() {
    var container = document.getElementById('dictionaryContent');
    if (!container) return;
    if (container.getAttribute('data-initialized') === 'true') return;
    container.setAttribute('data-initialized', 'true');

    var total = (window.VOCAB_UNIFIED || []).length;
    container.innerHTML =
      '<h2 class="screen-title">Dictionary</h2>' +
      '<p style="font-size:0.85rem;color:var(--text-muted);margin:-8px 0 12px;">' + total.toLocaleString() + ' words · search by word, definition, or topic</p>' +
      '<div class="dict-controls">' +
        '<input type="text" id="dictInput" class="dict-input" placeholder="Search 15,000+ words..." autocomplete="off">' +
        '<select id="dictLevel" class="dict-select">' +
          '<option value="">All levels</option>' +
          '<option value="A1">A1</option>' +
          '<option value="A2">A2</option>' +
          '<option value="B1">B1</option>' +
          '<option value="B2">B2</option>' +
        '</select>' +
        '<button class="btn btn-secondary btn-sm" id="dictClear">Clear</button>' +
      '</div>' +
      '<div id="dictResults" class="dict-results"></div>';

    var input = document.getElementById('dictInput');
    var level = document.getElementById('dictLevel');
    var results = document.getElementById('dictResults');
    var clearBtn = document.getElementById('dictClear');
    var self = this;

    function doSearch() {
      var q = input.value.trim();
      var lvl = level.value;
      var opts = { limit: 50 };
      if (lvl) opts.levels = [lvl];
      var list = window.VF_SEARCH ? window.VF_SEARCH.search(q, opts) : [];

      if (!q && !lvl) {
        results.innerHTML = '<p class="dict-hint">Type a word or choose a level to start searching across ' + total.toLocaleString() + ' entries.</p>';
        return;
      }

      if (list.length === 0) {
        results.innerHTML = '<p class="dict-hint">No matches found.</p>';
        return;
      }

      var html = '<div class="dict-list">';
      for (var i = 0; i < list.length; i++) {
        var w = list[i];
        var def = w.definition || 'No definition available.';
        var ex = w.example ? '<div class="dict-ex">“' + w.example + '”</div>' : '';
        var phon = w.phonetic ? '<span class="dict-phon">' + w.phonetic + '</span>' : '';
        html +=
          '<div class="dict-card">' +
            '<div class="dict-head">' +
              '<span class="dict-word">' + self._escapeHtml(w.display || w.word) + '</span>' +
              phon +
              '<span class="dict-level level-' + (w.level || 'A1').toLowerCase() + '">' + (w.level || 'A1') + '</span>' +
              '<span class="dict-pos">' + self._escapeHtml(w.pos || '—') + '</span>' +
            '</div>' +
            '<div class="dict-def">' + self._escapeHtml(def) + '</div>' +
            ex +
          '</div>';
      }
      html += '</div>';
      results.innerHTML = html;
    }

    input.addEventListener('input', doSearch);
    level.addEventListener('change', doSearch);
    clearBtn.addEventListener('click', function() {
      input.value = '';
      level.value = '';
      doSearch();
    });

    doSearch();
  },

  _escapeHtml: function(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  _comingSoon: function(screenName) {
    var el = document.querySelector('.screen[data-screen="' + screenName + '"] .coming-soon p');
    if (el) el.textContent = 'Coming Soon';
  },

  /* ---------- Header Updates ---------- */
  updateHeader: function() {
    var badge = document.getElementById('levelBadge');
    var xpFill = document.getElementById('xpFill');
    var xpText = document.getElementById('xpText');
    var heartsText = document.getElementById('heartsText');
    var streakText = document.getElementById('streakText');

    if (badge) badge.textContent = 'L' + this.user.level;

    var xpInLevel = this.user.xp % 100;
    if (xpFill) xpFill.style.width = xpInLevel + '%';
    if (xpText) xpText.textContent = xpInLevel + '/100';

    if (heartsText) heartsText.textContent = this.user.hearts + '/5';
    if (streakText) streakText.textContent = this.user.streak;
  },

  /* ---------- Navigation Binding ---------- */
  bindNav: function() {
    var nav = document.getElementById('bottomNav');
    if (!nav) return;

    var self = this;
    nav.addEventListener('click', function(e) {
      var tab = e.target.closest('.nav-tab');
      if (!tab) return;
      var screen = tab.getAttribute('data-nav');
      if (screen) {
        self.showScreen(screen);
      }
    });
  },

  /* ---------- Settings & Modal Binding ---------- */
  bindSettings: function() {
    var self = this;

    // Theme cycle button
    var btnTheme = document.getElementById('btnCycleTheme');
    if (btnTheme) {
      btnTheme.addEventListener('click', function() {
        VF.cycleTheme();
      });
    }

    // Sound toggle
    var toggleSound = document.getElementById('toggleSound');
    if (toggleSound) {
      toggleSound.checked = this.settings.sound;
      toggleSound.addEventListener('change', function() {
        VF.settings.sound = this.checked;
        VF.save();
      });
    }

    // TTS toggle
    var toggleTTS = document.getElementById('toggleTTS');
    if (toggleTTS) {
      toggleTTS.checked = this.settings.tts;
      toggleTTS.addEventListener('change', function() {
        VF.settings.tts = this.checked;
        VF.save();
      });
    }

    // Daily goal selector
    var selGoal = document.getElementById('selDailyGoal');
    if (selGoal) {
      selGoal.value = this.settings.dailyGoal;
      selGoal.addEventListener('change', function() {
        var val = parseInt(this.value, 10);
        if (val === 50 || val === 100 || val === 200) {
          VF.settings.dailyGoal = val;
          VF.save();
        }
      });
    }

    // Also support the old number input if present
    var inputGoal = document.getElementById('inputDailyGoal');
    if (inputGoal) {
      inputGoal.value = this.settings.dailyGoal;
      inputGoal.addEventListener('change', function() {
        var val = parseInt(this.value, 10);
        if (val >= 10 && val <= 500) {
          VF.settings.dailyGoal = val;
          VF.save();
        }
      });
    }
  },

  /* ---------- Modal Helpers ---------- */
  openModal: function(id) {
    var modal = document.getElementById(id);
    if (modal) modal.setAttribute('data-visible', 'true');
  },

  closeModal: function(id) {
    var modal = document.getElementById(id);
    if (modal) modal.setAttribute('data-visible', 'false');
  },

  /* ---------- Theme System ---------- */
  cycleTheme: function() {
    this._themeIndex = (this._themeIndex + 1) % this.themes.length;
    this.settings.theme = this.themes[this._themeIndex].key;
    this.applyTheme();
    this.save();
  },

  applyTheme: function() {
    document.documentElement.setAttribute('data-theme', this.settings.theme);
    var btn = document.getElementById('btnCycleTheme');
    if (btn) {
      btn.textContent = this.themes[this._themeIndex].label;
    }
    this.applyGlow();
    if (window.VFBackground) window.VFBackground.refreshColors();
    this.save();
  },

  /* Mount the animated background once on init */
  mountBackground: function() {
    var canvas = document.getElementById('vf-bg');
    if (!canvas || typeof window.VFBackground === 'undefined') return;
    window.VFBackground.mount(canvas);
  },

  /* Apply glow/outline/intensity from settings to CSS variables */
  applyGlow: function() {
    var r = document.documentElement.style;
    var s = this.settings;
    r.setProperty('--glow-strength', s.glowStrength + 'px');
    r.setProperty('--outline-width', s.outlineWidth + 'px');
    r.setProperty('--theme-intensity', String(s.themeIntensity));
    /* Resolve accent to RGB for rgba() recompute */
    var accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#22d3ee';
    var hex = accent.replace('#','');
    if (hex.length === 3) hex = hex.split('').map(function(c){return c+c;}).join('');
    var r1 = parseInt(hex.slice(0,2),16), g1 = parseInt(hex.slice(2,4),16), b1 = parseInt(hex.slice(4,6),16);
    var radialOp = (0.18 * s.themeIntensity).toFixed(3);
    r.setProperty('--bg-radial', 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(' + r1 + ',' + g1 + ',' + b1 + ',' + radialOp + '), transparent 70%)');
    var glowOp = (0.5 * s.themeIntensity).toFixed(3);
    var outlineOp = (0.6 * s.themeIntensity).toFixed(3);
    r.setProperty('--accent-glow', 'rgba(' + r1 + ',' + g1 + ',' + b1 + ',' + glowOp + ')');
    r.setProperty('--accent-glow-soft', 'rgba(' + r1 + ',' + g1 + ',' + b1 + ',' + (glowOp*0.3).toFixed(3) + ')');
    r.setProperty('--accent-outline', 'rgba(' + r1 + ',' + g1 + ',' + b1 + ',' + outlineOp + ')');
  },

  /* Slider handlers called from HTML oninput */
  setGlowStrength: function(v) { this.settings.glowStrength = +v; var lbl = document.getElementById('lblGlow'); if (lbl) lbl.textContent = v + 'px'; this.applyGlow(); },
  setOutlineWidth: function(v) { this.settings.outlineWidth = +v; var lbl = document.getElementById('lblOutline'); if (lbl) lbl.textContent = v + 'px'; this.applyGlow(); },
  setThemeIntensity: function(v) { this.settings.themeIntensity = +v; var lbl = document.getElementById('lblIntensity'); if (lbl) lbl.textContent = Math.round(+v * 100) + '%'; this.applyGlow(); },

  /* ---------- Pack Picker ---------- */
  togglePackPicker: function() {
    var p = document.getElementById('packPicker');
    if (!p) return;
    var visible = p.style.display !== 'none';
    p.style.display = visible ? 'none' : 'block';
    if (!visible) this.renderPackGrid();
  },
  renderPackGrid: function() {
    var grid = document.getElementById('packGrid');
    if (!grid || !window.VFPacks) return;
    var meta = window.VFPacks.PACKS_META;
    var stats = window.VFPacks.getStats();
    var enabled = window.VFPacks.getEnabledPacks();
    var html = '';
    Object.keys(meta).forEach(function(key){
      var m = meta[key];
      var on = enabled.indexOf(key) !== -1;
      var count = key === 'base' ? stats.base : (stats.packs[key] || 0);
      html += '<label style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;background:var(--surface2);cursor:pointer;">' +
              '<input type="checkbox" ' + (on?'checked':'') + ' onchange="VF.togglePack(\'' + key + '\', this.checked)">' +
              '<span style="font-size:1.1rem;">' + m.icon + '</span>' +
              '<span style="flex:1;font-size:0.82rem;font-weight:600;">' + m.name + '</span>' +
              '<span style="font-size:0.75rem;color:var(--text-muted);">' + count + '</span>' +
              '</label>';
    });
    grid.innerHTML = html;
    var s = document.getElementById('packStats');
    if (s) {
      var active = window.VFPacks.getActiveWords().length;
      s.textContent = active + ' active words across ' + enabled.length + ' packs';
    }
  },
  togglePack: function(key, on) {
    if (!window.VFPacks) return;
    var arr = window.VFPacks.getEnabledPacks().slice();
    var i = arr.indexOf(key);
    if (on && i === -1) arr.push(key);
    if (!on && i !== -1) arr.splice(i, 1);
    window.VFPacks.setEnabledPacks(arr);
    this.renderPackGrid();
    /* Re-render home stats if visible */
    if (typeof this.renderStats === 'function') this.renderStats();
  },

  /* ---------- Theme Picker ---------- */
  renderThemeGrid: function() {
    var grid = document.getElementById('themeGrid');
    if (!grid) return;
    var html = '';
    var self = this;
    this.themes.forEach(function(t) {
      html += '<button class="theme-swatch" data-theme="' + t.key + '" onclick="VF.setTheme(\'' + t.key + '\')" title="' + t.label + '"><span class="swatch-circle" style="background:' + t.color + '"></span></button>';
    });
    grid.innerHTML = html;
  },
  setTheme: function(key) {
    var idx = this.themes.findIndex(function(t){ return t.key === key; });
    if (idx >= 0) {
      this._themeIndex = idx;
      this.settings.theme = key;
      this.applyTheme();
      this.save();
    }
    this.toggleThemePicker(false);
  },
  toggleThemePicker: function(force) {
    var dd = document.getElementById('themePickerDropdown');
    if (!dd) return;
    // Close font picker too
    var fd = document.getElementById('fontPickerDropdown');
    if (fd) fd.classList.remove('open');
    var isOpen = dd.classList.contains('open');
    if (force === false) {
      dd.classList.remove('open');
    } else if (force === true) {
      dd.classList.add('open');
    } else {
      dd.classList.toggle('open');
    }
    if (dd.classList.contains('open')) {
      var self = this;
      setTimeout(function(){
        document.addEventListener('click', function closePicker(e){
          if (!e.target.closest('#themePicker')) {
            dd.classList.remove('open');
            document.removeEventListener('click', closePicker);
          }
        });
      }, 0);
    }
  },

  /* ---------- Font Picker ---------- */
  setFont: function(key) {
    var font = this.fonts.find(function(f){ return f.key === key; });
    if (!font) return;
    this._fontKey = key;
    this.settings.font = key;
    document.documentElement.style.setProperty('--font-family', font.family);
    document.querySelectorAll('.font-option').forEach(function(btn){
      btn.classList.toggle('active', btn.getAttribute('data-font') === key);
    });
    this.save();
    this.toggleFontPicker(false);
  },
  applyFont: function() {
    var font = this.fonts.find(function(f){ return f.key === VF._fontKey; });
    if (font) {
      document.documentElement.style.setProperty('--font-family', font.family);
      document.querySelectorAll('.font-option').forEach(function(btn){
        btn.classList.toggle('active', btn.getAttribute('data-font') === VF._fontKey);
      });
    }
  },
  toggleFontPicker: function(force) {
    var dd = document.getElementById('fontPickerDropdown');
    if (!dd) return;
    // Close theme picker too
    var td = document.getElementById('themePickerDropdown');
    if (td) td.classList.remove('open');
    var isOpen = dd.classList.contains('open');
    if (force === false) {
      dd.classList.remove('open');
    } else if (force === true) {
      dd.classList.add('open');
    } else {
      dd.classList.toggle('open');
    }
    if (dd.classList.contains('open')) {
      var self = this;
      setTimeout(function(){
        document.addEventListener('click', function closeFont(e){
          if (!e.target.closest('#fontPicker')) {
            dd.classList.remove('open');
            document.removeEventListener('click', closeFont);
          }
        });
      }, 0);
    }
  },

  /* ---------- Vocab Word Popup ---------- */
  showVocabPopup: function(word, definition, targetEl) {
    this.hideVocabPopup();
    var popup = document.createElement('div');
    popup.className = 'vocab-popup';
    popup.id = 'vocabPopup';
    popup.innerHTML = '<div class="vp-word">' + word + '</div><div class="vp-def">' + definition + '</div>';
    document.body.appendChild(popup);
    var rect = targetEl.getBoundingClientRect();
    var top = rect.bottom + 6;
    var left = rect.left + rect.width / 2 - popup.offsetWidth / 2;
    if (left < 8) left = 8;
    if (left + popup.offsetWidth > window.innerWidth - 8) left = window.innerWidth - popup.offsetWidth - 8;
    if (top + popup.offsetHeight > window.innerHeight - 8) top = rect.top - popup.offsetHeight - 6;
    popup.style.top = top + 'px';
    popup.style.left = left + 'px';
    var self = this;
    this._vocabPopupTimer = setTimeout(function(){ self.hideVocabPopup(); }, 4000);
  },
  hideVocabPopup: function() {
    var existing = document.getElementById('vocabPopup');
    if (existing) existing.remove();
    if (this._vocabPopupTimer) { clearTimeout(this._vocabPopupTimer); this._vocabPopupTimer = null; }
  },
  makeVocabClickable: function(text, vocabMap) {
    if (!vocabMap || !text) return text;
    var words = Object.keys(vocabMap).sort(function(a,b){ return b.length - a.length; });
    words.forEach(function(w){
      var escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var re = new RegExp('(\\b'+escaped+'\\b)', 'gi');
      text = text.replace(re, '<span class="vocab-word" data-vocab="'+w.toLowerCase()+'">$1</span>');
    });
    return text;
  },

  /* ---------- Persistence ---------- */
  save: function() {
    try {
      localStorage.setItem('vf_user', JSON.stringify(this.user));
      localStorage.setItem('vf_settings', JSON.stringify(this.settings));
    } catch (e) {
      console.warn('VocabForge: localStorage save failed', e);
    }
  },

  load: function() {
    try {
      var savedUser = localStorage.getItem('vf_user');
      var savedSettings = localStorage.getItem('vf_settings');

      if (savedUser) {
        var parsed = JSON.parse(savedUser);
        // Merge to preserve defaults for new fields
        for (var key in parsed) {
          if (parsed.hasOwnProperty(key) && this.user.hasOwnProperty(key)) {
            this.user[key] = parsed[key];
          }
        }
        // Backfill new fields for legacy saves
        if (!Array.isArray(this.user.sessions)) this.user.sessions = [];
        if (typeof this.user._sessionStart !== 'number') this.user._sessionStart = 0;
      }

      if (savedSettings) {
        var parsedS = JSON.parse(savedSettings);
        for (var sKey in parsedS) {
          if (parsedS.hasOwnProperty(sKey) && this.settings.hasOwnProperty(sKey)) {
            this.settings[sKey] = parsedS[sKey];
          }
        }
      }
    } catch (e) {
      console.warn('VocabForge: localStorage load failed', e);
    }
  },

  /* ============================================================
     Session Logging + Analytics
     ============================================================ */
  recordSession: function(type, score, durationSec, words) {
    if (!Array.isArray(this.user.sessions)) this.user.sessions = [];
    this.user.sessions.push({
      t: Date.now(),
      type: type || 'vocab',
      score: typeof score === 'number' ? score : 0,
      dur: Math.max(0, Math.round(durationSec || 0)),
      words: Array.isArray(words) ? words.slice(0, 10) : []
    });
    // Cap history to last 500 sessions
    if (this.user.sessions.length > 500) {
      this.user.sessions = this.user.sessions.slice(-500);
    }
    this.save();
  },

  seedSampleSessions: function(days) {
    days = days || 14;
    if (!Array.isArray(this.user.sessions)) this.user.sessions = [];
    var types = ['vocab', 'quiz', 'typing', 'reading', 'speaking', 'grammar', 'dictionary'];
    var now = Date.now();
    var dayMs = 86400000;
    var added = 0;
    for (var d = days; d >= 0; d--) {
      // Skip a couple of days for realism
      if (d === 3 || d === 7) continue;
      var sessionsToday = 1 + Math.floor(Math.random() * 4);
      for (var s = 0; s < sessionsToday; s++) {
        var hour = 8 + Math.floor(Math.random() * 12);
        var minute = Math.floor(Math.random() * 60);
        var ts = now - d * dayMs + (hour * 3600 + minute * 60) * 1000;
        var type = types[Math.floor(Math.random() * types.length)];
        var score = 40 + Math.floor(Math.random() * 60);
        var dur = 60 + Math.floor(Math.random() * 600);
        this.user.sessions.push({ t: ts, type: type, score: score, dur: dur, words: [] });
        added++;
      }
    }
    // Sort by time
    this.user.sessions.sort(function(a, b) { return a.t - b.t; });
    this.save();
    return added;
  },

  exportSessionsCSV: function() {
    var rows = [['Date', 'Type', 'Score', 'Duration (s)', 'Words']];
    (this.user.sessions || []).forEach(function(s) {
      var d = new Date(s.t);
      var dateStr = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0') + ' ' +
        String(d.getHours()).padStart(2, '0') + ':' +
        String(d.getMinutes()).padStart(2, '0');
      rows.push([
        dateStr,
        s.type || 'vocab',
        typeof s.score === 'number' ? s.score : '',
        s.dur || 0,
        (s.words || []).join('; ')
      ]);
    });
    var csv = rows.map(function(r) {
      return r.map(function(cell) {
        var s = String(cell == null ? '' : cell);
        if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      }).join(',');
    }).join('\n');

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vocabforge-sessions-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
  },

  /* ---------- Helpers used by renderAnalytics ---------- */
  _dayKey: function(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  _fmtDay: function(ts) {
    var d = new Date(ts);
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[d.getDay()];
  },
  _fmtDate: function(ts) {
    var d = new Date(ts);
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[d.getMonth()] + ' ' + d.getDate();
  },

  renderAnalytics: function() {
    var container = document.querySelector('.screen[data-screen="analytics"] .screen-content');
    if (!container) return;
    var self = this;
    var sessions = this.user.sessions || [];
    var accent = this._getCssVar('--accent') || '#22d3ee';
    var surface = this._getCssVar('--surface') || '#1a1a24';
    var surface2 = this._getCssVar('--surface2') || '#22222e';
    var border = this._getCssVar('--border') || '#2a2a36';
    var text = this._getCssVar('--text') || '#f1f5f9';
    var muted = this._getCssVar('--text-muted') || '#94a3b8';
    var success = this._getCssVar('--success') || '#34d399';

    // ---------- Compute stats ----------
    var now = Date.now();
    var dayMs = 86400000;
    var monthAgo = now - 30 * dayMs;
    var prevMonthAgo = now - 60 * dayMs;

    var totalSessions = sessions.length;
    var totalScore = 0, scoreCount = 0, totalDur = 0;
    var thisMonth = 0, prevMonth = 0, thisMonthScore = 0, prevMonthScore = 0, thisMonthScoreCount = 0, prevMonthScoreCount = 0;

    sessions.forEach(function(s) {
      if (typeof s.score === 'number') { totalScore += s.score; scoreCount++; }
      totalDur += s.dur || 0;
      if (s.t >= monthAgo) {
        thisMonth++;
        if (typeof s.score === 'number') { thisMonthScore += s.score; thisMonthScoreCount++; }
      } else if (s.t >= prevMonthAgo) {
        prevMonth++;
        if (typeof s.score === 'number') { prevMonthScore += s.score; prevMonthScoreCount++; }
      }
    });

    var avgScore = scoreCount ? Math.round(totalScore / scoreCount) : 0;
    var thisMonthAvg = thisMonthScoreCount ? Math.round(thisMonthScore / thisMonthScoreCount) : 0;
    var prevMonthAvg = prevMonthScoreCount ? Math.round(prevMonthScore / prevMonthScoreCount) : 0;
    var wordsLearned = this.user.wordsLearned.length || 0;

    var sessionsTrend = this._trendPct(thisMonth, prevMonth);
    var scoreTrend = this._trendPct(thisMonthAvg, prevMonthAvg);
    var avgSessionLen = totalSessions ? Math.round(totalDur / totalSessions) : 0;

    // Last 7 days (Mon..Sun style: 7 buckets ending today)
    var dayBuckets = [];
    for (var i = 6; i >= 0; i--) {
      var start = now - i * dayMs;
      var key = this._dayKey(start);
      dayBuckets.push({ key: key, label: this._fmtDay(start), count: 0, date: start });
    }
    var maxBucket = 1;
    sessions.forEach(function(s) {
      var k = self._dayKey(s.t);
      for (var b = 0; b < dayBuckets.length; b++) {
        if (dayBuckets[b].key === k) {
          dayBuckets[b].count++;
          if (dayBuckets[b].count > maxBucket) maxBucket = dayBuckets[b].count;
          break;
        }
      }
    });

    // Last 14 days score trend
    var scoreBuckets = [];
    for (var j = 13; j >= 0; j--) {
      var sStart = now - j * dayMs;
      var sKey = self._dayKey(sStart);
      var bucket = { key: sKey, label: self._fmtDate(sStart), sum: 0, count: 0, date: sStart };
      scoreBuckets.push(bucket);
    }
    sessions.forEach(function(s) {
      if (typeof s.score !== 'number') return;
      var k = self._dayKey(s.t);
      for (var sb = 0; sb < scoreBuckets.length; sb++) {
        if (scoreBuckets[sb].key === k) {
          scoreBuckets[sb].sum += s.score;
          scoreBuckets[sb].count++;
          break;
        }
      }
    });
    var scorePoints = scoreBuckets.map(function(b) {
      return { x: b.date, y: b.count ? Math.round(b.sum / b.count) : null, label: b.label };
    });

    // Recent activity (newest first, max 50)
    var recent = sessions.slice().sort(function(a, b) { return b.t - a.t; }).slice(0, 50);

    // Goals
    var dailyXpGoal = this.settings.dailyGoal || 100;
    var todayXp = 0;
    var todayKey = this._dayKey(now);
    sessions.forEach(function(s) {
      if (self._dayKey(s.t) === todayKey) todayXp += (s.score || 0);
    });
    var weekSessions = dayBuckets.reduce(function(sum, b) { return sum + b.count; }, 0);

    var empty = sessions.length === 0;

    // ---------- Render ----------
    var html = '';
    html += '<div class="analytics-header">';
    html += '  <div><h2 class="screen-title">Analytics</h2>';
    html += '    <p class="analytics-sub">Track sessions, streaks, and progress over time</p></div>';
    if (empty) {
      html += '  <button class="btn btn-secondary btn-sm" id="btnSeedSample">Load sample 14 days</button>';
    } else {
      html += '  <button class="btn btn-secondary btn-sm" id="btnExportCSV">Export CSV</button>';
    }
    html += '</div>';

    if (empty) {
      html += '<div class="analytics-empty">';
      html += '  <div class="analytics-empty-icon">~</div>';
      html += '  <h3>No activity yet</h3>';
      html += '  <p>Play a game or load 14 days of sample data to see your analytics.</p>';
      html += '</div>';
      container.innerHTML = html;
      var seedBtn = document.getElementById('btnSeedSample');
      if (seedBtn) seedBtn.addEventListener('click', function() {
        var added = self.seedSampleSessions(14);
        self.renderAnalytics();
      });
      return;
    }

    // ----- Stat cards -----
    html += '<div class="analytics-stats">';
    html += this._statCardHtml('sessions', 'Total Sessions', totalSessions, 'Across all activities', sessionsTrend);
    html += this._statCardHtml('score', 'Average Score', avgScore, 'Across completed quizzes', scoreTrend, true);
    html += this._statCardHtml('words', 'Words Learned', wordsLearned, 'Lifetime', null);
    html += this._statCardHtml('time', 'Time Spent', this._fmtDuration(totalDur), 'Total practice time', null, false, true);
    html += '</div>';

    // ----- Streak row -----
    html += '<div class="analytics-section">';
    html += '  <div class="streak-row">';
    html += '    <div class="streak-card">';
    html += '      <div class="streak-flame">F</div>';
    html += '      <div>';
    html += '        <div class="streak-number">' + this.user.streak + '</div>';
    html += '        <div class="streak-label">Current Streak</div>';
    html += '        <div class="streak-best">Best: ' + this.user.bestStreak + ' days</div>';
    html += '      </div>';
    html += '    </div>';
    html += '    <div class="streak-dots-wrap">';
    html += '      <div class="streak-dots">';
    var todayIdx = dayBuckets.length - 1;
    for (var di = 0; di < dayBuckets.length; di++) {
      var b = dayBuckets[di];
      var dotClass = b.count > 0 ? (di === todayIdx ? 'dot-today' : 'dot-on') : 'dot-off';
      html += '<div class="streak-dot ' + dotClass + '" title="' + b.label + ' — ' + b.count + ' session' + (b.count === 1 ? '' : 's') + '"></div>';
    }
    html += '      </div>';
    html += '      <div class="streak-legend">';
    html += '        <span><span class="dot" style="background:' + success + '"></span> Completed</span>';
    html += '        <span><span class="dot" style="background:' + accent + '"></span> Today</span>';
    html += '        <span><span class="dot" style="background:' + border + '"></span> Missed</span>';
    html += '      </div>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';

    // ----- Charts -----
    html += '<div class="analytics-section">';
    html += '  <div class="section-title"><span>~</span> Weekly Activity</div>';
    html += '  <div class="analytics-charts">';
    html += '    <div class="chart-card">';
    html += '      <div class="chart-header"><div class="chart-title">Sessions per Day</div><div class="chart-subtitle">Last 7 days</div></div>';
    html +=      this._barChartSvg(dayBuckets.map(function(b){ return { label: b.label, value: b.count }; }), maxBucket, accent, muted);
    html += '    </div>';
    html += '    <div class="chart-card">';
    html += '      <div class="chart-header"><div class="chart-title">Score Trend</div><div class="chart-subtitle">Last 14 days</div></div>';
    html +=      this._lineChartSvg(scorePoints, 0, 100, accent, surface, border, muted);
    html += '    </div>';
    html += '  </div>';
    html += '</div>';

    // ----- Recent activity -----
    html += '<div class="analytics-section">';
    html += '  <div class="section-title"><span>!</span> Recent Activity</div>';
    html += '  <div class="activity-filters" id="analyticsFilters">';
    var filters = ['all', 'vocab', 'quiz', 'typing', 'reading', 'speaking', 'grammar', 'dictionary'];
    filters.forEach(function(f, i) {
      html += '<button class="filter-btn' + (i === 0 ? ' active' : '') + '" data-filter="' + f + '">' + f.charAt(0).toUpperCase() + f.slice(1) + '</button>';
    });
    html += '  </div>';
    html += '  <div class="activity-list" id="analyticsActivityList"></div>';
    html += '</div>';

    // ----- Goals -----
    html += '<div class="analytics-section">';
    html += '  <div class="section-title"><span>+</span> Goals</div>';
    html += '  <div class="goals-grid">';
    html += this._goalCardHtml('daily', 'Daily XP', todayXp, dailyXpGoal, 'cyan', accent);
    html += this._goalCardHtml('weekly', 'Weekly Sessions', weekSessions, 20, 'violet', accent);
    html += this._goalCardHtml('target', 'Mastery Target', wordsLearned, 200, 'green', success);
    html += '  </div>';
    html += '</div>';

    container.innerHTML = html;

    // ----- Wire up filter buttons -----
    var currentFilter = 'all';
    function renderList() {
      var filtered = currentFilter === 'all' ? recent : recent.filter(function(s) { return s.type === currentFilter; });
      var listEl = document.getElementById('analyticsActivityList');
      if (!listEl) return;
      if (!filtered.length) {
        listEl.innerHTML = '<div class="activity-empty">No activity matches this filter.</div>';
        return;
      }
      listEl.innerHTML = filtered.map(function(s) {
        var d = new Date(s.t);
        var dateStr = self._fmtDate(s.t) + ' · ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        var icon = self._activityIcon(s.type);
        var scoreStr = typeof s.score === 'number' ? s.score + '%' : '—';
        var durStr = self._fmtDuration(s.dur);
        return '<div class="activity-item">' +
          '<div class="activity-icon" data-type="' + (s.type || 'vocab') + '">' + icon + '</div>' +
          '<div class="activity-body">' +
            '<div class="activity-name">' + (s.type || 'vocab').charAt(0).toUpperCase() + (s.type || 'vocab').slice(1) + (s.levelUp ? ' · Level ' + s.levelUp + ' reached' : '') + '</div>' +
            '<div class="activity-meta">' + (s.words && s.words.length ? s.words.slice(0, 3).join(', ') + ' · ' : '') + durStr + '</div>' +
          '</div>' +
          '<div class="activity-score">' + scoreStr + '</div>' +
          '<div class="activity-time">' + dateStr + '</div>' +
        '</div>';
      }).join('');
    }
    renderList();
    var filterBtns = document.querySelectorAll('#analyticsFilters .filter-btn');
    filterBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        filterBtns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderList();
      });
    });

    // CSV button
    var csvBtn = document.getElementById('btnExportCSV');
    if (csvBtn) csvBtn.addEventListener('click', function() { self.exportSessionsCSV(); });
  },

  _getCssVar: function(name) {
    if (typeof getComputedStyle === 'undefined') return null;
    var root = document.documentElement;
    var v = getComputedStyle(root).getPropertyValue(name).trim();
    return v || null;
  },

  _trendPct: function(current, previous) {
    if (!previous) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  },

  _statCardHtml: function(kind, label, value, sub, trend, isPercent, isTime) {
    var trendHtml = '';
    if (typeof trend === 'number') {
      var cls = trend >= 0 ? 'trend-up' : 'trend-down';
      var arrow = trend >= 0 ? '&#9650;' : '&#9660;';
      var labelTxt = trend >= 0 ? 'vs last month' : 'vs last month';
      trendHtml = '<div class="stat-trend ' + cls + '">' + arrow + ' ' + Math.abs(trend) + '% ' + labelTxt + '</div>';
    }
    return '<div class="stat-card analytics-stat ' + kind + '">' +
      '<div class="stat-icon">' + (kind === 'sessions' ? 'S' : kind === 'score' ? '%' : kind === 'words' ? 'W' : 'T') + '</div>' +
      '<div class="stat-label">' + label + '</div>' +
      '<div class="stat-value">' + value + (isPercent ? '<span class="stat-unit">%</span>' : isTime ? '' : '') + '</div>' +
      '<div class="stat-sub">' + sub + '</div>' +
      trendHtml +
    '</div>';
  },

  _goalCardHtml: function(kind, label, current, target, colorName, color) {
    var pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    return '<div class="goal-card">' +
      '<div class="goal-head"><span class="goal-badge ' + colorName + '">' + label + '</span><span class="goal-pct">' + pct + '%</span></div>' +
      '<div class="goal-progress-outer"><div class="goal-progress-inner ' + colorName + '" style="width:' + pct + '%"></div></div>' +
      '<div class="goal-meta"><span class="current">' + current + '</span><span>Goal: ' + target + '</span></div>' +
    '</div>';
  },

  _activityIcon: function(type) {
    var map = { vocab: 'V', quiz: 'Q', typing: 'T', reading: 'R', speaking: 'S', grammar: 'G', dictionary: 'D' };
    return map[type] || '·';
  },

  _fmtDuration: function(sec) {
    sec = Math.round(sec || 0);
    if (sec < 60) return sec + 's';
    if (sec < 3600) return Math.round(sec / 60) + 'm';
    var h = Math.floor(sec / 3600);
    var m = Math.round((sec % 3600) / 60);
    return h + 'h' + (m ? ' ' + m + 'm' : '');
  },

  _barChartSvg: function(data, max, color, mutedColor) {
    var w = 360, h = 140;
    var padding = { l: 24, r: 8, t: 10, b: 22 };
    var cw = w - padding.l - padding.r;
    var ch = h - padding.t - padding.b;
    var barW = cw / data.length * 0.6;
    var gap = cw / data.length * 0.4;
    var yMax = Math.max(max, 1);
    var svg = '<svg class="bar-svg" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" style="width:100%;height:160px">';
    // Grid lines
    for (var g = 0; g <= 4; g++) {
      var gy = padding.t + (ch / 4) * g;
      svg += '<line x1="' + padding.l + '" y1="' + gy + '" x2="' + (w - padding.r) + '" y2="' + gy + '" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>';
    }
    data.forEach(function(d, i) {
      var x = padding.l + (cw / data.length) * i + gap / 2;
      var barH = (d.value / yMax) * ch;
      var y = padding.t + ch - barH;
      svg += '<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + barH + '" rx="3" fill="' + color + '" opacity="0.85">';
      svg += '<title>' + d.label + ' — ' + d.value + ' session' + (d.value === 1 ? '' : 's') + '</title>';
      svg += '</rect>';
      svg += '<text x="' + (x + barW / 2) + '" y="' + (h - 6) + '" text-anchor="middle" fill="' + mutedColor + '" font-size="10">' + d.label + '</text>';
    });
    svg += '</svg>';
    return svg;
  },

  _lineChartSvg: function(points, yMin, yMax, color, fillColor, borderColor, mutedColor) {
    var w = 360, h = 160;
    var padding = { l: 24, r: 8, t: 12, b: 22 };
    var cw = w - padding.l - padding.r;
    var ch = h - padding.t - padding.b;
    var n = points.length;
    var stepX = n > 1 ? cw / (n - 1) : 0;
    var svg = '<div class="line-chart-wrap"><svg class="line-svg" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" style="width:100%;height:160px">';
    // Grid
    for (var g = 0; g <= 4; g++) {
      var gy = padding.t + (ch / 4) * g;
      var gv = yMax - (yMax - yMin) * (g / 4);
      svg += '<line x1="' + padding.l + '" y1="' + gy + '" x2="' + (w - padding.r) + '" y2="' + gy + '" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>';
      svg += '<text x="' + (padding.l - 4) + '" y="' + (gy + 3) + '" text-anchor="end" fill="' + mutedColor + '" font-size="9">' + Math.round(gv) + '</text>';
    }
    // Build polyline (skip null)
    var validPts = points.map(function(p, i) {
      if (p.y === null) return null;
      return { x: padding.l + i * stepX, y: padding.t + ch - ((p.y - yMin) / (yMax - yMin)) * ch, label: p.label, val: p.y };
    });
    // Build path with null gaps as multiple segments
    var segments = [];
    var current = [];
    validPts.forEach(function(p) {
      if (p === null) {
        if (current.length) segments.push(current);
        current = [];
      } else {
        current.push(p);
      }
    });
    if (current.length) segments.push(current);

    // Filled area under first valid segment only (gradient vibe)
    if (segments.length) {
      var seg = segments[0];
      if (seg.length > 1) {
        var area = 'M ' + seg[0].x + ' ' + (padding.t + ch) + ' L ';
        seg.forEach(function(p) { area += p.x + ' ' + p.y + ' L '; });
        area += seg[seg.length - 1].x + ' ' + (padding.t + ch) + ' Z';
        svg += '<path d="' + area + '" fill="' + color + '" opacity="0.12"/>';
      }
      // Lines for each segment
      segments.forEach(function(seg) {
        if (seg.length < 2) return;
        var d = 'M ' + seg[0].x + ' ' + seg[0].y;
        for (var pi = 1; pi < seg.length; pi++) d += ' L ' + seg[pi].x + ' ' + seg[pi].y;
        svg += '<path d="' + d + '" stroke="' + color + '" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round"/>';
      });
    }
    // Dots + hover targets (skip null gaps)
    validPts.forEach(function(p, i) {
      if (!p) return;
      svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="3" fill="' + color + '" data-i="' + i + '"/>';
    });
    svg += '</svg></div>';
    return svg;
  },

  /* ---------- Export / Import / Reset ---------- */
  exportProgress: function() {
    var data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      vf_user: this.user,
      vf_settings: this.settings,
      vf_progress: null
    };
    try {
      var progData = localStorage.getItem('vocabforge_progress');
      if (progData) data.vf_progress = JSON.parse(progData);
    } catch (e) { /* ignore */ }

    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'vocabforge-progress-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  importProgress: function() {
    var self = this;
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        try {
          var data = JSON.parse(ev.target.result);
          if (data.vf_user) {
            localStorage.setItem('vf_user', JSON.stringify(data.vf_user));
          }
          if (data.vf_settings) {
            localStorage.setItem('vf_settings', JSON.stringify(data.vf_settings));
          }
          if (data.vf_progress) {
            localStorage.setItem('vocabforge_progress', JSON.stringify(data.vf_progress));
          }
          self.load();
          self.updateHeader();
          self.renderStats();
          self.applyTheme();
          alert('Progress imported successfully!');
        } catch (err) {
          alert('Failed to import: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
    input.click();
  },

  resetProgressPrompt: function() {
    var confirmed = confirm('Are you sure you want to reset ALL progress? This cannot be undone.');
    if (!confirmed) return;

    // Double-confirm
    var doubleCheck = confirm('This will erase all XP, levels, hearts, streaks, and achievements. Proceed?');
    if (!doubleCheck) return;

    try {
      localStorage.removeItem('vf_user');
      localStorage.removeItem('vf_settings');
      localStorage.removeItem('vocabforge_progress');
    } catch (e) { /* ignore */ }

    this.user = {
      xp: 0,
      level: 1,
      hearts: 5,
      streak: 0,
      bestStreak: 0,
      wordsLearned: [],
      achievements: []
    };
    this.settings = {
      sound: true,
      tts: true,
      theme: 'eloquent',
      dailyGoal: 100
    };
    this._themeIndex = 0;
    this._sessionXP = 0;
    this.updateHeader();
    this.renderStats();
    this.applyTheme();
    this.save();
    alert('Progress has been reset.');
  },

  /* ---------- XP & Progress ---------- */
  addXP: function(amount) {
    this.user.xp += amount;
    this._sessionXP += amount;
    var xpInLevel = this.user.xp % 100;
    if (xpInLevel >= 0 && this.user.xp > 0 && xpInLevel < amount) {
      this.levelUp();
    }
    this.updateHeader();
    this.save();
  },

  levelUp: function() {
    this.user.level++;
    this.updateHeader();
    this.triggerLevelUp();
  },

  loseHeart: function() {
    if (this.user.hearts > 0) {
      this.user.hearts--;
      this.updateHeader();
      this.triggerHeartBreak();
      this.save();
    }
  }
};

/* ---------- DOM Ready ---------- */
document.addEventListener('DOMContentLoaded', function() {
  VF.init();
  // Populate vocab definitions from vocabulary data
  if (typeof window !== 'undefined' && window.VOCAB_WORDS) {
    window.VOCAB_WORDS.forEach(function(w){
      VF.vocabDefs[w.word.toLowerCase()] = w.definition;
    });
  }
});
