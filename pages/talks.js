/**
 * 谈话记录页面
 */
const TalksPage = {
  currentTab: 'list',

  render() {
    let html = `
      <div class="page-title">💬 谈话记录</div>
      <div class="page-subtitle">全维度谈话档案 · 按学生导出</div>
    `;

    html += `
      <div class="toolbar">
        <button class="btn btn-primary btn-sm" onclick="showTalkModal()">+ 新增谈话</button>
        <button class="btn btn-outline btn-sm" onclick="TalksPage.exportAll()">📤 批量导出</button>
      </div>
    `;

    const talks = DB.getByClass('talks');

    if (talks.length === 0) {
      html += Utils.emptyState('💬', '暂无谈话记录');
      document.getElementById('mainContent').innerHTML = html;
      return;
    }

    html += `
      <div class="segment-control">
        <div class="segment-item ${this.currentTab === 'list' ? 'active' : ''}" onclick="TalksPage.switchTab('list')">📋 全部记录</div>
        <div class="segment-item ${this.currentTab === 'student' ? 'active' : ''}" onclick="TalksPage.switchTab('student')">👥 按学生</div>
        <div class="segment-item ${this.currentTab === 'stats' ? 'active' : ''}" onclick="TalksPage.switchTab('stats')">📊 统计</div>
      </div>
    `;

    if (this.currentTab === 'list') {
      html += this.renderList(talks);
    } else if (this.currentTab === 'student') {
      html += this.renderByStudent(talks);
    } else {
      html += this.renderStats(talks);
    }

    document.getElementById('mainContent').innerHTML = html;

    if (this.currentTab === 'stats') {
      this.renderChart(talks);
    }
  },

  renderList(talks) {
    const sorted = [...talks].sort((a, b) => b.date.localeCompare(a.date));
    let html = `
      <div class="search-bar" style="margin-bottom:12px;">
        <input type="text" placeholder="搜索学生/类型..." oninput="TalksPage.filterTalks(this.value)">
      </div>
      <div id="talksList">
    `;
    sorted.forEach(t => {
      const typeColor = this.getTypeColor(t.type);
      html += `
        <div class="talk-card ${typeColor}" onclick="TalksPage.showDetail('${t.id}')">
          <div style="display:flex;justify-content:space-between;align-items:start;">
            <div>
              <strong>${t.studentName}</strong>
              <span class="tag tag-${typeColor === 'danger' ? 'danger' : typeColor === 'warning' ? 'warning' : 'primary'}" style="margin-left:6px;">${t.type}</span>
            </div>
            <span style="font-size:12px;color:var(--gray-500);">${t.date}</span>
          </div>
          <div style="font-size:13px;color:var(--gray-600);margin-top:4px;">${t.content.substring(0, 60)}${t.content.length > 60 ? '...' : ''}</div>
          ${t.effect ? `<div style="font-size:12px;color:var(--success);margin-top:4px;">✓ ${t.effect}</div>` : ''}
        </div>
      `;
    });
    html += '</div>';
    return html;
  },

  renderByStudent(talks) {
    const studentGroups = Utils.groupBy(talks, 'studentName');
    let html = '';
    Object.entries(studentGroups).sort((a, b) => b[1].length - a[1].length).forEach(([name, items]) => {
      const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));
      html += `
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span style="display:inline-block;width:32px;height:32px;border-radius:50%;background:${Utils.getColorFromName(name)}20;color:${Utils.getColorFromName(name)};text-align:center;line-height:32px;font-size:14px;margin-right:6px;">${Utils.getInitial(name)}</span>
              ${name}
            </div>
            <div>
              <span class="tag tag-primary">${items.length}次</span>
              <button class="btn btn-sm btn-outline" onclick="TalksPage.exportByStudent('${name}')">📄 导出</button>
            </div>
          </div>
          <div class="timeline" style="margin-top:8px;">
      `;
      sorted.forEach(t => {
        html += `
          <div class="timeline-item ${this.getTypeColor(t.type)}" onclick="TalksPage.showDetail('${t.id}')">
            <div class="timeline-time">${t.date} · ${t.type}</div>
            <div class="timeline-content">${t.content.substring(0, 60)}${t.content.length > 60 ? '...' : ''}</div>
          </div>
        `;
      });
      html += '</div></div>';
    });
    return html;
  },

  renderStats(talks) {
    const typeCounts = Utils.groupBy(talks, 'type');
    const monthRange = Utils.getMonthRange();
    const monthCount = talks.filter(t => t.date >= monthRange.start && t.date <= monthRange.end).length;
    const studentCount = new Set(talks.map(t => t.studentId)).size;

    let html = `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-value">${talks.length}</div><div class="stat-label">总次数</div></div>
        <div class="stat-card info"><div class="stat-value">${studentCount}</div><div class="stat-label">涉及学生</div></div>
        <div class="stat-card success"><div class="stat-value">${monthCount}</div><div class="stat-label">本月</div></div>
        <div class="stat-card warning"><div class="stat-value">${Object.keys(typeCounts).length}</div><div class="stat-label">类型数</div></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">📊 谈话类型分布</div></div>
        <div class="chart-container large"><canvas id="talkTypeChart"></canvas></div>
      </div>
    `;

    // 谈话频率最高的学生
    const studentCounts = {};
    talks.forEach(t => {
      studentCounts[t.studentName] = (studentCounts[t.studentName] || 0) + 1;
    });
    const topStudents = Object.entries(studentCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (topStudents.length > 0) {
      html += `
        <div class="card">
          <div class="card-header"><div class="card-title">📊 谈话次数最多学生</div></div>
          <div class="chart-container large"><canvas id="talkStudentChart"></canvas></div>
        </div>
      `;
    }

    return html;
  },

  getTypeColor(type) {
    const map = {
      '学业辅导': '',
      '心理疏导': 'success',
      '纪律教育': 'danger',
      '家校沟通': 'warning',
      '励志激励': 'success',
      '其他': ''
    };
    return map[type] || '';
  },

  renderChart(talks) {
    const typeCounts = Utils.groupBy(talks, 'type');
    Utils.destroyChart('talkTypeChart');
    new Chart(document.getElementById('talkTypeChart'), {
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

    const studentCounts = {};
    talks.forEach(t => {
      studentCounts[t.studentName] = (studentCounts[t.studentName] || 0) + 1;
    });
    const topStudents = Object.entries(studentCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (topStudents.length > 0) {
      Utils.destroyChart('talkStudentChart');
      new Chart(document.getElementById('talkStudentChart'), {
        type: 'bar',
        data: {
          labels: topStudents.map(s => s[0]),
          datasets: [{ data: topStudents.map(s => s[1]), backgroundColor: '#8b5cf6', borderRadius: 6 }]
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
    const talk = (DB.get('talks') || []).find(t => t.id === id);
    if (!talk) return;
    Utils.showModal('谈话详情', `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <strong style="font-size:16px;">${talk.studentName}</strong>
          <span style="font-size:13px;color:var(--gray-500);">${talk.date}</span>
        </div>
        <div style="margin-top:6px;">
          <span class="tag tag-primary">${talk.type}</span>
          ${talk.location ? `<span style="font-size:13px;color:var(--gray-500);margin-left:6px;">📍 ${talk.location}</span>` : ''}
        </div>
        <div style="margin-top:12px;font-size:14px;line-height:1.8;">${talk.content}</div>
        ${talk.effect ? `<div style="margin-top:10px;padding:10px;background:#d1fae5;border-radius:8px;font-size:13px;"><strong>效果：</strong>${talk.effect}</div>` : ''}
        ${talk.followUp ? `<div style="margin-top:8px;padding:10px;background:#fef3c7;border-radius:8px;font-size:13px;"><strong>后续：</strong>${talk.followUp}</div>` : ''}
      </div>
    `, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">关闭</button>
      <button class="btn btn-outline" style="flex:1;" onclick="TalksPage.exportSingle('${id}')">📄 导出</button>
      <button class="btn btn-danger" style="flex:1;" onclick="deleteTalk('${id}')">🗑 删除</button>
    `);
  },

  filterTalks(key) {
    const talks = DB.getByClass('talks');
    const filtered = key ? talks.filter(t =>
      t.studentName.includes(key) || t.type.includes(key) || t.content.includes(key)
    ) : talks;
    const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
    const list = document.getElementById('talksList');
    if (list) {
      list.innerHTML = sorted.length > 0 ? sorted.map(t => {
        const typeColor = this.getTypeColor(t.type);
        return `
          <div class="talk-card ${typeColor}" onclick="TalksPage.showDetail('${t.id}')">
            <div style="display:flex;justify-content:space-between;align-items:start;">
              <div>
                <strong>${t.studentName}</strong>
                <span class="tag tag-${typeColor === 'danger' ? 'danger' : typeColor === 'warning' ? 'warning' : 'primary'}" style="margin-left:6px;">${t.type}</span>
              </div>
              <span style="font-size:12px;color:var(--gray-500);">${t.date}</span>
            </div>
            <div style="font-size:13px;color:var(--gray-600);margin-top:4px;">${t.content.substring(0, 60)}${t.content.length > 60 ? '...' : ''}</div>
            ${t.effect ? `<div style="font-size:12px;color:var(--success);margin-top:4px;">✓ ${t.effect}</div>` : ''}
          </div>
        `;
      }).join('') : Utils.emptyState('🔍', '未找到匹配记录');
    }
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.render();
  },

  exportSingle(id) {
    const talk = (DB.get('talks') || []).find(t => t.id === id);
    if (!talk) return;
    const content = `
      <h1>学生谈话记录</h1>
      <div class="header"><p>${DB.getCurrentClass().name}</p><p>日期：${talk.date}</p></div>
      <table>
        <tr><td width="20%">学生姓名</td><td>${talk.studentName}</td><td width="20%">谈话类型</td><td>${talk.type}</td></tr>
        <tr><td>谈话日期</td><td>${talk.date}</td><td>谈话地点</td><td>${talk.location || ''}</td></tr>
      </table>
      <h2>谈话内容</h2>
      <p style="text-indent:2em;">${talk.content}</p>
      <h2>谈话效果</h2>
      <p style="text-indent:2em;">${talk.effect || ''}</p>
      <h2>后续跟进</h2>
      <p style="text-indent:2em;">${talk.followUp || ''}</p>
      <div class="footer"><p>班主任签字：____________</p></div>
    `;
    Utils.exportWord(`${talk.studentName}_谈话记录_${talk.date}.doc`, '学生谈话记录', content);
    Utils.toast('已导出', 'success');
  },

  exportByStudent(name) {
    const talks = DB.getByClass('talks').filter(t => t.studentName === name).sort((a, b) => b.date.localeCompare(a.date));
    if (talks.length === 0) return;
    let content = `
      <h1>${name} · 谈话记录档案</h1>
      <div class="header"><p>${DB.getCurrentClass().name}</p><p>共${talks.length}次谈话 | 生成日期：${Utils.today()}</p></div>
    `;
    talks.forEach((t, i) => {
      content += `
        <h2>第${i + 1}次谈话</h2>
        <table>
          <tr><td width="20%">谈话类型</td><td>${t.type}</td><td width="20%">谈话日期</td><td>${t.date}</td></tr>
          <tr><td>谈话地点</td><td>${t.location || ''}</td><td></td><td></td></tr>
        </table>
        <p><strong>谈话内容：</strong></p>
        <p style="text-indent:2em;">${t.content}</p>
        <p><strong>谈话效果：</strong>${t.effect || ''}</p>
        <p><strong>后续跟进：</strong>${t.followUp || ''}</p>
        <hr>
      `;
    });
    content += `<div class="footer"><p>班主任签字：____________</p></div>`;
    Utils.exportWord(`${name}_谈话档案.doc`, `${name}谈话记录`, content);
    Utils.toast('已导出', 'success');
  },

  exportAll() {
    const talks = DB.getByClass('talks');
    if (talks.length === 0) {
      Utils.toast('暂无数据', 'warning');
      return;
    }
    const sorted = [...talks].sort((a, b) => b.date.localeCompare(a.date));
    let content = `
      <h1>班主任谈话记录汇总</h1>
      <div class="header"><p>${DB.getCurrentClass().name}</p><p>共${sorted.length}条记录 | 生成日期：${Utils.today()}</p></div>
    `;
    sorted.forEach((t, i) => {
      content += `
        <h2>${i + 1}. ${t.studentName} - ${t.type}</h2>
        <p><strong>日期：</strong>${t.date}　<strong>地点：</strong>${t.location || ''}</p>
        <p style="text-indent:2em;">${t.content}</p>
        <p><strong>效果：</strong>${t.effect || ''}</p>
        <hr>
      `;
    });
    Utils.exportWord(`谈话记录汇总_${Utils.today()}.doc`, '谈话记录汇总', content);
    Utils.toast('已导出', 'success');
  }
};

// 添加/编辑谈话
function showTalkModal(id) {
  const talk = id ? (DB.get('talks') || []).find(t => t.id === id) : null;
  const isEdit = !!talk;
  const students = DB.getByClass('students');

  Utils.showModal(isEdit ? '编辑谈话' : '新增谈话', `
    <div class="form-group">
      <label class="form-label">学生 *</label>
      <select class="form-select" id="talkStudent">
        ${students.map(s => `<option value="${s.id}" ${talk?.studentId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">谈话类型</label>
        <select class="form-select" id="talkType">
          <option value="学业辅导" ${talk?.type === '学业辅导' ? 'selected' : ''}>学业辅导</option>
          <option value="心理疏导" ${talk?.type === '心理疏导' ? 'selected' : ''}>心理疏导</option>
          <option value="纪律教育" ${talk?.type === '纪律教育' ? 'selected' : ''}>纪律教育</option>
          <option value="家校沟通" ${talk?.type === '家校沟通' ? 'selected' : ''}>家校沟通</option>
          <option value="励志激励" ${talk?.type === '励志激励' ? 'selected' : ''}>励志激励</option>
          <option value="其他" ${talk?.type === '其他' ? 'selected' : ''}>其他</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">日期</label>
        <input class="form-input" id="talkDate" type="date" value="${talk?.date || Utils.today()}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">地点</label>
      <input class="form-input" id="talkLocation" value="${talk?.location || ''}" placeholder="如：办公室">
    </div>
    <div class="form-group">
      <label class="form-label">谈话内容 *</label>
      <textarea class="form-textarea" id="talkContent" style="min-height:100px;" placeholder="详细记录谈话内容">${talk?.content || ''}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">谈话效果</label>
      <textarea class="form-textarea" id="talkEffect" placeholder="学生反应及效果">${talk?.effect || ''}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">后续跟进</label>
      <textarea class="form-textarea" id="talkFollowUp" placeholder="后续跟进计划">${talk?.followUp || ''}</textarea>
    </div>
  `, `
    <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
    <button class="btn btn-primary" style="flex:1;" onclick="saveTalk(${isEdit ? `'${id}'` : 'null'})">保存</button>
  `);
}

function saveTalk(id) {
  const studentId = document.getElementById('talkStudent').value;
  const student = (DB.get('students') || []).find(s => s.id === studentId);
  if (!student) {
    Utils.toast('请选择学生', 'error');
    return;
  }
  const content = document.getElementById('talkContent').value.trim();
  if (!content) {
    Utils.toast('请输入谈话内容', 'error');
    return;
  }
  const data = {
    studentId: studentId,
    studentName: student.name,
    type: document.getElementById('talkType').value,
    date: document.getElementById('talkDate').value,
    location: document.getElementById('talkLocation').value.trim(),
    content: content,
    effect: document.getElementById('talkEffect').value.trim(),
    followUp: document.getElementById('talkFollowUp').value.trim()
  };
  if (id) {
    DB.update('talks', id, data);
    Utils.toast('修改成功', 'success');
  } else {
    DB.add('talks', data);
    Utils.toast('添加成功', 'success');
  }
  Utils.closeModal();
  TalksPage.render();
}

function deleteTalk(id) {
  Utils.confirm('确定要删除此谈话记录吗？', () => {
    DB.delete('talks', id);
    Utils.closeModal();
    TalksPage.render();
    Utils.toast('已删除', 'success');
  });
}
