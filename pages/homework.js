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
      </div>
    `;

    if (this.currentTab === 'list') {
      html += this.renderList(homeworks, records);
    } else {
      html += this.renderStats(homeworks, records);
    }

    document.getElementById('mainContent').innerHTML = html;

    if (this.currentTab === 'stats' && homeworks.length > 0) {
      this.renderChart(homeworks, records);
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

  showDetail(id) {
    const hw = (DB.get('homework') || []).find(h => h.id === id);
    if (!hw) return;
    const records = DB.getByClass('homeworkRecords').filter(r => r.homeworkId === id);
    const students = DB.getByClass('students');
    const submitted = records.filter(r => r.status === '已提交').length;
    const rate = records.length > 0 ? (submitted / records.length * 100).toFixed(0) : 0;

    let html = `
      <div class="card">
        <div style="font-weight:700;font-size:18px;">${hw.subject} · ${hw.title}</div>
        <div style="font-size:13px;color:var(--gray-500);margin-top:6px;">布置日期：${hw.assignedDate} | 截止日期：${hw.dueDate}</div>
        <div style="font-size:14px;margin-top:8px;">${hw.content}</div>
      </div>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-value">${records.length}</div><div class="stat-label">应交人数</div></div>
        <div class="stat-card success"><div class="stat-value">${submitted}</div><div class="stat-label">已交人数</div></div>
        <div class="stat-card danger"><div class="stat-value">${records.length - submitted}</div><div class="stat-label">未交人数</div></div>
        <div class="stat-card info"><div class="stat-value">${rate}%</div><div class="stat-label">提交率</div></div>
      </div>
      <div style="margin-top:12px;">
        <div style="font-weight:700;margin-bottom:8px;">📋 完成情况</div>
    `;

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
