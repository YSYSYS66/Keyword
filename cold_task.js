// ==UserScript==
// @name         Bing冷养自动化 - 全新版本
// @namespace    cold_auto_new
// @match        https://www.bing.com/*
// @run-at       document-end
// ==/UserScript==

// 防止进入图片详情页
(function() {
  const params = new URLSearchParams(location.search);
  if (location.hostname === "www.bing.com" && 
      location.pathname === "/images/search" && 
      params.get("view") === "detailv2") {
    window.location.href = "https://www.bing.com";
  }
})();

// 全新的冷养自动化系统
window.BingColdYang = {
  // 核心状态
  status: {
    running: false,
    paused: false,
    killed: false,
    currentTask: null,
    taskQueue: [],
    currentIndex: 0
  },
  
  // 配置参数
  settings: {
    scrollCount: 30,
    scrollDelay: 1500,
    minStayTime: 8,
    maxStayTime: 120,
    linkCount: { min: 2, max: 5 }
  },
  
  // 打开的窗口列表
  openedWindows: [],
  
  // 日志系统
  logs: [],
  
  // 工具函数
  utils: {
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    random(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    shuffle(array) {
      const newArray = [...array];
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    },
    
    log(message) {
      const timestamp = new Date().toLocaleTimeString();
      const logEntry = `[${timestamp}] ${message}`;
      console.log(logEntry);
      
      // 保存到内存
      this.logs.push(logEntry);
      if (this.logs.length > 200) {
        this.logs = this.logs.slice(-100);
      }
      
      // 发送到UI
      if (window.coldyangUI && window.coldyangUI.addLog) {
        window.coldyangUI.addLog(logEntry);
      }
    }
  },
  
  // 检查是否应该停止
  shouldStop() {
    return this.status.paused || this.status.killed;
  },
  
  // 关闭所有打开的窗口
  closeAllWindows() {
    this.utils.log("关闭所有打开的窗口...");
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
  
  // 保存状态到localStorage
  saveState() {
    try {
      const state = {
        taskQueue: this.status.taskQueue,
        currentIndex: this.status.currentIndex,
        currentTask: this.status.currentTask,
        settings: this.settings
      };
      localStorage.setItem('bing_coldyang_state', JSON.stringify(state));
    } catch (e) {
      this.utils.log("保存状态失败: " + e.message);
    }
  },
  
  // 从localStorage加载状态
  loadState() {
    try {
      const saved = localStorage.getItem('bing_coldyang_state');
      if (saved) {
        const state = JSON.parse(saved);
        this.status.taskQueue = state.taskQueue || [];
        this.status.currentIndex = state.currentIndex || 0;
        this.status.currentTask = state.currentTask || null;
        if (state.settings) {
          this.settings = { ...this.settings, ...state.settings };
        }
        return true;
      }
    } catch (e) {
      this.utils.log("加载状态失败: " + e.message);
    }
    return false;
  },
  
  // 清除所有状态
  clearState() {
    localStorage.removeItem('bing_coldyang_state');
    localStorage.removeItem('bing_coldyang_killed');
    this.status.taskQueue = [];
    this.status.currentIndex = 0;
    this.status.currentTask = null;
    this.openedWindows = [];
  },
  
  // 获取关键词列表
  async fetchKeywords() {
    try {
      this.utils.log("获取关键词列表...");
      const response = await fetch("https://raw.githubusercontent.com/YSYSYS66/Keyword/main/keywords.txt");
      const text = await response.text();
      const keywords = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      // 随机选择50个关键词
      const selected = this.utils.shuffle(keywords).slice(0, 50);
      this.status.taskQueue = selected.map((keyword, index) => ({
        id: index + 1,
        keyword: keyword
      }));
      
      this.utils.log(`成功获取 ${this.status.taskQueue.length} 个关键词`);
      return true;
    } catch (e) {
      this.utils.log("获取关键词失败: " + e.message);
      return false;
    }
  },
  
  // 滚动页面
  async scrollPage() {
    this.utils.log(`开始滚动页面 ${this.settings.scrollCount} 次...`);
    
    for (let i = 0; i < this.settings.scrollCount; i++) {
      if (this.shouldStop()) {
        this.utils.log("滚动被中断");
        return false;
      }
      
      window.scrollBy(0, window.innerHeight * 0.8);
      await this.utils.sleep(this.settings.scrollDelay);
    }
    
    this.utils.log("页面滚动完成");
    return true;
  },
  
  // 处理新打开的页面
  async handleNewPage(window, stayTime) {
    try {
      // 等待页面加载
      await this.utils.sleep(3000);
      
      if (this.shouldStop() || window.closed) {
        return;
      }
      
      // 在新页面中滚动
      this.utils.log(`在新页面中滚动 ${this.settings.scrollCount} 次...`);
      
      for (let i = 0; i < this.settings.scrollCount; i++) {
        if (this.shouldStop() || window.closed) {
          break;
        }
        
        try {
          window.scrollBy(0, window.innerHeight * 0.8);
          await this.utils.sleep(this.settings.scrollDelay);
        } catch (e) {
          this.utils.log("新页面滚动出错: " + e.message);
          break;
        }
      }
      
      if (this.shouldStop()) {
        return;
      }
      
      // 计算剩余停留时间
      const scrollTime = this.settings.scrollCount * this.settings.scrollDelay / 1000;
      const remainingTime = Math.max(0, stayTime - scrollTime);
      
      if (remainingTime > 0) {
        this.utils.log(`继续停留 ${Math.round(remainingTime)} 秒`);
        
        // 分段停留，每5秒检查一次
        const checkInterval = 5000;
        const checks = Math.ceil(remainingTime * 1000 / checkInterval);
        
        for (let i = 0; i < checks; i++) {
          if (this.shouldStop()) {
            this.utils.log("停留被中断");
            return;
          }
          
          const sleepTime = Math.min(checkInterval, remainingTime * 1000 - i * checkInterval);
          await this.utils.sleep(sleepTime);
        }
      }
      
    } catch (e) {
      this.utils.log("处理新页面异常: " + e.message);
    }
  },
  
  // 执行单个任务
  async executeTask(task) {
    this.status.currentTask = task;
    this.utils.log(`\n======== 任务 ${task.id}/50: "${task.keyword}" ========`);
    
    // 检查当前页面状态
    if (!(location.hostname === "www.bing.com" && location.pathname === "/search")) {
      this.utils.log("跳转到搜索结果页...");
      this.saveState();
      location.href = `https://www.bing.com/search?q=${encodeURIComponent(task.keyword)}`;
      return;
    }
    
    // 等待搜索结果加载
    this.utils.log("等待搜索结果加载...");
    let loaded = false;
    for (let i = 0; i < 20; i++) {
      if (this.shouldStop()) return;
      
      if (location.href.includes("?q=")) {
        loaded = true;
        break;
      }
      await this.utils.sleep(500);
    }
    
    if (!loaded) {
      this.utils.log("搜索结果加载超时");
      return;
    }
    
    this.utils.log("搜索结果已加载");
    
    // 滚动页面
    if (!(await this.scrollPage())) {
      return;
    }
    
    // 查找可点击的链接
    this.utils.log("查找可点击的链接...");
    const links = Array.from(document.querySelectorAll('.b_algo h2 a'))
      .filter(link => 
        link.href && 
        link.offsetParent !== null &&
        link.offsetWidth > 50 &&
        link.offsetHeight > 12 &&
        !link.href.includes('bing.com/images/search') &&
        !link.href.includes('view=detailv2')
      );
    
    if (links.length === 0) {
      this.utils.log("没有找到可点击的链接");
      return;
    }
    
    // 随机选择链接
    const linkCount = this.utils.random(this.settings.linkCount.min, this.settings.linkCount.max);
    const selectedLinks = this.utils.shuffle(links).slice(0, Math.min(linkCount, links.length));
    
    this.utils.log(`准备点击 ${selectedLinks.length} 个链接`);
    
    // 依次点击链接
    for (let i = 0; i < selectedLinks.length; i++) {
      if (this.shouldStop()) {
        this.utils.log("点击链接被中断");
        return;
      }
      
      const link = selectedLinks[i];
      this.utils.log(`点击第${i + 1}个链接: ${link.href}`);
      
      try {
        const newWindow = window.open(link.href, "_blank");
        if (newWindow) {
          this.openedWindows.push(newWindow);
          
          const stayTime = this.utils.random(this.settings.minStayTime, this.settings.maxStayTime);
          this.utils.log(`新页面停留 ${stayTime} 秒`);
          
          await this.handleNewPage(newWindow, stayTime);
          
          // 关闭窗口
          if (newWindow && !newWindow.closed) {
            newWindow.close();
            this.openedWindows = this.openedWindows.filter(w => w !== newWindow);
          }
          
          this.utils.log("已关闭标签页");
        }
      } catch (e) {
        this.utils.log("打开链接失败: " + e.message);
      }
    }
    
    this.utils.log("任务完成");
    this.status.currentTask = null;
  },
  
  // 主运行函数
  async run(options = {}) {
    if (this.status.running) {
      this.utils.log("任务已在运行中");
      return;
    }
    
    // 检查是否被彻底终止
    if (localStorage.getItem('bing_coldyang_killed') === '1') {
      this.utils.log("检测到彻底终止标志，不启动任务");
      return;
    }
    
    this.status.running = true;
    this.status.paused = false;
    this.status.killed = false;
    
    // 合并配置
    if (options) {
      this.settings = { ...this.settings, ...options };
    }
    
    try {
      this.utils.log("======== Bing冷养自动化启动 ========");
      
      // 加载或创建任务队列
      if (!this.loadState() || this.status.taskQueue.length === 0) {
        if (!(await this.fetchKeywords())) {
          this.utils.log("无法获取关键词，任务终止");
          return;
        }
        this.status.currentIndex = 0;
        this.saveState();
      } else {
        this.utils.log(`从第${this.status.currentIndex + 1}个任务继续`);
      }
      
      // 执行任务队列
      for (let i = this.status.currentIndex; i < this.status.taskQueue.length; i++) {
        if (this.shouldStop()) {
          this.saveState();
          break;
        }
        
        await this.executeTask(this.status.taskQueue[i]);
        
        if (this.shouldStop()) {
          this.saveState();
          break;
        }
        
        // 更新进度并跳转回首页
        this.status.currentIndex = i + 1;
        this.saveState();
        location.href = "https://www.bing.com";
        return; // 等待页面刷新后继续
      }
      
      // 所有任务完成
      this.utils.log("======== 所有任务已完成 ========");
      this.clearState();
      
    } catch (e) {
      this.utils.log("任务执行异常: " + e.message);
    } finally {
      this.status.running = false;
      this.closeAllWindows();
    }
  },
  
  // 暂停任务
  pause() {
    this.utils.log("任务已暂停");
    this.status.paused = true;
    this.closeAllWindows();
  },
  
  // 恢复任务
  resume() {
    this.utils.log("任务已恢复");
    this.status.paused = false;
  },
  
  // 停止任务
  stop() {
    this.utils.log("任务已停止");
    this.status.paused = true;
    this.closeAllWindows();
  },
  
  // 彻底终止
  kill() {
    this.utils.log("任务已彻底终止");
    this.status.killed = true;
    this.status.paused = true;
    this.closeAllWindows();
    this.clearState();
    localStorage.setItem('bing_coldyang_killed', '1');
  },
  
  // 重置终止状态
  reset() {
    localStorage.removeItem('bing_coldyang_killed');
    this.status.killed = false;
    this.status.paused = false;
    this.utils.log("终止状态已重置");
  },
  
  // 获取状态信息
  getStatus() {
    return {
      running: this.status.running,
      paused: this.status.paused,
      killed: this.status.killed,
      currentTask: this.status.currentTask,
      progress: this.status.taskQueue.length > 0 ? 
        `${this.status.currentIndex}/${this.status.taskQueue.length}` : "0/0",
      logs: this.logs.slice(-10) // 最近10条日志
    };
  }
};

// 兼容旧版本
window.COLDYANG = window.BingColdYang;

// 自动启动检查
if (localStorage.getItem('bing_coldyang_killed') !== '1') {
  setTimeout(() => {
    if (!window.BingColdYang.status.running) {
      window.BingColdYang.run();
    }
  }, 1000);
} 
