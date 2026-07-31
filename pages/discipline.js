/**
 * 违纪统计页面
 */
const DisciplinePage = {
  currentTab: 'dashboard',

  render() {
    let html = `
      <div class="page-title">⚠️ 违纪统计</div>
      <div class="page-subtitle">数据看板 · 多维度分析 · 明细记录</div>
    `;

    // 工具栏
    html += `
      <div class="toolbar">
        <button class="btn btn-primary btn-sm" onclick="showDisciplineModal()">+ 记录违纪</button>
        <button class="btn btn-outline btn-sm" onclick="DisciplinePage.exportData()">📤 导出</button>
      </div>
    `;

    const records = DB.getByClass('discipline');

    if (records.length === 0) {
      html += Utils.emptyState('⚠️', '暂无违纪记录');
      document.getElementById('mainContent').innerHTML = html;
      return;
    }

    // 标签切换
    html += `
      <div class="segment-control">
        <div class="segment-item ${this.currentTab === 'dashboard' ? 'active' : ''}" onclick="DisciplinePage.switchTab('dashboard')">📊 数据看板</div>
        <div class="segment-item ${this.currentTab === 'records' ? 'active' : ''}" onclick="DisciplinePage.switchTab('records')">📋 明细记录</div>
      </div>
    `;

    if (this.currentTab === 'dashboard') {
      html += this.renderDashboard(records);
    } else {
      html += this.renderRecords(records);
    }

    document.getElementById('mainContent').innerHTML = html;

    if (this.currentTab === 'dashboard') {
      this.renderCharts(records);
    }
  },

  renderDashboard(records) {
    const today = Utils.today();
    const weekRange = Utils.getWeekRange();
    const monthRange = Utils.getMonthRange();

    const todayCount = records.filter(r => r.date === today).length;
    const weekCount = records.filter(r => r.date >= weekRange.start && r.date <= weekRange.end).length;
    const monthCount = records.filter(r => r.date >= monthRange.start && r.date <= monthRange.end).length;
    const seriousCount = records.filter(r => r.level === '严重').length;

    let html = `
      <div class="stat-grid">
        <div class="stat-card danger"><div class="stat-value">${records.length}</div><div class="stat-label">总计</div></div>
        <div class="stat-card warning"><div class="stat-value">${todayCount}</div><div class="stat-label">今日</div></div>
        <div class="stat-card"><div class="stat-value">${weekCount}</div><div class="stat-label">本周</div></div>
        <div class="stat-card info"><div class="stat-value">${monthCount}</div><div class="stat-label">本月</div></div>
      </div>
      <div class="stat-grid">
        <div class="stat-card danger"><div class="stat-value">${seriousCount}</div><div class="stat-label">严重违纪</div></div>
        <div class="stat-card warning"><div class="stat-value">${records.filter(r=>r.level==='一般').length}</div><div class="stat-label">一般违纪</div></div>
        <div class="stat-card"><div class="stat-value">${records.filter(r=>r.level==='轻微').length}</div><div class="stat-label">轻微违纪</div></div>
        <div class="stat-card info"><div class="stat-value">${new Set(records.map(r=>r.studentId)).size}</div><div class="stat-label">涉及学生</div></div>
      </div>
    `;

    // 类型饼图
    html += `
      <div class="card">
        <div class="card-header"><div class="card-title">🥧 违纪类型分布</div></div>
        <div class="chart-container large"><canvas id="disciplinePieChart"></canvas></div>
      </div>
    `;

    // 级别柱状图
    html += `
      <div class="card">
        <div class="card-header"><div class="card-title">📊 违纪级别统计</div></div>
        <div class="chart-container"><canvas id="disciplineLevelChart"></canvas></div>
      </div>
    `;

    // 近14天趋势
    html += `
      <div class="card">
        <div class="card-header"><div class="card-title">📈 近14天违纪趋势</div></div>
        <div class="chart-container large"><canvas id="disciplineTrendChart"></canvas></div>
      </div>
    `;

    // 高频违纪学生
    const studentCounts = {};
    records.forEach(r => {
      studentCounts[r.studentName] = (studentCounts[r.studentName] || 0) + 1;
    });
    const topStudents = Object.entries(studentCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    if (topStudents.length > 0) {
      html += `
        <div class="card">
          <div class="card-header"><div class="card-title">⚠️ 违纪高频学生TOP5</div></div>
          <div class="chart-container"><canvas id="topStudentsChart"></canvas></div>
        </div>
      `;
    }

    return html;
  },

  renderRecords(records) {
    const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
    let html = `
      <div class="search-bar" style="margin-bottom:12px;">
        <input type="text" placeholder="搜索学生/类型..." oninput="DisciplinePage.filterRecords(this.value)">
      </div>
      <div id="recordsList">
    `;

    sorted.forEach(r => {
      const levelColor = r.level === '严重' ? 'danger' : r.level === '一般' ? 'warning' : 'gray';
      html += `
        <div class="talk-card ${r.level === '严重' ? 'danger' : r.level === '一般' ? 'warning' : ''}" onclick="DisciplinePage.showDetail('${r.id}')">
          <div style="display:flex;justify-content:space-between;align-items:start;">
            <div>
              <strong>${r.studentName}</strong>
              <span class="tag tag-${levelColor}" style="margin-left:6px;">${r.level}</span>
              <span class="tag tag-gray" style="margin-left:4px;">${r.type}</span>
            </div>
            <span style="font-size:12px;color:var(--gray-500);">${r.date}</span>
          </div>
          <div style="font-size:13px;color:var(--gray-600);margin-top:4px;">${r.description}</div>
          <div style="font-size:12px;color:var(--gray-500);margin-top:4px;">处理：${r.action}</div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  },

  filterRecords(key) {
    const records = DB.getByClass('discipline');
    const filtered = key ? records.filter(r =>
      r.studentName.includes(key) || r.type.includes(key) || r.description.includes(key)
    ) : records;
    const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
    const list = document.getElementById('recordsList');
    if (list) {
      list.innerHTML = sorted.length > 0 ? sorted.map(r => {
        const levelColor = r.level === '严重' ? 'danger' : r.level === '一般' ? 'warning' : 'gray';
        return `
          <div class="talk-card ${r.level === '严重' ? 'danger' : r.level === '一般' ? 'warning' : ''}" onclick="DisciplinePage.showDetail('${r.id}')">
            <div style="display:flex;justify-content:space-between;align-items:start;">
              <div>
                <strong>${r.studentName}</strong>
                <span class="tag tag-${levelColor}" style="margin-left:6px;">${r.level}</span>
                <span class="tag tag-gray" style="margin-left:4px;">${r.type}</span>
              </div>
              <span style="font-size:12px;color:var(--gray-500);">${r.date}</span>
            </div>
            <div style="font-size:13px;color:var(--gray-600);margin-top:4px;">${r.description}</div>
            <div style="font-size:12px;color:var(--gray-500);margin-top:4px;">处理：${r.action}</div>
          </div>
        `;
      }).join('') : Utils.emptyState('🔍', '未找到匹配记录');
    }
  },

  showDetail(id) {
    const record = (DB.get('discipline') || []).find(r => r.id === id);
    if (!record) return;
    Utils.showModal('违纪详情', `
      <div class="card">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <strong style="font-size:16px;">${record.studentName}</strong>
          <span class="tag tag-${record.level === '严重' ? 'danger' : record.level === '一般' ? 'warning' : 'gray'}">${record.level}</span>
        </div>
        <div style="display:grid;gap:8px;font-size:14px;">
          <div><span style="color:var(--gray-500);">类型：</span>${record.type}</div>
          <div><span style="color:var(--gray-500);">日期：</span>${record.date}</div>
          <div><span style="color:var(--gray-500);">描述：</span>${record.description}</div>
          <div><span style="color:var(--gray-500);">处理人：</span>${record.handler}</div>
          <div><span style="color:var(--gray-500);">处理措施：</span>${record.action}</div>
        </div>
      </div>
    `, `
      <button class="btn btn-danger" style="flex:1;" onclick="deleteDiscipline('${id}')">🗑 删除</button>
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">关闭</button>
    `);
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.render();
  },

  renderCharts(records) {
    // 类型饼图
    const typeCounts = Utils.groupBy(records, 'type');
    Utils.destroyChart('disciplinePieChart');
    new Chart(document.getElementById('disciplinePieChart'), {
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

    // 级别柱状图
    const levelCounts = Utils.groupBy(records, 'level');
    Utils.destroyChart('disciplineLevelChart');
    new Chart(document.getElementById('disciplineLevelChart'), {
      type: 'bar',
      data: {
        labels: ['轻微', '一般', '严重'],
        datasets: [{
          data: [levelCounts['轻微']?.length || 0, levelCounts['一般']?.length || 0, levelCounts['严重']?.length || 0],
          backgroundColor: ['#9ca3af', '#f59e0b', '#ef4444'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });

    // 趋势图
    const today = new Date();
    const labels = [];
    const data = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = Utils.formatDate(d);
      labels.push(Utils.formatDate(d, 'MM-DD'));
      data.push(records.filter(r => r.date === dateStr).length);
    }
    Utils.destroyChart('disciplineTrendChart');
    new Chart(document.getElementById('disciplineTrendChart'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: '违纪次数',
          data: data,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });

    // 高频学生
    const studentCounts = {};
    records.forEach(r => {
      studentCounts[r.studentName] = (studentCounts[r.studentName] || 0) + 1;
    });
    const topStudents = Object.entries(studentCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (topStudents.length > 0) {
      Utils.destroyChart('topStudentsChart');
      new Chart(document.getElementById('topStudentsChart'), {
        type: 'bar',
        data: {
          labels: topStudents.map(s => s[0]),
          datasets: [{
            data: topStudents.map(s => s[1]),
            backgroundColor: '#f59e0b',
            borderRadius: 6,
            horizontal: true
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
      });
    }
  },

  exportData() {
    const records = DB.getByClass('discipline');
    if (records.length === 0) {
      Utils.toast('暂无数据', 'warning');
      return;
    }
    const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
    const data = sorted.map(r => ({
      学生: r.studentName,
      类型: r.type,
      级别: r.level,
      日期: r.date,
      描述: r.description,
      处理人: r.handler,
      处理措施: r.action
    }));
    const csv = Utils.toCSV(data, ['学生', '类型', '级别', '日期', '描述', '处理人', '处理措施']);
    Utils.downloadFile(`违纪统计_${Utils.today()}.csv`, '\ufeff' + csv, 'text/csv');
    Utils.toast('已导出', 'success');
  }
};

// 违纪录入
function showDisciplineModal(id) {
  const record = id ? (DB.get('discipline') || []).find(r => r.id === id) : null;
  const isEdit = !!record;
  const students = DB.getByClass('students');

  Utils.showModal(isEdit ? '编辑违纪记录' : '记录违纪', `
    <div class="form-group">
      <label class="form-label">学生 *</label>
      <select class="form-select" id="disStudent">
        ${students.map(s => `<option value="${s.id}" ${record?.studentId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">违纪类型</label>
        <select class="form-select" id="disType">
          <option value="迟到" ${record?.type === '迟到' ? 'selected' : ''}>迟到</option>
          <option value="早退" ${record?.type === '早退' ? 'selected' : ''}>早退</option>
          <option value="旷课" ${record?.type === '旷课' ? 'selected' : ''}>旷课</option>
          <option value="课堂违纪" ${record?.type === '课堂违纪' ? 'selected' : ''}>课堂违纪</option>
          <option value="仪容仪表" ${record?.type === '仪容仪表' ? 'selected' : ''}>仪容仪表</option>
          <option value="手机违规" ${record?.type === '手机违规' ? 'selected' : ''}>手机违规</option>
          <option value="打架斗殴" ${record?.type === '打架斗殴' ? 'selected' : ''}>打架斗殴</option>
          <option value="其他" ${record?.type === '其他' ? 'selected' : ''}>其他</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">违纪级别</label>
        <select class="form-select" id="disLevel">
          <option value="轻微" ${record?.level === '轻微' ? 'selected' : ''}>轻微</option>
          <option value="一般" ${record?.level === '一般' ? 'selected' : ''}>一般</option>
          <option value="严重" ${record?.level === '严重' ? 'selected' : ''}>严重</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">日期</label>
      <input class="form-input" id="disDate" type="date" value="${record?.date || Utils.today()}">
    </div>
    <div class="form-group">
      <label class="form-label">违纪描述</label>
      <textarea class="form-textarea" id="disDesc" placeholder="详细描述违纪情况">${record?.description || ''}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">处理措施</label>
      <textarea class="form-textarea" id="disAction" placeholder="如：口头批评、通知家长、书面检查等">${record?.action || ''}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">处理人</label>
      <input class="form-input" id="disHandler" value="${record?.handler || '班主任'}">
    </div>
  `, `
    <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
    <button class="btn btn-primary" style="flex:1;" onclick="saveDiscipline(${isEdit ? `'${id}'` : 'null'})">保存</button>
  `);
}

function saveDiscipline(id) {
  const studentId = document.getElementById('disStudent').value;
  const student = (DB.get('students') || []).find(s => s.id === studentId);
  if (!student) {
    Utils.toast('请选择学生', 'error');
    return;
  }
  const data = {
    studentId: studentId,
    studentName: student.name,
    type: document.getElementById('disType').value,
    level: document.getElementById('disLevel').value,
    date: document.getElementById('disDate').value,
    description: document.getElementById('disDesc').value.trim(),
    action: document.getElementById('disAction').value.trim(),
    handler: document.getElementById('disHandler').value.trim()
  };
  if (id) {
    DB.update('discipline', id, data);
    Utils.toast('修改成功', 'success');
  } else {
    DB.add('discipline', data);
    Utils.toast('记录成功', 'success');
  }
  Utils.closeModal();
  DisciplinePage.render();
}

function deleteDiscipline(id) {
  Utils.confirm('确定要删除这条违纪记录吗？', () => {
    DB.delete('discipline', id);
    Utils.closeModal();
    DisciplinePage.render();
    Utils.toast('已删除', 'success');
  });
}
