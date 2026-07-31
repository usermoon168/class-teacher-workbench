/**
 * 班级活动页面
 */
const ActivitiesPage = {
  currentTab: 'activities',

  render() {
    let html = `
      <div class="page-title">🎉 班级活动</div>
      <div class="page-subtitle">班会 · 活动档案 · 获奖记录 · 值日安排</div>
    `;

    html += `
      <div class="toolbar">
        <button class="btn btn-primary btn-sm" onclick="showActivityModal()" id="addActBtn">+ 添加活动</button>
        <button class="btn btn-outline btn-sm" onclick="showAwardModal()" id="addAwardBtn">+ 获奖记录</button>
        <button class="btn btn-outline btn-sm" onclick="showDutyModal()" id="addDutyBtn">+ 值日安排</button>
      </div>
    `;

    html += `
      <div class="segment-control">
        <div class="segment-item ${this.currentTab === 'activities' ? 'active' : ''}" onclick="ActivitiesPage.switchTab('activities')">🎊 活动档案</div>
        <div class="segment-item ${this.currentTab === 'awards' ? 'active' : ''}" onclick="ActivitiesPage.switchTab('awards')">🏆 获奖记录</div>
        <div class="segment-item ${this.currentTab === 'duty' ? 'active' : ''}" onclick="ActivitiesPage.switchTab('duty')">🧹 值日安排</div>
      </div>
    `;

    if (this.currentTab === 'activities') {
      html += this.renderActivities();
    } else if (this.currentTab === 'awards') {
      html += this.renderAwards();
    } else if (this.currentTab === 'duty') {
      html += this.renderDuty();
    }

    document.getElementById('mainContent').innerHTML = html;
  },

  renderActivities() {
    const activities = DB.getByClass('activities');
    if (activities.length === 0) {
      return Utils.emptyState('🎊', '暂无活动记录');
    }
    const sorted = [...activities].sort((a, b) => b.date.localeCompare(a.date));
    let html = '';
    sorted.forEach(a => {
      const typeIcon = a.type === '班会' ? '🏫' : a.type === '活动' ? '🎉' : '📌';
      html += `
        <div class="card" onclick="ActivitiesPage.showActivityDetail('${a.id}')">
          <div style="display:flex;justify-content:space-between;">
            <strong style="font-size:15px;">${typeIcon} ${a.title}</strong>
            <span style="font-size:12px;color:var(--gray-500);">${a.date}</span>
          </div>
          <div style="font-size:13px;color:var(--gray-600);margin-top:4px;">${a.content.substring(0, 60)}${a.content.length > 60 ? '...' : ''}</div>
          ${a.result ? `<div style="font-size:12px;color:var(--success);margin-top:4px;">✓ ${a.result}</div>` : ''}
        </div>
      `;
    });
    return html;
  },

  renderAwards() {
    const awards = DB.getByClass('awards');
    if (awards.length === 0) {
      return Utils.emptyState('🏆', '暂无获奖记录');
    }
    const sorted = [...awards].sort((a, b) => b.date.localeCompare(a.date));
    let html = `
      <div class="stat-grid">
        <div class="stat-card warning"><div class="stat-value">${awards.length}</div><div class="stat-label">总获奖数</div></div>
        <div class="stat-card success"><div class="stat-value">${awards.filter(a => a.level === '国家级').length}</div><div class="stat-label">国家级</div></div>
        <div class="stat-card info"><div class="stat-value">${awards.filter(a => a.level === '省级').length}</div><div class="stat-label">省级</div></div>
        <div class="stat-card"><div class="stat-value">${awards.filter(a => a.level === '市级').length}</div><div class="stat-label">市级</div></div>
      </div>
      <div class="card" style="padding:0;">
    `;
    sorted.forEach(a => {
      const levelColor = a.level === '国家级' ? 'danger' : a.level === '省级' ? 'warning' : a.level === '市级' ? 'info' : a.level === '校级' ? 'success' : 'gray';
      html += `
        <div class="list-item" onclick="ActivitiesPage.showAwardDetail('${a.id}')">
          <div class="list-avatar" style="background:#fef3c7;color:#92400e;">🏆</div>
          <div class="list-content">
            <div class="list-title">${a.awardName}</div>
            <div class="list-subtitle">${a.studentName} · ${a.date} · ${a.organization}</div>
          </div>
          <span class="tag tag-${levelColor}">${a.level}</span>
        </div>
      `;
    });
    html += '</div>';
    return html;
  },

  renderDuty() {
    const duty = DB.getByClass('dutyRoster');
    const students = DB.getByClass('students');
    const today = Utils.today();
    const weekday = Utils.weekday(today);

    let html = `
      <div class="card">
        <div class="card-header"><div class="card-title">🧹 今日值日 (${weekday})</div></div>
    `;

    const todayDuty = duty.filter(d => d.weekday === weekday);
    if (todayDuty.length > 0) {
      const dutyTypes = Utils.groupBy(todayDuty, 'type');
      Object.entries(dutyTypes).forEach(([type, items]) => {
        html += `<div style="margin-bottom:8px;"><strong style="font-size:13px;">${type}：</strong>`;
        html += items.map(i => i.studentName).join('、');
        html += '</div>';
      });
    } else {
      html += '<div style="color:var(--gray-400);text-align:center;padding:12px;">今日暂无值日安排</div>';
    }
    html += '</div>';

    // 值日表
    const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    html += '<div class="card"><div class="card-header"><div class="card-title">📅 值日安排表</div></div>';
    html += '<div class="table-wrapper"><table class="data-table"><thead><tr><th>星期</th><th>值日生</th><th>类型</th></tr></thead><tbody>';
    weekdays.forEach(w => {
      const dayDuty = duty.filter(d => d.weekday === w);
      if (dayDuty.length > 0) {
        const types = Utils.groupBy(dayDuty, 'type');
        const typesStr = Object.entries(types).map(([type, items]) => `${type}: ${items.map(i => i.studentName).join('、')}`).join('<br>');
        html += `<tr><td><strong>${w}</strong></td><td>${dayDuty.map(d => d.studentName).join('、')}</td><td>${typesStr}</td></tr>`;
      } else {
        html += `<tr><td><strong>${w}</strong></td><td style="color:var(--gray-400);">-</td><td>-</td></tr>`;
      }
    });
    html += '</tbody></table></div></div>';

    return html;
  },

  showActivityDetail(id) {
    const activity = (DB.get('activities') || []).find(a => a.id === id);
    if (!activity) return;
    Utils.showModal('活动详情', `
      <div class="card">
        <div style="font-weight:700;font-size:16px;">${activity.title}</div>
        <div style="display:grid;gap:8px;margin-top:12px;font-size:14px;">
          <div><span style="color:var(--gray-500);">类型：</span>${activity.type}</div>
          <div><span style="color:var(--gray-500);">日期：</span>${activity.date}</div>
          <div><span style="color:var(--gray-500);">地点：</span>${activity.location || ''}</div>
          <div><span style="color:var(--gray-500);">参与：</span>${activity.participants || '全体学生'}</div>
          <div style="margin-top:8px;line-height:1.8;">${activity.content}</div>
          ${activity.result ? `<div style="margin-top:8px;padding:10px;background:#d1fae5;border-radius:8px;"><strong>结果：</strong>${activity.result}</div>` : ''}
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">关闭</button>
      <button class="btn btn-danger" style="flex:1;" onclick="deleteActivity('${id}')">🗑 删除</button>
    `);
  },

  showAwardDetail(id) {
    const award = (DB.get('awards') || []).find(a => a.id === id);
    if (!award) return;
    Utils.showModal('获奖详情', `
      <div class="card">
        <div style="font-weight:700;font-size:16px;">🏆 ${award.awardName}</div>
        <div style="display:grid;gap:8px;margin-top:12px;font-size:14px;">
          <div><span style="color:var(--gray-500);">获奖人：</span>${award.studentName}</div>
          <div><span style="color:var(--gray-500);">级别：</span><span class="tag tag-${award.level === '国家级' ? 'danger' : award.level === '省级' ? 'warning' : award.level === '市级' ? 'info' : 'success'}">${award.level}</span></div>
          <div><span style="color:var(--gray-500);">日期：</span>${award.date}</div>
          <div><span style="color:var(--gray-500);">颁发单位：</span>${award.organization}</div>
          <div><span style="color:var(--gray-500);">描述：</span>${award.description || ''}</div>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">关闭</button>
      <button class="btn btn-danger" style="flex:1;" onclick="deleteAward('${id}')">🗑 删除</button>
    `);
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.render();
  }
};

