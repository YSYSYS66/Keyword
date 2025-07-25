// ==UserScript==
// @name         冷养Bing全自动 - 重写版
// @namespace    cold_auto_v2
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

// 全局状态管理
window.COLDYANG_V2 = {
  // 状态变量
  isRunning: false,
  isStopped: false,
  isKilled: false,
  currentTask: null,
  openedWindows: [],
  
  // 配置参数
  config: {
    scrollTimes: 30,
    scrollInterval: 1500,
    minStay: 8,
    maxStay: 120,
  },
  
  // 日志函数
  log: function(msg) {
    const timestamp = new Date().toLocaleTimeString();
    const logMsg = `[${timestamp}] ${msg}`;
    console.log(logMsg);
    
    // 如果有UI日志函数，也调用它
    if (window.coldyangLogUI) {
      window.coldyangLogUI(logMsg);
    }
    
    // 保存到localStorage
    this.saveLog(logMsg);
  },
  
  // 保存日志
  saveLog: function(msg) {
    try {
      let logs = JSON.parse(localStorage.getItem('__coldyang_v2_logs__') || "[]");
      logs.push(msg);
      if (logs.length > 500) {
        logs = logs.slice(-300);
      }
      localStorage.setItem('__coldyang_v2_logs__', JSON.stringify(logs));
    } catch (e) {
      console.error('保存日志失败:', e);
    }
  },
  
  // 工具函数
  sleep: function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  randomBetween: function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  
  shuffle: function(arr) {
    const newArr = [...arr];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  },
  
  // 检查停止信号
  checkStop: function() {
    if (this.isStopped || this.isKilled) {
      this.log("检测到停止信号，终止操作");
      return true;
    }
    return false;
  },
  
  // 关闭所有打开的窗口
  closeAllWindows: function() {
    this.log("正在关闭所有打开的窗口...");
    this.openedWindows.forEach(win => {
      try {
        if (win && !win.closed) {
          win.close();
        }
      } catch (e) {
        // 忽略跨域错误
      }
    });
    this.openedWindows = [];
  },
  
  // 保存状态
  saveState: function(state) {
    try {
      localStorage.setItem('__coldyang_v2_state__', JSON.stringify(state));
    } catch (e) {
      this.log("保存状态失败: " + e.message);
    }
  },
  
  // 加载状态
  loadState: function() {
    try {
      return JSON.parse(localStorage.getItem('__coldyang_v2_state__') || "{}");
    } catch (e) {
      return {};
    }
  },
  
  // 清除状态
  clearState: function() {
    localStorage.removeItem('__coldyang_v2_state__');
    localStorage.removeItem('__coldyang_v2_logs__');
  },
  
  // 在新页面中执行操作
  handleNewPage: async function(win, staySec) {
    try {
      // 等待页面加载
      await this.sleep(3000);
      
      if (this.checkStop()) return;
      
      if (win.closed) {
        this.log("新页面已关闭");
        return;
      }
      
      // 在新页面中滚动
      this.log(`在新页面中滚动 ${this.config.scrollTimes} 次...`);
      for (let i = 0; i < this.config.scrollTimes; i++) {
        if (this.checkStop()) return;
        
        if (win.closed) {
          this.log("新页面已关闭，停止滚动");
          return;
        }
        
        try {
          win.scrollBy(0, win.innerHeight * 0.8);
          await this.sleep(this.config.scrollInterval);
        } catch (e) {
          this.log("新页面滚动出错: " + e.message);
          break;
        }
      }
      
      if (this.checkStop()) return;
      
      // 计算剩余停留时间
      const scrollTime = this.config.scrollTimes * this.config.scrollInterval / 1000;
      const remainingTime = Math.max(0, staySec - scrollTime);
      
      if (remainingTime > 0) {
        this.log(`滚动完成，继续停留 ${Math.round(remainingTime)} 秒`);
        
        // 分段停留，每3秒检查一次停止信号
        const checkInterval = 3000;
        const checks = Math.ceil(remainingTime * 1000 / checkInterval);
        
        for (let i = 0; i < checks; i++) {
          if (this.checkStop()) return;
          
          const sleepTime = Math.min(checkInterval, remainingTime * 1000 - i * checkInterval);
          await this.sleep(sleepTime);
        }
      }
      
    } catch (e) {
      this.log("新页面处理异常: " + e.message);
    }
  },
  
  // 执行单个任务
  executeTask: async function(task) {
    this.currentTask = task;
    this.log(`\n======== 任务 [${task.idx}/50] "${task.keyword}" ========`);
    
    // 检查是否需要跳转到搜索页
    if (!(location.hostname === "www.bing.com" && location.pathname === "/search")) {
      this.log("跳转到搜索结果页...");
      this.saveState({ currentTask: task, step: 'search' });
      location.href = `https://www.bing.com/search?q=${encodeURIComponent(task.keyword)}`;
      return;
    }
    
    // 等待搜索结果页加载
    this.log("等待搜索结果页加载...");
    let loaded = false;
    for (let i = 0; i < 24; i++) { // 最多等待12秒
      if (this.checkStop()) return;
      
      if (location.href.includes("?q=")) {
        loaded = true;
        break;
      }
      await this.sleep(500);
    }
    
    if (!loaded) {
      this.log("搜索结果页加载超时");
      return;
    }
    
    this.log("搜索结果页已加载");
    
    // 滚动页面
    this.log("滚动搜索结果页...");
    for (let i = 0; i < this.config.scrollTimes; i++) {
      if (this.checkStop()) return;
      
      window.scrollBy(0, window.innerHeight * 0.8);
      await this.sleep(this.config.scrollInterval);
    }
    
    // 查找可点击的链接
    this.log("查找可点击的链接...");
    const links = Array.from(document.querySelectorAll('.b_algo h2 a'))
      .filter(a => 
        a.href && 
        a.offsetParent !== null &&
        a.offsetWidth > 50 &&
        a.offsetHeight > 12 &&
        !a.href.includes('bing.com/images/search') &&
        !a.href.includes('view=detailv2')
      );
    
    if (links.length === 0) {
      this.log("没有找到可点击的链接");
      return;
    }
    
    // 随机选择链接
    const clickCount = Math.min(this.randomBetween(2, 5), links.length);
    const selectedLinks = this.shuffle(links).slice(0, clickCount);
    
    this.log(`准备点击 ${clickCount} 个链接`);
    
    // 依次点击链接
    for (let i = 0; i < selectedLinks.length; i++) {
      if (this.checkStop()) return;
      
      const link = selectedLinks[i];
      this.log(`点击第${i + 1}个链接: ${link.href}`);
      
      try {
        const win = window.open(link.href, "_blank");
        if (win) {
          this.openedWindows.push(win);
          
          const staySec = this.randomBetween(this.config.minStay, this.config.maxStay);
          this.log(`新页面停留 ${staySec} 秒`);
          
          await this.handleNewPage(win, staySec);
          
          if (win && !win.closed) {
            win.close();
            this.openedWindows = this.openedWindows.filter(w => w !== win);
          }
          
          this.log("已关闭标签页");
        }
      } catch (e) {
        this.log("打开链接失败: " + e.message);
      }
    }
    
    this.log("任务完成");
    this.currentTask = null;
  },
  
  // 主运行函数
  run: async function(options = {}) {
    if (this.isRunning) {
      this.log("任务已在运行中");
      return;
    }
    
    // 检查是否被彻底终止
    if (localStorage.getItem('__coldyang_v2_killed__') === '1') {
      this.log("检测到彻底终止标志，不启动任务");
      return;
    }
    
    this.isRunning = true;
    this.isStopped = false;
    this.isKilled = false;
    
    // 合并配置
    this.config = { ...this.config, ...options };
    
    try {
      this.log("======== 冷养自动化 V2 启动 ========");
      
      // 加载状态
      const state = this.loadState();
      let queue = [];
      let currentIndex = 0;
      
      if (state.queue && typeof state.currentIndex === 'number' && state.currentTask) {
        this.log(`检测到未完成任务，从第${state.currentIndex + 1}个关键词继续`);
        queue = state.queue;
        currentIndex = state.currentIndex;
      } else {
        this.log("拉取关键词列表...");
        
        try {
          const response = await fetch("https://raw.githubusercontent.com/YSYSYS66/Keyword/main/keywords.txt");
          const text = await response.text();
          const keywords = text.split("\n").map(x => x.trim()).filter(Boolean);
          const selectedKeywords = this.shuffle(keywords).slice(0, 50);
          
          queue = selectedKeywords.map((kw, i) => ({ idx: i + 1, keyword: kw }));
          currentIndex = 0;
          
          this.saveState({ queue, currentIndex, currentTask: null });
          this.log("任务队列构建完成");
        } catch (e) {
          this.log("拉取关键词失败: " + e.message);
          this.isRunning = false;
          return;
        }
      }
      
      // 执行任务队列
      for (let i = currentIndex; i < queue.length; i++) {
        if (this.checkStop()) {
          this.saveState({ queue, currentIndex: i, currentTask: this.currentTask });
          break;
        }
        
        await this.executeTask(queue[i]);
        
        if (this.checkStop()) {
          this.saveState({ queue, currentIndex: i + 1, currentTask: null });
          break;
        }
        
        // 任务完成后跳转回首页
        this.saveState({ queue, currentIndex: i + 1, currentTask: null });
        location.href = "https://www.bing.com";
        return; // 等待页面刷新后继续
      }
      
      // 所有任务完成
      this.log("======== 所有任务已完成 ========");
      this.clearState();
      
    } catch (e) {
      this.log("任务执行异常: " + e.message);
    } finally {
      this.isRunning = false;
      this.closeAllWindows();
    }
  },
  
  // 停止任务
  stop: function() {
    this.log("收到停止指令");
    this.isStopped = true;
    this.closeAllWindows();
  },
  
  // 彻底终止
  kill: function() {
    this.log("收到彻底终止指令");
    this.isKilled = true;
    this.isStopped = true;
    this.closeAllWindows();
    this.clearState();
    localStorage.setItem('__coldyang_v2_killed__', '1');
  },
  
  // 重置终止状态
  reset: function() {
    localStorage.removeItem('__coldyang_v2_killed__');
    this.isKilled = false;
    this.isStopped = false;
    this.log("重置终止状态");
  }
};

// 兼容旧版本
window.COLDYANG = window.COLDYANG_V2;

// 自动启动（如果未被终止）
if (localStorage.getItem('__coldyang_v2_killed__') !== '1') {
  setTimeout(() => {
    if (!window.COLDYANG_V2.isRunning) {
      window.COLDYANG_V2.run();
    }
  }, 1000);
}
  
