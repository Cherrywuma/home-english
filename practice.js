(function() {
  const core = window.HomeEnglishPracticeCore;
  const app = window.HomeEnglishApp;
  if (!core || !app) return;

  const SESSION_KEY = 'homeEnglishPracticeSession';
  const WRONG_IDS_KEY = 'homeEnglishPracticeWrongIds';
  const sizes = [10, 30, 50];
  const practiceSection = document.createElement('section');
  practiceSection.id = 'practicePanel';
  practiceSection.style.display = 'none';
  app.content.parentNode.insertBefore(practiceSection, app.content);

  let session = loadSession();
  let recognition = null;
  let listening = false;
  let submitGuard = core.createSubmitGuard();
  let answerTimer = null;

  const practiceChip = app.chip('复习测试', '#7E7BB5', showPracticeHome);
  app.chipsBox.insertBefore(practiceChip, app.chipsBox.children[1] || null);
  const practiceLaunch = document.getElementById('practiceLaunch');
  if (practiceLaunch) practiceLaunch.onclick = showPracticeHome;

  const originalFilterCat = window.filterCat;
  window.filterCat = function(ci) {
    exitPracticeMode();
    originalFilterCat(ci);
  };

  window.addEventListener('beforeunload', stopPracticeActivity);

  function flattenSentences() {
    const rows = [];
    app.DATA.forEach((cat, catIndex) => {
      cat.subs.forEach((sub, subIndex) => {
        sub.items.forEach((item, itemIndex) => {
          rows.push({
            id: `${catIndex}-${subIndex}-${itemIndex}`,
            en: item[0],
            zh: item[1],
            catIndex,
            catName: cat.name,
            subName: sub.name
          });
        });
      });
    });
    return rows;
  }

  const sentenceList = flattenSentences();
  const sentenceMap = new Map(sentenceList.map(item => [item.id, item]));

  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function saveSession() {
    if (!session) return;
    session.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (error) {}
  }

  function clearSession() {
    session = null;
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (error) {}
  }

  function getWrongIds() {
    try {
      return JSON.parse(localStorage.getItem(WRONG_IDS_KEY) || '[]');
    } catch (error) {
      return [];
    }
  }

  function addWrongId(id) {
    const ids = new Set(getWrongIds());
    ids.add(id);
    try {
      localStorage.setItem(WRONG_IDS_KEY, JSON.stringify([...ids]));
    } catch (error) {}
  }

  function activatePracticeChip() {
    document.querySelectorAll('.chip').forEach(item => item.classList.remove('active'));
    practiceChip.classList.add('active');
  }

  function showPracticeOnly() {
    stopPracticeActivity();
    clearTimeout(answerTimer);
    answerTimer = null;
    app.content.style.display = 'none';
    practiceSection.style.display = '';
    activatePracticeChip();
    document.getElementById('q').value = '';
    document.getElementById('lookup').style.display = 'none';
    window.scrollTo({ top: practiceSection.offsetTop - 10, behavior: 'smooth' });
  }

  function exitPracticeMode() {
    stopPracticeActivity();
    practiceSection.style.display = 'none';
    app.content.style.display = '';
  }

  function stopPracticeActivity() {
    if (answerTimer) {
      clearTimeout(answerTimer);
      answerTimer = null;
    }
    if (recognition) {
      try {
        recognition.stop();
      } catch (error) {}
    }
    recognition = null;
    listening = false;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  function categoryOptions(selected) {
    return [
      `<option value="all"${selected === 'all' ? ' selected' : ''}>全部</option>`,
      ...app.DATA.map((cat, index) => (
        `<option value="${index}"${String(selected) === String(index) ? ' selected' : ''}>${cat.name}</option>`
      ))
    ].join('');
  }

  function sizeOptions(selected) {
    return sizes.map(size => `<option value="${size}"${Number(selected) === size ? ' selected' : ''}>${size}句</option>`).join('');
  }

  function orderOptions(selected) {
    return [
      `<option value="ordered"${selected === 'ordered' ? ' selected' : ''}>按顺序</option>`,
      `<option value="random"${selected === 'random' ? ' selected' : ''}>随机抽题</option>`
    ].join('');
  }

  function getPool(category) {
    return sentenceList.filter(item => category === 'all' || String(item.catIndex) === String(category));
  }

  function startSession(mode, ids, category, count, order) {
    stopPracticeActivity();
    session = {
      sessionId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      mode,
      category,
      count,
      order,
      sentenceIds: ids,
      currentIndex: 0,
      round: 1,
      roundReviewIds: [],
      roundWrongIds: [],
      currentHadWrong: false,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    submitGuard = core.createSubmitGuard();
    saveSession();
    renderCurrentQuestion();
  }

  function showPracticeHome() {
    showPracticeOnly();
    const hasSession = session && session.sentenceIds && session.currentIndex < session.sentenceIds.length;
    const wrongIds = getWrongIds().filter(id => sentenceMap.has(id));
    practiceSection.innerHTML = `
      <div class="practice-home">
        <div class="practice-head">
          <h2>复习测试</h2>
          <p>今天想怎么练？</p>
        </div>
        ${hasSession ? `
          <div class="practice-resume">
            <div>
              <strong>继续上次测试</strong>
              <span>${modeLabel(session.mode)} · ${session.currentIndex + 1} / ${session.sentenceIds.length}</span>
            </div>
            <div class="practice-actions">
              <button class="practice-btn primary" data-action="resume">继续</button>
              <button class="practice-btn ghost" data-action="restart">重新开始</button>
            </div>
          </div>
        ` : ''}
        <div class="practice-setup">
          <label>题目数量
            <select id="practiceSize">${sizeOptions(30)}</select>
          </label>
          <label>分类
            <select id="practiceCategory">${categoryOptions('all')}</select>
          </label>
          <label>出题顺序
            <select id="practiceOrder">${orderOptions('ordered')}</select>
          </label>
        </div>
        <div class="practice-mode-grid">
          <button class="practice-mode" data-mode="speaking">
            <span class="practice-icon">🎤</span>
            <strong>口语自测</strong>
            <span>看中文，自己说英文，再查看标准表达。</span>
          </button>
          <button class="practice-mode" data-mode="typing">
            <span class="practice-icon">⌨️</span>
            <strong>输入检测</strong>
            <span>看中文，输入或说出英文，系统检查答案。</span>
          </button>
        </div>
        ${wrongIds.length ? `<button class="practice-wrong" data-action="wrong">专练错题 · ${wrongIds.length}句</button>` : ''}
      </div>`;

    practiceSection.querySelectorAll('[data-mode]').forEach(button => {
      button.onclick = () => {
        const category = practiceSection.querySelector('#practiceCategory').value;
        const count = Number(practiceSection.querySelector('#practiceSize').value);
        const order = practiceSection.querySelector('#practiceOrder').value;
        const pool = getPool(category);
        const ids = core.createQuestionIds(pool, order, count);
        startSession(button.dataset.mode, ids, category, count, order);
      };
    });
    const resume = practiceSection.querySelector('[data-action="resume"]');
    if (resume) resume.onclick = renderCurrentQuestion;
    const restart = practiceSection.querySelector('[data-action="restart"]');
    if (restart) restart.onclick = () => {
      clearSession();
      showPracticeHome();
    };
    const wrong = practiceSection.querySelector('[data-action="wrong"]');
    if (wrong) wrong.onclick = () => startSession('typing', wrongIds, 'wrong', wrongIds.length, 'ordered');
  }

  function modeLabel(mode) {
    return mode === 'speaking' ? '口语自测' : '输入检测';
  }

  function currentSentence() {
    if (!session) return null;
    return sentenceMap.get(session.sentenceIds[session.currentIndex]);
  }

  function renderCurrentQuestion() {
    if (!session) {
      showPracticeHome();
      return;
    }
    showPracticeOnly();
    if (session.currentIndex >= session.sentenceIds.length) {
      renderRoundComplete();
      return;
    }
    submitGuard.done();
    const item = currentSentence();
    if (!item) {
      advanceQuestion();
      return;
    }
    if (session.mode === 'speaking') renderSpeakingQuestion(item);
    else renderTypingQuestion(item);
    saveSession();
  }

  function questionShell(item, body) {
    return `
      <div class="practice-card">
        <div class="practice-top">
          <button class="practice-back" data-action="home">‹ 复习测试</button>
          <span>${session.currentIndex + 1} / ${session.sentenceIds.length}</span>
        </div>
        <div class="practice-meta">${item.catName} · ${item.subName}</div>
        <div class="practice-zh">${item.zh}</div>
        ${body}
      </div>`;
  }

  function bindBackButton() {
    const back = practiceSection.querySelector('[data-action="home"]');
    if (back) back.onclick = showPracticeHome;
  }

  function renderSpeakingQuestion(item) {
    practiceSection.innerHTML = questionShell(item, `
      <p class="practice-tip">先自己说出英文。</p>
      <div class="practice-answer" id="speakingAnswer" hidden>
        <div class="practice-en">${item.en}</div>
        <div class="practice-actions">
          <button class="practice-btn primary" data-action="speak">🔊 标准朗读</button>
          <button class="practice-btn ghost" data-action="slow">🐢 慢速朗读</button>
        </div>
        <div class="practice-actions">
          <button class="practice-btn ghost" data-action="again">🔁 再练一次</button>
          <button class="practice-btn primary" data-action="next">✅ 下一句</button>
        </div>
      </div>
      <button class="practice-btn primary wide" data-action="reveal">查看标准英文</button>
    `);
    bindBackButton();
    practiceSection.querySelector('[data-action="reveal"]').onclick = event => {
      event.currentTarget.hidden = true;
      practiceSection.querySelector('#speakingAnswer').hidden = false;
    };
    practiceSection.querySelector('[data-action="speak"]').onclick = () => speakPractice(item.en, 0.9);
    practiceSection.querySelector('[data-action="slow"]').onclick = () => speakPractice(item.en, 0.65);
    practiceSection.querySelector('[data-action="again"]').onclick = () => {
      if (!session.roundReviewIds.includes(item.id)) session.roundReviewIds.push(item.id);
      advanceQuestion();
    };
    practiceSection.querySelector('[data-action="next"]').onclick = advanceQuestion;
  }

  function renderTypingQuestion(item) {
    const supportsSpeech = Boolean(core.getSpeechRecognitionConstructor(window));
    session.currentHadWrong = false;
    practiceSection.innerHTML = questionShell(item, `
      <label class="practice-input-label" for="practiceAnswer">输入完整英文</label>
      <textarea id="practiceAnswer" class="practice-input" rows="3" autocomplete="off" autocapitalize="sentences" spellcheck="false" placeholder="输入完整英文"></textarea>
      <div class="practice-actions">
        ${supportsSpeech ? '<button class="practice-btn ghost" data-action="mic">🎤 说英文</button>' : '<span class="practice-fallback">当前浏览器暂不支持语音输入，请直接输入英文。</span>'}
        <button class="practice-btn primary" data-action="check">检查答案</button>
      </div>
      <div id="practiceFeedback" class="practice-feedback" aria-live="polite"></div>
    `);
    bindBackButton();
    const input = practiceSection.querySelector('#practiceAnswer');
    const feedback = practiceSection.querySelector('#practiceFeedback');
    const check = practiceSection.querySelector('[data-action="check"]');
    const mic = practiceSection.querySelector('[data-action="mic"]');
    check.onclick = () => checkTypingAnswer(item, input, feedback);
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey && !isSmallScreen()) {
        event.preventDefault();
        checkTypingAnswer(item, input, feedback);
      }
    });
    if (mic) mic.onclick = () => startSpeechInput(input, feedback, mic);
  }

  function isSmallScreen() {
    return window.matchMedia('(max-width: 640px)').matches;
  }

  function checkTypingAnswer(item, input, feedback) {
    if (!submitGuard.tryStart()) return;
    const answer = input.value.trim();
    if (!answer) {
      feedback.innerHTML = '<div class="practice-warning">请先输入英文。</div>';
      submitGuard.done();
      return;
    }
    if (core.isAnswerCorrect(answer, item.en)) {
      feedback.innerHTML = '<div class="practice-correct">✅ 正确</div>';
      stopPracticeActivity();
      answerTimer = setTimeout(() => {
        answerTimer = null;
        submitGuard.done();
        advanceQuestion();
      }, 650);
      return;
    }
    if (!session.roundWrongIds.includes(item.id)) session.roundWrongIds.push(item.id);
    addWrongId(item.id);
    session.currentHadWrong = true;
    saveSession();
    const diff = core.compareWords(answer, item.en);
    feedback.innerHTML = `
      <div class="practice-warning">⚠️ 还不完全正确</div>
      <div class="practice-small"><b>你的答案：</b>${escapeHtml(answer)}</div>
      <div class="practice-small"><b>标准英文：</b>${escapeHtml(item.en)}</div>
      ${diffList('缺少', diff.missing)}
      ${diffList('多出', diff.extra)}
      ${typoList(diff.typos)}
      <div class="practice-actions">
        <button class="practice-btn ghost" data-action="speak">🔊 标准朗读</button>
        <button class="practice-btn ghost" data-action="slow">🐢 慢速朗读</button>
        <button class="practice-btn primary" data-action="retry">重新回答</button>
      </div>
    `;
    feedback.querySelector('[data-action="speak"]').onclick = () => speakPractice(item.en, 0.9);
    feedback.querySelector('[data-action="slow"]').onclick = () => speakPractice(item.en, 0.65);
    feedback.querySelector('[data-action="retry"]').onclick = () => {
      input.focus();
      feedback.innerHTML = '';
    };
    submitGuard.done();
  }

  function diffList(label, words) {
    if (!words || !words.length) return '';
    return `<div class="practice-small"><b>${label}：</b>${words.map(escapeHtml).join('、')}</div>`;
  }

  function typoList(typos) {
    if (!typos || !typos.length) return '';
    return `<div class="practice-small"><b>可能拼错：</b>${typos.map(item => `${escapeHtml(item.from)} → ${escapeHtml(item.to)}`).join('、')}</div>`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function speakPractice(text, speakRate) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const utter = app.makeUtter(text);
    utter.rate = speakRate;
    speechSynthesis.speak(utter);
  }

  function startSpeechInput(input, feedback, button) {
    const Recognition = core.getSpeechRecognitionConstructor(window);
    if (!Recognition || listening) return;
    recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    listening = true;
    button.classList.add('listening');
    button.textContent = '正在听……';
    feedback.innerHTML = '<div class="practice-small">正在听……</div>';
    recognition.onresult = event => {
      const transcript = event.results && event.results[0] && event.results[0][0]
        ? event.results[0][0].transcript
        : '';
      const result = core.applySpeechTranscript(input.value, transcript);
      if (result.hasTranscript) {
        input.value = result.value;
        feedback.innerHTML = '<div class="practice-small">已识别文字，可以先修改，再检查答案。</div>';
      } else {
        feedback.innerHTML = '<div class="practice-warning">没有识别到英文，请再试一次或直接输入。</div>';
      }
    };
    recognition.onerror = () => {
      feedback.innerHTML = '<div class="practice-warning">语音输入已停止，请直接输入或再试一次。</div>';
    };
    recognition.onend = () => {
      listening = false;
      recognition = null;
      button.classList.remove('listening');
      button.textContent = '🎤 说英文';
    };
    try {
      recognition.start();
    } catch (error) {
      listening = false;
      recognition = null;
      button.classList.remove('listening');
      button.textContent = '🎤 说英文';
    }
  }

  function advanceQuestion() {
    stopPracticeActivity();
    session.currentIndex += 1;
    session.currentHadWrong = false;
    saveSession();
    renderCurrentQuestion();
  }

  function startReviewRound(ids) {
    session.sentenceIds = ids;
    session.currentIndex = 0;
    session.round += 1;
    session.roundReviewIds = [];
    session.roundWrongIds = [];
    session.currentHadWrong = false;
    saveSession();
    renderCurrentQuestion();
  }

  function renderRoundComplete() {
    stopPracticeActivity();
    const reviewIds = [...new Set(session.mode === 'speaking' ? session.roundReviewIds : session.roundWrongIds)];
    const total = session.sentenceIds.length;
    const firstCorrect = Math.max(0, total - reviewIds.length);
    const title = session.mode === 'speaking'
      ? '本轮完成'
      : (reviewIds.length ? '本轮完成' : '本轮测试完成');
    const summary = session.mode === 'speaking'
      ? (reviewIds.length ? `还有 ${reviewIds.length} 句需要再练。` : '全部通过。')
      : (reviewIds.length
        ? `✅ 一次正确：${firstCorrect}句<br>🔁 修改后正确：${reviewIds.length}句<br>还有 ${reviewIds.length} 句需要继续练习。`
        : '全部通过。');

    practiceSection.innerHTML = `
      <div class="practice-complete">
        <h2>${title}</h2>
        <p>${summary}</p>
        <div class="practice-actions">
          ${reviewIds.length ? `<button class="practice-btn primary" data-action="review">${session.mode === 'speaking' ? `再练这 ${reviewIds.length} 句` : '再练错题'}</button>` : ''}
          <button class="practice-btn ghost" data-action="home">返回复习测试</button>
        </div>
      </div>`;
    const review = practiceSection.querySelector('[data-action="review"]');
    if (review) review.onclick = () => startReviewRound(reviewIds);
    practiceSection.querySelector('[data-action="home"]').onclick = () => {
      clearSession();
      showPracticeHome();
    };
    saveSession();
  }
})();
