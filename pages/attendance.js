/**
 * 考勤管理页面
 * 每个学生每天分上午(am)和下午(pm)两个独立考勤时段
 */
const AttendancePage = {
  currentTab: 'today',
  selectedMonth: '',

  // 兼容旧数据：旧记录只有 status 字段（整天），新记录有 am/pm
  norm(r) {
    if (!r) return { am: '出勤', pm: '出勤' };
    if (r.am !== undefined && r.pm !== undefined) return r;
    const st = r.status || '出勤';
    return { studentId: r.studentId, studentName: r.studentName, am: st, pm: st, note: r.note || '' };
  },

  render() {
    if (!this.selectedMonth) this.selectedMonth = Utils.today().substring(0, 7);
    let html = `
      <div class="page-title">📋 考勤管理</div>
      <div class="page-subtitle">上午/下午考勤 · 历史记录 · 月度报表</div>
    `;

    const attendance = DB.getByClass('attendance');
    const students = DB.getByClass('students');
    const today = Utils.today();
    const todayRecord = attendance.find(a => a.date === today);

    // 统计（按时段）
    let lateCount = 0, leaveCount = 0, absentCount = 0, totalPeriods = 0;
    if (todayRecord) {
      todayRecord.records.forEach(r => {
        const n = this.norm(r);
        [n.am, n.pm].forEach(st => {
          totalPeriods++;
          if (st === '迟到') lateCount++;
          else if (st === '请假') leaveCount++;
          else if (st === '旷课') absentCount++;
        });
      });
    }
    const attendRate = totalPeriods > 0 ? ((totalPeriods - lateCount - leaveCount - absentCount) / totalPeriods * 100).toFixed(0) : 0;

    html += `
      <div class="stat-grid">
        <div class="stat-card success"><div class="stat-value">${attendRate}%</div><div class="stat-label">出勤率</div></div>
        <div class="stat-card warning"><div class="stat-value">${lateCount}</div><div class="stat-label">迟到人次</div></div>
        <div class="stat-card info"><div class="stat-value">${leaveCount}</div><div class="stat-label">请假人次</div></div>
        <div class="stat-card danger"><div class="stat-value">${absentCount}</div><div class="stat-label">旷课人次</div></div>
      </div>
    `;

    // 标签
    html += `
      <div class="segment-control">
        <div class="segment-item ${this.currentTab === 'today' ? 'active' : ''}" onclick="AttendancePage.switchTab('today')">📝 今日考勤</div>
        <div class="segment-item ${this.currentTab === 'history' ? 'active' : ''}" onclick="AttendancePage.switchTab('history')">📅 历史记录</div>
        <div class="segment-item ${this.currentTab === 'weekly' ? 'active' : ''}" onclick="AttendancePage.switchTab('weekly')">📊 周汇总</div>
        <div class="segment-item ${this.currentTab === 'monthly' ? 'active' : ''}" onclick="AttendancePage.switchTab('monthly')">📈 月度报表</div>
      </div>
    `;

    if (this.currentTab === 'today') {
      html += this.renderToday(students, todayRecord);
    } else if (this.currentTab === 'history') {
      html += this.renderHistory(attendance);
    } else if (this.currentTab === 'weekly') {
      html += this.renderWeekly(attendance, students);
    } else {
      html += this.renderMonthly(attendance, students);
    }

    document.getElementById('mainContent').innerHTML = html;
  },

  renderToday(students, todayRecord) {
    if (students.length === 0) {
      return Utils.emptyState('📋', '暂无学生，请先添加学生');
    }

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
      const n = this.norm(record);
      const amClass = statusColors[n.am];
      const pmClass = statusColors[n.pm];
      html += `
        <div class="attendance-student">
          <div class="att-name">${s.name}</div>
          <div class="att-seat">No.${s.seatNo || s.studentNo || ''}</div>
          <div class="att-periods">
            <div class="att-period att-${amClass}" onclick="AttendancePage.cyclePeriodStatus('${s.id}','am')">
              <span class="att-period-icon">☀️</span>${n.am}
            </div>
            <div class="att-period att-${pmClass}" onclick="AttendancePage.cyclePeriodStatus('${s.id}','pm')">
              <span class="att-period-icon">🌙</span>${n.pm}
            </div>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
      <div style="margin-top:12px;padding:12px;background:var(--primary-bg);border-radius:var(--radius);font-size:13px;color:var(--text-secondary);text-align:center;">
        💡 分别点击「☀️上午」「🌙下午」切换考勤状态：出勤 → 迟到 → 请假 → 旷课 → 出勤
      </div>
    `;

    return html;
  },

  // 周汇总
  renderWeekly(attendance, students) {
    const weekRange = Utils.getWeekRange();
    const weekAttendance = attendance.filter(a => a.date >= weekRange.start && a.date <= weekRange.end);

    let html = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">📊 本周考勤汇总</div>
          <div style="font-size:13px;color:var(--gray-500);">${weekRange.start} ~ ${weekRange.end}</div>
        </div>
    `;

    if (weekAttendance.length === 0) {
      html += Utils.emptyState('📊', '本周暂无考勤记录');
      html += '</div>';
      return html;
    }

    // 统计每个学生的异常情况（按时段）
    const studentMap = {};
    const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

    weekAttendance.forEach(a => {
      const dateObj = new Date(a.date);
      const dayIdx = (dateObj.getDay() + 6) % 7; // 周一=0
      const dayName = weekDays[dayIdx];

      a.records.forEach(r => {
        const n = this.norm(r);
        [['am', n.am], ['pm', n.pm]].forEach(([period, st]) => {
          if (st === '出勤') return; // 只关注异常
          if (!studentMap[r.studentId]) {
            studentMap[r.studentId] = { name: r.studentName, late: [], leave: [], absent: [] };
          }
          const suffix = period === 'am' ? '上午' : '下午';
          if (st === '迟到') studentMap[r.studentId].late.push(`${dayName}${suffix}`);
          else if (st === '请假') studentMap[r.studentId].leave.push(`${dayName}${suffix}`);
          else if (st === '旷课') studentMap[r.studentId].absent.push(`${dayName}${suffix}`);
        });
      });
    });

    // 汇总数据
    const allStudents = Object.values(studentMap);
    const lateStudents = allStudents.filter(s => s.late.length > 0);
    const leaveStudents = allStudents.filter(s => s.leave.length > 0);
    const absentStudents = allStudents.filter(s => s.absent.length > 0);

    // 统计卡片
    html += `
      <div class="stat-grid">
        <div class="stat-card info"><div class="stat-value">${weekAttendance.length}</div><div class="stat-label">考勤天数</div></div>
        <div class="stat-card warning"><div class="stat-value">${lateStudents.length}</div><div class="stat-label">迟到人数</div></div>
        <div class="stat-card info"><div class="stat-value">${leaveStudents.length}</div><div class="stat-label">请假人数</div></div>
        <div class="stat-card danger"><div class="stat-value">${absentStudents.length}</div><div class="stat-label">旷课人数</div></div>
      </div>
    `;

    // 迟到
    if (lateStudents.length > 0) {
      html += `<div style="margin-top:12px;font-weight:700;color:var(--warning);margin-bottom:6px;">⏰ 迟到 (${lateStudents.length}人)</div>`;
      lateStudents.forEach(s => {
        const count = s.late.length;
        html += `
          <div class="list-item">
            <div class="list-avatar" style="background:#fef3c7;color:#92400e;">${Utils.getInitial(s.name)}</div>
            <div class="list-content">
              <div class="list-title">${s.name}</div>
              <div class="list-subtitle" style="color:var(--warning);">迟到${count}次（${s.late.join('、')}）</div>
            </div>
          </div>
        `;
      });
    }

    // 请假
    if (leaveStudents.length > 0) {
      html += `<div style="margin-top:12px;font-weight:700;color:var(--info);margin-bottom:6px;">📋 请假 (${leaveStudents.length}人)</div>`;
      leaveStudents.forEach(s => {
        const count = s.leave.length;
        html += `
          <div class="list-item">
            <div class="list-avatar" style="background:#dbeafe;color:#1e40af;">${Utils.getInitial(s.name)}</div>
            <div class="list-content">
              <div class="list-title">${s.name}</div>
              <div class="list-subtitle" style="color:var(--info);">请假${count}次（${s.leave.join('、')}）</div>
            </div>
          </div>
        `;
      });
    }

    // 旷课
    if (absentStudents.length > 0) {
      html += `<div style="margin-top:12px;font-weight:700;color:var(--danger);margin-bottom:6px;">✕ 旷课 (${absentStudents.length}人)</div>`;
      absentStudents.forEach(s => {
        const count = s.absent.length;
        html += `
          <div class="list-item">
            <div class="list-avatar" style="background:#fee2e2;color:#991b1b;">${Utils.getInitial(s.name)}</div>
            <div class="list-content">
              <div class="list-title">${s.name}</div>
              <div class="list-subtitle" style="color:var(--danger);">旷课${count}次（${s.absent.join('、')}）</div>
            </div>
          </div>
        `;
      });
    }

    if (lateStudents.length === 0 && leaveStudents.length === 0 && absentStudents.length === 0) {
      html += `<div style="padding:12px;text-align:center;color:var(--success);">🎉 本周全员正常出勤！</div>`;
    }

    html += `
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;">
        <button class="btn btn-primary" style="flex:1;" onclick="AttendancePage.copyWeekly()">📋 复制周汇总（发班群）</button>
        <button class="btn btn-outline" onclick="AttendancePage.exportWeekly()">📥 导出</button>
      </div>
    `;

    return html;
  },

  copyWeekly() {
    const weekRange = Utils.getWeekRange();
    const attendance = DB.getByClass('attendance').filter(a => a.date >= weekRange.start && a.date <= weekRange.end);
    const className = DB.getCurrentClass().name;
    const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

    const studentMap = {};
    attendance.forEach(a => {
      const dateObj = new Date(a.date);
      const dayIdx = (dateObj.getDay() + 6) % 7;
      const dayName = weekDays[dayIdx];
      a.records.forEach(r => {
        const n = this.norm(r);
        [['am', n.am], ['pm', n.pm]].forEach(([period, st]) => {
          if (st === '出勤') return;
          if (!studentMap[r.studentId]) {
            studentMap[r.studentId] = { name: r.studentName, late: [], leave: [], absent: [] };
          }
          const suffix = period === 'am' ? '上午' : '下午';
          if (st === '迟到') studentMap[r.studentId].late.push(`${dayName}${suffix}`);
          else if (st === '请假') studentMap[r.studentId].leave.push(`${dayName}${suffix}`);
          else if (st === '旷课') studentMap[r.studentId].absent.push(`${dayName}${suffix}`);
        });
      });
    });

    const allStudents = Object.values(studentMap);
    const lateStudents = allStudents.filter(s => s.late.length > 0);
    const leaveStudents = allStudents.filter(s => s.leave.length > 0);
    const absentStudents = allStudents.filter(s => s.absent.length > 0);

    let text = `📋 本周考勤汇总\n（${weekRange.start} ~ ${weekRange.end}）\n`;
    text += `━━━━━━━━━━━━━━━━━━\n`;

    if (lateStudents.length > 0) {
      text += `\n⏰ 迟到：\n`;
      lateStudents.forEach(s => {
        text += `• ${s.name} - ${s.late.length}次（${s.late.join('、')}）\n`;
      });
    }
    if (leaveStudents.length > 0) {
      text += `\n📋 请假：\n`;
      leaveStudents.forEach(s => {
        text += `• ${s.name} - ${s.leave.length}次（${s.leave.join('、')}）\n`;
      });
    }
    if (absentStudents.length > 0) {
      text += `\n✕ 旷课：\n`;
      absentStudents.forEach(s => {
        text += `• ${s.name} - ${s.absent.length}次（${s.absent.join('、')}）\n`;
      });
    }

    if (lateStudents.length === 0 && leaveStudents.length === 0 && absentStudents.length === 0) {
      text += `\n🎉 本周全员正常出勤，表现棒棒哒！`;
    } else {
      text += `\n请家长关注孩子出勤情况，谢谢配合！`;
    }

    HomeworkPage.copyToClipboard(text);
  },

  exportWeekly() {
    const weekRange = Utils.getWeekRange();
    const attendance = DB.getByClass('attendance').filter(a => a.date >= weekRange.start && a.date <= weekRange.end);
    const className = DB.getCurrentClass().name;
    const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

    const studentMap = {};
    attendance.forEach(a => {
      const dateObj = new Date(a.date);
      const dayIdx = (dateObj.getDay() + 6) % 7;
      const dayName = weekDays[dayIdx];
      a.records.forEach(r => {
        const n = this.norm(r);
        [['am', n.am], ['pm', n.pm]].forEach(([period, st]) => {
          if (st === '出勤') return;
          if (!studentMap[r.studentId]) {
            studentMap[r.studentId] = { name: r.studentName, late: [], leave: [], absent: [] };
          }
          const suffix = period === 'am' ? '上午' : '下午';
          if (st === '迟到') studentMap[r.studentId].late.push(`${dayName}${suffix}`);
          else if (st === '请假') studentMap[r.studentId].leave.push(`${dayName}${suffix}`);
          else if (st === '旷课') studentMap[r.studentId].absent.push(`${dayName}${suffix}`);
        });
      });
    });

    let csv = `${className} 本周考勤汇总 (${weekRange.start}~${weekRange.end})\n\n`;
    csv += '姓名,迟到次数,迟到时段,请假次数,请假时段,旷课次数,旷课时段\n';

    Object.values(studentMap).forEach(s => {
      csv += `${s.name},${s.late.length}次,${s.late.join('；')},${s.leave.length}次,${s.leave.join('；')},${s.absent.length}次,${s.absent.join('；')}\n`;
    });

    Utils.downloadFile(`${className}_本周考勤汇总_${weekRange.start}.csv`, '\ufeff' + csv, 'text/csv');
    Utils.toast('已导出', 'success');
  },

  renderHistory(attendance) {
    if (attendance.length === 0) {
      return Utils.emptyState('📅', '暂无历史考勤记录');
    }
    const sorted = [...attendance].sort((a, b) => b.date.localeCompare(a.date));
    let html = '<div class="card"><div class="card-header"><div class="card-title">📅 考勤历史</div></div>';
    sorted.forEach(a => {
      let present = 0, late = 0, leave = 0, absent = 0, total = 0;
      a.records.forEach(r => {
        const n = this.norm(r);
        [n.am, n.pm].forEach(st => {
          total++;
          if (st === '出勤') present++;
          else if (st === '迟到') late++;
          else if (st === '请假') leave++;
          else if (st === '旷课') absent++;
        });
      });
      const normal = present + late;
      const rate = total > 0 ? (normal / total * 100).toFixed(0) : 0;
      html += `
        <div class="list-item" onclick="AttendancePage.showHistoryDetail('${a.id}')">
          <div class="list-avatar" style="background:var(--primary-bg);color:var(--primary);">${a.date.substring(8, 10)}</div>
          <div class="list-content">
            <div class="list-title">${a.date} ${Utils.weekday(a.date)}</div>
            <div class="list-subtitle">迟到${late} · 请假${leave} · 旷课${absent}</div>
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

    // 统计每个学生（按时段）
    const studentStats = students.map(s => {
      let present = 0, late = 0, leave = 0, absent = 0;
      monthAttendance.forEach(a => {
        const r = a.records.find(rec => rec.studentId === s.id);
        if (r) {
          const n = this.norm(r);
          [n.am, n.pm].forEach(st => {
            if (st === '出勤') present++;
            else if (st === '迟到') late++;
            else if (st === '请假') leave++;
            else if (st === '旷课') absent++;
          });
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

  cyclePeriodStatus(studentId, period) {
    const STATUS_ORDER = ['出勤', '迟到', '请假', '旷课'];
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
      const students = DB.getByClass('students');
      students.forEach(s => {
        todayRecord.records.push({
          studentId: s.id,
          studentName: s.name,
          am: '出勤',
          pm: '出勤',
          note: ''
        });
      });
      attendance.push(todayRecord);
    }

    const record = todayRecord.records.find(r => r.studentId === studentId);
    if (record) {
      let n = this.norm(record);
      const currentIdx = STATUS_ORDER.indexOf(n[period]);
      n[period] = STATUS_ORDER[(currentIdx + 1) % STATUS_ORDER.length];
      record.am = n.am;
      record.pm = n.pm;
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
      am: '出勤',
      pm: '出勤',
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
        <div style="font-size:12px;color:var(--gray-500);margin-top:4px;">每位学生分上午/下午两段考勤</div>
      </div>
      <div class="attendance-grid">
    `;

    record.records.forEach(r => {
      const n = this.norm(r);
      html += `
        <div class="attendance-student">
          <div class="att-name">${r.studentName}</div>
          <div class="att-periods">
            <div class="att-period att-${statusColors[n.am]}"><span class="att-period-icon">☀️</span>${n.am}</div>
            <div class="att-period att-${statusColors[n.pm]}"><span class="att-period-icon">🌙</span>${n.pm}</div>
          </div>
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

    let csv = `班主任工作台 - ${className} ${this.selectedMonth} 考勤报表（上午/下午分段）\n\n`;
    csv += '姓名,出勤,迟到,请假,旷课,出勤率\n';

    students.forEach(s => {
      let present = 0, late = 0, leave = 0, absent = 0;
      attendance.forEach(a => {
        const r = a.records.find(rec => rec.studentId === s.id);
        if (r) {
          const n = this.norm(r);
          [n.am, n.pm].forEach(st => {
            if (st === '出勤') present++;
            else if (st === '迟到') late++;
            else if (st === '请假') leave++;
            else if (st === '旷课') absent++;
          });
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
