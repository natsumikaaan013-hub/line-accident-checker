(function () {
  'use strict';

  const form = document.getElementById('diagnoseForm');
  const messageEl = document.getElementById('message');
  const messageCount = document.getElementById('message-count');
  const messageError = document.getElementById('message-error');
  const stageError = document.getElementById('stage-error');
  const generalError = document.getElementById('general-error');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');
  const toggleBtn = document.getElementById('toggleOptional');
  const optionalFields = document.getElementById('optionalFields');
  const resultArea = document.getElementById('resultArea');
  const retryBtn = document.getElementById('retryBtn');
  const copyBtn = document.getElementById('copyBtn');

  // ── 文字数カウンター ──────────────────────────
  messageEl.addEventListener('input', () => {
    const len = messageEl.value.length;
    messageCount.textContent = `${len} / 2000`;
    messageCount.className = 'char-count';
    if (len > 1800) messageCount.classList.add('near-limit');
    if (len >= 2000) messageCount.classList.add('at-limit');
  });

  // ── 任意項目トグル ────────────────────────────
  toggleBtn.addEventListener('click', () => {
    const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    toggleBtn.setAttribute('aria-expanded', String(!expanded));
    optionalFields.hidden = expanded;
  });

  // ── もう一度診断する ─────────────────────────
  retryBtn.addEventListener('click', () => {
    resultArea.hidden = true;
    form.scrollIntoView({ behavior: 'smooth' });
  });

  // ── コピーボタン ──────────────────────────────
  copyBtn.addEventListener('click', async () => {
    const text = document.getElementById('exampleText').textContent;
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = 'コピー済み';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = 'コピー';
        copyBtn.classList.remove('copied');
      }, 2000);
    } catch {
      copyBtn.textContent = '手動でコピーしてください';
      setTimeout(() => { copyBtn.textContent = 'コピー'; }, 2000);
    }
  });

  // ── フォーム送信 ──────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    clearErrors();

    const body = {
      message: messageEl.value.trim(),
      stage: form.querySelector('input[name="stage"]:checked')?.value,
      previousMessage: document.getElementById('previousMessage').value.trim() || undefined,
      intent: document.getElementById('intent').value || undefined,
      partnerName: document.getElementById('partnerName').value.trim() || undefined,
    };

    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '診断に失敗しました。時間をおいて再度お試しください');
      }

      renderResult(data);
      resultArea.hidden = false;
      resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      generalError.textContent = err.message || '診断に失敗しました。時間をおいて再度お試しください';
    } finally {
      setLoading(false);
    }
  });

  // ── バリデーション ────────────────────────────
  function validate() {
    clearErrors();
    let valid = true;

    const msg = messageEl.value.trim();
    if (msg.length < 10) {
      messageError.textContent = 'もう少し詳しい文面を入力してください';
      valid = false;
    } else if (msg.length > 2000) {
      messageError.textContent = 'LINE文面は2000文字以内で入力してください';
      valid = false;
    }

    if (!form.querySelector('input[name="stage"]:checked')) {
      stageError.textContent = '相手との段階を選択してください';
      valid = false;
    }

    return valid;
  }

  function clearErrors() {
    messageError.textContent = '';
    stageError.textContent = '';
    generalError.textContent = '';
  }

  // ── ローディング状態 ──────────────────────────
  function setLoading(loading) {
    submitBtn.disabled = loading;
    btnText.hidden = loading;
    btnLoading.hidden = !loading;
  }

  // ── 結果レンダリング ──────────────────────────
  function renderResult(data) {
    const rate = Math.max(5, Math.min(95, Math.round(data.accidentRate)));
    const { specificity, emotion, nextIntention } = data.scores;

    // 事故率
    const rateValueEl = document.getElementById('rateValue');
    rateValueEl.textContent = rate;
    rateValueEl.className = 'rate-value ' + getRateClass(rate);

    // レベルバッジ
    const badge = document.getElementById('levelBadge');
    badge.textContent = data.level;
    badge.style.color = getRateColor(rate);

    // スコア
    setScore('scoreSpecificity', 'barSpecificity', specificity);
    setScore('scoreEmotion', 'barEmotion', emotion);
    setScore('scoreNextIntention', 'barNextIntention', nextIntention);

    // コメント
    document.getElementById('commentText').textContent = data.comment;

    // 改善方向性
    document.getElementById('improveSpecificity').textContent = data.improvements.specificity;
    document.getElementById('improveEmotion').textContent = data.improvements.emotion;
    document.getElementById('improveNextIntention').textContent = data.improvements.nextIntention;

    // 例文
    document.getElementById('exampleText').textContent = data.improvedExample;
    copyBtn.textContent = 'コピー';
    copyBtn.classList.remove('copied');
  }

  function setScore(numId, barId, score) {
    const s = Math.max(0, Math.min(10, score));
    document.getElementById(numId).textContent = s;
    const bar = document.getElementById(barId);
    bar.style.width = `${s * 10}%`;
    bar.parentElement.setAttribute('aria-valuenow', s);
    bar.style.background = getScoreColor(s);
  }

  function getRateClass(rate) {
    if (rate <= 20) return 'rate-safe';
    if (rate <= 40) return 'rate-light';
    if (rate <= 60) return 'rate-mid';
    if (rate <= 80) return 'rate-high';
    return 'rate-danger';
  }

  function getRateColor(rate) {
    if (rate <= 20) return '#4ade80';
    if (rate <= 40) return '#a3e635';
    if (rate <= 60) return '#facc15';
    if (rate <= 80) return '#fb923c';
    return '#ef4444';
  }

  function getScoreColor(score) {
    if (score >= 8) return '#4ade80';
    if (score >= 6) return '#a3e635';
    if (score >= 4) return '#facc15';
    if (score >= 2) return '#fb923c';
    return '#ef4444';
  }
})();
