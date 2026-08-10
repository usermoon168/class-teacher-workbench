/**
 * 作业管理页面
 */
const HomeworkPage = {
  currentTab: 'list',

  render() {
    let html = `
      <div class="page-title">📝 作业管理</div>
      <div class="page-subtitle">作业布置 · 提交率统计 · 完成情况</div>
    `;

    html += `
      <div class="toolbar">
        <button class="btn btn-primary btn-sm" onclick="showHomeworkModal()">+ 布置作业</button>
      </div>
    `;

    const homeworks = DB.getByClass('homework');
    const records = DB.getByClass('homeworkRecords');

    // 统计
    const today = Utils.today();
    const todayHw = homeworks.filter(h => h.dueDate === today);
    const pendingHw = homeworks.filter(h => h.dueDate >= today);
    const totalSubmitRate = homeworks.length > 0 ?
      homeworks.map(h => {
        const hwRecords = records.filter(r => r.homeworkId === h.id);
        return hwRecords.length > 0 ? hwRecords.filter(r => r.status === '已提交').length / hwRecords.length : 0;
      }).reduce((a, b) => a + b, 0) / homeworks.length * 100 : 0;

    html += `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-value">${homeworks.length}</div><div class="stat-label">作业总数</div></div>
        <div class="stat-card warning"><div class="stat-value">${pendingHw.length}</div><div class="stat-label">待完成</div></div>
        <div class="stat-card info"><div class="stat-value">${todayHw.length}</div><div class="stat-label">今日截止</div></div>
        <div class="stat-card success"><div class="stat-value">${totalSubmitRate.toFixed(0)}%</div><div class="stat-label">平均提交率</div></div>
      </div>
    `;

    // 标签
    html += `
      <div class="segment-control">
        <div class="segment-item ${this.currentTab === 'list' ? 'active' : ''}" onclick="HomeworkPage.switchTab('list')">📋 作业列表</div>
        <div class="segment-item ${this.currentTab === 'stats' ? 'active' : ''}" onclick="HomeworkPage.switchTab('stats')">📊 提交统计</div>
        <div class="segment-item ${this.currentTab === 'trend' ? 'active' : ''}" onclick="HomeworkPage.switchTab('trend')">📈 质量趋势</div>
        <div class="segment-item ${this.currentTab === 'profile' ? 'active' : ''}" onclick="HomeworkPage.switchTab('profile')">👤 学生档案</div>
      </div>
    `;

    if (this.currentTab === 'list') {
      html += this.renderList(homeworks, records);
    } else if (this.currentTab === 'stats') {
      html += this.renderStats(homeworks, records);
    } else if (this.currentTab === 'trend') {
      html += this.renderTrend(homeworks, records);
    } else {
      html += this.renderProfile(homeworks, records);
    }

    document.getElementById('mainContent').innerHTML = html;

    if (this.currentTab === 'stats' && homeworks.length > 0) {
      this.renderChart(homeworks, records);
    }
    if (this.currentTab === 'trend' && homeworks.length > 0) {
      this.renderTrendChart(homeworks, records);
    }
  },

  renderList(homeworks, records) {
    if (homeworks.length === 0) {
      return Utils.emptyState('📝', '暂无作业，点击"布置作业"开始');
    }
    const sorted = [...homeworks].sort((a, b) => b.assignedDate.localeCompare(a.assignedDate));
    let html = '';
    sorted.forEach(h => {
      const hwRecords = records.filter(r => r.homeworkId === h.id);
      const submitted = hwRecords.filter(r => r.status === '已提交').length;
      const rate = hwRecords.length > 0 ? (submitted / hwRecords.length * 100).toFixed(0) : 0;
      const isOverdue = h.dueDate < Utils.today();
      const isToday = h.dueDate === Utils.today();

      html += `
        <div class="card" onclick="HomeworkPage.showDetail('${h.id}')">
          <div style="display:flex;justify-content:space-between;align-items:start;">
            <div style="flex:1;">
              <div style="font-weight:700;font-size:15px;">${h.subject} · ${h.title}</div>
              <div style="font-size:13px;color:var(--gray-500);margin-top:4px;">布置：${h.assignedDate} | 截止：${h.dueDate}</div>
              <div style="font-size:13px;color:var(--gray-600);margin-top:4px;">${h.content}</div>
            </div>
            <span class="tag tag-${isOverdue ? 'gray' : isToday ? 'danger' : 'info'}">${isOverdue ? '已截止' : isToday ? '今日截止' : '进行中'}</span>
          </div>
          <div style="margin-top:10px;">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
              <span style="color:var(--gray-500);">提交率</span>
              <span style="font-weight:600;color:${rate >= 80 ? 'var(--success)' : rate >= 60 ? 'var(--warning)' : 'var(--danger)'};">${submitted}/${hwRecords.length} (${rate}%)</span>
            </div>
            <div class="progress-bar">
              <div class="progress-bar-fill ${rate >= 80 ? 'success' : rate >= 60 ? '' : 'danger'}" style="width:${rate}%;"></div>
            </div>
          </div>
        </div>
      `;
    });
    return html;
  },

  renderStats(homeworks, records) {
    if (homeworks.length === 0) {
      return Utils.emptyState('📊', '暂无统计数据');
    }
    let html = '<div class="card"><div class="card-header"><div class="card-title">📊 各作业提交率</div></div><div class="chart-container large"><canvas id="submitRateChart"></canvas></div></div>';

    // 最近作业质量分布
    const recentHw = homeworks[homeworks.length - 1];
    if (recentHw) {
      const hwRecords = records.filter(r => r.homeworkId === recentHw.id && r.status === '已提交');
      const qualityCounts = Utils.groupBy(hwRecords, 'quality');
      html += `
        <div class="card">
          <div class="card-header"><div class="card-title">📊 ${recentHw.subject} · ${recentHw.title} 质量分布</div></div>
          <div class="chart-container"><canvas id="qualityChart"></canvas></div>
        </div>
      `;
    }

    return html;
  },

  renderChart(homeworks, records) {
    const data = homeworks.map(h => {
      const hwRecords = records.filter(r => r.homeworkId === h.id);
      return hwRecords.length > 0 ? (hwRecords.filter(r => r.status === '已提交').length / hwRecords.length * 100).toFixed(0) : 0;
    });
    Utils.destroyChart('submitRateChart');
    new Chart(document.getElementById('submitRateChart'), {
      type: 'bar',
      data: {
        labels: homeworks.map(h => `${h.subject}\n${h.title.substring(0,6)}`),
        datasets: [{
          label: '提交率(%)',
          data: data,
          backgroundColor: '#4f46e5',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, max: 100 } }
      }
    });

    const recentHw = homeworks[homeworks.length - 1];
    if (recentHw) {
      const hwRecords = records.filter(r => r.homeworkId === recentHw.id && r.status === '已提交');
      const qualityCounts = Utils.groupBy(hwRecords, 'quality');
      Utils.destroyChart('qualityChart');
      new Chart(document.getElementById('qualityChart'), {
        type: 'pie',
        data: {
          labels: Object.keys(qualityCounts),
          datasets: [{
            data: Object.values(qualityCounts).map(arr => arr.length),
            backgroundColor: ['#10b981', '#0ea5e9', '#f59e0b', '#ef4444']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'right' } }
        }
      });
    }
  },

  // 质量趋势
  renderTrend(homeworks, records) {
    if (homeworks.length === 0) {
      return Utils.emptyState('📈', '暂无质量趋势数据');
    }
    let html = `
      <div class="card">
        <div class="card-header"><div class="card-title">📈 作业质量趋势</div></div>
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">展示各次作业优/良/中/差的比例变化</div>
        <div class="chart-container large"><canvas id="qualityTrendChart"></canvas></div>
      </div>
    `;

    // 质量汇总表格
    html += `
      <div class="card">
        <div class="card-header"><div class="card-title">📋 质量分布明细</div></div>
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr><th>作业</th><th>优</th><th>良</th><th>中</th><th>差</th><th>未评</th><th>未交</th></tr>
            </thead>
            <tbody>
    `;
    const sorted = [...homeworks].sort((a, b) => a.assignedDate.localeCompare(b.assignedDate));
    sorted.forEach(h => {
      const hwRecords = records.filter(r => r.homeworkId === h.id);
      const you = hwRecords.filter(r => r.quality === '优').length;
      const liang = hwRecords.filter(r => r.quality === '良').length;
      const zhong = hwRecords.filter(r => r.quality === '中').length;
      const cha = hwRecords.filter(r => r.quality === '差').length;
      const notRated = hwRecords.filter(r => r.status === '已提交' && !r.quality).length;
      const notSubmitted = hwRecords.filter(r => r.status === '未提交').length;
      html += `
        <tr>
          <td style="font-size:12px;">${h.subject}·${h.title.substring(0, 8)}</td>
          <td style="color:var(--success);font-weight:600;">${you}</td>
          <td style="color:var(--info);font-weight:600;">${liang}</td>
          <td style="color:var(--warning);font-weight:600;">${zhong}</td>
          <td style="color:var(--danger);font-weight:600;">${cha}</td>
          <td style="color:var(--gray-400);">${notRated}</td>
          <td style="color:var(--danger);">${notSubmitted}</td>
        </tr>
      `;
    });
    html += '</tbody></table></div></div>';

    return html;
  },

  renderTrendChart(homeworks, records) {
    const sorted = [...homeworks].sort((a, b) => a.assignedDate.localeCompare(b.assignedDate));
    const labels = sorted.map(h => h.title.substring(0, 6));
    const youData = [], liangData = [], zhongData = [], chaData = [];
    sorted.forEach(h => {
      const hwRecords = records.filter(r => r.homeworkId === h.id && r.status === '已提交');
      const total = hwRecords.length || 1;
      youData.push((hwRecords.filter(r => r.quality === '优').length / total * 100).toFixed(0));
      liangData.push((hwRecords.filter(r => r.quality === '良').length / total * 100).toFixed(0));
      zhongData.push((hwRecords.filter(r => r.quality === '中').length / total * 100).toFixed(0));
      chaData.push((hwRecords.filter(r => r.quality === '差').length / total * 100).toFixed(0));
    });

    Utils.destroyChart('qualityTrendChart');
    new Chart(document.getElementById('qualityTrendChart'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: '优(%)', data: youData, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.3, fill: false },
          { label: '良(%)', data: liangData, borderColor: '#0ea5e9', backgroundColor: 'rgba(14,165,233,0.1)', tension: 0.3, fill: false },
          { label: '中(%)', data: zhongData, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', tension: 0.3, fill: false },
          { label: '差(%)', data: chaData, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.3, fill: false }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } }
      }
    });
  },

  // 学生档案
  renderProfile(homeworks, records) {
    if (homeworks.length === 0) {
      return Utils.emptyState('👤', '暂无学生作业档案');
    }
    const students = DB.getByClass('students');
    if (students.length === 0) return Utils.emptyState('👤', '暂无学生');

    // 统计每个学生
    const studentStats = students.map(s => {
      const sRecords = records.filter(r => r.studentId === s.id);
      const submitted = sRecords.filter(r => r.status === '已提交');
      const unsubmitted = sRecords.filter(r => r.status === '未提交');
      const submitRate = sRecords.length > 0 ? (submitted.length / sRecords.length * 100).toFixed(0) : 100;
      const youCount = submitted.filter(r => r.quality === '优').length;
      const liangCount = submitted.filter(r => r.quality === '良').length;
      const zhongCount = submitted.filter(r => r.quality === '中').length;
      const chaCount = submitted.filter(r => r.quality === '差').length;
      return {
        student: s,
        total: sRecords.length,
        submitted: submitted.length,
        unsubmitted: unsubmitted.length,
        submitRate: parseFloat(submitRate),
        youCount, liangCount, zhongCount, chaCount
      };
    });

    // 排序：未交多的在前
    studentStats.sort((a, b) => {
      if (b.unsubmitted !== a.unsubmitted) return b.unsubmitted - a.unsubmitted;
      return a.submitRate - b.submitRate;
    });

    // 预警学生
    const warningStudents = studentStats.filter(s => s.unsubmitted >= 3);
    if (warningStudents.length > 0) {
      let warningHtml = `
        <div class="card" style="border-left:4px solid var(--danger);">
          <div class="card-header"><div class="card-title" style="color:var(--danger);">⚠️ 作业预警 (${warningStudents.length}人未交≥3次)</div></div>
      `;
      warningStudents.forEach(s => {
        warningHtml += `
          <div class="list-item" onclick="HomeworkPage.showStudentProfile('${s.student.id}')">
            <div class="list-avatar" style="background:#fee2e2;color:#991b1b;">${Utils.getInitial(s.student.name)}</div>
            <div class="list-content">
              <div class="list-title">${s.student.name}</div>
              <div class="list-subtitle" style="color:var(--danger);">未交${s.unsubmitted}次 · 提交率${s.submitRate}%</div>
            </div>
            <span class="tag tag-danger">需关注</span>
          </div>
        `;
      });
      warningHtml += '</div>';
      var warningCard = warningHtml;
    }

    let html = warningCard || '';

    // 全部学生列表
    html += `
      <div class="card">
        <div class="card-header"><div class="card-title">👤 全部学生作业档案</div></div>
    `;
    studentStats.forEach(s => {
      const isWarning = s.unsubmitted >= 3;
      html += `
        <div class="list-item" onclick="HomeworkPage.showStudentProfile('${s.student.id}')">
          <div class="list-avatar" style="background:${isWarning ? '#fee2e2' : 'var(--primary-bg)'};color:${isWarning ? 'var(--danger)' : 'var(--primary)'};">${Utils.getInitial(s.student.name)}</div>
          <div class="list-content">
            <div class="list-title">${s.student.name} ${isWarning ? '<span class="tag tag-danger" style="font-size:10px;">未交' + s.unsubmitted + '</span>' : ''}</div>
            <div class="list-subtitle">提交率${s.submitRate}% | 优${s.youCount} 良${s.liangCount} 中${s.zhongCount} 差${s.chaCount}</div>
          </div>
          <div class="list-action">›</div>
        </div>
      `;
    });
    html += '</div>';

    return html;
  },

  showStudentProfile(studentId) {
    const student = (DB.get('students') || []).find(s => s.id === studentId);
    if (!student) return;
    const homeworks = DB.getByClass('homework');
    const records = DB.getByClass('homeworkRecords').filter(r => r.studentId === studentId);
    const sorted = [...homeworks].sort((a, b) => b.assignedDate.localeCompare(a.assignedDate));

    const submitted = records.filter(r => r.status === '已提交');
    const unsubmitted = records.filter(r => r.status === '未提交');
    const submitRate = records.length > 0 ? (submitted.length / records.length * 100).toFixed(0) : 100;
    const qualityCounts = { '优': 0, '良': 0, '中': 0, '差': 0 };
    submitted.forEach(r => { if (qualityCounts[r.quality] !== undefined) qualityCounts[r.quality]++; });

    let html = `
      <div class="card">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="list-avatar" style="width:48px;height:48px;font-size:20px;background:${Utils.getColorFromName(student.name)};color:#fff;">${Utils.getInitial(student.name)}</div>
          <div>
            <div style="font-weight:700;font-size:18px;">${student.name}</div>
            <div style="font-size:13px;color:var(--gray-500);">作业档案详情</div>
          </div>
        </div>
      </div>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-value">${records.length}</div><div class="stat-label">作业总数</div></div>
        <div class="stat-card success"><div class="stat-value">${submitted.length}</div><div class="stat-label">已交</div></div>
        <div class="stat-card danger"><div class="stat-value">${unsubmitted.length}</div><div class="stat-label">未交</div></div>
        <div class="stat-card info"><div class="stat-value">${submitRate}%</div><div class="stat-label">提交率</div></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">📊 质量分布</div></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <span class="tag tag-success" style="font-size:14px;padding:8px 16px;">优 ${qualityCounts['优']}</span>
          <span class="tag tag-info" style="font-size:14px;padding:8px 16px;">良 ${qualityCounts['良']}</span>
          <span class="tag tag-warning" style="font-size:14px;padding:8px 16px;">中 ${qualityCounts['中']}</span>
          <span class="tag tag-danger" style="font-size:14px;padding:8px 16px;">差 ${qualityCounts['差']}</span>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">📋 历次作业记录</div></div>
    `;

    sorted.forEach(h => {
      const r = records.find(rec => rec.homeworkId === h.id);
      if (!r) return;
      const qualityColor = r.quality === '优' ? 'success' : r.quality === '良' ? 'info' : r.quality === '中' ? 'warning' : r.quality === '差' ? 'danger' : 'gray';
      html += `
        <div class="list-item">
          <div class="list-avatar" style="background:${r.status === '已提交' ? '#d1fae5' : '#fee2e2'};color:${r.status === '已提交' ? '#065f46' : '#991b1b'};font-size:12px;">${h.assignedDate.substring(5)}</div>
          <div class="list-content">
            <div class="list-title">${h.subject} · ${h.title}</div>
            <div class="list-subtitle">${r.status === '已提交' ? '已提交' : '⚠️ 未提交'}</div>
          </div>
          ${r.status === '已提交' ? `<span class="tag tag-${qualityColor}">${r.quality || '未评'}</span>` : '<span class="tag tag-danger">未交</span>'}
        </div>
      `;
    });

    html += '</div>';

    Utils.showModal(`${student.name} - 作业档案`, html, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">关闭</button>
    `);
  },

  showDetail(id) {

    // 未提交学生先显示
    const unsubmitted = records.filter(r => r.status === '未提交');
    const submittedRecords = records.filter(r => r.status === '已提交');

    if (unsubmitted.length > 0) {
      html += '<div style="margin-bottom:8px;"><strong style="color:var(--danger);font-size:13px;">未提交 (' + unsubmitted.length + ')</strong></div>';
      unsubmitted.forEach(r => {
        html += `
          <div class="list-item" onclick="HomeworkPage.markSubmitted('${r.id}')">
            <div class="list-avatar" style="background:#fee2e2;color:#991b1b;">${Utils.getInitial(r.studentName)}</div>
            <div class="list-content">
              <div class="list-title">${r.studentName}</div>
              <div class="list-subtitle" style="color:var(--danger);">未提交</div>
            </div>
            <button class="btn btn-sm btn-success">标记已交</button>
          </div>
        `;
      });
    }

    if (submittedRecords.length > 0) {
      html += '<div style="margin:12px 0 8px;"><strong style="color:var(--success);font-size:13px;">已提交 (' + submittedRecords.length + ')</strong></div>';
      submittedRecords.forEach(r => {
        const qualityColor = r.quality === '优' ? 'success' : r.quality === '良' ? 'info' : r.quality === '中' ? 'warning' : 'gray';
        html += `
          <div class="list-item">
            <div class="list-avatar" style="background:#d1fae5;color:#065f46;">${Utils.getInitial(r.studentName)}</div>
            <div class="list-content">
              <div class="list-title">${r.studentName}</div>
              <div class="list-subtitle">已提交</div>
            </div>
            <select class="form-select" style="width:80px;font-size:12px;" onchange="HomeworkPage.updateQuality('${r.id}', this.value)">
              <option value="" ${!r.quality ? 'selected' : ''}>未评</option>
              <option value="优" ${r.quality === '优' ? 'selected' : ''}>优</option>
              <option value="良" ${r.quality === '良' ? 'selected' : ''}>良</option>
              <option value="中" ${r.quality === '中' ? 'selected' : ''}>中</option>
              <option value="差" ${r.quality === '差' ? 'selected' : ''}>差</option>
            </select>
          </div>
        `;
      });
    }

    html += '</div>';

    Utils.showModal(`${hw.title}`, html, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">关闭</button>
      <button class="btn btn-warning" style="flex:1;" onclick="HomeworkPage.markAllSubmitted('${id}')">全部标记已交</button>
      <button class="btn btn-danger" style="flex:1;" onclick="deleteHomework('${id}')">🗑 删除</button>
    `);
  },

  markSubmitted(recordId) {
    DB.update('homeworkRecords', recordId, { status: '已提交', submittedAt: new Date().toISOString() });
    Utils.toast('已标记为已提交', 'success');
    // 刷新模态框
    const hwId = (DB.get('homeworkRecords') || []).find(r => r.id === recordId)?.homeworkId;
    if (hwId) {
      Utils.closeModal();
      setTimeout(() => this.showDetail(hwId), 300);
    }
  },

  markAllSubmitted(hwId) {
    const records = DB.getByClass('homeworkRecords').filter(r => r.homeworkId === hwId && r.status === '未提交');
    records.forEach(r => {
      DB.update('homeworkRecords', r.id, { status: '已提交', submittedAt: new Date().toISOString() });
    });
    Utils.toast(`已标记 ${records.length} 人为已提交`, 'success');
    Utils.closeModal();
    setTimeout(() => this.showDetail(hwId), 300);
  },

  updateQuality(recordId, quality) {
    DB.update('homeworkRecords', recordId, { quality: quality });
    Utils.toast('已更新', 'success');
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.render();
  }
};

