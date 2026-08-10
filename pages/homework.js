/**
 * 作业管理页面
 * 核心逻辑：老师布置作业 → 登记未完成的学生 → 周汇总发班群
 */
const HomeworkPage = {
  currentTab: 'list',

  render() {
    let html = `
      <div class="page-title">📝 作业管理</div>
      <div class="page-subtitle">布置作业 · 登记未完成 · 周汇总</div>
    `;

    html += `
      <div class="toolbar">
        <button class="btn btn-primary btn-sm" onclick="showHomeworkModal()">+ 布置作业</button>
      </div>
    `;

    const homeworks = DB.getByClass('homework');
    const records = DB.getByClass('homeworkRecords');
    const students = DB.getByClass('students');

    // 统计
    const today = Utils.today();
    const pendingHw = homeworks.filter(h => h.dueDate >= today);
    const incompleteCount = records.filter(r => r.status === '未完成').length;
    const completionRate = homeworks.length > 0 && students.length > 0
      ? Math.round((1 - incompleteCount / (homeworks.length * students.length)) * 100)
      : 100;

    html += `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-value">${homeworks.length}</div><div class="stat-label">作业总数</div></div>
        <div class="stat-card warning"><div class="stat-value">${pendingHw.length}</div><div class="stat-label">待完成</div></div>
        <div class="stat-card danger"><div class="stat-value">${incompleteCount}</div><div class="stat-label">未完成人次</div></div>
        <div class="stat-card success"><div class="stat-value">${completionRate}%</div><div class="stat-label">完成率</div></div>
      </div>
    `;

    // 标签
    html += `
      <div class="segment-control">
        <div class="segment-item ${this.currentTab === 'list' ? 'active' : ''}" onclick="HomeworkPage.switchTab('list')">📋 作业列表</div>
        <div class="segment-item ${this.currentTab === 'weekly' ? 'active' : ''}" onclick="HomeworkPage.switchTab('weekly')">📊 周汇总</div>
        <div class="segment-item ${this.currentTab === 'profile' ? 'active' : ''}" onclick="HomeworkPage.switchTab('profile')">👤 学生档案</div>
      </div>
    `;

    if (this.currentTab === 'list') {
      html += this.renderList(homeworks, records, students);
    } else if (this.currentTab === 'weekly') {
      html += this.renderWeekly(homeworks, records);
    } else {
      html += this.renderProfile(homeworks, records, students);
    }

    document.getElementById('mainContent').innerHTML = html;
  },

  // 作业列表
  renderList(homeworks, records, students) {
    if (homeworks.length === 0) {
      return Utils.emptyState('📝', '暂无作业，点击"布置作业"开始');
    }
    const sorted = [...homeworks].sort((a, b) => b.assignedDate.localeCompare(a.assignedDate));
    let html = '';
    sorted.forEach(h => {
      const incomplete = records.filter(r => r.homeworkId === h.id && r.status === '未完成');
      const totalCount = students.length;
      const incompleteCount = incomplete.length;
      const isOverdue = h.dueDate < Utils.today();
      const isToday = h.dueDate === Utils.today();

      html += `
        <div class="card" onclick="HomeworkPage.showDetail('${h.id}')">
          <div style="display:flex;justify-content:space-between;align-items:start;">
            <div style="flex:1;">
              <div style="font-weight:700;font-size:15px;">${h.subject} · ${h.title}</div>
              <div style="font-size:13px;color:var(--gray-500);margin-top:4px;">布置：${h.assignedDate} | 截止：${h.dueDate}</div>
              ${h.content ? `<div style="font-size:13px;color:var(--gray-600);margin-top:4px;">${h.content}</div>` : ''}
            </div>
            <span class="tag tag-${isOverdue ? 'gray' : isToday ? 'danger' : 'info'}">${isOverdue ? '已截止' : isToday ? '今日截止' : '进行中'}</span>
          </div>
          <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;">
            <div style="flex:1;">
              <div style="font-size:13px;margin-bottom:4px;">
                <span style="color:var(--gray-500);">完成情况：</span>
                <span style="font-weight:600;color:${incompleteCount === 0 ? 'var(--success)' : 'var(--danger)'};">${totalCount - incompleteCount}/${totalCount} 已完成</span>
                ${incompleteCount > 0 ? `<span style="color:var(--danger);margin-left:6px;">（${incompleteCount}人未完成）</span>` : ''}
              </div>
              <div class="progress-bar">
                <div class="progress-bar-fill ${incompleteCount === 0 ? 'success' : incompleteCount <= 5 ? 'warning' : 'danger'}" style="width:${totalCount > 0 ? ((totalCount - incompleteCount) / totalCount * 100) : 100}%;"></div>
              </div>
            </div>
          </div>
        </div>
      `;
    });
    return html;
  },

  // 周汇总
  renderWeekly(homeworks, records) {
    const weekRange = Utils.getWeekRange();
    const weekHomeworks = homeworks.filter(h => h.assignedDate >= weekRange.start && h.assignedDate <= weekRange.end);

    let html = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">📊 本周作业汇总</div>
          <div style="font-size:13px;color:var(--gray-500);">${weekRange.start} ~ ${weekRange.end}</div>
        </div>
    `;

    if (weekHomeworks.length === 0) {
      html += Utils.emptyState('📊', '本周暂无作业');
      html += '</div>';
      return html;
    }

    // 统计本周作业
    html += `<div style="margin-bottom:12px;">`;
    weekHomeworks.forEach(h => {
      const incomplete = records.filter(r => r.homeworkId === h.id && r.status === '未完成');
      html += `
        <div style="padding:8px 0;border-bottom:1px solid var(--border);">
          <div style="font-weight:600;font-size:14px;">${h.subject} · ${h.title}</div>
          <div style="font-size:12px;color:var(--gray-500);">布置：${h.assignedDate} | 截止：${h.dueDate}</div>
          <div style="font-size:13px;margin-top:2px;">
            ${incomplete.length > 0
              ? `<span style="color:var(--danger);">⚠️ ${incomplete.length}人未完成：${incomplete.map(r => r.studentName).join('、')}</span>`
              : `<span style="color:var(--success);">✅ 全部完成</span>`
            }
          </div>
        </div>
      `;
    });
    html += `</div>`;

    // 按学生汇总
    const studentMap = {}; // studentId -> { name, count, homeworks: [] }
    weekHomeworks.forEach(h => {
      const incomplete = records.filter(r => r.homeworkId === h.id && r.status === '未完成');
      incomplete.forEach(r => {
        if (!studentMap[r.studentId]) {
          studentMap[r.studentId] = { name: r.studentName, count: 0, homeworks: [] };
        }
        studentMap[r.studentId].count++;
        studentMap[r.studentId].homeworks.push(`${h.subject}·${h.title}`);
      });
    });

    const studentList = Object.values(studentMap).sort((a, b) => b.count - a.count);

    if (studentList.length > 0) {
      html += `
        <div style="font-weight:700;margin-bottom:8px;color:var(--danger);">⚠️ 未完成作业学生 (${studentList.length}人)</div>
      `;
      studentList.forEach((s, i) => {
        html += `
          <div class="list-item">
            <div class="list-avatar" style="background:#fee2e2;color:#991b1b;">${i + 1}</div>
            <div class="list-content">
              <div class="list-title">${s.name}</div>
              <div class="list-subtitle" style="color:var(--danger);">${s.count}次未完成：${s.homeworks.join('、')}</div>
            </div>
          </div>
        `;
      });
    } else {
      html += `<div style="padding:12px;text-align:center;color:var(--success);">🎉 本周所有作业全部完成！</div>`;
    }

    html += `
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;">
        <button class="btn btn-primary" style="flex:1;" onclick="HomeworkPage.copyWeekly()">📋 复制周汇总（发班群）</button>
        <button class="btn btn-outline" onclick="HomeworkPage.exportWeekly()">📥 导出</button>
      </div>
    `;

    return html;
  },

  copyWeekly() {
    const weekRange = Utils.getWeekRange();
    const homeworks = DB.getByClass('homework').filter(h => h.assignedDate >= weekRange.start && h.assignedDate <= weekRange.end);
    const records = DB.getByClass('homeworkRecords');
    const className = DB.getCurrentClass().name;

    let text = `📝 本周作业完成情况汇总\n（${weekRange.start} ~ ${weekRange.end}）\n`;
    text += `━━━━━━━━━━━━━━━━━━\n`;

    // 按学生汇总
    const studentMap = {};
    homeworks.forEach(h => {
      const incomplete = records.filter(r => r.homeworkId === h.id && r.status === '未完成');
      incomplete.forEach(r => {
        if (!studentMap[r.studentId]) {
          studentMap[r.studentId] = { name: r.studentName, count: 0, homeworks: [] };
        }
        studentMap[r.studentId].count++;
        studentMap[r.studentId].homeworks.push(`${h.subject}·${h.title}`);
      });
    });

    const studentList = Object.values(studentMap).sort((a, b) => b.count - a.count);

    if (studentList.length > 0) {
      text += `\n以下同学有未完成作业：\n`;
      studentList.forEach((s, i) => {
        text += `${i + 1}. ${s.name} - ${s.count}次未完成（${s.homeworks.join('、')}）\n`;
      });
      text += `\n请家长督促完成，谢谢配合！`;
    } else {
      text += `\n🎉 本周所有同学均已完成作业，表现棒棒哒！`;
    }

    this.copyToClipboard(text);
  },

  exportWeekly() {
    const weekRange = Utils.getWeekRange();
    const homeworks = DB.getByClass('homework').filter(h => h.assignedDate >= weekRange.start && h.assignedDate <= weekRange.end);
    const records = DB.getByClass('homeworkRecords');
    const className = DB.getCurrentClass().name;

    let csv = `${className} 本周作业汇总 (${weekRange.start}~${weekRange.end})\n\n`;
    csv += '姓名,未完成次数,未完成作业\n';

    const studentMap = {};
    homeworks.forEach(h => {
      const incomplete = records.filter(r => r.homeworkId === h.id && r.status === '未完成');
      incomplete.forEach(r => {
        if (!studentMap[r.studentId]) {
          studentMap[r.studentId] = { name: r.studentName, count: 0, homeworks: [] };
        }
        studentMap[r.studentId].count++;
        studentMap[r.studentId].homeworks.push(`${h.subject}·${h.title}`);
      });
    });

    Object.values(studentMap).sort((a, b) => b.count - a.count).forEach(s => {
      csv += `${s.name},${s.count}次,${s.homeworks.join('；')}\n`;
    });

    Utils.downloadFile(`${className}_本周作业汇总_${weekRange.start}.csv`, '\ufeff' + csv, 'text/csv');
    Utils.toast('已导出', 'success');
  },

  // 学生档案
  renderProfile(homeworks, records, students) {
    if (homeworks.length === 0) {
      return Utils.emptyState('👤', '暂无作业数据');
    }
    if (students.length === 0) return Utils.emptyState('👤', '暂无学生');

    // 统计每个学生
    const studentStats = students.map(s => {
      const sRecords = records.filter(r => r.studentId === s.id && r.status === '未完成');
      return {
        student: s,
        incompleteCount: sRecords.length,
        totalCount: homeworks.length,
        rate: homeworks.length > 0 ? Math.round((1 - sRecords.length / homeworks.length) * 100) : 100,
        records: sRecords
      };
    });

    // 排序：未完成多的在前
    studentStats.sort((a, b) => b.incompleteCount - a.incompleteCount);

    // 预警学生
    const warningStudents = studentStats.filter(s => s.incompleteCount >= 3);
    let html = '';

    if (warningStudents.length > 0) {
      html += `
        <div class="card" style="border-left:4px solid var(--danger);">
          <div class="card-header"><div class="card-title" style="color:var(--danger);">⚠️ 作业预警 (${warningStudents.length}人未完成≥3次)</div></div>
      `;
      warningStudents.forEach(s => {
        html += `
          <div class="list-item" onclick="HomeworkPage.showStudentProfile('${s.student.id}')">
            <div class="list-avatar" style="background:#fee2e2;color:#991b1b;">${Utils.getInitial(s.student.name)}</div>
            <div class="list-content">
              <div class="list-title">${s.student.name}</div>
              <div class="list-subtitle" style="color:var(--danger);">未完成${s.incompleteCount}次 · 完成率${s.rate}%</div>
            </div>
            <span class="tag tag-danger">需关注</span>
          </div>
        `;
      });
      html += '</div>';
    }

    // 全部学生列表
    html += `
      <div class="card">
        <div class="card-header"><div class="card-title">👤 全部学生作业完成情况</div></div>
    `;
    studentStats.forEach(s => {
      const isWarning = s.incompleteCount >= 3;
      html += `
        <div class="list-item" onclick="HomeworkPage.showStudentProfile('${s.student.id}')">
          <div class="list-avatar" style="background:${isWarning ? '#fee2e2' : 'var(--primary-bg)'};color:${isWarning ? 'var(--danger)' : 'var(--primary)'};">${Utils.getInitial(s.student.name)}</div>
          <div class="list-content">
            <div class="list-title">${s.student.name} ${isWarning ? '<span class="tag tag-danger" style="font-size:10px;">未完成' + s.incompleteCount + '</span>' : ''}</div>
            <div class="list-subtitle">完成率${s.rate}% | 共${s.totalCount}次作业，未完成${s.incompleteCount}次</div>
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
    const records = DB.getByClass('homeworkRecords').filter(r => r.studentId === studentId && r.status === '未完成');
    const sorted = [...homeworks].sort((a, b) => b.assignedDate.localeCompare(a.assignedDate));

    const incompleteCount = records.length;
    const completionRate = homeworks.length > 0 ? Math.round((1 - incompleteCount / homeworks.length) * 100) : 100;

    let html = `
      <div class="card">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="list-avatar" style="width:48px;height:48px;font-size:20px;background:${Utils.getColorFromName(student.name)};color:#fff;">${Utils.getInitial(student.name)}</div>
          <div>
            <div style="font-weight:700;font-size:18px;">${student.name}</div>
            <div style="font-size:13px;color:var(--gray-500);">作业完成情况详情</div>
          </div>
        </div>
      </div>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-value">${homeworks.length}</div><div class="stat-label">作业总数</div></div>
        <div class="stat-card success"><div class="stat-value">${homeworks.length - incompleteCount}</div><div class="stat-label">已完成</div></div>
        <div class="stat-card danger"><div class="stat-value">${incompleteCount}</div><div class="stat-label">未完成</div></div>
        <div class="stat-card info"><div class="stat-value">${completionRate}%</div><div class="stat-label">完成率</div></div>
      </div>
    `;

    if (records.length > 0) {
      html += `<div class="card"><div class="card-header"><div class="card-title">⚠️ 未完成记录</div></div>`;
      records.forEach(r => {
        const hw = homeworks.find(h => h.id === r.homeworkId);
        if (!hw) return;
        html += `
          <div class="list-item">
            <div class="list-avatar" style="background:#fee2e2;color:#991b1b;font-size:12px;">${hw.assignedDate.substring(5)}</div>
            <div class="list-content">
              <div class="list-title">${hw.subject} · ${hw.title}</div>
              <div class="list-subtitle" style="color:var(--danger);">⚠️ 未完成${r.note ? ' - ' + r.note : ''}</div>
            </div>
          </div>
        `;
      });
      html += '</div>';
    } else {
      html += `<div class="card" style="text-align:center;padding:20px;color:var(--success);">🎉 该学生所有作业均已完成！</div>`;
    }

    Utils.showModal(`${student.name} - 作业档案`, html, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">关闭</button>
    `);
  },

  // 作业详情
  showDetail(id) {
    const hw = (DB.get('homework') || []).find(h => h.id === id);
    if (!hw) return;
    const records = DB.getByClass('homeworkRecords').filter(r => r.homeworkId === id);
    const students = DB.getByClass('students');
    const incompleteRecords = records.filter(r => r.status === '未完成');
    const incompleteCount = incompleteRecords.length;
    const totalCount = students.length;

    let html = `
      <div class="card">
        <div style="font-weight:700;font-size:18px;">${hw.subject} · ${hw.title}</div>
        <div style="font-size:13px;color:var(--gray-500);margin-top:6px;">布置日期：${hw.assignedDate} | 截止日期：${hw.dueDate}</div>
        ${hw.content ? `<div style="font-size:14px;margin-top:8px;">${hw.content}</div>` : ''}
      </div>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-value">${totalCount}</div><div class="stat-label">总人数</div></div>
        <div class="stat-card success"><div class="stat-value">${totalCount - incompleteCount}</div><div class="stat-label">已完成</div></div>
        <div class="stat-card danger"><div class="stat-value">${incompleteCount}</div><div class="stat-label">未完成</div></div>
        <div class="stat-card info"><div class="stat-value">${totalCount > 0 ? Math.round((totalCount - incompleteCount) / totalCount * 100) : 0}%</div><div class="stat-label">完成率</div></div>
      </div>
    `;

    // 未完成学生列表
    if (incompleteCount > 0) {
      html += `
        <div style="margin-top:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <strong style="color:var(--danger);font-size:14px;">⚠️ 未完成 (${incompleteCount}人)</strong>
            <button class="btn btn-sm btn-outline" onclick="HomeworkPage.copyIncomplete('${id}')">📋 复制名单</button>
          </div>
      `;
      incompleteRecords.forEach(r => {
        html += `
          <div class="list-item">
            <div class="list-avatar" style="background:#fee2e2;color:#991b1b;">${Utils.getInitial(r.studentName)}</div>
            <div class="list-content">
              <div class="list-title">${r.studentName}</div>
              <div class="list-subtitle" style="color:var(--danger);">未完成${r.note ? ' - ' + r.note : ''}</div>
            </div>
            <button class="btn btn-sm btn-success" onclick="HomeworkPage.markComplete('${r.id}')">标记完成</button>
          </div>
        `;
      });
      html += '</div>';
    } else {
      html += `<div class="card" style="text-align:center;padding:20px;color:var(--success);margin-top:12px;">🎉 全部完成！</div>`;
    }

    Utils.showModal(`${hw.subject} · ${hw.title}`, html, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">关闭</button>
      <button class="btn btn-warning" style="flex:1;" onclick="HomeworkPage.showIncompletePicker('${id}')">➕ 登记未完成</button>
      <button class="btn btn-danger" style="flex:1;" onclick="deleteHomework('${id}')">🗑 删除</button>
    `);
  },

  // 登记未完成 - 学生多选
  showIncompletePicker(hwId) {
    const hw = (DB.get('homework') || []).find(h => h.id === hwId);
    if (!hw) return;
    const students = DB.getByClass('students');
    const records = DB.getByClass('homeworkRecords').filter(r => r.homeworkId === hwId && r.status === '未完成');
    const incompleteIds = new Set(records.map(r => r.studentId));

    let html = `
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:10px;">
        勾选未完成作业的学生，已勾选的将标记为"未完成"
      </div>
      <div style="max-height:400px;overflow-y:auto;">
    `;

    students.forEach(s => {
      const isChecked = incompleteIds.has(s.id);
      html += `
        <div class="list-item" onclick="HomeworkPage.toggleIncomplete('${hwId}', '${s.id}', this)" style="cursor:pointer;">
          <div class="list-avatar" style="background:${isChecked ? '#fee2e2' : 'var(--gray-100)'};color:${isChecked ? 'var(--danger)' : 'var(--gray-400)'};font-size:18px;">${isChecked ? '☑' : '☐'}</div>
          <div class="list-content">
            <div class="list-title">${s.name}</div>
            <div class="list-subtitle">${isChecked ? '已标记未完成' : '已完成'}</div>
          </div>
        </div>
      `;
    });

    html += '</div>';

    Utils.showModal(`登记未完成 - ${hw.title}`, html, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">完成</button>
    `);
  },

  toggleIncomplete(hwId, studentId, element) {
    const records = DB.get('homeworkRecords') || [];
    const existing = records.find(r => r.homeworkId === hwId && r.studentId === studentId && r.status === '未完成');
    const student = (DB.get('students') || []).find(s => s.id === studentId);
    if (!student) return;

    if (existing) {
      // 已标记 → 取消（删除记录）
      DB.delete('homeworkRecords', existing.id);
    } else {
      // 未标记 → 添加未完成记录
      DB.add('homeworkRecords', {
        homeworkId: hwId,
        studentId: studentId,
        studentName: student.name,
        status: '未完成',
        note: ''
      });
    }

    // 刷新弹窗
    Utils.closeModal();
    setTimeout(() => this.showIncompletePicker(hwId), 200);
  },

  markComplete(recordId) {
    DB.delete('homeworkRecords', recordId);
    Utils.toast('已标记为完成', 'success');
    const hwId = (DB.get('homeworkRecords') || []).find(r => r.id === recordId)?.homeworkId;
    Utils.closeModal();
    if (hwId) setTimeout(() => this.showDetail(hwId), 300);
  },

  copyIncomplete(hwId) {
    const hw = (DB.get('homework') || []).find(h => h.id === hwId);
    if (!hw) return;
    const records = DB.getByClass('homeworkRecords').filter(r => r.homeworkId === hwId && r.status === '未完成');

    let text = `📝 ${hw.subject}·${hw.title} 未完成名单\n`;
    text += `布置：${hw.assignedDate} | 截止：${hw.dueDate}\n`;
    text += `━━━━━━━━━━━━━━━━━━\n`;

    if (records.length > 0) {
      text += `以下${records.length}位同学未完成：\n`;
      records.forEach((r, i) => {
        text += `${i + 1}. ${r.studentName}\n`;
      });
      text += `\n请家长督促完成，谢谢配合！`;
    } else {
      text += `🎉 全部完成！`;
    }

    this.copyToClipboard(text);
  },

  copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        Utils.toast('已复制到剪贴板，可粘贴到班群', 'success');
      }).catch(() => {
        this.fallbackCopy(text);
      });
    } else {
      this.fallbackCopy(text);
    }
  },

  fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      Utils.toast('已复制到剪贴板，可粘贴到班群', 'success');
    } catch (e) {
      Utils.toast('复制失败，请手动选择文本', 'error');
    }
    document.body.removeChild(textarea);
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
    DB.add('homework', data);
    // 不再自动创建全班的 homeworkRecords
    // 老师在作业详情页手动登记未完成的学生
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
