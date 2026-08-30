/**
 * 待办备忘页面
 */
const TodoPage = {
  currentTab: 'todo',

  render() {
    let html = `
      <div class="page-title">✅ 待办备忘</div>
      <div class="page-subtitle">待办事项 · 笔记 · 重要提醒</div>
    `;

    html += `
      <div class="toolbar">
        <button class="btn btn-primary btn-sm" onclick="showTodoModal()" id="addTodoBtn">+ 添加待办</button>
        <button class="btn btn-outline btn-sm" onclick="showNoteModal()" id="addNoteBtn">+ 添加笔记</button>
        <button class="btn btn-outline btn-sm" onclick="showReminderModal()" id="addReminderBtn">+ 添加提醒</button>
      </div>
    `;

    html += `
      <div class="segment-control">
        <div class="segment-item ${this.currentTab === 'todo' ? 'active' : ''}" onclick="TodoPage.switchTab('todo')">✅ 待办</div>
        <div class="segment-item ${this.currentTab === 'notes' ? 'active' : ''}" onclick="TodoPage.switchTab('notes')">📝 笔记</div>
        <div class="segment-item ${this.currentTab === 'reminders' ? 'active' : ''}" onclick="TodoPage.switchTab('reminders')">🔔 提醒</div>
      </div>
    `;

    if (this.currentTab === 'todo') {
      html += this.renderTodos();
    } else if (this.currentTab === 'notes') {
      html += this.renderNotes();
    } else if (this.currentTab === 'reminders') {
      html += this.renderReminders();
    }

    document.getElementById('mainContent').innerHTML = html;
  },

  renderTodos() {
    const todos = DB.getByClass('todos');
    const pending = todos.filter(t => !t.completed);
    const completed = todos.filter(t => t.completed);
    const today = Utils.today();
    const overdue = pending.filter(t => t.dueDate && t.dueDate < today);

    let html = `
      <div class="stat-grid">
        <div class="stat-card danger"><div class="stat-value">${pending.length}</div><div class="stat-label">待完成</div></div>
        <div class="stat-card success"><div class="stat-value">${completed.length}</div><div class="stat-label">已完成</div></div>
        <div class="stat-card warning"><div class="stat-value">${overdue.length}</div><div class="stat-label">已逾期</div></div>
        <div class="stat-card info"><div class="stat-value">${pending.filter(t => t.dueDate === today).length}</div><div class="stat-label">今日截止</div></div>
      </div>
    `;

    if (pending.length === 0 && completed.length === 0) {
      return html + Utils.emptyState('✅', '暂无待办事项');
    }

    // 逾期
    if (overdue.length > 0) {
      html += '<div style="font-weight:700;color:var(--danger);margin-bottom:8px;font-size:13px;">🔴 已逾期</div>';
      html += this.renderTodoList(overdue);
    }

    // 待办
    const notOverdue = pending.filter(t => !t.dueDate || t.dueDate >= today);
    if (notOverdue.length > 0) {
      html += '<div style="font-weight:700;color:var(--warning);margin:12px 0 8px;font-size:13px;">🟡 待完成</div>';
      html += this.renderTodoList(notOverdue);
    }

    // 已完成
    if (completed.length > 0) {
      html += '<div style="font-weight:700;color:var(--success);margin:12px 0 8px;font-size:13px;">🟢 已完成</div>';
      html += this.renderTodoList(completed);
    }

    return html;
  },

  renderTodoList(todos) {
    const sorted = [...todos].sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
    let html = '';
    sorted.forEach(t => {
      const priorityColors = { high: 'danger', medium: 'warning', low: 'gray' };
      const priorityLabels = { high: '紧急', medium: '一般', low: '低' };
      const today = Utils.today();
      const isOverdue = !t.completed && t.dueDate && t.dueDate < today;
      html += `
        <div class="card" style="padding:12px;${t.completed ? 'opacity:0.6;' : ''}">
          <div style="display:flex;align-items:flex-start;gap:10px;">
            <div onclick="toggleTodoStatus('${t.id}')" style="cursor:pointer;width:24px;height:24px;border-radius:50%;border:2px solid ${t.completed ? 'var(--success)' : 'var(--gray-300)'};background:${t.completed ? 'var(--success)' : 'transparent'};display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;flex-shrink:0;">${t.completed ? '✓' : ''}</div>
            <div style="flex:1;" onclick="showTodoModal('${t.id}')">
              <div style="font-weight:${t.completed ? '400' : '600'};text-decoration:${t.completed ? 'line-through' : 'none'};">${t.title}</div>
              ${t.description ? `<div style="font-size:12px;color:var(--gray-500);margin-top:2px;">${t.description}</div>` : ''}
              <div style="display:flex;gap:6px;margin-top:4px;">
                ${t.dueDate ? `<span class="tag tag-${isOverdue ? 'danger' : 'gray'}">${isOverdue ? '逾期' : '截止'}: ${t.dueDate}</span>` : ''}
                <span class="tag tag-${priorityColors[t.priority]}">${priorityLabels[t.priority]}</span>
              </div>
            </div>
            <button class="btn btn-sm btn-icon" style="color:var(--danger);" onclick="deleteTodo('${t.id}')">🗑</button>
          </div>
        </div>
      `;
    });
    return html;
  },

  renderNotes() {
    const notes = DB.getByClass('notes');
    if (notes.length === 0) {
      return Utils.emptyState('📝', '暂无笔记');
    }
    const sorted = [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    let html = '';
    sorted.forEach(n => {
      html += `
        <div class="card" onclick="TodoPage.showNoteDetail('${n.id}')" style="position:relative;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <div style="font-weight:600;flex:1;">${n.title || '无标题'}</div>
            <button class="btn btn-sm btn-icon" style="color:var(--gray-500);flex-shrink:0;" onclick="event.stopPropagation();showNoteModal('${n.id}')" title="编辑">✏️</button>
          </div>
          <div style="font-size:13px;color:var(--gray-600);margin-top:4px;">${n.content.substring(0, 80)}${n.content.length > 80 ? '...' : ''}</div>
          <div style="font-size:11px;color:var(--gray-400);margin-top:6px;">${Utils.formatDate(n.createdAt, 'YYYY-MM-DD HH:mm')}</div>
        </div>
      `;
    });
    return html;
  },

  renderReminders() {
    const reminders = DB.getByClass('reminders');
    const today = Utils.today();
    if (reminders.length === 0) {
      return Utils.emptyState('🔔', '暂无提醒');
    }
    const sorted = [...reminders].sort((a, b) => a.date.localeCompare(b.date));
    let html = '';
    sorted.forEach(r => {
      const days = Utils.daysBetween(today, r.date);
      const isPast = days < 0;
      const isToday = days === 0;
      const isSoon = days > 0 && days <= 3;
      const typeIcon = r.type === 'birthday' ? '🎂' : r.type === 'meeting' ? '📅' : r.type === 'deadline' ? '⏰' : '🔔';
      html += `
        <div class="reminder-item ${isToday || isPast ? 'danger' : isSoon ? '' : 'info'}">
          <div class="reminder-icon">${typeIcon}</div>
          <div class="reminder-content">
            <div class="reminder-title">${r.title}</div>
            <div class="reminder-desc">${r.date} · ${isPast ? '已过期' : isToday ? '今天' : days === 1 ? '明天' : days + '天后'}</div>
          </div>
          <button class="btn btn-sm btn-icon" style="color:var(--danger);" onclick="deleteReminder('${r.id}')">🗑</button>
        </div>
      `;
    });
    return html;
  },

  showNoteDetail(id) {
    const note = (DB.get('notes') || []).find(n => n.id === id);
    if (!note) return;
    Utils.showModal('笔记详情', `
      <div class="card">
        <div style="font-weight:700;font-size:16px;">${note.title || '无标题'}</div>
        <div style="font-size:11px;color:var(--gray-400);margin-top:4px;">${Utils.formatDate(note.createdAt, 'YYYY-MM-DD HH:mm')}${note.updatedAt && note.updatedAt > note.createdAt ? ' · ✏️ 编辑于 ' + Utils.formatDate(note.updatedAt, 'YYYY-MM-DD HH:mm') : ''}</div>
        <div style="margin-top:12px;font-size:14px;line-height:1.8;white-space:pre-wrap;">${note.content}</div>
      </div>
    `, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">关闭</button>
      <button class="btn btn-outline" style="flex:1;" onclick="editNoteFromDetail('${id}')">✏️ 编辑</button>
      <button class="btn btn-danger" style="flex:1;" onclick="deleteNote('${id}')">🗑 删除</button>
    `);
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.render();
  }
};

// 待办
function showTodoModal(id) {
  const todo = id ? (DB.get('todos') || []).find(t => t.id === id) : null;
  const isEdit = !!todo;

  Utils.showModal(isEdit ? '编辑待办' : '添加待办', `
    <div class="form-group">
      <label class="form-label">标题 *</label>
      <input class="form-input" id="todoTitle" value="${todo?.title || ''}" placeholder="待办事项">
    </div>
    <div class="form-group">
      <label class="form-label">描述</label>
      <textarea class="form-textarea" id="todoDesc">${todo?.description || ''}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">截止日期</label>
        <input class="form-input" id="todoDue" type="date" value="${todo?.dueDate || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">优先级</label>
        <select class="form-select" id="todoPriority">
          <option value="high" ${todo?.priority === 'high' ? 'selected' : ''}>紧急</option>
          <option value="medium" ${todo?.priority === 'medium' || !todo ? 'selected' : ''}>一般</option>
          <option value="low" ${todo?.priority === 'low' ? 'selected' : ''}>低</option>
        </select>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
    <button class="btn btn-primary" style="flex:1;" onclick="saveTodo(${isEdit ? `'${id}'` : 'null'})">保存</button>
  `);
}

function saveTodo(id) {
  const title = document.getElementById('todoTitle').value.trim();
  if (!title) {
    Utils.toast('请输入标题', 'error');
    return;
  }
  const data = {
    title: title,
    description: document.getElementById('todoDesc').value.trim(),
    dueDate: document.getElementById('todoDue').value,
    priority: document.getElementById('todoPriority').value,
    completed: false
  };
  if (id) {
    const existing = (DB.get('todos') || []).find(t => t.id === id);
    data.completed = existing?.completed || false;
    DB.update('todos', id, data);
  } else {
    DB.add('todos', data);
  }
  Utils.closeModal();
  TodoPage.render();
  Utils.toast('保存成功', 'success');
}

function toggleTodoStatus(id) {
  const todo = (DB.get('todos') || []).find(t => t.id === id);
  if (todo) {
    DB.update('todos', id, { completed: !todo.completed });
    TodoPage.render();
    Utils.toast(todo.completed ? '已取消完成' : '已完成', 'success');
  }
}

function deleteTodo(id) {
  DB.delete('todos', id);
  TodoPage.render();
  Utils.toast('已删除', 'success');
}

// 笔记
function showNoteModal(id) {
  const note = id ? (DB.get('notes') || []).find(n => n.id === id) : null;
  const isEdit = !!note;

  Utils.showModal(isEdit ? '编辑笔记' : '添加笔记', `
    <div class="form-group">
      <label class="form-label">标题</label>
      <input class="form-input" id="noteTitle" value="${note?.title || ''}" placeholder="笔记标题">
    </div>
    <div class="form-group">
      <label class="form-label">内容</label>
      <textarea class="form-textarea" id="noteContent" style="min-height:150px;">${note?.content || ''}</textarea>
    </div>
  `, `
    <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
    <button class="btn btn-primary" style="flex:1;" onclick="saveNote(${isEdit ? `'${id}'` : 'null'})">保存</button>
  `);
}

function saveNote(id) {
  const data = {
    title: document.getElementById('noteTitle').value.trim(),
    content: document.getElementById('noteContent').value.trim()
  };
  if (id) DB.update('notes', id, data);
  else DB.add('notes', data);
  Utils.closeModal();
  TodoPage.render();
  Utils.toast('保存成功', 'success');
}

function editNoteFromDetail(id) {
  // 先关闭详情弹窗（含 300ms 退场动画），再打开编辑弹窗，避免两个弹窗叠加
  Utils.closeModal();
  setTimeout(() => showNoteModal(id), 320);
}

function deleteNote(id) {
  Utils.confirm('确定要删除此笔记吗？', () => {
    DB.delete('notes', id);
    Utils.closeModal();
    TodoPage.render();
    Utils.toast('已删除', 'success');
  });
}

// 提醒
function showReminderModal() {
  Utils.showModal('添加提醒', `
    <div class="form-group">
      <label class="form-label">标题 *</label>
      <input class="form-input" id="rmTitle" placeholder="如：明天是张三生日">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">日期</label>
        <input class="form-input" id="rmDate" type="date" value="${Utils.today()}">
      </div>
      <div class="form-group">
        <label class="form-label">类型</label>
        <select class="form-select" id="rmType">
          <option value="general">普通</option>
          <option value="birthday">生日</option>
          <option value="meeting">会议</option>
          <option value="deadline">截止</option>
        </select>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
    <button class="btn btn-primary" style="flex:1;" onclick="saveReminder()">保存</button>
  `);
}

function saveReminder() {
  const title = document.getElementById('rmTitle').value.trim();
  if (!title) {
    Utils.toast('请输入标题', 'error');
    return;
  }
  DB.add('reminders', {
    title: title,
    date: document.getElementById('rmDate').value,
    type: document.getElementById('rmType').value
  });
  Utils.closeModal();
  TodoPage.render();
  Utils.toast('提醒已添加', 'success');
}

function deleteReminder(id) {
  DB.delete('reminders', id);
  TodoPage.render();
  Utils.toast('已删除', 'success');
}
