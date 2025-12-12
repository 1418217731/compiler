// 学生端应用
class StudentApp {
    constructor() {
        this.currentUser = db.getCurrentUser();
        if (!this.currentUser || this.currentUser.role !== 'student') {
            alert('请先登录学生账号！');
            window.location.href = 'index.html';
            return;
        }
        
        this.init();
    }

    init() {
        console.log('学生端初始化成功');
        this.updateUserInfo();
        this.renderHomework();
        this.renderGrades();
        this.renderCodeLib();
    }

    updateUserInfo() {
        const infoElement = document.getElementById('student-info');
        const loginBtn = document.getElementById('login-btn');
        
        if (this.currentUser) {
            if (infoElement) infoElement.textContent = `学生: ${this.currentUser.name || this.currentUser.username}`;
            if (loginBtn) {
                loginBtn.innerHTML = '🚪 退出';
                loginBtn.title = '退出当前账号';
            }
        } else {
            if (infoElement) infoElement.textContent = '学生: 未登录';
            if (loginBtn) {
                loginBtn.innerHTML = '🔑 登录';
                loginBtn.title = '登录账号';
            }
        }
    }

    login() {
        if (this.currentUser) {
            // 退出逻辑
            if (confirm('确定要退出当前账号吗？')) {
                db.setCurrentUser(null);
                window.location.href = 'index.html';
            }
        } else {
            // 登录逻辑 (跳转到首页登录)
            window.location.href = 'index.html';
        }
    }

    // 作业管理
    renderHomework() {
        const container = document.getElementById('student-homework-list');
        if (!container) return;

        const homework = db.getHomework();
        const submissions = db.getSubmissions().filter(s => s.studentId === this.currentUser.id);
        
        container.innerHTML = '';

        if (homework.length === 0) {
            container.innerHTML = '<p style="color: #999;">暂无作业</p>';
            return;
        }

        homework.forEach(hw => {
            const submission = submissions.find(s => s.homeworkId === hw.id);
            const status = submission ? 
                (submission.graded ? 'status-graded' : 'status-submitted') : 
                'status-pending';
            const statusText = submission ?
                (submission.graded ? '已批改' : '已提交') :
                '未完成';

            const card = document.createElement('div');
            card.className = 'homework-card';
            card.innerHTML = `
                <div class="homework-header">
                    <h3>${hw.title}</h3>
                    <span class="homework-status ${status}">${statusText}</span>
                </div>
                <div class="homework-info">
                    <p>📅 截止时间: ${new Date(hw.deadline).toLocaleString()}</p>
                    <p>📝 发布时间: ${new Date(hw.createdAt).toLocaleDateString()}</p>
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
                ${submission && submission.graded ? `
                    <div class="grading-result" style="margin-top: 15px;">
                        <div class="grading-score-display">
                            <div class="score-label">得分</div>
                            <div class="score-value">${submission.score}</div>
                        </div>
                        <div class="grading-feedback-display">
                            <div class="feedback-label">教师评语</div>
                            <div class="feedback-content">${submission.feedback || '<span style="color:#666; font-style:italic;">无评语</span>'}</div>
                        </div>
                    </div>
                ` : ''}
                <div class="homework-actions" style="margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
                    ${submission ? `
                        <button class="btn-secondary" onclick="studentApp.viewSubmission('${submission.id}')">查看提交</button>
                        ${!submission.graded ? `
                            <button class="btn-primary" onclick="studentApp.resubmitHomework('${hw.id}', '${submission.id}')">重新提交</button>
                        ` : ''}
                    ` : `
                        <button class="btn-primary" onclick="studentApp.startHomework('${hw.id}')">开始作业</button>
                    `}
                </div>
            `;
            container.appendChild(card);
        });
    }

    startHomework(homeworkId) {
        const homework = db.getHomework().find(h => h.id === homeworkId);
        if (!homework) return;

        // 切换到编辑器视图
        const editorBtn = document.querySelector('.nav-btn[data-view="editor"]');
        if (editorBtn) {
            editorBtn.click();
        }

        setTimeout(() => {
            // 检查是否已经存在该作业的文件
            const fileName = `${homework.title.replace(/\s+/g, '_')}.js`;
            const existingFile = studentEditor.fileManager.getAllFiles().find(f => f.homeworkId === homeworkId);
            
            if (existingFile) {
                studentEditor.openFile(existingFile.id);
            } else {
                // 创建新作业文件
                const file = studentEditor.fileManager.createFile(
                    fileName,
                    `// ${homework.title}\n// ${homework.description}\n\n// 请在此编写代码\n`
                );
                // 保存作业ID到文件元数据并持久化
                file.homeworkId = homeworkId;
                studentEditor.fileManager.saveProjects();
                
                studentEditor.renderFileTree();
                studentEditor.openFile(file.id);
            }
        }, 100);
    }

