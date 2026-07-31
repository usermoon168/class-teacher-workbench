/**
 * 成绩分析页面
 */
const GradesPage = {
  currentExamId: '',
  currentTab: 'overview',

  render() {
    const exams = DB.getByClass('exams');
    let html = `
      <div class="page-title">📈 成绩分析</div>
      <div class="page-subtitle">考试管理 · 成绩录入 · 多维度分析</div>
    `;

    // 工具栏
    html += `
      <div class="toolbar">
        <button class="btn btn-primary btn-sm" onclick="showExamModal()">+ 新建考试</button>
        <button class="btn btn-outline btn-sm" onclick="showGradeEntryModal()">📝 录入成绩</button>
        <button class="btn btn-outline btn-sm" onclick="showGradeImportModal()">📥 批量导入</button>
        <button class="btn btn-outline btn-sm" onclick="GradesPage.exportGrades()">📤 导出</button>
      </div>
    `;

    // 考试选择
    if (exams.length === 0) {
      html += Utils.emptyState('📈', '暂无考试数据，点击"新建考试"开始');
      document.getElementById('mainContent').innerHTML = html;
      return;
    }

    html += `
      <div class="form-group">
        <label class="form-label">选择考试</label>
        <select class="form-select" onchange="GradesPage.selectExam(this.value)">
    `;
    exams.forEach(e => {
      html += `<option value="${e.id}" ${e.id === this.currentExamId ? 'selected' : ''}>${e.name} (${e.date})</option>`;
    });
    html += '</select></div>';

    if (!this.currentExamId) {
      this.currentExamId = exams[exams.length - 1].id;
    }

    const exam = exams.find(e => e.id === this.currentExamId);
    const grades = DB.getByClass('grades').filter(g => g.examId === this.currentExamId);

    if (grades.length === 0) {
      html += Utils.emptyState('📝', '该考试暂无成绩，点击"录入成绩"开始');
      document.getElementById('mainContent').innerHTML = html;
      return;
    }

    // 切换标签
    html += `
      <div class="segment-control">
        <div class="segment-item ${this.currentTab === 'overview' ? 'active' : ''}" onclick="GradesPage.switchTab('overview')">📊 数据总览</div>
        <div class="segment-item ${this.currentTab === 'ranking' ? 'active' : ''}" onclick="GradesPage.switchTab('ranking')">🏆 成绩排名</div>
        <div class="segment-item ${this.currentTab === 'subject' ? 'active' : ''}" onclick="GradesPage.switchTab('subject')">📚 科目分析</div>
        <div class="segment-item ${this.currentTab === 'distribution' ? 'active' : ''}" onclick="GradesPage.switchTab('distribution')">📈 分数分布</div>
      </div>
    `;

    // 排序
    const sortedGrades = [...grades].sort((a, b) => b.total - a.total);

    if (this.currentTab === 'overview') {
      const totals = grades.map(g => g.total);
      const avg = Utils.average(totals).toFixed(1);
      const max = Math.max(...totals);
      const min = Math.min(...totals);
      const passCount = grades.filter(g => g.average >= 60).length;
      const excellentCount = grades.filter(g => g.average >= 85).length;
      const stdDev = Math.sqrt(Utils.average(totals.map(t => Math.pow(t - avg, 2)))).toFixed(1);

      html += `
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-value">${grades.length}</div>
            <div class="stat-label">参考人数</div>
          </div>
          <div class="stat-card info">
            <div class="stat-value">${avg}</div>
            <div class="stat-label">班级均分</div>
          </div>
          <div class="stat-card success">
            <div class="stat-value">${max}</div>
            <div class="stat-label">最高分</div>
          </div>
          <div class="stat-card danger">
            <div class="stat-value">${min}</div>
            <div class="stat-label">最低分</div>
          </div>
          <div class="stat-card warning">
            <div class="stat-value">${passCount}</div>
            <div class="stat-label">及格人数</div>
          </div>
          <div class="stat-card success">
            <div class="stat-value">${excellentCount}</div>
            <div class="stat-label">优秀人数</div>
          </div>
          <div class="stat-card info">
            <div class="stat-value">${(passCount / grades.length * 100).toFixed(0)}%</div>
            <div class="stat-label">及格率</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stdDev}</div>
            <div class="stat-label">标准差</div>
          </div>
        </div>
      `;

      // 各科均分图
      html += `
        <div class="card">
          <div class="card-header">
            <div class="card-title">📊 各科平均分</div>
          </div>
          <div class="chart-container large">
            <canvas id="subjectAvgChart"></canvas>
          </div>
        </div>
      `;

      // 及格率对比
      html += `
        <div class="card">
          <div class="card-header">
            <div class="card-title">📊 各科及格率</div>
          </div>
          <div class="chart-container large">
            <canvas id="passRateChart"></canvas>
          </div>
        </div>
      `;
    } else if (this.currentTab === 'ranking') {
      html += '<div class="card" style="padding:0;"><div class="table-wrapper"><table class="data-table"><thead><tr><th>排名</th><th>姓名</th>';
      exam.subjects.forEach(s => html += `<th>${s}</th>`);
      html += '<th>总分</th><th>均分</th></tr></thead><tbody>';
      sortedGrades.forEach(g => {
        const rankClass = g.rank <= 5 ? 'text-success' : g.rank <= 15 ? '' : g.rank >= grades.length - 4 ? 'text-danger' : '';
        html += `<tr onclick="StudentsPage.showProfile('${g.studentId}')"><td class="${rankClass}" style="font-weight:700;">${g.rank <= 3 ? ['🥇','🥈','🥉'][g.rank-1] : g.rank}</td><td>${g.studentName}</td>`;
        exam.subjects.forEach(s => {
          const score = g.scores[s] || 0;
          const color = score >= 80 ? 'var(--success)' : score >= 60 ? '' : 'var(--danger)';
          html += `<td style="color:${color};font-weight:${score >= 80 || score < 60 ? '600' : '400'};">${score}</td>`;
        });
        html += `<td style="font-weight:700;">${g.total}</td><td>${g.average}</td></tr>`;
      });
      html += '</tbody></table></div></div>';
    } else if (this.currentTab === 'subject') {
      html += `
        <div class="form-group">
          <label class="form-label">选择科目</label>
          <select class="form-select" id="subjectSelect" onchange="GradesPage.renderSubjectAnalysis()">
            ${exam.subjects.map(s => `<option value="${s}">${s}</option>`).join('')}
          </select>
        </div>
        <div id="subjectAnalysisContainer"></div>
      `;
    } else if (this.currentTab === 'distribution') {
      // 总分分布
      const ranges = [
        { label: '0-59', min: 0, max: 59, color: '#ef4444' },
        { label: '60-69', min: 60, max: 69, color: '#f59e0b' },
        { label: '70-79', min: 70, max: 79, color: '#0ea5e9' },
        { label: '80-89', min: 80, max: 89, color: '#10b981' },
        { label: '90-100', min: 90, max: 100, color: '#4f46e5' }
      ];

      const maxTotal = Math.max(...grades.map(g => g.total));
      const totalRanges = [
        { label: '0-40%', min: 0, max: maxTotal * 0.4 },
        { label: '40-60%', min: maxTotal * 0.4, max: maxTotal * 0.6 },
        { label: '60-80%', min: maxTotal * 0.6, max: maxTotal * 0.8 },
        { label: '80-90%', min: maxTotal * 0.8, max: maxTotal * 0.9 },
        { label: '90-100%', min: maxTotal * 0.9, max: maxTotal }
      ];

      html += `
        <div class="card">
          <div class="card-header">
            <div class="card-title">📊 总分分布</div>
          </div>
          <div class="chart-container large">
            <canvas id="distributionChart"></canvas>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <div class="card-title">📊 成绩雷达图（前5名 vs 班级均分）</div>
          </div>
          <div class="chart-container large">
            <canvas id="radarChart"></canvas>
          </div>
        </div>
      `;
    }

    document.getElementById('mainContent').innerHTML = html;

    // 渲染图表
    if (this.currentTab === 'overview') {
      this.renderSubjectAvgChart(exam, grades);
      this.renderPassRateChart(exam, grades);
    } else if (this.currentTab === 'subject') {
      this.renderSubjectAnalysis();
    } else if (this.currentTab === 'distribution') {
      this.renderDistributionChart(grades, exam);
      this.renderRadarChart(exam, sortedGrades);
    }
  },

  selectExam(examId) {
    this.currentExamId = examId;
    this.render();
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.render();
  },

  renderSubjectAvgChart(exam, grades) {
    const subjectAvgs = exam.subjects.map(s => {
      const scores = grades.map(g => g.scores[s] || 0);
      return Utils.average(scores).toFixed(1);
    });

    Utils.destroyChart('subjectAvgChart');
    new Chart(document.getElementById('subjectAvgChart'), {
      type: 'bar',
      data: {
        labels: exam.subjects,
        datasets: [{
          label: '平均分',
          data: subjectAvgs,
          backgroundColor: Utils.chartColors,
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
  },

  renderPassRateChart(exam, grades) {
    const passRates = exam.subjects.map(s => {
      const passed = grades.filter(g => (g.scores[s] || 0) >= 60).length;
      return (passed / grades.length * 100).toFixed(0);
    });

    Utils.destroyChart('passRateChart');
    new Chart(document.getElementById('passRateChart'), {
      type: 'bar',
      data: {
        labels: exam.subjects,
        datasets: [{
          label: '及格率(%)',
          data: passRates,
          backgroundColor: '#10b981',
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
  },

  renderSubjectAnalysis() {
    const select = document.getElementById('subjectSelect');
    if (!select) return;
    const subject = select.value;
    const exam = DB.getByClass('exams').find(e => e.id === this.currentExamId);
    const grades = DB.getByClass('grades').filter(g => g.examId === this.currentExamId);
    const scores = grades.map(g => g.scores[subject] || 0);

    const avg = Utils.average(scores).toFixed(1);
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const passCount = scores.filter(s => s >= 60).length;
    const excellentCount = scores.filter(s => s >= 85).length;

    const ranges = [
      { label: '0-59', count: 0, color: '#ef4444' },
      { label: '60-69', count: 0, color: '#f59e0b' },
      { label: '70-79', count: 0, color: '#0ea5e9' },
      { label: '80-89', count: 0, color: '#10b981' },
      { label: '90-100', count: 0, color: '#4f46e5' }
    ];
    scores.forEach(s => {
      if (s < 60) ranges[0].count++;
      else if (s < 70) ranges[1].count++;
      else if (s < 80) ranges[2].count++;
      else if (s < 90) ranges[3].count++;
      else ranges[4].count++;
    });

    let html = `
      <div class="stat-grid">
        <div class="stat-card info"><div class="stat-value">${avg}</div><div class="stat-label">平均分</div></div>
        <div class="stat-card success"><div class="stat-value">${max}</div><div class="stat-label">最高分</div></div>
        <div class="stat-card danger"><div class="stat-value">${min}</div><div class="stat-label">最低分</div></div>
        <div class="stat-card warning"><div class="stat-value">${(passCount/scores.length*100).toFixed(0)}%</div><div class="stat-label">及格率</div></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">📊 ${subject}分数段分布</div></div>
        <div class="chart-container large"><canvas id="subjectDistChart"></canvas></div>
      </div>
    `;

    document.getElementById('subjectAnalysisContainer').innerHTML = html;

    Utils.destroyChart('subjectDistChart');
    new Chart(document.getElementById('subjectDistChart'), {
      type: 'bar',
      data: {
        labels: ranges.map(r => r.label),
        datasets: [{
          data: ranges.map(r => r.count),
          backgroundColor: ranges.map(r => r.color),
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
  },

  renderDistributionChart(grades, exam) {
    const maxTotal = Math.max(...grades.map(g => g.total));
    const ranges = [
      { label: '0-40%', count: 0 },
      { label: '40-60%', count: 0 },
      { label: '60-80%', count: 0 },
      { label: '80-90%', count: 0 },
      { label: '90-100%', count: 0 }
    ];
    grades.forEach(g => {
      const pct = g.total / maxTotal;
      if (pct < 0.4) ranges[0].count++;
      else if (pct < 0.6) ranges[1].count++;
      else if (pct < 0.8) ranges[2].count++;
      else if (pct < 0.9) ranges[3].count++;
      else ranges[4].count++;
    });

    Utils.destroyChart('distributionChart');
    new Chart(document.getElementById('distributionChart'), {
      type: 'bar',
      data: {
        labels: ranges.map(r => r.label),
        datasets: [{
          data: ranges.map(r => r.count),
          backgroundColor: ['#ef4444', '#f59e0b', '#0ea5e9', '#10b981', '#4f46e5'],
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
  },

  renderRadarChart(exam, sortedGrades) {
    const top5 = sortedGrades.slice(0, 5);
    const avgScores = exam.subjects.map(s => {
      const scores = sortedGrades.map(g => g.scores[s] || 0);
      return Utils.average(scores).toFixed(1);
    });
    const top5Avg = exam.subjects.map(s => {
      const scores = top5.map(g => g.scores[s] || 0);
      return Utils.average(scores).toFixed(1);
    });

    Utils.destroyChart('radarChart');
    new Chart(document.getElementById('radarChart'), {
      type: 'radar',
      data: {
        labels: exam.subjects,
        datasets: [
          {
            label: '前5名均分',
            data: top5Avg,
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79,70,229,0.1)',
            pointRadius: 4
          },
          {
            label: '班级均分',
            data: avgScores,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.1)',
            pointRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { r: { beginAtZero: true, max: 100 } }
      }
    });
  },

  exportGrades() {
    const exam = DB.getByClass('exams').find(e => e.id === this.currentExamId);
    if (!exam) {
      Utils.toast('请先选择考试', 'warning');
      return;
    }
    const grades = DB.getByClass('grades').filter(g => g.examId === this.currentExamId);
    if (grades.length === 0) {
      Utils.toast('暂无成绩可导出', 'warning');
      return;
    }
    const sorted = [...grades].sort((a, b) => a.rank - b.rank);
    const headers = ['排名', '姓名', '学号', ...exam.subjects, '总分', '平均分'];
    const data = sorted.map(g => ({
      排名: g.rank,
      姓名: g.studentName,
      学号: g.studentNo || '',
      ...g.scores,
      总分: g.total,
      平均分: g.average
    }));
    const csv = Utils.toCSV(data, headers);
    Utils.downloadFile(`${exam.name}_成绩表.csv`, '\ufeff' + csv, 'text/csv');
    Utils.toast('成绩表已导出', 'success');
  }
};

// 新建/编辑考试
function showExamModal(id) {
  const exam = id ? (DB.get('exams') || []).find(e => e.id === id) : null;
  const isEdit = !!exam;
  const subjects = exam?.subjects || ['语文', '数学', '英语', '物理', '政治', '历史', '地理', '生物'];

  Utils.showModal(isEdit ? '编辑考试' : '新建考试', `
    <div class="form-group">
      <label class="form-label">考试名称 *</label>
      <input class="form-input" id="examName" value="${exam?.name || ''}" placeholder="如：2024秋期中考试">
    </div>
    <div class="form-group">
      <label class="form-label">考试日期</label>
      <input class="form-input" id="examDate" type="date" value="${exam?.date || Utils.today()}">
    </div>
    <div class="form-group">
      <label class="form-label">满分分值</label>
      <input class="form-input" id="examFullScore" type="number" value="${exam?.fullScore || 100}" placeholder="单科满分">
    </div>
    <div class="form-group">
      <label class="form-label">考试科目（用逗号分隔）</label>
      <input class="form-input" id="examSubjects" value="${subjects.join(',')}" placeholder="如：语文,数学,英语">
    </div>
  `, `
    <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
    <button class="btn btn-primary" style="flex:1;" onclick="saveExam(${isEdit ? `'${id}'` : 'null'})">保存</button>
  `);
}

function saveExam(id) {
  const name = document.getElementById('examName').value.trim();
  if (!name) {
    Utils.toast('请输入考试名称', 'error');
    return;
  }
  const subjects = document.getElementById('examSubjects').value.split(',').map(s => s.trim()).filter(s => s);
  const data = {
    name: name,
    date: document.getElementById('examDate').value,
    fullScore: parseInt(document.getElementById('examFullScore').value) || 100,
    subjects: subjects
  };
  if (id) {
    DB.update('exams', id, data);
    Utils.toast('修改成功', 'success');
  } else {
    DB.add('exams', data);
    Utils.toast('考试创建成功', 'success');
  }
  Utils.closeModal();
  GradesPage.render();
}

// 成绩录入
function showGradeEntryModal() {
  const exams = DB.getByClass('exams');
  const students = DB.getByClass('students');
  if (exams.length === 0) {
    Utils.toast('请先创建考试', 'warning');
    return;
  }
  if (students.length === 0) {
    Utils.toast('请先添加学生', 'warning');
    return;
  }

  const examId = GradesPage.currentExamId || exams[exams.length - 1].id;
  const exam = exams.find(e => e.id === examId);
  const existingGrades = DB.getByClass('grades').filter(g => g.examId === examId);

  let html = `
    <div class="form-group">
      <label class="form-label">选择考试</label>
      <select class="form-select" id="gradeExamId" onchange="updateGradeEntryForm()">
        ${exams.map(e => `<option value="${e.id}" ${e.id === examId ? 'selected' : ''}>${e.name}</option>`).join('')}
      </select>
    </div>
    <div style="font-size:13px;color:var(--gray-500);margin-bottom:8px;">点击分数可直接编辑，留空记为0分</div>
    <div id="gradeEntryList" style="max-height:400px;overflow-y:auto;">
  `;

  students.forEach(s => {
    const existing = existingGrades.find(g => g.studentId === s.id);
    html += `
      <div style="margin-bottom:12px;padding:8px;background:var(--gray-50);border-radius:8px;">
        <div style="font-weight:600;margin-bottom:6px;">${s.name}</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;">
          ${exam.subjects.map(subj => `
            <div>
              <label style="font-size:11px;color:var(--gray-500);">${subj}</label>
              <input type="number" class="form-input" style="padding:4px 8px;font-size:13px;" 
                id="grade_${s.id}_${subj}" value="${existing?.scores[subj] ?? ''}" 
                placeholder="${subj}" min="0" max="${exam.fullScore}">
            </div>
          `).join('')}
        </div>
      </div>
    `;
  });
  html += '</div>';

  Utils.showModal('成绩录入', html, `
    <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
    <button class="btn btn-primary" style="flex:1;" onclick="saveGrades()">保存成绩</button>
  `);
}

function updateGradeEntryForm() {
  const examId = document.getElementById('gradeExamId').value;
  GradesPage.currentExamId = examId;
  Utils.closeModal();
  setTimeout(() => showGradeEntryModal(), 300);
}

function saveGrades() {
  const examId = document.getElementById('gradeExamId').value;
  const exam = (DB.get('exams') || []).find(e => e.id === examId);
  const students = DB.getByClass('students');
  const allGrades = DB.get('grades') || [];

  let count = 0;
  const newGrades = [];

  students.forEach(s => {
    const scores = {};
    let total = 0;
    let hasScore = false;
    exam.subjects.forEach(subj => {
      const input = document.getElementById(`grade_${s.id}_${subj}`);
      const val = input ? parseFloat(input.value) : 0;
      if (input && input.value !== '') {
        hasScore = true;
        scores[subj] = val;
        total += val;
      } else {
        scores[subj] = 0;
      }
    });

    if (!hasScore) return;

    const gradeData = {
      examId: examId,
      studentId: s.id,
      studentName: s.name,
      studentNo: s.studentNo,
      scores: scores,
      total: total,
      average: (total / exam.subjects.length).toFixed(1),
      rank: 0
    };

    // 查找是否已存在
    const existing = allGrades.find(g => g.examId === examId && g.studentId === s.id);
    if (existing) {
      DB.update('grades', existing.id, gradeData);
    } else {
      const added = DB.add('grades', gradeData);
      newGrades.push(added);
    }
    count++;
  });

  // 重新排名
  const examGrades = (DB.get('grades') || []).filter(g => g.examId === examId);
  examGrades.sort((a, b) => b.total - a.total);
  examGrades.forEach((g, i) => {
    DB.update('grades', g.id, { rank: i + 1 });
  });

  Utils.closeModal();
  GradesPage.render();
  Utils.toast(`已保存 ${count} 名学生成绩`, 'success');
}

// ========== 批量导入成绩 ==========
let _importedGrades = []; // 临时存储解析后的成绩数据

function showGradeImportModal() {
  const exams = DB.getByClass('exams');
  if (exams.length === 0) {
    Utils.toast('请先创建考试', 'warning');
    return;
  }

  let html = `
    <div class="form-group">
      <label class="form-label">导入到哪次考试 *</label>
      <select class="form-select" id="importExamId">
        ${exams.map(e => `<option value="${e.id}" ${e.id === GradesPage.currentExamId ? 'selected' : ''}>${e.name} (${e.date})</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">CSV 文件</label>
      <div class="file-upload" onclick="document.getElementById('gradeImportFile').click()">
        <div class="file-upload-icon">📁</div>
        <div id="importFileName">点击选择 CSV 文件</div>
      </div>
      <input type="file" id="gradeImportFile" accept=".csv,.txt" style="display:none;" onchange="parseGradeImport(event)">
    </div>
    <div id="importPreviewArea"></div>
    <div style="margin-top:8px;">
      <button class="btn btn-outline btn-block btn-sm" onclick="downloadGradeTemplate()">📋 下载导入模板</button>
    </div>
    <div style="font-size:12px;color:var(--gray-500);margin-top:10px;line-height:1.6;">
      <strong>格式说明：</strong><br>
      • 第一行为表头，需包含「姓名」和各科目名称<br>
      • 后续每行一个学生的成绩<br>
      • 支持学号列（可选），用于精确匹配学生<br>
      • 留空的科目计 0 分<br>
      • <strong>已存在的成绩会被覆盖</strong>
    </div>
  `;

  Utils.showModal('📥 批量导入成绩', html, `
    <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
    <button class="btn btn-primary" style="flex:1;" onclick="confirmGradeImport()" id="confirmImportBtn" disabled>确认导入</button>
  `);
}

function downloadGradeTemplate() {
  const exams = DB.getByClass('exams');
  const examId = document.getElementById('importExamId')?.value || GradesPage.currentExamId;
  const exam = exams.find(e => e.id === examId);
  const subjects = exam ? exam.subjects : ['语文', '数学', '英语', '物理', '政治', '历史', '地理', '生物'];
  const students = DB.getByClass('students');

  // 模板含表头 + 示例学生（姓名+学号预填，成绩留空）
  let csv = '姓名,学号,' + subjects.join(',') + '\n';
  students.slice(0, 5).forEach(s => {
    csv += `${s.name},${s.studentNo || ''},${subjects.map(() => '').join(',')}\n`;
  });
  csv += `张三,2024001,${subjects.map((_, i) => 80 + i).join(',')}\n`;
  csv += `李四,2024002,${subjects.map((_, i) => 75 + i).join(',')}\n`;

  Utils.downloadFile(`成绩导入模板_${exam ? exam.name : ''}.csv`, '\ufeff' + csv, 'text/csv');
  Utils.toast('模板已下载', 'success');
}

function parseGradeImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  document.getElementById('importFileName').textContent = file.name;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const rows = Utils.parseCSV(e.target.result);
      if (rows.length === 0) {
        Utils.toast('文件为空或格式错误', 'error');
        return;
      }

      // 识别科目列
      const headers = Object.keys(rows[0]);
      const nameKey = headers.find(h => h.includes('姓名') || h.toLowerCase() === 'name');
      const noKey = headers.find(h => h.includes('学号') || h.toLowerCase().includes('no'));

      if (!nameKey) {
        Utils.toast('未找到「姓名」列，请检查文件格式', 'error');
        return;
      }

      const exams = DB.getByClass('exams');
      const examId = document.getElementById('importExamId').value;
      const exam = exams.find(e => e.id === examId);
      if (!exam) {
        Utils.toast('请选择考试', 'error');
        return;
      }

      // 识别科目列：优先精确匹配考试科目，其次取非姓名/学号的数字列
      const subjectCols = [];
      exam.subjects.forEach(subj => {
        const col = headers.find(h => h.trim() === subj.trim());
        if (col) subjectCols.push({ subject: subj, col: col });
      });

      // 如果精确匹配不够，尝试模糊匹配
      if (subjectCols.length === 0) {
        headers.forEach(h => {
          if (h !== nameKey && h !== noKey && !h.includes('总分') && !h.includes('排名') && !h.includes('平均')) {
            subjectCols.push({ subject: h.trim(), col: h });
          }
        });
      }

      if (subjectCols.length === 0) {
        Utils.toast('未找到科目列，请确保表头包含科目名称', 'error');
        return;
      }

      const students = DB.getByClass('students');
      const parsed = [];
      const unmatched = [];

      rows.forEach((row, idx) => {
        const name = (row[nameKey] || '').trim();
        if (!name) return;

        const studentNo = noKey ? (row[noKey] || '').trim() : '';

        // 匹配学生：优先学号，其次姓名
        let student = null;
        if (studentNo) {
          student = students.find(s => s.studentNo === studentNo);
        }
        if (!student) {
          student = students.find(s => s.name === name);
        }

        if (!student) {
          unmatched.push({ row: idx + 2, name: name, reason: '未找到匹配学生' });
          return;
        }

        // 解析各科分数
        const scores = {};
        let total = 0;
        let hasScore = false;
        subjectCols.forEach(sc => {
          const rawVal = (row[sc.col] || '').trim();
          const val = rawVal === '' ? 0 : parseFloat(rawVal);
          if (isNaN(val)) {
            scores[sc.subject] = 0;
          } else {
            scores[sc.subject] = val;
            if (rawVal !== '') hasScore = true;
            total += val;
          }
        });

        if (!hasScore) return;

        parsed.push({
          studentId: student.id,
          studentName: student.name,
          studentNo: student.studentNo,
          scores: scores,
          total: total,
          average: (total / subjectCols.length).toFixed(1),
          subjects: subjectCols.map(sc => sc.subject)
        });
      });

      _importedGrades = parsed;

      // 渲染预览
      let previewHtml = '';
      if (parsed.length > 0) {
        const subjList = parsed[0].subjects;
        previewHtml += `
          <div style="margin-top:12px;padding:10px;background:var(--primary-bg);border-radius:8px;font-size:13px;">
            ✅ 解析成功：<strong>${parsed.length}</strong> 条成绩记录<br>
            📚 科目：${subjList.join('、')}
          </div>
        `;

        // 未匹配学生
        if (unmatched.length > 0) {
          previewHtml += `
            <div style="margin-top:8px;padding:10px;background:#fee2e2;border-radius:8px;font-size:12px;">
              ⚠️ ${unmatched.length} 行未匹配到学生（已跳过）：<br>
              ${unmatched.slice(0, 5).map(u => `第${u.row}行 ${u.name}`).join('、')}${unmatched.length > 5 ? '...' : ''}
            </div>
          `;
        }

        // 数据预览表
        previewHtml += `
          <div style="margin-top:12px;">
            <div style="font-weight:600;font-size:13px;margin-bottom:6px;">📋 数据预览（前5条）</div>
            <div class="table-wrapper">
              <table class="data-table">
                <thead><tr><th>姓名</th>
        `;
        subjList.forEach(s => previewHtml += `<th>${s}</th>`);
        previewHtml += `<th>总分</th></tr></thead><tbody>`;
        parsed.slice(0, 5).forEach(p => {
          previewHtml += `<tr><td>${p.studentName}</td>`;
          subjList.forEach(s => {
            const score = p.scores[s];
            const color = score >= 80 ? 'var(--success)' : score >= 60 ? '' : 'var(--danger)';
            previewHtml += `<td style="color:${color};font-weight:${score >= 80 || score < 60 ? '600' : '400'};">${score}</td>`;
          });
          previewHtml += `<td style="font-weight:700;">${p.total}</td></tr>`;
        });
        previewHtml += '</tbody></table></div>';
        if (parsed.length > 5) {
          previewHtml += `<div style="font-size:12px;color:var(--gray-500);margin-top:4px;text-align:center;">还有 ${parsed.length - 5} 条未显示...</div>`;
        }
        previewHtml += '</div>';
      } else {
        previewHtml = `
          <div style="margin-top:12px;padding:10px;background:#fee2e2;border-radius:8px;font-size:13px;">
            ❌ 未解析到有效成绩数据<br>
            ${unmatched.length > 0 ? `所有 ${unmatched.length} 行均未匹配到学生，请检查姓名或学号是否与花名册一致` : '请检查文件格式'}
          </div>
        `;
      }

      document.getElementById('importPreviewArea').innerHTML = previewHtml;

      // 启用/禁用导入按钮
      const btn = document.getElementById('confirmImportBtn');
      if (btn) {
        btn.disabled = parsed.length === 0;
        btn.style.opacity = parsed.length === 0 ? '0.5' : '1';
      }

      if (parsed.length > 0) {
        Utils.toast(`解析成功，${parsed.length} 条成绩待导入`, 'success');
      }
    } catch (err) {
      console.error(err);
      Utils.toast('文件解析失败：' + err.message, 'error');
    }
  };
  reader.readAsText(file, 'UTF-8');
}

function confirmGradeImport() {
  if (_importedGrades.length === 0) {
    Utils.toast('没有可导入的数据', 'error');
    return;
  }

  const examId = document.getElementById('importExamId').value;
  const exam = (DB.get('exams') || []).find(e => e.id === examId);
  if (!exam) {
    Utils.toast('考试信息异常', 'error');
    return;
  }

  const allGrades = DB.get('grades') || [];
  let updated = 0;
  let added = 0;

  _importedGrades.forEach(g => {
    const gradeData = {
      examId: examId,
      studentId: g.studentId,
      studentName: g.studentName,
      studentNo: g.studentNo,
      scores: g.scores,
      total: g.total,
      average: g.average,
      rank: 0
    };

    const existing = allGrades.find(ag => ag.examId === examId && ag.studentId === g.studentId);
    if (existing) {
      DB.update('grades', existing.id, gradeData);
      updated++;
    } else {
      DB.add('grades', gradeData);
      added++;
    }
  });

  // 重新排名
  const examGrades = (DB.get('grades') || []).filter(g => g.examId === examId);
  examGrades.sort((a, b) => b.total - a.total);
  examGrades.forEach((g, i) => {
    DB.update('grades', g.id, { rank: i + 1 });
  });

  _importedGrades = [];
  Utils.closeModal();
  GradesPage.currentExamId = examId;
  GradesPage.render();
  Utils.toast(`导入完成！新增 ${added} 条，更新 ${updated} 条`, 'success');
}
