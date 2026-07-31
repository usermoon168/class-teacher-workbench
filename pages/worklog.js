/**
 * 工作留痕页面
 */
const WorklogPage = {
  currentTab: 'timeline',
  filterType: '',

  render() {
    let html = `
      <div class="page-title">📅 工作留痕</div>
      <div class="page-subtitle">时间轴视图 · 类型统计 · 批量导出Word</div>
    `;

    html += `
      <div class="toolbar">
        <button class="btn btn-primary btn-sm" onclick="showWorklogModal()">+ 添加留痕</button>
        <button class="btn btn-outline btn-sm" onclick="WorklogPage.exportWord()">📄 导出Word</button>
        <button class="btn btn-outline btn-sm" onclick="WorklogPage.exportData()">📤 导出CSV</button>
      </div>
    `;

    const worklogs = DB.getByClass('worklogs');

    if (worklogs.length === 0) {
      html += Utils.emptyState('📅', '暂无工作留痕');
      document.getElementById('mainContent').innerHTML = html;
      return;
    }

    html += `
      <div class="segment-control">
        <div class="segment-item ${this.currentTab === 'timeline' ? 'active' : ''}" onclick="WorklogPage.switchTab('timeline')">📅 时间轴</div>
        <div class="segment-item ${this.currentTab === 'stats' ? 'active' : ''}" onclick="WorklogPage.switchTab('stats')">📊 类型统计</div>
      </div>
    `;

    if (this.currentTab === 'timeline') {
      html += this.renderTimeline(worklogs);
    } else {
      html += this.renderStats(worklogs);
    }

    document.getElementById('mainContent').innerHTML = html;

    if (this.currentTab === 'stats') {
      this.renderChart(worklogs);
    }
  },

  renderTimeline(worklogs) {
    const types = ['全部', '班会', '教研活动', '培训学习', '会议记录', '常规检查', '其他'];
    let html = `
      <div class="segment-control">
        ${types.map(t => `<div class="segment-item ${this.filterType === t || (!this.filterType && t === '全部') ? 'active' : ''}" onclick="WorklogPage.filterByType('${t === '全部' ? '' : t}')">${t}</div>`).join('')}
      </div>
    `;

    let filtered = worklogs;
    if (this.filterType) {
      filtered = worklogs.filter(w => w.type === this.filterType);
    }
    const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

    if (sorted.length === 0) {
      return html + Utils.emptyState('📅', '暂无记录');
    }

    html += '<div class="timeline">';
    sorted.forEach(w => {
      const typeColor = this.getTypeColor(w.type);
      html += `
        <div class="timeline-item ${typeColor}" onclick="WorklogPage.showDetail('${w.id}')">
          <div class="timeline-time">${w.date} · ${w.type}</div>
          <div class="timeline-title">${w.title}</div>
          <div class="timeline-content">${w.content.substring(0, 80)}${w.content.length > 80 ? '...' : ''}</div>
          ${w.location ? `<div class="timeline-time" style="margin-top:4px;">📍 ${w.location}</div>` : ''}
        </div>
      `;
    });
    html += '</div>';

    return html;
  },

  renderStats(worklogs) {
    const typeCounts = Utils.groupBy(worklogs, 'type');
    const monthRange = Utils.getMonthRange();
    const weekRange = Utils.getWeekRange();
    const monthCount = worklogs.filter(w => w.date >= monthRange.start && w.date <= monthRange.end).length;
    const weekCount = worklogs.filter(w => w.date >= weekRange.start && w.date <= weekRange.end).length;

    let html = `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-value">${worklogs.length}</div><div class="stat-label">总记录</div></div>
        <div class="stat-card info"><div class="stat-value">${weekCount}</div><div class="stat-label">本周</div></div>
        <div class="stat-card success"><div class="stat-value">${monthCount}</div><div class="stat-label">本月</div></div>
        <div class="stat-card warning"><div class="stat-value">${Object.keys(typeCounts).length}</div><div class="stat-label">类型数</div></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">📊 工作类型分布</div></div>
        <div class="chart-container large"><canvas id="worklogTypeChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">📊 近30天工作记录趋势</div></div>
        <div class="chart-container large"><canvas id="worklogTrendChart"></canvas></div>
      </div>
    `;

    // 各类型详情
    html += '<div class="card"><div class="card-header"><div class="card-title">📋 各类型汇总</div></div>';
    Object.entries(typeCounts).forEach(([type, items]) => {
      html += `
        <div class="list-item">
          <div class="list-avatar" style="background:${this.getTypeColor(type) === 'success' ? '#d1fae5;color:#065f46' : this.getTypeColor(type) === 'warning' ? '#fef3c7;color:#92400e' : this.getTypeColor(type) === 'danger' ? '#fee2e2;color:#991b1b' : '#dbeafe;color:#1e40af'};">${this.getTypeIcon(type)}</div>
          <div class="list-content">
            <div class="list-title">${type}</div>
            <div class="list-subtitle">${items.length}条记录</div>
          </div>
        </div>
      `;
    });
    html += '</div>';

    return html;
  },

  getTypeColor(type) {
    const map = {
      '班会': 'success',
      '教研活动': 'warning',
      '培训学习': '',
      '会议记录': '',
      '常规检查': 'warning',
      '其他': ''
    };
    return map[type] || '';
  },

  getTypeIcon(type) {
    const map = {
      '班会': '🏫',
      '教研活动': '📚',
      '培训学习': '🎓',
      '会议记录': '📝',
      '常规检查': '✓',
      '其他': '📌'
    };
    return map[type] || '📌';
  },

  renderChart(worklogs) {
    // 类型分布
    const typeCounts = Utils.groupBy(worklogs, 'type');
    Utils.destroyChart('worklogTypeChart');
    new Chart(document.getElementById('worklogTypeChart'), {
      type: 'doughnut',
      data: {
        labels: Object.keys(typeCounts),
        datasets: [{
          data: Object.values(typeCounts).map(arr => arr.length),
          backgroundColor: Utils.chartColors,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } }
      }
    });

    // 趋势
    const today = new Date();
    const labels = [];
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = Utils.formatDate(d);
      labels.push(Utils.formatDate(d, 'MM-DD'));
      data.push(worklogs.filter(w => w.date === dateStr).length);
    }
    Utils.destroyChart('worklogTrendChart');
    new Chart(document.getElementById('worklogTrendChart'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: '#4f46e5',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });
  },

  showDetail(id) {
    const log = (DB.get('worklogs') || []).find(w => w.id === id);
    if (!log) return;
    Utils.showModal('留痕详情', `
      <div class="card">
        <div style="font-weight:700;font-size:16px;">${log.title}</div>
        <div style="font-size:13px;color:var(--gray-500);margin-top:6px;">
          <span class="tag tag-primary">${log.type}</span>
          ${log.date} · 📍${log.location || '未记录'}
        </div>
        <div style="margin-top:12px;font-size:14px;line-height:1.8;">${log.content}</div>
        ${log.participants ? `<div style="font-size:13px;color:var(--gray-500);margin-top:8px;">参与：${log.participants}</div>` : ''}
        ${log.result ? `<div style="font-size:13px;color:var(--success);margin-top:8px;">结果：${log.result}</div>` : ''}
      </div>
    `, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">关闭</button>
      <button class="btn btn-outline" style="flex:1;" onclick="WorklogPage.exportSingle('${id}')">📄 导出</button>
      <button class="btn btn-danger" style="flex:1;" onclick="deleteWorklog('${id}')">🗑 删除</button>
    `);
  },

  filterByType(type) {
    this.filterType = type;
    this.render();
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.render();
  },

  // 批量导出Word
  exportWord() {
    const worklogs = DB.getByClass('worklogs');
    if (worklogs.length === 0) {
      Utils.toast('暂无数据', 'warning');
      return;
    }
    const sorted = [...worklogs].sort((a, b) => b.date.localeCompare(a.date));
    let content = `
      <h1>班主任工作留痕汇总</h1>
      <div class="header"><p>${DB.getCurrentClass().name}</p><p>生成日期：${Utils.today()}</p></div>
    `;
    sorted.forEach((w, i) => {
      content += `
        <h2>${i + 1}. ${w.title}</h2>
        <p><strong>类型：</strong>${w.type}　<strong>日期：</strong>${w.date}　<strong>地点：</strong>${w.location || ''}</p>
        <p><strong>参与人员：</strong>${w.participants || '全体学生'}</p>
        <p style="text-indent:2em;">${w.content}</p>
        ${w.result ? `<p><strong>结果/效果：</strong>${w.result}</p>` : ''}
        <hr>
      `;
    });
    content += `<div class="footer"><p>班主任签字：____________</p></div>`;
    Utils.exportWord(`工作留痕汇总_${Utils.today()}.doc`, '工作留痕', content);
    Utils.toast('已导出Word文档', 'success');
  },

  exportSingle(id) {
    const log = (DB.get('worklogs') || []).find(w => w.id === id);
    if (!log) return;
    const content = `
      <h1>${log.title}</h1>
      <div class="header"><p>${DB.getCurrentClass().name}</p><p>日期：${log.date}</p></div>
      <p><strong>类型：</strong>${log.type}　<strong>地点：</strong>${log.location || ''}</p>
      <p><strong>参与人员：</strong>${log.participants || '全体学生'}</p>
      <p style="text-indent:2em;">${log.content}</p>
      ${log.result ? `<p><strong>结果/效果：</strong>${log.result}</p>` : ''}
      <div class="footer"><p>班主任签字：____________</p></div>
    `;
    Utils.exportWord(`${log.title}.doc`, log.title, content);
    Utils.toast('已导出', 'success');
  },

  exportData() {
    const worklogs = DB.getByClass('worklogs');
    const data = [...worklogs].sort((a, b) => b.date.localeCompare(a.date)).map(w => ({
      类型: w.type,
      标题: w.title,
      日期: w.date,
      地点: w.location || '',
      参与人员: w.participants || '',
      内容: w.content,
      结果: w.result || ''
    }));
    const csv = Utils.toCSV(data, ['类型', '标题', '日期', '地点', '参与人员', '内容', '结果']);
    Utils.downloadFile(`工作留痕_${Utils.today()}.csv`, '\ufeff' + csv, 'text/csv');
    Utils.toast('已导出', 'success');
  }
};

// 添加/编辑工作留痕
function showWorklogModal(id) {
  const log = id ? (DB.get('worklogs') || []).find(w => w.id === id) : null;
  const isEdit = !!log;

  Utils.showModal(isEdit ? '编辑留痕' : '添加工作留痕', `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">类型</label>
        <select class="form-select" id="wlType">
          <option value="班会" ${log?.type === '班会' ? 'selected' : ''}>班会</option>
          <option value="教研活动" ${log?.type === '教研活动' ? 'selected' : ''}>教研活动</option>
          <option value="培训学习" ${log?.type === '培训学习' ? 'selected' : ''}>培训学习</option>
          <option value="会议记录" ${log?.type === '会议记录' ? 'selected' : ''}>会议记录</option>
          <option value="常规检查" ${log?.type === '常规检查' ? 'selected' : ''}>常规检查</option>
          <option value="其他" ${log?.type === '其他' ? 'selected' : ''}>其他</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">日期</label>
        <input class="form-input" id="wlDate" type="date" value="${log?.date || Utils.today()}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">标题 *</label>
      <input class="form-input" id="wlTitle" value="${log?.title || ''}" placeholder="工作标题">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">地点</label>
        <input class="form-input" id="wlLocation" value="${log?.location || ''}" placeholder="如：教室">
      </div>
      <div class="form-group">
        <label class="form-label">参与人员</label>
        <input class="form-input" id="wlParticipants" value="${log?.participants || ''}" placeholder="如：全体学生">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">内容 *</label>
      <textarea class="form-textarea" id="wlContent" style="min-height:120px;" placeholder="详细记录工作内容">${log?.content || ''}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">结果/效果</label>
      <textarea class="form-textarea" id="wlResult" placeholder="工作结果或效果">${log?.result || ''}</textarea>
    </div>
  `, `
    <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
    <button class="btn btn-primary" style="flex:1;" onclick="saveWorklog(${isEdit ? `'${id}'` : 'null'})">保存</button>
  `);
}

function saveWorklog(id) {
  const title = document.getElementById('wlTitle').value.trim();
  if (!title) {
    Utils.toast('请输入标题', 'error');
    return;
  }
  const data = {
    type: document.getElementById('wlType').value,
    date: document.getElementById('wlDate').value,
    title: title,
    location: document.getElementById('wlLocation').value.trim(),
    participants: document.getElementById('wlParticipants').value.trim(),
    content: document.getElementById('wlContent').value.trim(),
    result: document.getElementById('wlResult').value.trim()
  };
  if (id) {
    DB.update('worklogs', id, data);
    Utils.toast('修改成功', 'success');
  } else {
    DB.add('worklogs', data);
    Utils.toast('添加成功', 'success');
  }
  Utils.closeModal();
  WorklogPage.render();
}

function deleteWorklog(id) {
  Utils.confirm('确定要删除此记录吗？', () => {
    DB.delete('worklogs', id);
    Utils.closeModal();
    WorklogPage.render();
    Utils.toast('已删除', 'success');
  });
}
