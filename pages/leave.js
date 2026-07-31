/**
 * 请假管理页面
 */
const LeavePage = {
  currentTab: 'list',
  step: 1,
  leaveData: {},

  render() {
    let html = `
      <div class="page-title">📋 请假管理</div>
      <div class="page-subtitle">四步登记流程 · 记录列表 · 统计 · 请假条导出</div>
    `;

    html += `
      <div class="toolbar">
        <button class="btn btn-primary btn-sm" onclick="showLeaveModal()">+ 请假登记</button>
        <button class="btn btn-outline btn-sm" onclick="LeavePage.exportData()">📤 导出</button>
      </div>
    `;

    const leaves = DB.getByClass('leaves');

    // 统计
    const today = Utils.today();
    const activeLeaves = leaves.filter(l => l.status !== '已销假' && l.startDate <= today && l.endDate >= today);
    const pendingLeaves = leaves.filter(l => l.status === '待审批');
    const monthRange = Utils.getMonthRange();
    const monthLeaves = leaves.filter(l => l.startDate >= monthRange.start && l.startDate <= monthRange.end);
    const totalDays = leaves.reduce((sum, l) => sum + (l.days || 0), 0);

    html += `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-value">${leaves.length}</div><div class="stat-label">请假总数</div></div>
        <div class="stat-card warning"><div class="stat-value">${activeLeaves.length}</div><div class="stat-label">今日请假中</div></div>
        <div class="stat-card danger"><div class="stat-value">${pendingLeaves.length}</div><div class="stat-label">待审批</div></div>
        <div class="stat-card info"><div class="stat-value">${totalDays}</div><div class="stat-label">总天数</div></div>
      </div>
    `;

    html += `
      <div class="segment-control">
        <div class="segment-item ${this.currentTab === 'list' ? 'active' : ''}" onclick="LeavePage.switchTab('list')">📋 记录列表</div>
        <div class="segment-item ${this.currentTab === 'stats' ? 'active' : ''}" onclick="LeavePage.switchTab('stats')">📊 统计分析</div>
      </div>
    `;

    if (this.currentTab === 'list') {
      html += this.renderList(leaves);
    } else {
      html += this.renderStats(leaves);
    }

    document.getElementById('mainContent').innerHTML = html;

    if (this.currentTab === 'stats') {
      this.renderCharts(leaves);
    }
  },

  renderList(leaves) {
    if (leaves.length === 0) {
      return Utils.emptyState('📋', '暂无请假记录');
    }
    const sorted = [...leaves].sort((a, b) => b.startDate.localeCompare(a.startDate));
    let html = '<div class="card" style="padding:0;">';
    sorted.forEach(l => {
      const statusColor = l.status === '已批准' ? 'success' : l.status === '待审批' ? 'warning' : l.status === '已销假' ? 'info' : 'gray';
      const typeIcon = l.type === '病假' ? '🤒' : l.type === '事假' ? '📋' : '📝';
      html += `
        <div class="list-item" onclick="LeavePage.showDetail('${l.id}')">
          <div class="list-avatar" style="background:#fef3c7;color:#92400e;">${typeIcon}</div>
          <div class="list-content">
            <div class="list-title">${l.studentName} <span class="tag tag-${statusColor}" style="margin-left:4px;">${l.status}</span></div>
            <div class="list-subtitle">${l.type} · ${l.startDate} ~ ${l.endDate} (${l.days}天)</div>
            <div class="list-subtitle">${l.reason}</div>
          </div>
          <div class="list-action">›</div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  },

  renderStats(leaves) {
    if (leaves.length === 0) return Utils.emptyState('📊', '暂无统计数据');
    let html = `
      <div class="card">
        <div class="card-header"><div class="card-title">📊 请假类型分布</div></div>
        <div class="chart-container"><canvas id="leaveTypeChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">📊 近30天请假趋势</div></div>
        <div class="chart-container large"><canvas id="leaveTrendChart"></canvas></div>
      </div>
    `;

    // 高频请假学生
    const studentCounts = {};
    leaves.forEach(l => {
      studentCounts[l.studentName] = (studentCounts[l.studentName] || 0) + 1;
    });
    const topStudents = Object.entries(studentCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (topStudents.length > 0) {
      html += `
        <div class="card">
          <div class="card-header"><div class="card-title">⚠️ 请假较多学生</div></div>
          <div class="chart-container"><canvas id="leaveStudentChart"></canvas></div>
        </div>
      `;
    }

    return html;
  },

  renderCharts(leaves) {
    // 类型分布
    const typeCounts = Utils.groupBy(leaves, 'type');
    Utils.destroyChart('leaveTypeChart');
    new Chart(document.getElementById('leaveTypeChart'), {
      type: 'pie',
      data: {
        labels: Object.keys(typeCounts),
        datasets: [{
          data: Object.values(typeCounts).map(arr => arr.length),
          backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right' } }
      }
    });

    // 趋势图
    const today = new Date();
    const labels = [];
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = Utils.formatDate(d);
      labels.push(Utils.formatDate(d, 'MM-DD'));
      data.push(leaves.filter(l => l.startDate <= dateStr && l.endDate >= dateStr).length);
    }
    Utils.destroyChart('leaveTrendChart');
    new Chart(document.getElementById('leaveTrendChart'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: '请假人数',
          data: data,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245,158,11,0.1)',
          fill: true,
          tension: 0.3
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
    leaves.forEach(l => {
      studentCounts[l.studentName] = (studentCounts[l.studentName] || 0) + 1;
    });
    const topStudents = Object.entries(studentCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (topStudents.length > 0) {
      Utils.destroyChart('leaveStudentChart');
      new Chart(document.getElementById('leaveStudentChart'), {
        type: 'bar',
        data: {
          labels: topStudents.map(s => s[0]),
          datasets: [{ data: topStudents.map(s => s[1]), backgroundColor: '#f59e0b', borderRadius: 6 }]
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

  showDetail(id) {
    const leave = (DB.get('leaves') || []).find(l => l.id === id);
    if (!leave) return;
    const statusColor = leave.status === '已批准' ? 'success' : leave.status === '待审批' ? 'warning' : 'info';

    Utils.showModal('请假详情', `
      <div class="card">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <strong style="font-size:16px;">${leave.studentName}</strong>
          <span class="tag tag-${statusColor}">${leave.status}</span>
        </div>
        <div style="display:grid;gap:8px;font-size:14px;">
          <div><span style="color:var(--gray-500);">类型：</span>${leave.type}</div>
          <div><span style="color:var(--gray-500);">开始：</span>${leave.startDate}</div>
          <div><span style="color:var(--gray-500);">结束：</span>${leave.endDate}</div>
          <div><span style="color:var(--gray-500);">天数：</span>${leave.days}天</div>
          <div><span style="color:var(--gray-500);">原因：</span>${leave.reason}</div>
          <div><span style="color:var(--gray-500);">联系电话：</span>${leave.contact || ''}</div>
          <div><span style="color:var(--gray-500);">审批人：</span>${leave.approver || ''}</div>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">关闭</button>
      <button class="btn btn-outline" style="flex:1;" onclick="LeavePage.exportLeaveSlip('${id}')">📄 请假条</button>
      ${leave.status === '待审批' ? `<button class="btn btn-success" style="flex:1;" onclick="LeavePage.approve('${id}')">✓ 批准</button>` : ''}
      ${leave.status === '已批准' ? `<button class="btn btn-info" style="flex:1;" onclick="LeavePage.close('${id}')">销假</button>` : ''}
      <button class="btn btn-danger" style="flex:1;" onclick="deleteLeave('${id}')">🗑 删除</button>
    `);
  },

  approve(id) {
    DB.update('leaves', id, { status: '已批准' });
    Utils.closeModal();
    this.render();
    Utils.toast('已批准', 'success');
  },

  close(id) {
    DB.update('leaves', id, { status: '已销假' });
    Utils.closeModal();
    this.render();
    Utils.toast('已销假', 'success');
  },

  // 导出请假条
  exportLeaveSlip(id) {
    const leave = (DB.get('leaves') || []).find(l => l.id === id);
    if (!leave) return;
    const cls = DB.getCurrentClass();
    const content = `
      <h1>学 生 请 假 条</h1>
      <div class="header">
        <p>${cls.name}</p>
      </div>
      <div style="font-size:14pt;line-height:2;margin-top:20pt;">
        <p>尊敬的班主任老师：</p>
        <p style="text-indent:2em;">我是 <strong>${leave.studentName}</strong> 同学，因 <strong>${leave.reason}</strong>，需要请 <strong>${leave.type}</strong> <strong>${leave.days}</strong> 天。</p>
        <p style="text-indent:2em;">请假时间：从 <strong>${leave.startDate}</strong> 至 <strong>${leave.endDate}</strong>。</p>
        <p style="text-indent:2em;">联系电话：<strong>${leave.contact || ''}</strong></p>
        <p style="text-indent:2em;">恳请老师批准！</p>
      </div>
      <div class="footer" style="margin-top:40pt;">
        <p>请假人：${leave.studentName}</p>
        <p>日期：${leave.startDate}</p>
      </div>
      <div style="margin-top:30pt;border-top:1px dashed #999;padding-top:10pt;">
        <p>审批意见：${leave.status === '已批准' ? '同意请假' : leave.status === '已销假' ? '已销假' : '待审批'}</p>
        <p>审批人：${leave.approver || '班主任'}　　日期：${leave.startDate}</p>
      </div>
    `;
    Utils.exportWord(`${leave.studentName}_请假条.doc`, '学生请假条', content);
    Utils.toast('请假条已导出', 'success');
  },

  exportData() {
    const leaves = DB.getByClass('leaves');
    if (leaves.length === 0) {
      Utils.toast('暂无数据', 'warning');
      return;
    }
    const data = [...leaves].sort((a, b) => b.startDate.localeCompare(a.startDate)).map(l => ({
      学生: l.studentName,
      类型: l.type,
      开始日期: l.startDate,
      结束日期: l.endDate,
      天数: l.days,
      原因: l.reason,
      状态: l.status,
      审批人: l.approver || ''
    }));
    const csv = Utils.toCSV(data, ['学生', '类型', '开始日期', '结束日期', '天数', '原因', '状态', '审批人']);
    Utils.downloadFile(`请假记录_${Utils.today()}.csv`, '\ufeff' + csv, 'text/csv');
    Utils.toast('已导出', 'success');
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.render();
  }
};

// 四步请假登记
function showLeaveModal() {
  LeavePage.step = 1;
  LeavePage.leaveData = {};
  LeavePage.renderLeaveStep();
}

LeavePage.renderLeaveStep = function() {
  const students = DB.getByClass('students');
  const step = LeavePage.step;
  const data = LeavePage.leaveData;

  const steps = [
    { label: '选择学生' },
    { label: '请假信息' },
    { label: '确认信息' },
    { label: '完成' }
  ];

  let stepsHtml = '<div class="leave-steps">';
  steps.forEach((s, i) => {
    const stepNum = i + 1;
    const cls = stepNum < step ? 'completed' : stepNum === step ? 'active' : '';
    stepsHtml += `<div class="leave-step ${cls}"><div class="leave-step-circle">${stepNum < step ? '✓' : stepNum}</div><div class="leave-step-label">${s.label}</div></div>`;
  });
  stepsHtml += '</div>';

  let bodyHtml = stepsHtml;

  if (step === 1) {
    // 选择学生
    bodyHtml += `
      <div class="search-bar" style="margin-bottom:12px;">
        <input type="text" placeholder="搜索学生..." oninput="LeavePage.filterStudent(this.value)">
      </div>
      <div id="studentSelectList" style="max-height:300px;overflow-y:auto;">
        ${students.map(s => `
          <div class="list-item" onclick="LeavePage.selectStudent('${s.id}')">
            <div class="list-avatar" style="background:${Utils.getColorFromName(s.name)}20;color:${Utils.getColorFromName(s.name)};">${Utils.getInitial(s.name)}</div>
            <div class="list-content">
              <div class="list-title">${s.name}</div>
              <div class="list-subtitle">${s.studentNo || ''} · ${s.gender}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } else if (step === 2) {
    // 请假信息
    bodyHtml += `
      <div class="form-group">
        <label class="form-label">请假类型</label>
        <select class="form-select" id="leaveType">
          <option value="病假" ${data.type === '病假' ? 'selected' : ''}>病假</option>
          <option value="事假" ${data.type === '事假' ? 'selected' : ''}>事假</option>
          <option value="其他" ${data.type === '其他' ? 'selected' : ''}>其他</option>
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">开始日期</label>
          <input class="form-input" id="leaveStart" type="date" value="${data.startDate || Utils.today()}">
        </div>
        <div class="form-group">
          <label class="form-label">结束日期</label>
          <input class="form-input" id="leaveEnd" type="date" value="${data.endDate || Utils.today()}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">请假原因</label>
        <textarea class="form-textarea" id="leaveReason" placeholder="请详细说明请假原因">${data.reason || ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">联系电话</label>
        <input class="form-input" id="leaveContact" value="${data.contact || ''}" placeholder="家长联系电话">
      </div>
    `;
  } else if (step === 3) {
    // 确认
    const student = students.find(s => s.id === data.studentId);
    const days = Utils.daysBetween(data.startDate, data.endDate) + 1;
    bodyHtml += `
      <div class="card">
        <div style="display:grid;gap:10px;font-size:14px;">
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray-500);">学生</span><strong>${student?.name || ''}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray-500);">类型</span><span>${data.type || ''}</span></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray-500);">开始日期</span><span>${data.startDate || ''}</span></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray-500);">结束日期</span><span>${data.endDate || ''}</span></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray-500);">天数</span><strong>${days}天</strong></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray-500);">原因</span><span style="text-align:right;max-width:60%;">${data.reason || ''}</span></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray-500);">联系电话</span><span>${data.contact || ''}</span></div>
        </div>
      </div>
      <div style="text-align:center;color:var(--gray-500);font-size:13px;margin-top:12px;">请确认以上信息无误</div>
    `;
  } else if (step === 4) {
    bodyHtml += `
      <div style="text-align:center;padding:40px 0;">
        <div style="font-size:60px;margin-bottom:12px;">✅</div>
        <div style="font-size:18px;font-weight:700;">请假登记成功</div>
        <div style="font-size:14px;color:var(--gray-500);margin-top:8px;">已保存请假记录</div>
      </div>
    `;
  }

  let footerHtml = '';
  if (step > 1 && step < 4) {
    footerHtml += `<button class="btn btn-secondary" style="flex:1;" onclick="LeavePage.prevStep()">上一步</button>`;
  }
  if (step === 4) {
    footerHtml += `<button class="btn btn-primary" style="flex:1;" onclick="Utils.closeModal();LeavePage.render();">完成</button>`;
  } else {
    footerHtml += `<button class="btn btn-primary" style="flex:1;" onclick="LeavePage.nextStep()">${step === 3 ? '确认提交' : '下一步'}</button>`;
  }

  Utils.showModal('请假登记', bodyHtml, footerHtml);
};

LeavePage.filterStudent = function(key) {
  const students = DB.getByClass('students');
  const filtered = key ? students.filter(s => s.name.includes(key) || (s.studentNo || '').includes(key)) : students;
  const list = document.getElementById('studentSelectList');
  if (list) {
    list.innerHTML = filtered.map(s => `
      <div class="list-item" onclick="LeavePage.selectStudent('${s.id}')">
        <div class="list-avatar" style="background:${Utils.getColorFromName(s.name)}20;color:${Utils.getColorFromName(s.name)};">${Utils.getInitial(s.name)}</div>
        <div class="list-content">
          <div class="list-title">${s.name}</div>
          <div class="list-subtitle">${s.studentNo || ''} · ${s.gender}</div>
        </div>
      </div>
    `).join('') || Utils.emptyState('🔍', '未找到学生');
  }
};

LeavePage.selectStudent = function(id) {
  LeavePage.leaveData.studentId = id;
  LeavePage.nextStep();
};

LeavePage.nextStep = function() {
  const step = LeavePage.step;
  const data = LeavePage.leaveData;

  if (step === 2) {
    data.type = document.getElementById('leaveType').value;
    data.startDate = document.getElementById('leaveStart').value;
    data.endDate = document.getElementById('leaveEnd').value;
    data.reason = document.getElementById('leaveReason').value.trim();
    data.contact = document.getElementById('leaveContact').value.trim();
    if (!data.reason) {
      Utils.toast('请填写请假原因', 'error');
      return;
    }
    if (data.startDate > data.endDate) {
      Utils.toast('结束日期不能早于开始日期', 'error');
      return;
    }
  }

  if (step === 3) {
    // 保存
    const student = (DB.get('students') || []).find(s => s.id === data.studentId);
    const days = Utils.daysBetween(data.startDate, data.endDate) + 1;
    DB.add('leaves', {
      studentId: data.studentId,
      studentName: student?.name || '',
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
      days: days,
      reason: data.reason,
      contact: data.contact,
      approver: '班主任',
      status: '已批准'
    });
    Utils.toast('请假登记成功', 'success');
  }

  LeavePage.step++;
  Utils.closeModal();
  setTimeout(() => LeavePage.renderLeaveStep(), 300);
};

LeavePage.prevStep = function() {
  LeavePage.step--;
  Utils.closeModal();
  setTimeout(() => LeavePage.renderLeaveStep(), 300);
};

function deleteLeave(id) {
  Utils.confirm('确定要删除这条请假记录吗？', () => {
    DB.delete('leaves', id);
    Utils.closeModal();
    LeavePage.render();
    Utils.toast('已删除', 'success');
  });
}