// 添加活动
function showActivityModal(id) {
  const activity = id ? (DB.get('activities') || []).find(a => a.id === id) : null;
  const isEdit = !!activity;

  Utils.showModal(isEdit ? '编辑活动' : '添加活动', `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">类型</label>
        <select class="form-select" id="actType">
          <option value="班会" ${activity?.type === '班会' ? 'selected' : ''}>班会</option>
          <option value="活动" ${activity?.type === '活动' ? 'selected' : ''}>活动</option>
          <option value="比赛" ${activity?.type === '比赛' ? 'selected' : ''}>比赛</option>
          <option value="其他" ${activity?.type === '其他' ? 'selected' : ''}>其他</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">日期</label>
        <input class="form-input" id="actDate" type="date" value="${activity?.date || Utils.today()}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">标题 *</label>
      <input class="form-input" id="actTitle" value="${activity?.title || ''}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">地点</label>
        <input class="form-input" id="actLocation" value="${activity?.location || '教室'}">
      </div>
      <div class="form-group">
        <label class="form-label">参与人员</label>
        <input class="form-input" id="actParticipants" value="${activity?.participants || '全体学生'}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">活动内容 *</label>
      <textarea class="form-textarea" id="actContent" style="min-height:100px;">${activity?.content || ''}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">结果/效果</label>
      <textarea class="form-textarea" id="actResult">${activity?.result || ''}</textarea>
    </div>
  `, `
    <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
    <button class="btn btn-primary" style="flex:1;" onclick="saveActivity(${isEdit ? `'${id}'` : 'null'})">保存</button>
  `);
}

