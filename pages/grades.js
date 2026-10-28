/**
 * 成绩分析页面
 */

// ========== 各科满分 ==========
// 初中语数英通常 120 分，其余科目 100 分。
// 旧数据只存了统一的 fullScore，这里按科目名给出默认值，
// 避免历史考试被错误地按 100 分制分析（120 分制的卷子会被算错及格率/优秀率）。
const CORE_SUBJECTS_120 = ['语文', '数学', '英语'];
const DEFAULT_CORE_FULL_SCORE = 120;
const DEFAULT_SUBJECT_FULL_SCORE = 100;
const PASS_RATE = 0.6;      // 及格线：满分的 60%
const EXCELLENT_RATE = 0.85; // 优秀线：满分的 85%

// 按科目名推断默认满分（支持「语文」「数学」「英语」及其带前缀的写法）
function getDefaultFullScore(subject) {
  const s = String(subject || '').trim();
  return CORE_SUBJECTS_120.some(c => s === c || s.includes(c))
    ? DEFAULT_CORE_FULL_SCORE
    : DEFAULT_SUBJECT_FULL_SCORE;
}

// 取该场考试「科目 -> 满分」的映射，缺失科目自动补默认值
function getExamFullScoreMap(exam) {
  const map = {};
  if (!exam) return map;
  const saved = exam.subjectFullScores || null;
  (exam.subjects || []).forEach(sub => {
    const savedVal = saved ? Number(saved[sub]) : 0;
    map[sub] = savedVal > 0 ? savedVal : getDefaultFullScore(sub);
  });
  return map;
}

// 单科满分
function getSubjectFullScore(exam, subject) {
  const map = getExamFullScoreMap(exam);
  return map[subject] || Number(exam && exam.fullScore) || DEFAULT_SUBJECT_FULL_SCORE;
}

// 整场考试的总分满分（各科满分之和）
function getExamFullTotal(exam) {
  const map = getExamFullScoreMap(exam);
  return (exam && exam.subjects ? exam.subjects : []).reduce((sum, s) => sum + (map[s] || 0), 0);
}

// 单科得分率（0~1）
function getScoreRate(score, fullScore) {
  const f = Number(fullScore) || 0;
  if (f <= 0) return 0;
  return Math.max(0, Number(score) || 0) / f;
}

