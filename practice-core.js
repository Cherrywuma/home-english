(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HomeEnglishPracticeCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const CONTRACTIONS = [
    ["i'm", 'i am'],
    ["you're", 'you are'],
    ["he's", 'he is'],
    ["she's", 'she is'],
    ["it's", 'it is'],
    ["we're", 'we are'],
    ["they're", 'they are'],
    ["don't", 'do not'],
    ["doesn't", 'does not'],
    ["didn't", 'did not'],
    ["can't", 'cannot'],
    ["won't", 'will not'],
    ["isn't", 'is not'],
    ["aren't", 'are not'],
    ["wasn't", 'was not'],
    ["weren't", 'were not'],
    ["i've", 'i have'],
    ["you've", 'you have'],
    ["we've", 'we have'],
    ["they've", 'they have'],
    ["i'll", 'i will'],
    ["you'll", 'you will'],
    ["we'll", 'we will'],
    ["they'll", 'they will']
  ];

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function normalizeContractions(text) {
    let out = ` ${text} `;
    CONTRACTIONS.forEach(([shortForm, longForm]) => {
      out = out.replace(new RegExp(`\\b${escapeRegExp(shortForm)}\\b`, 'gi'), longForm);
    });
    return out.trim();
  }

  function normalizeAnswer(text) {
    return normalizeContractions(String(text || '')
      .replace(/[’‘`´]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[。．]/g, '.')
      .replace(/[？]/g, '?')
      .replace(/[！]/g, '!')
      .replace(/[，、]/g, ',')
      .trim()
      .toLowerCase())
      .replace(/[,;:]/g, ' ')
      .replace(/[.?!]+$/g, '')
      .replace(/["()[\]{}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokenize(text) {
    const normalized = normalizeAnswer(text);
    return normalized ? normalized.split(' ') : [];
  }

  function isAnswerCorrect(userAnswer, correctAnswer) {
    const user = normalizeAnswer(userAnswer);
    const correct = normalizeAnswer(correctAnswer);
    return Boolean(user) && user === correct;
  }

  function levenshteinDistance(a, b) {
    const left = String(a || '');
    const right = String(b || '');
    const dp = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));
    for (let i = 0; i <= left.length; i++) dp[i][0] = i;
    for (let j = 0; j <= right.length; j++) dp[0][j] = j;
    for (let i = 1; i <= left.length; i++) {
      for (let j = 1; j <= right.length; j++) {
        const cost = left[i - 1] === right[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[left.length][right.length];
  }

  function isLikelyTypo(extraWord, missingWord) {
    if (!extraWord || !missingWord || extraWord === missingWord) return false;
    if (Math.min(extraWord.length, missingWord.length) < 3) return false;
    const distance = levenshteinDistance(extraWord, missingWord);
    const longest = Math.max(extraWord.length, missingWord.length);
    if (distance <= 1) return true;
    return distance <= 2 && longest >= 6 && extraWord[0] === missingWord[0];
  }

  function lcsPairs(userWords, correctWords) {
    const dp = Array.from({ length: userWords.length + 1 }, () => Array(correctWords.length + 1).fill(0));
    for (let i = userWords.length - 1; i >= 0; i--) {
      for (let j = correctWords.length - 1; j >= 0; j--) {
        dp[i][j] = userWords[i] === correctWords[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    const pairs = [];
    let i = 0;
    let j = 0;
    while (i < userWords.length && j < correctWords.length) {
      if (userWords[i] === correctWords[j]) {
        pairs.push([i, j]);
        i++;
        j++;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        i++;
      } else {
        j++;
      }
    }
    return pairs;
  }

  function compareWords(userAnswer, correctAnswer) {
    const userWords = tokenize(userAnswer);
    const correctWords = tokenize(correctAnswer);
    const pairs = lcsPairs(userWords, correctWords);
    const matchedUser = new Set(pairs.map(pair => pair[0]));
    const matchedCorrect = new Set(pairs.map(pair => pair[1]));
    const extra = userWords.filter((_, index) => !matchedUser.has(index));
    const missing = correctWords.filter((_, index) => !matchedCorrect.has(index));
    const typos = [];
    const usedExtra = new Set();
    const usedMissing = new Set();

    missing.forEach((missingWord, missingIndex) => {
      let bestIndex = -1;
      let bestDistance = Infinity;
      extra.forEach((extraWord, extraIndex) => {
        if (usedExtra.has(extraIndex) || !isLikelyTypo(extraWord, missingWord)) return;
        const distance = levenshteinDistance(extraWord, missingWord);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = extraIndex;
        }
      });
      if (bestIndex >= 0) {
        usedMissing.add(missingIndex);
        usedExtra.add(bestIndex);
        typos.push({ from: extra[bestIndex], to: missingWord });
      }
    });

    return {
      missing: missing.filter((_, index) => !usedMissing.has(index)),
      extra: extra.filter((_, index) => !usedExtra.has(index)),
      typos
    };
  }

  function createSubmitGuard() {
    let busy = false;
    return {
      tryStart() {
        if (busy) return false;
        busy = true;
        return true;
      },
      done() {
        busy = false;
      }
    };
  }

  function applySpeechTranscript(currentValue, transcript) {
    const clean = String(transcript || '').trim();
    if (!clean) {
      return { value: currentValue, shouldSubmit: false, hasTranscript: false };
    }
    return { value: clean, shouldSubmit: false, hasTranscript: true };
  }

  function getSpeechRecognitionConstructor(scope) {
    const target = scope || {};
    return target.SpeechRecognition || target.webkitSpeechRecognition || null;
  }

  return {
    normalizeAnswer,
    normalizeContractions,
    compareWords,
    levenshteinDistance,
    isAnswerCorrect,
    createSubmitGuard,
    applySpeechTranscript,
    getSpeechRecognitionConstructor
  };
});
