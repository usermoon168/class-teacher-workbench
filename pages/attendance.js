/**
 * 考勤管理页面
 */
const AttendancePage = {
  currentTab: 'today',
  selectedMonth: '',

  render() {
    if (!this.selectedMonth) this.selectedMonth = Utils.today().substring(0, 7);
    let html = `
      <div class="page-title">📋 考勤管理</div>
      <div class="page-subtitle">每日考勤 · 历史记录 · 月度报表</div>
    `;

    const attendance = DB.getByClass('attendance');
    const students = DB.getByClass('students');
    const today = Utils.today();
    const todayRecord = attendance.find(a => a.date === today);

    // 统计
    let presentCount = 0, lateCount = 0, leaveCount = 0, absentCount = 0;
    if (todayRecord) {
      todayRecord.records.forEach(r => {
        if (r.status === '出勤') presentCount++;
        else if (r.status === '迟到') lateCount++;
        else if (r.status === '请假') leaveCount++;
        else if (r.status === '旷课') absentCount++;
      });
    }
    const totalStudents = students.length;
    const attendRate = totalStudents > 0 ? ((presentCount + lateCount) / totalStudents * 100).toFixed(0) : 0;

    html += `
      <div class="stat-grid">
        <div class="stat-card success"><div class="stat-value">${presentCount}</div><div class="stat-label">出勤</div></div>
        <div class="stat-card warning"><div class="stat-value">${lateCount}</div><div class="stat-label">迟到</div></div>
        <div class="stat-card info"><div class="stat-value">${leaveCount}</div><div class="stat-label">请假</div></div>
        <div class="stat-card danger"><div class="stat-value">${absentCount}</div><div class="stat-label">旷课</div></div>
      </div>
    `;

    // 标签
    html += `
      <div class="segment-control">
        <div class="segment-item ${this.currentTab === 'today' ? 'active' : ''}" onclick="AttendancePage.switchTab('today')">📝 今日考勤</div>
        <div class="segment-item ${this.currentTab === 'history' ? 'active' : ''}" onclick="AttendancePage.switchTab('history')">📅 历史记录</div>
        <div class="segment-item ${this.currentTab === 'monthly' ? 'active' : ''}" onclick="AttendancePage.switchTab('monthly')">📊 月度报表</div>
      </div>
    `;

    if (this.currentTab === 'today') {
      html += this.renderToday(students, todayRecord);
    } else if (this.currentTab === 'history') {
      html += this.renderHistory(attendance);
    } else {
      html += this.renderMonthly(attendance, students);
    }

    document.getElementById('mainContent').innerHTML = html;
  },

  renderToday(students, todayRecord) {
    if (students.length === 0) {
      return Utils.emptyState('📋', '暂无学生，请先添加学生');
    }

    const statusOrder = ['出勤', '迟到', '请假', '旷课'];
    const statusColors = { '出勤': 'success', '迟到': 'warning', '请假': 'info', '旷课': 'danger' };
    const statusIcons = { '出勤': '✓', '迟到': '⏰', '请假': '📋', '旷课': '✕' };

    let html = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">📅 ${Utils.today()} ${Utils.weekday(Utils.today())}</div>
          <button class="btn btn-sm btn-outline" onclick="AttendancePage.markAllPresent()">全员出勤</button>
        </div>
        <div class="attendance-grid">
    `;

    students.forEach(s => {
      const record = todayRecord?.records.find(r => r.studentId === s.id);
      const status = record?.status || '出勤';
      const colorClass = statusColors[status];
      html += `
        <div class="attendance-student att-${colorClass}" onclick="AttendancePage.cycleStatus('${s.id}')">
          <div class="att-icon">${statusIcons[status]}</div>
          <div class="att-name">${s.name}</div>
          <div class="att-status">${status}</div>
          <div class="att-seat">No.${s.seatNo || s.studentNo || ''}</div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
      <div style="margin-top:12px;padding:12px;background:var(--primary-bg);border-radius:var(--radius);font-size:13px;color:var(--text-secondary);text-align:center;">
        💡 点击学生卡片切换考勤状态：出勤 → 迟到 → 请假 → 旷课 → 出勤
      </div>
    `;

    return html;
  },

  renderHistory(attendance) {
    if (attendance.length === 0) {
      return Utils.emptyState('📅', '暂无历史考勤记录');
    }
    const sorted = [...attendance].sort((a, b) => b.date.localeCompare(a.date));
    let html = '<div class="card"><div class="card-header"><div class="card-title">📅 考勤历史</div></div>';
    sorted.forEach(a => {
      const present = a.records.filter(r => r.status === '出勤').length;
      const late = a.records.filter(r => r.status === '迟到').length;
      const leave = a.records.filter(r => r.status === '请假').length;
      const absent = a.records.filter(r => r.status === '旷课').length;
      const total = a.records.length;
      const rate = total > 0 ? ((present + late) / total * 100).toFixed(0) : 0;
      html += `
        <div class="list-item" onclick="AttendancePage.showHistoryDetail('${a.id}')">
          <div class="list-avatar" style="background:var(--primary-bg);color:var(--primary);">${a.date.substring(8, 10)}</div>
          <div class="list-content">
            <div class="list-title">${a.date} ${Utils.weekday(a.date)}</div>
            <div class="list-subtitle">出勤${present} · 迟到${late} · 请假${leave} · 旷课${absent}</div>
          </div>
          <span class="tag tag-${rate >= 95 ? 'success' : rate >= 80 ? 'warning' : 'danger'}">${rate}%</span>
        </div>
      `;
    });
    html += '</div>';
    return html;
  },

  renderMonthly(attendance, students) {
    let html = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">📊 月度报表</div>
          <input type="month" class="form-input" style="width:auto;font-size:14px;" value="${this.selectedMonth}" onchange="AttendancePage.changeMonth(this.value)">
        </div>
    `;

    const monthAttendance = attendance.filter(a => a.date.startsWith(this.selectedMonth));

    if (monthAttendance.length === 0) {
      html += Utils.emptyState('📊', `${this.selectedMonth} 月暂无考勤记录`);
      html += '</div>';
      return html;
    }

    // 统计每个学生
    const studentStats = students.map(s => {
      let present = 0, late = 0, leave = 0, absent = 0;
      monthAttendance.forEach(a => {
        const r = a.records.find(rec => rec.studentId === s.id);
        if (r) {
          if (r.status === '出勤') present++;
          else if (r.status === '迟到') late++;
          else if (r.status === '请假') leave++;
          else if (r.status === '旷课') absent++;
        }
      });
      const total = present + late + leave + absent;
      const rate = total > 0 ? ((present + late) / total * 100).toFixed(0) : 100;
      return { student: s, present, late, leave, absent, total, rate };
    });

    // 汇总
    const totalPresent = studentStats.reduce((sum, s) => sum + s.present, 0);
    const totalLate = studentStats.reduce((sum, s) => sum + s.late, 0);
    const totalLeave = studentStats.reduce((sum, s) => sum + s.leave, 0);
    const totalAbsent = studentStats.reduce((sum, s) => sum + s.absent, 0);
    const totalDays = monthAttendance.length;

    html += `
      <div class="stat-grid">
        <div class="stat-card info"><div class="stat-value">${totalDays}</div><div class="stat-label">考勤天数</div></div>
        <div class="stat-card success"><div class="stat-value">${totalPresent}</div><div class="stat-label">出勤人次</div></div>
        <div class="stat-card warning"><div class="stat-value">${totalLate}</div><div class="stat-label">迟到人次</div></div>
        <div class="stat-card danger"><div class="stat-value">${totalAbsent}</div><div class="stat-label">旷课人次</div></div>
      </div>
    `;

    // 学生明细
    html += `
      <div style="margin-top:12px;overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>姓名</th>
              <th>出勤</th>
              <th>迟到</th>
              <th>请假</th>
              <th>旷课</th>
              <th>出勤率</th>
            </tr>
          </thead>
          <tbody>
    `;

    studentStats.forEach(s => {
      html += `
        <tr>
          <td>${s.student.name}</td>
          <td style="color:var(--success);">${s.present}</td>
          <td style="color:var(--warning);">${s.late}</td>
          <td style="color:var(--info);">${s.leave}</td>
          <td style="color:var(--danger);">${s.absent}</td>
          <td><span class="tag tag-${s.rate >= 95 ? 'success' : s.rate >= 80 ? 'warning' : 'danger'}">${s.rate}%</span></td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
      <div style="margin-top:12px;">
        <button class="btn btn-primary btn-sm" onclick="AttendancePage.exportMonthly()">📥 导出月度报表</button>
      </div>
    </div>
    `;

    return html;
  },

  cycleStatus(studentId) {
    const today = Utils.today();
    const attendance = DB.get('attendance') || [];
    let todayRecord = attendance.find(a => a.date === today && a.classId === DB.currentClassId);

    if (!todayRecord) {
      // 创建今日考勤记录
      todayRecord = {
        id: DB.genId(),
        classId: DB.currentClassId,
        date: today,
        records: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      // 初始化所有学生为出勤
      const students = DB.getByClass('students');
      students.forEach(s => {
        todayRecord.records.push({
          studentId: s.id,
          studentName: s.name,
          status: '出勤',
          note: ''
        });
      });
      attendance.push(todayRecord);
    }

    // 循环切换状态
    const statusOrder = ['出勤', '迟到', '请假', '旷课'];
    const record = todayRecord.records.find(r => r.studentId === studentId);
    if (record) {
      const currentIdx = statusOrder.indexOf(record.status);
      record.status = statusOrder[(currentIdx + 1) % statusOrder.length];
    }

    todayRecord.updatedAt = new Date().toISOString();
    DB.set('attendance', attendance);
    this.render();
  },

  markAllPresent() {
    const today = Utils.today();
    const attendance = DB.get('attendance') || [];
    let todayRecord = attendance.find(a => a.date === today && a.classId === DB.currentClassId);

    if (!todayRecord) {
      todayRecord = {
        id: DB.genId(),
        classId: DB.currentClassId,
        date: today,
        records: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      attendance.push(todayRecord);
    }

    const students = DB.getByClass('students');
    todayRecord.records = students.map(s => ({
      studentId: s.id,
      studentName: s.name,
      status: '出勤',
      note: ''
    }));
    todayRecord.updatedAt = new Date().toISOString();
    DB.set('attendance', attendance);
    Utils.toast('已标记全员出勤', 'success');
    this.render();
  },

  showHistoryDetail(id) {
    const record = (DB.get('attendance') || []).find(a => a.id === id);
    if (!record) return;

    const statusColors = { '出勤': 'success', '迟到': 'warning', '请假': 'info', '旷课': 'danger' };
    let html = `
      <div class="card">
        <div style="font-weight:700;font-size:18px;">${record.date} ${Utils.weekday(record.date)}</div>
      </div>
      <div class="attendance-grid">
    `;

    record.records.forEach(r => {
      const colorClass = statusColors[r.status];
      html += `
        <div class="attendance-student att-${colorClass}">
          <div class="att-icon">${r.status === '出勤' ? '✓' : r.status === '迟到' ? '⏰' : r.status === '请假' ? '📋' : '✕'}</div>
          <div class="att-name">${r.studentName}</div>
          <div class="att-status">${r.status}</div>
        </div>
      `;
    });

    html += '</div>';

    Utils.showModal(`考勤详情 - ${record.date}`, html, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">关闭</button>
      <button class="btn btn-danger" style="flex:1;" onclick="AttendancePage.deleteRecord('${id}')">🗑 删除</button>
    `);
  },

  deleteRecord(id) {
    Utils.confirm('确定要删除此考勤记录吗？', () => {
      DB.delete('attendance', id);
      Utils.closeModal();
      this.render();
      Utils.toast('已删除', 'success');
    });
  },

  changeMonth(month) {
    this.selectedMonth = month;
    this.render();
  },

  exportMonthly() {
    const attendance = DB.getByClass('attendance').filter(a => a.date.startsWith(this.selectedMonth));
    const students = DB.getByClass('students');
    const className = DB.getCurrentClass().name;

    let csv = `班主任工作台 - ${className} ${this.selectedMonth} 考勤报表\n\n`;
    csv += '姓名,出勤天数,迟到天数,请假天数,旷课天数,出勤率\n';

    students.forEach(s => {
      let present = 0, late = 0, leave = 0, absent = 0;
      attendance.forEach(a => {
        const r = a.records.find(rec => rec.studentId === s.id);
        if (r) {
          if (r.status === '出勤') present++;
          else if (r.status === '迟到') late++;
          else if (r.status === '请假') leave++;
          else if (r.status === '旷课') absent++;
        }
      });
      const total = present + late + leave + absent;
      const rate = total > 0 ? ((present + late) / total * 100).toFixed(0) : 100;
      csv += `${s.name},${present},${late},${leave},${absent},${rate}%\n`;
    });

    Utils.downloadFile(`${className}_${this.selectedMonth}_考勤报表.csv`, '\ufeff' + csv, 'text/csv');
    Utils.toast('报表已导出', 'success');
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.render();
  }
};
