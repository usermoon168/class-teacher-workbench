/**
 * 奖励与评优页面
 * 奖励记录 · 量化积分 · 评优评先 · 获奖记录 · 类型设置
 */

const RewardsPage = {
  currentTab: 'records',
  rankRange: 'month',
  evalPlanId: null,
  recordTypeFilter: '',

  // ==================== 基础数据 ====================

  getAllTypes() {
    return DB.get('rewardTypes') || [];
  },

  // 仅启用中的类型（用于记录界面）
  getTypes() {
    return this.getAllTypes().filter(t => t.active !== false);
  },

  getRewards() {
    return DB.getByClass('rewards');
  },

  rangeLabel(range) {
    return { week: '本周', month: '本月', term: '本学期', all: '全部' }[range] || '全部';
  },

  getBounds(range) {
    if (range === 'week') return Utils.getWeekRange();
    if (range === 'month') return Utils.getMonthRange();
    if (range === 'term') return { start: this.getTermStart(), end: Utils.today() };
    return null;
  },

  // 秋季学期以 8 月 1 日为起点
  getTermStart() {
    const now = new Date();
    const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    return y + '-08-01';
  },

  // 指定时间范围内每个学生的积分汇总
  getPointsMap(range) {
    const bounds = this.getBounds(range);
    const all = this.getRewards();
    const list = bounds ? all.filter(r => r.date >= bounds.start && r.date <= bounds.end) : all;
    const map = {};
    list.forEach(r => {
      const key = r.studentId || r.studentName;
      if (!map[key]) map[key] = { points: 0, count: 0, name: r.studentName };
      map[key].points += Number(r.points) || 0;
      map[key].count += 1;
    });
    return map;
  },

  // 同分时按座号升序，便于老师按名册核对
  compareSeat(a, b) {
    const sa = Number(a.seatNo) || 9999;
    const sb = Number(b.seatNo) || 9999;
    if (sa !== sb) return sa - sb;
    return String(a.studentName).localeCompare(String(b.studentName));
  },

  // 全班积分排行（含 0 分学生）
  getRankList(range) {
    const students = DB.getByClass('students');
    const map = this.getPointsMap(range);
    const list = students.map(s => {
      const item = map[s.id] || { points: 0, count: 0 };
      return {
        studentId: s.id,
        studentName: s.name,
        seatNo: s.seatNo || '',
        points: item.points,
        count: item.count
      };
    });
    // 兼容历史数据：存在奖励记录但学生档案已删除的情况
    Object.keys(map).forEach(k => {
      if (!list.some(l => l.studentId === k)) {
        list.push({ studentId: k, studentName: map[k].name, seatNo: '', points: map[k].points, count: map[k].count });
      }
    });
    list.sort((a, b) => b.points - a.points || this.compareSeat(a, b));
    list.forEach((item, i) => { item.rank = i + 1; });
    return list;
  },

  // ==================== 渲染入口 ====================

  render() {
    const tabs = [
      ['records', '🏅 奖励记录'],
      ['rank', '📈 积分排行'],
      ['eval', '🎖 评优评先'],
      ['awards', '🏆 获奖记录'],
      ['config', '⚙️ 类型设置']
    ];

    let html = `
      <div class="page-title">🏅 奖励与评优</div>
      <div class="page-subtitle">日常奖励 · 量化积分 · 评优评先 · 获奖记录</div>
      <div class="segment-control">
    `;
    tabs.forEach(([key, label]) => {
      html += `<div class="segment-item ${this.currentTab === key ? 'active' : ''}" onclick="RewardsPage.switchTab('${key}')">${label}</div>`;
    });
    html += '</div>';

    if (this.currentTab === 'records') html += this.renderRecords();
    else if (this.currentTab === 'rank') html += this.renderRank();
    else if (this.currentTab === 'eval') html += this.renderEval();
    else if (this.currentTab === 'awards') html += this.renderAwards();
    else html += this.renderConfig();

    document.getElementById('mainContent').innerHTML = html;

    if (this.currentTab === 'rank') this.renderRankChart();
    if (this.currentTab === 'records') this.renderTypeChart();
  },

  switchTab(tab) {
    this.currentTab = tab;
    if (tab !== 'eval') this.evalPlanId = null;
    this.render();
  },

  // ==================== 标签一：奖励记录 ====================

  renderRecords() {
    const rewards = this.getRewards();
    const monthRange = Utils.getMonthRange();
    const monthList = rewards.filter(r => r.date >= monthRange.start && r.date <= monthRange.end);
    const monthPoints = monthList.reduce((s, r) => s + (Number(r.points) || 0), 0);
    const totalPoints = rewards.reduce((s, r) => s + (Number(r.points) || 0), 0);
    const studentCount = new Set(rewards.map(r => r.studentId || r.studentName)).size;

    let html = `
      <div class="toolbar">
        <button class="btn btn-primary btn-sm" onclick="showRewardModal()">+ 记录奖励</button>
        <button class="btn btn-outline btn-sm" onclick="RewardsPage.exportRecords()">📤 导出明细</button>
      </div>
      <div class="stat-grid">
        <div class="stat-card success"><div class="stat-value">${monthList.length}</div><div class="stat-label">本月次数</div></div>
        <div class="stat-card info"><div class="stat-value">${monthPoints}</div><div class="stat-label">本月积分</div></div>
        <div class="stat-card"><div class="stat-value">${totalPoints}</div><div class="stat-label">累计积分</div></div>
        <div class="stat-card warning"><div class="stat-value">${studentCount}</div><div class="stat-label">获奖励学生</div></div>
      </div>
    `;

    if (rewards.length === 0) {
      html += Utils.emptyState('🏅', '暂无奖励记录，点上方「记录奖励」开始');
      return html;
    }

    html += `
      <div class="card">
        <div class="card-header"><div class="card-title">🥧 奖励类型分布</div></div>
        <div class="chart-container"><canvas id="rewardTypeChart"></canvas></div>
      </div>
    `;

    // 类型筛选
    const types = this.getAllTypes();
    html += `
      <div class="card">
        <div class="form-group" style="margin-bottom:10px;">
          <input type="text" class="form-input" id="rwKeyword" placeholder="🔍 搜索学生 / 事由..." oninput="RewardsPage.filterRecords()">
        </div>
        <div class="type-chips">
          <div class="type-chip on" data-rwtype="" onclick="RewardsPage.setTypeFilter('', this)">全部</div>
          ${types.map(t => `
            <div class="type-chip" data-rwtype="${t.id}" onclick="RewardsPage.setTypeFilter('${t.id}', this)">${t.icon || '⭐'} ${t.name}</div>
          `).join('')}
        </div>
      </div>
      <div class="card" style="padding:0;" id="rewardList">
        ${this.renderRecordList('', '')}
      </div>
    `;
    return html;
  },

  renderRecordList(keyword, typeId) {
    const rows = this.getRewards()
      .filter(r => !typeId || r.typeId === typeId)
      .filter(r => {
        if (!keyword) return true;
        const k = keyword.toLowerCase();
        return (r.studentName || '').toLowerCase().includes(k) ||
          (r.typeName || '').toLowerCase().includes(k) ||
          (r.reason || '').toLowerCase().includes(k);
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (rows.length === 0) {
      return '<div style="padding:16px;">' + Utils.emptyState('🔍', '未找到匹配的奖励记录') + '</div>';
    }

    return rows.map(r => {
      const pts = Number(r.points) || 0;
      const tagCls = pts >= 0 ? 'tag-success' : 'tag-danger';
      return `
        <div class="list-item" onclick="RewardsPage.showRewardDetail('${r.id}')">
          <div class="list-avatar" style="background:var(--primary-bg);color:var(--primary);">${r.icon || '⭐'}</div>
          <div class="list-content">
            <div class="list-title">${Utils.escapeHtml(r.studentName)} · ${Utils.escapeHtml(r.typeName || '')}</div>
            <div class="list-subtitle">${r.date || ''}${r.reason ? ' · ' + Utils.escapeHtml(r.reason) : ''}</div>
          </div>
          <span class="tag ${tagCls}">${pts >= 0 ? '+' : ''}${pts}</span>
        </div>
      `;
    }).join('');
  },

  filterRecords() {
    const box = document.getElementById('rewardList');
    if (!box) return;
    const kw = (document.getElementById('rwKeyword') || {}).value || '';
    box.innerHTML = this.renderRecordList(kw.trim(), this.recordTypeFilter);
  },

  setTypeFilter(typeId, el) {
    this.recordTypeFilter = typeId;
    document.querySelectorAll('[data-rwtype]').forEach(item => {
      item.classList.toggle('on', item.dataset.rwtype === typeId);
    });
    this.filterRecords();
  },

  renderTypeChart() {
    const canvas = document.getElementById('rewardTypeChart');
    if (!canvas) return;
    const counts = {};
    this.getRewards().forEach(r => {
      const name = r.typeName || '其他';
      counts[name] = (counts[name] || 0) + 1;
    });
    const labels = Object.keys(counts);
    if (labels.length === 0) return;

    Utils.destroyChart('rewardTypeChart');
    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: labels.map(l => counts[l]),
          backgroundColor: Utils.chartColors.slice(0, labels.length),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 12 } } } }
      }
    });
  },

  showRewardDetail(id) {
    const r = (DB.get('rewards') || []).find(x => x.id === id);
    if (!r) return;
    const pts = Number(r.points) || 0;
    Utils.showModal('奖励详情', `
      <div class="card">
        <div style="font-weight:700;font-size:16px;">${r.icon || '⭐'} ${Utils.escapeHtml(r.studentName)} · ${Utils.escapeHtml(r.typeName || '')}</div>
        <div style="display:grid;gap:8px;margin-top:12px;font-size:14px;">
          <div><span style="color:var(--gray-500);">积分：</span><strong style="color:${pts >= 0 ? 'var(--success)' : 'var(--danger)'};">${pts >= 0 ? '+' : ''}${pts}</strong></div>
          <div><span style="color:var(--gray-500);">日期：</span>${r.date || ''}</div>
          <div><span style="color:var(--gray-500);">事由：</span>${Utils.escapeHtml(r.reason || '—')}</div>
          <div><span style="color:var(--gray-500);">记录人：</span>${Utils.escapeHtml(r.recorder || '班主任')}</div>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">关闭</button>
      <button class="btn btn-outline" style="flex:1;" onclick="showRewardModal(null, '${r.id}')">编辑</button>
      <button class="btn btn-danger" style="flex:1;" onclick="deleteReward('${r.id}')">🗑 删除</button>
    `);
  },

  exportRecords() {
    const rows = this.getRewards().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (rows.length === 0) {
      Utils.toast('暂无数据可导出', 'error');
      return;
    }
    const cls = DB.getCurrentClass();
    let csv = '日期,学生,奖励类型,积分,事由,记录人\n';
    rows.forEach(r => {
      csv += [r.date || '', r.studentName || '', r.typeName || '', r.points || 0, r.reason || '', r.recorder || '']
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    Utils.downloadFile(`${cls.name}_奖励明细_${Utils.today()}.csv`, '\ufeff' + csv, 'text/csv');
    Utils.toast('已导出', 'success');
  },

  // ==================== 标签二：积分排行 ====================

  renderRank() {
    const list = this.getRankList(this.rankRange);
    const totalPoints = list.reduce((s, i) => s + i.points, 0);
    const activeCount = list.filter(i => i.points > 0).length;
    const avg = activeCount > 0 ? Math.round(totalPoints / activeCount * 10) / 10 : 0;
    const maxPoints = list.length > 0 ? list[0].points : 0;

    let html = `
      <div class="toolbar">
        <button class="btn btn-primary btn-sm" onclick="showRewardModal()">+ 记录奖励</button>
        <button class="btn btn-outline btn-sm" onclick="RewardsPage.exportRank()">📤 导出排行</button>
      </div>
      <div class="segment-control">
        ${['week', 'month', 'term', 'all'].map(r =>
          `<div class="segment-item ${this.rankRange === r ? 'active' : ''}" onclick="RewardsPage.setRankRange('${r}')">${this.rangeLabel(r)}</div>`
        ).join('')}
      </div>
      <div class="stat-grid">
        <div class="stat-card success"><div class="stat-value">${activeCount}</div><div class="stat-label">获奖励人数</div></div>
        <div class="stat-card info"><div class="stat-value">${totalPoints}</div><div class="stat-label">发放积分</div></div>
        <div class="stat-card warning"><div class="stat-value">${avg}</div><div class="stat-label">人均积分</div></div>
        <div class="stat-card"><div class="stat-value">${list.length}</div><div class="stat-label">班级人数</div></div>
      </div>
    `;

    if (list.length === 0) {
      html += Utils.emptyState('👥', '请先在「学生管理」中添加学生');
      return html;
    }

    if (activeCount > 0) {
      html += `
        <div class="card">
          <div class="card-header"><div class="card-title">📊 积分排行 TOP10（${this.rangeLabel(this.rankRange)}）</div></div>
          <div class="chart-container large"><canvas id="rewardRankChart"></canvas></div>
        </div>
      `;
    }

    html += `
      <div class="card">
        <div class="card-header">
          <div class="card-title">🏅 ${this.rangeLabel(this.rankRange)}排行榜</div>
          <span style="font-size:12px;color:var(--gray-500);">共 ${list.length} 人</span>
        </div>
        ${list.map(item => this.renderRankRow(item, maxPoints)).join('')}
      </div>
    `;
    return html;
  },

  renderRankRow(item, maxPoints) {
    const badgeCls = item.rank === 1 ? 'gold' : item.rank === 2 ? 'silver' : item.rank === 3 ? 'bronze' : '';
    const pct = maxPoints > 0 ? Math.max(2, Math.round(item.points / maxPoints * 100)) : 0;
    return `
      <div class="rank-row" onclick="RewardsPage.showStudentProfile('${item.studentId}')">
        <div class="rank-badge ${badgeCls}">${item.rank}</div>
        <div class="rank-name">${Utils.escapeHtml(item.studentName)}${item.seatNo ? `<span style="font-size:12px;color:var(--gray-400);margin-left:6px;">${item.seatNo}号</span>` : ''}</div>
        <div class="mini-bar"><div style="width:${pct}%;"></div></div>
        <div class="rank-pts">${item.points}</div>
        <div style="font-size:12px;color:var(--gray-400);width:44px;text-align:right;">${item.count}次</div>
      </div>
    `;
  },

  setRankRange(range) {
    this.rankRange = range;
    this.render();
  },

  renderRankChart() {
    const canvas = document.getElementById('rewardRankChart');
    if (!canvas) return;
    const list = this.getRankList(this.rankRange).filter(i => i.points > 0).slice(0, 10);
    if (list.length === 0) return;

    Utils.destroyChart('rewardRankChart');
    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: list.map(i => i.studentName),
        datasets: [{
          label: '积分',
          data: list.map(i => i.points),
          backgroundColor: '#4f46e5',
          borderRadius: 6,
          maxBarThickness: 34
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

  exportRank() {
    const list = this.getRankList(this.rankRange);
    if (list.length === 0) {
      Utils.toast('暂无数据可导出', 'error');
      return;
    }
    const cls = DB.getCurrentClass();
    let csv = `${cls.name}_积分排行（${this.rangeLabel(this.rankRange)}）\n排名,学号,姓名,积分,奖励次数\n`;
    list.forEach(i => {
      csv += `${i.rank},${i.seatNo || ''},${i.studentName},${i.points},${i.count}\n`;
    });
    Utils.downloadFile(`${cls.name}_积分排行_${Utils.today()}.csv`, '\ufeff' + csv, 'text/csv');
    Utils.toast('已导出', 'success');
  },

  // ==================== 学生个人奖励档案 ====================

  showStudentProfile(studentId) {
    const rewards = this.getRewards()
      .filter(r => (r.studentId || r.studentName) === studentId)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const student = DB.getByClass('students').find(s => s.id === studentId);
    const name = student ? student.name : (rewards[0] ? rewards[0].studentName : '');
    if (!name) return;

    const total = rewards.reduce((s, r) => s + (Number(r.points) || 0), 0);

    // 类型汇总
    const typeCount = {};
    rewards.forEach(r => {
      const k = r.typeName || '其他';
      if (!typeCount[k]) typeCount[k] = { count: 0, points: 0 };
      typeCount[k].count += 1;
      typeCount[k].points += Number(r.points) || 0;
    });

    let body = `
      <div class="stat-grid">
        <div class="stat-card success"><div class="stat-value">${total}</div><div class="stat-label">累计积分</div></div>
        <div class="stat-card info"><div class="stat-value">${rewards.length}</div><div class="stat-label">奖励次数</div></div>
        <div class="stat-card warning"><div class="stat-value">${Object.keys(typeCount).length}</div><div class="stat-label">类型数</div></div>
      </div>
    `;

    if (rewards.length === 0) {
      body += Utils.emptyState('🏅', '该生暂无奖励记录');
    } else {
      body += '<div class="card"><div class="card-header"><div class="card-title">📖 奖励成长记录</div></div><div class="timeline">';
      rewards.forEach(r => {
        const pts = Number(r.points) || 0;
        body += `
          <div class="timeline-item ${pts >= 0 ? 'success' : 'danger'}">
            <div class="timeline-time">${r.date || ''}</div>
            <div class="timeline-title">${r.icon || '⭐'} ${Utils.escapeHtml(r.typeName || '')} ${pts >= 0 ? '+' : ''}${pts}</div>
            <div class="timeline-content">${Utils.escapeHtml(r.reason || '—')}</div>
          </div>
        `;
      });
      body += '</div></div>';

      body += '<div class="card"><div class="card-header"><div class="card-title">📊 类型汇总</div></div>';
      Object.keys(typeCount).forEach(k => {
        body += `
          <div class="list-item" style="cursor:default;">
            <div class="list-content">
              <div class="list-title">${Utils.escapeHtml(k)}</div>
              <div class="list-subtitle">${typeCount[k].count} 次</div>
            </div>
            <span class="tag tag-primary">${typeCount[k].points} 分</span>
          </div>
        `;
      });
      body += '</div>';
    }

    Utils.showModal(`📖 ${name} · 奖励档案`, body, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">关闭</button>
      <button class="btn btn-outline" style="flex:1;" onclick="RewardsPage.exportStudentLetter('${studentId}')">📄 表扬信</button>
      <button class="btn btn-primary" style="flex:1;" onclick="RewardsPage.printCertificate('${studentId}')">🖨 打印奖状</button>
    `);
  },

  exportStudentLetter(studentId) {
    const rewards = this.getRewards()
      .filter(r => (r.studentId || r.studentName) === studentId)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const student = DB.getByClass('students').find(s => s.id === studentId);
    const cls = DB.getCurrentClass();
    const name = student ? student.name : (rewards[0] ? rewards[0].studentName : '');
    const total = rewards.reduce((s, r) => s + (Number(r.points) || 0), 0);
    const d = new Date();

    const rows = rewards.map(r =>
      `<tr><td>${r.date || ''}</td><td>${r.typeName || ''}</td><td>${r.points >= 0 ? '+' : ''}${r.points || 0}</td><td>${r.reason || ''}</td></tr>`
    ).join('');

    Utils.exportWord(`${name}_表扬信.doc`, '表扬信', `
      <div class="header"><h1>表　扬　信</h1></div>
      <p class="info">${name} 同学家长：</p>
      <p>您好！在 ${d.getFullYear()} 学年中，您的孩子在本班表现优异，累计获得奖励积分 ${total} 分，具体情况如下：</p>
      <table>
        <thead><tr><th>日期</th><th>奖励类型</th><th>积分</th><th>事由</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:14pt;">特此表扬，望继续努力，再创佳绩！</p>
      <div class="footer">
        ${cls.name}　班主任：____________<br>
        ${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日
      </div>
    `);
    Utils.toast('表扬信已导出', 'success');
  },

  printCertificate(studentId) {
    const student = DB.getByClass('students').find(s => s.id === studentId);
    const rewards = this.getRewards().filter(r => (r.studentId || r.studentName) === studentId);
    const name = student ? student.name : (rewards[0] ? rewards[0].studentName : '');
    const total = rewards.reduce((s, r) => s + (Number(r.points) || 0), 0);
    const cls = DB.getCurrentClass();
    const d = new Date();

    const reason = rewards.length > 0
      ? `在本学期中表现突出，累计获得奖励积分 ${total} 分`
      : '在本学期中表现优秀';

    const body = `
      <div class="cert">
        <h1>奖　状</h1>
        <div class="cert-name">${name}</div>
        <div class="cert-body">同学：<br>${reason}，特发此状，以资鼓励。</div>
        <div class="cert-foot">
          ${cls.name}　班主任：__________<br>
          ${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日
        </div>
      </div>
    `;

    Utils.closeModal();
    this.printHtml('奖状', body);
  },

  // 通过隐藏 iframe 打印，避免被浏览器拦截弹窗
  printHtml(title, bodyHtml) {
    const old = document.getElementById('ctwPrintFrame');
    if (old) old.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'ctwPrintFrame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>
      @page { size: A4 landscape; margin: 0; }
      body { margin: 0; font-family: "宋体", SimSun, serif; }
      .cert { width: 100%; height: 100vh; box-sizing: border-box; padding: 90px 70px; text-align: center; }
      .cert h1 { font-size: 42px; letter-spacing: 16px; margin: 0 0 50px; font-weight: 700; }
      .cert-name { font-size: 30px; font-weight: 700; border-bottom: 2px solid #333; display: inline-block; padding: 0 50px 8px; margin-bottom: 34px; }
      .cert-body { font-size: 18px; line-height: 2.4; text-align: left; text-indent: 2em; }
      .cert-foot { margin-top: 80px; text-align: right; font-size: 17px; line-height: 2.2; }
    </style></head><body>${bodyHtml}</body></html>`);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 400);
  },

  // ==================== 标签三：评优评先 ====================

  renderEval() {
    if (this.evalPlanId) return this.renderEvalResult();

    const plans = DB.getByClass('evalPlans');
    let html = `
      <div class="toolbar">
        <button class="btn btn-primary btn-sm" onclick="showEvalPlanModal()">+ 新建评选方案</button>
      </div>
    `;

    if (plans.length === 0) {
      html += Utils.emptyState('🎖', '还没有评选方案，点上方按钮创建（如：三好学生、优秀班干部）');
      return html;
    }

    plans.forEach(p => {
      const w = p.weights || {};
      html += `
        <div class="card" onclick="RewardsPage.openEvalPlan('${p.id}')">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <strong style="font-size:15px;">🎖 ${Utils.escapeHtml(p.name)}</strong>
            <span class="tag tag-primary">${p.quota || 0} 名</span>
          </div>
          <div style="font-size:12px;color:var(--gray-500);margin-top:6px;">
            权重：奖励 ${w.reward || 0}% · 成绩 ${w.grade || 0}% · 考勤 ${w.attendance || 0}% · 违纪 ${w.discipline || 0}%
          </div>
          <div style="font-size:12px;color:var(--gray-500);margin-top:2px;">
            统计范围：${this.rangeLabel(p.range || 'all')}
          </div>
        </div>
      `;
    });

    html += `
      <div class="card">
        <div class="card-header"><div class="card-title">📖 评选说明</div></div>
        <div style="font-size:13px;line-height:1.9;color:var(--gray-600);">
          · 综合得分 = Σ（各维度得分 × 权重），各维度先归一化到 0-100 分<br>
          · 奖励积分取自「奖励记录」，考试成绩取自「成绩分析」，考勤取自「考勤管理」，违纪取自「违纪统计」<br>
          · 违纪扣分标准：轻微 1 分、一般 3 分、严重 6 分，违纪越多该项得分越低<br>
          · 系统按综合得分排名，自动圈定名额内的入选名单，可一键导出上报
        </div>
      </div>
    `;
    return html;
  },

  openEvalPlan(id) {
    this.evalPlanId = id;
    this.render();
  },

  closeEvalPlan() {
    this.evalPlanId = null;
    this.render();
  },

  renderEvalResult() {
    const plan = DB.getByClass('evalPlans').find(p => p.id === this.evalPlanId);
    if (!plan) {
      this.evalPlanId = null;
      return this.renderEval();
    }

    const result = this.computeEval(plan);
    if (!result) {
      return Utils.emptyState('👥', '请先在「学生管理」中添加学生');
    }

    const quota = Number(plan.quota) || 0;
    const selected = result.rows.filter(r => r.rank <= quota);

    let html = `
      <div class="toolbar">
        <button class="btn btn-outline btn-sm" onclick="RewardsPage.closeEvalPlan()">‹ 返回方案</button>
        <button class="btn btn-outline btn-sm" onclick="showEvalPlanModal('${plan.id}')">⚙️ 调整</button>
        <button class="btn btn-primary btn-sm" onclick="RewardsPage.exportEvalResult()">📤 导出结果</button>
      </div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <strong style="font-size:16px;">🎖 ${Utils.escapeHtml(plan.name)}</strong>
          <span class="tag tag-primary">名额 ${quota} 人</span>
        </div>
        <div style="font-size:12px;color:var(--gray-500);margin-top:8px;line-height:1.8;">
          权重：奖励 ${result.weights.reward}% · 成绩 ${result.weights.grade}% · 考勤 ${result.weights.attendance}% · 违纪 ${result.weights.discipline}%<br>
          统计范围：${this.rangeLabel(plan.range || 'all')}　|　成绩来源：${result.exam ? Utils.escapeHtml(result.exam.name) : '暂无考试数据'}
        </div>
      </div>
    `;

    // 入选名单
    html += `
      <div class="card">
        <div class="card-header"><div class="card-title">✅ 入选名单</div></div>
    `;
    if (selected.length === 0) {
      html += '<div style="font-size:13px;color:var(--gray-400);padding:8px 0;">暂无数据</div>';
    } else {
      html += selected.map(r => `
        <div class="rank-row" onclick="RewardsPage.showStudentProfile('${r.studentId}')">
          <div class="rank-badge ${r.rank === 1 ? 'gold' : r.rank === 2 ? 'silver' : r.rank === 3 ? 'bronze' : ''}">${r.rank}</div>
          <div class="rank-name">${Utils.escapeHtml(r.studentName)}</div>
          <div class="mini-bar"><div style="width:${Math.round(r.total)}%;"></div></div>
          <div class="rank-pts">${r.total}</div>
        </div>
      `).join('');
    }
    html += '</div>';

    // 综合排名表
    html += `
      <div class="card" style="padding:0;">
        <div style="padding:14px 14px 0;">
          <div class="card-title">🎯 综合排名（含各维度得分）</div>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>名次</th><th>姓名</th><th>综合</th><th>奖励</th><th>成绩</th><th>考勤</th><th>违纪</th><th>结果</th></tr>
            </thead>
            <tbody>
    `;
    result.rows.forEach(r => {
      const isIn = r.rank <= quota;
      html += `
        <tr onclick="RewardsPage.showStudentProfile('${r.studentId}')">
          <td>${r.rank}</td>
          <td>${Utils.escapeHtml(r.studentName)}</td>
          <td><strong>${r.total}</strong></td>
          <td>${r.rewardRaw}</td>
          <td>${Math.round(r.dim.grade)}</td>
          <td>${Math.round(r.dim.attendance)}</td>
          <td>${r.penaltyRaw}</td>
          <td>${isIn ? '<span class="tag tag-success">入选</span>' : '<span class="tag tag-gray">—</span>'}</td>
        </tr>
      `;
    });
    html += '</tbody></table></div></div>';

    html += `
      <div class="card">
        <div class="card-header"><div class="card-title">📐 计分规则</div></div>
        <div style="font-size:12px;line-height:1.9;color:var(--gray-500);">
          · 奖励分：按本班最高积分归一化（原始积分见「奖励」列）<br>
          · 成绩分：按本班最高总分归一化<br>
          · 考勤分：出勤率（上午 + 下午两次计）<br>
          · 违纪分：无违纪得 100 分，扣分最多者得 0 分，其余线性折算<br>
          · 综合 = 奖励×${result.weights.reward}% + 成绩×${result.weights.grade}% + 考勤×${result.weights.attendance}% + 违纪×${result.weights.discipline}%
        </div>
      </div>
    `;

    return html;
  },

  // 评优评先加权计算
  computeEval(plan) {
    const students = DB.getByClass('students');
    if (students.length === 0) return null;

    const range = plan.range || 'all';
    const rewardMap = this.getPointsMap(range);

    // 成绩：方案指定考试，否则取最近一次
    const exams = DB.getByClass('exams');
    const grades = DB.getByClass('grades');
    let exam = plan.examId ? exams.find(e => e.id === plan.examId) : null;
    if (!exam) exam = exams.length > 0 ? exams[exams.length - 1] : null;
    const examGrades = exam ? grades.filter(g => g.examId === exam.id) : [];

    // 考勤：出勤率
    const attendance = DB.getByClass('attendance');
    const attStats = {};
    attendance.forEach(day => {
      (day.records || []).forEach(rec => {
        if (!rec.studentId) return;
        if (!attStats[rec.studentId]) attStats[rec.studentId] = { present: 0, total: 0 };
        attStats[rec.studentId].total += 2;
        attStats[rec.studentId].present += ((rec.am || '出勤') === '出勤' ? 1 : 0) + ((rec.pm || '出勤') === '出勤' ? 1 : 0);
      });
    });

    // 违纪扣分
    const PENALTY = { '轻微': 1, '一般': 3, '严重': 6 };
    const disMap = {};
    DB.getByClass('discipline').forEach(d => {
      const key = d.studentId || d.studentName;
      disMap[key] = (disMap[key] || 0) + (PENALTY[d.level] || 1);
    });

    const rows = students.map(s => {
      const rw = rewardMap[s.id] || { points: 0, count: 0 };
      const gr = examGrades.find(g => g.studentId === s.id);
      const at = attStats[s.id];
      return {
        studentId: s.id,
        studentName: s.name,
        seatNo: s.seatNo || '',
        rewardRaw: rw.points,
        rewardCount: rw.count,
        gradeRaw: gr ? Number(gr.total) || 0 : 0,
        attRaw: at && at.total > 0 ? (at.present / at.total * 100) : null,
        penaltyRaw: disMap[s.id] || 0
      };
    });

    const maxReward = Math.max(0, ...rows.map(r => r.rewardRaw));
    const maxGrade = Math.max(0, ...rows.map(r => r.gradeRaw));
    const maxPenalty = Math.max(0, ...rows.map(r => r.penaltyRaw));

    const w = plan.weights || { reward: 40, grade: 30, attendance: 20, discipline: 10 };

    rows.forEach(r => {
      r.dim = {
        reward: maxReward > 0 ? r.rewardRaw / maxReward * 100 : 0,
        grade: maxGrade > 0 ? r.gradeRaw / maxGrade * 100 : 0,
        attendance: r.attRaw === null ? 100 : r.attRaw,
        discipline: maxPenalty > 0 ? 100 - (r.penaltyRaw / maxPenalty * 100) : 100
      };
      const score = (r.dim.reward * w.reward + r.dim.grade * w.grade +
        r.dim.attendance * w.attendance + r.dim.discipline * w.discipline) / 100;
      r.total = Math.round(score * 10) / 10;
    });

    rows.sort((a, b) => b.total - a.total || this.compareSeat(a, b));
    rows.forEach((r, i) => { r.rank = i + 1; });

    return { rows: rows, exam: exam, weights: w, range: range };
  },

  exportEvalResult() {
    const plan = DB.getByClass('evalPlans').find(p => p.id === this.evalPlanId);
    if (!plan) return;
    const result = this.computeEval(plan);
    if (!result) {
      Utils.toast('暂无数据可导出', 'error');
      return;
    }
    const quota = Number(plan.quota) || 0;
    const cls = DB.getCurrentClass();

    let csv = `${cls.name}_${plan.name}_评选结果\n`;
    csv += `权重：奖励${result.weights.reward}% 成绩${result.weights.grade}% 考勤${result.weights.attendance}% 违纪${result.weights.discipline}%\n`;
    csv += `名次,姓名,综合得分,奖励积分,成绩得分,考勤得分,违纪扣分,是否入选\n`;
    result.rows.forEach(r => {
      csv += `${r.rank},${r.studentName},${r.total},${r.rewardRaw},${Math.round(r.dim.grade)},${Math.round(r.dim.attendance)},${r.penaltyRaw},${r.rank <= quota ? '入选' : ''}\n`;
    });
    Utils.downloadFile(`${cls.name}_${plan.name}_评选结果.csv`, '\ufeff' + csv, 'text/csv');
    Utils.toast('评选结果已导出', 'success');
  },

  // ==================== 标签四：获奖记录（原班级活动） ====================

  renderAwards() {
    const awards = DB.getByClass('awards');
    let html = `
      <div class="toolbar">
        <button class="btn btn-primary btn-sm" onclick="showAwardRecordModal()">+ 添加获奖</button>
        <button class="btn btn-outline btn-sm" onclick="RewardsPage.exportAwards()">📤 导出</button>
      </div>
    `;

    if (awards.length === 0) {
      html += Utils.emptyState('🏆', '暂无获奖记录，点上方按钮添加');
      return html;
    }

    html += `
      <div class="stat-grid">
        <div class="stat-card warning"><div class="stat-value">${awards.length}</div><div class="stat-label">总获奖数</div></div>
        <div class="stat-card success"><div class="stat-value">${awards.filter(a => a.level === '国家级').length}</div><div class="stat-label">国家级</div></div>
        <div class="stat-card info"><div class="stat-value">${awards.filter(a => a.level === '省级').length}</div><div class="stat-label">省级</div></div>
        <div class="stat-card"><div class="stat-value">${awards.filter(a => a.level === '市级').length}</div><div class="stat-label">市级</div></div>
      </div>
      <div class="card" style="padding:0;">
    `;

    const sorted = [...awards].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    sorted.forEach(a => {
      const levelColor = a.level === '国家级' ? 'danger' : a.level === '省级' ? 'warning' : a.level === '市级' ? 'info' : a.level === '校级' ? 'success' : 'gray';
      html += `
        <div class="list-item" onclick="RewardsPage.showAwardDetail('${a.id}')">
          <div class="list-avatar" style="background:#fef3c7;color:#92400e;">🏆</div>
          <div class="list-content">
            <div class="list-title">${Utils.escapeHtml(a.awardName)}</div>
            <div class="list-subtitle">${Utils.escapeHtml(a.studentName)} · ${a.date || ''}${a.organization ? ' · ' + Utils.escapeHtml(a.organization) : ''}</div>
          </div>
          <span class="tag tag-${levelColor}">${a.level}</span>
        </div>
      `;
    });
    html += '</div>';
    return html;
  },

  showAwardDetail(id) {
    const award = (DB.get('awards') || []).find(a => a.id === id);
    if (!award) return;
    const levelColor = award.level === '国家级' ? 'danger' : award.level === '省级' ? 'warning' : award.level === '市级' ? 'info' : award.level === '校级' ? 'success' : 'gray';
    Utils.showModal('获奖详情', `
      <div class="card">
        <div style="font-weight:700;font-size:16px;">🏆 ${Utils.escapeHtml(award.awardName)}</div>
        <div style="display:grid;gap:8px;margin-top:12px;font-size:14px;">
          <div><span style="color:var(--gray-500);">获奖人：</span>${Utils.escapeHtml(award.studentName)}</div>
          <div><span style="color:var(--gray-500);">级别：</span><span class="tag tag-${levelColor}">${award.level}</span></div>
          <div><span style="color:var(--gray-500);">日期：</span>${award.date || ''}</div>
          <div><span style="color:var(--gray-500);">颁发单位：</span>${Utils.escapeHtml(award.organization || '')}</div>
          <div><span style="color:var(--gray-500);">描述：</span>${Utils.escapeHtml(award.description || '')}</div>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">关闭</button>
      <button class="btn btn-outline" style="flex:1;" onclick="showAwardRecordModal('${award.id}')">编辑</button>
      <button class="btn btn-danger" style="flex:1;" onclick="deleteAwardRecord('${award.id}')">🗑 删除</button>
    `);
  },

  exportAwards() {
    const rows = DB.getByClass('awards');
    if (rows.length === 0) {
      Utils.toast('暂无数据可导出', 'error');
      return;
    }
    const cls = DB.getCurrentClass();
    let csv = '日期,学生,奖项名称,级别,颁发单位,描述\n';
    rows.forEach(a => {
      csv += [a.date || '', a.studentName || '', a.awardName || '', a.level || '', a.organization || '', a.description || '']
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    Utils.downloadFile(`${cls.name}_获奖记录_${Utils.today()}.csv`, '\ufeff' + csv, 'text/csv');
    Utils.toast('已导出', 'success');
  },

  // ==================== 标签五：类型设置 ====================

  renderConfig() {
    const types = this.getAllTypes();
    let html = `
      <div class="toolbar">
        <button class="btn btn-primary btn-sm" onclick="showRewardTypeModal()">+ 添加类型</button>
        <button class="btn btn-outline btn-sm" onclick="RewardsPage.resetTypes()">↺ 恢复默认</button>
      </div>
      <div class="card" style="padding:0;">
    `;

    if (types.length === 0) {
      html += '<div style="padding:16px;">' + Utils.emptyState('⭐', '暂无奖励类型') + '</div>';
    } else {
      types.forEach(t => {
        const pts = Number(t.points) || 0;
        html += `
          <div class="list-item" style="cursor:default;">
            <div class="list-avatar" style="background:var(--primary-bg);color:var(--primary);">${t.icon || '⭐'}</div>
            <div class="list-content">
              <div class="list-title">${Utils.escapeHtml(t.name)}</div>
              <div class="list-subtitle">${pts >= 0 ? '+' : ''}${pts} 分 · ${t.active === false ? '已停用' : '启用中'}</div>
            </div>
            <div style="display:flex;gap:6px;align-items:center;">
              <button class="btn btn-sm btn-outline" onclick="event.stopPropagation();showRewardTypeModal('${t.id}')">编辑</button>
              <button class="btn btn-sm btn-outline" onclick="event.stopPropagation();deleteRewardType('${t.id}')">删除</button>
            </div>
          </div>
        `;
      });
    }
    html += '</div>';

    html += `
      <div class="card">
        <div class="card-header"><div class="card-title">📖 使用说明</div></div>
        <div style="font-size:13px;line-height:1.9;color:var(--gray-600);">
          · 奖励类型与分值可自由调整，停用后不再出现在记录界面，但历史记录保留<br>
          · 积分排行榜按本周 / 本月 / 本学期 / 全部实时汇总，点学生可看个人奖励档案<br>
          · 评优评先会自动调用「奖励积分、考试成绩、考勤出勤、违纪扣分」四项数据，按权重算综合得分<br>
          · 违纪扣分标准：轻微 1 分、一般 3 分、严重 6 分
        </div>
      </div>
    `;
    return html;
  },

  resetTypes() {
    Utils.confirm('将奖励类型恢复为默认的 9 项（已有的奖励记录不会受影响），确定继续？', () => {
      DB.set('rewardTypes', DB._defaultRewardTypes());
      RewardsPage.render();
      Utils.toast('已恢复默认类型', 'success');
    });
  }
};

// ==================== 记录奖励 ====================

function showRewardModal(presetStudentId, editId) {
  const students = DB.getByClass('students');
  if (students.length === 0) {
    Utils.toast('请先在「学生管理」中添加学生', 'error');
    return;
  }
  const types = RewardsPage.getTypes();
  if (types.length === 0) {
    Utils.toast('请先在「类型设置」中添加奖励类型', 'error');
    return;
  }

  const editing = editId ? (DB.get('rewards') || []).find(r => r.id === editId) : null;
  const isEdit = !!editing;

  // 编辑模式：锁定学生，走单条修改
  if (isEdit) {
    const stu = students.find(s => s.id === editing.studentId);
    Utils.showModal('编辑奖励记录', `
      <div class="form-group">
        <label class="form-label">学生</label>
        <input class="form-input" value="${Utils.escapeHtml(editing.studentName)}" disabled>
      </div>
      <div class="form-group">
        <label class="form-label">奖励类型</label>
        <div class="type-chips" id="rwTypeChips">
          ${types.map(t => `
            <div class="type-chip ${t.id === editing.typeId ? 'on' : ''}" data-tid="${t.id}" data-pts="${t.points}" data-name="${Utils.escapeHtml(t.name)}" data-icon="${t.icon || '⭐'}" onclick="RewardsPage.pickType(this)">
              ${t.icon || '⭐'} ${t.name} ${t.points >= 0 ? '+' : ''}${t.points}
            </div>`).join('')}
        </div>
        <input type="hidden" id="rwTypeId" value="${editing.typeId || ''}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">积分</label>
          <input class="form-input" id="rwPoints" type="number" value="${editing.points || 0}">
        </div>
        <div class="form-group">
          <label class="form-label">日期</label>
          <input class="form-input" id="rwDate" type="date" value="${editing.date || Utils.today()}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">事由</label>
        <input class="form-input" id="rwReason" value="${Utils.escapeHtml(editing.reason || '')}" placeholder="如：主动帮助同学">
      </div>
      <div class="form-group">
        <label class="form-label">记录人</label>
        <input class="form-input" id="rwRecorder" value="${Utils.escapeHtml(editing.recorder || '班主任')}">
      </div>
    `, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
      <button class="btn btn-primary" style="flex:1;" onclick="saveReward('${editing.id}')">保存</button>
    `);
    return;
  }

  // 新增模式：可多选学生
  const presetCount = presetStudentId ? 1 : 0;
  Utils.showModal('记录奖励', `
    <div class="form-group">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <label class="form-label" style="margin:0;">学生（可多选）*</label>
        <button class="btn btn-sm btn-outline" onclick="RewardsPage.toggleAllStudents()">全选 / 反选</button>
      </div>
      <div class="pick-grid" id="rwStudentGrid">
        ${students.map(s => `
          <label class="pick-item ${presetStudentId === s.id ? 'on' : ''}">
            <input type="checkbox" class="rw-stu" value="${s.id}" data-name="${Utils.escapeHtml(s.name)}"
              ${presetStudentId === s.id ? 'checked' : ''} onchange="RewardsPage.onPickChange(this)">
            <span>${s.seatNo ? s.seatNo + '.' : ''}${Utils.escapeHtml(s.name)}</span>
          </label>
        `).join('')}
      </div>
      <div style="font-size:12px;color:var(--gray-400);margin-top:6px;" id="rwCount">已选 ${presetCount} 人</div>
    </div>

    <div class="form-group">
      <label class="form-label">奖励类型 *</label>
      <div class="type-chips" id="rwTypeChips">
        ${types.map((t, i) => `
          <div class="type-chip ${i === 0 ? 'on' : ''}" data-tid="${t.id}" data-pts="${t.points}" data-name="${Utils.escapeHtml(t.name)}" data-icon="${t.icon || '⭐'}" onclick="RewardsPage.pickType(this)">
            ${t.icon || '⭐'} ${t.name} ${t.points >= 0 ? '+' : ''}${t.points}
          </div>`).join('')}
      </div>
      <input type="hidden" id="rwTypeId" value="${types[0].id}">
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">积分（可调）</label>
        <input class="form-input" id="rwPoints" type="number" value="${types[0].points}">
      </div>
      <div class="form-group">
        <label class="form-label">日期</label>
        <input class="form-input" id="rwDate" type="date" value="${Utils.today()}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">事由</label>
      <input class="form-input" id="rwReason" placeholder="如：主动帮助同学">
    </div>
    <div class="form-group">
      <label class="form-label">记录人</label>
      <input class="form-input" id="rwRecorder" value="班主任">
    </div>
  `, `
    <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
    <button class="btn btn-primary" style="flex:1;" onclick="saveReward(null)">保存</button>
  `);
}

function saveReward(editId) {
  const typeId = (document.getElementById('rwTypeId') || {}).value;
  const type = (DB.get('rewardTypes') || []).find(t => t.id === typeId);
  if (!type) {
    Utils.toast('请选择奖励类型', 'error');
    return;
  }
  const pointsRaw = (document.getElementById('rwPoints') || {}).value;
  const points = Number(pointsRaw);
  if (pointsRaw === '' || isNaN(points)) {
    Utils.toast('请输入有效积分', 'error');
    return;
  }
  const date = (document.getElementById('rwDate') || {}).value || Utils.today();
  const reason = ((document.getElementById('rwReason') || {}).value || '').trim();
  const recorder = ((document.getElementById('rwRecorder') || {}).value || '').trim() || '班主任';

  // 编辑单条
  if (editId) {
    DB.update('rewards', editId, {
      typeId: type.id,
      typeName: type.name,
      icon: type.icon || '⭐',
      points: points,
      date: date,
      reason: reason,
      recorder: recorder
    });
    Utils.closeModal();
    RewardsPage.render();
    Utils.toast('已保存', 'success');
    return;
  }

  const checked = Array.from(document.querySelectorAll('.rw-stu:checked'));
  if (checked.length === 0) {
    Utils.toast('请至少选择一名学生', 'error');
    return;
  }

  checked.forEach(cb => {
    DB.add('rewards', {
      studentId: cb.value,
      studentName: cb.dataset.name,
      typeId: type.id,
      typeName: type.name,
      icon: type.icon || '⭐',
      points: points,
      date: date,
      reason: reason,
      recorder: recorder
    });
  });

  Utils.closeModal();
  RewardsPage.render();
  Utils.toast(`已为 ${checked.length} 名学生记录奖励`, 'success');
}

function deleteReward(id) {
  Utils.confirm('确定删除这条奖励记录吗？', () => {
    DB.delete('rewards', id);
    Utils.closeModal();
    RewardsPage.render();
    Utils.toast('已删除', 'success');
  });
}

// ==================== 奖励类型管理 ====================

function showRewardTypeModal(id) {
  const type = id ? (DB.get('rewardTypes') || []).find(t => t.id === id) : null;
  const isEdit = !!type;

  Utils.showModal(isEdit ? '编辑奖励类型' : '添加奖励类型', `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">图标</label>
        <input class="form-input" id="rtIcon" value="${type ? (type.icon || '⭐') : '⭐'}" placeholder="如 ⭐">
      </div>
      <div class="form-group">
        <label class="form-label">名称 *</label>
        <input class="form-input" id="rtName" value="${type ? Utils.escapeHtml(type.name) : ''}" placeholder="如：进步之星">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">分值（可为负）</label>
        <input class="form-input" id="rtPoints" type="number" value="${type ? (Number(type.points) || 0) : 1}">
      </div>
      <div class="form-group">
        <label class="form-label">状态</label>
        <select class="form-select" id="rtActive">
          <option value="1" ${!type || type.active !== false ? 'selected' : ''}>启用</option>
          <option value="0" ${type && type.active === false ? 'selected' : ''}>停用</option>
        </select>
      </div>
    </div>
    <div style="font-size:12px;color:var(--gray-500);">
      停用后该类型不再出现在「记录奖励」界面，已产生的历史记录不受影响。
    </div>
  `, `
    <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
    <button class="btn btn-primary" style="flex:1;" onclick="saveRewardType(${isEdit ? `'${id}'` : 'null'})">保存</button>
  `);
}

function saveRewardType(id) {
  const name = (document.getElementById('rtName').value || '').trim();
  if (!name) {
    Utils.toast('请输入类型名称', 'error');
    return;
  }
  const points = Number(document.getElementById('rtPoints').value);
  if (isNaN(points)) {
    Utils.toast('请输入有效分值', 'error');
    return;
  }
  const data = {
    icon: (document.getElementById('rtIcon').value || '⭐').trim(),
    name: name,
    points: points,
    active: document.getElementById('rtActive').value === '1'
  };

  const list = DB.get('rewardTypes') || [];
  // 重名校验
  if (list.some(t => t.name === name && t.id !== id)) {
    Utils.toast('已存在同名奖励类型', 'error');
    return;
  }

  if (id) DB.update('rewardTypes', id, data);
  else DB.add('rewardTypes', data);

  Utils.closeModal();
  RewardsPage.render();
  Utils.toast('已保存', 'success');
}

function deleteRewardType(id) {
  const type = (DB.get('rewardTypes') || []).find(t => t.id === id);
  const used = (DB.get('rewards') || []).filter(r => r.typeId === id).length;
  const tip = used > 0
    ? `「${type ? type.name : ''}」已被 ${used} 条奖励记录使用，删除后这些记录仍会保留原有名称与分值。确定删除吗？`
    : '确定删除这个奖励类型吗？';
  Utils.confirm(tip, () => {
    DB.delete('rewardTypes', id);
    Utils.closeModal();
    RewardsPage.render();
    Utils.toast('已删除', 'success');
  });
}

// ==================== 评选方案 ====================

function showEvalPlanModal(id) {
  const plan = id ? (DB.get('evalPlans') || []).find(p => p.id === id) : null;
  const isEdit = !!plan;
  const exams = DB.getByClass('exams');
  const w = (plan && plan.weights) || { reward: 40, grade: 30, attendance: 20, discipline: 10 };
  const range = (plan && plan.range) || 'all';
  const rangeOpts = [['week', '本周'], ['month', '本月'], ['term', '本学期'], ['all', '全部']];

  Utils.showModal(isEdit ? '调整评选方案' : '新建评选方案', `
    <div class="form-group">
      <label class="form-label">评选项目 *</label>
      <input class="form-input" id="epName" value="${plan ? Utils.escapeHtml(plan.name) : ''}" placeholder="如：三好学生">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">评选名额</label>
        <input class="form-input" id="epQuota" type="number" min="1" value="${plan ? (plan.quota || 5) : 5}">
      </div>
      <div class="form-group">
        <label class="form-label">奖励统计范围</label>
        <select class="form-select" id="epRange">
          ${rangeOpts.map(([v, l]) => `<option value="${v}" ${range === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">成绩来源</label>
      <select class="form-select" id="epExam">
        <option value="">自动（取最近一次考试）</option>
        ${exams.map(e => `<option value="${e.id}" ${plan && plan.examId === e.id ? 'selected' : ''}>${Utils.escapeHtml(e.name)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">维度权重（%）</label>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" style="font-weight:400;font-size:12px;">奖励积分</label>
          <input class="form-input" id="epW1" type="number" min="0" max="100" value="${w.reward || 0}">
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight:400;font-size:12px;">考试成绩</label>
          <input class="form-input" id="epW2" type="number" min="0" max="100" value="${w.grade || 0}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" style="font-weight:400;font-size:12px;">考勤出勤</label>
          <input class="form-input" id="epW3" type="number" min="0" max="100" value="${w.attendance || 0}">
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight:400;font-size:12px;">违纪扣分</label>
          <input class="form-input" id="epW4" type="number" min="0" max="100" value="${w.discipline || 0}">
        </div>
      </div>
      <div style="font-size:12px;color:var(--gray-500);margin-top:6px;">
        奖励=日常奖励积分 · 成绩=考试总分 · 考勤=出勤率 · 违纪=反向扣分（四项建议合计 100）
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
    <button class="btn btn-primary" style="flex:1;" onclick="saveEvalPlan(${isEdit ? `'${id}'` : 'null'})">保存并计算</button>
  `);
}

function saveEvalPlan(id) {
  const name = (document.getElementById('epName').value || '').trim();
  if (!name) {
    Utils.toast('请输入评选项目名称', 'error');
    return;
  }
  const quota = Number(document.getElementById('epQuota').value) || 1;
  const data = {
    name: name,
    quota: quota,
    range: document.getElementById('epRange').value,
    examId: document.getElementById('epExam').value,
    weights: {
      reward: Number(document.getElementById('epW1').value) || 0,
      grade: Number(document.getElementById('epW2').value) || 0,
      attendance: Number(document.getElementById('epW3').value) || 0,
      discipline: Number(document.getElementById('epW4').value) || 0
    }
  };

  const sum = Object.keys(data.weights).reduce((s, k) => s + data.weights[k], 0);
  if (sum <= 0) {
    Utils.toast('权重合计不能为 0', 'error');
    return;
  }

  let planId = id;
  if (id) DB.update('evalPlans', id, data);
  else planId = DB.add('evalPlans', data).id;

  RewardsPage.evalPlanId = planId;
  RewardsPage.currentTab = 'eval';
  Utils.closeModal();
  RewardsPage.render();
  Utils.toast(sum !== 100 ? `已保存（权重合计 ${sum}%，非 100 也可计算）` : '已保存', 'success');
}

// ==================== 获奖记录（原班级活动迁移） ====================

function showAwardRecordModal(id) {
  const award = id ? (DB.get('awards') || []).find(a => a.id === id) : null;
  const isEdit = !!award;
  const students = DB.getByClass('students');

  Utils.showModal(isEdit ? '编辑获奖记录' : '添加获奖记录', `
    <div class="form-group">
      <label class="form-label">学生姓名 *</label>
      <input class="form-input" id="awStudentName" list="awNameList" value="${award ? Utils.escapeHtml(award.studentName) : ''}" placeholder="输入或选择学生姓名">
      <datalist id="awNameList">
        ${students.map(s => `<option value="${Utils.escapeHtml(s.name)}"></option>`).join('')}
      </datalist>
    </div>
    <div class="form-group">
      <label class="form-label">奖项名称 *</label>
      <input class="form-input" id="awName" value="${award ? Utils.escapeHtml(award.awardName) : ''}" placeholder="如：数学竞赛一等奖">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">级别</label>
        <select class="form-select" id="awLevel">
          ${['校级', '区级', '市级', '省级', '国家级'].map(l =>
            `<option value="${l}" ${award && award.level === l ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">日期</label>
        <input class="form-input" id="awDate" type="date" value="${award ? award.date : Utils.today()}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">颁发单位</label>
      <input class="form-input" id="awOrg" value="${award ? Utils.escapeHtml(award.organization || '') : ''}" placeholder="如：市教育局">
    </div>
    <div class="form-group">
      <label class="form-label">描述</label>
      <textarea class="form-textarea" id="awDesc">${award ? Utils.escapeHtml(award.description || '') : ''}</textarea>
    </div>
  `, `
    <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
    <button class="btn btn-primary" style="flex:1;" onclick="saveAwardRecord(${isEdit ? `'${id}'` : 'null'})">保存</button>
  `);
}

function saveAwardRecord(id) {
  const studentName = (document.getElementById('awStudentName').value || '').trim();
  if (!studentName) {
    Utils.toast('请输入或选择学生姓名', 'error');
    return;
  }
  const awardName = (document.getElementById('awName').value || '').trim();
  if (!awardName) {
    Utils.toast('请输入奖项名称', 'error');
    return;
  }
  const data = {
    studentName: studentName,
    awardName: awardName,
    level: document.getElementById('awLevel').value,
    date: document.getElementById('awDate').value || Utils.today(),
    organization: (document.getElementById('awOrg').value || '').trim(),
    description: (document.getElementById('awDesc').value || '').trim()
  };
  if (id) DB.update('awards', id, data);
  else DB.add('awards', data);
  Utils.closeModal();
  RewardsPage.render();
  Utils.toast('已保存', 'success');
}

function deleteAwardRecord(id) {
  Utils.confirm('确定删除这条获奖记录吗？', () => {
    DB.delete('awards', id);
    Utils.closeModal();
    RewardsPage.render();
    Utils.toast('已删除', 'success');
  });
}

// ==================== 学生多选辅助 ====================

RewardsPage.onPickChange = function (checkbox) {
  const label = checkbox.closest('.pick-item');
  if (label) label.classList.toggle('on', checkbox.checked);
  this.updatePickCount();
};

RewardsPage.updatePickCount = function () {
  const el = document.getElementById('rwCount');
  if (!el) return;
  el.textContent = `已选 ${document.querySelectorAll('.rw-stu:checked').length} 人`;
};

RewardsPage.toggleAllStudents = function () {
  const boxes = Array.from(document.querySelectorAll('.rw-stu'));
  const allChecked = boxes.length > 0 && boxes.every(b => b.checked);
  boxes.forEach(b => {
    b.checked = !allChecked;
    const label = b.closest('.pick-item');
    if (label) label.classList.toggle('on', b.checked);
  });
  this.updatePickCount();
};

RewardsPage.pickType = function (el) {
  const wrap = el.closest('.type-chips');
  if (wrap) wrap.querySelectorAll('.type-chip').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
  const hidden = document.getElementById('rwTypeId');
  if (hidden) hidden.value = el.dataset.tid;
  const pts = document.getElementById('rwPoints');
  if (pts) pts.value = el.dataset.pts;
};
