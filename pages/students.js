/**
 * 学生管理页面
 */
const StudentsPage = {
  currentPage: 1,
  pageSize: 20,
  searchKey: '',

  render() {
    const cls = DB.getCurrentClass();
    let html = `
      <div class="page-title">👥 学生管理</div>
      <div class="page-subtitle">${cls.name} · 花名册管理</div>
    `;

    // 工具栏
    html += `
      <div class="toolbar">
        <div class="search-bar">
          <input type="text" placeholder="搜索学生姓名/学号..." value="${this.searchKey}" oninput="StudentsPage.search(this.value)">
        </div>
      </div>
      <div class="toolbar">
        <button class="btn btn-primary btn-sm" onclick="showStudentModal()">+ 添加学生</button>
        <button class="btn btn-outline btn-sm" onclick="StudentsPage.showImportModal()">📥 导入</button>
        <button class="btn btn-outline btn-sm" onclick="StudentsPage.exportCSV()">📤 导出CSV</button>
        <div class="toolbar-spacer"></div>
        <button class="btn btn-outline btn-sm" onclick="StudentsPage.exportAllReports()">📄 Word报告</button>
      </div>
    `;

    // 学生列表
    let students = DB.getByClass('students');
    if (this.searchKey) {
      const key = this.searchKey.toLowerCase();
      students = students.filter(s =>
        s.name.toLowerCase().includes(key) ||
        (s.studentNo || '').includes(key)
      );
    }

    // 统计
    const maleCount = students.filter(s => s.gender === '男').length;
    const femaleCount = students.filter(s => s.gender === '女').length;
    html += `
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-value">${students.length}</div>
          <div class="stat-label">总人数</div>
        </div>
        <div class="stat-card info">
          <div class="stat-value">${maleCount}</div>
          <div class="stat-label">男生</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-value">${femaleCount}</div>
          <div class="stat-label">女生</div>
        </div>
        <div class="stat-card success">
          <div class="stat-value">${students.filter(s => s.dorm === '住校').length}</div>
          <div class="stat-label">住校</div>
        </div>
      </div>
    `;

    // 分页
    const total = students.length;
    const totalPages = Math.ceil(total / this.pageSize);
    const start = (this.currentPage - 1) * this.pageSize;
    const pageStudents = students.slice(start, start + this.pageSize);

    if (pageStudents.length === 0) {
      html += Utils.emptyState('👥', '暂无学生数据，点击"添加学生"开始');
    } else {
      html += '<div class="card" style="padding:0;">';
      pageStudents.forEach((s, i) => {
        const avatarColor = Utils.getColorFromName(s.name);
        const roleTag = s.role ? `<span class="tag tag-primary">${s.role}</span>` : '';
        html += `
          <div class="list-item" onclick="StudentsPage.showProfile('${s.id}')">
            <div class="list-avatar" style="background:${avatarColor}20;color:${avatarColor};">${Utils.getInitial(s.name)}</div>
            <div class="list-content">
              <div class="list-title">${s.name} ${roleTag}</div>
              <div class="list-subtitle">${s.studentNo || ''} · ${s.gender} · ${s.dorm || '走读'}</div>
            </div>
            <div class="list-action">›</div>
          </div>
        `;
      });
      html += '</div>';

      // 分页
      if (totalPages > 1) {
        html += Utils.renderPagination(total, this.currentPage, this.pageSize, 'StudentsPage.goToPage');
      }
    }

    document.getElementById('mainContent').innerHTML = html;
  },

  search(key) {
    this.searchKey = key;
    this.currentPage = 1;
    this.render();
  },

  goToPage(page) {
    this.currentPage = page;
    this.render();
  },

  // 学生个人档案
  showProfile(id) {
    const student = (DB.get('students') || []).find(s => s.id === id);
    if (!student) return;

    const grades = DB.getByClass('grades').filter(g => g.studentId === id);
    const discipline = DB.getByClass('discipline').filter(d => d.studentId === id);
    const leaves = DB.getByClass('leaves').filter(l => l.studentId === id);
    const talks = DB.getByClass('talks').filter(t => t.studentId === id);
    const awards = DB.getByClass('awards').filter(a => a.studentName === student.name);
    const homeworkRecords = DB.getByClass('homeworkRecords').filter(h => h.studentId === id);

    const avatarColor = Utils.getColorFromName(student.name);
    let html = `
      <div class="profile-header">
        <div class="profile-avatar" style="background:${avatarColor};">${Utils.getInitial(student.name)}</div>
        <div class="profile-info">
          <h3>${student.name} ${student.role ? `<span class="tag tag-primary">${student.role}</span>` : ''}</h3>
          <p>${student.studentNo || ''} · ${student.gender} · ${Utils.calculateAge(student.birthday)}岁 · ${student.dorm || '走读'}</p>
        </div>
      </div>

      <div class="tabs">
        <div class="tab active" onclick="StudentsPage.switchTab(event, 'basic')">基本信息</div>
        <div class="tab" onclick="StudentsPage.switchTab(event, 'grades')">成绩(${grades.length})</div>
        <div class="tab" onclick="StudentsPage.switchTab(event, 'discipline')">违纪(${discipline.length})</div>
        <div class="tab" onclick="StudentsPage.switchTab(event, 'leaves')">请假(${leaves.length})</div>
        <div class="tab" onclick="StudentsPage.switchTab(event, 'talks')">谈话(${talks.length})</div>
      </div>

      <div id="tab-basic" class="tab-panel">
        <div class="card">
          <div class="card-title">📋 基本信息</div>
          <div style="display:grid;gap:8px;margin-top:12px;font-size:13px;">
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray-500);">学号</span><span>${student.studentNo || '-'}</span></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray-500);">性别</span><span>${student.gender || '-'}</span></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray-500);">出生日期</span><span>${student.birthday || '-'}</span></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray-500);">联系电话</span><span>${student.phone || '-'}</span></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray-500);">家长姓名</span><span>${student.parentName || '-'}</span></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray-500);">家长电话</span><span>${student.parentPhone || '-'}</span></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray-500);">住址</span><span>${student.address || '-'}</span></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray-500);">住宿</span><span>${student.dorm || '走读'}</span></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray-500);">班内职务</span><span>${student.role || '-'}</span></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray-500);">备注</span><span>${student.note || '-'}</span></div>
          </div>
        </div>
        <div class="card">
          <div class="card-title">🏆 获奖记录</div>
          ${awards.length > 0 ? awards.map(a => `
            <div class="list-item" style="padding:8px 0;">
              <div class="list-avatar" style="background:#fef3c7;color:#92400e;width:32px;height:32px;font-size:14px;">🏆</div>
              <div class="list-content">
                <div class="list-title">${a.awardName}</div>
                <div class="list-subtitle">${a.date} · ${a.level}</div>
              </div>
            </div>
          `).join('') : '<div style="color:var(--gray-400);font-size:13px;text-align:center;padding:12px;">暂无获奖记录</div>'}
        </div>
      </div>

      <div id="tab-grades" class="tab-panel" style="display:none;">
        ${grades.length > 0 ? grades.map(g => {
          const exam = DB.getByClass('exams').find(e => e.id === g.examId);
          return `
            <div class="card">
              <div class="card-header">
                <div class="card-title">📊 ${exam ? exam.name : '考试'}</div>
                <span class="tag tag-${g.rank <= 5 ? 'success' : g.rank <= 15 ? 'warning' : 'gray'}">第${g.rank}名</span>
              </div>
              <div class="stat-grid">
                <div class="stat-card"><div class="stat-value">${g.total}</div><div class="stat-label">总分</div></div>
                <div class="stat-card info"><div class="stat-value">${g.average}</div><div class="stat-label">平均分</div></div>
              </div>
              <div style="margin-top:8px;">
                ${Object.entries(g.scores).map(([subj, score]) => `
                  <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--gray-100);">
                    <span style="color:var(--gray-600);">${subj}</span>
                    <span style="font-weight:600;color:${score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--danger)'};">${score}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('') : '<div style="color:var(--gray-400);font-size:13px;text-align:center;padding:20px;">暂无成绩记录</div>'}
      </div>

      <div id="tab-discipline" class="tab-panel" style="display:none;">
        ${discipline.length > 0 ? discipline.map(d => `
          <div class="talk-card ${d.level === '严重' ? 'danger' : d.level === '一般' ? 'warning' : ''}">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <strong>${d.type}</strong>
              <span class="tag tag-${d.level === '严重' ? 'danger' : d.level === '一般' ? 'warning' : 'gray'}">${d.level}</span>
            </div>
            <div style="font-size:13px;color:var(--gray-500);">${d.date}</div>
            <div style="font-size:13px;margin-top:4px;">${d.description}</div>
            <div style="font-size:12px;color:var(--gray-500);margin-top:4px;">处理：${d.action}</div>
          </div>
        `).join('') : '<div style="color:var(--gray-400);font-size:13px;text-align:center;padding:20px;">无违纪记录 👍</div>'}
      </div>

      <div id="tab-leaves" class="tab-panel" style="display:none;">
        ${leaves.length > 0 ? leaves.map(l => `
          <div class="card" style="padding:12px;">
            <div style="display:flex;justify-content:space-between;">
              <strong>${l.type}</strong>
              <span class="tag tag-${l.status === '已批准' ? 'success' : l.status === '待审批' ? 'warning' : 'info'}">${l.status}</span>
            </div>
            <div style="font-size:13px;color:var(--gray-500);margin-top:4px;">${l.startDate} ~ ${l.endDate} (${l.days}天)</div>
            <div style="font-size:13px;margin-top:4px;">原因：${l.reason}</div>
          </div>
        `).join('') : '<div style="color:var(--gray-400);font-size:13px;text-align:center;padding:20px;">无请假记录</div>'}
      </div>

      <div id="tab-talks" class="tab-panel" style="display:none;">
        ${talks.length > 0 ? talks.map(t => `
          <div class="talk-card">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <strong>${t.type}</strong>
              <span style="font-size:12px;color:var(--gray-500);">${t.date}</span>
            </div>
            <div style="font-size:13px;margin-top:4px;">${t.content}</div>
            <div style="font-size:12px;color:var(--success);margin-top:4px;">效果：${t.effect}</div>
          </div>
        `).join('') : '<div style="color:var(--gray-400);font-size:13px;text-align:center;padding:20px;">无谈话记录</div>'}
      </div>
    `;

    Utils.showModal(`${student.name} · 个人档案`, html, `
      <button class="btn btn-secondary" style="flex:1;" onclick="StudentsPage.exportReport('${id}')">📄 导出报告</button>
      <button class="btn btn-secondary" style="flex:1;" onclick="editStudent('${id}')">✏️ 编辑</button>
      <button class="btn btn-danger" style="flex:1;" onclick="deleteStudent('${id}')">🗑 删除</button>
    `);
  },

  switchTab(event, tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
    document.getElementById(`tab-${tabName}`).style.display = 'block';
  },

  // 导入（覆盖模式）
  showImportModal() {
    const classes = DB.get('classes') || [];
    const cur = DB.getCurrentClass();
    const opts = classes.map(c => `<option value="${c.id}" ${c.id === cur.id ? 'selected' : ''}>${c.name}</option>`).join('');
    Utils.showModal('导入花名册', `
      <div class="form-group">
        <label class="form-label">目标班级</label>
        <select class="form-select" id="importClass">${opts}</select>
      </div>
      <div class="file-upload" onclick="document.getElementById('csvFile').click()">
        <div class="file-upload-icon">📁</div>
        <div id="importFileName">点击选择CSV文件</div>
        <div style="font-size:12px;color:var(--gray-400);margin-top:8px;">
          格式：姓名,学号,性别,出生日期,电话,家长姓名,家长电话,住址,住宿,职务
        </div>
      </div>
      <input type="file" id="csvFile" accept=".csv" style="display:none;" onchange="StudentsPage.onPickFile(event)">
      <div style="margin-top:12px;">
        <button class="btn btn-outline btn-block" onclick="StudentsPage.downloadTemplate()">下载模板</button>
      </div>
    `, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
      <button class="btn btn-danger" style="flex:1;" id="importConfirmBtn" disabled onclick="StudentsPage.doImport()">导入并覆盖</button>
    `);
  },

  onPickFile(event) {
    const file = event.target.files[0];
    this._pendingFile = file || null;
    const label = document.getElementById('importFileName');
    if (label) label.textContent = file ? ('已选择：' + file.name) : '点击选择CSV文件';
    const btn = document.getElementById('importConfirmBtn');
    if (btn) btn.disabled = !file;
  },

  doImport() {
    const file = this._pendingFile;
    if (!file) { Utils.toast('请先选择CSV文件', 'warning'); return; }
    const classId = document.getElementById('importClass').value;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // 兼容 UTF-8 / GBK(Excel默认) 编码
        const bytes = new Uint8Array(e.target.result);
        let text = new TextDecoder('utf-8').decode(bytes);
        if (text.indexOf('�') !== -1) {
          try { text = new TextDecoder('gbk').decode(bytes); } catch (_) {}
        }
        const rows = Utils.parseCSV(text);
        const list = [];
        rows.forEach(row => {
          const name = (row['姓名'] || row['name'] || '').trim();
          if (!name) return;
          list.push({
            name,
            studentNo: (row['学号'] || row['studentNo'] || '').trim(),
            gender: (row['性别'] || row['gender'] || '男').trim(),
            birthday: (row['出生日期'] || row['birthday'] || '').trim(),
            phone: (row['家长电话'] || row['电话'] || '').trim(),
            parentName: (row['家长姓名'] || '').trim(),
            parentPhone: (row['家长电话'] || '').trim(),
            address: (row['住址'] || '').trim(),
            dorm: (row['住宿'] || '走读').trim() || '走读',
            role: (row['职务'] || '').trim(),
            note: '',
            classId
          });
        });
        if (list.length === 0) { Utils.toast('未解析到有效学生数据', 'error'); return; }

        // 覆盖：删除该班原有学生，写入新名单
        const existing = DB.get('students') || [];
        const removedIds = new Set(existing.filter(s => s.classId === classId).map(s => s.id));
        const kept = existing.filter(s => s.classId !== classId);
        const now = new Date().toISOString();
        const merged = kept.concat(list.map(it => ({ ...it, id: DB.genId(), createdAt: now, updatedAt: now })));
        DB.set('students', merged);

        // 更新班级人数
        const classes = DB.get('classes') || [];
        const ci = classes.findIndex(c => c.id === classId);
        if (ci >= 0) { classes[ci].studentCount = list.length; DB.set('classes', classes); }

        // 清理座位表中已删除学生的引用，避免幽灵名字
        const seating = DB.get('seating') || [];
        let seatChanged = false;
        seating.forEach(rec => {
          if (rec.layout) rec.layout.forEach(g => g.desks.forEach(d => {
            const before = (d.students || []).length;
            d.students = (d.students || []).filter(s => !removedIds.has(s.studentId));
            if ((d.students || []).length !== before) seatChanged = true;
          }));
        });
        if (seatChanged) DB.set('seating', seating);

        const clsName = (classes[ci] && classes[ci].name) || '';
        Utils.closeModal();
        App.updateHeader();
        this.render();
        Utils.toast(`已覆盖导入 ${list.length} 名学生（${clsName}）`, 'success');
        if (seatChanged) Utils.toast('座位表已清除旧引用，建议重新自动排座', 'info');
      } catch (err) {
        Utils.toast('导入失败，请检查文件格式', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  },

  downloadTemplate() {
    const csv = '姓名,学号,性别,出生日期,电话,家长姓名,家长电话,住址,住宿\n张三,2024001,男,2010-05-15,13800000000,张父,13900000000,幸福路1号,走读\n';
    Utils.downloadFile('学生导入模板.csv', '\ufeff' + csv, 'text/csv');
  },

  // 导出CSV
  exportCSV() {
    const students = DB.getByClass('students');
    if (students.length === 0) {
      Utils.toast('暂无数据可导出', 'warning');
      return;
    }
    const data = students.map(s => ({
      姓名: s.name,
      学号: s.studentNo || '',
      性别: s.gender || '',
      出生日期: s.birthday || '',
      电话: s.phone || '',
      家长姓名: s.parentName || '',
      家长电话: s.parentPhone || '',
      住址: s.address || '',
      住宿: s.dorm || '',
      职务: s.role || ''
    }));
    const csv = Utils.toCSV(data, ['姓名', '学号', '性别', '出生日期', '电话', '家长姓名', '家长电话', '住址', '住宿', '职务']);
    Utils.downloadFile(`花名册_${Utils.today()}.csv`, '\ufeff' + csv, 'text/csv');
    Utils.toast('已导出CSV文件', 'success');
  },

  // 导出单个学生报告
  exportReport(id) {
    const student = (DB.get('students') || []).find(s => s.id === id);
    if (!student) return;

    const grades = DB.getByClass('grades').filter(g => g.studentId === id);
    const discipline = DB.getByClass('discipline').filter(d => d.studentId === id);
    const leaves = DB.getByClass('leaves').filter(l => l.studentId === id);
    const talks = DB.getByClass('talks').filter(t => t.studentId === id);
    const awards = DB.getByClass('awards').filter(a => a.studentName === student.name);

    let content = `
      <h1>学生个人档案报告</h1>
      <div class="header">
        <p>${DB.getCurrentClass().name}</p>
        <p>生成日期：${Utils.today()}</p>
      </div>
      <h2>一、基本信息</h2>
      <table>
        <tr><td width="20%">姓名</td><td>${student.name}</td><td width="20%">学号</td><td>${student.studentNo || ''}</td></tr>
        <tr><td>性别</td><td>${student.gender || ''}</td><td>出生日期</td><td>${student.birthday || ''}</td></tr>
        <tr><td>联系电话</td><td>${student.phone || ''}</td><td>住宿</td><td>${student.dorm || '走读'}</td></tr>
        <tr><td>家长姓名</td><td>${student.parentName || ''}</td><td>家长电话</td><td>${student.parentPhone || ''}</td></tr>
        <tr><td>住址</td><td colspan="3">${student.address || ''}</td></tr>
        <tr><td>班内职务</td><td>${student.role || ''}</td><td>备注</td><td>${student.note || ''}</td></tr>
      </table>
    `;

    if (grades.length > 0) {
      content += '<h2>二、成绩记录</h2><table><tr><th>考试名称</th><th>总分</th><th>平均分</th><th>排名</th>';
      const subjects = grades[0] && grades[0].scores ? Object.keys(grades[0].scores) : [];
      subjects.forEach(s => content += `<th>${s}</th>`);
      content += '</tr>';
      grades.forEach(g => {
        const exam = DB.getByClass('exams').find(e => e.id === g.examId);
        content += `<tr><td>${exam ? exam.name : ''}</td><td>${g.total}</td><td>${g.average}</td><td>${g.rank}</td>`;
        subjects.forEach(s => content += `<td>${g.scores[s] || ''}</td>`);
        content += '</tr>';
      });
      content += '</table>';
    }

    if (discipline.length > 0) {
      content += '<h2>三、违纪记录</h2><table><tr><th>日期</th><th>类型</th><th>级别</th><th>描述</th><th>处理</th></tr>';
      discipline.forEach(d => {
        content += `<tr><td>${d.date}</td><td>${d.type}</td><td>${d.level}</td><td>${d.description}</td><td>${d.action}</td></tr>`;
      });
      content += '</table>';
    }

    if (leaves.length > 0) {
      content += '<h2>四、请假记录</h2><table><tr><th>类型</th><th>开始日期</th><th>结束日期</th><th>天数</th><th>原因</th><th>状态</th></tr>';
      leaves.forEach(l => {
        content += `<tr><td>${l.type}</td><td>${l.startDate}</td><td>${l.endDate}</td><td>${l.days}</td><td>${l.reason}</td><td>${l.status}</td></tr>`;
      });
      content += '</table>';
    }

    if (talks.length > 0) {
      content += '<h2>五、谈话记录</h2>';
      talks.forEach(t => {
        content += `<p><strong>${t.date} ${t.type}</strong></p><p>内容：${t.content}</p><p>效果：${t.effect}</p><hr>`;
      });
    }

    if (awards.length > 0) {
      content += '<h2>六、获奖记录</h2><table><tr><th>奖项</th><th>级别</th><th>日期</th><th>颁发单位</th></tr>';
      awards.forEach(a => {
        content += `<tr><td>${a.awardName}</td><td>${a.level}</td><td>${a.date}</td><td>${a.organization}</td></tr>`;
      });
      content += '</table>';
    }

    content += `<div class="footer"><p>班主任签字：____________</p></div>`;

    Utils.exportWord(`${student.name}_个人档案报告.doc`, '学生个人档案报告', content);
    Utils.toast('报告已导出', 'success');
  },

  // 导出全部学生报告
  exportAllReports() {
    const students = DB.getByClass('students');
    if (students.length === 0) {
      Utils.toast('暂无学生数据', 'warning');
      return;
    }
    Utils.confirm(`将为 ${students.length} 名学生分别生成Word报告，确定继续？`, () => {
      students.forEach((s, i) => {
        setTimeout(() => this.exportReport(s.id), i * 500);
      });
      Utils.toast(`正在导出${students.length}份报告...`, 'info');
    });
  }
};

// 添加/编辑学生
function showStudentModal(id) {
  const student = id ? (DB.get('students') || []).find(s => s.id === id) : null;
  const isEdit = !!student;

  Utils.showModal(isEdit ? '编辑学生' : '添加学生', `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">姓名 *</label>
        <input class="form-input" id="stuName" value="${student?.name || ''}" placeholder="请输入姓名">
      </div>
      <div class="form-group">
        <label class="form-label">学号</label>
        <input class="form-input" id="stuNo" value="${student?.studentNo || ''}" placeholder="请输入学号">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">性别</label>
        <select class="form-select" id="stuGender">
          <option value="男" ${student?.gender === '男' ? 'selected' : ''}>男</option>
          <option value="女" ${student?.gender === '女' ? 'selected' : ''}>女</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">出生日期</label>
        <input class="form-input" id="stuBirthday" type="date" value="${student?.birthday || ''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">学生电话</label>
        <input class="form-input" id="stuPhone" value="${student?.phone || ''}" placeholder="学生联系电话">
      </div>
      <div class="form-group">
        <label class="form-label">住宿</label>
        <select class="form-select" id="stuDorm">
          <option value="走读" ${student?.dorm === '走读' ? 'selected' : ''}>走读</option>
          <option value="住校" ${student?.dorm === '住校' ? 'selected' : ''}>住校</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">家长姓名</label>
        <input class="form-input" id="stuParentName" value="${student?.parentName || ''}" placeholder="家长姓名">
      </div>
      <div class="form-group">
        <label class="form-label">家长电话</label>
        <input class="form-input" id="stuParentPhone" value="${student?.parentPhone || ''}" placeholder="家长电话">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">家庭住址</label>
      <input class="form-input" id="stuAddress" value="${student?.address || ''}" placeholder="家庭住址">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">班内职务</label>
        <select class="form-select" id="stuRole">
          <option value="">无</option>
          <option value="班长" ${student?.role === '班长' ? 'selected' : ''}>班长</option>
          <option value="副班长" ${student?.role === '副班长' ? 'selected' : ''}>副班长</option>
          <option value="学习委员" ${student?.role === '学习委员' ? 'selected' : ''}>学习委员</option>
          <option value="纪律委员" ${student?.role === '纪律委员' ? 'selected' : ''}>纪律委员</option>
          <option value="卫生委员" ${student?.role === '卫生委员' ? 'selected' : ''}>卫生委员</option>
          <option value="体育委员" ${student?.role === '体育委员' ? 'selected' : ''}>体育委员</option>
          <option value="文艺委员" ${student?.role === '文艺委员' ? 'selected' : ''}>文艺委员</option>
          <option value="团支书" ${student?.role === '团支书' ? 'selected' : ''}>团支书</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">备注</label>
        <input class="form-input" id="stuNote" value="${student?.note || ''}" placeholder="特长生/班委等">
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
    <button class="btn btn-primary" style="flex:1;" onclick="saveStudent(${isEdit ? `'${id}'` : 'null'})">保存</button>
  `);
}

function saveStudent(id) {
  const name = document.getElementById('stuName').value.trim();
  if (!name) {
    Utils.toast('请输入学生姓名', 'error');
    return;
  }

  const data = {
    name: name,
    studentNo: document.getElementById('stuNo').value.trim(),
    gender: document.getElementById('stuGender').value,
    birthday: document.getElementById('stuBirthday').value,
    phone: document.getElementById('stuPhone').value.trim(),
    dorm: document.getElementById('stuDorm').value,
    parentName: document.getElementById('stuParentName').value.trim(),
    parentPhone: document.getElementById('stuParentPhone').value.trim(),
    address: document.getElementById('stuAddress').value.trim(),
    role: document.getElementById('stuRole').value,
    note: document.getElementById('stuNote').value.trim()
  };

  if (id) {
    DB.update('students', id, data);
    Utils.toast('修改成功', 'success');
  } else {
    DB.add('students', data);
    Utils.toast('添加成功', 'success');
  }
  Utils.closeModal();
  App.updateHeader();
  StudentsPage.render();
}

function editStudent(id) {
  Utils.closeModal();
  setTimeout(() => showStudentModal(id), 300);
}

function deleteStudent(id) {
  const student = (DB.get('students') || []).find(s => s.id === id);
  Utils.confirm(`确定要删除【${student.name}】吗？相关数据将一并删除。`, () => {
    DB.delete('students', id);
    Utils.closeModal();
    App.updateHeader();
    StudentsPage.render();
    Utils.toast('已删除', 'success');
  });
}