// 学生的平均得分率（跳过缺考科目），用于跨科目（满分不同）的公平比较
function getStudentRate(grade, exam) {
  if (!grade || !exam) return 0;
  const absent = new Set(grade.absentSubjects || []);
  let sum = 0;
  let n = 0;
  (exam.subjects || []).forEach(sub => {
    if (absent.has(sub)) return;
    sum += getScoreRate((grade.scores || {})[sub], getSubjectFullScore(exam, sub));
    n++;
  });
  return n > 0 ? sum / n : 0;
}

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

    // 保证 currentExamId 有效（可能尚未选择，或该场次刚被删除）
    if (!this.currentExamId || !exams.some(e => e.id === this.currentExamId)) {
      this.currentExamId = exams[exams.length - 1].id;
    }

    html += `
      <div class="form-group">
        <label class="form-label">选择考试</label>
        <div class="exam-select-row">
          <select class="form-select" onchange="GradesPage.selectExam(this.value)">
    `;
    exams.forEach(e => {
      html += `<option value="${e.id}" ${e.id === this.currentExamId ? 'selected' : ''}>${e.name} (${e.date})</option>`;
    });
    html += `
          </select>
          <button class="btn btn-outline btn-sm" onclick="showExamModal('${this.currentExamId}')" title="修改考试名称、日期、科目">✏️ 编辑</button>
          <button class="btn btn-danger btn-sm" onclick="deleteExam('${this.currentExamId}')" title="删除本次考试及其成绩">🗑 删除</button>
        </div>
      </div>
    `;

    const exam = exams.find(e => e.id === this.currentExamId);
    const grades = DB.getByClass('grades').filter(g => g.examId === this.currentExamId);

    // 满分口径提示：让老师一眼确认当前按什么分制在分析
    if (exam) {
      const fullMap = getExamFullScoreMap(exam);
      const parts = (exam.subjects || []).map(s => `${s} ${fullMap[s]}`).join(' · ');
      html += `
        <div class="score-scale-hint">
          <span class="score-scale-label">本次考试满分</span>
          <span class="score-scale-text">${parts}</span>
          <span class="score-scale-total">总分 ${getExamFullTotal(exam)}</span>
        </div>
      `;
    }

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
      const fullTotal = getExamFullTotal(exam);
      const avg = Utils.average(totals).toFixed(1);
      const max = Math.max(...totals);
      const min = Math.min(...totals);
      // 及格/优秀改按「得分率」判定：各科满分不一致（语数英 120、其余 100），
      // 用固定的 60/85 分线会把 120 分卷的及格线算低、优秀线算高
      const rates = grades.map(g => getStudentRate(g, exam));
      const passCount = rates.filter(r => r >= PASS_RATE).length;
      const excellentCount = rates.filter(r => r >= EXCELLENT_RATE).length;
      const avgRate = (Utils.average(rates) * 100).toFixed(1);
      const stdDev = Math.sqrt(Utils.average(totals.map(t => Math.pow(t - avg, 2)))).toFixed(1);

      html += `
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-value">${grades.length}</div>
            <div class="stat-label">参考人数</div>
          </div>
          <div class="stat-card info">
            <div class="stat-value">${avg}</div>
            <div class="stat-label">班级均分（满分 ${fullTotal}）</div>
          </div>
          <div class="stat-card primary">
            <div class="stat-value">${avgRate}%</div>
            <div class="stat-label">平均得分率</div>
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
            <div class="card-title">📊 各科平均得分率（各科满分不同，按得分率对比）</div>
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
      const fullMap = getExamFullScoreMap(exam);
      html += '<div class="card" style="padding:0;"><div class="table-wrapper"><table class="data-table"><thead><tr><th>排名</th><th>姓名</th>';
      exam.subjects.forEach(s => html += `<th>${s}<span class="th-full">/${fullMap[s]}</span></th>`);
      html += '<th>总分</th><th>得分率</th></tr></thead><tbody>';
      sortedGrades.forEach(g => {
        const rankClass = g.rank <= 5 ? 'text-success' : g.rank <= 15 ? '' : g.rank >= grades.length - 4 ? 'text-danger' : '';
        const absentSet = new Set(g.absentSubjects || []);
        html += `<tr onclick="StudentsPage.showProfile('${g.studentId}')"><td class="${rankClass}" style="font-weight:700;">${g.rank <= 3 ? ['🥇','🥈','🥉'][g.rank-1] : g.rank}</td><td>${g.studentName}</td>`;
        exam.subjects.forEach(s => {
          if (absentSet.has(s)) {
            html += `<td style="color:var(--gray-400);font-style:italic;">缺考</td>`;
          } else {
            const score = (g.scores || {})[s] || 0;
            // 颜色按得分率判断，避免 120 分制科目里 100 分被误标成普通分
            const rate = getScoreRate(score, fullMap[s]);
            const color = rate >= 0.8 ? 'var(--success)' : rate >= PASS_RATE ? '' : 'var(--danger)';
            html += `<td style="color:${color};font-weight:${rate >= 0.8 || rate < PASS_RATE ? '600' : '400'};">${score}</td>`;
          }
        });
        const rateVal = (getStudentRate(g, exam) * 100).toFixed(1);
        html += `<td style="font-weight:700;">${g.total}</td><td>${rateVal}%</td></tr>`;
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
      // 总分分数段由 renderDistributionChart 按「各科满分之和」统一计算
      html += `
        <div class="score-scale-hint" style="margin-bottom:10px;">
          <span class="score-scale-label">总分满分</span>
          <span class="score-scale-total">${getExamFullTotal(exam)} 分</span>
          <span class="score-scale-text">（各科满分之和，分数段按此基准划分）</span>
        </div>
      `;

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
            <div class="card-title">📊 成绩雷达图（前5名 vs 班级，按得分率）</div>
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
    const fullMap = getExamFullScoreMap(exam);
    // 各科满分不一致，直接比原始平均分对 100 分制的科目不公平，
    // 因此图表看「平均得分率」，原始均分放进 tooltip
    const subjectAvgs = exam.subjects.map(s => {
      const scores = grades.map(g => (g.scores || {})[s] || 0);
      return Utils.average(scores);
    });
    const subjectRates = exam.subjects.map((s, i) =>
      Number((getScoreRate(subjectAvgs[i], fullMap[s]) * 100).toFixed(1))
    );

    Utils.destroyChart('subjectAvgChart');
    new Chart(document.getElementById('subjectAvgChart'), {
      type: 'bar',
      data: {
        labels: exam.subjects.map(s => `${s}(${fullMap[s]}分)`),
        datasets: [{
          label: '平均得分率(%)',
          data: subjectRates,
          backgroundColor: Utils.chartColors,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const i = ctx.dataIndex;
                return `均分 ${subjectAvgs[i].toFixed(1)} / ${fullMap[exam.subjects[i]]}（${subjectRates[i]}%）`;
              }
            }
          }
        },
        scales: {
          y: { beginAtZero: true, max: 100, title: { display: true, text: '得分率(%)' } }
        }
      }
    });
  },

  renderPassRateChart(exam, grades) {
    const fullMap = getExamFullScoreMap(exam);
    const passRates = exam.subjects.map(s => {
      // 及格线按各科满分的 60% 计算：语数英 120 分对应 72 分
      const passed = grades.filter(g => {
        if ((g.absentSubjects || []).includes(s)) return false;
        return getScoreRate((g.scores || {})[s], fullMap[s]) >= PASS_RATE;
      }).length;
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
    if (!exam) return;
    const grades = DB.getByClass('grades').filter(g => g.examId === this.currentExamId);
    const fullScore = getSubjectFullScore(exam, subject);
    const passLine = fullScore * PASS_RATE;
    const excellentLine = fullScore * EXCELLENT_RATE;
    // 缺考不计入统计，否则 0 分会把均分和及格率拉低
    const scores = grades
      .filter(g => !(g.absentSubjects || []).includes(subject))
      .map(g => (g.scores || {})[subject] || 0);

    if (scores.length === 0) {
      document.getElementById('subjectAnalysisContainer').innerHTML =
        Utils.emptyState('📝', `${subject}暂无有效成绩`);
      return;
    }

    const avg = Utils.average(scores).toFixed(1);
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const passCount = scores.filter(s => s >= passLine).length;
    const excellentCount = scores.filter(s => s >= excellentLine).length;
    const avgRate = (getScoreRate(avg, fullScore) * 100).toFixed(1);

    // 分数段按满分等比例切分：120 分制即 0-71 / 72-83 / 84-95 / 96-107 / 108-120
    const step = fullScore / 5;
    const ranges = [
      { label: `0-${Math.ceil(step) - 1}`, count: 0, color: '#ef4444' },
      { label: `${Math.ceil(step)}-${Math.ceil(step * 2) - 1}`, count: 0, color: '#f59e0b' },
      { label: `${Math.ceil(step * 2)}-${Math.ceil(step * 3) - 1}`, count: 0, color: '#0ea5e9' },
      { label: `${Math.ceil(step * 3)}-${Math.ceil(step * 4) - 1}`, count: 0, color: '#10b981' },
      { label: `${Math.ceil(step * 4)}-${fullScore}`, count: 0, color: '#4f46e5' }
    ];
    scores.forEach(s => {
      if (s < step) ranges[0].count++;
      else if (s < step * 2) ranges[1].count++;
      else if (s < step * 3) ranges[2].count++;
      else if (s < step * 4) ranges[3].count++;
      else ranges[4].count++;
    });

    let html = `
      <div class="stat-grid">
        <div class="stat-card info"><div class="stat-value">${avg}</div><div class="stat-label">平均分（满分 ${fullScore}）</div></div>
        <div class="stat-card primary"><div class="stat-value">${avgRate}%</div><div class="stat-label">平均得分率</div></div>
        <div class="stat-card success"><div class="stat-value">${max}</div><div class="stat-label">最高分</div></div>
        <div class="stat-card danger"><div class="stat-value">${min}</div><div class="stat-label">最低分</div></div>
        <div class="stat-card warning"><div class="stat-value">${(passCount/scores.length*100).toFixed(0)}%</div><div class="stat-label">及格率（≥${Number(passLine.toFixed(1))}分）</div></div>
        <div class="stat-card success"><div class="stat-value">${(excellentCount/scores.length*100).toFixed(0)}%</div><div class="stat-label">优秀率（≥${Number(excellentLine.toFixed(1))}分）</div></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">📊 ${subject}分数段分布（满分 ${fullScore}）</div></div>
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
    // 满分基准必须用「各科满分之和」，不能用本班最高总分——
    // 拿最高分当满分时，全班都会被算成中上水平，看不出真实分布
    const maxTotal = getExamFullTotal(exam) || Math.max(...grades.map(g => g.total)) || 100;
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
    const fullMap = getExamFullScoreMap(exam);
    // 雷达图按得分率(0-100)绘制，否则 120 分的科目会顶出 100 的坐标轴
    const toRates = (list) => exam.subjects.map(s => {
      const scores = list.map(g => (g.scores || {})[s] || 0);
      return Number((getScoreRate(Utils.average(scores), fullMap[s]) * 100).toFixed(1));
    });
    const avgScores = toRates(sortedGrades);
    const top5Avg = toRates(top5);

    Utils.destroyChart('radarChart');
    new Chart(document.getElementById('radarChart'), {
      type: 'radar',
      data: {
        labels: exam.subjects.map(s => `${s}(${fullMap[s]})`),
        datasets: [
          {
            label: '前5名得分率(%)',
            data: top5Avg,
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79,70,229,0.1)',
            pointRadius: 4
          },
          {
            label: '班级得分率(%)',
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
    const fullMap = getExamFullScoreMap(exam);
    const fullTotal = getExamFullTotal(exam);
    // 表头带满分，导出的表格拿给家长/同事看时不会误判分数水平
    const subjHeaders = exam.subjects.map(s => `${s}(${fullMap[s]})`);
    const totalHeader = `总分(${fullTotal})`;
    const headers = ['排名', '姓名', '学号', ...subjHeaders, totalHeader, '得分率(%)'];
    const data = sorted.map(g => {
      const row = { 排名: g.rank, 姓名: g.studentName, 学号: g.studentNo || '' };
      exam.subjects.forEach(s => { row[`${s}(${fullMap[s]})`] = (g.scores || {})[s] ?? ''; });
      row[totalHeader] = g.total;
      row['得分率(%)'] = (getStudentRate(g, exam) * 100).toFixed(1);
      return row;
    });
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
      <label class="form-label">考试科目（用逗号分隔）</label>
      <input class="form-input" id="examSubjects" value="${subjects.join(',')}" placeholder="如：语文,数学,英语"
             onchange="renderExamFullScoreInputs()" onblur="renderExamFullScoreInputs()">
    </div>
    <div class="form-group">
      <label class="form-label">各科满分</label>
      <div class="full-score-grid" id="examFullScoreGrid"></div>
      <div class="form-hint">
        语数英默认 <b>120</b> 分，其余科目默认 <b>100</b> 分。及格线 = 满分×60%，优秀线 = 满分×85%。
        如果本次考试统一按 100 分制，请把各科都改成 100。
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
    <button class="btn btn-primary" style="flex:1;" onclick="saveExam(${isEdit ? `'${id}'` : 'null'})">保存</button>
  `);

  renderExamFullScoreInputs();
}

// 根据科目输入框重建满分输入网格，保留用户已填的值
function renderExamFullScoreInputs() {
  const grid = document.getElementById('examFullScoreGrid');
  const subjectInput = document.getElementById('examSubjects');
  if (!grid || !subjectInput) return;

  const subjects = subjectInput.value.split(/[,，、]/).map(s => s.trim()).filter(Boolean);

  // 记录已填写过的值，避免改科目时把刚输入的数字冲掉
  const existed = {};
  grid.querySelectorAll('input[data-subject]').forEach(inp => {
    existed[inp.dataset.subject] = inp.value;
  });

  if (subjects.length === 0) {
    grid.innerHTML = '<div class="form-hint">请先填写考试科目</div>';
    return;
  }

  grid.innerHTML = subjects.map(sub => {
    const val = existed[sub] !== undefined && existed[sub] !== ''
      ? existed[sub]
      : getDefaultFullScore(sub);
    const safe = Utils.escapeHtml(sub);
    return `
      <div class="full-score-item">
        <span class="full-score-subject">${safe}</span>
        <input type="number" class="form-input" data-subject="${safe}" value="${val}" min="1" max="300" step="1">
      </div>
    `;
  }).join('');
}

function saveExam(id) {
  const name = document.getElementById('examName').value.trim();
  if (!name) {
    Utils.toast('请输入考试名称', 'error');
    return;
  }
  const subjects = document.getElementById('examSubjects').value
    .split(/[,，、]/).map(s => s.trim()).filter(s => s);
  if (subjects.length === 0) {
    Utils.toast('请至少填写一个科目', 'error');
    return;
  }

  // 逐科收集满分；未填的按默认值兜底
  const subjectFullScores = {};
  document.querySelectorAll('#examFullScoreGrid input[data-subject]').forEach(inp => {
    const v = parseInt(inp.value, 10);
    subjectFullScores[inp.dataset.subject] = v > 0 ? v : getDefaultFullScore(inp.dataset.subject);
  });
  subjects.forEach(sub => {
    if (!subjectFullScores[sub]) subjectFullScores[sub] = getDefaultFullScore(sub);
  });

  const data = {
    name: name,
    date: document.getElementById('examDate').value,
    // fullScore 保留为「单科最大满分」，仅为兼容旧数据读取
    fullScore: Math.max(...Object.values(subjectFullScores), 100),
    subjects: subjects,
    subjectFullScores: subjectFullScores
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

// 删除考试场次（连同该场次下的所有成绩）
function deleteExam(examId) {
  const id = examId || GradesPage.currentExamId;
  const exam = DB.getByClass('exams').find(e => e.id === id);
  if (!exam) {
    Utils.toast('未找到该考试', 'error');
    return;
  }

  const gradeCount = DB.getByClass('grades').filter(g => g.examId === id).length;
  const tip = gradeCount > 0
    ? `确定删除考试「${exam.name}」吗？<br><br>该场次的 <b>${gradeCount}</b> 条成绩会一并删除，无法恢复。`
    : `确定删除考试「${exam.name}」吗？`;

  Utils.confirm(tip, () => {
    // 先级联清掉该场次的成绩，避免留下无主的成绩记录
    const gradeIds = (DB.get('grades') || []).filter(g => g.examId === id).map(g => g.id);
    if (gradeIds.length > 0) DB.deleteBatch('grades', gradeIds);
    DB.delete('exams', id);

    // 切到剩下的考试（与 render 一致取最后一场）；全删完则回到空状态
    const rest = DB.getByClass('exams');
    GradesPage.currentExamId = rest.length > 0 ? rest[rest.length - 1].id : '';
    GradesPage.currentTab = 'overview';

    Utils.toast(gradeCount > 0 ? `已删除考试及 ${gradeCount} 条成绩` : '考试已删除', 'success');
    GradesPage.render();
  }, '删除考试');
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
          ${exam.subjects.map(subj => {
            const fs = getSubjectFullScore(exam, subj);
            return `
            <div>
              <label style="font-size:11px;color:var(--gray-500);">${subj} <span style="color:var(--gray-400);">/ ${fs}</span></label>
              <input type="number" class="form-input" style="padding:4px 8px;font-size:13px;" 
                id="grade_${s.id}_${subj}" value="${existing?.scores?.[subj] ?? ''}" 
                placeholder="满分${fs}" min="0" max="${fs}">
            </div>
          `}).join('')}
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
  let overCount = 0;
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
        // 超出该科满分只提示不阻断：老师可能就是要记附加分，或分制没设对
        if (val > getSubjectFullScore(exam, subj)) overCount++;
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
  if (overCount > 0) {
    Utils.toast(`已保存 ${count} 名学生成绩，其中 ${overCount} 科分数超出满分，请核对分制设置`, 'warning', 4000);
  } else {
    Utils.toast(`已保存 ${count} 名学生成绩`, 'success');
  }
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
  // 表头带该科满分，避免老师填分时按错分制
  const colHeaders = subjects.map(s => {
    const fs = exam ? getSubjectFullScore(exam, s) : getDefaultFullScore(s);
    return `${s}(${fs})`;
  });
  let csv = '姓名,学号,' + colHeaders.join(',') + '\n';
  students.slice(0, 5).forEach(s => {
    csv += `${s.name},${s.studentNo || ''},${subjects.map(() => '').join(',')}\n`;
  });
  csv += `张三,2024001,${subjects.map((s, i) => Math.round((exam ? getSubjectFullScore(exam, s) : 100) * 0.8) + i).join(',')}\n`;
  csv += `李四,2024002,${subjects.map((s, i) => Math.round((exam ? getSubjectFullScore(exam, s) : 100) * 0.75) + i).join(',')}\n`;

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
      // 按字节读取后自动识别编码：Excel 另存的 CSV 默认是 GBK/ANSI，
      // 若强制按 UTF-8 读，中文表头会变成乱码，进而找不到「姓名」列
      const rows = Utils.parseCSV(decodeCSVText(new Uint8Array(e.target.result)));
      if (rows.length === 0) {
        Utils.toast('文件为空或格式错误', 'error');
        return;
      }

      // 识别姓名列（兼容 姓名/名字/学生姓名/name 等常见表头）
      const headers = Object.keys(rows[0]);
      const norm = h => String(h || '').replace(/[\s\u3000]/g, '');
      const nameKey = headers.find(h => {
        const k = norm(h);
        return /姓名|名字/.test(k) || /^(name|student|studentname|学生|学生姓名)$/i.test(k);
      });
      const noKey = headers.find(h => {
        const k = norm(h);
        return /学号|学籍号|考号/.test(k) || /^(no|id|studentno|studentid|number)$/i.test(k);
      });

      if (!nameKey) {
        const sample = headers.slice(0, 6).map(h => (String(h).trim() === '' ? '(空列)' : h)).join(' / ');
        const garbled = headers.some(h => /\uFFFD/.test(String(h)));
        showGradeImportError(
          garbled ? '中文表头显示为乱码，无法识别「姓名」列' : '未找到「姓名」列',
          '文件里识别到的表头是：' + sample,
          garbled
            ? '这是文件编码问题：Excel 另存的 CSV 默认是 GBK 编码。请用 Excel 打开后「另存为 → CSV UTF-8（逗号分隔）」，或直接下载上方导入模板填写。'
            : '请确认表头第一行包含「姓名」列。如果打开的是 Excel 工作簿（.xlsx），请先另存为 CSV 再导入。'
        );
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
      // 兼容模板里的「语文(120)」这类带满分的表头写法
      const subjectCols = [];
      const normHeader = h => String(h || '').replace(/[\s\u3000]/g, '');
      exam.subjects.forEach(subj => {
        const target = normHeader(subj);
        const col = headers.find(h => {
          const k = normHeader(h);
          return k === target || k.startsWith(target + '(') || k.startsWith(target + '（');
        });
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
        const overLimit = [];
        subjectCols.forEach(sc => {
          const rawVal = (row[sc.col] || '').trim();
          const val = rawVal === '' ? 0 : parseFloat(rawVal);
          if (isNaN(val)) {
            scores[sc.subject] = 0;
          } else {
            scores[sc.subject] = val;
            if (rawVal !== '') hasScore = true;
            total += val;
            // 超出该科满分时记一笔，预览里提示（不阻断，方便老师核对）
            const fs = getSubjectFullScore(exam, sc.subject);
            if (val > fs) overLimit.push(`${sc.subject} ${val}/${fs}`);
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
          subjects: subjectCols.map(sc => sc.subject),
          overLimit: overLimit
        });
      });

      _importedGrades = parsed;

      // 渲染预览
      let previewHtml = '';
      if (parsed.length > 0) {
        const subjList = parsed[0].subjects;
        const fullMap = getExamFullScoreMap(exam);
        previewHtml += `
          <div style="margin-top:12px;padding:10px;background:var(--primary-bg);border-radius:8px;font-size:13px;">
            ✅ 解析成功：<strong>${parsed.length}</strong> 条成绩记录<br>
            📚 科目：${subjList.map(s => `${s}(${fullMap[s]}分)`).join('、')}<br>
            🎯 及格线：${subjList.map(s => `${s} ${Number((fullMap[s] * PASS_RATE).toFixed(1))}`).join('、')}
          </div>
        `;

        // 超出满分的成绩单列出来，方便核对（不阻断导入）
        const overRows = parsed.filter(p => p.overLimit && p.overLimit.length > 0);
        if (overRows.length > 0) {
          previewHtml += `
            <div style="margin-top:8px;padding:10px;background:#fef3c7;border-radius:8px;font-size:12px;color:#92400e;">
              ⚠️ 有 ${overRows.length} 名学生的成绩超过该科满分，请核对：<br>
              ${overRows.slice(0, 5).map(p => `${p.studentName}（${p.overLimit.join('、')}）`).join('；')}${overRows.length > 5 ? '...' : ''}
            </div>
          `;
        }

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
        subjList.forEach(s => previewHtml += `<th>${s}<span class="th-full">/${fullMap[s]}</span></th>`);
        previewHtml += `<th>总分</th></tr></thead><tbody>`;
        parsed.slice(0, 5).forEach(p => {
          previewHtml += `<tr><td>${p.studentName}</td>`;
          subjList.forEach(s => {
            const score = p.scores[s];
            const rate = getScoreRate(score, fullMap[s]);
            const color = rate >= 0.8 ? 'var(--success)' : rate >= PASS_RATE ? '' : 'var(--danger)';
            previewHtml += `<td style="color:${color};font-weight:${rate >= 0.8 || rate < PASS_RATE ? '600' : '400'};">${score}</td>`;
          });
          const fullTotal = getExamFullTotal(exam);
          previewHtml += `<td style="font-weight:700;">${p.total}<span class="th-full">/${fullTotal}</span></td></tr>`;
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
  // 按字节读取，交给 decodeCSVText 自动判断编码
  reader.readAsArrayBuffer(file);
}

// 自动识别 CSV 编码：优先 UTF-8，出现替换字符（�）则回退 GBK
// 说明：Excel 在中文系统里「另存为 CSV」默认写 GBK，模板被 Excel 保存后也会变成 GBK
function decodeCSVText(bytes) {
  const badCount = s => (s.match(/\uFFFD/g) || []).length;
  const utf8 = new TextDecoder('utf-8').decode(bytes);
  if (badCount(utf8) === 0) return utf8;

  try {
    const gbk = new TextDecoder('gbk').decode(bytes);
    // 两种解码都不干净时，取乱码更少的那个
    if (badCount(gbk) < badCount(utf8)) return gbk;
  } catch (_) {
    // 个别浏览器不支持 gbk 解码，保持 UTF-8 结果
  }
  return utf8;
}

// 在预览区显示可读的导入错误（比 toast 更能留住信息）
function showGradeImportError(title, detail, hint) {
  const area = document.getElementById('importPreviewArea');
  if (area) {
    const esc = s => Utils.escapeHtml(String(s == null ? '' : s));
    area.innerHTML = `
      <div style="margin-top:12px;padding:10px 12px;background:#fee2e2;border-radius:8px;font-size:13px;line-height:1.7;">
        <div style="font-weight:600;color:#991b1b;">❌ ${esc(title)}</div>
        ${detail ? `<div style="color:#7f1d1d;margin-top:4px;word-break:break-all;">${esc(detail)}</div>` : ''}
        ${hint ? `<div style="color:var(--gray-600);margin-top:6px;">💡 ${esc(hint)}</div>` : ''}
      </div>
    `;
  }
  Utils.toast(title, 'error', 3500);
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
