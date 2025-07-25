// ==UserScript==
// @name         冷养Bing全自动
// @namespace    cold_auto
// @match        https://www.bing.com/*
// @run-at       document-end
// ==/UserScript==

// 自动跳出 Bing 图片详情页保险
(function () {
  const params = new URLSearchParams(location.search);
  const isBingImageDetailPage =
    location.hostname === "www.bing.com" &&
    location.pathname === "/images/search" &&
    params.get("view") === "detailv2";
  if (isBingImageDetailPage) {
    window.location.href = "https://www.bing.com";
    return;
  }
})();

// 主体逻辑
window.COLDYANG = {
  run: async function(opts = {}) {
    const STORAGE_KEY = '__coldyang_task_state__';
    const LOG_KEY = '__coldyang_task_log__';
    const param = Object.assign({
      scrollTimes: 30,
      scrollInterval: 1500,
      minStay: 8,
      maxStay: 120,
    }, opts);

    function log(msg) { console.log(`[冷养] ${msg}`); }
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    async function waitForUrlContains(str, timeout=12000) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        if (location.href.includes(str)) return true;
        await sleep(250);
      }
      return false;
    }
    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
    function randomBetween(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    function saveState(obj) { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); }
    function loadState() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } }
    function clearState() { localStorage.removeItem(STORAGE_KEY); }
    function clearLogs() { localStorage.removeItem(LOG_KEY); }

    if (window.__coldyang_running__) return;
    window.__coldyang_running__ = true;
    window.__coldyang_stop__ = false;

    try {
      log("========【冷养自动化：断点续做版启动】========");
      let state = loadState();
      let queue = [];
      let curIdx = 0;
      if (state.queue && typeof state.curIdx === "number") {
        log(`检测到未完成任务，将从第${state.curIdx+1}个关键词继续`);
        queue = state.queue;
        curIdx = state.curIdx;
      } else {
        log("拉取关键词列表");
        let res = await fetch("https://raw.githubusercontent.com/YSYSYS66/Keyword/main/keywords.txt");
        let text = await res.text();
        let keywords = text.split("\n").map(x => x.trim()).filter(Boolean);
        keywords = shuffle(keywords).slice(0, 50);
        queue = keywords.map((kw, i) => ({ idx: i+1, keyword: kw }));
        curIdx = 0;
        saveState({ queue, curIdx });
        clearLogs();
        log("任务队列构建完成，准备执行");
      }

      for (let i = curIdx; i < queue.length; i++) {
        if (window.__coldyang_stop__) {
          log("检测到停止信号，终止任务");
          saveState({ queue, curIdx: i });
          window.__coldyang_running__ = false;
          return;
        }
        const task = queue[i];
        log(`\n======== 任务 [${task.idx}/50] "${task.keyword}" ========`);
        // 跳转到搜索页
        if (!(location.hostname === "www.bing.com" && location.pathname === "/search")) {
          log("跳转到 Bing 搜索结果页...");
          saveState({ queue, curIdx: i });
          location.href = `https://www.bing.com/search?q=${encodeURIComponent(task.keyword)}`;
          return;
        }

        log("等待搜索结果页加载...");
        const pageReady = await waitForUrlContains("?q=", 12000);
        if (!pageReady) {
          log("搜索结果页加载超时，跳到下一个任务");
          saveState({ queue, curIdx: i+1 });
          continue;
        }
        log("搜索结果页已加载");
        log("滚动页面中...");
        for (let k = 1; k <= param.scrollTimes; k++) {
          window.scrollBy(0, window.innerHeight * 0.85);
          await sleep(param.scrollInterval);
        }

        // 主结果区链接
        log("筛选主结果区可点击链接...");
        let links = Array.from(document.querySelectorAll('.b_algo h2 a'))
          .filter(a =>
            a.href &&
            a.offsetParent !== null &&
            a.offsetWidth > 50 &&
            a.offsetHeight > 12 &&
            !a.href.includes('bing.com/images/search') &&
            !a.href.includes('view=detailv2')
          );

        if (links.length === 0) {
          log("无可点击主结果链接，跳到下一个任务");
          saveState({ queue, curIdx: i+1 });
          location.href = "https://www.bing.com";
          return;
        }
        let clickCount = Math.min(randomBetween(2, 5), links.length);
        let clickLinks = shuffle(links).slice(0, clickCount);
        log(`准备点击 ${clickCount} 个主结果链接`);
        for (let [idx2, a] of clickLinks.entries()) {
          log(`点击第${idx2+1}个：${a.href}`);
          let win = window.open(a.href, "_blank");
          let staySec = randomBetween(param.minStay, param.maxStay);
          log(`新页面停留 ${staySec} 秒`);
          await sleep(staySec * 1000);
          if (win && !win.closed) win.close();
          log("已关闭标签页");
        }
        log("本任务结束，准备下一个");
        saveState({ queue, curIdx: i+1 });
        location.href = "https://www.bing.com";
        return;
      }
      log("\n✅ 全部关键词任务已执行完毕！");
      clearState();
      clearLogs();
      window.__coldyang_running__ = false;
    } catch (e) {
      log("【FATAL】脚本异常终止：" + (e && e.stack || e));
      window.__coldyang_running__ = false;
    }
  },
  stop: function() {
    window.__coldyang_stop__ = true;
  }
};

// 每次页面加载后自动启动
if (!window.__coldyang_running__) window.COLDYANG.run();
