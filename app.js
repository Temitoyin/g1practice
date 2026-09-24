/* ==========================================================================
   G1 Practice
   Ported from the Claude Design prototype (reference/original-design.dc.html),
   which ran on the <x-dc> / DCLogic runtime. Same screens, same state machine,
   plain DOM instead.
   ========================================================================== */

(function () {
  'use strict';

  var STORAGE_KEY = 'g1prac_v1';

  var CONFIG = {
    shuffle: true,       // was a design-time prop
    quickLength: 10,     // was a design-time prop (5-30, step 5)
    mockPerPart: 20,     // 20 signs + 20 rules, like the real G1
    mockPassMark: 16     // need 16/20 in each part
  };

  var TOPICS = [
    ['all', 'All'],
    ['signs', 'Signs'],
    ['rules', 'Rules'],
    ['licence', 'Licence & penalties'],
    ['missed', 'Missed']
  ];

  var LETTERS = ['A', 'B', 'C', 'D'];

  var HANDBOOK = 'https://www.ontario.ca/document/official-mto-drivers-handbook';

  // Where to send someone who wants the rule behind a question.
  var CHAPTER = {
    signs:   { label: 'Signs', url: HANDBOOK + '/signs' },
    rules:   { label: 'Driving along', url: HANDBOOK + '/driving-along' },
    licence: { label: "Keeping your driver's licence",
               url: HANDBOOK + '/keeping-your-drivers-licence' }
  };

  var REFERENCES = [
    ['Signs', '/signs', 'Every sign in this app, with the official wording'],
    ['Driving along', '/driving-along', 'Right-of-way, turns, following distance'],
    ['Safe and responsible driving', '/safe-and-responsible-driving', 'Speed, alcohol, sharing the road'],
    ["Keeping your driver's licence", '/keeping-your-drivers-licence', 'Demerit points, suspensions, renewals'],
    ['Dealing with emergencies', '/dealing-emergencies', 'Collisions, breakdowns, when to call police'],
    ['Sample knowledge test', '/test-yourself-sample-knowledge-test-questions', "The ministry's own practice questions"]
  ];

  // ------------------------------------------------------------ storage --

  function loadProgress() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (raw) {
        return {
          mastered: raw.mastered || [],
          missed: raw.missed || [],
          best: raw.best === undefined ? null : raw.best
        };
      }
    } catch (e) { /* private window, blocked storage — fall through */ }
    return { mastered: [], missed: [], best: null };
  }

  function saveProgress(next) {
    state.progress = next;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) { /* nothing to do; the session still works in memory */ }
  }

  // ------------------------------------------------------------- helpers --

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  var ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (c) { return ESCAPES[c]; });
  }

  function pct(part, whole) {
    return (whole ? (part / whole) * 100 : 0) + '%';
  }

  function topicName(key) {
    for (var i = 0; i < TOPICS.length; i++) {
      if (TOPICS[i][0] === key) return TOPICS[i][1];
    }
    return '';
  }

  function signImage(item, sizeClass) {
    if (!item || !item.img) return '';
    return '<img class="sign-img ' + sizeClass + '" src="' + esc(item.img) +
           '" alt="Road sign shown in this question">';
  }

  // --------------------------------------------------------------- state --

  var state = {
    data: window.G1_QUESTIONS || [],
    screen: 'home',
    topic: 'all',
    deck: [],
    idx: 0,
    flipped: false,
    chosen: null,
    streak: 0,
    answered: 0,
    correctCount: 0,
    quiz: null,
    results: null,
    flashGot: 0,
    flashLearn: 0,
    progress: loadProgress()
  };

  function setState(patch) {
    for (var k in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, k)) state[k] = patch[k];
    }
    render();
  }

  // Move a question between the mastered and missed sets.
  function record(id, correct) {
    var mastered = new Set(state.progress.mastered);
    var missed = new Set(state.progress.missed);
    if (correct) { mastered.add(id); missed.delete(id); }
    else { missed.add(id); mastered.delete(id); }
    saveProgress({
      mastered: Array.from(mastered),
      missed: Array.from(missed),
      best: state.progress.best
    });
  }

  function pool(topic) {
    var d = state.data;
    if (topic === 'all') return d;
    if (topic === 'signs') return d.filter(function (x) { return x.cat === 'signs'; });
    if (topic === 'rules') return d.filter(function (x) { return x.cat !== 'signs'; });
    if (topic === 'licence') return d.filter(function (x) { return x.cat === 'licence'; });
    var missed = new Set(state.progress.missed);
    return d.filter(function (x) { return missed.has(x.id); });
  }

  function order(list) {
    return CONFIG.shuffle ? shuffle(list) : list.slice();
  }

  // ------------------------------------------------------------- actions --

  var actions = {
    setTopic: function (el) {
      setState({ topic: el.getAttribute('data-topic') });
    },

    startFlash: function () {
      setState({
        screen: 'flash', deck: order(pool(state.topic)), idx: 0,
        flipped: false, flashGot: 0, flashLearn: 0
      });
    },

    startPractice: function () {
      setState({
        screen: 'practice', deck: order(pool(state.topic)), idx: 0,
        chosen: null, streak: 0, answered: 0, correctCount: 0
      });
    },

    startQuick: function () { startQuiz('quick'); },
    startMock: function () { startQuiz('mock'); },

    goHome: function () {
      setState({ screen: 'home', chosen: null, flipped: false });
    },

    flip: function () { setState({ flipped: !state.flipped }); },

    markGot: function () {
      record(state.deck[state.idx].id, true);
      setState({ flashGot: state.flashGot + 1, idx: state.idx + 1, flipped: false });
    },

    markLearning: function () {
      record(state.deck[state.idx].id, false);
      setState({ flashLearn: state.flashLearn + 1, idx: state.idx + 1, flipped: false });
    },

    skipCard: function () { setState({ idx: state.idx + 1, flipped: false }); },

    prevCard: function () {
      setState({ idx: Math.max(0, state.idx - 1), flipped: false });
    },

    choosePractice: function (el) {
      if (state.chosen !== null) return;
      var i = Number(el.getAttribute('data-i'));
      var item = state.deck[state.idx];
      var correct = i === item.a;
      record(item.id, correct);
      setState({
        chosen: i,
        streak: correct ? state.streak + 1 : 0,
        answered: state.answered + 1,
        correctCount: state.correctCount + (correct ? 1 : 0)
      });
    },

    nextPractice: function () {
      var idx = state.idx + 1;
      var deck = state.deck;
      if (idx >= deck.length) { deck = shuffle(deck); idx = 0; }  // practice loops
      setState({ idx: idx, deck: deck, chosen: null });
    },

    chooseQuiz: function (el) {
      var picks = state.quiz.picks.slice();
      picks[state.idx] = Number(el.getAttribute('data-i'));
      setState({ quiz: Object.assign({}, state.quiz, { picks: picks }) });
    },

    quizPrev: function () { setState({ idx: Math.max(0, state.idx - 1) }); },

    quizNext: function () {
      var quiz = state.quiz;
      if (quiz.picks[state.idx] === null) return;
      if (state.idx < quiz.items.length - 1) { setState({ idx: state.idx + 1 }); return; }
      finishQuiz();
    },

    retryQuiz: function () { startQuiz(state.results.kind); }
  };

  function startQuiz(kind) {
    var d = state.data;
    var items;
    if (kind === 'mock') {
      var signs = shuffle(d.filter(function (x) { return x.cat === 'signs'; }));
      var rules = shuffle(d.filter(function (x) { return x.cat !== 'signs'; }));
      items = signs.slice(0, CONFIG.mockPerPart).concat(rules.slice(0, CONFIG.mockPerPart));
    } else {
      var n = Math.max(3, CONFIG.quickLength);
      items = shuffle(pool(state.topic)).slice(0, n);
    }
    setState({
      screen: 'quiz',
      quiz: { kind: kind, items: items, picks: new Array(items.length).fill(null) },
      idx: 0,
      results: null
    });
  }

  function finishQuiz() {
    var quiz = state.quiz;
    var mastered = new Set(state.progress.mastered);
    var missed = new Set(state.progress.missed);
    var signs = 0, rules = 0, total = 0;
    var wrong = [];

    quiz.items.forEach(function (item, i) {
      if (quiz.picks[i] === item.a) {
        total++;
        if (item.cat === 'signs') signs++; else rules++;
        mastered.add(item.id); missed.delete(item.id);
      } else {
        wrong.push({
          q: item.q,
          img: item.img || '',
          yours: item.o[quiz.picks[i]],
          correct: item.o[item.a]
        });
        missed.add(item.id); mastered.delete(item.id);
      }
    });

    var best = state.progress.best;
    if (quiz.kind === 'mock' && (best === null || total > best)) best = total;

    saveProgress({ mastered: Array.from(mastered), missed: Array.from(missed), best: best });
    setState({
      screen: 'results',
      results: { kind: quiz.kind, n: quiz.items.length, total: total, signs: signs, rules: rules, wrong: wrong }
    });
  }

  // --------------------------------------------------------------- views --

  function viewHome() {
    var total = state.data.length;
    var mastered = state.progress.mastered.length;
    var best = state.progress.best;

    var pills = TOPICS.map(function (t) {
      var key = t[0];
      var count = pool(key).length;
      var active = state.topic === key;
      return '<button class="pill" type="button" data-act="setTopic" data-topic="' + key + '"' +
             ' aria-pressed="' + active + '"' + (count === 0 ? ' disabled' : '') + '>' +
             esc(t[1]) + '<span class="pill-count">' + count + '</span></button>';
    }).join('');

    return '' +
      '<div class="home">' +
        '<header class="masthead">' +
          '<div class="brand">' +
            '<span class="brand-mark" aria-hidden="true"></span>' +
            '<span class="brand-name">G1 Practice</span>' +
          '</div>' +
          '<h1>Let&rsquo;s get you road-ready.</h1>' +
        '</header>' +

        '<section class="summary" aria-label="Your progress">' +
          '<div class="summary-head">' +
            '<span class="summary-label">Mastered</span>' +
            '<span class="summary-score">' + mastered +
              '<small> / ' + total + '</small></span>' +
          '</div>' +
          '<div class="meter" role="progressbar" aria-valuenow="' + mastered +
            '" aria-valuemin="0" aria-valuemax="' + total + '" aria-label="Questions mastered">' +
            '<div class="meter-fill" style="width:' +
              (total ? (mastered / total * 100).toFixed(1) + '%' : '0%') + '"></div>' +
          '</div>' +
          '<dl class="stat-grid">' +
            '<div class="stat"><dt>Best mock test</dt><dd>' +
              (best === null ? '&mdash;' : best + ' / 40') + '</dd></div>' +
            '<div class="stat"><dt>To review</dt><dd>' +
              state.progress.missed.length + ' questions</dd></div>' +
          '</dl>' +
        '</section>' +

        '<section class="section">' +
          '<h2 class="eyebrow">Topic</h2>' +
          '<div class="pills">' + pills + '</div>' +
        '</section>' +

        '<section class="section">' +
          '<h2 class="eyebrow">Play</h2>' +

          '<button class="mode" type="button" data-act="startFlash">' +
            '<span class="mode-icon is-flash"><span class="glyph-card"></span></span>' +
            '<span class="mode-text">' +
              '<span class="mode-title">Flashcards</span>' +
              '<span class="mode-sub">Tap to flip, sort what you know</span>' +
            '</span>' +
            '<span class="mode-arrow" aria-hidden="true">&rarr;</span>' +
          '</button>' +

          '<button class="mode" type="button" data-act="startPractice">' +
            '<span class="mode-icon is-practice"><span class="glyph-dot"></span></span>' +
            '<span class="mode-text">' +
              '<span class="mode-title">Practice</span>' +
              '<span class="mode-sub">Pick an answer, see if you&rsquo;re right</span>' +
            '</span>' +
            '<span class="mode-arrow" aria-hidden="true">&rarr;</span>' +
          '</button>' +

          '<div class="quiz-panel">' +
            '<div class="quiz-panel-head">' +
              '<span class="mode-icon is-quiz"><span class="glyph-octagon"></span></span>' +
              '<span class="mode-text">' +
                '<span class="mode-title">Quiz</span>' +
                '<span class="mode-sub">No hints until the end</span>' +
              '</span>' +
            '</div>' +
            '<div class="quiz-actions">' +
              '<button class="btn-outline-dark" type="button" data-act="startQuick">Quick ' +
                Math.max(3, CONFIG.quickLength) + '</button>' +
              '<button class="btn-yellow" type="button" data-act="startMock">Mock G1 &middot; 40</button>' +
            '</div>' +
            '<p class="quiz-note">Mock test: 20 signs + 20 rules, like the real one. ' +
              'You need 16/20 in each part to pass.</p>' +
          '</div>' +
        '</section>' +

        '<section class="section">' +
          '<h2 class="eyebrow">Reference</h2>' +
          '<a class="ref-lead" href="' + HANDBOOK + '" target="_blank" rel="noopener noreferrer">' +
            '<span class="ref-mark" aria-hidden="true"></span>' +
            '<span class="mode-text">' +
              '<span class="mode-title">Official MTO Driver&rsquo;s Handbook</span>' +
              '<span class="mode-sub">Every answer here was checked against it</span>' +
            '</span>' +
            '<span class="mode-arrow" aria-hidden="true">&#8599;</span>' +
          '</a>' +
          '<ul class="ref-list">' +
            REFERENCES.map(function (r) {
              return '<li><a class="ref-row" href="' + HANDBOOK + r[1] +
                     '" target="_blank" rel="noopener noreferrer">' +
                     '<span class="ref-name">' + esc(r[0]) + '</span>' +
                     '<span class="ref-note">' + esc(r[2]) + '</span></a></li>';
            }).join('') +
          '</ul>' +
        '</section>' +
      '</div>';
  }

  function viewTopBar(label, right, fillPct) {
    return '' +
      '<div class="topbar">' +
        '<button class="btn-back" type="button" data-act="goHome">&larr; Home</button>' +
        '<span class="topbar-label">' + esc(label) + '</span>' +
        '<span class="topbar-count">' + esc(right) + '</span>' +
      '</div>' +
      '<div class="rail"><div class="rail-fill" style="width:' + fillPct + '"></div></div>';
  }

  function viewFlash() {
    var n = state.deck.length;
    var active = state.idx < n;
    var head = viewTopBar(
      'Flashcards · ' + topicName(state.topic),
      Math.min(state.idx + 1, n) + '/' + n,
      pct(state.idx, n)
    );

    if (!active) {
      return head +
        '<div class="done-panel">' +
          '<h2>Deck done!</h2>' +
          '<p>' + state.flashGot + ' got it &middot; ' + state.flashLearn + ' still learning</p>' +
          '<div class="done-actions">' +
            '<button class="btn-neutral" type="button" data-act="goHome">Home</button>' +
            '<button class="btn-primary" type="button" data-act="startFlash">Go again</button>' +
          '</div>' +
        '</div>';
    }

    var item = state.deck[state.idx];
    var face;

    if (state.flipped) {
      face =
        '<span class="card-kicker">Answer</span>' +
        (item.img ? '<span class="sign-plate">' + signImage(item, 'is-small') + '</span>' : '') +
        '<p class="card-a">' + esc(item.o[item.a]) + '</p>' +
        (item.img ? '' : '<p class="card-recall">' + esc(item.q) + '</p>');
    } else {
      face =
        '<span class="card-kicker">Question</span>' +
        signImage(item, '') +
        '<p class="card-q">' + esc(item.q) + '</p>' +
        '<span class="card-hint">Tap to flip</span>';
    }

    return head +
      '<div class="flashcard' + (state.flipped ? ' is-flipped' : '') + '" data-act="flip"' +
        ' role="button" tabindex="0" aria-pressed="' + state.flipped + '"' +
        ' aria-label="Flashcard. Activate to flip.">' + face + '</div>' +
      '<div class="verdict-grid">' +
        '<button class="btn-learning" type="button" data-act="markLearning">Still learning</button>' +
        '<button class="btn-got" type="button" data-act="markGot">Got it</button>' +
      '</div>' +
      '<div class="nudge-row">' +
        '<button class="btn-quiet" type="button" data-act="prevCard"' +
          (state.idx === 0 ? ' disabled' : '') + '>&larr; Back</button>' +
        '<button class="btn-quiet" type="button" data-act="skipCard">Skip &rarr;</button>' +
      '</div>';
  }

  // Link to the handbook chapter that covers this question's topic.
  function viewChapterLink(cat) {
    var ch = CHAPTER[cat] || CHAPTER.rules;
    return '<a class="ref-inline" href="' + ch.url + '" target="_blank" rel="noopener noreferrer">' +
           'Look it up in ' + esc(ch.label) + ' &#8599;</a>';
  }

  function viewOptions(item, classify, action) {
    return '<div class="options">' + item.o.map(function (text, i) {
      return '<button class="option ' + classify(i) + '" type="button" data-act="' + action +
             '" data-i="' + i + '">' +
             '<span class="option-letter" aria-hidden="true">' + LETTERS[i] + '</span>' +
             '<span class="option-text">' + esc(text) + '</span></button>';
    }).join('') + '</div>';
  }

  function viewPrompt(item) {
    return '<div class="prompt">' +
      signImage(item, 'is-question') +
      '<p class="prompt-q">' + esc(item.q) + '</p></div>';
  }

  function viewPractice() {
    var item = state.deck[state.idx];
    if (!item) return viewTopBar('Practice', '', '0%');

    var answered = state.chosen !== null;
    var head = viewTopBar(
      'Practice · ' + topicName(state.topic),
      state.answered ? state.correctCount + '/' + state.answered : '',
      pct(state.idx, state.deck.length)
    );

    var options = viewOptions(item, function (i) {
      if (!answered) return '';
      if (i === item.a) return 'is-correct';
      if (i === state.chosen) return 'is-wrong';
      return 'is-dimmed';
    }, 'choosePractice');

    var feedback = '';
    if (answered) {
      var ok = state.chosen === item.a;
      feedback =
        '<div class="feedback' + (ok ? ' is-correct' : '') + '" role="status">' +
          '<div class="feedback-text">' +
            '<span class="feedback-title">' +
              (ok ? (state.streak >= 3 ? 'Correct! ' + state.streak + ' in a row' : 'Correct!') : 'Not quite') +
            '</span>' +
            '<span class="feedback-detail">' +
              (ok ? 'Nice one.' : 'Answer: ' + LETTERS[item.a] + '. ' + esc(item.o[item.a])) +
            '</span>' +
            viewChapterLink(item.cat) +
          '</div>' +
          '<button class="btn-next" type="button" data-act="nextPractice">Next &rarr;</button>' +
        '</div>';
    }

    return head + viewPrompt(item) + options + feedback;
  }

  function viewQuiz() {
    var quiz = state.quiz;
    var n = quiz.items.length;
    var item = quiz.items[state.idx];
    var pick = quiz.picks[state.idx];
    var last = state.idx === n - 1;

    var label = quiz.kind === 'mock'
      ? (item.cat === 'signs' ? 'Mock G1 · Signs' : 'Mock G1 · Rules')
      : 'Quick quiz · ' + topicName(state.topic);

    var head = viewTopBar(label, (state.idx + 1) + '/' + n, pct(state.idx + 1, n));

    var options = viewOptions(item, function (i) {
      return pick === i ? 'is-picked' : '';
    }, 'chooseQuiz');

    return head + viewPrompt(item) + options +
      '<div class="quiz-nav">' +
        '<button class="btn-prev" type="button" data-act="quizPrev"' +
          (state.idx === 0 ? ' disabled' : '') + ' aria-label="Previous question">&larr;</button>' +
        '<button class="btn-advance" type="button" data-act="quizNext"' +
          (pick === null ? ' disabled' : '') + '>' +
          (last ? 'Finish &amp; see score' : 'Next &rarr;') + '</button>' +
      '</div>';
  }

  function viewResults() {
    var r = state.results;
    var card, parts = '';

    if (r.kind === 'mock') {
      var pass = r.signs >= CONFIG.mockPassMark && r.rules >= CONFIG.mockPassMark;
      card =
        '<div class="scorecard ' + (pass ? 'is-pass' : 'is-fail') + '">' +
          '<span class="score-kicker">' + (pass ? 'You passed' : 'Not yet') + '</span>' +
          '<span class="score-value">' + r.total + '/40</span>' +
          '<span class="score-line">' +
            (pass ? 'That would pass the real G1 test.' : 'Need 16/20 in both signs and rules.') +
          '</span>' +
        '</div>';

      parts = '<div class="part-grid">' + [['Signs', r.signs], ['Rules', r.rules]].map(function (p) {
        var ok = p[1] >= CONFIG.mockPassMark;
        return '<div class="part">' +
          '<span class="part-label">' + p[0] + '</span>' +
          '<span class="part-score">' + p[1] + '/20</span>' +
          '<span class="part-status' + (ok ? ' is-pass' : '') + '">' +
            (ok ? 'Pass' : 'Below 16') + '</span></div>';
      }).join('') + '</div>';
    } else {
      var ratio = r.total / r.n;
      card =
        '<div class="scorecard' + (ratio >= 0.8 ? ' is-pass' : '') + '">' +
          '<span class="score-kicker">Quick quiz</span>' +
          '<span class="score-value">' + r.total + '/' + r.n + '</span>' +
          '<span class="score-line">' +
            (ratio >= 0.8 ? 'Great work.' : 'Keep going. Missed ones are saved for review.') +
          '</span>' +
        '</div>';
    }

    var review = '';
    if (r.wrong.length) {
      review =
        '<h2 class="eyebrow" style="margin-top:6px">Review your misses</h2>' +
        '<div class="review-list">' + r.wrong.map(function (w) {
          return '<div class="miss">' +
            (w.img ? '<img class="sign-img is-thumb" src="' + esc(w.img) +
                     '" alt="Road sign from the question you missed">' : '') +
            '<div class="miss-body">' +
              '<span class="miss-q">' + esc(w.q) + '</span>' +
              '<span class="miss-yours">&#10005; ' + esc(w.yours) + '</span>' +
              '<span class="miss-correct">&#10003; ' + esc(w.correct) + '</span>' +
            '</div></div>';
        }).join('') + '</div>' +
        '<p class="ref-footnote">Look these up in the ' +
          '<a href="' + HANDBOOK + '" target="_blank" rel="noopener noreferrer">' +
          'Official MTO Driver&rsquo;s Handbook</a>.</p>';
    }

    return card + parts +
      '<div class="result-actions">' +
        '<button class="btn-neutral" type="button" data-act="goHome">Home</button>' +
        '<button class="btn-primary" type="button" data-act="retryQuiz">Try again</button>' +
      '</div>' + review;
  }

  // -------------------------------------------------------------- render --

  var root = document.getElementById('app');
  var lastScreen = null;

  function render() {
    if (!state.data.length) {
      root.innerHTML = '<div class="loading">Loading questions&hellip;</div>';
      return;
    }

    var html;
    switch (state.screen) {
      case 'flash':    html = viewFlash(); break;
      case 'practice': html = viewPractice(); break;
      case 'quiz':     html = viewQuiz(); break;
      case 'results':  html = viewResults(); break;
      default:         html = viewHome();
    }
    root.innerHTML = html;

    if (state.screen !== lastScreen) {
      window.scrollTo(0, 0);
      lastScreen = state.screen;
    }
  }

  function dispatch(event) {
    var el = event.target.closest('[data-act]');
    if (!el || el.disabled) return;
    var fn = actions[el.getAttribute('data-act')];
    if (fn) fn(el);
  }

  root.addEventListener('click', dispatch);

  // The flashcard is a div with role="button", so wire up the keyboard itself.
  root.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    var el = event.target.closest('[data-act="flip"]');
    if (!el) return;
    event.preventDefault();
    actions.flip(el);
  });

  render();
})();