    resubmitHomework(homeworkId, submissionId) {
        // 直接复用开始作业逻辑，它会找到或创建文件
        this.startHomework(homeworkId);
    }

    submitHomework() {
        // 获取当前项目的完整结构
        const projectData = {
            files: studentEditor.fileManager.projects.files,
            folders: studentEditor.fileManager.projects.folders
        };

        if (!projectData.files || projectData.files.length === 0) {
            alert('当前项目为空，无法提交！');
            return;
        }

        // 尝试从当前打开的文件推断作业，或者让用户选择
        let selectedHomework = null;
        const homework = db.getHomework();
        
        if (studentEditor.fileManager.currentFile) {
            const file = studentEditor.fileManager.getFileById(studentEditor.fileManager.currentFile);
            if (file && file.homeworkId) {
                selectedHomework = homework.find(h => h.id === file.homeworkId);
            }
        }

        // 如果没有推断出，或者没有打开文件，则让用户选择
        if (!selectedHomework) {
            if (homework.length === 0) {
                alert('当前没有可提交的作业！');
                return;
            }

            let homeworkOptions = homework.map((hw, idx) => `${idx + 1}. ${hw.title}`).join('\n');
            const choice = prompt(`请选择要提交的作业（输入序号）:\n${homeworkOptions}`);
            
            if (!choice) return;
            
            const index = parseInt(choice) - 1;
            if (index < 0 || index >= homework.length) {
                alert('无效的选择！');
                return;
            }

            selectedHomework = homework[index];
        } else {
            if (!confirm(`确认提交作业: ${selectedHomework.title}？\n将提交当前所有代码文件。`)) {
                return;
            }
        }

        // 检查是否已提交
        const existingSubmission = db.getSubmissions().find(s => 
            s.studentId === this.currentUser.id && 
            s.homeworkId === selectedHomework.id
        );

        if (existingSubmission && existingSubmission.graded) {
            alert('该作业已被批改，无法重新提交！');
            return;
        }

        if (existingSubmission) {
            // 删除旧提交
            db.deleteSubmission(existingSubmission.id);
        }

        // 创建新提交 (包含完整项目结构)
        const submission = {
            id: 'sub-' + Date.now(),
            homeworkId: selectedHomework.id,
            studentId: this.currentUser.id,
            code: JSON.stringify(projectData), // 兼容字段，存储 JSON 字符串
            structure: projectData, // 新字段，存储完整对象
            type: 'project', // 标记为项目类型
            submittedAt: new Date().toISOString(),
            graded: false
        };

        db.addSubmission(submission);
        alert('作业提交成功！整个项目代码已提交。');
        this.renderHomework();
        
        // 切换回作业列表视图查看状态
        const hwBtn = document.querySelector('.nav-btn[data-view="homework"]');
        if (hwBtn) hwBtn.click();
    }

