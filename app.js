/**
 * 班主任工作台 - 主应用逻辑
 */

let currentPage = 'dashboard';

const App = {
  init() {
    DB.init();
    if (typeof DataSetup !== 'undefined') DataSetup.autoMigrateIfNeeded();
    this.updateHeader();
    this.startClock();
    this.bindNavigation();
    this.navigate('dashboard');
  },

  // 更新顶部状态栏
  updateHeader() {
    const cls = DB.getCurrentClass();
    document.getElementById('currentClassName').textContent = cls.name;
    document.getElementById('sidebarClassName').textContent = cls.name;
    // 更新班级学生数
    const students = DB.getByClass('students');
    const classes = DB.get('classes') || [];
    const idx = classes.findIndex(c => c.id === cls.id);
    if (idx >= 0) {
      classes[idx].studentCount = students.length;
      DB.set('classes', classes);
    }
  },

  // 启动时钟
  startClock() {
    const update = () => {
      const now = Utils.now();
      const dateStr = Utils.formatDate(now, 'MM月DD日 周W');
      const timeStr = Utils.formatDate(now, 'HH:mm');
      document.getElementById('currentDateTime').innerHTML = `${dateStr}<br>${timeStr}`;
    };
    update();
    setInterval(update, 1000);
  },

  // 绑定导航
  bindNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        this.navigate(page);
        if (window.innerWidth < 1024) {
          this.closeSidebar();
        }
      });
    });
  },

  // 导航到页面
  navigate(page) {
    currentPage = page;
    // 更新导航高亮
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    // 更新底部导航
    const bottomMap = { 'dashboard': 0, 'students': 1, 'todo': 3 };
    document.querySelectorAll('.bottom-nav-item').forEach((item, i) => {
      const isMatching = (page === 'dashboard' && i === 0) ||
                         (page === 'students' && i === 1) ||
                         (page === 'todo' && i === 3);
      item.classList.toggle('active', isMatching);
    });

    // 渲染页面
    const content = document.getElementById('mainContent');
    content.innerHTML = '';
    content.classList.add('fade-in');

    const pageRenderers = {
      dashboard: () => DashboardPage.render(),
      students: () => StudentsPage.render(),
      grades: () => GradesPage.render(),
      discipline: () => DisciplinePage.render(),
      homework: () => HomeworkPage.render(),
      leave: () => LeavePage.render(),
      worklog: () => WorklogPage.render(),
      talks: () => TalksPage.render(),
      seating: () => SeatingPage.render(),
      communication: () => CommunicationPage.render(),
      activities: () => ActivitiesPage.render(),
      attendance: () => AttendancePage.render(),
      meeting: () => MeetingPage.render(),
      randomname: () => RandomNamePage.render(),
      countdown: () => CountdownPage.render(),
      todo: () => TodoPage.render(),
      timetable: () => TimetablePage.render()
    };

    if (pageRenderers[page]) {
      pageRenderers[page]();
    } else {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🚧</div><div class="empty-state-text">页面开发中...</div></div>`;
    }

    setTimeout(() => content.classList.remove('fade-in'), 300);
  },

  // 打开侧边栏
  openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarOverlay').classList.add('open');
  },

  // 关闭侧边栏
  closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
  }
};

// 全局函数
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar.classList.contains('open')) {
    App.closeSidebar();
  } else {
    App.openSidebar();
  }
}

function navigateTo(page) {
  App.navigate(page);
}

function showQuickActions() {
  document.getElementById('actionSheet').classList.add('open');
}

function closeActionSheet() {
  document.getElementById('actionSheet').classList.remove('open');
}

// 班级切换
function showClassSwitcher() {
  const classes = DB.get('classes') || [];
  const currentClass = DB.getCurrentClass();
  let html = '<div class="class-switcher-grid">';
  classes.forEach(c => {
    const studentCount = (DB.get('students') || []).filter(s => s.classId === c.id).length;
    html += `
      <div class="class-card ${c.id === currentClass.id ? 'active' : ''}" onclick="switchClass('${c.id}')">
        <div class="class-card-name">${c.name}</div>
        <div class="class-card-info">${studentCount}名学生</div>
      </div>
    `;
  });
  html += '</div>';

  Utils.showModal('切换班级', html, `
    <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
    <button class="btn btn-primary" style="flex:1;" onclick="showAddClassForm()">+ 添加班级</button>
  `);
}

function switchClass(classId) {
  DB.setCurrentClass(classId);
  App.updateHeader();
  Utils.closeModal();
  App.navigate(currentPage);
  Utils.toast('已切换班级', 'success');
}

function showAddClassForm() {
  Utils.closeModal();
  setTimeout(() => {
    Utils.showModal('添加班级', `
      <div class="form-group">
        <label class="form-label">年级</label>
        <select class="form-select" id="newClassGrade">
          <option value="七年级">七年级</option>
          <option value="八年级">八年级</option>
          <option value="九年级">九年级</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">班级序号</label>
        <input class="form-input" id="newClassNo" type="number" placeholder="如：10" min="1" max="30">
      </div>
    `, `
      <button class="btn btn-secondary" style="flex:1;" onclick="Utils.closeModal()">取消</button>
      <button class="btn btn-primary" style="flex:1;" onclick="addNewClass()">添加</button>
    `);
  }, 300);
}

function addNewClass() {
  const grade = document.getElementById('newClassGrade').value;
  const classNo = document.getElementById('newClassNo').value;
  if (!classNo) {
    Utils.toast('请输入班级序号', 'error');
    return;
  }
  const classes = DB.get('classes') || [];
  const newClass = {
    id: DB.genId(),
    name: `${grade}${classNo}班`,
    grade: grade,
    classNo: classNo,
    studentCount: 0
  };
  classes.push(newClass);
  DB.set('classes', classes);
  DB.setCurrentClass(newClass.id);
  App.updateHeader();
  Utils.closeModal();
  App.navigate(currentPage);
  Utils.toast('班级添加成功', 'success');
}

function showSettings() {
  const cls = DB.getCurrentClass();
  const students = DB.getByClass('students');
  Utils.showModal('设置', `
    <div class="profile-header">
      <div class="profile-avatar" style="background:linear-gradient(135deg,#4f46e5,#6366f1);">👨‍🏫</div>
      <div class="profile-info">
        <h3>班主任</h3>
        <p>${cls.name} · ${students.length}名学生</p>
      </div>
    </div>
    <div class="list-item" onclick="exportAllData()" style="cursor:pointer;">
      <div class="list-avatar" style="background:#dbeafe;color:#1e40af;">📦</div>
      <div class="list-content">
        <div class="list-title">导出全部数据</div>
        <div class="list-subtitle">备份所有班级数据为JSON文件</div>
      </div>
      <div class="list-action">›</div>
    </div>
    <div class="list-item" onclick="document.getElementById('importFile').click()" style="cursor:pointer;">
      <div class="list-avatar" style="background:#d1fae5;color:#065f46;">📥</div>
      <div class="list-content">
        <div class="list-title">导入数据</div>
        <div class="list-subtitle">从JSON文件恢复数据</div>
      </div>
      <div class="list-action">›</div>
    </div>
    <input type="file" id="importFile" accept=".json" style="display:none;" onchange="importData(event)">
    <div class="list-item" onclick="clearCurrentClassData()" style="cursor:pointer;">
      <div class="list-avatar" style="background:#fee2e2;color:#991b1b;">🗑</div>
      <div class="list-content">
        <div class="list-title" style="color:var(--danger);">清空当前班级数据</div>
        <div class="list-subtitle">删除${cls.name}的所有数据</div>
      </div>
      <div class="list-action">›</div>
    </div>
    <div class="list-item" style="cursor:default;">
      <div class="list-avatar" style="background:#fef3c7;color:#92400e;">ℹ️</div>
      <div class="list-content">
        <div class="list-title">关于</div>
        <div class="list-subtitle">班主任工作台 v1.0.0<br>数据存储于本地浏览器</div>
      </div>
    </div>
  `);
}

function exportAllData() {
  const data = DB.exportAll();
  const json = JSON.stringify(data, null, 2);
  Utils.downloadFile(`班主任工作台_数据备份_${Utils.today()}.json`, json, 'application/json');
  Utils.toast('数据已导出', 'success');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      Utils.confirm('导入数据将覆盖现有数据，确定继续？', () => {
        DB.importAll(data);
        App.updateHeader();
        Utils.closeModal();
        App.navigate(currentPage);
        Utils.toast('数据导入成功', 'success');
      });
    } catch (err) {
      Utils.toast('文件格式错误', 'error');
    }
  };
  reader.readAsText(file);
}

function clearCurrentClassData() {
  const cls = DB.getCurrentClass();
  Utils.confirm(`确定要清空【${cls.name}】的所有数据吗？此操作不可恢复！`, () => {
    DB.clearClassData(cls.id);
    App.updateHeader();
    Utils.closeModal();
    App.navigate(currentPage);
    Utils.toast('数据已清空', 'success');
  }, '危险操作');
}

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
