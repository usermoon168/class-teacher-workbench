/**
 * 班主任工作台 - 数据库层
 * 基于 localStorage 的数据持久化
 */

const DB = {
  prefix: 'ctw_',
  currentClassId: 'class_1',

  // 初始化默认数据
  init() {
    // 需要在每次加载时确保的模块空数组
    const modules = ['students', 'exams', 'grades', 'discipline', 'homework', 'homeworkRecords',
      'leaves', 'worklogs', 'talks', 'seating', 'parents', 'homeVisits', 'parentMeetings',
      'groupNotices', 'activities', 'awards', 'dutyRoster', 'todos', 'notes', 'reminders',
      'attendance', 'meetingReports', 'countdowns', 'randomCallRecords', 'timetable'];

    // 一次性初始化：默认班级与示例数据只在首次执行，避免反复注入覆盖用户作业等真实数据
    if (!this.get('ctw_init_done')) {
      if (!this.get('classes')) {
        this.set('classes', [
          { id: 'class_qi_10', name: '七年级10班', grade: '七年级', classNo: '10',  studentCount: 0 },
          { id: 'class_1', name: '八年级10班', grade: '八年级', classNo: '10', studentCount: 0 },
          { id: 'class_2', name: '七年级3班', grade: '七年级', classNo: '3', studentCount: 0 },
          { id: 'class_3', name: '九年级5班', grade: '九年级', classNo: '5', studentCount: 0 },
        ]);
      }
      modules.forEach(m => { if (!this.get(m)) this.set(m, []); });
      this._insertRealData();
      this._insertSampleData();
      this.set('ctw_init_done', '1');
    }

    this.currentClassId = this.get('currentClassId') || 'class_qi_10';
    modules.forEach(m => { if (!this.get(m)) this.set(m, []); });
    // 注意：示例数据只在上方 ctw_init_done 一次性分支写入，此处不再重复插入，
    // 否则每次刷新都会因示例班级被清理而重新注入并覆盖用户的真实作业/未完成记录。
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
      'groupNotices', 'activities', 'awards', 'dutyRoster', 'todos', 'notes', 'reminders',
      'attendance', 'meetingReports', 'countdowns', 'randomCallRecords', 'timetable'];
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
      'groupNotices', 'activities', 'awards', 'dutyRoster', 'todos', 'notes', 'reminders',
      'attendance', 'meetingReports', 'countdowns', 'randomCallRecords', 'timetable'];
    keys.forEach(k => {
      const data = this.get(k) || [];
      const filtered = data.filter(item => item.classId !== classId);
      this.set(k, filtered);
    });
  },

  // 插入七年级10班真实数据
  _insertRealData() {
    const classId = 'class_qi_10';
    // 真实学生花名册（七年级10班，55人）
    const rawStudents = [
      [1,"陈秀萍"],[2,"李芷馨"],[3,"李泽镇"],[4,"李梦妮"],[5,"庄静怡"],
      [6,"汪涵怡"],[7,"李建翊"],[8,"李玉欣"],[9,"李奕敏"],[10,"李晓彤"],
      [11,"李晞彤"],[12,"李子均"],[13,"陈思菲"],[14,"林宇晞"],[15,"蔡沁雨"],
      [16,"郭雅柔"],[17,"蔡楚烨"],[18,"陈连源"],[19,"陈钰涵"],[20,"范宝萱"],
      [21,"蔡梦丽"],[22,"蔡思梅"],[23,"欧依涵"],[24,"范诗敏"],[25,"林李雪钡"],
      [26,"范嘉煜"],[27,"林佳恩"],[28,"吴舒芹"],[29,"李云洲"],[30,"刘炫烨"],
      [31,"魏妍曦"],[32,"陈佩媛"],[33,"蔡书轩"],[34,"许盟睿"],[35,"陈泽洋"],
      [36,"蔡智威"],[37,"蔡一嘉"],[38,"李键楠"],[39,"李彦烨"],[40,"许佳俊"],
      [41,"刘海汛"],[42,"黄建桓"],[43,"许晓端"],[44,"李钡淇"],[45,"蔡金铭"],
      [46,"朱春燕"],[47,"杨裕鑫"],[48,"梁航维"],[49,"蔡烨川"],[50,"李晓橦"],
      [51,"范锦辉"],[52,"蔡明璋"],[53,"杨松权"],[54,"范晓楦"],[55,"李永灿"]
    ];

    const students = rawStudents.map(([seatNo, name]) => ({
      id: 'stu_' + seatNo,
      classId: classId,
      name: name,
      studentNo: '2024' + String(seatNo).padStart(3, '0'),
      seatNo: String(seatNo),
      gender: '',
      age: '',
      birthday: '',
      phone: '',
      parentName: '',
      parentPhone: '',
      address: '',
      dorm: '走读',
      note: '',
      role: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    // 追加到现有学生数据（避免覆盖其他班级）
    const existingStudents = this.get('students') || [];
    this.set('students', existingStudents.concat(students));

    // 考试：七年级期末统考
    const exam = {
      id: 'exam_qi_final',
      classId: classId,
      name: '七年级期末统考',
      date: '2026-07-01',
      subjects: ['语文', '数学', '英语', '政治', '历史', '生物', '地理'],
      fullScore: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const existingExams = this.get('exams') || [];
    this.set('exams', existingExams.concat([exam]));

    // 成绩数据（七年级期末统考）
    // [座号, 语文, 数学, 英语, 政治, 历史, 生物, 地理]  null=缺考
    const rawGrades = [
      [1,77,78,73,71,56,63,56],[2,82,72,102,81,70,72,85],[3,77,88,43,67,62,56,72],
      [4,75,70,61,83,26,36,65],[5,76,71,68,68,48,65,33],[6,74,43,51,85,65,52,76],
      [7,64,60,57,68,31,35,48],[8,80,78,50,72,54,42,52],[9,82,76,53,74,65,73,89],
      [10,64,20,41,59,33,29,28],[11,75,75,38,63,40,39,59],[12,53,78,48,72,42,69,62],
      [13,58,78,47,62,39,55,65],[14,77,63,61,74,61,69,64],[15,70,56,61,68,60,52,63],
      [16,53,44,39,61,26,36,39],[17,5,56,26,12,18,16,18],[18,76,56,50,62,38,49,75],
      [19,48,60,42,82,49,60,68],[20,83,87,58,67,44,88,75],[21,69,45,53,74,53,37,59],
      [22,64,74,36,71,46,42,65],[23,83,82,32,72,53,77,56],[24,77,71,58,77,47,36,73],
      [25,45,54,24,41,14,37,51],[26,78,71,43,69,78,95,84],[27,83,46,47,90,68,57,72],
      [28,64,61,66,78,51,43,60],[29,50,72,40,66,72,82,80],[30,48,36,34,56,null,24,16],
      [31,67,29,50,54,40,36,52],[32,66,53,34,83,18,32,39],[33,33,26,25,45,14,25,26],
      [34,43,34,21,55,32,25,37],[35,46,8,32,55,38,18,48],[36,10,6,26,42,18,14,10],
      [37,67,43,24,60,41,33,28],[38,83,48,40,73,56,38,69],[39,49,47,18,62,58,62,68],
      [40,66,71,20,67,26,37,51],[41,64,58,43,53,45,46,61],[42,46,27,17,48,27,19,27],
      [43,60,70,33,75,22,48,46],[44,48,27,42,60,26,32,53],[45,40,25,21,68,14,21,40],
      [46,58,23,36,65,49,39,50],[47,50,33,36,76,38,53,48],[48,34,36,26,56,31,45,59],
      [49,43,44,27,64,30,35,36],[50,50,6,28,49,20,32,24],[51,17,23,22,47,18,39,10],
      [52,25,9,28,42,16,12,12],[53,32,23,29,34,16,29,22],[54,30,21,27,55,14,14,28],
      [55,null,6,21,24,12,12,20]
    ];

    const subjects = ['语文', '数学', '英语', '政治', '历史', '生物', '地理'];
    const grades = rawGrades.map(([seatNo, ...scores]) => {
      const student = students.find(s => s.seatNo === String(seatNo));
      const scoreObj = {};
      const absent = [];
      let total = 0;
      let validCount = 0;
      scores.forEach((sc, i) => {
        if (sc === null) {
          scoreObj[subjects[i]] = 0;
          absent.push(subjects[i]);
        } else {
          scoreObj[subjects[i]] = sc;
          total += sc;
          validCount++;
        }
      });
      return {
        id: 'grade_' + seatNo,
        classId: classId,
        examId: exam.id,
        studentId: student.id,
        studentName: student.name,
        studentNo: student.studentNo,
        seatNo: String(seatNo),
        scores: scoreObj,
        absentSubjects: absent,
        total: total,
        average: validCount > 0 ? (total / validCount).toFixed(1) : '0',
        rank: 0,
        schoolRank: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    // 按总分排名
    grades.sort((a, b) => b.total - a.total);
    grades.forEach((g, i) => g.rank = i + 1);
    const existingGrades = this.get('grades') || [];
    this.set('grades', existingGrades.concat(grades));

    // 座位表（按座号排列）
    const existingSeating = this.get('seating') || [];
    this.set('seating', existingSeating.concat([{
      id: 'seating_qi_10',
      classId: classId,
      rows: 8,
      cols: 7,
      layout: students.map((s, i) => ({
        row: Math.floor(i / 7) + 1,
        col: (i % 7) + 1,
        studentId: s.id,
        studentName: s.name
      })),
      updatedAt: new Date().toISOString()
    }]));
  },

  // 插入示例数据（八年级10班）
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

    // 追加到现有学生数据（避免覆盖其他班级）
    const existingStudents = this.get('students') || [];
    this.set('students', existingStudents.concat(students));

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
    const existingExams2 = this.get('exams') || [];
    this.set('exams', existingExams2.concat(exams));

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
    const existingGrades2 = this.get('grades') || [];
    this.set('grades', existingGrades2.concat(grades));

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
    const existingHw = this.get('homework') || [];
    this.set('homework', existingHw.concat(homework));

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
    const existingRecords = this.get('homeworkRecords') || [];
    this.set('homeworkRecords', existingRecords.concat(hwRecords));

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
    const existingSeating2 = this.get('seating') || [];
    this.set('seating', existingSeating2.concat([{
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
    }]));
  }
};
