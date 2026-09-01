/**
 * 课程表页面
 * 支持「班级课程表 / 个人课程表」切换；
 * 上午、下午分块，含第9节课后服务；周六、周日可增删。
 */

// 节次定义：上午 1-4，下午 5-8，课后服务 9
const TT_PERIODS = [
  { no: 1, label: '第1节', part: 'morning' },
  { no: 2, label: '第2节', part: 'morning' },
  { no: 3, label: '第3节', part: 'morning' },
  { no: 4, label: '第4节', part: 'morning' },
  { no: 5, label: '第5节', part: 'afternoon' },
  { no: 6, label: '第6节', part: 'afternoon' },
  { no: 7, label: '第7节', part: 'afternoon' },
  { no: 8, label: '第8节', part: 'service' },
  { no: 9, label: '第9节', part: 'service' }
];

// 星期定义（1=周一 … 7=周日）
const TT_DAYS = [
  { idx: 1, label: '周一' },
  { idx: 2, label: '周二' },
  { idx: 3, label: '周三' },
  { idx: 4, label: '周四' },
  { idx: 5, label: '周五' },
  { idx: 6, label: '周六' },
  { idx: 7, label: '周日' }
];

const TT_SUBJECTS = ['语文', '数学', '英语', '政治', '历史', '地理', '物理', '化学', '生物',
  '体育', '音乐', '美术', '信息技术', '班会', '自习', '劳动', '心理'];

