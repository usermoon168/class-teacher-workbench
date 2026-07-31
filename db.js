/**
 * 班主任工作台 - 数据库层
 * 基于 localStorage 的数据持久化
 */

const DB = {
  prefix: 'ctw_',
  currentClassId: 'class_1',

  // 初始化默认数据
  init() {
    if (!this.get('classes')) {
      this.set('classes', [
        { id: 'class_1', name: '八年级10班', grade: '八年级', classNo: '10', studentCount: 0 },
        { id: 'class_2', name: '七年级3班', grade: '七年级', classNo: '3', studentCount: 0 },
        { id: 'class_3', name: '九年级5班', grade: '九年级', classNo: '5', studentCount: 0 },
      ]);
    }
    this.currentClassId = this.get('currentClassId') || 'class_1';

    // 初始化各模块数据
    const modules = ['students', 'exams', 'grades', 'discipline', 'homework', 'homeworkRecords',
      'leaves', 'worklogs', 'talks', 'seating', 'parents', 'homeVisits', 'parentMeetings',
      'groupNotices', 'activities', 'awards', 'dutyRoster', 'todos', 'notes', 'reminders'];
    modules.forEach(m => {
      if (!this.get(m)) this.set(m, []);
    });

    // 如果当前班级没有学生，插入示例数据
    const students = this.get('students');
    const class1Students = students.filter(s => s.classId === 'class_1');
    if (class1Students.length === 0) {
      this._insertSampleData();
    }
  },

  get(key) {
    try {
      const data = localStorage.getItem(this.prefix + key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('DB.get error:', key, e);
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('DB.set error:', key, e);
      return false;
    }
  },

  getCurrentClass() {
    const classes = this.get('classes') || [];
    return classes.find(c => c.id === this.currentClassId) || classes[0] || { id: 'class_1', name: '八年级10班' };
  },

  setCurrentClass(classId) {
    this.currentClassId = classId;
    this.set('currentClassId', classId);
  },

  // 按当前班级过滤数据
  getByClass(key) {
    const data = this.get(key) || [];
    return data.filter(item => item.classId === this.currentClassId || !item.classId);
  },

  // 添加数据
  add(key, item) {
    const data = this.get(key) || [];
    item.id = item.id || this.genId();
    item.classId = item.classId || this.currentClassId;
    item.createdAt = item.createdAt || new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    data.push(item);
    this.set(key, data);
    return item;
  },

  // 更新数据
  update(key, id, updates) {
    const data = this.get(key) || [];
    const idx = data.findIndex(item => item.id === id);
    if (idx >= 0) {
      data[idx] = { ...data[idx], ...updates, updatedAt: new Date().toISOString() };
      this.set(key, data);
      return data[idx];
    }
    return null;
  },

  // 删除数据
  delete(key, id) {
    const data = this.get(key) || [];
    const filtered = data.filter(item => item.id !== id);
    this.set(key, filtered);
    return true;
  },

  // 批量删除
  deleteBatch(key, ids) {
    const data = this.get(key) || [];
    const filtered = data.filter(item => !ids.includes(item.id));
    this.set(key, filtered);
    return true;
  },

  // 生成ID
  genId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  // 导出全部数据
  exportAll() {
    const result = {};
    const keys = ['classes', 'students', 'exams', 'grades', 'discipline', 'homework', 'homeworkRecords',
      'leaves', 'worklogs', 'talks', 'seating', 'parents', 'homeVisits', 'parentMeetings',
      'groupNotices', 'activities', 'awards', 'dutyRoster', 'todos', 'notes', 'reminders'];
    keys.forEach(k => result[k] = this.get(k));
    return result;
  },

  // 导入数据
  importAll(data) {
    Object.keys(data).forEach(k => {
      if (data[k]) this.set(k, data[k]);
    });
  },

  // 清空当前班级数据
  clearClassData(classId) {
    const keys = ['students', 'exams', 'grades', 'discipline', 'homework', 'homeworkRecords',
      'leaves', 'worklogs', 'talks', 'seating', 'parents', 'homeVisits', 'parentMeetings',
      'groupNotices', 'activities', 'awards', 'dutyRoster', 'todos', 'notes', 'reminders'];
    keys.forEach(k => {
      const data = this.get(k) || [];
      const filtered = data.filter(item => item.classId !== classId);
      this.set(k, filtered);
    });
  },

  // 插入示例数据
  _insertSampleData() {
    const sampleNames = [
      '张明轩', '李思琪', '王子涵', '陈雨桐', '刘子航', '杨欣怡', '赵浩然', '黄诗涵',
      '周宇航', '吴梦瑶', '徐子墨', '孙若汐', '胡景天', '朱梓萱', '高俊熙', '林书瑶',
      '何嘉睿', '郭语桐', '马天麟', '罗思颖', '梁宇轩', '宋雅静', '郑明阳', '谢欣然',
      '韩子睿', '唐梦琪', '冯浩宇', '曹语晨', '彭子涵', '董艺涵', '萧天宇', '袁梦瑶'
    ];

    const genders = ['男', '女'];
    const students = [];

    sampleNames.forEach((name, i) => {
      const gender = i % 2 === 0 ? '男' : '女';
      students.push({
        id: this.genId(),
        classId: 'class_1',
        name: name,
        studentNo: '2024' + String(i + 1).padStart(3, '0'),
        gender: gender,
        age: 13 + (i % 3),
        birthday: `201${i % 3}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
        phone: '138' + String(10000000 + i * 137).slice(0, 8),
        parentName: ['张伟', '李强', '王磊', '陈刚', '刘洋'][i % 5],
        parentPhone: '139' + String(20000000 + i * 137).slice(0, 8),
        address: ['幸福路' + (i+1) + '号', '光明街' + (i+1) + '号', '文化路' + (i+1) + '号'][i % 3],
        dorm: i % 3 === 0 ? '住校' : '走读',
        note: i % 7 === 0 ? '班委' : (i % 5 === 0 ? '特长生' : ''),
        role: i === 0 ? '班长' : (i === 1 ? '副班长' : (i === 2 ? '学习委员' : (i === 3 ? '纪律委员' : (i === 4 ? '卫生委员' : '')))),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    this.set('students', students);

    // 插入示例违纪数据
    const disciplineTypes = ['迟到', '早退', '旷课', '课堂违纪', '仪容仪表', '手机违规'];
    const disciplineLevels = ['轻微', '一般', '严重'];
    const disciplines = [];
    for (let i = 0; i < 15; i++) {
      const student = students[Math.floor(Math.random() * students.length)];
      disciplines.push({
        id: this.genId(),
        classId: 'class_1',
        studentId: student.id,
        studentName: student.name,
        type: disciplineTypes[Math.floor(Math.random() * disciplineTypes.length)],
        level: disciplineLevels[Math.floor(Math.random() * disciplineLevels.length)],
        date: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString().split('T')[0],
        description: '在教室' + disciplineTypes[Math.floor(Math.random() * disciplineTypes.length)] + '，已被提醒教育',
        handler: '班主任',
        action: '口头批评教育',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    this.set('discipline', disciplines);

    // 插入示例请假数据
    const leaveTypes = ['病假', '事假', '其他'];
    const leaves = [];
    for (let i = 0; i < 8; i++) {
      const student = students[Math.floor(Math.random() * students.length)];
      const startDate = new Date(Date.now() - Math.floor(Math.random() * 20) * 86400000);
      const days = Math.floor(Math.random() * 3) + 1;
      leaves.push({
        id: this.genId(),
        classId: 'class_1',
        studentId: student.id,
        studentName: student.name,
        type: leaveTypes[Math.floor(Math.random() * leaveTypes.length)],
        startDate: startDate.toISOString().split('T')[0],
        endDate: new Date(startDate.getTime() + days * 86400000).toISOString().split('T')[0],
        days: days,
        reason: ['感冒发烧', '家中有事', '去医院检查', '参加比赛'][Math.floor(Math.random() * 4)],
        contact: student.parentPhone || '13800000000',
        approver: '班主任',
        status: ['待审批', '已批准', '已销假'][Math.floor(Math.random() * 3)],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    this.set('leaves', leaves);

    // 插入示例考试
    const exams = [{
      id: this.genId(),
      classId: 'class_1',
      name: '2024秋第一次月考',
      date: '2024-10-15',
      subjects: ['语文', '数学', '英语', '物理', '政治', '历史', '地理', '生物'],
      fullScore: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, {
      id: this.genId(),
      classId: 'class_1',
      name: '2024秋期中考试',
      date: '2024-11-20',
      subjects: ['语文', '数学', '英语', '物理', '政治', '历史', '地理', '生物'],
      fullScore: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }];
    this.set('exams', exams);

    // 插入示例成绩
    const grades = [];
    const exam = exams[0];
    students.forEach((student, idx) => {
      const subjectScores = {};
      let total = 0;
      exam.subjects.forEach(subject => {
        const score = Math.floor(Math.random() * 40) + 60;
        subjectScores[subject] = score;
        total += score;
      });
      grades.push({
        id: this.genId(),
        classId: 'class_1',
        examId: exam.id,
        studentId: student.id,
        studentName: student.name,
        studentNo: student.studentNo,
        scores: subjectScores,
        total: total,
        average: (total / exam.subjects.length).toFixed(1),
        rank: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
    // 排名
    grades.sort((a, b) => b.total - a.total);
    grades.forEach((g, i) => g.rank = i + 1);
    this.set('grades', grades);

    // 插入示例作业
    const homework = [{
      id: this.genId(),
      classId: 'class_1',
      subject: '数学',
      title: '第三章 练习题',
      content: '完成课本P45-46练习题1-10题',
      assignedDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, {
      id: this.genId(),
      classId: 'class_1',
      subject: '语文',
      title: '作文：我的校园生活',
      content: '写一篇不少于600字的作文',
      assignedDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }];
    this.set('homework', homework);

    // 作业提交记录
    const hwRecords = [];
    homework.forEach(hw => {
      students.forEach(s => {
        hwRecords.push({
          id: this.genId(),
          classId: 'class_1',
          homeworkId: hw.id,
          studentId: s.id,
          studentName: s.name,
          status: Math.random() > 0.15 ? '已提交' : '未提交',
          submittedAt: Math.random() > 0.15 ? new Date().toISOString() : null,
          quality: Math.random() > 0.15 ? ['优', '良', '中'][Math.floor(Math.random() * 3)] : '',
          note: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
    });
    this.set('homeworkRecords', hwRecords);

    // 插入示例工作留痕
    const worklogTypes = ['班会', '教研活动', '培训学习', '会议记录', '常规检查', '其他'];
    const worklogs = [];
    for (let i = 0; i < 10; i++) {
      worklogs.push({
        id: this.genId(),
        classId: 'class_1',
        type: worklogTypes[Math.floor(Math.random() * worklogTypes.length)],
        title: worklogTypes[Math.floor(Math.random() * worklogTypes.length)] + '记录',
        date: new Date(Date.now() - i * 86400000 * 2).toISOString().split('T')[0],
        location: ['教室', '办公室', '会议室', '操场'][Math.floor(Math.random() * 4)],
        participants: '全体学生',
        content: '今日开展了' + worklogTypes[Math.floor(Math.random() * worklogTypes.length)] + '，效果良好，学生积极参与，达到了预期目标。',
        photos: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    this.set('worklogs', worklogs);

    // 插入示例谈话记录
    const talkTypes = ['学业辅导', '心理疏导', '纪律教育', '家校沟通', '励志激励', '其他'];
    const talks = [];
    for (let i = 0; i < 8; i++) {
      const student = students[Math.floor(Math.random() * students.length)];
      talks.push({
        id: this.genId(),
        classId: 'class_1',
        studentId: student.id,
        studentName: student.name,
        type: talkTypes[Math.floor(Math.random() * talkTypes.length)],
        date: new Date(Date.now() - i * 86400000 * 3).toISOString().split('T')[0],
        location: ['办公室', '教室走廊', '心理咨询室'][Math.floor(Math.random() * 3)],
        content: '与' + student.name + '进行了一次深入的谈话，了解其近期学习和生活情况，给予了针对性的建议和鼓励。',
        effect: '学生态度积极，表示会改进',
        followUp: '一周后跟进',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    this.set('talks', talks);

    // 插入示例家长信息
    const parents = [];
    students.forEach(s => {
      parents.push({
        id: this.genId(),
        classId: 'class_1',
        studentId: s.id,
        studentName: s.name,
        fatherName: s.parentName + '（父）',
        fatherPhone: s.parentPhone,
        motherName: s.parentName + '（母）',
        motherPhone: '137' + String(30000000 + Math.random() * 10000000).slice(0, 8),
        address: s.address,
        work: ['个体经营', '企业员工', '公务员', '教师', '医生'][Math.floor(Math.random() * 5)],
        communicationPref: '微信',
        note: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
    this.set('parents', parents);

    // 插入示例活动
    const activities = [{
      id: this.genId(),
      classId: 'class_1',
      type: '班会',
      title: '期中总结班会',
      date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
      location: '教室',
      participants: '全体学生',
      content: '总结期中考试情况，表彰优秀学生，分析存在问题，制定下半学期目标。',
      result: '班会效果良好，学生明确了努力方向',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, {
      id: this.genId(),
      classId: 'class_1',
      type: '活动',
      title: '秋季运动会',
      date: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
      location: '操场',
      participants: '全体学生',
      content: '参加学校秋季运动会，多个项目获得好成绩',
      result: '团体总分第三名',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }];
    this.set('activities', activities);

    // 插入示例获奖记录
    const awards = [{
      id: this.genId(),
      classId: 'class_1',
      studentName: '张明轩',
      awardName: '校级三好学生',
      level: '校级',
      date: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
      organization: '学校',
      description: '学期综合表现优秀',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, {
      id: this.genId(),
      classId: 'class_1',
      studentName: '李思琪',
      awardName: '数学竞赛一等奖',
      level: '市级',
      date: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0],
      organization: '市教育局',
      description: '全市中学生数学竞赛一等奖',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }];
    this.set('awards', awards);

    // 插入示例待办
    const todos = [{
      id: this.genId(),
      classId: 'class_1',
      title: '准备明天班会PPT',
      description: '关于期末复习动员',
      priority: 'high',
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, {
      id: this.genId(),
      classId: 'class_1',
      title: '批改数学作业',
      description: '第三章练习题',
      priority: 'medium',
      dueDate: new Date().toISOString().split('T')[0],
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, {
      id: this.genId(),
      classId: 'class_1',
      title: '联系王同学家长',
      description: '沟通近期学习下滑问题',
      priority: 'high',
      dueDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }];
    this.set('todos', todos);

    // 插入示例提醒
    const reminders = [{
      id: this.genId(),
      classId: 'class_1',
      title: '明天是王同学生日',
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      type: 'birthday',
      createdAt: new Date().toISOString()
    }, {
      id: this.genId(),
      classId: 'class_1',
      title: '周五下午教研会议',
      date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      type: 'meeting',
      createdAt: new Date().toISOString()
    }];
    this.set('reminders', reminders);

    // 座位表
    this.set('seating', [{
      id: 'seating_1',
      classId: 'class_1',
      rows: 6,
      cols: 6,
      layout: students.slice(0, 36).map((s, i) => ({
        row: Math.floor(i / 6) + 1,
        col: (i % 6) + 1,
        studentId: s.id,
        studentName: s.name
      })),
      updatedAt: new Date().toISOString()
    }]);
  }
};
