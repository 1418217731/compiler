// 本地数据存储管理系统 (基于 IndexedDB)
class Database {
    constructor() {
        this.dbName = 'SchoolDB';
        this.dbVersion = 2; // 升级版本以添加 templates
        this.db = null;
        
        // 内存缓存，保证同步读取 API 的兼容性
        this.cache = {
            teachers: [],
            students: [],
            homework: [],
            submissions: [],
            codeLibrary: [],
            currentUser: null,
            projects: {}, // 缓存项目数据 key: userId, value: projectData
            templates: [] // 缓存自定义模板
        };

        // 初始化 Promise
        this.ready = this.initDatabase();
    }

    // 初始化数据库
    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error("Database error: " + event.target.errorCode);
                reject(event.target.error);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 创建对象仓库
                if (!db.objectStoreNames.contains('teachers')) db.createObjectStore('teachers', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('students')) db.createObjectStore('students', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('homework')) db.createObjectStore('homework', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('submissions')) db.createObjectStore('submissions', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('codeLibrary')) db.createObjectStore('codeLibrary', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'userId' });
                if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
                if (!db.objectStoreNames.contains('templates')) db.createObjectStore('templates', { keyPath: 'id' });
            };

            request.onsuccess = async (event) => {
                this.db = event.target.result;
                console.log("IndexedDB initialized");
                await this.loadAllData();
                resolve(this);
            };
        });
    }

    // 从 IndexedDB 加载所有数据到内存缓存
    async loadAllData() {
        try {
            this.cache.teachers = await this.getAllFromStore('teachers');
            this.cache.students = await this.getAllFromStore('students');
            this.cache.homework = await this.getAllFromStore('homework');
            this.cache.submissions = await this.getAllFromStore('submissions');
            this.cache.codeLibrary = await this.getAllFromStore('codeLibrary');
            this.cache.templates = await this.getAllFromStore('templates');
            
            // 加载当前用户
            const userSetting = await this.getFromStore('settings', 'currentUser');
            this.cache.currentUser = userSetting ? userSetting.value : null;

            // 如果是首次运行（无数据），尝试从 LocalStorage 迁移或初始化默认数据
            if (this.cache.teachers.length === 0 && this.cache.students.length === 0) {
                this.migrateFromLocalStorage();
            }

        } catch (e) {
            console.error("Error loading data:", e);
        }
    }

    // 通用 IndexedDB 操作辅助方法
    getAllFromStore(storeName) {
        return new Promise((resolve) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve([]);
        });
    }

    getFromStore(storeName, key) {
        return new Promise((resolve) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        });
    }

    putToStore(storeName, data) {
        return new Promise((resolve) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
        });
    }

    deleteFromStore(storeName, key) {
        return new Promise((resolve) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
        });
    }

    clearStore(storeName) {
         return new Promise((resolve) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            request.onsuccess = () => resolve();
        });
    }

    // 从 LocalStorage 迁移数据 (兼容旧版)
    migrateFromLocalStorage() {
        console.log("Migrating from LocalStorage...");
        const storage = window.localStorage;
        
        try {
            const teachers = JSON.parse(storage.getItem('teachers') || '[]');
            const students = JSON.parse(storage.getItem('students') || '[]');
            const homework = JSON.parse(storage.getItem('homework') || '[]');
            const submissions = JSON.parse(storage.getItem('submissions') || '[]');
            const codeLibrary = JSON.parse(storage.getItem('codeLibrary') || '[]');

            // 更新缓存
            this.cache.teachers = teachers;
            this.cache.students = students;
            this.cache.homework = homework;
            this.cache.submissions = submissions;
            this.cache.codeLibrary = codeLibrary;

            // 写入 IndexedDB
            teachers.forEach(t => this.putToStore('teachers', t));
            students.forEach(s => this.putToStore('students', s));
            homework.forEach(h => this.putToStore('homework', h));
            submissions.forEach(s => this.putToStore('submissions', s));
            codeLibrary.forEach(c => this.putToStore('codeLibrary', c));
        } catch(e) {
            console.error("Migration failed", e);
        }
    }

    // --- 业务逻辑 (保持 API 兼容性) ---

    // 用户管理
    getUsers(role) {
        return role === 'teacher' ? this.cache.teachers : this.cache.students;
    }

    saveUsers(role, users) {
        const storeName = role === 'teacher' ? 'teachers' : 'students';
        // 更新缓存
        this.cache[storeName] = users;
        
        // 异步：全量更新比较低效，但为了兼容性简单处理：清除旧的写入新的
        // 更好的做法是找出差异，但这里直接覆盖整个store有点危险，
        // 建议调用者尽量使用 addUser/updateUser。
        // 如果必须 saveUsers (批量覆盖)，先清空store再add
        this.clearStore(storeName).then(() => {
            users.forEach(u => this.putToStore(storeName, u));
        });
    }

    addUser(user) {
        const storeName = user.role === 'teacher' ? 'teachers' : 'students';
        
        if (!user.id) user.id = user.role + '-' + Date.now();
        if (!user.createdAt) user.createdAt = new Date().toISOString();
        
        // 更新缓存
        this.cache[storeName].push(user);
        
        // 更新 DB
        this.putToStore(storeName, user);
        return user;
    }

    getCurrentUser() {
        return this.cache.currentUser;
    }

    setCurrentUser(user) {
        this.cache.currentUser = user;
        this.putToStore('settings', { key: 'currentUser', value: user });
    }

    logout() {
        this.setCurrentUser(null);
    }

    // 默认项目结构
    getDefaultProject() {
        return {
            name: 'my-project',
            files: [
                {
                    id: 'file-1',
                    name: 'index.html',
                    type: 'html',
                    path: '/index.html',
                    content: `<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n    <meta charset="UTF-8">\n    <title>我的项目</title>\n    <link rel="stylesheet" href="style.css">\n</head>\n<body>\n    <h1>欢迎使用JavaScript在线编程平台</h1>\n    <div id="app"></div>\n    <script src="script.js"></script>\n</body>\n</html>`
                },
                {
                    id: 'file-2',
                    name: 'style.css',
                    type: 'css',
                    path: '/style.css',
                    content: `body {\n    font-family: Arial, sans-serif;\n    margin: 20px;\n    background: #f0f2f5;\n}\nh1 { color: #333; }`
                },
                {
                    id: 'file-3',
                    name: 'script.js',
                    type: 'javascript',
                    path: '/script.js',
                    content: `// JavaScript 代码\nconsole.log('Hello, World!');\ndocument.getElementById('app').innerHTML = '<p>开始编程吧！</p>';`
                }
            ],
            folders: []
        };
    }

    // 学生操作
    getStudents() {
        return this.cache.students;
    }

    addStudent(student) {
        return this.addUser({ ...student, role: 'student' });
    }

    updateStudent(id, updates) {
        const index = this.cache.students.findIndex(s => s.id === id);
        if (index !== -1) {
            const updatedStudent = { ...this.cache.students[index], ...updates };
            this.cache.students[index] = updatedStudent;
            this.putToStore('students', updatedStudent);
            return updatedStudent;
        }
        return null;
    }

    deleteStudent(id) {
        this.cache.students = this.cache.students.filter(s => s.id !== id);
        this.deleteFromStore('students', id);
    }

    importStudents(studentsData) {
        studentsData.forEach(student => {
            if (!this.cache.students.find(s => s.studentId === student.studentId)) {
                student.id = 'student-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                student.createdAt = new Date().toISOString();
                student.role = 'student';
                this.addStudent(student);
            }
        });
    }

    // 作业操作
    getHomework() {
        return this.cache.homework;
    }

    addHomework(homework) {
        if (!homework.id) homework.id = 'hw-' + Date.now();
        if (!homework.createdAt) homework.createdAt = new Date().toISOString();
        if (!homework.status) homework.status = 'active';
        
        this.cache.homework.push(homework);
        this.putToStore('homework', homework);
        return homework;
    }

    updateHomework(id, updates) {
        const index = this.cache.homework.findIndex(h => h.id === id);
        if (index !== -1) {
            const updated = { ...this.cache.homework[index], ...updates };
            this.cache.homework[index] = updated;
            this.putToStore('homework', updated);
            return updated;
        }
        return null;
    }

    deleteHomework(id) {
        this.cache.homework = this.cache.homework.filter(h => h.id !== id);
        this.deleteFromStore('homework', id);
        
        // 删除相关提交
        const relatedSubmissions = this.cache.submissions.filter(s => s.homeworkId === id);
        relatedSubmissions.forEach(s => this.deleteSubmission(s.id));
    }

    // 提交操作
    getSubmissions() {
        return this.cache.submissions;
    }

    addSubmission(submission) {
        if (!submission.id) submission.id = 'sub-' + Date.now();
        
        // 检查是否存在
        const existingIndex = this.cache.submissions.findIndex(
            s => s.studentId === submission.studentId && s.homeworkId === submission.homeworkId
        );
        
        if (existingIndex !== -1) {
            const updated = {
                 ...this.cache.submissions[existingIndex],
                 ...submission,
                 submittedAt: new Date().toISOString()
            };
            this.cache.submissions[existingIndex] = updated;
            this.putToStore('submissions', updated);
            return updated;
        } else {
            submission.submittedAt = new Date().toISOString();
            submission.status = 'submitted';
            this.cache.submissions.push(submission);
            this.putToStore('submissions', submission);
            return submission;
        }
    }

    updateSubmission(id, updates) {
        const index = this.cache.submissions.findIndex(s => s.id === id);
        if (index !== -1) {
            const updated = { ...this.cache.submissions[index], ...updates };
            if (updates.score !== undefined) {
                updated.status = 'graded';
                updated.gradedAt = new Date().toISOString();
            }
            this.cache.submissions[index] = updated;
            this.putToStore('submissions', updated);
            return updated;
        }
        return null;
    }

    deleteSubmission(id) {
        this.cache.submissions = this.cache.submissions.filter(s => s.id !== id);
        this.deleteFromStore('submissions', id);
    }
    
    getSubmissionsByStudent(studentId) {
        return this.cache.submissions.filter(s => s.studentId === studentId);
    }

    getSubmissionsByHomework(homeworkId) {
        return this.cache.submissions.filter(s => s.homeworkId === homeworkId);
    }

    getSubmission(studentId, homeworkId) {
        return this.cache.submissions.find(s => s.studentId === studentId && s.homeworkId === homeworkId);
    }

    gradeSubmission(id, score, feedback) {
        return this.updateSubmission(id, {
            score,
            feedback,
            graded: true
        });
    }

    // 代码库操作
    getCodeLibrary() {
        return this.cache.codeLibrary;
    }
    
    getCodeLib() { return this.getCodeLibrary(); }

    addToCodeLibrary(code) {
        if (!code.id) code.id = 'code-' + Date.now();
        code.createdAt = new Date().toISOString();
        this.cache.codeLibrary.push(code);
        this.putToStore('codeLibrary', code);
        return code;
    }
    
    addToCodeLib(code) { return this.addToCodeLibrary(code); }

    updateCodeLibrary(id, updates) {
         const index = this.cache.codeLibrary.findIndex(c => c.id === id);
         if (index !== -1) {
             const updated = { ...this.cache.codeLibrary[index], ...updates };
             this.cache.codeLibrary[index] = updated;
             this.putToStore('codeLibrary', updated);
             return updated;
         }
         return null;
    }

    deleteFromCodeLibrary(id) {
        this.cache.codeLibrary = this.cache.codeLibrary.filter(c => c.id !== id);
        this.deleteFromStore('codeLibrary', id);
    }
    
    deleteFromCodeLib(id) { return this.deleteFromCodeLibrary(id); }

    // 模板操作
    getTemplates() {
        return this.cache.templates;
    }

    addTemplate(template) {
        if (!template.id) template.id = 'tpl-' + Date.now();
        this.cache.templates.push(template);
        this.putToStore('templates', template);
        return template;
    }

    deleteTemplate(id) {
        this.cache.templates = this.cache.templates.filter(t => t.id !== id);
        this.deleteFromStore('templates', id);
    }

    // 项目操作 (异步获取，同步写入缓存)
    
    getTeacherProjects() {
        const user = this.getCurrentUser();
        if (!user) return this.getDefaultProject();
        
        // 检查缓存
        const key = user.id; // 使用 userId 作为 key
        if (this.cache.projects[key]) {
            return this.cache.projects[key];
        }
        return this.getDefaultProject();
    }
    
    // 新增：异步加载项目的方法，供 App 初始化调用
    async loadUserProjects(userId) {
        const project = await this.getFromStore('projects', userId);
        if (project) {
            this.cache.projects[userId] = project;
            return project;
        }
        return null;
    }

    saveTeacherProjects(projects) {
        const user = this.getCurrentUser();
        if (!user) return;
        
        const key = user.id;
        this.cache.projects[key] = projects;
        
        // Save with userId as key
        this.putToStore('projects', { userId: key, ...projects });
    }
    
    getStudentProjects(studentId) {
        // 同理
        if (this.cache.projects[studentId]) return this.cache.projects[studentId];
        return this.getDefaultProject();
    }
    
    saveStudentProjects(studentId, projects) {
        this.cache.projects[studentId] = projects;
        this.putToStore('projects', { userId: studentId, ...projects });
    }

    // 清空所有数据
    async clearAll() {
        this.cache = {
            teachers: [],
            students: [],
            homework: [],
            submissions: [],
            codeLibrary: [],
            currentUser: null,
            projects: {},
            templates: []
        };
        
        await this.clearStore('teachers');
        await this.clearStore('students');
        await this.clearStore('homework');
        await this.clearStore('submissions');
        await this.clearStore('codeLibrary');
        await this.clearStore('projects');
        await this.clearStore('settings');
        await this.clearStore('templates');
        
        this.initDatabase();
    }

    // 导出数据 (生成 JSON 文件)
    exportDatabase() {
        const data = {
            teachers: this.cache.teachers,
            students: this.cache.students,
            homework: this.cache.homework,
            submissions: this.cache.submissions,
            codeLibrary: this.cache.codeLibrary,
            templates: this.cache.templates,
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `school_db_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // 导入数据 (读取 JSON 文件)
    async importDatabase(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // 更新缓存和DB
                    if (Array.isArray(data.teachers)) await this.saveUsers('teacher', data.teachers);
                    if (Array.isArray(data.students)) await this.saveUsers('student', data.students);
                    if (Array.isArray(data.homework)) {
                        await this.clearStore('homework');
                        this.cache.homework = data.homework;
                        data.homework.forEach(h => this.putToStore('homework', h));
                    }
                    if (Array.isArray(data.submissions)) {
                        await this.clearStore('submissions');
                        this.cache.submissions = data.submissions;
                        data.submissions.forEach(s => this.putToStore('submissions', s));
                    }
                    if (Array.isArray(data.codeLibrary)) {
                        await this.clearStore('codeLibrary');
                        this.cache.codeLibrary = data.codeLibrary;
                        data.codeLibrary.forEach(c => this.putToStore('codeLibrary', c));
                    }
                    if (Array.isArray(data.templates)) {
                        await this.clearStore('templates');
                        this.cache.templates = data.templates;
                        data.templates.forEach(t => this.putToStore('templates', t));
                    }
                    
                    resolve(true);
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsText(file);
        });
    }
    
    // 兼容旧名
    exportData() { return this.exportDatabase(); }
    importData(data) { console.warn("Use importDatabase with file object instead"); }
}

// 创建全局数据库实例
const db = new Database();
