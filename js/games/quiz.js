/**
 * VocabForge — Multiple Choice Quiz Game
 * Pick the correct definition for each word.
 *
 * Exports window.QuizGame with init(container) and destroy().
 */

;(function() {
  "use strict";

  var QUESTIONS_PER_ROUND = 10;
  var TIME_PER_QUESTION = 15;
  var SPEED_BONUS_THRESHOLD = 5;
  var XP_CORRECT = 10;
  var XP_SPEED_BONUS = 5;
  var XP_PERFECT_BONUS = 50;

  var _container = null;
  var _questions = [];
  var _currentIndex = 0;
  var _score = 0;
  var _xpEarned = 0;
  var _heartsLost = 0;
  var _timerInterval = null;
  var _timeLeft = 0;
  var _questionStartTime = 0;
  var _locked = false;
  var _roundComplete = false;
  var _progressState = null;

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function esc(str) {
    if (!str) return "";
    var d = document.createElement("div");
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
  }

  function generateQuestions() {
    var allWords = (typeof VOCAB_WORDS !== "undefined") ? VOCAB_WORDS : [];
    if (allWords.length < 4) {
      return [{
        word: allWords[0] || { word: "example", definition: "a thing characteristic of its kind", pos: "noun", example: "This is an example." },
        correctIndex: 0,
        options: [
          { definition: "a thing characteristic of its kind", isCorrect: true },
          { definition: "a small part representing the whole", isCorrect: false },
          { definition: "a person who teaches", isCorrect: false },
          { definition: "a type of food", isCorrect: false }
        ]
      }];
    }
    var shuffled = shuffle(allWords);
    var count = Math.min(QUESTIONS_PER_ROUND, shuffled.length);
    var selected = shuffled.slice(0, count);
    var questions = [];
    for (var i = 0; i < selected.length; i++) {
      var correctWord = selected[i];
      var others = allWords.filter(function(w) { return w.id !== correctWord.id; });
      var shuffledOthers = shuffle(others);
      var wrongDefs = [];
      for (var j = 0; j < Math.min(3, shuffledOthers.length); j++) {
        wrongDefs.push(shuffledOthers[j].definition);
      }
      while (wrongDefs.length < 3) wrongDefs.push("Definition " + (wrongDefs.length + 1));
      var options = [{ definition: correctWord.definition, isCorrect: true }];
      for (var k = 0; k < 3; k++) options.push({ definition: wrongDefs[k], isCorrect: false });
      options = shuffle(options);
      var correctIdx = 0;
      for (var o = 0; o < options.length; o++) { if (options[o].isCorrect) { correctIdx = o; break; } }
      questions.push({ word: correctWord, correctIndex: correctIdx, options: options });
    }
    return questions;
  }

  function renderQuestion() {
    if (!_container) return;
    var q = _questions[_currentIndex];
    if (!q) { renderResults(); return; }
    var h = "";
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">';
    h += '  <div><span style="font-size:0.8rem;color:var(--text-muted);">Question </span>';
    h += '  <span style="font-weight:700;">' + (_currentIndex + 1) + '</span>';
    h += '  <span style="color:var(--text-muted);"> / ' + QUESTIONS_PER_ROUND + '</span></div>';
    h += '  <div id="qzTimer" style="font-size:1.1rem;font-weight:700;color:var(--accent);">' + TIME_PER_QUESTION + 's</div></div>';
    h += '<div style="display:flex;gap:6px;margin-bottom:24px;flex-wrap:wrap;">';
    for (var d = 0; d < QUESTIONS_PER_ROUND; d++) {
      var dc = d < _currentIndex ? (_questions[d]._wasCorrect ? 'background:var(--success);' : 'background:var(--danger);')
        : (d === _currentIndex ? 'background:var(--accent);' : 'background:var(--surface2);');
      h += '<div style="width:10px;height:10px;border-radius:50%;' + dc + '"></div>';
    }
    h += '</div>';
    h += '<div style="text-align:center;margin-bottom:24px;">';
    h += '  <div style="font-size:2.25rem;font-weight:800;color:var(--accent);line-height:1.2;">' + esc(q.word.word) + '</div>';
    if (q.word.phonetic) h += '  <div style="font-size:0.85rem;color:var(--text-muted);margin-top:4px;">' + esc(q.word.phonetic) + '</div>';
    if (q.word.pos) h += '  <div style="display:inline-block;font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;background:var(--surface2);color:var(--text-muted);padding:2px 10px;border-radius:99px;margin-top:6px;">' + esc(q.word.pos) + '</div>';
    h += '</div>';
    h += '<div class="quiz-options" id="qzOptions">';
    var labels = ["A", "B", "C", "D"];
    for (var i = 0; i < q.options.length; i++) {
      h += '<button class="quiz-option" data-index="' + i + '" id="qzOpt' + i + '">';
      h += '  <span style="font-size:0.7rem;font-weight:700;color:var(--text-muted);display:block;margin-bottom:6px;">' + labels[i] + '</span>';
      h += '  <span>' + esc(q.options[i].definition) + '</span></button>';
    }
    h += '</div>';
    h += '<div id="qzExplanation" style="display:none;margin-top:16px;padding:14px;background:var(--surface);border-radius:var(--radius);border-left:3px solid var(--accent);">';
    h += '  <div style="font-weight:700;margin-bottom:4px;" id="qzExpTitle"></div>';
    h += '  <div style="font-size:0.9rem;color:var(--text-muted);" id="qzExpText"></div></div>';
    h += '<div style="text-align:center;margin-top:16px;">';
    h += '  <span style="font-size:0.8rem;color:var(--text-muted);">Score: </span>';
    h += '  <span id="qzScore" style="font-weight:700;color:var(--success);">' + _score + '</span>';
    h += '  <span style="font-size:0.8rem;color:var(--text-muted);"> &middot; XP: </span>';
    h += '  <span id="qzXP" style="font-weight:700;color:var(--accent);">+' + _xpEarned + '</span></div>';
    _container.innerHTML = h;
    bindOptionClicks();

    // Speak the word for this question
    if (typeof VFAudio !== "undefined") VFAudio.speak(q.word.word);
  }

  function bindOptionClicks() {
    var opts = document.getElementById("qzOptions");
    if (!opts) return;
    opts.addEventListener("click", function(e) {
      if (_locked || _roundComplete) return;
      var btn = e.target.closest(".quiz-option");
      if (!btn) return;
      var idx = parseInt(btn.getAttribute("data-index"), 10);
      if (!isNaN(idx)) handleAnswer(idx);
    });
  }

  function handleAnswer(selectedIndex) {
    if (_locked) return;
    _locked = true;
    stopTimer();
    var q = _questions[_currentIndex];
    var isCorrect = selectedIndex === q.correctIndex;
    var elapsed = (Date.now() - _questionStartTime) / 1000;
    q._wasCorrect = isCorrect;
    if (isCorrect) {
      _score++;
      var xp = XP_CORRECT;
      if (elapsed <= SPEED_BONUS_THRESHOLD) xp += XP_SPEED_BONUS;
      _xpEarned += xp;
      var correctBtn = document.getElementById("qzOpt" + selectedIndex);
      if (correctBtn) correctBtn.classList.add("correct");
      updateScoreDisplay();
      if (_progressState) Progress.recordAnswer(_progressState, true, q.word.id);
      setTimeout(function() { advanceQuestion(); }, 1000);
    } else {
      var wrongBtn = document.getElementById("qzOpt" + selectedIndex);
      var correctBtn2 = document.getElementById("qzOpt" + q.correctIndex);
      if (wrongBtn) wrongBtn.classList.add("wrong");
      if (correctBtn2) correctBtn2.classList.add("correct");
      showExplanation(q);
      _heartsLost++;
      if (typeof VF !== "undefined" && VF.loseHeart) VF.loseHeart();
      if (_progressState) Progress.recordAnswer(_progressState, false, q.word.id);
      updateScoreDisplay();
      setTimeout(function() { advanceQuestion(); }, 2000);
    }
  }

  function showExplanation(q) {
    var expDiv = document.getElementById("qzExplanation");
    var expTitle = document.getElementById("qzExpTitle");
    var expText = document.getElementById("qzExpText");
    if (expDiv) expDiv.style.display = "block";
    if (expTitle) expTitle.innerHTML = '<span style="color:var(--accent);">' + esc(q.word.word) + '</span> &mdash; ' + esc(q.word.definition);
    if (expText && q.word.example) expText.textContent = '"' + q.word.example + '"';
  }

  function updateScoreDisplay() {
    var elS = document.getElementById("qzScore");
    var elX = document.getElementById("qzXP");
    if (elS) elS.textContent = _score;
    if (elX) elX.textContent = "+" + _xpEarned;
  }

  function advanceQuestion() {
    _currentIndex++;
    _locked = false;
    if (_currentIndex >= _questions.length) {
      _roundComplete = true;
      renderResults();
    } else {
      startTimer();
      renderQuestion();
    }
  }

  function startTimer() {
    stopTimer();
    _timeLeft = TIME_PER_QUESTION;
    _questionStartTime = Date.now();
    updateTimerDisplay();
    _timerInterval = setInterval(function() {
      _timeLeft--;
      updateTimerDisplay();
      if (_timeLeft <= 0) { stopTimer(); handleTimeOut(); }
    }, 1000);
  }

  function stopTimer() {
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
  }

  function updateTimerDisplay() {
    var el = document.getElementById("qzTimer");
    if (el) {
      el.textContent = _timeLeft + "s";
      el.style.color = _timeLeft <= 5 ? "var(--danger)" : "var(--accent)";
    }
  }

  function handleTimeOut() {
    if (_locked || _roundComplete) return;
    _locked = true;
    var q = _questions[_currentIndex];
    q._wasCorrect = false;
    var correctBtn = document.getElementById("qzOpt" + q.correctIndex);
    if (correctBtn) correctBtn.classList.add("correct");
    showExplanation(q);
    _heartsLost++;
    if (typeof VF !== "undefined" && VF.loseHeart) VF.loseHeart();
    if (_progressState) Progress.recordAnswer(_progressState, false, q.word.id);
    setTimeout(function() { advanceQuestion(); }, 2000);
  }

  function getStarRating(score, total) {
    var pct = score / total;
    if (pct >= 0.9) return 3;
    if (pct >= 0.6) return 2;
    return 1;
  }

  function getStarsHTML(rating) {
    var h = "";
    for (var i = 1; i <= 3; i++) {
      h += i <= rating ? '<span style="color:var(--warning);">★</span>' : '<span style="color:var(--surface2);">★</span>';
    }
    return h;
  }

  function renderResults() {
    if (!_container) return;
    var totalXP = _xpEarned;
    var isPerfect = _score === QUESTIONS_PER_ROUND;
    if (isPerfect) totalXP += XP_PERFECT_BONUS;
    var accuracy = Math.round((_score / QUESTIONS_PER_ROUND) * 100);
    var stars = getStarRating(_score, QUESTIONS_PER_ROUND);
    if (totalXP > 0 && typeof VF !== "undefined" && VF.addXP) VF.addXP(totalXP);
    var h = "";
    h += '<div style="text-align:center;padding:24px 16px;">';
    h += '<div style="font-size:2.5rem;margin-bottom:8px;letter-spacing:4px;">' + getStarsHTML(stars) + '</div>';
    var titles = ["Keep Practicing!", "Good Job!", "Outstanding!"];
    h += '<h2 style="font-size:1.5rem;font-weight:700;margin-bottom:4px;">' + titles[stars - 1] + '</h2>';
    h += '<p style="color:var(--text-muted);margin-bottom:24px;">Quiz Complete</p>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px;">';
    h += '  <div style="background:var(--surface);border-radius:var(--radius);padding:16px;">';
    h += '    <div style="font-size:1.5rem;font-weight:700;color:var(--accent);">' + _score + '/' + QUESTIONS_PER_ROUND + '</div>';
    h += '    <div style="font-size:0.75rem;color:var(--text-muted);">Score</div></div>';
    h += '  <div style="background:var(--surface);border-radius:var(--radius);padding:16px;">';
    h += '    <div style="font-size:1.5rem;font-weight:700;color:var(--success);">' + accuracy + '%</div>';
    h += '    <div style="font-size:0.75rem;color:var(--text-muted);">Accuracy</div></div>';
    h += '  <div style="background:var(--surface);border-radius:var(--radius);padding:16px;">';
    h += '    <div style="font-size:1.5rem;font-weight:700;color:var(--warning);">+' + totalXP + '</div>';
    h += '    <div style="font-size:0.75rem;color:var(--text-muted);">XP Earned</div></div></div>';
    if (isPerfect) {
      h += '<div style="background:rgba(52,211,153,0.1);border:1px solid var(--success);border-radius:var(--radius);padding:12px;margin-bottom:24px;">';
      h += '  <div style="font-weight:700;color:var(--success);font-size:1.1rem;">&#127942; Perfect Round!</div>';
      h += '  <div style="font-size:0.85rem;color:var(--text-muted);margin-top:2px;">+' + XP_PERFECT_BONUS + ' bonus XP for 10/10</div></div>';
    }
    if (_heartsLost > 0) {
      h += '<div style="font-size:0.85rem;color:var(--danger);margin-bottom:24px;">&#10084;&#65039; ' + _heartsLost + ' heart' + (_heartsLost > 1 ? 's' : '') + ' lost</div>';
    }
    h += '<div style="display:flex;gap:12px;justify-content:center;">';
    h += '  <button class="btn btn-primary" id="qzReplay">&#8635; Play Again</button>';
    h += '  <button class="btn btn-secondary" id="qzBackGames">Back to Games</button>';
    h += '</div></div>';
    _container.innerHTML = h;
    var btnR = document.getElementById("qzReplay");
    var btnB = document.getElementById("qzBackGames");
    if (btnR) btnR.addEventListener("click", function() { startGame(); });
    if (btnB) btnB.addEventListener("click", function() { if (typeof VF !== "undefined") VF.showScreen("games-menu"); });
  }

  function startGame() {
    _questions = generateQuestions();
    _currentIndex = 0;
    _score = 0;
    _xpEarned = 0;
    _heartsLost = 0;
    _locked = false;
    _roundComplete = false;
    _progressState = (typeof Progress !== "undefined") ? Progress.load() : null;
    renderQuestion();
    startTimer();
  }

  var QuizGame = {
    init: function(container) {
      _container = container || null;
      if (!_container) { console.warn("QuizGame: no container provided"); return; }
      startGame();
    },
    destroy: function() {
      stopTimer();
      if (_container) _container.innerHTML = "";
      _container = null;
      _questions = [];
      _currentIndex = 0;
      _score = 0;
      _xpEarned = 0;
      _heartsLost = 0;
      _locked = false;
      _roundComplete = false;
      _progressState = null;
    }
  };

  if (typeof window !== "undefined") window.QuizGame = QuizGame;
  if (typeof module !== "undefined" && module.exports) module.exports = { QuizGame: QuizGame };

})();
