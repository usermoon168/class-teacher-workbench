/**
 * 仪表盘页面
 */
const DashboardPage = {
  render() {
    const cls = DB.getCurrentClass();
    const students = DB.getByClass('students');
    const discipline = DB.getByClass('discipline');
    const leaves = DB.getByClass('leaves');
    const homework = DB.getByClass('homework');
    const todos = DB.getByClass('todos');
    const talks = DB.getByClass('talks');
    const worklogs = DB.getByClass('worklogs');
    const exams = DB.getByClass('exams');
    const grades = DB.getByClass('grades');

    // 今日数据
    const today = Utils.today();
    const todayDiscipline = discipline.filter(d => d.date === today).length;
    const todayLeaves = leaves.filter(l => l.startDate <= today && l.endDate >= today).length;
    const todayHomework = homework.filter(h => h.dueDate === today).length;
    const pendingTodos = todos.filter(t => !t.completed).length;
    const activeLeaves = leaves.filter(l => l.status !== '已销假').length;

    // 本周违纪
    const weekRange = Utils.getWeekRange();
    const weekDiscipline = discipline.filter(d => d.date >= weekRange.start && d.date <= weekRange.end).length;

    // 最近成绩
    const latestExam = exams[exams.length - 1];
    const latestGrades = latestExam ? grades.filter(g => g.examId === latestExam.id) : [];
    const classAvg = latestGrades.length > 0 ? (Utils.average(latestGrades.map(g => g.total))).toFixed(1) : '-';
    const maxScore = latestGrades.length > 0 ? Math.max(...latestGrades.map(g => g.total)) : '-';
    const passRate = latestGrades.length > 0 ? (latestGrades.filter(g => g.average >= 60).length / latestGrades.length * 100).toFixed(0) : '-';

    let html = `
      <div class="page-title">📊 ${cls.name} · 仪表盘</div>
    `;

    // 统计卡片
    html += `
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-value">${students.length}</div>
          <div class="stat-label">班级人数</div>
        </div>
        <div class="stat-card ${todayDiscipline > 0 ? 'danger' : 'success'}">
          <div class="stat-icon">⚠️</div>
          <div class="stat-value">${todayDiscipline}</div>
          <div class="stat-label">今日违纪</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-icon">📋</div>
          <div class="stat-value">${activeLeaves}</div>
          <div class="stat-label">请假中</div>
        </div>
        <div class="stat-card info">
          <div class="stat-icon">✅</div>
          <div class="stat-value">${pendingTodos}</div>
          <div class="stat-label">待办事项</div>
        </div>
      </div>
    `;

    // 快捷操作
    html += `
      <div class="card">
        <div class="card-header">
          <div class="card-title">⚡ 快捷操作</div>
        </div>
        <div class="quick-grid">
          <div class="quick-item" onclick="navigateTo('attendance')">
            <div class="quick-icon" style="background:#f0fdf4;color:#166534;">📋</div>
            <span>今日考勤</span>
          </div>
          <div class="quick-item" onclick="navigateTo('homework');setTimeout(()=>showHomeworkModal(),300)">
            <div class="quick-icon" style="background:#d1fae5;color:#065f46;">📚</div>
            <span>布置作业</span>
          </div>
          <div class="quick-item" onclick="navigateTo('grades');setTimeout(()=>showGradeEntryModal(),300)">
            <div class="quick-icon" style="background:#dbeafe;color:#1e40af;">📝</div>
            <span>录入成绩</span>
          </div>
          <div class="quick-item" onclick="navigateTo('discipline');setTimeout(()=>showDisciplineModal(),300)">
            <div class="quick-icon" style="background:#fee2e2;color:#991b1b;">⚠️</div>
            <span>记录违纪</span>
          </div>
          <div class="quick-item" onclick="navigateTo('leave');setTimeout(()=>showLeaveModal(),300)">
            <div class="quick-icon" style="background:#fef3c7;color:#92400e;">📋</div>
            <span>请假登记</span>
          </div>
          <div class="quick-item" onclick="navigateTo('worklog');setTimeout(()=>showWorklogModal(),300)">
            <div class="quick-icon" style="background:#e0e7ff;color:#4338ca;">📅</div>
            <span>工作留痕</span>
          </div>
          <div class="quick-item" onclick="navigateTo('talks');setTimeout(()=>showTalkModal(),300)">
            <div class="quick-icon" style="background:#fce7f3;color:#9d174d;">💬</div>
            <span>谈话记录</span>
          </div>
          <div class="quick-item" onclick="navigateTo('todo');setTimeout(()=>showTodoModal(),300)">
            <div class="quick-icon" style="background:#f3f4f6;color:#374151;">✅</div>
            <span>添加待办</span>
          </div>
          <div class="quick-item" onclick="navigateTo('seating')">
            <div class="quick-icon" style="background:#fff7ed;color:#9a3412;">🪑</div>
            <span>座位表</span>
          </div>
          <div class="quick-item" onclick="navigateTo('randomname')">
            <div class="quick-icon" style="background:#faf5ff;color:#7e22ce;">🎲</div>
            <span>随机点名</span>
          </div>
          <div class="quick-item" onclick="navigateTo('countdown')">
            <div class="quick-icon" style="background:#fffbeb;color:#b45309;">⏰</div>
            <span>倒计时</span>
          </div>
        </div>
      </div>
    `;

    // 今日提醒
    const reminders = DB.getByClass('reminders');
    const upcomingReminders = reminders.filter(r => r.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
    if (upcomingReminders.length > 0) {
      html += `
        <div class="card">
          <div class="card-header">
            <div class="card-title">🔔 重要提醒</div>
          </div>
      `;
      upcomingReminders.forEach(r => {
        const days = Utils.daysBetween(today, r.date);
        const isUrgent = days <= 1;
        html += `
          <div class="reminder-item ${isUrgent ? 'danger' : 'info'}">
            <div class="reminder-icon">${r.type === 'birthday' ? '🎂' : '📅'}</div>
            <div class="reminder-content">
              <div class="reminder-title">${r.title}</div>
              <div class="reminder-desc">${r.date} · ${days === 0 ? '今天' : days === 1 ? '明天' : days + '天后'}</div>
            </div>
          </div>
        `;
      });
      html += '</div>';
    }

    // 倒计时
    const countdowns = DB.getByClass('countdowns');
    const upcomingCountdowns = countdowns.filter(c => c.targetDate >= today).sort((a, b) => a.targetDate.localeCompare(b.targetDate)).slice(0, 3);
    if (upcomingCountdowns.length > 0) {
      html += `
        <div class="card">
          <div class="card-header">
            <div class="card-title">⏰ 倒计时</div>
            <button class="btn btn-sm btn-outline" onclick="navigateTo('countdown')">全部 ›</button>
          </div>
      `;
      upcomingCountdowns.forEach(c => {
        const days = Utils.daysBetween(today, c.targetDate);
        const isUrgent = days <= 7;
        const typeIcons = { exam: '📝', activity: '🎉', meeting: '🤝', other: '📌' };
        html += `
          <div class="reminder-item ${isUrgent ? 'danger' : 'info'}">
            <div class="reminder-icon">${typeIcons[c.type] || '📌'}</div>
            <div class="reminder-content">
              <div class="reminder-title">${c.title}</div>
              <div class="reminder-desc">${c.targetDate} · ${days === 0 ? '今天' : days + '天后'}</div>
            </div>
            <div style="font-size:24px;font-weight:700;color:${isUrgent ? 'var(--danger)' : 'var(--primary)'};">${days === 0 ? '今' : days}</div>
          </div>
        `;
      });
      html += '</div>';
    }

    // 成绩概览
    if (latestExam) {
      html += `
        <div class="card">
          <div class="card-header">
            <div class="card-title">📈 最近成绩 · ${latestExam.name}</div>
            <button class="btn btn-sm btn-outline" onclick="navigateTo('grades')">详情 ›</button>
          </div>
          <div class="stat-grid">
            <div class="stat-card info">
              <div class="stat-value">${classAvg}</div>
              <div class="stat-label">班级均分</div>
            </div>
            <div class="stat-card success">
              <div class="stat-value">${maxScore}</div>
              <div class="stat-label">最高分</div>
            </div>
            <div class="stat-card warning">
              <div class="stat-value">${passRate}%</div>
              <div class="stat-label">及格率</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${latestGrades.length}</div>
              <div class="stat-label">参考人数</div>
            </div>
          </div>
        </div>
      `;
    }

    // 违纪趋势图
    if (discipline.length > 0) {
      html += `
        <div class="card">
          <div class="card-header">
            <div class="card-title">📊 违纪趋势（近7天）</div>
            <button class="btn btn-sm btn-outline" onclick="navigateTo('discipline')">详情 ›</button>
          </div>
          <div class="chart-container">
            <canvas id="disciplineTrendChart"></canvas>
          </div>
        </div>
      `;
    }

    // 今日待办
    const todayTodos = todos.filter(t => !t.completed).slice(0, 5);
    html += `
      <div class="card">
        <div class="card-header">
          <div class="card-title">📋 待办事项</div>
          <button class="btn btn-sm btn-outline" onclick="navigateTo('todo')">全部 ›</button>
        </div>
    `;
    if (todayTodos.length > 0) {
      todayTodos.forEach(t => {
        const priorityColors = { high: 'danger', medium: 'warning', low: 'gray' };
        const priorityLabels = { high: '紧急', medium: '一般', low: '低' };
        html += `
          <div class="list-item" onclick="toggleTodo('${t.id}')">
            <div class="list-avatar" style="background:var(--gray-100);color:var(--gray-500);">○</div>
            <div class="list-content">
              <div class="list-title">${t.title}</div>
              <div class="list-subtitle">截止：${t.dueDate || '无'}</div>
            </div>
            <span class="tag tag-${priorityColors[t.priority]}">${priorityLabels[t.priority]}</span>
          </div>
        `;
      });
    } else {
      html += Utils.emptyState('🎉', '暂无待办事项');
    }
    html += '</div>';

    // 最近工作留痕
    const recentWorklogs = [...worklogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
    if (recentWorklogs.length > 0) {
      html += `
        <div class="card">
          <div class="card-header">
            <div class="card-title">📅 最近工作留痕</div>
            <button class="btn btn-sm btn-outline" onclick="navigateTo('worklog')">全部 ›</button>
          </div>
          <div class="timeline">
      `;
      recentWorklogs.forEach(w => {
        html += `
          <div class="timeline-item">
            <div class="timeline-time">${w.date}</div>
            <div class="timeline-title">${w.type} · ${w.title}</div>
            <div class="timeline-content">${w.content.substring(0, 60)}...</div>
          </div>
        `;
      });
      html += '</div></div>';
    }

    document.getElementById('mainContent').innerHTML = html;

    // 渲染违纪趋势图
    if (discipline.length > 0) {
      this.renderDisciplineTrendChart(discipline);
    }
  },

  renderDisciplineTrendChart(discipline) {
    const today = new Date();
    const labels = [];
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = Utils.formatDate(d);
      labels.push(Utils.formatDate(d, 'MM-DD'));
      data.push(discipline.filter(item => item.date === dateStr).length);
    }

    Utils.destroyChart('disciplineTrendChart');
    const ctx = document.getElementById('disciplineTrendChart');
    if (ctx) {
      new Chart(ctx, {
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
            pointRadius: 4,
            pointBackgroundColor: '#ef4444'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } }
          }
        }
      });
    }
  }
};

function toggleTodo(id) {
  const todo = (DB.get('todos') || []).find(t => t.id === id);
  if (todo) {
    DB.update('todos', id, { completed: !todo.completed });
    Utils.toast(todo.completed ? '已标记为待办' : '已完成', 'success');
    DashboardPage.render();
  }
}
