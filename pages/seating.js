/**
 * 座位安排页面
 * 模型：三人一桌（每桌最多 3 人），全班分成若干组（默认 3 组），组与组之间有过道。
 * 交互：基于 Pointer Events 的拖拽（鼠标 / 触摸通用），并保留点击选人 → 点击课桌放置的兜底方式。
 */
const SeatingPage = {
  groups: 3,          // 大组数（横向 3 个大组）
  rowsPerGroup: 7,    // 全班纵向 7 行（每个大组 7 行）
  desksPerRow: 3,     // 每个大组横向 3 列（课桌）
  perDesk: 3,         // 每桌人数（三人一桌）
  layoutVersion: 2,   // 布局规格版本：变更后自动重置为“7 行 × 3 列 × 3 组”
  layout: [],         // [{ id, name, desks: [{ id, row, col, students: [{studentId, studentName}] }] }]
  mode: 'view',       // view / edit
  placingStudent: null, // 点击放置模式下选中的学生 {studentId, name, source, gi, di}
  drag: null,         // 当前拖拽状态
  _bound: false,

  /* ---------------- 渲染 ---------------- */
  render() {
    this.initDragBinding();
    this.load();

    let html = `
      <div class="page-title">🪑 座位安排</div>
      <div class="page-subtitle">${this.rowsPerGroup} 行 · ${this.groups} 大组 · 三人一桌 · 拖拽排座</div>
    `;

    html += `
      <div class="toolbar">
        <button class="btn btn-primary btn-sm" onclick="SeatingPage.toggleEdit()">${this.mode === 'edit' ? '✓ 完成编辑' : '✏️ 编辑座位'}</button>
        <button class="btn btn-outline btn-sm" onclick="SeatingPage.autoArrange()">🤖 自动排座</button>
        <button class="btn btn-outline btn-sm" onclick="SeatingPage.exportImage()">📷 导出打印</button>
        <button class="btn btn-outline btn-sm" onclick="SeatingPage.showSettings()">⚙️ 设置</button>
      </div>
    `;

    if (this.mode === 'edit') {
      html += `<div class="seat-hint">💡 拖动学生卡片到课桌即可排座；也可先点选学生、再点课桌放置。点课桌上的 ✕ 可移出。</div>`;
    }

    html += this.renderStats();
    html += this.renderGroups();
    if (this.mode === 'edit') html += this.renderRoster();

    document.getElementById('mainContent').innerHTML = html;
  },

  renderStats() {
    const students = DB.getByClass('students');
    const total = students.length;
    let assigned = 0;
    this.layout.forEach(g => g.desks.forEach(d => assigned += d.students.length));
    const deskCount = this.groups * this.rowsPerGroup * this.desksPerRow;
    const capacity = deskCount * this.perDesk;
    return `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-value">${total}</div><div class="stat-label">班级人数</div></div>
        <div class="stat-card success"><div class="stat-value">${assigned}</div><div class="stat-label">已就座</div></div>
        <div class="stat-card warning"><div class="stat-value">${deskCount}</div><div class="stat-label">课桌数</div></div>
        <div class="stat-card info"><div class="stat-value">${capacity - assigned}</div><div class="stat-label">空位</div></div>
      </div>
    `;
  },

  renderGroups() {
    let html = '<div class="card"><div class="card-header"><div class="card-title">🪑 教室座位图</div>';
    html += `<span style="font-size:12px;color:var(--gray-500);">讲台在前 ↓</span></div>`;
    html += '<div class="seating-podium">📋 讲台 / 黑板</div>';
    html += '<div class="seating-groups">';

    // 视觉顺序：第一组在最右，依次往左为第二、三组（data-gi 仍用真实索引，保证拖拽/点击正确）
    const order = this.layout.map((g, i) => i).reverse();
    order.forEach((gi, k) => {
      const group = this.layout[gi];
      let gHtml = `
        <div class="seating-group">
          <div class="group-header">${group.name} <span class="group-count">${this.groupCount(gi)}人</span></div>
          <div class="group-desks" style="grid-template-columns:repeat(${this.desksPerRow},1fr);">
      `;
      group.desks.forEach((desk, di) => {
        const isFull = desk.students.length >= this.perDesk;
        const placingHere = this.placingStudent ? ' placing' : '';
        gHtml += `<div class="desk${isFull ? ' full' : ''}${placingHere}" data-drop="desk" data-gi="${gi}" data-di="${di}" ${this.mode === 'edit' ? `onclick="SeatingPage.tapDesk(${gi},${di})"` : ''}>`;
        gHtml += '<div class="desk-chips">';
        desk.students.forEach(s => {
          gHtml += this.chipHtml(s.studentName, s.studentId, 'desk', gi, di, true);
        });
        // 空位占位
        for (let kk = desk.students.length; kk < this.perDesk; kk++) {
          gHtml += `<div class="desk-slot"></div>`;
        }
        gHtml += '</div></div>';
      });
      gHtml += '</div></div>';
      html += gHtml;
      // 组间过道（视觉最后一组后不加）
      if (k < order.length - 1) {
        html += `<div class="aisle"><span>过道</span></div>`;
      }
    });

    html += '</div></div>';
    return html;
  },

  chipHtml(name, studentId, source, gi, di, removable) {
    const color = Utils.getColorFromName(name);
    const sel = this.placingStudent && this.placingStudent.studentId === studentId ? ' selected' : '';
    let h = `<div class="desk-chip${sel}" data-drag="student" data-student-id="${studentId}" data-name="${Utils.escapeHtml(name)}" data-source="${source}" ${gi != null ? `data-gi="${gi}"` : ''} ${di != null ? `data-di="${di}"` : ''} style="--chip:${color};">`;
    h += `<span class="desk-chip-name">${Utils.escapeHtml(name)}</span>`;
    if (removable && this.mode === 'edit') {
      h += `<button class="desk-chip-remove" onclick="SeatingPage.confirmRemove('${studentId}')">✕</button>`;
    }
    h += '</div>';
    return h;
  },

  renderRoster() {
    const arranged = new Set();
    this.layout.forEach(g => g.desks.forEach(d => d.students.forEach(s => arranged.add(s.studentId))));
    const students = DB.getByClass('students').filter(s => !arranged.has(s.id));
    let html = '<div class="card"><div class="card-header"><div class="card-title">📋 未安排学生（' + students.length + '）</div>';
    html += `<span style="font-size:12px;color:var(--gray-500);">拖到课桌或点选后放置</span></div>`;
    if (students.length === 0) {
      html += '<div style="text-align:center;color:var(--gray-400);padding:12px;">全部学生已就座 🎉</div>';
    } else {
      html += '<div class="roster-grid" data-drop="roster">';
      students.forEach(s => {
        html += this.chipHtml(s.name, s.id, 'roster', null, null, false);
      });
      html += '</div>';
    }
    html += '</div>';
    return html;
  },

  groupCount(gi) {
    let n = 0;
    this.layout[gi].desks.forEach(d => n += d.students.length);
    return n;
  },

  /* ---------------- 数据加载 / 构建 ---------------- */
  load() {
    let data = [];
    try { data = DB.getByClass('seating'); } catch (e) { data = []; }
    if (data.length > 0) {
      const rec = data[0];
      if (rec.layout && Array.isArray(rec.layout) && rec.layout[0] && Array.isArray(rec.layout[0].desks)) {
        if (rec.version === this.layoutVersion) {
          // 同版本：复用已保存布局
          this.layout = rec.layout;
          this.groups = rec.groups || this.layout.length;
          this.rowsPerGroup = rec.rowsPerGroup || (this.layout[0] ? this.layout[0].desks.length : 7);
          this.desksPerRow = rec.desksPerRow || 3;
          this.perDesk = rec.perDesk || 3;
        } else {
          // 布局规格升级（版本不一致）→ 重置为“7 行 × 3 列 × 3 组”
          this.buildDefaultLayout();
          this.saveLayout();
        }
      } else if (rec.layout && Array.isArray(rec.layout)) {
        // 旧版 {row,col,studentId,studentName} → 迁移
        this.migrateOld(rec.layout);
      } else {
        this.buildDefaultLayout();
      }
    } else {
      this.buildDefaultLayout();
    }
  },

  defaultOpts() {
    // 固定布局：全班 7 行，横向 3 大组，每组 3 列（课桌），每桌 3 人
    return { groups: 3, rowsPerGroup: 7, desksPerRow: 3, perDesk: 3 };
  },

  buildDefaultLayout(opts) {
    opts = opts || this.defaultOpts();
    this.groups = opts.groups;
    this.rowsPerGroup = opts.rowsPerGroup;
    this.desksPerRow = opts.desksPerRow;
    this.perDesk = opts.perDesk;
    this.layout = [];
    for (let gi = 0; gi < this.groups; gi++) {
      const group = { id: 'g' + (gi + 1), name: '第' + ['一', '二', '三', '四', '五', '六'][gi] + '组', desks: [] };
      let idx = 0;
      for (let r = 1; r <= this.rowsPerGroup; r++) {
        for (let c = 1; c <= this.desksPerRow; c++) {
          group.desks.push({ id: 'g' + (gi + 1) + '_d' + (idx + 1), row: r, col: c, students: [] });
          idx++;
        }
      }
      this.layout.push(group);
    }
  },

  migrateOld(oldArr) {
    // 旧版按 row/col 排好的学生，依次塞进新版课桌（每组每排 desksPerRow，三人一桌）
    this.buildDefaultLayout();
    const students = oldArr
      .map(s => ({ studentId: s.studentId, studentName: s.studentName }))
      .filter(s => s.studentId);
    let i = 0;
    outer:
    for (let gi = 0; gi < this.layout.length; gi++) {
      for (let di = 0; di < this.layout[gi].desks.length; di++) {
        const desk = this.layout[gi].desks[di];
        while (desk.students.length < this.perDesk && i < students.length) {
          desk.students.push(students[i]); i++;
        }
        if (i >= students.length) break outer;
      }
    }
  },

  /* ---------------- 拖拽（Pointer Events） ---------------- */
  initDragBinding() {
    if (this._bound) return;
    this._bound = true;
    document.addEventListener('pointerdown', (e) => this.onPointerDown(e));
  },

  onPointerDown(e) {
    if (this.mode !== 'edit') return;
    const chip = e.target.closest('[data-drag="student"]');
    if (!chip) return;
    if (e.target.closest('.desk-chip-remove')) return; // 点删除按钮不触发拖拽
    e.preventDefault();
    const rect = chip.getBoundingClientRect();
    this.drag = {
      studentId: chip.dataset.studentId,
      name: chip.dataset.name,
      source: chip.dataset.source,
      gi: chip.dataset.gi !== undefined && chip.dataset.gi !== '' ? +chip.dataset.gi : null,
      di: chip.dataset.di !== undefined && chip.dataset.di !== '' ? +chip.dataset.di : null,
      startX: e.clientX, startY: e.clientY,
      offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top,
      moved: false, ghost: null, targetEl: null
    };
    this._onMove = (ev) => this.onPointerMove(ev);
    this._onUp = (ev) => this.onPointerUp(ev);
    window.addEventListener('pointermove', this._onMove);
    window.addEventListener('pointerup', this._onUp);
    window.addEventListener('pointercancel', this._onUp);
  },

  onPointerMove(e) {
    if (!this.drag) return;
    const dx = e.clientX - this.drag.startX;
    const dy = e.clientY - this.drag.startY;
    if (!this.drag.moved && Math.hypot(dx, dy) < 6) return;
    this.drag.moved = true;
    if (!this.drag.ghost) this.createGhost(e);
    this.moveGhost(e.clientX, e.clientY);
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const drop = el && el.closest('[data-drop]');
    if (this.drag.targetEl && this.drag.targetEl !== drop) this.drag.targetEl.classList.remove('drag-over');
    this.drag.targetEl = drop;
    if (drop) drop.classList.add('drag-over');
  },

  createGhost(e) {
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.textContent = this.drag.name;
    ghost.style.left = e.clientX + 'px';
    ghost.style.top = e.clientY + 'px';
    document.body.appendChild(ghost);
    this.drag.ghost = ghost;
  },

  moveGhost(x, y) {
    const g = this.drag.ghost;
    if (!g) return;
    g.style.left = (x - this.drag.offsetX + g.offsetWidth / 2) + 'px';
    g.style.top = (y - this.drag.offsetY + g.offsetHeight / 2) + 'px';
  },

  onPointerUp(e) {
    window.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('pointerup', this._onUp);
    window.removeEventListener('pointercancel', this._onUp);
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    if (d.targetEl) d.targetEl.classList.remove('drag-over');
    if (d.ghost) d.ghost.remove();

    if (d.moved) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const drop = el && el.closest('[data-drop]');
      if (drop && drop.dataset.drop === 'desk') {
        this.moveStudentToDesk(d.studentId, +drop.dataset.gi, +drop.dataset.di, d.source, d.gi, d.di);
      } else if (drop && drop.dataset.drop === 'roster') {
        this.unassign(d.studentId);
      }
    } else {
      // 视为点击：选中学生用于“点选后放置”
      this.handleTap(d);
    }
  },

  handleTap(d) {
    if (this.placingStudent && this.placingStudent.studentId === d.studentId) {
      this.placingStudent = null;
      this.render();
      return;
    }
    this.placingStudent = { studentId: d.studentId, name: d.name, source: d.source, gi: d.gi, di: d.di };
    Utils.toast('已选中「' + d.name + '」，点击课桌放置', 'info');
    this.render();
  },

  tapDesk(gi, di) {
    if (this.mode !== 'edit') return;
    if (!this.placingStudent) return;
    const p = this.placingStudent;
    this.moveStudentToDesk(p.studentId, gi, di, p.source, p.gi, p.di);
    this.placingStudent = null;
  },

  /* ---------------- 座位操作 ---------------- */
  findStudent(id) {
    return DB.getByClass('students').find(s => s.id === id);
  },

  findStudentLocation(id) {
    for (let gi = 0; gi < this.layout.length; gi++) {
      for (let di = 0; di < this.layout[gi].desks.length; di++) {
        if (this.layout[gi].desks[di].students.some(s => s.studentId === id)) {
          return { gi, di };
        }
      }
    }
    return null;
  },

  moveStudentToDesk(studentId, gi, di, source, fromGi, fromDi) {
    const desk = this.layout[gi].desks[di];
    if (desk.students.some(s => s.studentId === studentId)) { this.render(); return; }
    if (desk.students.length >= this.perDesk) {
      Utils.toast('该课桌最多坐 ' + this.perDesk + ' 人，已满', 'warning');
      this.render();
      return;
    }
    // 先从原位置移除
    if (source === 'desk' && fromGi != null) {
      this.layout[fromGi].desks[fromDi].students =
        this.layout[fromGi].desks[fromDi].students.filter(s => s.studentId !== studentId);
    }
    const student = this.findStudent(studentId);
    desk.students.push({ studentId, studentName: student ? student.name : '' });
    this.saveLayout();
    this.render();
    Utils.toast('已就座', 'success');
  },

  unassign(studentId) {
    const loc = this.findStudentLocation(studentId);
    if (loc) {
      this.layout[loc.gi].desks[loc.di].students =
        this.layout[loc.gi].desks[loc.di].students.filter(s => s.studentId !== studentId);
      this.saveLayout();
      this.render();
      Utils.toast('已移出座位', 'info');
    }
  },

  confirmRemove(studentId) {
    const s = this.findStudent(studentId);
    const name = s ? s.name : '该学生';
    Utils.confirm('确定让「' + name + '」离开当前座位吗？', () => this.unassign(studentId));
  },

  toggleEdit() {
    this.mode = this.mode === 'edit' ? 'view' : 'edit';
    this.placingStudent = null;
    this.render();
  },

  autoArrange() {
    const students = DB.getByClass('students');
    if (students.length === 0) { Utils.toast('暂无学生', 'warning'); return; }
    Utils.confirm('将按学号自动把 ' + students.length + ' 名学生排进当前 ' + this.groups + ' 组课桌（三人一桌），确定继续？', () => {
      this.buildDefaultLayout({ groups: this.groups, rowsPerGroup: this.rowsPerGroup, desksPerRow: this.desksPerRow, perDesk: this.perDesk });
      const sorted = [...students].sort((a, b) => String(a.studentNo || '').localeCompare(String(b.studentNo || '')));
      let i = 0;
      outer:
      for (let gi = 0; gi < this.layout.length; gi++) {
        for (let di = 0; di < this.layout[gi].desks.length; di++) {
          const desk = this.layout[gi].desks[di];
          while (desk.students.length < this.perDesk && i < sorted.length) {
            desk.students.push({ studentId: sorted[i].id, studentName: sorted[i].name });
            i++;
          }
          if (i >= sorted.length) break outer;
        }
      }
      this.saveLayout();
      this.render();
      Utils.toast('已自动排座', 'success');
    });
  },

  saveLayout() {
    const existing = DB.getByClass('seating');
    const data = {
      version: this.layoutVersion,
      groups: this.groups,
      rowsPerGroup: this.rowsPerGroup,
      desksPerRow: this.desksPerRow,
      perDesk: this.perDesk,
      layout: this.layout,
      updatedAt: new Date().toISOString()
    };
    if (existing.length > 0) {
      DB.update('seating', existing[0].id, data);
    } else {
      DB.add('seating', data);
    }
  },

  showSettings() {
    Utils.showModal('座位设置', `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">组数</label>
          <input class="form-input" id="seatGroups" type="number" value="${this.groups}" min="1" max="6">
        </div>
        <div class="form-group">
          <label class="form-label">每组排数</label>
          <input class="form-input" id="seatRows" type="number" value="${this.rowsPerGroup}" min="1" max="12">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">每排课桌数</label>
          <input class="form-input" id="seatCols" type="number" value="${this.desksPerRow}" min="1" max="8">
        </div>
        <div class="form-group">
          <label class="form-label">每桌人数</label>
          <input class="form-input" id="seatPer" type="number" value="${this.perDesk}" min="1" max="6">
        </div>
      </div>
      <p style="font-size:12px;color:var(--gray-500);margin-top:8px;">调整后会保留已安排的座位（按原顺序重新填充）。</p>
    `, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
      <button class="btn btn-primary" style="flex:1;" onclick="SeatingPage.applySettings()">应用</button>
    `);
  },

  applySettings() {
    const groups = parseInt(document.getElementById('seatGroups').value);
    const rows = parseInt(document.getElementById('seatRows').value);
    const cols = parseInt(document.getElementById('seatCols').value);
    const per = parseInt(document.getElementById('seatPer').value);
    if (!groups || !rows || !cols || !per || groups > 6 || rows > 12 || cols > 8 || per > 6) {
      Utils.toast('请输入合理数值', 'error');
      return;
    }
    // 收集当前已安排学生（按原顺序），重新填充到新结构
    const assigned = [];
    this.layout.forEach(g => g.desks.forEach(d => d.students.forEach(s => assigned.push(s))));
    this.groups = groups; this.rowsPerGroup = rows; this.desksPerRow = cols; this.perDesk = per;
    this.buildDefaultLayout({ groups, rowsPerGroup: rows, desksPerRow: cols, perDesk: per });
    let i = 0;
    outer:
    for (let gi = 0; gi < this.layout.length; gi++) {
      for (let di = 0; di < this.layout[gi].desks.length; di++) {
        const desk = this.layout[gi].desks[di];
        while (desk.students.length < this.perDesk && i < assigned.length) {
          desk.students.push(assigned[i]); i++;
        }
        if (i >= assigned.length) break outer;
      }
    }
    this.saveLayout();
    Utils.closeModal();
    this.render();
    Utils.toast('设置已更新', 'success');
  },

  exportImage() {
    const cls = DB.getCurrentClass();
    const dateStr = Utils.today();
    let body = '';
    // 与界面一致：第一组在最右，依次往左（仅反转渲染顺序，索引仍用真实值）
    const order = this.layout.map((g, i) => i).reverse();
    order.forEach((gi, k) => {
      const group = this.layout[gi];
      let table = `<table class="exp-table"><caption>${group.name}（${this.groupCount(gi)}人）</caption>`;
      for (let r = 0; r < this.rowsPerGroup; r++) {
        table += '<tr>';
        for (let c = 0; c < this.desksPerRow; c++) {
          const desk = group.desks[r * this.desksPerRow + c];
          if (!desk) { table += '<td></td>'; continue; }
          const names = desk.students.length
            ? desk.students.map(s => Utils.escapeHtml(s.studentName)).join(' / ')
            : '空';
          table += `<td>${names}</td>`;
        }
        table += '</tr>';
      }
      table += '</table>';
      body += `<div class="exp-group">${table}</div>`;
      if (k < order.length - 1) body += '<div class="exp-aisle">过道</div>';
    });

    const html = `
      <div class="exp-wrap">
        <h2>${Utils.escapeHtml(cls.name)} 座位表</h2>
        <p class="exp-date">生成日期：${dateStr} ｜ ${this.groups} 组 · 三人一桌</p>
        <div class="exp-podium">📋 讲台 / 黑板</div>
        <div class="exp-groups">${body}</div>
      </div>
    `;

    const style = `
      <style>
        body{font-family:'Microsoft YaHei',sans-serif;padding:24px;}
        .exp-wrap{max-width:900px;margin:0 auto;}
        h2{text-align:center;margin:0 0 6px;}
        .exp-date{text-align:center;color:#666;margin:0 0 16px;font-size:14px;}
        .exp-podium{text-align:center;padding:10px;background:#e5e7eb;border-radius:8px;margin-bottom:16px;}
        .exp-groups{display:flex;align-items:flex-start;gap:8px;justify-content:center;flex-wrap:wrap;}
        .exp-group{flex:1;min-width:200px;}
        .exp-aisle{writing-mode:vertical-rl;color:#9ca3af;font-size:13px;padding:0 4px;border-left:2px dashed #d1d5db;border-right:2px dashed #d1d5db;}
        .exp-table{width:100%;border-collapse:collapse;}
        .exp-table caption{font-weight:700;padding:6px;background:#eef2ff;color:#4f46e5;}
        .exp-table td{border:2px solid #4f46e5;height:54px;text-align:center;vertical-align:middle;font-size:14px;font-weight:600;padding:4px;}
        @media print{.noprint{display:none;}}
      </style>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<html><head><title>${Utils.escapeHtml(cls.name)}座位表</title>${style}</head><body>${html}
      <div class="noprint" style="text-align:center;margin-top:20px;">
        <button onclick="window.print()" style="padding:10px 20px;font-size:14px;cursor:pointer;">打印 / 保存为PDF</button>
      </div></body></html>`);
    printWindow.document.close();
    Utils.toast('已打开打印窗口，可保存为PDF', 'success');
  }
};