function saveActivity(id) {
  const title = document.getElementById('actTitle').value.trim();
  if (!title) {
    Utils.toast('请输入标题', 'error');
    return;
  }
  const data = {
    type: document.getElementById('actType').value,
    date: document.getElementById('actDate').value,
    title: title,
    location: document.getElementById('actLocation').value.trim(),
    participants: document.getElementById('actParticipants').value.trim(),
    content: document.getElementById('actContent').value.trim(),
    result: document.getElementById('actResult').value.trim()
  };
  if (id) DB.update('activities', id, data);
  else DB.add('activities', data);
  Utils.closeModal();
  ActivitiesPage.render();
  Utils.toast('保存成功', 'success');
}

function deleteActivity(id) {
  Utils.confirm('确定要删除吗？', () => {
    DB.delete('activities', id);
    Utils.closeModal();
    ActivitiesPage.render();
    Utils.toast('已删除', 'success');
  });
}

// 获奖记录
function showAwardModal(id) {
  const award = id ? (DB.get('awards') || []).find(a => a.id === id) : null;
  const isEdit = !!award;
  const students = DB.getByClass('students');

  Utils.showModal(isEdit ? '编辑获奖' : '添加获奖记录', `
    <div class="form-group">
      <label class="form-label">学生姓名 *</label>
      ${students.length > 0 ?
        `<select class="form-select" id="awStudent" onchange="document.getElementById('awStudentName').value=this.options[this.selectedIndex].text">
          <option value="">请选择</option>
          ${students.map(s => `<option value="${s.name}" ${award?.studentName === s.name ? 'selected' : ''}>${s.name}</option>`).join('')}
        </select>` :
        `<input class="form-input" id="awStudentName" value="${award?.studentName || ''}" placeholder="学生姓名">`
      }
      <input type="hidden" id="awStudentName" value="${award?.studentName || ''}">
    </div>
    <div class="form-group">
      <label class="form-label">奖项名称 *</label>
      <input class="form-input" id="awName" value="${award?.awardName || ''}" placeholder="如：数学竞赛一等奖">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">级别</label>
        <select class="form-select" id="awLevel">
          <option value="校级" ${award?.level === '校级' ? 'selected' : ''}>校级</option>
          <option value="区级" ${award?.level === '区级' ? 'selected' : ''}>区级</option>
          <option value="市级" ${award?.level === '市级' ? 'selected' : ''}>市级</option>
          <option value="省级" ${award?.level === '省级' ? 'selected' : ''}>省级</option>
          <option value="国家级" ${award?.level === '国家级' ? 'selected' : ''}>国家级</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">日期</label>
        <input class="form-input" id="awDate" type="date" value="${award?.date || Utils.today()}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">颁发单位</label>
      <input class="form-input" id="awOrg" value="${award?.organization || ''}" placeholder="如：市教育局">
    </div>
    <div class="form-group">
      <label class="form-label">描述</label>
      <textarea class="form-textarea" id="awDesc">${award?.description || ''}</textarea>
    </div>
  `, `
    <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
    <button class="btn btn-primary" style="flex:1;" onclick="saveAward(${isEdit ? `'${id}'` : 'null'})">保存</button>
  `);
}

