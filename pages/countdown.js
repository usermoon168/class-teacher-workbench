/**
 * 倒计时提醒页面
 */
const CountdownPage = {
  filterType: 'all',

  render() {
    let html = `
      <div class="page-title">⏰ 倒计时提醒</div>
      <div class="page-subtitle">考试 · 活动 · 重要节点倒计时</div>
    `;

    html += `
      <div class="toolbar">
        <button class="btn btn-primary btn-sm" onclick="CountdownPage.addCountdown()">+ 添加倒计时</button>
      </div>
    `;

    const countdowns = DB.getByClass('countdowns');
    const today = Utils.today();

    // 筛选
    html += `
      <div class="segment-control">
        <div class="segment-item ${this.filterType === 'all' ? 'active' : ''}" onclick="CountdownPage.setFilter('all')">全部</div>
        <div class="segment-item ${this.filterType === 'exam' ? 'active' : ''}" onclick="CountdownPage.setFilter('exam')">📝 考试</div>
        <div class="segment-item ${this.filterType === 'activity' ? 'active' : ''}" onclick="CountdownPage.setFilter('activity')">🎉 活动</div>
        <div class="segment-item ${this.filterType === 'meeting' ? 'active' : ''}" onclick="CountdownPage.setFilter('meeting')">🤝 会议</div>
        <div class="segment-item ${this.filterType === 'other' ? 'active' : ''}" onclick="CountdownPage.setFilter('other')">📌 其他</div>
      </div>
    `;

    let filtered = countdowns;
    if (this.filterType !== 'all') {
      filtered = countdowns.filter(c => c.type === this.filterType);
    }

    // 排序：未过期在前，按日期升序
    filtered = filtered.sort((a, b) => {
      const aDays = Utils.daysBetween(today, a.targetDate);
      const bDays = Utils.daysBetween(today, b.targetDate);
      const aExpired = aDays < 0;
      const bExpired = bDays < 0;
      if (aExpired && !bExpired) return 1;
      if (!aExpired && bExpired) return -1;
      return a.targetDate.localeCompare(b.targetDate);
    });

    if (filtered.length === 0) {
      html += Utils.emptyState('⏰', '暂无倒计时，点击"添加"创建');
    } else {
      filtered.forEach(c => {
        const days = Utils.daysBetween(today, c.targetDate);
        const isExpired = days < 0;
        const isToday = days === 0;
        const isUrgent = days > 0 && days <= 7;

        const typeIcons = { exam: '📝', activity: '🎉', meeting: '🤝', other: '📌' };
        const typeLabels = { exam: '考试', activity: '活动', meeting: '会议', other: '其他' };
        const typeColors = { exam: 'danger', activity: 'info', meeting: 'warning', other: 'gray' };

        let dayText, dayColor;
        if (isExpired) {
          dayText = '已结束';
          dayColor = 'var(--gray-400)';
        } else if (isToday) {
          dayText = '今天';
          dayColor = 'var(--danger)';
        } else if (days === 1) {
          dayText = '明天';
          dayColor = 'var(--danger)';
        } else {
          dayText = `${days}天`;
          dayColor = isUrgent ? 'var(--danger)' : 'var(--primary)';
        }

        html += `
          <div class="countdown-card ${isExpired ? 'expired' : ''} ${isUrgent ? 'urgent' : ''}">
            <div class="countdown-header">
              <span class="tag tag-${typeColors[c.type]}">${typeIcons[c.type]} ${typeLabels[c.type]}</span>
              <button class="btn btn-sm btn-outline" style="padding:2px 8px;font-size:12px;" onclick="CountdownPage.deleteCountdown('${c.id}')">✕</button>
            </div>
            <div class="countdown-body">
              <div class="countdown-number" style="color:${dayColor};">${isExpired ? '—' : dayText}</div>
              <div class="countdown-title">${c.title}</div>
              <div class="countdown-date">📅 ${c.targetDate} ${Utils.weekday(c.targetDate)}</div>
              ${c.note ? `<div class="countdown-note">📌 ${c.note}</div>` : ''}
            </div>
          </div>
        `;
      });
    }

    document.getElementById('mainContent').innerHTML = html;
  },

  addCountdown() {
    Utils.showModal('添加倒计时', `
      <div class="form-group">
        <label class="form-label">标题 *</label>
        <input class="form-input" id="cdTitle" placeholder="如：期中考试">
      </div>
      <div class="form-group">
        <label class="form-label">目标日期 *</label>
        <input class="form-input" id="cdDate" type="date" value="${Utils.today()}">
      </div>
      <div class="form-group">
        <label class="form-label">类型</label>
        <select class="form-select" id="cdType">
          <option value="exam">📝 考试</option>
          <option value="activity">🎉 活动</option>
          <option value="meeting">🤝 会议</option>
          <option value="other">📌 其他</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">备注</label>
        <input class="form-input" id="cdNote" placeholder="可选备注信息">
      </div>
    `, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
      <button class="btn btn-primary" style="flex:1;" onclick="CountdownPage.saveCountdown()">添加</button>
    `);
  },

  saveCountdown() {
    const title = document.getElementById('cdTitle').value.trim();
    const targetDate = document.getElementById('cdDate').value;
    const type = document.getElementById('cdType').value;
    const note = document.getElementById('cdNote').value.trim();

    if (!title) {
      Utils.toast('请输入标题', 'error');
      return;
    }
    if (!targetDate) {
      Utils.toast('请选择日期', 'error');
      return;
    }

    DB.add('countdowns', { title, targetDate, type, note });
    Utils.closeModal();
    Utils.toast('倒计时已添加', 'success');
    this.render();
  },

  deleteCountdown(id) {
    Utils.confirm('确定要删除此倒计时吗？', () => {
      DB.delete('countdowns', id);
      this.render();
      Utils.toast('已删除', 'success');
    });
  },

  setFilter(type) {
    this.filterType = type;
    this.render();
  }
};
