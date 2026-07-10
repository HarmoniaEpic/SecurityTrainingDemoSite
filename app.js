(function () {
  "use strict";

  var CANS = [
    { id: "mail",
      img: "images/mail.jpg",
      url: "https://ja.wikipedia.org/wiki/スパム_(メール)",
      title: "また届きました",
      body: "誰も頼んでいない封筒の山です。" },
    { id: "seo",
      img: "images/seo.jpg",
      url: "https://ja.wikipedia.org/wiki/検索エンジンスパム",
      title: "堂々の第一位（自称）",
      body: "BEST BEST No.1 … と自分で連呼しています。" },
    { id: "phishing",
      img: "images/phishing.jpg",
      url: "https://ja.wikipedia.org/wiki/フィッシング_(詐欺)",
      title: "絶対に罠じゃないです",
      body: "この付け髭を、どうか信じてください。" },
    { id: "stealth",
      img: "images/stealth.jpg",
      url: "https://ja.wikipedia.org/wiki/ステルスマーケティング",
      title: "これは宣伝ではありません",
      body: "みんな大好きだそうです（自称）。" },
    { id: "support-scam",
      img: "images/support-scam.jpg",
      url: "https://www.ipa.go.jp/security/anshin/measures/fakealert.html",
      title: "警告！ 缶が感染しました",
      body: "あわてないで。相手はあなたに焦ってほしいのです。" },
    { id: "notification",
      img: "images/notification.jpg",
      url: "https://www.ipa.go.jp/security/anshin/attention/2021/mgdayori20210309.html",
      title: "DING! DING! DING!",
      body: "あなたが今練習しているものです。止め方が分かりにくいので、しっかり確認しましょう。" }
  ];

  var INTERVAL_FIXED = 10000;
  var INTERVAL_MIN = 5000;
  var INTERVAL_MAX = 15000;
  var MAX = 30;

  var BGM_VOL = 0.35;
  var POPUP_VOL = 0.85;
  var ENDING_VOL = 0.55;

  var startFixedBtn = document.getElementById("start-fixed");
  var startRandomBtn = document.getElementById("start-random");
  var stopBtn = document.getElementById("stop");
  var statusEl = document.getElementById("status");
  var audioBtn = document.getElementById("bgm-toggle");

  var timer = null;
  var count = 0;
  var swReg = null;
  var mode = "fixed"; // "fixed" or "random"

  function absUrl(path) { return new URL(path, window.location.href).href; }
  function setStatus(msg) { statusEl.textContent = msg; }

  function setStartButtonsDisabled(disabled) {
    startFixedBtn.disabled = disabled;
    startRandomBtn.disabled = disabled;
  }

  function randomDelay() {
    // INTERVAL_MIN〜INTERVAL_MAXを一秒刻みでランダム
    var steps = (INTERVAL_MAX - INTERVAL_MIN) / 1000 + 1;
    return Math.floor(Math.random() * steps) * 1000 + INTERVAL_MIN;
  }

  function nextDelay() {
    return mode === "random" ? randomDelay() : INTERVAL_FIXED;
  }

  // ---------- 音まわり ----------
  var bgm = new Audio(absUrl("audio/bgm.mp3"));
  bgm.loop = true;
  bgm.volume = BGM_VOL;
  bgm.preload = "auto";

  var ending = new Audio(absUrl("audio/ending.mp3"));
  ending.loop = false;
  ending.volume = ENDING_VOL;
  ending.preload = "auto";

  var gameover = new Audio(absUrl("audio/gameover.mp3"));
  gameover.loop = false;
  gameover.volume = 0.7;
  gameover.preload = "auto";

  var popupA = new Audio(absUrl("audio/popup.mp3"));
  var popupB = new Audio(absUrl("audio/popup.mp3"));
  popupA.preload = "auto";
  popupB.preload = "auto";
  var popupUseB = false;

  var fades = new Map();
  var audioOn = true;
  var audioUnlocked = false;
  var endingPlaying = false;

  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    [popupA, popupB].forEach(function (a) {
      var p = a.play();
      if (p && p.then) {
        p.then(function () { a.pause(); a.currentTime = 0; }).catch(function () {});
      }
    });
  }

  function cancelFade(audio) {
    if (fades.has(audio)) { clearInterval(fades.get(audio)); fades.delete(audio); }
  }

  function fadeOut(audio, speed) {
    var step = speed || 0.12;
    cancelFade(audio);
    var iv = setInterval(function () {
      audio.volume = Math.max(0, audio.volume - step);
      if (audio.volume <= 0.001) {
        cancelFade(audio);
        audio.pause();
      }
    }, 40);
    fades.set(audio, iv);
  }

  function playPopup() {
    if (!audioOn) return;

    var next = popupUseB ? popupB : popupA;
    var prev = popupUseB ? popupA : popupB;
    popupUseB = !popupUseB;

    if (!prev.paused) fadeOut(prev);

    cancelFade(next);
    try {
      next.currentTime = 0;
      next.volume = POPUP_VOL;
      var p = next.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }

  function playEnding() {
    endingPlaying = true;
    ending.currentTime = 0;
    ending.volume = audioOn ? ENDING_VOL : 0;
    var p = ending.play();
    if (p && p.catch) p.catch(function () {});
  }

  function updateAudioButton() {
    if (!audioBtn) return;
    audioBtn.setAttribute("aria-pressed", audioOn ? "true" : "false");
    audioBtn.classList.toggle("is-on", audioOn);
    var label = audioBtn.querySelector(".bgm-toggle__label");
    if (label) label.textContent = audioOn ? "音を止める" : "音を流す";
  }

  function toggleAudio() {
    unlockAudio();
    audioOn = !audioOn;
    if (audioOn) {
      if (!document.hidden && !endingPlaying) {
        bgm.volume = BGM_VOL;
        var p = bgm.play();
        if (p && p.catch) p.catch(function () {});
      }
      if (endingPlaying && !ending.paused) {
        ending.volume = ENDING_VOL;
      }
    } else {
      bgm.pause();
      if (!popupA.paused) { cancelFade(popupA); popupA.pause(); }
      if (!popupB.paused) { cancelFade(popupB); popupB.pause(); }
      if (endingPlaying && !ending.paused) {
        ending.volume = 0;
      }
    }
    updateAudioButton();

    // 音を止めたときだけオーバーレイを出す
    if (!audioOn) showTrapOverlay();
  }

  // ---------- トラップ警告オーバーレイ ----------
  var trapOverlay = document.getElementById("trap-overlay");
  var trapCloseBtn = trapOverlay ? trapOverlay.querySelector(".trap-overlay__close") : null;

  function showTrapOverlay() {
    if (!trapOverlay) return;
    trapOverlay.hidden = false;
    // 裏のページをキーボード・スクリーンリーダーからも操作不能にする
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el !== trapOverlay) el.setAttribute("inert", "");
    });
    if (trapCloseBtn) trapCloseBtn.focus();
    // 音を止めたくて押したのにゲームオーバー音が鳴る
    try {
      gameover.currentTime = 0;
      gameover.volume = 0.7;
      var p = gameover.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }

  function hideTrapOverlay() {
    if (!trapOverlay) return;
    trapOverlay.hidden = true;
    Array.prototype.forEach.call(document.body.children, function (el) {
      el.removeAttribute("inert");
    });
  }

  if (trapCloseBtn) {
    trapCloseBtn.addEventListener("click", hideTrapOverlay);
  }

  // ---------- 通知スケジュール ----------
  function scheduleNext() {
    var delay = nextDelay();
    timer = window.setTimeout(function () {
      fireOne();
      if (timer !== null) {
        scheduleNext();
      }
    }, delay);
  }

  // ---------- 通知まわり ----------
  function highlight(id) {
    document.querySelectorAll(".can").forEach(function (el) { el.classList.remove("is-active"); });
    var card = document.getElementById("card-" + id);
    if (card) card.classList.add("is-active");
  }

  async function fireOne() {
    var can = CANS[count % CANS.length];
    count += 1;

    playPopup();

    if (swReg && Notification.permission === "granted") {
      try {
        await swReg.showNotification(can.title, {
          body: can.body,
          icon: absUrl(can.img),
          image: absUrl(can.img),
          tag: "can-" + can.id,
          renotify: true,
          requireInteraction: false,
          data: { url: can.url }
        });
      } catch (err) {
        console.warn("通知の表示に失敗:", err);
      }
    }

    highlight(can.id);
    setStatus("通知中：" + count + " 回目。突然の通知に焦っていませんか？");

    if (count >= MAX) stop("done");
  }

  async function start(selectedMode) {
    if (startFixedBtn.disabled) return; // 二度押し防止
    setStartButtonsDisabled(true);

    mode = selectedMode;
    unlockAudio();

    // エンディングが鳴っていたら止める
    if (!ending.paused) {
      ending.pause();
      ending.currentTime = 0;
      endingPlaying = false;
    }

    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStartButtonsDisabled(false);
      setStatus("この環境では通知を出せません。下の棚の缶から解説をご覧ください。");
      return;
    }

    var perm = Notification.permission;
    if (perm === "default") {
      perm = await Notification.requestPermission();
    }
    if (perm !== "granted") {
      setStartButtonsDisabled(false);
      setStatus("通知が許可されませんでした。下の棚の缶から解説をご覧ください。");
      return;
    }

    try {
      swReg = await navigator.serviceWorker.ready;
    } catch (err) {
      setStartButtonsDisabled(false);
      setStatus("通知の下準備ができませんでした。棚の缶から解説をご覧ください。");
      return;
    }

    // BGM を先に流す（音が ON なら）
    if (audioOn && bgm.paused) {
      bgm.volume = BGM_VOL;
      var p = bgm.play();
      if (p && p.catch) p.catch(function () {});
    }

    count = 0;
    stopBtn.disabled = false;
    document.body.classList.add("is-running");

    if (mode === "random") {
      setStatus("数秒後に最初の通知が届きます…いつ届くかは分かりません。");
    } else {
      setStatus("10秒後に最初の通知が届きます…");
    }

    // 最初の通知も含め、scheduleNext で間隔を決めて出す
    scheduleNext();
  }

  function stop(reason) {
    clearTimeout(timer);
    timer = null;
    setStartButtonsDisabled(false);
    stopBtn.disabled = true;
    document.body.classList.remove("is-running");
    document.querySelectorAll(".can").forEach(function (el) { el.classList.remove("is-active"); });

    // 通知音を引き取る
    if (!popupA.paused) fadeOut(popupA);
    if (!popupB.paused) fadeOut(popupB);

    // BGM をフェードアウト
    if (!bgm.paused) fadeOut(bgm, 0.04);

    // エンディング曲を流す
    playEnding();

    // エンディングが終わった後、BGM が ON のままなら再開する
    ending.onended = function () {
      endingPlaying = false;
      if (audioOn && !document.hidden) {
        bgm.volume = BGM_VOL;
        var p = bgm.play();
        if (p && p.catch) p.catch(function () {});
      }
    };

    var intro = (reason === "done")
      ? "予定の回数通知したので終了です（" + count + "回）。"
      : "止めました（" + count + "回）。";
    setStatus(intro + "実際の通知スパムは居座り続けますし、もっと頻繁に届きます。あなたを焦らせたいので。そのうえ、困ったことに通知はどこを触ってもクリック扱いなのです。閉じようとして触れただけで、フィッシングサイトやマルウェアのダウンロードページに直行します。このサイトでは安全な解説ページに飛びましたが、本物の行き先はそうではありません。あわてず終えられましたか？");
  }

  startFixedBtn.addEventListener("click", function () { start("fixed"); });
  startRandomBtn.addEventListener("click", function () { start("random"); });
  stopBtn.addEventListener("click", function () { stop("manual"); });
  if (audioBtn) audioBtn.addEventListener("click", toggleAudio);

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      bgm.pause();
      if (endingPlaying) ending.pause();
    } else {
      if (audioOn && !endingPlaying) {
        bgm.volume = BGM_VOL;
        var p = bgm.play();
        if (p && p.catch) p.catch(function () {});
      }
      if (endingPlaying) {
        var p2 = ending.play();
        if (p2 && p2.catch) p2.catch(function () {});
      }
    }
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(function (err) {
      console.warn("Service Worker 登録に失敗:", err);
      setStatus("この環境では通知の下準備ができませんでした。棚の缶から解説をご覧ください。");
    });
  } else {
    setStartButtonsDisabled(true);
    setStatus("この環境は通知に対応していません。下の棚の缶から解説をご覧ください。");
  }

  updateAudioButton();

})();