// 布置作业
function showHomeworkModal(id) {
  const hw = id ? (DB.get('homework') || []).find(h => h.id === id) : null;
  const isEdit = !!hw;

  Utils.showModal(isEdit ? '编辑作业' : '布置作业', `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">科目 *</label>
        <input class="form-input" id="hwSubject" value="${hw?.subject || ''}" placeholder="如：数学">
      </div>
      <div class="form-group">
        <label class="form-label">作业标题 *</label>
        <input class="form-input" id="hwTitle" value="${hw?.title || ''}" placeholder="如：第三章练习题">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">作业内容</label>
      <textarea class="form-textarea" id="hwContent" placeholder="详细描述作业内容">${hw?.content || ''}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">布置日期</label>
        <input class="form-input" id="hwAssigned" type="date" value="${hw?.assignedDate || Utils.today()}">
      </div>
      <div class="form-group">
        <label class="form-label">截止日期</label>
        <input class="form-input" id="hwDue" type="date" value="${hw?.dueDate || Utils.today()}">
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
    <button class="btn btn-primary" style="flex:1;" onclick="saveHomework(${isEdit ? `'${id}'` : 'null'})">保存</button>
  `);
}

function saveHomework(id) {
  const subject = document.getElementById('hwSubject').value.trim();
  const title = document.getElementById('hwTitle').value.trim();
  if (!subject || !title) {
    Utils.toast('请填写科目和标题', 'error');
    return;
  }
  const data = {
    subject: subject,
    title: title,
    content: document.getElementById('hwContent').value.trim(),
    assignedDate: document.getElementById('hwAssigned').value,
    dueDate: document.getElementById('hwDue').value
  };

  if (id) {
    DB.update('homework', id, data);
    Utils.toast('修改成功', 'success');
  } else {
    const newHw = DB.add('homework', data);
    // 为所有学生创建作业记录
    const students = DB.getByClass('students');
    students.forEach(s => {
      DB.add('homeworkRecords', {
        homeworkId: newHw.id,
        studentId: s.id,
        studentName: s.name,
        status: '未提交',
        submittedAt: null,
        quality: '',
        note: ''
      });
    });
    Utils.toast('作业已布置', 'success');
  }
  Utils.closeModal();
  HomeworkPage.render();
}

function deleteHomework(id) {
  Utils.confirm('确定要删除此作业及相关记录吗？', () => {
    DB.delete('homework', id);
    // 删除相关记录
    const records = (DB.get('homeworkRecords') || []).filter(r => r.homeworkId === id);
    records.forEach(r => DB.delete('homeworkRecords', r.id));
    Utils.closeModal();
    HomeworkPage.render();
    Utils.toast('已删除', 'success');
  });
}
