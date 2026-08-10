/**
 * 随机点名器页面
 */
const RandomNamePage = {
  isRolling: false,
  rollTimer: null,
  selectedNames: [],
  excludeSelected: false,

  render() {
    const students = DB.getByClass('students');
    const records = DB.getByClass('randomCallRecords');

    let html = `
      <div class="page-title">🎲 随机点名</div>
      <div class="page-subtitle">课堂抽查 · 公平覆盖</div>
    `;

    if (students.length === 0) {
      html += Utils.emptyState('🎲', '暂无学生，请先添加学生');
      document.getElementById('mainContent').innerHTML = html;
      return;
    }

    // 点名区域
    html += `
      <div class="card" style="text-align:center;padding:20px;">
        <div class="random-name-display" id="randomNameDisplay">
          <div class="random-name-text" id="randomNameText">点击开始</div>
          <div class="random-name-hint" id="randomNameHint">👇 点击下方按钮开始点名</div>
        </div>
      </div>
    `;

    // 控制区
    html += `
      <div class="card">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">抽取人数</label>
            <select class="form-select" id="randomCount">
              <option value="1">1人</option>
              <option value="2">2人</option>
              <option value="3">3人</option>
              <option value="5">5人</option>
              <option value="10">10人</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">模式</label>
            <select class="form-select" id="randomMode">
              <option value="random">随机抽取</option>
              <option value="norepeat">不重复抽取</option>
            </select>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="btn btn-primary" style="flex:1;" id="rollBtn" onclick="RandomNamePage.toggleRoll()">🎲 开始点名</button>
          <button class="btn btn-outline" onclick="RandomNamePage.resetSelected()">重置已选</button>
        </div>
      </div>
    `;

    // 本次选中的学生
    if (this.selectedNames.length > 0) {
      html += `
        <div class="card">
          <div class="card-header"><div class="card-title">✅ 本次选中 (${this.selectedNames.length})</div></div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
      `;
      this.selectedNames.forEach((name, i) => {
        html += `<span class="tag tag-info" style="font-size:14px;padding:6px 12px;">${i + 1}. ${name}</span>`;
      });
      html += '</div></div>';
    }

    // 被点次数统计
    const studentStats = students.map(s => {
      const record = records.find(r => r.studentId === s.id);
      return { student: s, count: record?.callCount || 0, lastCalled: record?.lastCalled };
    });
    studentStats.sort((a, b) => b.count - a.count);

    const totalCalls = studentStats.reduce((sum, s) => sum + s.count, 0);
    const unCalled = studentStats.filter(s => s.count === 0);

    html += `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-value">${students.length}</div><div class="stat-label">总人数</div></div>
        <div class="stat-card success"><div class="stat-value">${totalCalls}</div><div class="stat-label">累计点名</div></div>
        <div class="stat-card warning"><div class="stat-value">${unCalled.length}</div><div class="stat-label">未被点过</div></div>
        <div class="stat-card info"><div class="stat-value">${studentStats[0]?.count || 0}</div><div class="stat-label">最多被点</div></div>
      </div>
    `;

    // 点名分布
    html += `
      <div class="card">
        <div class="card-header">
          <div class="card-title">📊 点名分布</div>
          <button class="btn btn-sm btn-outline" onclick="RandomNamePage.resetRecords()">重置统计</button>
        </div>
    `;

    if (unCalled.length > 0) {
      html += `
        <div style="margin-bottom:8px;">
          <strong style="color:var(--warning);font-size:13px;">⚠️ 未被点过 (${unCalled.length}人)</strong>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
      `;
      unCalled.forEach(s => {
        html += `<span class="tag tag-warning" style="font-size:13px;">${s.student.name}</span>`;
      });
      html += '</div>';
    }

    html += '<div style="font-size:13px;font-weight:700;margin-bottom:8px;">📈 点名次数排行</div>';
    studentStats.forEach(s => {
      const maxCount = studentStats[0]?.count || 1;
      const barWidth = maxCount > 0 ? (s.count / maxCount * 100) : 0;
      const isZero = s.count === 0;
      html += `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <div style="width:60px;font-size:13px;font-weight:600;flex-shrink:0;">${s.student.name}</div>
          <div class="progress-bar" style="flex:1;">
            <div class="progress-bar-fill ${isZero ? '' : 'success'}" style="width:${barWidth}%;"></div>
          </div>
          <div style="width:30px;text-align:right;font-size:13px;font-weight:600;flex-shrink:0;">${s.count}</div>
        </div>
      `;
    });

    html += '</div>';

    document.getElementById('mainContent').innerHTML = html;
  },

  toggleRoll() {
    if (this.isRolling) {
      this.stopRoll();
    } else {
      this.startRoll();
    }
  },

  startRoll() {
    const students = DB.getByClass('students');
    if (students.length === 0) return;

    const count = parseInt(document.getElementById('randomCount').value);
    const mode = document.getElementById('randomMode').value;

    // 可选学生池
    let pool = students;
    if (mode === 'norepeat') {
      pool = students.filter(s => !this.selectedNames.includes(s.name));
      if (pool.length === 0) {
        Utils.toast('所有学生都已被选中过，请重置', 'warning');
        return;
      }
    }

    this.isRolling = true;
    const btn = document.getElementById('rollBtn');
    btn.textContent = '⏹ 停止';
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-danger');

    const display = document.getElementById('randomNameText');
    const hint = document.getElementById('randomNameHint');
    hint.textContent = '滚动中...';

    // 滚动动画
    let speed = 50;
    let rollCount = 0;
    this.rollTimer = setInterval(() => {
      const randomStudent = pool[Math.floor(Math.random() * pool.length)];
      display.textContent = randomStudent.name;
      display.style.color = Utils.getColorFromName(randomStudent.name);
      rollCount++;

      // 逐渐减速
      if (rollCount > 15) speed = 80;
      if (rollCount > 25) speed = 120;
      if (rollCount > 35) speed = 200;
      if (rollCount > 40) {
        this.stopRoll();
      }
    }, speed);

    // 动态调整速度
    const speedUp = () => {
      if (this.isRolling && this.rollTimer) {
        clearInterval(this.rollTimer);
        const randomStudent = pool[Math.floor(Math.random() * pool.length)];
        display.textContent = randomStudent.name;
        display.style.color = Utils.getColorFromName(randomStudent.name);
        rollCount++;

        let delay = 50;
        if (rollCount > 10) delay = 80;
        if (rollCount > 20) delay = 120;
        if (rollCount > 30) delay = 180;
        if (rollCount > 38) delay = 300;
        if (rollCount > 42) {
          this.stopRoll();
          return;
        }
        this.rollTimer = setTimeout(speedUp, delay);
      }
    };
    clearInterval(this.rollTimer);
    this.rollTimer = setTimeout(speedUp, 50);
  },

  stopRoll() {
    this.isRolling = false;
    clearTimeout(this.rollTimer);
    clearInterval(this.rollTimer);

    const btn = document.getElementById('rollBtn');
    btn.textContent = '🎲 开始点名';
    btn.classList.remove('btn-danger');
    btn.classList.add('btn-primary');

    // 确定最终选中的学生
    const students = DB.getByClass('students');
    const count = parseInt(document.getElementById('randomCount').value);
    const mode = document.getElementById('randomMode').value;

    let pool = students;
    if (mode === 'norepeat') {
      pool = students.filter(s => !this.selectedNames.includes(s.name));
    }

    // 抽取
    const selected = [];
    const tempPool = [...pool];
    const actualCount = Math.min(count, tempPool.length);
    for (let i = 0; i < actualCount; i++) {
      const idx = Math.floor(Math.random() * tempPool.length);
      selected.push(tempPool[idx]);
      tempPool.splice(idx, 1);
    }

    // 显示结果
    const display = document.getElementById('randomNameText');
    const hint = document.getElementById('randomNameHint');

    if (selected.length === 1) {
      display.textContent = selected[0].name;
      display.style.color = Utils.getColorFromName(selected[0].name);
      hint.textContent = '✅ 已选中！';
    } else {
      display.textContent = selected.map(s => s.name).join('、');
      display.style.fontSize = '28px';
      hint.textContent = `✅ 已选中 ${selected.length} 人！`;
    }

    // 记录被点次数
    const records = DB.get('randomCallRecords') || [];
    selected.forEach(s => {
      let record = records.find(r => r.studentId === s.id && r.classId === DB.currentClassId);
      if (record) {
        record.callCount = (record.callCount || 0) + 1;
        record.lastCalled = new Date().toISOString();
      } else {
        records.push({
          id: DB.genId(),
          classId: DB.currentClassId,
          studentId: s.id,
          studentName: s.name,
          callCount: 1,
          lastCalled: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    });
    DB.set('randomCallRecords', records);

    // 添加到已选列表
    this.selectedNames = [...this.selectedNames, ...selected.map(s => s.name)];

    Utils.toast(`已点名：${selected.map(s => s.name).join('、')}`, 'success');

    // 刷新统计
    setTimeout(() => this.render(), 1500);
  },

  resetSelected() {
    this.selectedNames = [];
    Utils.toast('已重置本次选中', 'success');
    this.render();
  },

  resetRecords() {
    Utils.confirm('确定要重置所有点名记录吗？', () => {
      const records = (DB.get('randomCallRecords') || []).filter(r => r.classId !== DB.currentClassId);
      DB.set('randomCallRecords', records);
      this.render();
      Utils.toast('点名记录已重置', 'success');
    });
  }
};