const TimetablePage = {
  scope: 'class',            // 'class' = 全班课表；'personal' = 我的课表（班主任任教）
  weekendOpen: {},           // { 6: bool, 7: bool } 周末列是否展开
  _editing: null,            // { day, period } 当前编辑的格子

  // ---- 数据访问 ----
  _key(day, period) { return day + '_' + period; },

  _all() { return DB.get('timetable') || []; },

  _record() {
    return this._all().find(r => r.classId === DB.currentClassId && r.scope === this.scope) || null;
  },

  _cells() {
    const rec = this._record();
    return rec && rec.cells ? rec.cells : {};
  },

  _saveCells(cells) {
    let list = this._all();
    let rec = list.find(r => r.classId === DB.currentClassId && r.scope === this.scope);
    if (!rec) {
      rec = { id: DB.genId(), classId: DB.currentClassId, scope: this.scope, cells: {} };
      list.push(rec);
    }
    rec.cells = cells;
    rec.updatedAt = new Date().toISOString();
    DB.set('timetable', list);
  },

  _visibleDays() {
    const days = [1, 2, 3, 4, 5];
    [6, 7].forEach(d => { if (this.weekendOpen[d]) days.push(d); });
    return days;
  },

  setScope(scope) {
    if (this.scope === scope) return;
    this.scope = scope;
    this.weekendOpen = {};   // 切换后按新数据重新初始化周末展开状态
    this.render();
  },

  // ---- 渲染 ----
  render() {
    const cls = DB.getCurrentClass();
    const cells = this._cells();

    // 初始化周末展开状态：首次渲染时，有数据则展开，无数据则折叠
    [6, 7].forEach(d => {
      const has = Object.keys(cells).some(k => k.indexOf(d + '_') === 0);
      if (this.weekendOpen[d] === undefined) this.weekendOpen[d] = has;
    });

    const visibleDays = this._visibleDays();
    const scopeText = this.scope === 'class' ? '全班课表' : '我的课表（班主任任教）';

    let html = `
      <div class="page-title">📅 课程表</div>
      <div class="page-subtitle">${Utils.escapeHtml(cls.name)} · ${scopeText}</div>
    `;

    // 控制条：模式切换 + 周末开关 + 导出
    html += `
      <div class="card tt-controls">
        <div class="tt-scope">
          <button class="tt-scope-btn ${this.scope === 'class' ? 'active' : ''}" onclick="TimetablePage.setScope('class')">班级课程表</button>
          <button class="tt-scope-btn ${this.scope === 'personal' ? 'active' : ''}" onclick="TimetablePage.setScope('personal')">个人课程表</button>
        </div>
        <div class="tt-weekend">
          <span class="tt-weekend-label">周末：</span>
          <button class="tt-chip ${this.weekendOpen[6] ? 'on' : ''}" onclick="TimetablePage.toggleWeekend(6)">周六 ${this.weekendOpen[6] ? '✓' : '＋'}</button>
          <button class="tt-chip ${this.weekendOpen[7] ? 'on' : ''}" onclick="TimetablePage.toggleWeekend(7)">周日 ${this.weekendOpen[7] ? '✓' : '＋'}</button>
        </div>
        <button class="btn btn-outline btn-sm" onclick="TimetablePage.exportWord()">⬇ 导出</button>
      </div>
    `;

    // 课表
    html += '<div class="tt-scroll"><table class="tt-table"><thead><tr><th class="tt-corner">节次</th>';
    visibleDays.forEach(d => {
      const def = TT_DAYS.find(x => x.idx === d);
      const del = d > 5
        ? `<button class="tt-col-del" title="删除${def.label}全部课程" onclick="TimetablePage.deleteWeekendColumn(${d})">✕</button>`
        : '';
      html += `<th class="tt-th">${def.label}${del}</th>`;
    });
    html += '</tr></thead><tbody>';

    // 上午
    html += this._rowsHTML(cells, visibleDays, 'morning');
    // 午休分隔
    html += `<tr class="tt-break"><td colspan="${visibleDays.length + 1}">🍱 午休</td></tr>`;
    // 下午
    html += this._rowsHTML(cells, visibleDays, 'afternoon');
    // 课后服务分隔 + 第9节
    html += `<tr class="tt-segment"><td colspan="${visibleDays.length + 1}">🌇 课后服务</td></tr>`;
    html += this._rowsHTML(cells, visibleDays, 'service');

    html += '</tbody></table></div>';

    html += `
      <div class="tt-tip">
        💡 点击任意格子可编辑科目 / 任课教师 / 地点；周末课程通过上方开关增删。
      </div>
    `;

    document.getElementById('mainContent').innerHTML = html;
  },

  _rowsHTML(cells, visibleDays, part) {
    let h = '';
    TT_PERIODS.filter(p => p.part === part).forEach(p => {
      h += `<tr><td class="tt-period ${part === 'service' ? 'service' : ''}">${p.label}</td>`;
      visibleDays.forEach(d => {
        const cell = cells[this._key(d, p.no)];
        h += `<td class="tt-td" onclick="TimetablePage.openCellEdit(${d}, ${p.no})">${this._cellInner(cell)}</td>`;
      });
      h += '</tr>';
    });
    return h;
  },

  _cellInner(cell) {
    if (!cell || !cell.subject) {
      return `<div class="tt-cell-empty">＋</div>`;
    }
    const color = Utils.getColorFromName(cell.subject);
    const meta = [];
    if (cell.teacher) meta.push(Utils.escapeHtml(cell.teacher));
    if (cell.room) meta.push(Utils.escapeHtml(cell.room));
    return `
      <div class="tt-cell" style="border-left:3px solid ${color}">
        <div class="tt-subject" style="color:${color}">${Utils.escapeHtml(cell.subject)}</div>
        ${meta.length ? `<div class="tt-meta">${meta.join(' · ')}</div>` : ''}
      </div>`;
  },

  // ---- 格子编辑 ----
  openCellEdit(day, period) {
    this._editing = { day, period };
    const cells = this._cells();
    const cell = cells[this._key(day, period)] || {};
    const dl = TT_DAYS.find(x => x.idx === day).label;
    const pl = TT_PERIODS.find(x => x.no === period).label;

    const chips = TT_SUBJECTS.map(s =>
      `<button class="tt-subj-chip" onclick="TimetablePage.fillSubject('${s}')">${s}</button>`
    ).join('');

    Utils.showModal(`${dl} · ${pl}`, `
      <div class="form-group">
        <label class="form-label">科目</label>
        <input class="form-input" id="ttSubject" value="${Utils.escapeHtml(cell.subject || '')}" placeholder="如：语文">
      </div>
      <div class="tt-subj-label">常用科目（点击填入）</div>
      <div class="tt-subj-chips">${chips}</div>
      <div class="form-row" style="margin-top:10px;">
        <div class="form-group">
          <label class="form-label">任课教师</label>
          <input class="form-input" id="ttTeacher" value="${Utils.escapeHtml(cell.teacher || '')}" placeholder="选填">
        </div>
        <div class="form-group">
          <label class="form-label">地点</label>
          <input class="form-input" id="ttRoom" value="${Utils.escapeHtml(cell.room || '')}" placeholder="如：301">
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" style="flex:1;" onclick="TimetablePage.clearCell()">清除本节</button>
      <button class="btn btn-primary" style="flex:1;" onclick="TimetablePage.saveCellFromModal()">保存</button>
    `);
  },

  fillSubject(s) {
    const el = document.getElementById('ttSubject');
    if (el) el.value = s;
  },

  saveCellFromModal() {
    if (!this._editing) return;
    const { day, period } = this._editing;
    const subject = (document.getElementById('ttSubject').value || '').trim();
    const teacher = (document.getElementById('ttTeacher').value || '').trim();
    const room = (document.getElementById('ttRoom').value || '').trim();
    if (!subject) {
      Utils.toast('请输入科目', 'warning');
      return;
    }
    const cells = this._cells();
    cells[this._key(day, period)] = { subject, teacher, room };
    this._saveCells(cells);
    Utils.closeModal();
    this.render();
    Utils.toast('已保存', 'success');
  },

  clearCell() {
    if (!this._editing) return;
    const { day, period } = this._editing;
    const cells = this._cells();
    delete cells[this._key(day, period)];
    this._saveCells(cells);
    Utils.closeModal();
    this.render();
    Utils.toast('已清除', 'success');
  },

  // ---- 周末增删 ----
  toggleWeekend(d) {
    this.weekendOpen[d] = !this.weekendOpen[d];
    this.render();
  },

  deleteWeekendColumn(d) {
    const label = TT_DAYS.find(x => x.idx === d).label;
    Utils.confirm(`确定删除${label}的全部课程吗？`, () => {
      const cells = this._cells();
      Object.keys(cells).forEach(k => { if (k.indexOf(d + '_') === 0) delete cells[k]; });
      this._saveCells(cells);
      this.weekendOpen[d] = false;
      this.render();
      Utils.toast('已删除', 'success');
    });
  },

  // ---- 导出 Word ----
  exportWord() {
    const cls = DB.getCurrentClass();
    const cells = this._cells();
    const visibleDays = this._visibleDays();
    const scopeText = this.scope === 'class' ? '全班课表' : '我的课表';

    let t = '<table border="1" cellspacing="0" cellpadding="5" style="border-collapse:collapse;width:100%;text-align:center;font-size:11pt;">';
    t += '<thead><tr style="background:#4f46e5;color:#fff;"><th>节次</th>';
    visibleDays.forEach(d => { t += `<th>${TT_DAYS.find(x => x.idx === d).label}</th>`; });
    t += '</tr></thead><tbody>';

    const emit = (part) => {
      TT_PERIODS.filter(p => p.part === part).forEach(p => {
        t += `<tr><td style="background:#f1f5f9;font-weight:600;">${p.label}</td>`;
        visibleDays.forEach(d => {
          const c = cells[this._key(d, p.no)];
          const txt = c && c.subject
            ? `${c.subject}${c.teacher ? '<br>' + c.teacher : ''}${c.room ? '<br>' + c.room : ''}`
            : '';
          t += `<td>${txt}</td>`;
        });
        t += '</tr>';
      });
    };

    emit('morning');
    t += `<tr><td colspan="${visibleDays.length + 1}" style="background:#fef3c7;font-weight:600;">午休</td></tr>`;
    emit('afternoon');
    t += `<tr><td colspan="${visibleDays.length + 1}" style="background:#ede9fe;font-weight:600;">课后服务</td></tr>`;
    emit('service');
    t += '</tbody></table>';

    const title = `${cls.name}课程表（${scopeText}）`;
    Utils.exportWord(`课程表_${cls.name}_${scopeText}.doc`, title, `<h1 style="text-align:center;">${title}</h1>${t}`);
    Utils.toast('正在导出…', 'success');
  }
};
