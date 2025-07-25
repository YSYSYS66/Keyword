// ==UserScript==
// @name         Bing冷养自动化控制面板 - 全新版本
// @namespace    coldyang_ui_new
// @version      1.0
// @description  Bing冷养自动化的用户界面控制面板
// @match        https://www.bing.com/*
// @grant        none
// @require      https://raw.githubusercontent.com/YSYSYS66/Keyword/refs/heads/main/cold_task.js
// ==/UserScript==

(function() {
  // 创建控制面板
  function createControlPanel() {
    const panel = document.createElement('div');
    panel.id = 'coldyang-panel';
    panel.style.cssText = `
      position: fixed;
      right: 20px;
      bottom: 20px;
      width: 400px;
      max-height: 70vh;
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      border: 2px solid #4a90e2;
      border-radius: 15px;
      color: white;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `;

    panel.innerHTML = `
      <div style="
        padding: 15px 20px 10px 20px;
        background: rgba(0,0,0,0.2);
        border-bottom: 1px solid rgba(255,255,255,0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div style="font-weight: bold; font-size: 16px;">
          🚀 Bing冷养自动化
        </div>
        <div style="display: flex; gap: 10px;">
          <span id="coldyang-status" style="
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            background: rgba(255,255,255,0.2);
          ">待机</span>
          <span id="coldyang-close" style="
            cursor: pointer;
            padding: 2px 6px;
            border-radius: 50%;
            background: rgba(255,255,255,0.1);
            transition: background 0.2s;
          ">×</span>
        </div>
      </div>

      <div style="padding: 15px 20px;">
        <div style="margin-bottom: 15px;">
          <div style="margin-bottom: 8px; font-weight: 500;">⚙️ 参数设置</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
            <div>
              <label>滚动次数:</label>
              <input id="scroll-count" type="number" value="30" min="10" max="60" style="
                width: 60px;
                padding: 4px;
                border: 1px solid rgba(255,255,255,0.3);
                border-radius: 4px;
                background: rgba(255,255,255,0.1);
                color: white;
                margin-left: 5px;
              ">
            </div>
            <div>
              <label>滚动间隔(ms):</label>
              <input id="scroll-delay" type="number" value="1500" min="500" max="5000" style="
                width: 70px;
                padding: 4px;
                border: 1px solid rgba(255,255,255,0.3);
                border-radius: 4px;
                background: rgba(255,255,255,0.1);
                color: white;
                margin-left: 5px;
              ">
            </div>
            <div>
              <label>最小停留(秒):</label>
              <input id="min-stay" type="number" value="8" min="3" max="60" style="
                width: 50px;
                padding: 4px;
                border: 1px solid rgba(255,255,255,0.3);
                border-radius: 4px;
                background: rgba(255,255,255,0.1);
                color: white;
                margin-left: 5px;
              ">
            </div>
            <div>
              <label>最大停留(秒):</label>
              <input id="max-stay" type="number" value="120" min="10" max="300" style="
                width: 50px;
                padding: 4px;
                border: 1px solid rgba(255,255,255,0.3);
                border-radius: 4px;
                background: rgba(255,255,255,0.1);
                color: white;
                margin-left: 5px;
              ">
            </div>
          </div>
        </div>

        <div style="margin-bottom: 15px;">
          <div style="margin-bottom: 8px; font-weight: 500;">🎮 控制按钮</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button id="btn-start" style="
              padding: 8px 12px;
              background: linear-gradient(135deg, #28a745, #20c997);
              border: none;
              border-radius: 6px;
              color: white;
              cursor: pointer;
              font-weight: 500;
              transition: transform 0.2s;
            ">▶️ 开始</button>
            <button id="btn-pause" style="
              padding: 8px 12px;
              background: linear-gradient(135deg, #ffc107, #fd7e14);
              border: none;
              border-radius: 6px;
              color: white;
              cursor: pointer;
              font-weight: 500;
              transition: transform 0.2s;
            ">⏸️ 暂停</button>
            <button id="btn-stop" style="
              padding: 8px 12px;
              background: linear-gradient(135deg, #dc3545, #e83e8c);
              border: none;
              border-radius: 6px;
              color: white;
              cursor: pointer;
              font-weight: 500;
              transition: transform 0.2s;
            ">⏹️ 停止</button>
            <button id="btn-kill" style="
              padding: 8px 12px;
              background: linear-gradient(135deg, #6f42c1, #e83e8c);
              border: none;
              border-radius: 6px;
              color: white;
              cursor: pointer;
              font-weight: 500;
              transition: transform 0.2s;
            ">💀 彻底终止</button>
          </div>
          <div style="margin-top: 8px; display: flex; gap: 8px;">
            <button id="btn-reset" style="
              padding: 6px 12px;
              background: rgba(255,255,255,0.2);
              border: 1px solid rgba(255,255,255,0.3);
              border-radius: 4px;
              color: white;
              cursor: pointer;
              font-size: 12px;
            ">🔄 重置</button>
            <button id="btn-clear" style="
              padding: 6px 12px;
              background: rgba(255,255,255,0.2);
              border: 1px solid rgba(255,255,255,0.3);
              border-radius: 4px;
              color: white;
              cursor: pointer;
              font-size: 12px;
            ">🗑️ 清空日志</button>
          </div>
        </div>

        <div style="margin-bottom: 10px;">
          <div style="margin-bottom: 8px; font-weight: 500;">📊 进度信息</div>
          <div id="progress-info" style="
            padding: 8px;
            background: rgba(255,255,255,0.1);
            border-radius: 6px;
            font-size: 13px;
          ">等待开始...</div>
        </div>
      </div>

      <div style="
        flex: 1;
        overflow-y: auto;
        padding: 0 20px 15px 20px;
        background: rgba(0,0,0,0.1);
      ">
        <div style="margin-bottom: 8px; font-weight: 500;">📝 运行日志</div>
        <div id="log-container" style="
          background: rgba(0,0,0,0.3);
          border-radius: 6px;
          padding: 10px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          max-height: 200px;
          overflow-y: auto;
          line-height: 1.4;
        "></div>
      </div>
    `;

    document.body.appendChild(panel);
    return panel;
  }

  // 控制面板实例
  let controlPanel = null;
  let logContainer = null;
  let statusElement = null;
  let progressElement = null;

  // 初始化控制面板
  function initControlPanel() {
    controlPanel = createControlPanel();
    logContainer = controlPanel.querySelector('#log-container');
    statusElement = controlPanel.querySelector('#coldyang-status');
    progressElement = controlPanel.querySelector('#progress-info');

    // 绑定事件
    bindEvents();
    
    // 加载历史日志
    loadHistoryLogs();
    
    // 开始状态更新循环
    startStatusUpdate();
  }

  // 绑定事件
  function bindEvents() {
    // 关闭按钮
    controlPanel.querySelector('#coldyang-close').onclick = () => {
      controlPanel.remove();
      controlPanel = null;
    };

    // 开始按钮
    controlPanel.querySelector('#btn-start').onclick = () => {
      if (window.BingColdYang) {
        const options = getOptions();
        window.BingColdYang.run(options);
        addLog("[手动] 开始任务");
      } else {
        addLog("[错误] BingColdYang 对象未加载");
      }
    };

    // 暂停按钮
    controlPanel.querySelector('#btn-pause').onclick = () => {
      if (window.BingColdYang) {
        if (window.BingColdYang.status.paused) {
          window.BingColdYang.resume();
          addLog("[手动] 恢复任务");
        } else {
          window.BingColdYang.pause();
          addLog("[手动] 暂停任务");
        }
      }
    };

    // 停止按钮
    controlPanel.querySelector('#btn-stop').onclick = () => {
      if (window.BingColdYang) {
        window.BingColdYang.stop();
        addLog("[手动] 停止任务");
      }
    };

    // 彻底终止按钮
    controlPanel.querySelector('#btn-kill').onclick = () => {
      if (window.BingColdYang) {
        window.BingColdYang.kill();
        addLog("[手动] 彻底终止任务");
        
        // 延迟刷新页面
        setTimeout(() => {
          addLog("[系统] 即将刷新页面...");
          setTimeout(() => {
            location.reload();
          }, 1000);
        }, 2000);
      }
    };

    // 重置按钮
    controlPanel.querySelector('#btn-reset').onclick = () => {
      if (window.BingColdYang) {
        window.BingColdYang.reset();
        addLog("[手动] 重置终止状态");
      }
    };

    // 清空日志按钮
    controlPanel.querySelector('#btn-clear').onclick = () => {
      logContainer.innerHTML = '';
      addLog("[手动] 日志已清空");
    };

    // 按钮悬停效果
    const buttons = controlPanel.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.onmouseenter = () => {
        btn.style.transform = 'scale(1.05)';
      };
      btn.onmouseleave = () => {
        btn.style.transform = 'scale(1)';
      };
    });
  }

  // 获取参数配置
  function getOptions() {
    return {
      scrollCount: parseInt(document.getElementById('scroll-count').value) || 30,
      scrollDelay: parseInt(document.getElementById('scroll-delay').value) || 1500,
      minStayTime: parseInt(document.getElementById('min-stay').value) || 8,
      maxStayTime: parseInt(document.getElementById('max-stay').value) || 120
    };
  }

  // 添加日志
  function addLog(message) {
    if (!logContainer) return; // 如果logContainer不存在，直接返回
    
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.style.cssText = `
      margin-bottom: 4px;
      word-break: break-all;
    `;
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
    
    // 限制日志数量
    while (logContainer.children.length > 50) {
      logContainer.removeChild(logContainer.firstChild);
    }
  }

  // 加载历史日志
  function loadHistoryLogs() {
    if (window.BingColdYang && window.BingColdYang.logs) {
      const recentLogs = window.BingColdYang.logs.slice(-20);
      recentLogs.forEach(log => {
        const logEntry = document.createElement('div');
        logEntry.style.cssText = `
          margin-bottom: 4px;
          word-break: break-all;
          opacity: 0.8;
        `;
        logEntry.textContent = log;
        logContainer.appendChild(logEntry);
      });
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  }

  // 更新状态显示
  function updateStatus() {
    if (!window.BingColdYang) return;

    const status = window.BingColdYang.getStatus();
    
    // 更新状态标签
    let statusText = '待机';
    let statusColor = 'rgba(255,255,255,0.2)';
    
    if (status.killed) {
      statusText = '已终止';
      statusColor = '#dc3545';
    } else if (status.running) {
      if (status.paused) {
        statusText = '已暂停';
        statusColor = '#ffc107';
      } else {
        statusText = '运行中';
        statusColor = '#28a745';
      }
    }
    
    statusElement.textContent = statusText;
    statusElement.style.background = statusColor;
    
    // 更新进度信息
    if (status.currentTask) {
      progressElement.innerHTML = `
        <div>当前任务: ${status.currentTask.keyword}</div>
        <div>进度: ${status.progress}</div>
      `;
    } else {
      progressElement.textContent = status.running ? '正在初始化...' : '等待开始...';
    }
  }

  // 开始状态更新循环
  function startStatusUpdate() {
    setInterval(() => {
      if (controlPanel) {
        updateStatus();
      }
    }, 1000);
  }

  // 暴露给全局的日志接口
  window.coldyangUI = {
    addLog: addLog
  };

  // 等待页面加载完成后初始化
  function waitForBingColdYang(maxAttempts = 20) {
    if (window.BingColdYang) {
      initControlPanel();
    } else if (maxAttempts > 0) {
      // 如果还没有加载，等待一段时间后重试
      setTimeout(() => waitForBingColdYang(maxAttempts - 1), 500);
    } else {
      // 超时后仍然初始化，但显示错误信息
      initControlPanel();
      addLog("[警告] BingColdYang 对象加载超时，某些功能可能不可用");
    }
  }

  // 开始等待BingColdYang对象
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForBingColdYang);
  } else {
    waitForBingColdYang();
  }
})(); 