    viewSubmission(submissionId) {
        const submission = db.getSubmissions().find(s => s.id === submissionId);
        if (!submission) return;

        // 解析项目结构
        let projectData = submission.structure;
        if (!projectData && submission.code) {
            try {
                // 尝试解析 JSON，如果失败则视为普通代码文本
                if (submission.code.trim().startsWith('{')) {
                    projectData = JSON.parse(submission.code);
                }
            } catch(e) {
                // ignore
            }
        }

        // 切换到编辑器视图
        const editorBtn = document.querySelector('.nav-btn[data-view="editor"]');
        if (editorBtn) {
            editorBtn.click();
        }

        // 提示模式
        if (!confirm('即将加载您的历史提交内容到编辑器预览。\n\n⚠️ 注意：这会临时覆盖当前编辑器中的内容。\n是否继续？')) {
            return;
        }

        studentEditor.fileManager.clearAll();
        // 清除当前作业绑定，避免误提交历史版本覆盖新版本
        studentEditor.currentCodeLibId = null; 

        if (projectData && (projectData.files || projectData.folders)) {
            // 加载项目结构
            if (projectData.folders) {
                if (!studentEditor.fileManager.projects.folders) studentEditor.fileManager.projects.folders = [];
                projectData.folders.forEach(f => studentEditor.fileManager.projects.folders.push(f));
            }
            if (projectData.files) {
                if (!studentEditor.fileManager.projects.files) studentEditor.fileManager.projects.files = [];
                projectData.files.forEach(f => studentEditor.fileManager.projects.files.push(f));
            }
        } else {
            // 旧的单文件提交或解析失败，作为单文件处理
            const fileName = `submission-${submissionId}.js`;
            studentEditor.fileManager.createFile(fileName, submission.code);
        }

        studentEditor.renderFileTree();
        studentEditor.renderTabs();

        // 打开第一个文件
        const files = studentEditor.fileManager.getAllFiles();
        if (files.length > 0) {
            // 优先打开 index.html
            const indexFile = files.find(f => f.name === 'index.html');
            studentEditor.openFile(indexFile ? indexFile.id : files[0].id);
        }

        // 显示顶部提示条
        const banner = document.createElement('div');
        banner.style.position = 'absolute';
        banner.style.top = '0';
        banner.style.left = '0';
        banner.style.width = '100%';
        banner.style.background = '#2196F3'; // 蓝色区分学生端
        banner.style.color = '#fff';
        banner.style.padding = '5px 10px';
        banner.style.textAlign = 'center';
        banner.style.fontSize = '12px';
        banner.style.fontWeight = 'bold';
        banner.style.zIndex = '1000';
        banner.innerHTML = `👁️ 正在查看历史提交 - <a href="#" onclick="this.parentElement.remove(); document.querySelector('.nav-btn[data-view=\\'homework\\']').click(); return false;" style="color:#fff; text-decoration:underline;">返回作业列表</a>`;
        
        const editorLayout = document.querySelector('.editor-layout-top');
        if (editorLayout) editorLayout.prepend(banner);
    }

