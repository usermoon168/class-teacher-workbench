/**
 * 家校沟通页面
 */
const CommunicationPage = {
  currentTab: 'parents',

  render() {
    let html = `
      <div class="page-title">📞 家校沟通</div>
      <div class="page-subtitle">家长台账 · 家访 · 家长会 · 群通知</div>
    `;

    html += `
      <div class="toolbar">
        <button class="btn btn-primary btn-sm" onclick="showParentModal()" id="addParentBtn">+ 添加家长</button>
        <button class="btn btn-outline btn-sm" onclick="showHomeVisitModal()" id="addVisitBtn">+ 家访记录</button>
        <button class="btn btn-outline btn-sm" onclick="showNoticeModal()" id="addNoticeBtn">+ 群通知</button>
      </div>
    `;

    html += `
      <div class="segment-control">
        <div class="segment-item ${this.currentTab === 'parents' ? 'active' : ''}" onclick="CommunicationPage.switchTab('parents')">👥 家长台账</div>
        <div class="segment-item ${this.currentTab === 'visits' ? 'active' : ''}" onclick="CommunicationPage.switchTab('visits')">🏠 家访记录</div>
        <div class="segment-item ${this.currentTab === 'meetings' ? 'active' : ''}" onclick="CommunicationPage.switchTab('meetings')">📢 家长会</div>
        <div class="segment-item ${this.currentTab === 'notices' ? 'active' : ''}" onclick="CommunicationPage.switchTab('notices')">📣 群通知</div>
      </div>
    `;

    if (this.currentTab === 'parents') {
      html += this.renderParents();
    } else if (this.currentTab === 'visits') {
      html += this.renderVisits();
    } else if (this.currentTab === 'meetings') {
      html += this.renderMeetings();
    } else if (this.currentTab === 'notices') {
      html += this.renderNotices();
    }

    document.getElementById('mainContent').innerHTML = html;
  },

  renderParents() {
    const parents = DB.getByClass('parents');
    if (parents.length === 0) {
      return Utils.emptyState('👥', '暂无家长信息');
    }
    let html = `
      <div class="search-bar" style="margin-bottom:12px;">
        <input type="text" placeholder="搜索学生姓名..." oninput="CommunicationPage.filterParents(this.value)">
      </div>
      <div id="parentsList" class="card" style="padding:0;">
    `;
    parents.forEach(p => {
      html += `
        <div class="list-item" onclick="CommunicationPage.showParentDetail('${p.id}')">
          <div class="list-avatar" style="background:#dbeafe;color:#1e40af;">👨‍👩‍👧</div>
          <div class="list-content">
            <div class="list-title">${p.studentName} 家长</div>
            <div class="list-subtitle">${p.fatherName || ''} ${p.fatherPhone || ''} | ${p.motherName || ''}</div>
          </div>
          <div class="list-action">›</div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  },

  renderVisits() {
    const visits = DB.getByClass('homeVisits');
    if (visits.length === 0) {
      return Utils.emptyState('🏠', '暂无家访记录');
    }
    const sorted = [...visits].sort((a, b) => b.date.localeCompare(a.date));
    let html = '';
    sorted.forEach(v => {
      html += `
        <div class="card" onclick="CommunicationPage.showVisitDetail('${v.id}')">
          <div style="display:flex;justify-content:space-between;">
            <strong>${v.studentName} 家访</strong>
            <span style="font-size:12px;color:var(--gray-500);">${v.date}</span>
          </div>
          <div style="font-size:13px;color:var(--gray-600);margin-top:4px;">${v.purpose || ''}</div>
          <div style="font-size:12px;color:var(--gray-500);margin-top:4px;">📍 ${v.location || '家中'}</div>
        </div>
      `;
    });
    return html;
  },

  renderMeetings() {
    const meetings = DB.getByClass('parentMeetings');
    if (meetings.length === 0) {
      return Utils.emptyState('📢', '暂无家长会记录');
    }
    const sorted = [...meetings].sort((a, b) => b.date.localeCompare(a.date));
    let html = '';
    sorted.forEach(m => {
      html += `
        <div class="card" onclick="CommunicationPage.showMeetingDetail('${m.id}')">
          <div style="display:flex;justify-content:space-between;">
            <strong>${m.title}</strong>
            <span style="font-size:12px;color:var(--gray-500);">${m.date}</span>
          </div>
          <div style="font-size:13px;color:var(--gray-600);margin-top:4px;">${m.content.substring(0, 60)}${m.content.length > 60 ? '...' : ''}</div>
          <div style="font-size:12px;color:var(--gray-500);margin-top:4px;">参与：${m.attendance || ''} | 地点：${m.location || ''}</div>
        </div>
      `;
    });
    return html;
  },

  renderNotices() {
    const notices = DB.getByClass('groupNotices');
    if (notices.length === 0) {
      return Utils.emptyState('📣', '暂无群通知');
    }
    const sorted = [...notices].sort((a, b) => b.date.localeCompare(a.date));
    let html = '';
    sorted.forEach(n => {
      const typeIcon = n.type === '紧急' ? '🔴' : n.type === '重要' ? '🟡' : '🟢';
      html += `
        <div class="card" onclick="CommunicationPage.showNoticeDetail('${n.id}')">
          <div style="display:flex;justify-content:space-between;">
            <strong>${typeIcon} ${n.title}</strong>
            <span style="font-size:12px;color:var(--gray-500);">${n.date}</span>
          </div>
          <div style="font-size:13px;color:var(--gray-600);margin-top:4px;">${n.content.substring(0, 80)}${n.content.length > 80 ? '...' : ''}</div>
        </div>
      `;
    });
    return html;
  },

  filterParents(key) {
    const parents = DB.getByClass('parents');
    const filtered = key ? parents.filter(p => p.studentName.includes(key)) : parents;
    const list = document.getElementById('parentsList');
    if (list) {
      list.innerHTML = filtered.map(p => `
        <div class="list-item" onclick="CommunicationPage.showParentDetail('${p.id}')">
          <div class="list-avatar" style="background:#dbeafe;color:#1e40af;">👨‍👩‍👧</div>
          <div class="list-content">
            <div class="list-title">${p.studentName} 家长</div>
            <div class="list-subtitle">${p.fatherName || ''} ${p.fatherPhone || ''} | ${p.motherName || ''}</div>
          </div>
          <div class="list-action">›</div>
        </div>
      `).join('') || Utils.emptyState('🔍', '未找到');
    }
  },

  showParentDetail(id) {
    const parent = (DB.get('parents') || []).find(p => p.id === id);
    if (!parent) return;
    Utils.showModal('家长详情', `
      <div class="card">
        <div style="font-weight:700;font-size:16px;">${parent.studentName} 家长</div>
        <div style="display:grid;gap:8px;margin-top:12px;font-size:14px;">
          <div><span style="color:var(--gray-500);">父亲：</span>${parent.fatherName || '-'} ${parent.fatherPhone || ''}</div>
          <div><span style="color:var(--gray-500);">母亲：</span>${parent.motherName || '-'} ${parent.motherPhone || ''}</div>
          <div><span style="color:var(--gray-500);">家庭住址：</span>${parent.address || '-'}</div>
          <div><span style="color:var(--gray-500);">职业：</span>${parent.work || '-'}</div>
          <div><span style="color:var(--gray-500);">沟通偏好：</span>${parent.communicationPref || '微信'}</div>
          <div><span style="color:var(--gray-500);">备注：</span>${parent.note || '-'}</div>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">关闭</button>
      <button class="btn btn-outline" style="flex:1;" onclick="copyParentPhone('${parent.fatherPhone || parent.motherPhone || ''}')">📞 复制电话</button>
      <button class="btn btn-danger" style="flex:1;" onclick="deleteParent('${id}')">🗑 删除</button>
    `);
  },

  showVisitDetail(id) {
    const visit = (DB.get('homeVisits') || []).find(v => v.id === id);
    if (!visit) return;
    Utils.showModal('家访详情', `
      <div class="card">
        <div style="font-weight:700;font-size:16px;">${visit.studentName}</div>
        <div style="display:grid;gap:8px;margin-top:12px;font-size:14px;">
          <div><span style="color:var(--gray-500);">日期：</span>${visit.date}</div>
          <div><span style="color:var(--gray-500);">地点：</span>${visit.location || '家中'}</div>
          <div><span style="color:var(--gray-500);">目的：</span>${visit.purpose || ''}</div>
          <div><span style="color:var(--gray-500);">内容：</span>${visit.content}</div>
          ${visit.result ? `<div><span style="color:var(--gray-500);">效果：</span>${visit.result}</div>` : ''}
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">关闭</button>
      <button class="btn btn-danger" style="flex:1;" onclick="deleteVisit('${id}')">🗑 删除</button>
    `);
  },

  showMeetingDetail(id) {
    const meeting = (DB.get('parentMeetings') || []).find(m => m.id === id);
    if (!meeting) return;
    Utils.showModal('家长会详情', `
      <div class="card">
        <div style="font-weight:700;font-size:16px;">${meeting.title}</div>
        <div style="display:grid;gap:8px;margin-top:12px;font-size:14px;">
          <div><span style="color:var(--gray-500);">日期：</span>${meeting.date}</div>
          <div><span style="color:var(--gray-500);">地点：</span>${meeting.location || ''}</div>
          <div><span style="color:var(--gray-500);">出席情况：</span>${meeting.attendance || ''}</div>
          <div><span style="color:var(--gray-500);">内容：</span>${meeting.content}</div>
          ${meeting.summary ? `<div><span style="color:var(--gray-500);">总结：</span>${meeting.summary}</div>` : ''}
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">关闭</button>
      <button class="btn btn-danger" style="flex:1;" onclick="deleteMeeting('${id}')">🗑 删除</button>
    `);
  },

  showNoticeDetail(id) {
    const notice = (DB.get('groupNotices') || []).find(n => n.id === id);
    if (!notice) return;
    Utils.showModal('通知详情', `
      <div class="card">
        <div style="font-weight:700;font-size:16px;">${notice.title}</div>
        <div style="display:grid;gap:8px;margin-top:12px;font-size:14px;">
          <div><span style="color:var(--gray-500);">日期：</span>${notice.date}</div>
          <div><span style="color:var(--gray-500);">类型：</span><span class="tag tag-${notice.type === '紧急' ? 'danger' : notice.type === '重要' ? 'warning' : 'success'}">${notice.type}</span></div>
          <div style="margin-top:8px;line-height:1.8;">${notice.content}</div>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">关闭</button>
      <button class="btn btn-outline" style="flex:1;" onclick="copyNotice('${id}')">📋 复制内容</button>
      <button class="btn btn-danger" style="flex:1;" onclick="deleteNotice('${id}')">🗑 删除</button>
    `);
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.render();
  }
};

function copyParentPhone(phone) {
  if (!phone) {
    Utils.toast('无电话号码', 'warning');
    return;
  }
  navigator.clipboard.writeText(phone).then(() => {
    Utils.toast('电话已复制', 'success');
  }).catch(() => {
    Utils.toast(phone, 'info');
  });
}

function copyNotice(id) {
  const notice = (DB.get('groupNotices') || []).find(n => n.id === id);
  if (!notice) return;
  const text = `${notice.title}\n\n${notice.content}`;
  navigator.clipboard.writeText(text).then(() => {
    Utils.toast('已复制到剪贴板', 'success');
  }).catch(() => {
    Utils.toast('复制失败，请手动选择', 'error');
  });
}

// 添加家长
function showParentModal(id) {
  const parent = id ? (DB.get('parents') || []).find(p => p.id === id) : null;
  const isEdit = !!parent;
  const students = DB.getByClass('students');

  Utils.showModal(isEdit ? '编辑家长' : '添加家长', `
    <div class="form-group">
      <label class="form-label">学生 *</label>
      <select class="form-select" id="parStudent">
        ${students.map(s => `<option value="${s.id}" ${parent?.studentId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">父亲姓名</label>
        <input class="form-input" id="parFatherName" value="${parent?.fatherName || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">父亲电话</label>
        <input class="form-input" id="parFatherPhone" value="${parent?.fatherPhone || ''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">母亲姓名</label>
        <input class="form-input" id="parMotherName" value="${parent?.motherName || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">母亲电话</label>
        <input class="form-input" id="parMotherPhone" value="${parent?.motherPhone || ''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">家庭住址</label>
      <input class="form-input" id="parAddress" value="${parent?.address || ''}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">职业</label>
        <input class="form-input" id="parWork" value="${parent?.work || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">沟通偏好</label>
        <select class="form-select" id="parPref">
          <option value="微信" ${parent?.communicationPref === '微信' ? 'selected' : ''}>微信</option>
          <option value="电话" ${parent?.communicationPref === '电话' ? 'selected' : ''}>电话</option>
          <option value="面谈" ${parent?.communicationPref === '面谈' ? 'selected' : ''}>面谈</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">备注</label>
      <textarea class="form-textarea" id="parNote">${parent?.note || ''}</textarea>
    </div>
  `, `
    <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
    <button class="btn btn-primary" style="flex:1;" onclick="saveParent(${isEdit ? `'${id}'` : 'null'})">保存</button>
  `);
}

function saveParent(id) {
  const studentId = document.getElementById('parStudent').value;
  const student = (DB.get('students') || []).find(s => s.id === studentId);
  if (!student) {
    Utils.toast('请选择学生', 'error');
    return;
  }
  const data = {
    studentId: studentId,
    studentName: student.name,
    fatherName: document.getElementById('parFatherName').value.trim(),
    fatherPhone: document.getElementById('parFatherPhone').value.trim(),
    motherName: document.getElementById('parMotherName').value.trim(),
    motherPhone: document.getElementById('parMotherPhone').value.trim(),
    address: document.getElementById('parAddress').value.trim(),
    work: document.getElementById('parWork').value.trim(),
    communicationPref: document.getElementById('parPref').value,
    note: document.getElementById('parNote').value.trim()
  };
  if (id) {
    DB.update('parents', id, data);
  } else {
    DB.add('parents', data);
  }
  Utils.closeModal();
  CommunicationPage.render();
  Utils.toast('保存成功', 'success');
}

function deleteParent(id) {
  Utils.confirm('确定要删除此家长信息吗？', () => {
    DB.delete('parents', id);
    Utils.closeModal();
    CommunicationPage.render();
    Utils.toast('已删除', 'success');
  });
}

// 家访记录
function showHomeVisitModal(id) {
  const visit = id ? (DB.get('homeVisits') || []).find(v => v.id === id) : null;
  const isEdit = !!visit;
  const students = DB.getByClass('students');

  Utils.showModal(isEdit ? '编辑家访' : '添加家访记录', `
    <div class="form-group">
      <label class="form-label">学生 *</label>
      <select class="form-select" id="hvStudent">
        ${students.map(s => `<option value="${s.id}" ${visit?.studentId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">日期</label>
        <input class="form-input" id="hvDate" type="date" value="${visit?.date || Utils.today()}">
      </div>
      <div class="form-group">
        <label class="form-label">地点</label>
        <input class="form-input" id="hvLocation" value="${visit?.location || '家中'}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">家访目的</label>
      <input class="form-input" id="hvPurpose" value="${visit?.purpose || ''}" placeholder="如：了解家庭情况">
    </div>
    <div class="form-group">
      <label class="form-label">家访内容 *</label>
      <textarea class="form-textarea" id="hvContent" style="min-height:100px;">${visit?.content || ''}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">效果/结果</label>
      <textarea class="form-textarea" id="hvResult">${visit?.result || ''}</textarea>
    </div>
  `, `
    <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
    <button class="btn btn-primary" style="flex:1;" onclick="saveHomeVisit(${isEdit ? `'${id}'` : 'null'})">保存</button>
  `);
}

function saveHomeVisit(id) {
  const studentId = document.getElementById('hvStudent').value;
  const student = (DB.get('students') || []).find(s => s.id === studentId);
  const content = document.getElementById('hvContent').value.trim();
  if (!content) {
    Utils.toast('请输入家访内容', 'error');
    return;
  }
  const data = {
    studentId: studentId,
    studentName: student?.name || '',
    date: document.getElementById('hvDate').value,
    location: document.getElementById('hvLocation').value.trim(),
    purpose: document.getElementById('hvPurpose').value.trim(),
    content: content,
    result: document.getElementById('hvResult').value.trim()
  };
  if (id) DB.update('homeVisits', id, data);
  else DB.add('homeVisits', data);
  Utils.closeModal();
  CommunicationPage.render();
  Utils.toast('保存成功', 'success');
}

function deleteVisit(id) {
  Utils.confirm('确定要删除此记录吗？', () => {
    DB.delete('homeVisits', id);
    Utils.closeModal();
    CommunicationPage.render();
    Utils.toast('已删除', 'success');
  });
}

// 家长会
function showMeetingModal() {
  Utils.showModal('添加家长会', `
    <div class="form-group">
      <label class="form-label">标题 *</label>
      <input class="form-input" id="pmTitle" placeholder="如：期中家长会">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">日期</label>
        <input class="form-input" id="pmDate" type="date" value="${Utils.today()}">
      </div>
      <div class="form-group">
        <label class="form-label">地点</label>
        <input class="form-input" id="pmLocation" value="教室">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">出席情况</label>
      <input class="form-input" id="pmAttendance" placeholder="如：应到35人，实到33人">
    </div>
    <div class="form-group">
      <label class="form-label">会议内容 *</label>
      <textarea class="form-textarea" id="pmContent" style="min-height:100px;"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">总结</label>
      <textarea class="form-textarea" id="pmSummary"></textarea>
    </div>
  `, `
    <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
    <button class="btn btn-primary" style="flex:1;" onclick="saveMeeting()">保存</button>
  `);
}

function saveMeeting() {
  const title = document.getElementById('pmTitle').value.trim();
  if (!title) {
    Utils.toast('请输入标题', 'error');
    return;
  }
  DB.add('parentMeetings', {
    title: title,
    date: document.getElementById('pmDate').value,
    location: document.getElementById('pmLocation').value.trim(),
    attendance: document.getElementById('pmAttendance').value.trim(),
    content: document.getElementById('pmContent').value.trim(),
    summary: document.getElementById('pmSummary').value.trim()
  });
  Utils.closeModal();
  CommunicationPage.render();
  Utils.toast('保存成功', 'success');
}

function deleteMeeting(id) {
  Utils.confirm('确定要删除吗？', () => {
    DB.delete('parentMeetings', id);
    Utils.closeModal();
    CommunicationPage.render();
    Utils.toast('已删除', 'success');
  });
}

// 群通知
function showNoticeModal() {
  Utils.showModal('发布群通知', `
    <div class="form-group">
      <label class="form-label">标题 *</label>
      <input class="form-input" id="ntTitle" placeholder="通知标题">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">日期</label>
        <input class="form-input" id="ntDate" type="date" value="${Utils.today()}">
      </div>
      <div class="form-group">
        <label class="form-label">类型</label>
        <select class="form-select" id="ntType">
          <option value="普通">普通</option>
          <option value="重要">重要</option>
          <option value="紧急">紧急</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">通知内容 *</label>
      <textarea class="form-textarea" id="ntContent" style="min-height:120px;" placeholder="通知详细内容..."></textarea>
    </div>
  `, `
    <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
    <button class="btn btn-primary" style="flex:1;" onclick="saveNotice()">保存</button>
  `);
}

function saveNotice() {
  const title = document.getElementById('ntTitle').value.trim();
  if (!title) {
    Utils.toast('请输入标题', 'error');
    return;
  }
  DB.add('groupNotices', {
    title: title,
    date: document.getElementById('ntDate').value,
    type: document.getElementById('ntType').value,
    content: document.getElementById('ntContent').value.trim()
  });
  Utils.closeModal();
  CommunicationPage.render();
  Utils.toast('通知已保存', 'success');
}

function deleteNotice(id) {
  Utils.confirm('确定要删除吗？', () => {
    DB.delete('groupNotices', id);
    Utils.closeModal();
    CommunicationPage.render();
    Utils.toast('已删除', 'success');
  });
}
