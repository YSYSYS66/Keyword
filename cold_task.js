// cold_task.js
window.COLDYANG = {
  run: async function(opts = {}) {
    const STORAGE_KEY = '__coldyang_task_state__';
    const LOG_KEY = '__coldyang_task_log__';
    const logUI = opts.logUI || null;
    const param = Object.assign({
      scrollTimes: 30,
      scrollInterval: 1500,
      minStay: 8,
      maxStay: 120,
    }, opts);

    function log(msg, type="info") {
      const prefix = type === "error" ? "❌" : (type === "warn" ? "⚠️" : "🟢");
      const line = `[冷养] ${prefix} ${msg}`;
      let logs = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
      logs.push(line);
      localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(-200)));
      if (logUI) logUI(line);
      console.log(line);
    }
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

    if (window.__coldyang_running__) {
      log('检测到已有冷养任务在运行，跳过');
      return;
    }
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
        let res;
        try {
          res = await fetch("https://raw.githubusercontent.com/YSYSYS66/Keyword/main/keywords.txt");
          if (!res.ok) throw new Error("关键词接口请求失败: " + res.status);
        } catch (e) {
          log("无法获取关键词：" + e.message, "error");
          window.__coldyang_running__ = false;
          return;
        }
        let text = await res.text();
        let keywords = text.split("\n").map(x => x.trim()).filter(Boolean);
        log(`关键词总数 ${keywords.length}，打乱取50`);
        keywords = shuffle(keywords).slice(0, 50);
        queue = keywords.map((kw, i) => ({ idx: i+1, keyword: kw }));
        curIdx = 0;
        saveState({ queue, curIdx });
        clearLogs();
        log("任务队列构建完成，准备执行");
      }

      for (let i = curIdx; i < queue.length; i++) {
        if (window.__coldyang_stop__) {
          log("检测到停止信号，终止任务", "warn");
          saveState({ queue, curIdx: i });
          window.__coldyang_running__ = false;
          return;
        }
        const task = queue[i];
        log(`\n======== 任务 [${task.idx}/50] "${task.keyword}" ========`);
        if (!(location.hostname === "www.bing.com" && location.pathname === "/search")) {
          log("跳转到 Bing 搜索结果页...");
          saveState({ queue, curIdx: i });
          location.href = `https://www.bing.com/search?q=${encodeURIComponent(task.keyword)}`;
          return;
        } else {
          log("已在 Bing 搜索结果页");
        }

        log("等待搜索结果页加载...");
        const pageReady = await waitForUrlContains("?q=", 12000);
        if (!pageReady) {
          log("搜索结果页加载超时，跳到下一个任务", "error");
          saveState({ queue, curIdx: i+1 });
          continue;
        }
        log("搜索结果页已加载");
        log("滚动页面中...");
        for (let k = 1; k <= param.scrollTimes; k++) {
          if (window.__coldyang_stop__) {
            log("收到停止信号，中断滚动", "warn");
            saveState({ queue, curIdx: i });
            window.__coldyang_running__ = false;
            return;
          }
          window.scrollBy(0, window.innerHeight * 0.85);
          log(`滚动 ${k}/${param.scrollTimes}`);
          await sleep(param.scrollInterval);
        }

        // 优先选择主结果区链接
        log("筛选主结果区可点击链接...");
        let links = Array.from(document.querySelectorAll(".b_algo h2 a"))
          .filter(a =>
            a.href &&
            a.offsetParent !== null &&
            a.offsetWidth > 50 &&
            a.offsetHeight > 12
          );

        // 如果主结果区链接太少，补充其它可见链接（但排除图片详情页和脚本类）
        if (links.length < 5) {
          log("主结果链接不足，补充其它链接...");
          let extraLinks = Array.from(document.querySelectorAll("a"))
            .filter(a =>
              a.href &&
              a.offsetParent !== null &&
              a.offsetWidth > 50 &&
              a.offsetHeight > 12 &&
              !a.href.match(/microsoft|bing\.com\/search|view=detailv2|javascript:/i)
            );
          // 合并去重
          links = Array.from(new Set(links.concat(extraLinks)));
        }

        log(`找到 ${links.length} 个有效链接`);
        if (links.length === 0) {
          log("无可点击链接，跳到下一个任务", "warn");
          saveState({ queue, curIdx: i+1 });
          location.href = "https://www.bing.com";
          return;
        }
        let clickCount = randomBetween(2, 5);
        let clickLinks = shuffle(links).slice(0, clickCount);
        log(`准备点击 ${clickCount} 个链接`);
        for (let [idx2, a] of clickLinks.entries()) {
          if (window.__coldyang_stop__) {
            log("收到停止信号，终止点击", "warn");
            saveState({ queue, curIdx: i });
            window.__coldyang_running__ = false;
            return;
          }
          try {
            log(`点击第${idx2+1}个：${a.href}`);
            let win = window.open(a.href, "_blank");
            let staySec = randomBetween(param.minStay, param.maxStay);
            log(`新页面停留 ${staySec} 秒`);
            await sleep(staySec * 1000);
            if (win && !win.closed) win.close();
            log("已关闭标签页");
          } catch (err) {
            log("点击/关闭标签页出错：" + (err.message || err), "error");
          }
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
      log("【FATAL】脚本异常终止：" + (e && e.stack || e), "error");
      window.__coldyang_running__ = false;
    }
  },
  stop: function() {
    window.__coldyang_stop__ = true;
  }
};
