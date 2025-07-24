(async () => {
  if (window.__coldyang_running__) {
    console.log('[冷养] 检测到已在运行，跳过本次注入');
    return;
  }
  window.__coldyang_running__ = true;
  window.__coldyang_stop__ = false;

  function log(msg, type = "info") {
    const prefix = type === "error" ? "❌" : (type === "warn" ? "⚠️" : "🟢");
    console.log(`[冷养] ${prefix} ${msg}`);
  }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  function randomBetween(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  async function waitForSelector(sel, timeout=12000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(sel);
      if (el) return el;
      await sleep(200);
    }
    return null;
  }
  async function waitForUrlContains(str, timeout=12000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (location.href.includes(str)) return true;
      await sleep(250);
    }
    return false;
  }

  try {
    log("Step 1：拉取关键词列表");
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
    log(`Step 2：关键词总数 ${keywords.length}，准备打乱随机取50个`);
    keywords = shuffle(keywords).slice(0, 50);

    log("Step 3：构建任务队列，每个关键词=1个任务");
    let queue = keywords.map((kw, i) => ({ idx: i+1, keyword: kw }));

    for (let task of queue) {
      if (window.__coldyang_stop__) {
        log("检测到停止信号，已终止全部任务", "warn");
        break;
      }
      log(`\n======== 任务 [${task.idx}/50] "${task.keyword}" ========`);
      // Step 4.1 跳转 Bing 首页
      if (!(location.hostname === "www.bing.com" && location.pathname === "/")) {
        log("Step 4.1：跳转 Bing 首页...");
        location.href = "https://www.bing.com";
        await sleep(1800);
      } else {
        log("Step 4.1：已在 Bing 首页");
      }

      // Step 4.2 定位搜索框，优先自动填充，否则直接跳转搜索页
      log("Step 4.2：尝试定位 Bing 搜索框...");
      let input = await waitForSelector("input[name='q'], input[type='search']", 9000);
      if (input) {
        input.value = task.keyword;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        let form = input.closest("form");
        if (form) {
          form.submit();
          log(`已提交搜索：${task.keyword}`);
        } else {
          log("未找到搜索表单，直接跳转到搜索结果页", "warn");
          location.href = `https://www.bing.com/search?q=${encodeURIComponent(task.keyword)}`;
          await sleep(1500);
        }
      } else {
        log("9秒内搜索框未出现，直接跳转到搜索页", "warn");
        location.href = `https://www.bing.com/search?q=${encodeURIComponent(task.keyword)}`;
        await sleep(1500);
      }

      // Step 4.3 等待搜索结果页加载
      log("Step 4.3：等待结果页加载...");
      const pageReady = await waitForUrlContains("?q=", 12000);
      if (!pageReady) {
        log("搜索结果页加载超时，跳到下一个任务", "error");
        continue;
      }
      log("搜索结果页已加载");

      // Step 4.4 页面滚动 30 次
      log("Step 4.4：滚动页面30次");
      for (let i = 1; i <= 30; i++) {
        if (window.__coldyang_stop__) {
          log("检测到停止信号，中断本轮滚动", "warn");
          break;
        }
        window.scrollBy(0, window.innerHeight * 0.85);
        log(`滚动 ${i}/30`);
        await sleep(1500);
      }

      // Step 4.5 获取并点击链接
      log("Step 4.5：筛选可点击链接");
      let links = Array.from(document.querySelectorAll("a"))
        .filter(a =>
          a.href &&
          a.offsetParent !== null &&
          a.offsetWidth > 50 &&
          a.offsetHeight > 12 &&
          !a.href.match(/microsoft|bing\.com\/search|javascript:/i)
        );
      log(`共找到 ${links.length} 个有效链接`);
      if (links.length === 0) {
        log("页面无可点击链接，直接返回首页", "warn");
        location.href = "https://www.bing.com";
        await sleep(1800);
        continue;
      }
      let clickCount = randomBetween(2, 5);
      let clickLinks = shuffle(links).slice(0, clickCount);
      log(`准备点击 ${clickCount} 个链接`);
      for (let [idx, a] of clickLinks.entries()) {
        if (window.__coldyang_stop__) {
          log("收到停止信号，停止后续点击", "warn");
          break;
        }
        try {
          log(`点击第${idx+1}个：${a.href}`);
          let win = window.open(a.href, "_blank");
          let staySec = randomBetween(8, 120);
          log(`新页面停留 ${staySec} 秒`);
          await sleep(staySec * 1000);
          if (win && !win.closed) win.close();
          log("已关闭标签页");
        } catch (err) {
          log("点击/关闭标签页出错：" + (err.message || err), "error");
        }
      }

      // 4.5.4 回首页
      if (!window.__coldyang_stop__) {
        log("Step 4.5.4：任务结束，回到 Bing 首页，准备下个关键词");
        location.href = "https://www.bing.com";
        await sleep(1800);
      }
    }

    log("\n✅ 全部关键词任务已执行完毕！");
    window.__coldyang_running__ = false;
  } catch (e) {
    log("【FATAL】脚本异常终止：" + (e && e.stack || e), "error");
    window.__coldyang_running__ = false;
  }
})();