function saveAward(id) {
  let studentName = document.getElementById('awStudentName').value;
  const select = document.getElementById('awStudent');
  if (select && select.value) {
    studentName = select.value;
  }
  if (!studentName) {
    Utils.toast('请选择/输入学生姓名', 'error');
    return;
  }
  const awardName = document.getElementById('awName').value.trim();
  if (!awardName) {
    Utils.toast('请输入奖项名称', 'error');
    return;
  }
  const data = {
    studentName: studentName,
    awardName: awardName,
    level: document.getElementById('awLevel').value,
    date: document.getElementById('awDate').value,
    organization: document.getElementById('awOrg').value.trim(),
    description: document.getElementById('awDesc').value.trim()
  };
  if (id) DB.update('awards', id, data);
  else DB.add('awards', data);
  Utils.closeModal();
  ActivitiesPage.render();
  Utils.toast('保存成功', 'success');
}

function deleteAward(id) {
  Utils.confirm('确定要删除吗？', () => {
    DB.delete('awards', id);
    Utils.closeModal();
    ActivitiesPage.render();
    Utils.toast('已删除', 'success');
  });
}

// 值日安排
function showDutyModal() {
  const students = DB.getByClass('students');
  Utils.showModal('添加值日安排', `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">星期</label>
        <select class="form-select" id="dutyWeekday">
          <option value="周一">周一</option>
          <option value="周二">周二</option>
          <option value="周三">周三</option>
          <option value="周四">周四</option>
          <option value="周五">周五</option>
          <option value="周六">周六</option>
          <option value="周日">周日</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">值日类型</label>
        <select class="form-select" id="dutyType">
          <option value="打扫卫生">打扫卫生</option>
          <option value="擦黑板">擦黑板</option>
          <option value="倒垃圾">倒垃圾</option>
          <option value="开关门窗">开关门窗</option>
          <option value="纪律值日">纪律值日</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">值日生</label>
      <select class="form-select" id="dutyStudent">
        ${students.map(s => `<option value="${s.id}" data-name="${s.name}">${s.name}</option>`).join('')}
      </select>
    </div>
  `, `
    <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
    <button class="btn btn-primary" style="flex:1;" onclick="saveDuty()">保存</button>
  `);
}

function saveDuty() {
  const select = document.getElementById('dutyStudent');
  const studentName = select.options[select.selectedIndex].dataset.name;
  DB.add('dutyRoster', {
    weekday: document.getElementById('dutyWeekday').value,
    type: document.getElementById('dutyType').value,
    studentId: select.value,
    studentName: studentName
  });
  Utils.closeModal();
  ActivitiesPage.render();
  Utils.toast('值日已安排', 'success');
}
