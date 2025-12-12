// 教师端应用
class TeacherApp {
    constructor() {
        this.currentUser = db.getCurrentUser();
        if (!this.currentUser || this.currentUser.role !== 'teacher') {
            alert('请先登录教师账号！');
            window.location.href = 'index.html';
            return;
        }
        
        this.init();
    }

    init() {
        console.log('教师端初始化成功');
        // 默认显示仪表盘
        this.renderDashboard();
        
        // 预加载其他视图数据
        this.renderStudents();
        this.renderHomework();
        this.renderCodeLib();
        this.renderGrading();
    }

    // 仪表盘
    renderDashboard() {
        const statsContainer = document.getElementById('dashboard-stats');
        const todosContainer = document.getElementById('dashboard-todos');
        const recentContainer = document.getElementById('dashboard-recent-subs');
        
        if (!statsContainer) return;

        // 收集数据
        const students = db.getUsers('student');
        const homework = db.getHomework();
        const submissions = db.getSubmissions();
        const ungraded = submissions.filter(s => !s.graded);
        const codeLib = db.getCodeLib();

        // 渲染统计卡片
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">👥</div>
                <div class="stat-info">
                    <div class="stat-value">${students.length}</div>
                    <div class="stat-label">学生总数</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📝</div>
                <div class="stat-info">
                    <div class="stat-value">${homework.length}</div>
                    <div class="stat-label">已发布作业</div>
                </div>
            </div>
            <div class="stat-card warning">
                <div class="stat-icon">✍️</div>
                <div class="stat-info">
                    <div class="stat-value">${ungraded.length}</div>
                    <div class="stat-label">待批改作业</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📚</div>
                <div class="stat-info">
                    <div class="stat-value">${codeLib.length}</div>
                    <div class="stat-label">代码库资源</div>
                </div>
            </div>
        `;

        // 渲染待办事项 (如果有待批改作业)
        todosContainer.innerHTML = '';
        if (ungraded.length > 0) {
            const topUngraded = ungraded.slice(0, 5);
            topUngraded.forEach(sub => {
                const hw = homework.find(h => h.id === sub.homeworkId);
                const student = students.find(s => s.id === sub.studentId);
                
                const div = document.createElement('div');
                div.className = 'todo-item';
                div.innerHTML = `
                    <div class="todo-content">
                        <strong>批改作业:</strong> ${hw ? hw.title : '未知'} 
                        <span class="text-muted">- ${student ? student.name : '未知学生'}</span>
                    </div>
                    <button class="btn-xs btn-primary" onclick="teacherApp.jumpToGrading('${sub.id}')">去批改</button>
                `;
                todosContainer.appendChild(div);
            });
            if (ungraded.length > 5) {
                todosContainer.innerHTML += `<div class="text-center text-muted" style="padding: 10px;">还有 ${ungraded.length - 5} 个待批改...</div>`;
            }
        } else {
            todosContainer.innerHTML = '<div class="empty-state">🎉 暂无待办事项，所有作业已批改！</div>';
        }

        // 渲染最新提交
        recentContainer.innerHTML = '';
        const recentSubs = [...submissions].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)).slice(0, 5);
        if (recentSubs.length > 0) {
            recentSubs.forEach(sub => {
                const hw = homework.find(h => h.id === sub.homeworkId);
                const student = students.find(s => s.id === sub.studentId);
                
                const div = document.createElement('div');
                div.className = 'recent-item';
                div.innerHTML = `
                    <div class="recent-info">
                        <span class="recent-time">${new Date(sub.submittedAt).toLocaleDateString()}</span>
                        <span>${student ? student.name : '未知'} 提交了 ${hw ? hw.title : '未知作业'}</span>
                    </div>
                    <span class="status-tag ${sub.graded ? 'graded' : 'pending'}">${sub.graded ? '已批改' : '待批改'}</span>
                `;
                recentContainer.appendChild(div);
            });
        } else {
            recentContainer.innerHTML = '<div class="empty-state">暂无提交记录</div>';
        }
    }
    
    // 快捷跳转
    jumpToGrading(submissionId) {
        this.closeModal();
        // 切换 tab
        const btn = document.querySelector('.nav-btn[data-view="grading"]');
        if (btn) btn.click();
        
        // 滚动到对应位置
        setTimeout(() => {
            const element = document.getElementById(`submission-card-${submissionId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // 高亮一下
                element.style.transition = 'border-color 0.5s';
                const originalBorder = element.style.borderColor;
                element.style.borderColor = '#00f3ff';
                setTimeout(() => {
                    element.style.borderColor = originalBorder;
                }, 2000);
            } else {
                // 如果没有找到，刷新并重试
                this.renderGrading();
                setTimeout(() => {
                     const el = document.getElementById(`submission-card-${submissionId}`);
                     if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 50);
            }
        }, 100);
    }

    // 学生管理
    renderStudents() {
        const container = document.getElementById('students-list');
        if (!container) return;

        const students = db.getUsers('student');
        container.innerHTML = '';

        if (students.length === 0) {
            container.innerHTML = '<p style="color: #999;">暂无学生</p>';
            return;
        }

        students.forEach(student => {
            const card = document.createElement('div');
            card.className = 'student-card';
            card.innerHTML = `
                <h3>${student.name || student.username}</h3>
                <p>学号: ${student.studentId || '未设置'}</p>
                <p>用户名: ${student.username}</p>
                <div class="actions">
                    <button class="btn-secondary" onclick="teacherApp.viewStudentWork('${student.id}')">查看作业</button>
                    <button class="btn-danger" onclick="teacherApp.deleteStudent('${student.id}')">删除</button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    addStudent() {
        const modalHtml = `
            <div class="modal" style="width: 500px;">
                <div class="modal-header">
                    <h2>添加新学生</h2>
                    <button class="modal-close-btn" onclick="teacherApp.closeModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">用户名</label>
                        <input type="text" id="student-username" class="form-input" placeholder="请输入用户名">
                    </div>
                    <div class="form-group">
                        <label class="form-label">初始密码</label>
                        <input type="text" id="student-password" class="form-input" placeholder="请输入初始密码" value="123456">
                    </div>
                    <div class="form-group">
                        <label class="form-label">姓名</label>
                        <input type="text" id="student-name" class="form-input" placeholder="请输入真实姓名">
                    </div>
                    <div class="form-group">
                        <label class="form-label">学号</label>
                        <input type="text" id="student-id" class="form-input" placeholder="请输入学号">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="teacherApp.closeModal()">取消</button>
                    <button class="btn-primary" onclick="teacherApp.submitAddStudent()">确定添加</button>
                </div>
            </div>
        `;
        this.openModal(modalHtml);
    }

    submitAddStudent() {
        const username = document.getElementById('student-username').value.trim();
        const password = document.getElementById('student-password').value.trim();
        const name = document.getElementById('student-name').value.trim();
        const studentId = document.getElementById('student-id').value.trim();

        if (!username) {
            alert('请输入用户名！');
            return;
        }
        if (!password) {
            alert('请输入密码！');
            return;
        }
        if (!name) {
            alert('请输入姓名！');
            return;
        }
        if (!studentId) {
            alert('请输入学号！');
            return;
        }

        const students = db.getUsers('student');
        if (students.find(s => s.username === username)) {
            alert('用户名已存在！');
            return;
        }

        db.addUser({
            username,
            password,
            name,
            studentId,
            role: 'student'
        });

        alert('学生添加成功！');
        this.closeModal();
        this.renderStudents();
        this.renderDashboard(); // 更新仪表盘
    }

    deleteStudent(studentId) {
        if (!confirm('确定要删除该学生吗？')) return;
        
        const students = db.getUsers('student');
        const index = students.findIndex(s => s.id === studentId);
        if (index !== -1) {
            students.splice(index, 1);
            db.saveUsers('student', students);
            this.renderStudents();
            this.renderDashboard(); // 更新仪表盘
        }
    }

    searchStudents() {
        const searchTerm = document.getElementById('student-search').value.toLowerCase();
        const students = db.getUsers('student');
        const filtered = students.filter(s => 
            (s.name && s.name.toLowerCase().includes(searchTerm)) ||
            (s.studentId && s.studentId.toLowerCase().includes(searchTerm)) ||
            s.username.toLowerCase().includes(searchTerm)
        );

        const container = document.getElementById('students-list');
        container.innerHTML = '';

        filtered.forEach(student => {
            const card = document.createElement('div');
            card.className = 'student-card';
            card.innerHTML = `
                <h3>${student.name || student.username}</h3>
                <p>学号: ${student.studentId || '未设置'}</p>
                <p>用户名: ${student.username}</p>
                <div class="actions">
                    <button class="btn-secondary" onclick="teacherApp.viewStudentWork('${student.id}')">查看作业</button>
                    <button class="btn-danger" onclick="teacherApp.deleteStudent('${student.id}')">删除</button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    importStudents() {
        const modalHtml = `
            <div class="modal" style="width: 550px;">
                <div class="modal-header">
                    <h2>批量导入学生</h2>
                    <button class="modal-close-btn" onclick="teacherApp.closeModal()">×</button>
                </div>
                <div class="modal-body">
                    <div style="color: var(--text-primary); line-height: 1.6;">
                        <p>请上传 <strong>CSV</strong> 格式的学生名单文件。</p>
                        
                        <div style="margin-top: 20px;">
                            <label class="form-label">文件内容格式示例：</label>
                            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 4px; border: 1px solid var(--border-color); font-family: 'Consolas', monospace; font-size: 13px;">
                                <div style="color: var(--text-secondary); margin-bottom: 8px;">// 每行一个学生，使用英文逗号分隔</div>
                                <div style="color: var(--accent-color); margin-bottom: 4px;">username,password,name,studentId</div>
                                <div style="color: var(--text-bright);">zhangsan,123456,张三,2023001</div>
                                <div style="color: var(--text-bright);">lisi,123456,李四,2023002</div>
                            </div>
                        </div>

                        <div style="margin-top: 15px; font-size: 13px; color: var(--text-secondary);">
                            <p>⚠️ 注意事项：</p>
                            <ul style="padding-left: 20px; margin-top: 5px;">
                                <li>如果第一行包含 "username" 或 "用户名"，将作为表头自动跳过。</li>
                                <li>如果用户名已存在，该条记录将被跳过。</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="teacherApp.closeModal()">取消</button>
                    <button class="btn-primary" onclick="document.getElementById('student-upload').click(); teacherApp.closeModal();">📂 选择文件导入</button>
                </div>
            </div>
        `;
        this.openModal(modalHtml);
    }

    handleStudentImport(input) {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const lines = content.split(/\r\n|\n/);
            let successCount = 0;
            let failCount = 0;
            
            // 简单判断是否包含标题行
            let startIndex = 0;
            if (lines.length > 0) {
                const firstLine = lines[0].toLowerCase();
                if (firstLine.includes('username') || firstLine.includes('用户名')) {
                    startIndex = 1;
                }
            }

            const currentStudents = db.getUsers('student');

            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                // 格式：用户名,密码,姓名,学号
                const parts = line.split(',');
                if (parts.length < 2) {
                    failCount++;
                    continue;
                }

                const username = parts[0].trim();
                const password = parts[1].trim();
                const name = parts.length > 2 ? parts[2].trim() : '';
                const studentId = parts.length > 3 ? parts[3].trim() : '';

                if (!username || !password) {
                    failCount++;
                    continue;
                }

                // 检查用户名是否存在 (重新获取最新列表或者在循环中检查)
                // 注意：db.addUser 内部可能也会检查，但这里先预检
                if (currentStudents.find(s => s.username === username)) {
                    failCount++; // 用户名已存在
                    console.warn(`用户 ${username} 已存在，跳过`);
                    continue; 
                }

                try {
                    db.addUser({
                        username,
                        password,
                        name,
                        studentId,
                        role: 'student'
                    });
                    // 更新本地缓存列表以防重复添加相同用户名的行
                    currentStudents.push({ username }); 
                    successCount++;
                } catch(e) {
                    failCount++;
                    console.error(`添加用户 ${username} 失败`, e);
                }
            }

            alert(`导入完成！\n成功导入: ${successCount} 人\n失败/跳过: ${failCount} 人`);
            this.renderStudents();
            this.renderDashboard();
            input.value = ''; // Reset input
        };
        reader.onerror = () => {
            alert('读取文件失败');
            input.value = '';
        };
        reader.readAsText(file);
    }

    exportStudents() {
        const students = db.getUsers('student');
        const csv = students.map(s => 
            `${s.username},${s.name || ''},${s.studentId || ''}`
        ).join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'students.csv';
        a.click();
    }

    viewStudentWork(studentId) {
        alert(`查看学生 ${studentId} 的作业（功能开发中）`);
    }

    // 作业管理
    renderHomework() {
        const container = document.getElementById('homework-list');
        if (!container) return;

        const homework = db.getHomework();
        container.innerHTML = '';

        if (homework.length === 0) {
            container.innerHTML = '<p style="color: #999;">暂无作业</p>';
            return;
        }

        homework.forEach(hw => {
            const card = document.createElement('div');
            card.className = 'homework-card';
            card.innerHTML = `
                <div class="homework-header">
                    <h3>${hw.title}</h3>
                    <span class="homework-status status-pending">进行中</span>
                </div>
                <div class="homework-info">
                    <p>📅 截止时间: ${new Date(hw.deadline).toLocaleString()}</p>
                    <p>📊 提交情况: ${hw.submissions || 0} 人已提交</p>
                </div>
                <div class="homework-description">
                    ${hw.description}
                    ${hw.attachments && hw.attachments.length > 0 ? `
                        <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
                            <strong style="color:#aaa; font-size:0.9em;">📎 附件:</strong>
                            <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:5px;">
                                ${hw.attachments.map(att => `
                                    <a href="${att.content}" download="${att.name}" style="color:#00f3ff; text-decoration:none; font-size:0.9em; display:flex; align-items:center; background:rgba(0,243,255,0.1); padding:2px 8px; border-radius:4px;">
                                        📄 ${att.name} <span style="opacity:0.6; font-size:0.8em; margin-left:5px;">(${Math.round(att.size/1024)}KB)</span>
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="homework-actions">
                    <button class="btn-secondary" onclick="teacherApp.editHomework('${hw.id}')">编辑</button>
                    <button class="btn-secondary" onclick="teacherApp.viewSubmissions('${hw.id}')">查看提交</button>
                    <button class="btn-danger" onclick="teacherApp.deleteHomework('${hw.id}')">删除</button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    createHomework() {
        // 获取当前时间作为最小值
        const now = new Date();
        const nowStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

        const modalHtml = `
            <div class="modal" style="width: 600px;">
                <div class="modal-header">
                    <h2>布置新作业</h2>
                    <button class="modal-close-btn" onclick="teacherApp.closeModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">作业标题</label>
                        <input type="text" id="hw-title" class="form-input" placeholder="请输入作业标题">
                    </div>
                    <div class="form-group">
                        <label class="form-label">作业描述</label>
                        <textarea id="hw-desc" class="form-textarea" rows="6" placeholder="请输入作业详细要求..."></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">截止日期</label>
                        <input type="datetime-local" id="hw-deadline" class="form-input" min="${nowStr}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">附件 (可选, 支持多文件)</label>
                        <input type="file" id="hw-attachments" class="form-input" multiple>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="teacherApp.closeModal()">取消</button>
                    <button class="btn-primary" id="submit-hw-btn" onclick="teacherApp.submitCreateHomework()">发布作业</button>
                </div>
            </div>
        `;
        this.openModal(modalHtml);
    }

    submitCreateHomework() {
        const title = document.getElementById('hw-title').value.trim();
        const description = document.getElementById('hw-desc').value.trim();
        const deadline = document.getElementById('hw-deadline').value;
        const attachmentInput = document.getElementById('hw-attachments');
        const submitBtn = document.getElementById('submit-hw-btn');

        if (!title) {
            alert('请输入作业标题');
            return;
        }
        if (!description) {
            alert('请输入作业描述');
            return;
        }
        if (!deadline) {
            alert('请选择截止日期');
            return;
        }

        // Disable button to prevent multiple clicks
        if (submitBtn) submitBtn.disabled = true;
        if (submitBtn) submitBtn.innerHTML = '处理中...';

        // 处理附件
        const attachments = [];
        const files = Array.from(attachmentInput.files);
        
        const processFiles = async () => {
            for (const file of files) {
                // 限制文件大小 (例如 5MB)
                if (file.size > 1024 * 1024 * 5) {
                    if (!confirm(`文件 "${file.name}" 超过 5MB，可能会影响性能。是否跳过此文件？`)) {
                        // 如果用户不跳过，继续尝试读取
                    } else {
                        continue;
                    }
                }

                try {
                    const content = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = e => resolve(e.target.result); // Base64 string
                        reader.onerror = e => reject(e);
                        reader.readAsDataURL(file);
                    });
                    
                    attachments.push({
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        content: content
                    });
                } catch (e) {
                    console.error("Error reading file", file.name, e);
                    alert(`读取文件 ${file.name} 失败`);
                }
            }

            const homework = {
                id: 'hw-' + Date.now(),
                title,
                description,
                deadline,
                attachments, // Store attachments array
                createdAt: new Date().toISOString(),
                createdBy: this.currentUser.id,
                submissions: 0
            };

            db.addHomework(homework);
            this.closeModal();
            alert('作业创建成功！');
            this.renderHomework();
            this.renderDashboard();
        };

        processFiles();
    }

    editHomework(homeworkId) {
        alert(`编辑作业 ${homeworkId}（功能开发中）`);
    }

    deleteHomework(homeworkId) {
        if (!confirm('确定要删除该作业吗？')) return;
        
        db.deleteHomework(homeworkId);
        this.renderHomework();
        this.renderDashboard();
    }

    viewSubmissions(homeworkId) {
        const homework = db.getHomework().find(h => h.id === homeworkId);
        if (!homework) return;

        const submissions = db.getSubmissionsByHomework(homeworkId);
        const students = db.getUsers('student');

        let rows = '';
        if (submissions.length === 0) {
            rows = '<tr><td colspan="4" style="text-align:center; color:#999;">暂无提交</td></tr>';
        } else {
            rows = submissions.map(sub => {
                const student = students.find(s => s.id === sub.studentId);
                const studentName = student ? `${student.name || student.username} (${student.studentId || '无学号'})` : '未知学生';
                const status = sub.graded ? `<span class="status-tag graded">已批改 (${sub.score}分)</span>` : `<span class="status-tag pending">待批改</span>`;
                
                return `
                    <tr>
                        <td>${studentName}</td>
                        <td>${new Date(sub.submittedAt).toLocaleString()}</td>
                        <td>${status}</td>
                        <td>
                            <button class="btn-xs btn-primary" onclick="teacherApp.jumpToGrading('${sub.id}')">去批改</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        const modalHtml = `
            <div class="modal" style="width: 800px;">
                <div class="modal-header">
                    <h2>提交记录: ${homework.title}</h2>
                    <button class="modal-close-btn" onclick="teacherApp.closeModal()">×</button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 20px;">
                        <p><strong>作业描述:</strong> ${homework.description}</p>
                        <p><strong>截止时间:</strong> ${new Date(homework.deadline).toLocaleString()}</p>
                        <p><strong>提交统计:</strong> 已提交 ${submissions.length} / 总人数 ${students.length}</p>
                    </div>
                    <div style="max-height: 400px; overflow-y: auto;">
                        <table class="grades-table">
                            <thead>
                                <tr>
                                    <th>学生</th>
                                    <th>提交时间</th>
                                    <th>状态</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        this.openModal(modalHtml);
    }

    // 代码库管理
    renderCodeLib() {
        const container = document.getElementById('codelib-container');
        if (!container) return;

        const codeLib = db.getCodeLib();
        container.innerHTML = '';

        if (codeLib.length === 0) {
            container.innerHTML = '<p style="color: #999;">代码库为空</p>';
            return;
        }

        codeLib.forEach(item => {
            const card = document.createElement('div');
            card.className = 'codelib-item';
            
            let previewContent = '';
            let typeLabel = item.type || 'text';
            let isProject = item.type === 'project';

            if (isProject) {
                let projectData = item.structure;
                if (!projectData && item.code) {
                    try {
                        projectData = JSON.parse(item.code);
                    } catch(e) {}
                }
                const fileCount = projectData && projectData.files ? projectData.files.length : 0;
                typeLabel = 'Project';
                
                previewContent = `<div style="color:#aaa; font-size:13px; padding:10px; background:rgba(0,0,0,0.3); border-radius:4px; margin-bottom:10px;">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px;">
                        <span style="font-size:24px;">📁</span>
                        <div>
                            <div style="color:#fff; font-weight:bold;">${item.title}</div>
                            <div>包含 ${fileCount} 个文件</div>
                        </div>
                    </div>
                    <p style="margin-top:5px; font-style:italic; font-size:12px;">点击"加载"以在编辑器中打开完整项目结构</p>
                </div>`;
            } else {
                const codePreview = item.code.length > 2000 ? item.code.substring(0, 2000) + '\n... (内容过长已截断预览)' : item.code;
                previewContent = `<pre style="max-height: 150px; overflow:hidden; mask-image: linear-gradient(180deg, #000 60%, transparent);"><code>${this.escapeHtml(codePreview)}</code></pre>`;
            }

            card.innerHTML = `
                <div class="codelib-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <h3>${item.title}</h3>
                    <span class="badge" style="background:${isProject ? '#00f3ff' : '#333'}; color:${isProject ? '#000' : '#fff'}; padding:2px 6px; border-radius:4px; font-size:12px;">${typeLabel}</span>
                </div>
                <p style="color: #999; font-size: 12px; margin-bottom:10px;">创建于: ${new Date(item.createdAt).toLocaleDateString()}</p>
                ${previewContent}
                <div class="codelib-actions" style="margin-top:10px;">
                    <button class="btn-secondary" onclick="teacherApp.loadCodeFromLib('${item.id}')">加载到编辑器</button>
                    <button class="btn-secondary" onclick="teacherApp.editCodeLibItem('${item.id}')">编辑</button>
                    <button class="btn-danger" onclick="teacherApp.deleteFromCodeLib('${item.id}')">删除</button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    createCodeLibItem() {
        const title = prompt('请输入新建代码库(项目)的名称:');
        if (!title) return;

        // 创建一个包含默认文件的项目
        const emptyProject = {
            files: [
                {
                    id: 'file-' + Date.now(),
                    name: 'main.js',
                    type: 'javascript',
                    path: '/main.js',
                    content: '// ' + title + '\nconsole.log("Hello CodeLib!");',
                    createdAt: new Date().toISOString()
                }
            ],
            folders: []
        };

        const newItem = db.addToCodeLib({
            title: title,
            code: JSON.stringify(emptyProject),
            type: 'project', // 默认类型改为 project
            structure: emptyProject
        });

        // 刷新代码库视图
        this.renderCodeLib();
        this.renderDashboard();

        // 询问是否立即编辑
        if (confirm('代码库项目已创建。是否立即前往编辑器进行编辑？')) {
            this.loadCodeFromLib(newItem.id);
        }
    }

    editCodeLibItem(itemId) {
        // 直接加载到编辑器
        this.loadCodeFromLib(itemId);
    }

    // 旧的模态框相关方法已废弃，但保留 uploadCodeLib
    // showCodeLibModal, saveCodeLibItem 等不再需要

    uploadCodeLib(input) {
        const files = Array.from(input.files);
        if (!files.length) return;

        // 1. 过滤不需要的文件和文件夹
        const filteredFiles = files.filter(file => {
            const path = file.webkitRelativePath || file.name;
            // 忽略常见的大型依赖库和配置文件夹
            if (path.includes('node_modules/') || 
                path.includes('.git/') || 
                path.includes('.vscode/') || 
                path.includes('dist/') || 
                path.includes('build/')) {
                return false;
            }
            // 忽略非文本文件 (简单判断)
            if (file.size > 1024 * 500) return false; // Skip > 500KB
            const isText = file.name.match(/\.(js|html|css|json|txt|md|xml|py|java|c|cpp|h|ts|tsx|jsx)$/i);
            return !!isText;
        });

        if (filteredFiles.length === 0) {
            alert('没有找到有效的文本文件或代码文件。');
            input.value = '';
            return;
        }

        const projectName = filteredFiles[0].webkitRelativePath ? filteredFiles[0].webkitRelativePath.split('/')[0] : 'Uploaded-Project-' + Date.now();

        if (filteredFiles.length > 100) {
            if (!confirm(`即将上传 ${filteredFiles.length} 个文件，这可能需要一些时间。确定继续吗？`)) {
                input.value = '';
                return;
            }
        }

        // 显示进度提示
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'upload-loading';
        loadingDiv.style.position = 'fixed';
        loadingDiv.style.top = '50%';
        loadingDiv.style.left = '50%';
        loadingDiv.style.transform = 'translate(-50%, -50%)';
        loadingDiv.style.background = 'rgba(0, 0, 0, 0.9)';
        loadingDiv.style.color = '#00f3ff';
        loadingDiv.style.padding = '20px 40px';
        loadingDiv.style.borderRadius = '8px';
        loadingDiv.style.zIndex = '9999';
        loadingDiv.style.border = '1px solid #00f3ff';
        loadingDiv.innerHTML = `正在读取文件 0/${filteredFiles.length}...`;
        document.body.appendChild(loadingDiv);

        const projectData = {
            files: [],
            folders: []
        };
        
        // 辅助函数：根据路径创建/获取文件夹
        const ensureFolders = (filePath) => {
            // filePath: "Project/src/utils/helper.js"
            const parts = filePath.split('/');
            // parts: ["Project", "src", "utils", "helper.js"]
            // 根目录通常不在 fileManager 的 path 中显示，或者作为根
            // 这里我们假设 projectStructure 的根就是 Project 目录本身
            
            // 如果没有 webkitRelativePath，直接放在根目录
            if (parts.length <= 1) return '/';

            // 从第二层开始构建路径 (去掉项目名层级，因为它将作为容器)
            // 但为了保持结构完整，我们最好保留完整相对路径，或者将第一层视作根
            // TeacherEditor.fileManager expects paths starting with /
            
            let currentPath = '/';
            
            // parts.length - 1 because last part is filename
            // Skip index 0 (ProjectName) if we want content to be at root of editor
            // Let's keep the structure relative to the uploaded folder root.
            
            for (let i = 1; i < parts.length - 1; i++) {
                const folderName = parts[i];
                const folderPath = currentPath + folderName + '/';
                
                let folder = projectData.folders.find(f => f.path === folderPath);
                if (!folder) {
                    folder = {
                        id: 'folder-' + Date.now() + Math.floor(Math.random() * 100000),
                        name: folderName,
                        path: folderPath,
                        createdAt: new Date().toISOString()
                    };
                    projectData.folders.push(folder);
                }
                currentPath = folderPath;
            }
            return currentPath;
        };

        // 批量读取文件
        let processedCount = 0;
        
        const processChunk = (startIndex) => {
            const chunkSize = 10; 
            const endIndex = Math.min(startIndex + chunkSize, filteredFiles.length);
            
            const promises = [];

            for (let i = startIndex; i < endIndex; i++) {
                const file = filteredFiles[i];
                
                const promise = new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const content = e.target.result;
                        const type = file.name.endsWith('.js') ? 'javascript' :
                                     file.name.endsWith('.html') ? 'html' :
                                     file.name.endsWith('.css') ? 'css' : 'text';
                        
                        // Determine path
                        let path = '/';
                        if (file.webkitRelativePath) {
                            path = ensureFolders(file.webkitRelativePath);
                        }

                        projectData.files.push({
                            id: 'file-' + Date.now() + Math.floor(Math.random() * 100000),
                            name: file.name,
                            type: type,
                            path: path + file.name, // 完整路径，例如 /src/utils/helper.js
                            content: content,
                            createdAt: new Date().toISOString()
                        });

                        processedCount++;
                        resolve();
                    };
                    reader.onerror = () => {
                        console.error('Read error:', file.name);
                        processedCount++;
                        resolve();
                    };
                    reader.readAsText(file);
                });
                promises.push(promise);
            }

            Promise.all(promises).then(() => {
                 if (document.getElementById('upload-loading')) {
                    document.getElementById('upload-loading').innerHTML = `正在读取文件 ${processedCount}/${filteredFiles.length}...`;
                }

                if (endIndex < filteredFiles.length) {
                    setTimeout(() => processChunk(endIndex), 50);
                } else {
                    // 全部完成，保存到 DB
                    document.getElementById('upload-loading').innerHTML = `正在保存项目...`;
                    
                    db.addToCodeLib({
                        title: projectName,
                        type: 'project',
                        code: JSON.stringify(projectData), // 将结构存储在 code 字段中，或者是新增一个字段
                        // 为了兼容现有结构，我们暂时存 JSON 到 code，或者我们可以扩展 database schema
                        // 更好的做法是扩展 schema，但在不改动 database.js 核心逻辑的前提下，
                        // 我们可以利用 'project' 类型标记，并把 JSON 放在 code 里
                        structure: projectData // 同时保存结构对象以便后续扩展使用
                    });

                    document.getElementById('upload-loading').remove();
                    this.renderCodeLib();
                    this.renderDashboard();
                    alert(`项目 "${projectName}" 导入成功！包含 ${projectData.files.length} 个文件。`);
                    input.value = '';
                }
            });
        };

        processChunk(0);
    }

    // 模态框辅助方法
    openModal(contentHtml) {
        const overlay = document.getElementById('modal-overlay');
        const container = document.getElementById('modal-container');
        if (overlay && container) {
            container.innerHTML = contentHtml;
            overlay.classList.add('active');
            container.style.display = 'flex';
            container.style.justifyContent = 'center';
            container.style.alignItems = 'center';
            container.style.position = 'fixed';
            container.style.top = '0';
            container.style.left = '0';
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.zIndex = '1001'; // Above overlay
            
            // Close on overlay click
            overlay.onclick = () => this.closeModal();
        }
    }

    closeModal() {
        const overlay = document.getElementById('modal-overlay');
        const container = document.getElementById('modal-container');
        if (overlay && container) {
            overlay.classList.remove('active');
            container.innerHTML = '';
            container.style.display = 'none';
        }
    }

    loadCodeFromLib(itemId) {
        const item = db.getCodeLib().find(i => i.id === itemId);
        if (!item) return;

        // 切换到编辑器视图
        const editorBtn = document.querySelector('.nav-btn[data-view="editor"]');
        if (editorBtn) {
            editorBtn.click();
        }

        // 清空当前编辑器的工作区（不保留之前的文件记录）
        teacherEditor.fileManager.clearAll();
        
        // 标记当前编辑器的“根”关联了哪个 CodeLib Item
        teacherEditor.currentCodeLibId = itemId;
        teacherEditor.currentCodeLibTitle = item.title;

        if (item.type === 'project') {
            // 加载项目结构
            let projectData = item.structure;
            if (!projectData && item.code) {
                try {
                    projectData = JSON.parse(item.code);
                } catch(e) {
                    console.error("Failed to parse project data", e);
                }
            }

            if (projectData) {
                // 恢复文件夹
                if (projectData.folders) {
                    // 确保 folders 数组存在
                    if (!teacherEditor.fileManager.projects.folders) teacherEditor.fileManager.projects.folders = [];
                    
                    projectData.folders.forEach(f => {
                        // Create folder bypassing normal createFolder which generates ID
                        teacherEditor.fileManager.projects.folders.push(f);
                    });
                }
                
                // 恢复文件
                if (projectData.files) {
                    // 确保 files 数组存在
                    if (!teacherEditor.fileManager.projects.files) teacherEditor.fileManager.projects.files = [];
                    
                    projectData.files.forEach(f => {
                        teacherEditor.fileManager.projects.files.push(f);
                    });
                }

                // 标记第一个文件为打开状态
                if (projectData.files && projectData.files.length > 0) {
                    // teacherEditor.openFile(projectData.files[0].id); // Delay open until render
                }
            }
        } else {
            // 兼容旧的单文件模式
            const fileName = item.title.endsWith('.js') || item.title.endsWith('.html') || item.title.endsWith('.css') 
                                ? item.title 
                                : item.title + (item.type === 'javascript' ? '.js' : '.' + item.type);
            
            teacherEditor.fileManager.createFile(fileName, item.code);
        }

        teacherEditor.renderFileTree();
        teacherEditor.renderTabs();
        
        // 如果有文件，打开第一个
        const files = teacherEditor.fileManager.getAllFiles();
        if (files.length > 0) {
            teacherEditor.openFile(files[0].id);
        } else {
            if (teacherEditor.codeEditor) teacherEditor.codeEditor.value = '';
        }

        // 重置预览
        teacherEditor.clearPreview();
        
        // 提示用户
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.background = 'rgba(0, 243, 255, 0.1)';
        notification.style.border = '1px solid #00f3ff';
        notification.style.color = '#00f3ff';
        notification.style.padding = '15px';
        notification.style.borderRadius = '4px';
        notification.style.zIndex = '1000';
        notification.innerHTML = `正在编辑代码库项目: <strong>${item.title}</strong><br><small>点击“加入代码库”按钮可保存更改</small>`;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 3000);
    }

    deleteFromCodeLib(itemId) {
        if (!confirm('确定要删除该代码吗？')) return;
        
        db.deleteFromCodeLib(itemId);
        this.renderCodeLib();
        this.renderDashboard();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 批改作业
    renderGrading() {
        const container = document.getElementById('grading-container');
        if (!container) return;

        // 只显示待批改的，或者把待批改的排在前面
        const submissions = db.getSubmissions().sort((a, b) => {
            if (a.graded === b.graded) {
                return new Date(b.submittedAt) - new Date(a.submittedAt);
            }
            return a.graded ? 1 : -1; // 未批改在前
        });
        
        container.innerHTML = '';

        if (submissions.length === 0) {
            container.innerHTML = '<p style="color: #999;">暂无提交记录</p>';
            return;
        }

        submissions.forEach(sub => {
            const student = db.getUsers('student').find(s => s.id === sub.studentId);
            const homework = db.getHomework().find(h => h.id === sub.homeworkId);

            // 检查是否为项目类型提交
            let codeDisplay = '';
            if (sub.type === 'project' || (sub.structure && sub.structure.files)) {
                const fileCount = sub.structure ? sub.structure.files.length : '若干';
                codeDisplay = `
                    <div style="background: #0a0e17; border: 1px solid #333; padding: 20px; border-radius: 4px; margin: 20px 0; text-align: center;">
                        <div style="font-size: 40px; margin-bottom: 10px;">📁</div>
                        <h4 style="color: #00f3ff; margin-bottom: 5px;">项目提交</h4>
                        <p style="color: #999; font-size: 13px; margin-bottom: 15px;">包含 ${fileCount} 个文件</p>
                        <button class="btn-secondary" onclick="teacherApp.loadSubmission('${sub.id}')">💻 在编辑器中打开预览</button>
                    </div>
                `;
            } else {
                // 兼容旧的单文件
                codeDisplay = `<div class="submission-code"><pre><code>${this.escapeHtml(sub.code)}</code></pre></div>`;
            }

            const card = document.createElement('div');
            card.className = 'submission-card';
            card.id = `submission-card-${sub.id}`;
            card.innerHTML = `
                <div class="submission-header">
                    <div class="submission-info">
                        <h3>${homework ? homework.title : '未知作业'}</h3>
                        <p>学生: ${student ? student.name : '未知'} (${student ? student.studentId : ''})</p>
                        <p>提交时间: ${new Date(sub.submittedAt).toLocaleString()}</p>
                    </div>
                    <span class="homework-status ${sub.graded ? 'status-graded' : 'status-submitted'}">
                        ${sub.graded ? '已批改' : '待批改'}
                    </span>
                </div>
                
                ${codeDisplay}

                ${sub.graded ? `
                    <div class="grading-result">
                        <div class="grading-score-display">
                            <div class="score-label">最终得分</div>
                            <div class="score-value">${sub.score}</div>
                        </div>
                        <div class="grading-feedback-display">
                            <div class="feedback-label">教师评语</div>
                            <div class="feedback-content">${sub.feedback || '无评语'}</div>
                        </div>
                        <div class="grading-actions">
                            <button class="btn-secondary btn-sm" onclick="teacherApp.regradeSubmission('${sub.id}')">✏️ 修改成绩</button>
                        </div>
                    </div>
                ` : `
                    <div class="grading-form">
                        <div class="grading-form-row">
                            <div class="grading-input-group score-group">
                                <label>评分 (0-100)</label>
                                <input type="number" id="score-${sub.id}" min="0" max="100" class="form-input score-input" placeholder="0">
                            </div>
                            <div class="grading-input-group feedback-group">
                                <label>评语</label>
                                <textarea id="feedback-${sub.id}" class="form-textarea feedback-input" placeholder="请输入评语，指出优点和不足..."></textarea>
                            </div>
                        </div>
                        <div class="grading-form-actions">
                            <button class="btn-primary" onclick="teacherApp.submitGrade('${sub.id}')">✅ 提交批改</button>
                        </div>
                    </div>
                `}
            `;
            container.appendChild(card);
        });
    }

    // 加载学生提交到编辑器预览
    loadSubmission(submissionId) {
        const sub = db.getSubmissions().find(s => s.id === submissionId);
        if (!sub) return;

        // 解析项目结构
        let projectData = sub.structure;
        if (!projectData && sub.code) {
            try {
                projectData = JSON.parse(sub.code);
            } catch(e) {
                // 如果解析失败，可能是旧的单文件提交
                projectData = {
                    files: [{
                        id: 'file-' + Date.now(),
                        name: 'submission.js',
                        type: 'javascript',
                        path: '/submission.js',
                        content: sub.code,
                        createdAt: new Date().toISOString()
                    }],
                    folders: []
                };
            }
        }

        if (!projectData) {
            alert('无法加载提交内容');
            return;
        }

        // 切换到编辑器
        const editorBtn = document.querySelector('.nav-btn[data-view="editor"]');
        if (editorBtn) editorBtn.click();

        // 提示模式
        if (!confirm('即将加载学生的提交内容到编辑器。\n\n⚠️ 注意：这会临时覆盖您当前编辑器中的内容（不会保存到您的项目中）。\n是否继续？')) {
            return;
        }

        // 清空并加载
        teacherEditor.fileManager.clearAll();
        
        // 临时设置，不保存项目ID，以免覆盖教师自己的项目
        teacherEditor.currentCodeLibId = null; 
        teacherEditor.currentCodeLibTitle = null;

        if (projectData.folders) {
            if (!teacherEditor.fileManager.projects.folders) teacherEditor.fileManager.projects.folders = [];
            projectData.folders.forEach(f => teacherEditor.fileManager.projects.folders.push(f));
        }
        if (projectData.files) {
            if (!teacherEditor.fileManager.projects.files) teacherEditor.fileManager.projects.files = [];
            projectData.files.forEach(f => teacherEditor.fileManager.projects.files.push(f));
        }

        teacherEditor.renderFileTree();
        teacherEditor.renderTabs();

        // 打开第一个文件
        const files = teacherEditor.fileManager.getAllFiles();
        if (files.length > 0) {
            // 优先打开 index.html
            const indexFile = files.find(f => f.name === 'index.html');
            teacherEditor.openFile(indexFile ? indexFile.id : files[0].id);
        }

        // 显示顶部提示条
        const banner = document.createElement('div');
        banner.style.position = 'absolute';
        banner.style.top = '0';
        banner.style.left = '0';
        banner.style.width = '100%';
        banner.style.background = '#bc13fe';
        banner.style.color = '#fff';
        banner.style.padding = '5px 10px';
        banner.style.textAlign = 'center';
        banner.style.fontSize = '12px';
        banner.style.fontWeight = 'bold';
        banner.style.zIndex = '1000';
        banner.innerHTML = `👁️ 正在预览学生提交模式 - <a href="#" onclick="this.parentElement.remove(); document.querySelector('.nav-btn[data-view=\\'grading\\']').click(); teacherApp.renderGrading(); return false;" style="color:#fff; text-decoration:underline;">退出预览</a>`;
        
        const editorLayout = document.querySelector('.editor-layout-top');
        if (editorLayout) editorLayout.prepend(banner);
    }

    regradeSubmission(submissionId) {
        if (!confirm('确定要重新批改吗？这将清除当前的成绩和评语。')) return;
        db.updateSubmission(submissionId, { graded: false, score: undefined, feedback: undefined });
        this.renderGrading();
        this.renderDashboard();
    }

    submitGrade(submissionId) {
        const score = document.getElementById(`score-${submissionId}`).value;
        const feedback = document.getElementById(`feedback-${submissionId}`).value;

        if (!score) {
            alert('请输入成绩！');
            return;
        }

        db.gradeSubmission(submissionId, parseInt(score), feedback);
        alert('批改成功！');
        this.renderGrading();
        this.renderDashboard();
    }

    // 数据库管理
    exportDB() {
        db.exportDatabase();
    }

    async importDB(input) {
        const file = input.files[0];
        if (!file) return;
        
        if (!confirm('⚠️ 警告：导入数据将完全覆盖当前所有数据库记录（学生、作业、提交等）。\n\n确定要继续吗？')) {
            input.value = '';
            return;
        }

        try {
            await db.importDatabase(file);
            alert('✅ 数据恢复成功！页面即将刷新以加载新数据。');
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert('❌ 导入失败: 格式错误或文件损坏');
        }
        input.value = '';
    }
}

// 扩展编辑器类以添加代码库功能
class TeacherEditor extends CodeEditor {
    constructor() {
        super('teacher');
        this.currentCodeLibId = null; // Track which code lib item is currently loaded
    }

    addToCodeLib() {
        // 保存当前文件内容到 fileManager (ensure state is up to date)
        this.saveCurrentFile();
        
        // 检查是否是更新现有项目
        if (this.currentCodeLibId) {
            if (!confirm(`确定要更新代码库项目 "${this.currentCodeLibTitle || '未命名'}" 吗？\n这将覆盖代码库中的旧版本。`)) {
                return;
            }

            const projectData = {
                files: this.fileManager.projects.files,
                folders: this.fileManager.projects.folders
            };

            db.updateCodeLibrary(this.currentCodeLibId, {
                code: JSON.stringify(projectData),
                structure: projectData
            });

            alert('代码库项目已更新！');
            if (teacherApp) teacherApp.renderCodeLib();
            return;
        }

        // 另存为新项目
        const title = prompt('请输入新代码库(项目)的名称:');
        if (!title) return;

        const projectData = {
            files: this.fileManager.projects.files,
            folders: this.fileManager.projects.folders
        };

        const newItem = db.addToCodeLib({
            title,
            code: JSON.stringify(projectData),
            type: 'project',
            structure: projectData
        });

        // 关联到新项目
        this.currentCodeLibId = newItem.id;
        this.currentCodeLibTitle = newItem.title;

        alert('已作为新项目添加到代码库！');
        if (teacherApp) teacherApp.renderCodeLib();
        if (teacherApp) teacherApp.renderDashboard();
    }

    // 新建模板
    createNewTemplate() {
        this.saveCurrentFile();
        
        if (!this.fileManager.currentFile) {
            alert('请先打开一个文件作为模板内容！');
            return;
        }

        const file = this.fileManager.getFileById(this.fileManager.currentFile);
        if (!file) return;

        const name = prompt('请输入模板名称:', file.name);
        if (!name) return;

        const category = prompt('请输入模板分类 (html, css, javascript, d3):', 'custom');
        if (!category) return;

        const template = {
            id: 'tpl-' + Date.now(),
            name: name,
            icon: '📋',
            content: file.content,
            category: category
        };

        db.addTemplate(template);
        alert('模板创建成功！');
        this.renderTemplates(); // 刷新模板列表
    }

    // 重写 renderTemplates 以支持自定义模板
    renderTemplates() {
        const templatesList = document.getElementById('templates-list');
        if (!templatesList) return;

        templatesList.innerHTML = '';

        // 渲染内置模板
        Object.keys(CodeTemplates).forEach(category => {
            Object.keys(CodeTemplates[category]).forEach(key => {
                const template = CodeTemplates[category][key];
                this.createTemplateElement(templatesList, template);
            });
        });

        // 渲染自定义模板
        const customTemplates = db.getTemplates();
        if (customTemplates && customTemplates.length > 0) {
            const separator = document.createElement('div');
            separator.style.borderTop = '1px solid #333';
            separator.style.margin = '10px 0';
            separator.innerHTML = '<small style="color:#666; padding:5px;">自定义模板</small>';
            templatesList.appendChild(separator);

            customTemplates.forEach(template => {
                this.createTemplateElement(templatesList, template, true);
            });
        }
    }

    createTemplateElement(container, template, isCustom = false) {
        const templateDiv = document.createElement('div');
        templateDiv.className = 'template-item';
        
        // 构建模板项内容
        let html = `<span>${template.icon} ${template.name}</span>`;
        if (isCustom) {
            html += `<span class="delete-tpl" style="float:right; cursor:pointer; color:#666;">×</span>`;
        }
        templateDiv.innerHTML = html;

        // 点击加载模板
        templateDiv.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-tpl')) {
                e.stopPropagation();
                if (confirm(`确定要删除模板 "${template.name}" 吗？`)) {
                    db.deleteTemplate(template.id);
                    this.renderTemplates();
                }
                return;
            }
            this.loadTemplate(template);
        });

        container.appendChild(templateDiv);
    }
}

// 初始化
let teacherEditor;
let teacherApp;

window.addEventListener('DOMContentLoaded', async () => {
    // 等待数据库初始化
    if (db.ready) {
        await db.ready;
    }

    // 预加载用户项目
    const user = db.getCurrentUser();
    if (user) {
        await db.loadUserProjects(user.id);
    }

    teacherEditor = new TeacherEditor();
    teacherApp = new TeacherApp();
});