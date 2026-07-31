/**
 * 班主任工作台 - 工具函数
 */

const Utils = {
  // 日期格式化
  formatDate(date, fmt = 'YYYY-MM-DD') {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const opts = {
      'YYYY': d.getFullYear(),
      'MM': String(d.getMonth() + 1).padStart(2, '0'),
      'DD': String(d.getDate()).padStart(2, '0'),
      'HH': String(d.getHours()).padStart(2, '0'),
      'mm': String(d.getMinutes()).padStart(2, '0'),
      'ss': String(d.getSeconds()).padStart(2, '0'),
      'W': ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
    };
    let result = fmt;
    Object.keys(opts).forEach(k => {
      result = result.replace(k, opts[k]);
    });
    return result;
  },

  // 获取当前日期时间
  now() {
    return new Date();
  },

  // 获取今天日期字符串
  today() {
    return this.formatDate(new Date(), 'YYYY-MM-DD');
  },

  // 获取星期几
  weekday(date) {
    const d = date ? new Date(date) : new Date();
    return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  },

  // 计算天数差
  daysBetween(d1, d2) {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return Math.floor((date2 - date1) / 86400000);
  },

  // 计算年龄
  calculateAge(birthday) {
    if (!birthday) return '';
    const birth = new Date(birthday);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  },

  // Toast 提示
  toast(message, type = 'default', duration = 2000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✓' : (type === 'error' ? '✕' : (type === 'warning' ? '⚠' : ''));
    toast.innerHTML = `${icon ? `<span>${icon}</span>` : ''}<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // 显示模态框
  showModal(title, bodyHtml, footerHtml = '', options = {}) {
    const container = document.getElementById('modalContainer');
    const modal = document.createElement('div');
    modal.className = 'modal-content-wrapper';
    modal.innerHTML = `
      <div class="modal-overlay" onclick="Utils.closeModal()"></div>
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">${title}</div>
          <button class="modal-close" onclick="Utils.closeModal()">✕</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
      </div>
    `;
    container.appendChild(modal);
    container.classList.add('open');

    requestAnimationFrame(() => {
      modal.querySelector('.modal-overlay').classList.add('show');
      modal.querySelector('.modal').classList.add('show');
    });

    if (options.onShow) options.onShow(modal);
    return modal;
  },

  // 关闭模态框
  closeModal() {
    const container = document.getElementById('modalContainer');
    const wrapper = container.querySelector('.modal-content-wrapper');
    if (wrapper) {
      const overlay = wrapper.querySelector('.modal-overlay');
      const modal = wrapper.querySelector('.modal');
      overlay.classList.remove('show');
      modal.classList.remove('show');
      setTimeout(() => {
        wrapper.remove();
        if (container.children.length === 0) {
          container.classList.remove('open');
        }
      }, 300);
    }
  },

  // 确认对话框
  confirm(message, onConfirm, title = '确认') {
    this.showModal(title, `
      <div style="padding: 10px 0; font-size: 15px; line-height: 1.6;">${message}</div>
    `, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
      <button class="btn btn-primary" style="flex:1;" onclick="Utils.closeModal(); (${onConfirm})();">确定</button>
    `);
  },

  // 获取头像首字母
  getInitial(name) {
    if (!name) return '?';
    return name.charAt(0);
  },

  // 根据名字生成颜色
  getColorFromName(name) {
    const colors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  },

  // 防抖
  debounce(fn, delay = 300) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  // 下载文件
  downloadFile(filename, content, type = 'text/plain') {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // 导出 Word 文档（使用 HTML 转 Word）
  exportWord(filename, title, contentHtml) {
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: '宋体', SimSun, serif; font-size: 12pt; line-height: 1.75; }
          h1 { font-size: 18pt; text-align: center; margin-bottom: 20pt; }
          h2 { font-size: 14pt; margin-top: 16pt; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #000; padding: 4pt; font-size: 10.5pt; }
          th { background: #e0e0e0; }
          .header { text-align: center; margin-bottom: 10pt; }
          .info { margin-bottom: 10pt; }
          .footer { margin-top: 20pt; text-align: right; }
        </style>
      </head>
      <body>
        ${contentHtml}
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    this.downloadFile(filename, blob, 'application/msword');
  },

  // 导出 HTML 为图片（使用 canvas）
  async exportImage(filename, targetElement) {
    // 简化：提示用户截图
    this.toast('请长按屏幕截图保存', 'info');
  },

  // 获取本月日期范围
  getMonthRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: this.formatDate(start),
      end: this.formatDate(end)
    };
  },

  // 获取本周日期范围
  getWeekRange() {
    const now = new Date();
    const day = now.getDay() || 7;
    const start = new Date(now);
    start.setDate(now.getDate() - day + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
      start: this.formatDate(start),
      end: this.formatDate(end)
    };
  },

  // 统计辅助
  count(arr, key, value) {
    return arr.filter(item => item[key] === value).length;
  },

  // 分组统计
  groupBy(arr, key) {
    return arr.reduce((groups, item) => {
      const val = item[key];
      if (!groups[val]) groups[val] = [];
      groups[val].push(item);
      return groups;
    }, {});
  },

  // 平均值
  average(arr) {
    if (!arr.length) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  },

  // 排名
  rank(arr, key = 'total') {
    const sorted = [...arr].sort((a, b) => b[key] - a[key]);
    return sorted.map((item, i) => ({ ...item, rank: i + 1 }));
  },

  // 转义 HTML
  escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  // 格式化数字
  formatNumber(num, decimals = 1) {
    if (num == null || isNaN(num)) return '-';
    return Number(num).toFixed(decimals);
  },

  // 获取日期范围内的项
  filterByDateRange(arr, dateKey, startDate, endDate) {
    return arr.filter(item => {
      if (!item[dateKey]) return false;
      const d = item[dateKey];
      return d >= startDate && d <= endDate;
    });
  },

  // 生成下拉选择选项
  options(arr, valueKey, labelKey, placeholder = '请选择') {
    let html = `<option value="">${placeholder}</option>`;
    arr.forEach(item => {
      html += `<option value="${item[valueKey]}">${item[labelKey]}</option>`;
    });
    return html;
  },

  // 读取 CSV 文件
  parseCSV(text) {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length === 0) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const results = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const obj = {};
      headers.forEach((h, j) => {
        obj[h] = values[j] || '';
      });
      results.push(obj);
    }
    return results;
  },

  // 数组转CSV
  toCSV(arr, headers) {
    let csv = headers.join(',') + '\n';
    arr.forEach(item => {
      const row = headers.map(h => {
        const val = item[h] || '';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csv += row.join(',') + '\n';
    });
    return csv;
  },

  // 获取颜色系列
  chartColors: [
    '#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
    '#84cc16', '#06b6d4', '#a855f7', '#f43f5e', '#88f5e5'
  ],

  // 销毁已有图表
  destroyChart(canvasId) {
    const existing = Chart.getChart(canvasId);
    if (existing) existing.destroy();
  },

  // 渲染分页
  renderPagination(total, current, pageSize, onPageChange) {
    const pages = Math.ceil(total / pageSize);
    if (pages <= 1) return '';
    let html = '<div class="pagination" style="display:flex;gap:4px;justify-content:center;margin-top:12px;">';
    if (current > 1) {
      html += `<button class="btn btn-sm btn-outline" onclick="${onPageChange}(${current - 1})">上一页</button>`;
    }
    for (let i = 1; i <= pages; i++) {
      if (i === current) {
        html += `<button class="btn btn-sm btn-primary">${i}</button>`;
      } else if (i <= 3 || i > pages - 2 || Math.abs(i - current) <= 1) {
        html += `<button class="btn btn-sm btn-outline" onclick="${onPageChange}(${i})">${i}</button>`;
      } else if (i === 4 || i === pages - 2) {
        html += '<span style="padding:4px 8px;">...</span>';
      }
    }
    if (current < pages) {
      html += `<button class="btn btn-sm btn-outline" onclick="${onPageChange}(${current + 1})">下一页</button>`;
    }
    html += '</div>';
    return html;
  },

  // 空状态HTML
  emptyState(icon, text) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <div class="empty-state-text">${text}</div>
      </div>
    `;
  },

  // 安全获取
  safeGet(obj, path, defaultVal = '') {
    try {
      return path.split('.').reduce((o, k) => o[k], obj) ?? defaultVal;
    } catch {
      return defaultVal;
    }
  }
};