    // 成绩查询
    renderGrades() {
        const container = document.getElementById('grades-container');
        if (!container) return;

        const submissions = db.getSubmissions().filter(s => 
            s.studentId === this.currentUser.id && s.graded
        );

        container.innerHTML = '';

        if (submissions.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 4rem 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">📊</div>
                    <h3 style="color: var(--text-secondary); font-weight: 300;">暂无成绩记录</h3>
                    <p style="color: var(--text-secondary); font-size: 0.9rem;">完成作业并等待教师批改后，成绩将显示在这里</p>
                </div>
            `;
            return;
        }

        // 计算统计数据
        const totalScore = submissions.reduce((sum, s) => sum + (s.score || 0), 0);
        const avgScore = (totalScore / submissions.length).toFixed(1);
        
        // 计算最高分
        const maxScore = Math.max(...submissions.map(s => s.score || 0));
        
        // 计算及格率 (>=60分)
        const passCount = submissions.filter(s => (s.score || 0) >= 60).length;
        const passRate = Math.round((passCount / submissions.length) * 100);

        container.innerHTML = `
            <!-- 成绩仪表盘 -->
            <div class="dashboard-stats" style="margin-bottom: 40px;">
                <div class="stat-card">
                    <div class="stat-icon" style="color: var(--success-color); background: rgba(0, 255, 157, 0.1);">A</div>
                    <div class="stat-info">
                        <div class="stat-value">${avgScore}</div>
                        <div class="stat-label">平均分</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="color: var(--warning-color); background: rgba(255, 215, 0, 0.1);">🏆</div>
                    <div class="stat-info">
                        <div class="stat-value">${maxScore}</div>
                        <div class="stat-label">最高分</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="color: var(--accent-color); background: rgba(0, 243, 255, 0.1);">📈</div>
                    <div class="stat-info">
                        <div class="stat-value">${passRate}%</div>
                        <div class="stat-label">及格率</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="color: var(--secondary-accent); background: rgba(188, 19, 254, 0.1);">📝</div>
                    <div class="stat-info">
                        <div class="stat-value">${submissions.length}</div>
                        <div class="stat-label">已批改</div>
                    </div>
                </div>
            </div>

            <!-- 成绩列表 -->
            <div class="content-panel" style="padding: 0; background: transparent; overflow: visible;">
                <div class="grades-list" style="display: flex; flex-direction: column; gap: 20px;">
                    ${submissions.map(sub => {
                        const homework = db.getHomework().find(h => h.id === sub.homeworkId);
                        const score = sub.score || 0;
                        let scoreClass = 'score-normal';
                        let scoreColor = 'var(--accent-color)';
                        
                        if (score >= 90) { scoreClass = 'score-high'; scoreColor = 'var(--success-color)'; }
                        else if (score < 60) { scoreClass = 'score-low'; scoreColor = 'var(--error-color)'; }
                        else if (score >= 80) { scoreColor = 'var(--warning-color)'; }

                        return `
                            <div class="grade-card" style="
                                background: rgba(26, 33, 56, 0.6);
                                backdrop-filter: blur(5px);
                                border: 1px solid var(--border-color);
                                border-radius: var(--radius-md);
                                padding: 25px;
                                transition: all 0.3s ease;
                                position: relative;
                                overflow: hidden;
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                gap: 20px;
                            " onmouseover="this.style.transform='translateY(-3px)'; this.style.borderColor='var(--accent-color)';" onmouseout="this.style.transform='none'; this.style.borderColor='var(--border-color)';">
                                
                                <!-- 左侧装饰条 -->
                                <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: ${scoreColor}; box-shadow: 0 0 10px ${scoreColor};"></div>

                                <div style="flex: 1;">
                                    <h3 style="color: var(--text-bright); font-size: 1.1rem; margin-bottom: 8px; display: flex; align-items: center; gap: 10px;">
                                        ${homework ? homework.title : '未知作业'}
                                        <span style="font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.1); color: var(--text-secondary); font-weight: normal;">
                                            ${new Date(sub.submittedAt).toLocaleDateString()}
                                        </span>
                                    </h3>
                                    <div style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 4px; border-left: 2px solid rgba(255,255,255,0.1);">
                                        <span style="color: var(--accent-color); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 5px;">评语 / FEEDBACK</span>
                                        ${sub.feedback || '暂无评语'}
                                    </div>
                                </div>

                                <div style="text-align: right; padding-left: 20px; border-left: 1px solid rgba(255,255,255,0.05); min-width: 100px;">
                                    <div style="font-size: 2.5rem; font-weight: 800; color: ${scoreColor}; text-shadow: 0 0 20px ${scoreColor}; font-family: 'Orbitron', sans-serif; line-height: 1;">
                                        ${score}
                                    </div>
                                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 5px; text-transform: uppercase; letter-spacing: 1px;">SCORE</div>
                                </div>

                                <div style="position: absolute; right: -20px; top: -20px; font-size: 8rem; color: ${scoreColor}; opacity: 0.03; font-family: 'Orbitron', sans-serif; pointer-events: none;">
                                    ${score >= 90 ? 'S' : score >= 80 ? 'A' : score >= 60 ? 'B' : 'C'}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // 代码库管理 (移植自 TeacherApp，增加用户隔离)
    renderCodeLib() {
        const container = document.getElementById('codelib-container');
        if (!container) return;

        // 只显示当前学生创建的代码库
        const codeLib = db.getCodeLib().filter(item => item.createdBy === this.currentUser.id);
        container.innerHTML = '';

        if (codeLib.length === 0) {
            container.innerHTML = '<p style="color: #999;">暂无代码库项目</p>';
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
                    <button class="btn-secondary" onclick="studentApp.loadCodeFromLib('${item.id}')">加载到编辑器</button>
                    <button class="btn-danger" onclick="studentApp.deleteFromCodeLib('${item.id}')">删除</button>
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
            type: 'project', 
            structure: emptyProject,
            createdBy: this.currentUser.id // 标记创建者
        });

        this.renderCodeLib();
        
        if (confirm('代码库项目已创建。是否立即前往编辑器进行编辑？')) {
            this.loadCodeFromLib(newItem.id);
        }
    }

    uploadCodeLib(input) {
        const files = Array.from(input.files);
        if (!files.length) return;

        const filteredFiles = files.filter(file => {
            const path = file.webkitRelativePath || file.name;
            if (path.includes('node_modules/') || 
                path.includes('.git/') || 
                path.includes('.vscode/') || 
                path.includes('dist/') || 
                path.includes('build/')) {
                return false;
            }
            if (file.size > 1024 * 500) return false;
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
        
        const ensureFolders = (filePath) => {
            const parts = filePath.split('/');
            if (parts.length <= 1) return '/';
            
            let currentPath = '/';
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
                        let path = '/';
                        if (file.webkitRelativePath) {
                            path = ensureFolders(file.webkitRelativePath);
                        }
                        projectData.files.push({
                            id: 'file-' + Date.now() + Math.floor(Math.random() * 100000),
                            name: file.name,
                            type: type,
                            path: path + file.name,
                            content: content,
                            createdAt: new Date().toISOString()
                        });
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
                    document.getElementById('upload-loading').innerHTML = `正在保存项目...`;
                    
                    db.addToCodeLib({
                        title: projectName,
                        type: 'project',
                        code: JSON.stringify(projectData),
                        structure: projectData,
                        createdBy: this.currentUser.id // 标记创建者
                    });

                    document.getElementById('upload-loading').remove();
                    this.renderCodeLib();
                    alert(`项目 "${projectName}" 导入成功！包含 ${projectData.files.length} 个文件。`);
                    input.value = '';
                }
            });
        };

        processChunk(0);
    }

    loadCodeFromLib(itemId) {
        const item = db.getCodeLib().find(i => i.id === itemId);
        if (!item) return;

        const editorBtn = document.querySelector('.nav-btn[data-view="editor"]');
        if (editorBtn) {
            editorBtn.click();
        }

        studentEditor.fileManager.clearAll();
        studentEditor.currentCodeLibId = itemId;
        studentEditor.currentCodeLibTitle = item.title;

        if (item.type === 'project') {
            let projectData = item.structure;
            if (!projectData && item.code) {
                try {
                    projectData = JSON.parse(item.code);
                } catch(e) {}
            }

            if (projectData) {
                if (projectData.folders) {
                    if (!studentEditor.fileManager.projects.folders) studentEditor.fileManager.projects.folders = [];
                    projectData.folders.forEach(f => {
                        studentEditor.fileManager.projects.folders.push(f);
                    });
                }
                if (projectData.files) {
                    if (!studentEditor.fileManager.projects.files) studentEditor.fileManager.projects.files = [];
                    projectData.files.forEach(f => {
                        studentEditor.fileManager.projects.files.push(f);
                    });
                }
            }
        } else {
            const fileName = item.title.endsWith('.js') || item.title.endsWith('.html') || item.title.endsWith('.css') 
                                ? item.title 
                                : item.title + (item.type === 'javascript' ? '.js' : '.' + item.type);
            studentEditor.fileManager.createFile(fileName, item.code);
        }

        studentEditor.renderFileTree();
        studentEditor.renderTabs();
        
        const files = studentEditor.fileManager.getAllFiles();
        if (files.length > 0) {
            studentEditor.openFile(files[0].id);
        } else {
            if (studentEditor.codeEditor) studentEditor.codeEditor.value = '';
        }

        // 重置预览
        studentEditor.clearPreview();
        
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
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 扩展编辑器类以添加学生功能
class StudentEditor extends CodeEditor {
    constructor() {
        super('student');
        this.addSubmitButton();
        this.addCodeLibButton();
        this.currentCodeLibId = null;
    }

    // 禁用模板功能
    renderTemplates() {
        // Do nothing - remove templates for students
        const templatesList = document.getElementById('templates-list');
        if (templatesList) {
            templatesList.innerHTML = '';
            // 可选：隐藏父容器
            if (templatesList.parentElement) {
                templatesList.parentElement.style.display = 'none';
            }
        }
    }

    addSubmitButton() {
        // 在编辑器操作栏添加提交按钮
        const actionsDiv = document.querySelector('.editor-actions');
        if (actionsDiv) {
            const submitBtn = document.createElement('button');
            submitBtn.className = 'btn-primary';
            submitBtn.innerHTML = '📤 提交作业';
            submitBtn.onclick = () => studentApp.submitHomework();
            
            // 插入到最前或合适位置
            actionsDiv.insertBefore(submitBtn, actionsDiv.firstChild);
        }
    }

    addCodeLibButton() {
        const actionsDiv = document.querySelector('.editor-actions');
        if (actionsDiv) {
            const btn = document.createElement('button');
            btn.className = 'btn-secondary';
            btn.innerHTML = '📚 加入代码库';
            btn.onclick = () => this.addToCodeLib();
            // 插入到保存按钮之后
            const saveBtn = Array.from(actionsDiv.children).find(el => el.textContent.includes('保存'));
            if (saveBtn) {
                actionsDiv.insertBefore(btn, saveBtn.nextSibling);
            } else {
                actionsDiv.appendChild(btn);
            }
        }
    }

    addToCodeLib() {
        this.saveCurrentFile();
        
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
            if (studentApp) studentApp.renderCodeLib();
            return;
        }

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
            structure: projectData,
            createdBy: studentApp.currentUser.id
        });

        this.currentCodeLibId = newItem.id;
        this.currentCodeLibTitle = newItem.title;

        alert('已作为新项目添加到代码库！');
        if (studentApp) studentApp.renderCodeLib();
    }
}

// 初始化
let studentEditor;
let studentApp;

window.addEventListener('DOMContentLoaded', async () => {
    // 等待数据库初始化完成
    if (db.ready) {
        await db.ready;
    }

    // 预加载用户项目数据
    const user = db.getCurrentUser();
    if (user) {
        await db.loadUserProjects(user.id);
    }

    studentEditor = new StudentEditor();
    studentApp = new StudentApp();
});
