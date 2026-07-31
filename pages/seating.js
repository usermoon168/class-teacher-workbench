/**
 * 座位安排页面
 */
const SeatingPage = {
  rows: 6,
  cols: 6,
  layout: [],
  selectedSeat: null,
  mode: 'view', // view, edit, auto

  render() {
    let html = `
      <div class="page-title">🪑 座位安排</div>
      <div class="page-subtitle">可视化编辑 · 自动排座 · 导出图片</div>
    `;

    html += `
      <div class="toolbar">
        <button class="btn btn-primary btn-sm" onclick="SeatingPage.toggleEdit()">${this.mode === 'edit' ? '✓ 完成编辑' : '✏️ 编辑座位'}</button>
        <button class="btn btn-outline btn-sm" onclick="SeatingPage.autoArrange()">🤖 自动排座</button>
        <button class="btn btn-outline btn-sm" onclick="SeatingPage.exportImage()">📷 导出图片</button>
        <button class="btn btn-outline btn-sm" onclick="SeatingPage.showSettings()">⚙️ 设置</button>
      </div>
    `;

    // 加载座位数据
    let seatingData;
    try {
      seatingData = DB.getByClass('seating');
      if (!Array.isArray(seatingData)) seatingData = [];
    } catch (e) {
      seatingData = [];
    }
    if (seatingData.length > 0) {
      const data = seatingData[0];
      this.rows = (data && data.rows) || 6;
      this.cols = (data && data.cols) || 6;
      this.layout = (data && data.layout) || [];
    } else {
      this.layout = [];
    }

    const students = DB.getByClass('students');

    html += `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-value">${students.length}</div><div class="stat-label">班级人数</div></div>
        <div class="stat-card success"><div class="stat-value">${this.layout.length}</div><div class="stat-label">已安排</div></div>
        <div class="stat-card warning"><div class="stat-value">${this.rows}×${this.cols}</div><div class="stat-label">座位规模</div></div>
        <div class="stat-card info"><div class="stat-value">${this.rows * this.cols - this.layout.length}</div><div class="stat-label">空位</div></div>
      </div>
    `;

    // 座位网格
    html += '<div class="card"><div class="card-header"><div class="card-title">🪑 座位表</div>';
    if (this.mode === 'edit') {
      html += '<span style="font-size:12px;color:var(--gray-500);">点击座位安排学生</span>';
    }
    html += '</div>';

    html += `<div class="seating-podium">📋 讲台 / 黑板</div>`;
    html += `<div class="seating-grid" style="grid-template-columns:repeat(${this.cols},1fr);">`;

    for (let r = 1; r <= this.rows; r++) {
      for (let c = 1; c <= this.cols; c++) {
        const seat = this.layout.find(s => s.row === r && s.col === c);
        const hasStudent = !!seat;
        const seatClass = hasStudent ? 'seat has-student' : 'seat empty';
        html += `
          <div class="${seatClass}" onclick="SeatingPage.clickSeat(${r}, ${c})">
            ${hasStudent ? `<div class="seat-name">${seat.studentName}</div><div class="seat-num">${r}-${c}</div>` : `<div class="seat-num">${r}-${c}</div><div class="seat-name">空</div>`}
          </div>
        `;
      }
    }
    html += '</div></div>';

    // 未安排学生列表
    if (this.mode === 'edit') {
      const arrangedIds = this.layout.map(s => s.studentId);
      const unarranged = students.filter(s => !arrangedIds.includes(s.id));
      if (unarranged.length > 0 || this.selectedSeat) {
        html += '<div class="card"><div class="card-header"><div class="card-title">📋 未安排学生</div></div>';
        if (this.selectedSeat) {
          html += `<div style="padding:8px;background:#fef3c7;border-radius:8px;margin-bottom:8px;font-size:13px;">已选择座位：第${this.selectedSeat.row}排第${this.selectedSeat.col}列，请点击学生安排到此座位</div>`;
        }
        if (unarranged.length > 0) {
          unarranged.forEach(s => {
            html += `
              <div class="list-item" onclick="SeatingPage.assignSeat('${s.id}')">
                <div class="list-avatar" style="background:${Utils.getColorFromName(s.name)}20;color:${Utils.getColorFromName(s.name)};">${Utils.getInitial(s.name)}</div>
                <div class="list-content"><div class="list-title">${s.name}</div></div>
                <button class="btn btn-sm btn-primary">${this.selectedSeat ? '安排到此' : '选择座位'}</button>
              </div>
            `;
          });
        } else {
          html += '<div style="text-align:center;color:var(--gray-400);padding:12px;">所有学生已安排座位</div>';
        }
        html += '</div>';
      }
    }

    document.getElementById('mainContent').innerHTML = html;
  },

  toggleEdit() {
    this.mode = this.mode === 'edit' ? 'view' : 'edit';
    this.selectedSeat = null;
    this.render();
  },

  clickSeat(row, col) {
    if (this.mode !== 'edit') return;
    const seat = this.layout.find(s => s.row === row && s.col === col);
    if (seat) {
      // 移除座位
      Utils.confirm(`确定要移除${seat.studentName}的座位吗？`, () => {
        this.layout = this.layout.filter(s => !(s.row === row && s.col === col));
        this.saveLayout();
        this.render();
        Utils.toast('已移除', 'success');
      });
    } else {
      this.selectedSeat = { row, col };
      this.render();
      Utils.toast(`已选择第${row}排第${col}列`, 'info');
    }
  },

  assignSeat(studentId) {
    if (!this.selectedSeat) {
      Utils.toast('请先点击空座位选择位置', 'warning');
      return;
    }
    const student = (DB.get('students') || []).find(s => s.id === studentId);
    if (!student) return;

    // 移除该学生已有的座位
    this.layout = this.layout.filter(s => s.studentId !== studentId);

    this.layout.push({
      row: this.selectedSeat.row,
      col: this.selectedSeat.col,
      studentId: studentId,
      studentName: student.name
    });

    this.selectedSeat = null;
    this.saveLayout();
    this.render();
    Utils.toast('座位已安排', 'success');
  },

  autoArrange() {
    const students = DB.getByClass('students');
    if (students.length === 0) {
      Utils.toast('暂无学生', 'warning');
      return;
    }
    Utils.confirm(`将自动排列${students.length}名学生到${this.rows}×${this.cols}座位表，确定继续？`, () => {
      this.layout = [];
      // 按身高排序（如果有身高数据），否则按学号
      const sorted = [...students].sort((a, b) => (a.studentNo || '').localeCompare(b.studentNo || ''));
      let idx = 0;
      for (let r = 1; r <= this.rows && idx < sorted.length; r++) {
        // 交替排列（S形）
        if (r % 2 === 1) {
          for (let c = 1; c <= this.cols && idx < sorted.length; c++) {
            this.layout.push({
              row: r, col: c,
              studentId: sorted[idx].id,
              studentName: sorted[idx].name
            });
            idx++;
          }
        } else {
          for (let c = this.cols; c >= 1 && idx < sorted.length; c--) {
            this.layout.push({
              row: r, col: c,
              studentId: sorted[idx].id,
              studentName: sorted[idx].name
            });
            idx++;
          }
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
      rows: this.rows,
      cols: this.cols,
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
          <label class="form-label">行数</label>
          <input class="form-input" id="seatRows" type="number" value="${this.rows}" min="1" max="15">
        </div>
        <div class="form-group">
          <label class="form-label">列数</label>
          <input class="form-input" id="seatCols" type="number" value="${this.cols}" min="1" max="15">
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
      <button class="btn btn-primary" style="flex:1;" onclick="SeatingPage.applySettings()">应用</button>
    `);
  },

  applySettings() {
    const rows = parseInt(document.getElementById('seatRows').value);
    const cols = parseInt(document.getElementById('seatCols').value);
    if (!rows || !cols || rows > 15 || cols > 15) {
      Utils.toast('请输入合理的行列数', 'error');
      return;
    }
    this.rows = rows;
    this.cols = cols;
    // 移除超出范围的座位
    this.layout = this.layout.filter(s => s.row <= rows && s.col <= cols);
    this.saveLayout();
    Utils.closeModal();
    this.render();
    Utils.toast('设置已更新', 'success');
  },

  exportImage() {
    // 生成HTML座位表图片
    const cls = DB.getCurrentClass();
    const dateStr = Utils.today();

    let tableHtml = `<table style="border-collapse:collapse;margin:0 auto;">`;
    for (let r = 1; r <= this.rows; r++) {
      tableHtml += '<tr>';
      for (let c = 1; c <= this.cols; c++) {
        const seat = this.layout.find(s => s.row === r && s.col === c);
        tableHtml += `<td style="border:2px solid #4f46e5;width:80px;height:60px;text-align:center;vertical-align:middle;font-size:14px;font-weight:600;background:${seat ? '#eef2ff' : '#f9fafb'};color:${seat ? '#4f46e5' : '#ccc'};">${seat ? seat.studentName : '空'}</td>`;
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</table>';

    const html = `
      <div style="padding:20px;background:#fff;width:700px;">
        <h2 style="text-align:center;margin-bottom:6px;">${cls.name} 座位表</h2>
        <p style="text-align:center;color:#666;margin-bottom:20px;">生成日期：${dateStr}</p>
        <div style="text-align:center;padding:8px;background:#e5e7eb;border-radius:8px;margin-bottom:12px;font-size:14px;">📋 讲台 / 黑板</div>
        ${tableHtml}
      </div>
    `;

    // 使用canvas生成图片
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    document.body.appendChild(tempDiv);

    // 使用 html2canvas 替代方案 - 生成可打印的HTML
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>${cls.name}座位表</title>
      <style>body{font-family:sans-serif;} @media print{button{display:none;}}</style>
      </head><body>${html}
      <div style="text-align:center;margin-top:20px;">
        <button onclick="window.print()" style="padding:10px 20px;font-size:14px;cursor:pointer;">打印 / 保存为PDF</button>
      </div>
      </body></html>
    `);
    printWindow.document.close();
    document.body.removeChild(tempDiv);
    Utils.toast('已打开打印窗口，可保存为PDF', 'success');
  }
};
