/**
 * 家长会助手页面
 */
const MeetingPage = {
  currentTab: 'list',

  render() {
    let html = `
      <div class="page-title">🤝 家长会助手</div>
      <div class="page-subtitle">一键生成学生报告单 · 批量导出</div>
    `;

    html += `
      <div class="toolbar">
        <button class="btn btn-primary btn-sm" onclick="MeetingPage.createMeeting()">+ 新建家长会报告</button>
      </div>
    `;

    const reports = DB.getByClass('meetingReports');

    // 标签
    html += `
      <div class="segment-control">
        <div class="segment-item ${this.currentTab === 'list' ? 'active' : ''}" onclick="MeetingPage.switchTab('list')">📋 报告列表</div>
        <div class="segment-item ${this.currentTab === 'template' ? 'active' : ''}" onclick="MeetingPage.switchTab('template')">📄 报告模板</div>
      </div>
    `;

    if (this.currentTab === 'list') {
      html += this.renderList(reports);
    } else {
      html += this.renderTemplate();
    }

    document.getElementById('mainContent').innerHTML = html;
  },

  renderList(reports) {
    if (reports.length === 0) {
      return Utils.emptyState('🤝', '暂无家长会报告，点击"新建"开始');
    }
    const sorted = [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    let html = '';
    sorted.forEach(r => {
      const reportCount = r.reports?.length || 0;
      html += `
        <div class="card" onclick="MeetingPage.showMeeting('${r.id}')">
          <div style="display:flex;justify-content:space-between;align-items:start;">
            <div style="flex:1;">
              <div style="font-weight:700;font-size:15px;">${r.title}</div>
              <div style="font-size:13px;color:var(--gray-500);margin-top:4px;">📅 ${r.date} | ${reportCount}份报告</div>
            </div>
            <span class="tag tag-info">${r.examName || '未关联考试'}</span>
          </div>
          <div style="margin-top:8px;display:flex;gap:8px;">
            <button class="btn btn-sm btn-outline" onclick="event.stopPropagation();MeetingPage.exportAll('${r.id}')">📥 批量导出</button>
            <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();MeetingPage.deleteMeeting('${r.id}')">🗑 删除</button>
          </div>
        </div>
      `;
    });
    return html;
  },

  renderTemplate() {
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">📄 报告单模板预览</div></div>
        <div style="padding:12px;background:var(--gray-50);border-radius:var(--radius);font-size:14px;line-height:2;">
          <div style="text-align:center;font-weight:700;font-size:18px;margin-bottom:8px;">【学生姓名】同学报告单</div>
          <div style="text-align:center;color:var(--gray-500);font-size:13px;margin-bottom:12px;">${DB.getCurrentClass().name} · {家长会日期}</div>
          <hr style="border:none;border-top:1px solid var(--border);margin:8px 0;">
          <p><strong>一、学业表现</strong></p>
          <p style="padding-left:16px;">各科分数及排名、总分、班级均分对比</p>
          <p><strong>二、纪律表现</strong></p>
          <p style="padding-left:16px;">违纪次数及类型统计</p>
          <p><strong>三、作业完成</strong></p>
          <p style="padding-left:16px;">作业提交率、质量评价分布</p>
          <p><strong>四、出勤情况</strong></p>
          <p style="padding-left:16px;">出勤率、迟到/请假/旷课统计</p>
          <p><strong>五、班主任评语</strong></p>
          <p style="padding-left:16px;">可自定义编辑</p>
        </div>
      </div>
    `;
  },

  createMeeting() {
    const exams = DB.getByClass('exams');
    let examOptions = '<option value="">不关联考试</option>';
    exams.forEach(e => {
      examOptions += `<option value="${e.id}">${e.name} (${e.date})</option>`;
    });

    Utils.showModal('新建家长会报告', `
      <div class="form-group">
        <label class="form-label">家长会标题 *</label>
        <input class="form-input" id="meetingTitle" placeholder="如：七年级期末家长会" value="${DB.getCurrentClass().name}家长会">
      </div>
      <div class="form-group">
        <label class="form-label">家长会日期</label>
        <input class="form-input" id="meetingDate" type="date" value="${Utils.today()}">
      </div>
      <div class="form-group">
        <label class="form-label">关联考试</label>
        <select class="form-select" id="meetingExam">${examOptions}</select>
      </div>
      <div style="padding:10px;background:var(--primary-bg);border-radius:var(--radius);font-size:13px;color:var(--text-secondary);margin-top:8px;">
        💡 系统将自动为每位学生生成报告单，包含成绩、纪律、作业、出勤等信息，您可逐个编辑评语后导出。
      </div>
    `, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
      <button class="btn btn-primary" style="flex:1;" onclick="MeetingPage.generateReports()">生成报告</button>
    `);
  },

  generateReports() {
    const title = document.getElementById('meetingTitle').value.trim();
    const date = document.getElementById('meetingDate').value;
    const examId = document.getElementById('meetingExam').value;
    const examName = examId ? (DB.getByClass('exams').find(e => e.id === examId)?.name || '') : '';

    if (!title) {
      Utils.toast('请输入标题', 'error');
      return;
    }

    const students = DB.getByClass('students');
    const grades = DB.getByClass('grades');
    const discipline = DB.getByClass('discipline');
    const homeworkRecords = DB.getByClass('homeworkRecords');
    const homeworks = DB.getByClass('homework');
    const attendance = DB.getByClass('attendance');

    // 班级均分
    const examGrades = examId ? grades.filter(g => g.examId === examId) : [];
    const classAvg = examGrades.length > 0 ? (examGrades.reduce((sum, g) => sum + g.total, 0) / examGrades.length).toFixed(1) : '-';

    // 为每个学生生成报告
    const reports = students.map(s => {
      // 成绩
      const grade = examId ? examGrades.find(g => g.studentId === s.id) : null;
      let gradeSummary = '暂无成绩数据';
      if (grade) {
        const subjects = [];
        if (grade.chinese !== null && grade.chinese !== undefined) subjects.push(`语文${grade.chinese}分`);
        if (grade.math !== null && grade.math !== undefined) subjects.push(`数学${grade.math}分`);
        if (grade.english !== null && grade.english !== undefined) subjects.push(`英语${grade.english}分`);
        if (grade.politics !== null && grade.politics !== undefined) subjects.push(`政治${grade.politics}分`);
        if (grade.history !== null && grade.history !== undefined) subjects.push(`历史${grade.history}分`);
        if (grade.biology !== null && grade.biology !== undefined) subjects.push(`生物${grade.biology}分`);
        if (grade.geography !== null && grade.geography !== undefined) subjects.push(`地理${grade.geography}分`);
        gradeSummary = `${subjects.join('，')}。总分${grade.total}分，班级排名第${grade.rank}名。班级均分${classAvg}分。`;
      }

      // 纪律
      const studentDiscipline = discipline.filter(d => d.studentId === s.id);
      let disciplineSummary = '本学期无违纪记录，表现良好。';
      if (studentDiscipline.length > 0) {
        const typeCounts = {};
        studentDiscipline.forEach(d => { typeCounts[d.type] = (typeCounts[d.type] || 0) + 1; });
        const typeStr = Object.entries(typeCounts).map(([t, c]) => `${t}${c}次`).join('、');
        disciplineSummary = `本学期共违纪${studentDiscipline.length}次：${typeStr}。`;
      }

      // 作业
      const studentHwRecords = homeworkRecords.filter(r => r.studentId === s.id);
      const submitted = studentHwRecords.filter(r => r.status === '已提交');
      const hwRate = studentHwRecords.length > 0 ? (submitted.length / studentHwRecords.length * 100).toFixed(0) : 100;
      const qualityCounts = { '优': 0, '良': 0, '中': 0, '差': 0 };
      submitted.forEach(r => { if (qualityCounts[r.quality] !== undefined) qualityCounts[r.quality]++; });
      const homeworkSummary = `作业提交率${hwRate}%（${submitted.length}/${studentHwRecords.length}），质量评价：优${qualityCounts['优']}次/良${qualityCounts['良']}次/中${qualityCounts['中']}次/差${qualityCounts['差']}次。`;

      // 出勤（学生每天分上午/下午两个时段，按时段统计）
      // 正常到校 = 出勤 + 迟到；缺勤 = 请假 + 旷课
      let normal = 0, late = 0, leave = 0, absent = 0;
      attendance.forEach(a => {
        const r = a.records.find(rec => rec.studentId === s.id);
        if (r) {
          const n = AttendancePage.norm(r);
          [n.am, n.pm].forEach(st => {
            if (st === '出勤') { normal++; }
            else if (st === '迟到') { late++; normal++; }
            else if (st === '请假') { leave++; }
            else if (st === '旷课') { absent++; }
          });
        }
      });
      const totalAtt = normal + late + leave + absent;
      const attRate = totalAtt > 0 ? (normal / totalAtt * 100).toFixed(0) : 100;
      const attendanceSummary = totalAtt > 0
        ? `出勤率${attRate}%（到校${normal}个时段、迟到${late}次、请假${leave}次、旷课${absent}次）。`
        : '暂无考勤记录。';

      // 组装报告内容
      const content = `一、学业表现（${examName || '未关联考试'}）\n  ${gradeSummary}\n\n二、纪律表现\n  ${disciplineSummary}\n\n三、作业完成\n  ${homeworkSummary}\n\n四、出勤情况\n  ${attendanceSummary}\n\n五、班主任评语\n  请编辑评语...`;

      return {
        studentId: s.id,
        studentName: s.name,
        content: content,
        gradeSummary, disciplineSummary, homeworkSummary, attendanceSummary,
        comment: ''
      };
    });

    const meeting = DB.add('meetingReports', {
      title: title,
      date: date,
      examId: examId,
      examName: examName,
      reports: reports,
      generatedAt: new Date().toISOString()
    });

    Utils.closeModal();
    Utils.toast(`已生成${reports.length}份报告`, 'success');
    this.showMeeting(meeting.id);
  },

  showMeeting(id) {
    const meeting = (DB.get('meetingReports') || []).find(m => m.id === id);
    if (!meeting) return;

    let html = `
      <div class="card">
        <div style="font-weight:700;font-size:18px;">${meeting.title}</div>
        <div style="font-size:13px;color:var(--gray-500);margin-top:6px;">📅 ${meeting.date} | ${meeting.reports.length}份报告</div>
      </div>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-value">${meeting.reports.length}</div><div class="stat-label">报告总数</div></div>
        <div class="stat-card success"><div class="stat-value">${meeting.reports.filter(r => r.comment).length}</div><div class="stat-label">已编辑评语</div></div>
        <div class="stat-card warning"><div class="stat-value">${meeting.reports.filter(r => !r.comment).length}</div><div class="stat-label">待编辑评语</div></div>
      </div>
    `;

    // 学生报告列表
    html += '<div style="margin-top:12px;font-weight:700;margin-bottom:8px;">📄 学生报告单</div>';
    meeting.reports.forEach((r, i) => {
      const hasComment = r.comment && r.comment.trim();
      html += `
        <div class="list-item" onclick="MeetingPage.showReport('${id}', ${i})">
          <div class="list-avatar" style="background:${Utils.getColorFromName(r.studentName)};color:#fff;">${Utils.getInitial(r.studentName)}</div>
          <div class="list-content">
            <div class="list-title">${r.studentName}</div>
            <div class="list-subtitle">${hasComment ? '已编辑评语' : '点击编辑评语'}</div>
          </div>
          <span class="tag tag-${hasComment ? 'success' : 'gray'}">${hasComment ? '已完成' : '待编辑'}</span>
        </div>
      `;
    });

    Utils.showModal(meeting.title, html, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">关闭</button>
      <button class="btn btn-primary" style="flex:1;" onclick="MeetingPage.exportAll('${id}')">📥 批量导出Word</button>
    `);
  },

  showReport(meetingId, index) {
    const meeting = (DB.get('meetingReports') || []).find(m => m.id === meetingId);
    if (!meeting) return;
    const report = meeting.reports[index];
    if (!report) return;

    let html = `
      <div class="card">
        <div style="font-weight:700;font-size:18px;text-align:center;">${report.studentName} 同学报告单</div>
        <div style="text-align:center;color:var(--gray-500);font-size:13px;margin-top:4px;">${meeting.title} · ${meeting.date}</div>
      </div>
      <div class="card">
        <div style="font-size:14px;line-height:2;white-space:pre-wrap;">${report.content}</div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">✏️ 班主任评语</div></div>
        <textarea class="form-textarea" id="reportComment" style="min-height:120px;" placeholder="请输入对该学生的评语...">${report.comment || ''}</textarea>
      </div>
    `;

    Utils.showModal(`${report.studentName} - 报告单`, html, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">返回</button>
      <button class="btn btn-primary" style="flex:1;" onclick="MeetingPage.saveComment('${meetingId}', ${index})">保存评语</button>
      <button class="btn btn-outline" style="flex:1;" onclick="MeetingPage.exportSingle('${meetingId}', ${index})">📥 导出</button>
    `);
  },

  saveComment(meetingId, index) {
    const meetings = DB.get('meetingReports') || [];
    const meeting = meetings.find(m => m.id === meetingId);
    if (!meeting) return;
    const comment = document.getElementById('reportComment').value.trim();
    meeting.reports[index].comment = comment;
    // 重新组装内容
    if (comment) {
      meeting.reports[index].content = meeting.reports[index].content.replace('请编辑评语...', comment);
    }
    meeting.updatedAt = new Date().toISOString();
    DB.set('meetingReports', meetings);
    Utils.toast('评语已保存', 'success');
    Utils.closeModal();
    setTimeout(() => this.showMeeting(meetingId), 300);
  },

  exportSingle(meetingId, index) {
    const meeting = (DB.get('meetingReports') || []).find(m => m.id === meetingId);
    if (!meeting) return;
    const report = meeting.reports[index];
    if (!report) return;

    const contentHtml = `
      <h1 style="text-align:center;">${report.studentName} 同学报告单</h1>
      <p style="text-align:center;color:#666;">${meeting.title} · ${meeting.date}</p>
      <hr>
      <pre style="white-space:pre-wrap;font-size:14px;line-height:2;">${report.content}</pre>
    `;

    Utils.exportWord(`${report.studentName}_报告单.doc`, `${report.studentName} 同学报告单`, contentHtml);
    Utils.toast('已导出', 'success');
  },

  exportAll(meetingId) {
    const meeting = (DB.get('meetingReports') || []).find(m => m.id === meetingId);
    if (!meeting) return;

    // 合并所有报告为一个Word文档
    let contentHtml = `<h1 style="text-align:center;">${meeting.title} - 学生报告单合辑</h1>
      <p style="text-align:center;color:#666;">${DB.getCurrentClass().name} · ${meeting.date}</p>
      <hr style="page-break-after:always;">`;

    meeting.reports.forEach(r => {
      contentHtml += `
        <h2 style="text-align:center;">${r.studentName} 同学报告单</h2>
        <pre style="white-space:pre-wrap;font-size:14px;line-height:2;">${r.content}</pre>
        <hr style="page-break-after:always;">
      `;
    });

    Utils.exportWord(`${meeting.title}_报告单合辑.doc`, `${meeting.title} - 学生报告单`, contentHtml);
    Utils.toast(`已导出${meeting.reports.length}份报告`, 'success');
  },

  deleteMeeting(id) {
    Utils.confirm('确定要删除此家长会报告吗？', () => {
      DB.delete('meetingReports', id);
      this.render();
      Utils.toast('已删除', 'success');
    });
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.render();
  }
};
