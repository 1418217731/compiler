// 编辑器核心类
class CodeEditor {
    constructor(role = 'teacher') {
        this.role = role;
        this.fileManager = new FileManager(role === 'teacher');
        this.compiler = new Compiler('console-output', 'preview-frame');
        this.editorContainer = document.getElementById('code-editor');
        this.tabsContainer = document.getElementById('tabs-container');
        this.fileTree = document.getElementById('file-tree');
        this.monacoInstance = null;
        
        this.init();
    }

    init() {
        this.renderFileTree();
        this.renderTemplates();
        this.initMonaco();
        this.setupOutputTabs();
        this.setupViewSwitching();
        this.setupResizer();
        this.setupOutputToggle();
        this.setupPreviewPanel();
    }

    initMonaco() {
        if (!this.editorContainer) return;

        // 配置 Monaco Loader
        require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' }});

        // 加载 Monaco Editor
        require(['vs/editor/editor.main'], () => {
            this.monacoInstance = monaco.editor.create(this.editorContainer, {
                value: '',
                language: 'javascript',
                theme: 'vs-dark', // 使用暗色主题
                automaticLayout: true, // 自动适应容器大小
                fontSize: 14,
                fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
                minimap: { enabled: true }, // 启用代码缩略图
                scrollBeyondLastLine: false,
                tabSize: 4,
                insertSpaces: true,
                padding: { top: 20, bottom: 20 },
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: true,
                renderLineHighlight: 'all'
            });

            // 监听内容变化自动保存
            this.monacoInstance.onDidChangeModelContent(() => {
                this.saveCurrentFile();
            });

            // 初始化完成后打开第一个文件
            const files = this.fileManager.getAllFiles();
            if (files.length > 0) {
                this.openFile(files[0].id);
            }
            
            // 监听窗口大小变化
            window.addEventListener('resize', () => {
                if (this.monacoInstance) {
                    this.monacoInstance.layout();
                }
            });
        });
    }

    setupOutputTabs() {
        // 不再需要输出标签切换，预览已移至右侧
        // 保留方法以兼容旧代码
    }

    switchOutputTab(tabName) {
        // 不再需要，保留以兼容
    }

    setupViewSwitching() {
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                this.switchView(view);
                
                navBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    switchView(viewName) {
        document.querySelectorAll('.view-container').forEach(view => {
            view.style.display = 'none';
        });
        
        const targetView = document.getElementById(viewName + '-view');
        if (targetView) {
            targetView.style.display = 'block';
            // 切换回编辑器视图时刷新布局，防止编辑器内容显示异常
            if (viewName === 'editor' && this.monacoInstance) {
                setTimeout(() => this.monacoInstance.layout(), 100);
            }
        }
    }

    setupResizer() {
        const outputPanel = document.querySelector('.output-panel');
        if (!outputPanel || !outputPanel.parentNode) return;

        const resizer = document.createElement('div');
        resizer.className = 'resizer';
        outputPanel.parentNode.insertBefore(resizer, outputPanel);
        
        let isResizing = false;
        let startY = 0;
        let startHeight = 0;

        resizer.addEventListener('mousedown', (e) => {
            if (outputPanel.classList.contains('collapsed')) return;
            
            isResizing = true;
            startY = e.clientY;
            startHeight = outputPanel.offsetHeight;
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const deltaY = startY - e.clientY;
            const newHeight = Math.max(100, Math.min(600, startHeight + deltaY));
            outputPanel.style.height = newHeight + 'px';
            if (this.monacoInstance) this.monacoInstance.layout();
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = 'default';
                document.body.style.userSelect = 'auto';
                if (this.monacoInstance) this.monacoInstance.layout();
            }
        });

        // 双击恢复默认高度
        resizer.addEventListener('dblclick', () => {
            if (!outputPanel.classList.contains('collapsed')) {
                outputPanel.style.height = '250px';
                if (this.monacoInstance) this.monacoInstance.layout();
            }
        });
    }

    setupOutputToggle() {
        const outputHeader = document.querySelector('.output-header');
        const outputPanel = document.querySelector('.output-panel');
        
        if (!outputHeader || !outputPanel) return;

        // 创建切换按钮
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'output-toggle';
        toggleBtn.innerHTML = '▼';
        toggleBtn.title = '折叠/展开控制台 (双击恢复默认高度)';
        
        outputHeader.appendChild(toggleBtn);
        
        // 切换折叠状态
        const toggleCollapse = () => {
            const isCollapsed = outputPanel.classList.contains('collapsed');
            outputPanel.classList.toggle('collapsed');
            toggleBtn.innerHTML = isCollapsed ? '▼' : '▲';
            toggleBtn.title = isCollapsed ? '折叠控制台' : '展开控制台';
            setTimeout(() => {
                if (this.monacoInstance) this.monacoInstance.layout();
            }, 300); // Wait for transition
        };

        // 按钮点击事件
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleCollapse();
        });

        // 头部点击事件（除了按钮）
        outputHeader.addEventListener('click', (e) => {
            if (e.target === toggleBtn) return;
            toggleCollapse();
        });

        // 双击头部恢复默认高度
        outputHeader.addEventListener('dblclick', (e) => {
            if (!outputPanel.classList.contains('collapsed')) {
                outputPanel.style.height = '250px';
                setTimeout(() => {
                    if (this.monacoInstance) this.monacoInstance.layout();
                }, 300);
            }
        });
    }

    renderFileTree() {
        if (!this.fileTree) return;
        this.fileTree.innerHTML = '';

        const files = this.fileManager.getAllFiles();
        const folders = this.fileManager.getAllFolders();

        // Build tree structure
        const tree = { name: 'root', path: '/', type: 'folder', children: [] };
        const pathMap = { '/': tree };

        // Initialize map with all folders
        folders.sort((a, b) => a.path.length - b.path.length).forEach(folder => {
            const folderNode = { ...folder, children: [], type: 'folder' };
            pathMap[folder.path] = folderNode;
        });

        // Link folders to parents
        Object.values(pathMap).forEach(folderNode => {
            if (folderNode.path === '/') return;
            
            const lastSlashIndex = folderNode.path.lastIndexOf('/', folderNode.path.length - 2);
            const parentPath = folderNode.path.substring(0, lastSlashIndex + 1);
            
            if (pathMap[parentPath]) {
                pathMap[parentPath].children.push(folderNode);
            } else {
                tree.children.push(folderNode);
            }
        });

        // Add files to folders
        files.forEach(file => {
            const lastSlash = file.path.lastIndexOf('/');
            const parentPath = file.path.substring(0, lastSlash + 1);
            if (pathMap[parentPath]) {
                pathMap[parentPath].children.push(file);
            } else {
                tree.children.push(file);
            }
        });

        this.renderNode(tree, this.fileTree);
    }

    renderNode(node, container) {
        if (node.children) {
            node.children.sort((a, b) => {
                if (a.type === 'folder' && b.type !== 'folder') return -1;
                if (a.type !== 'folder' && b.type === 'folder') return 1;
                return a.name.localeCompare(b.name);
            });

            node.children.forEach(child => {
                if (child.type === 'folder') {
                    const folderEl = this.createFolderElement(child);
                    container.appendChild(folderEl);
                    const childrenContainer = folderEl.querySelector('.folder-children');
                    this.renderNode(child, childrenContainer);
                } else {
                    const fileEl = this.createFileElement(child);
                    container.appendChild(fileEl);
                }
            });
        }
    }

    createFolderElement(folder) {
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder-item expanded';
        folderDiv.innerHTML = `
            <div class="folder-header">
                <span class="folder-toggle">▼</span>
                <span class="folder-icon">📁</span>
                <span class="file-name">${folder.name}</span>
                <div class="file-actions">
                    <button class="file-action-btn" onclick="event.stopPropagation(); ${this.role}Editor.deleteFolder('${folder.id}')" title="删除">🗑️</button>
                </div>
            </div>
            <div class="folder-children"></div>
        `;

        const header = folderDiv.querySelector('.folder-header');
        header.addEventListener('click', (e) => {
            if (e.target.classList.contains('file-action-btn')) return;
            folderDiv.classList.toggle('collapsed');
            folderDiv.classList.toggle('expanded');
            
            const toggle = folderDiv.querySelector('.folder-toggle');
            toggle.textContent = folderDiv.classList.contains('collapsed') ? '▶' : '▼';
        });

        return folderDiv;
    }

    createFileElement(file) {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'file-item';
        if (this.fileManager.currentFile === file.id) {
            fileDiv.classList.add('active');
        }

        const icon = this.fileManager.getFileIcon(file.type);
        fileDiv.innerHTML = `
            <span class="file-icon">${icon}</span>
            <span class="file-name">${file.name}</span>
            <div class="file-actions">
                <button class="file-action-btn" onclick="event.stopPropagation(); ${this.role}Editor.renameFile('${file.id}')" title="重命名">✏️</button>
                <button class="file-action-btn" onclick="event.stopPropagation(); ${this.role}Editor.deleteFile('${file.id}')" title="删除">🗑️</button>
            </div>
        `;

        fileDiv.addEventListener('click', () => {
            this.openFile(file.id);
        });

        return fileDiv;
    }

    renderTemplates() {
        const templatesList = document.getElementById('templates-list');
        if (!templatesList) return;

        templatesList.innerHTML = '';

        Object.keys(CodeTemplates).forEach(category => {
            Object.keys(CodeTemplates[category]).forEach(key => {
                const template = CodeTemplates[category][key];
                const templateDiv = document.createElement('div');
                templateDiv.className = 'template-item';
                templateDiv.innerHTML = `${template.icon} ${template.name}`;
                templateDiv.addEventListener('click', () => {
                    this.loadTemplate(template);
                });
                templatesList.appendChild(templateDiv);
            });
        });
    }

    loadTemplate(template) {
        const ext = template.name.includes('HTML') ? 'html' : 
                    template.name.includes('CSS') ? 'css' : 
                    template.name.includes('D3') ? 'html' : 'js';
        const fileName = `template-${Date.now()}.${ext}`;
        
        const file = this.fileManager.createFile(fileName, template.content);
        this.renderFileTree();
        this.openFile(file.id);
    }

    openFile(fileId) {
        this.saveCurrentFile();
        
        const file = this.fileManager.getFileById(fileId);
        if (!file) return;

        this.fileManager.openTab(fileId);
        this.renderTabs();
        
        if (this.monacoInstance) {
            // 确定语言
            const ext = file.name.split('.').pop().toLowerCase();
            const langMap = {
                'js': 'javascript',
                'html': 'html',
                'css': 'css',
                'json': 'json',
                'xml': 'xml',
                'md': 'markdown',
                'ts': 'typescript',
                'txt': 'plaintext'
            };
            const language = langMap[ext] || 'plaintext';

            // 更新内容和语言模型
            const model = this.monacoInstance.getModel();
            this.monacoInstance.setValue(file.content || '');
            monaco.editor.setModelLanguage(model, language);
        }

        // 更新文件树选中状态
        this.renderFileTree();
    }

    renderTabs() {
        if (!this.tabsContainer) return;

        this.tabsContainer.innerHTML = '';
        
        this.fileManager.openTabs.forEach(fileId => {
            const file = this.fileManager.getFileById(fileId);
            if (!file) return;

            const tab = document.createElement('div');
            tab.className = 'tab';
            if (fileId === this.fileManager.currentFile) {
                tab.classList.add('active');
            }

            const icon = this.fileManager.getFileIcon(file.type);
            tab.innerHTML = `
                <span class="file-icon">${icon}</span>
                <span>${file.name}</span>
                <button class="tab-close" onclick="${this.role}Editor.closeTab('${fileId}'); event.stopPropagation();">×</button>
            `;

            tab.addEventListener('click', () => {
                this.openFile(fileId);
            });

            this.tabsContainer.appendChild(tab);
        });
    }

    closeTab(fileId) {
        this.fileManager.closeTab(fileId);
        this.renderTabs();
        
        if (this.fileManager.currentFile) {
            this.openFile(this.fileManager.currentFile);
        } else if (this.monacoInstance) {
            this.monacoInstance.setValue('');
        }
    }

    saveCurrentFile() {
        if (!this.fileManager.currentFile || !this.monacoInstance) return;
        
        const content = this.monacoInstance.getValue();
        this.fileManager.updateFile(this.fileManager.currentFile, { content });
    }

    saveFile() {
        this.saveCurrentFile();
        alert('文件已保存！');
    }

    newFile() {
        const fileName = prompt('请输入文件名（如: script.js, style.css）:');
        if (!fileName) return;

        const file = this.fileManager.createFile(fileName);
        this.renderFileTree();
        this.openFile(file.id);
    }

    newFolder() {
        const folderName = prompt('请输入文件夹名称:');
        if (!folderName) return;

        this.fileManager.createFolder(folderName);
        this.renderFileTree();
    }

    deleteFile(fileId) {
        if (!confirm('确定要删除这个文件吗？')) return;
        
        this.fileManager.deleteFile(fileId);
        this.renderFileTree();
        this.renderTabs();
        
        if (this.fileManager.currentFile === fileId) {
            // 如果删除的是当前文件，清空编辑器
            if (this.monacoInstance) this.monacoInstance.setValue('');
        }
    }

    deleteFolder(folderId) {
        if (!confirm('确定要删除这个文件夹及其所有文件吗？')) return;
        
        this.fileManager.deleteFolder(folderId);
        this.renderFileTree();
    }

    renameFile(fileId) {
        const file = this.fileManager.getFileById(fileId);
        if (!file) return;

        const newName = prompt('请输入新文件名:', file.name);
        if (!newName || newName === file.name) return;

        this.fileManager.renameFile(fileId, newName);
        this.renderFileTree();
        this.renderTabs();
    }

    refreshFiles() {
        this.renderFileTree();
        alert('文件列表已刷新！');
    }

    uploadLocalFile(input) {
        const files = input.files;
        if (!files.length) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                let path = '/';
                
                if (file.webkitRelativePath) {
                    const parts = file.webkitRelativePath.split('/');
                    if (parts.length > 1) {
                        const folderPath = parts.slice(0, -1).join('/');
                        this.fileManager.ensureFolder(folderPath);
                        path = '/' + folderPath + '/';
                    }
                }
                
                this.fileManager.createFile(file.name, content, undefined, path);
                
                if (this.renderTimeout) clearTimeout(this.renderTimeout);
                this.renderTimeout = setTimeout(() => {
                    this.renderFileTree();
                }, 100);
            };
            reader.readAsText(file);
        });
        
        input.value = '';
    }

    runCode() {
        this.saveCurrentFile();
        this.switchOutputTab('console');
        this.compiler.runCode(this.fileManager);
    }

    clearConsole() {
        this.compiler.clearConsole();
    }

    clearPreview() {
        const previewFrame = document.getElementById('preview-frame');
        if (previewFrame) {
            previewFrame.src = 'about:blank';
            const doc = previewFrame.contentDocument || previewFrame.contentWindow.document;
            doc.open();
            doc.write('');
            doc.close();
        }
        this.clearConsole();
    }

    setupPreviewPanel() {
        const previewPanel = document.getElementById('preview-panel');
        const resizer = document.querySelector('.preview-resizer');
        
        if (!previewPanel || !resizer) return;

        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        resizer.addEventListener('mousedown', (e) => {
            if (previewPanel.classList.contains('collapsed')) return;
            
            isResizing = true;
            startX = e.clientX;
            startWidth = previewPanel.offsetWidth;
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
            
            // 防止 iframe 捕获鼠标事件
            const iframe = document.getElementById('preview-frame');
            if (iframe) iframe.style.pointerEvents = 'none';

            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const deltaX = startX - e.clientX;
            const newWidth = Math.max(300, Math.min(window.innerWidth - 300, startWidth + deltaX));
            previewPanel.style.width = newWidth + 'px';
            if (this.monacoInstance) this.monacoInstance.layout();
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = 'default';
                document.body.style.userSelect = 'auto';
                
                // 恢复 iframe 交互
                const iframe = document.getElementById('preview-frame');
                if (iframe) iframe.style.pointerEvents = 'auto';

                if (this.monacoInstance) this.monacoInstance.layout();
            }
        });

        // 双击恢复默认宽度
        resizer.addEventListener('dblclick', () => {
            if (!previewPanel.classList.contains('collapsed')) {
                previewPanel.style.width = '400px';
                if (this.monacoInstance) this.monacoInstance.layout();
            }
        });

        const updateResizerVisibility = () => {
            resizer.style.display = previewPanel.classList.contains('collapsed') ? 'none' : 'block';
            if (this.monacoInstance) setTimeout(() => this.monacoInstance.layout(), 300);
        };

        updateResizerVisibility();
        
        const observer = new MutationObserver(updateResizerVisibility);
        observer.observe(previewPanel, { attributes: true, attributeFilter: ['class'] });
    }

    togglePreview() {
        const previewPanel = document.getElementById('preview-panel');
        const toggleBtn = document.getElementById('toggle-preview-btn');
        const previewToggleBtn = document.querySelector('.preview-toggle');
        
        if (!previewPanel) return;

        const isCollapsed = previewPanel.classList.contains('collapsed');
        
        const iconHide = '<svg style="pointer-events: none;" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg> 隐藏预览';
        const iconShow = '<svg style="pointer-events: none;" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> 预览';
        const iconCollapse = '<svg style="pointer-events: none;" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
        const iconExpand = '<svg style="pointer-events: none;" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';
        
        if (isCollapsed) {
            previewPanel.classList.remove('collapsed');
            if (toggleBtn) {
                toggleBtn.classList.add('active');
                toggleBtn.innerHTML = iconHide;
            }
            if (previewToggleBtn) {
                previewToggleBtn.innerHTML = iconExpand;
                previewToggleBtn.title = '关闭预览';
            }
            setTimeout(() => this.runCode(), 100);
        } else {
            previewPanel.classList.add('collapsed');
            if (toggleBtn) {
                toggleBtn.classList.remove('active');
                toggleBtn.innerHTML = iconShow;
            }
            if (previewToggleBtn) {
                previewToggleBtn.innerHTML = iconCollapse;
                previewToggleBtn.title = '展开预览';
            }
        }
        
        // 触发布局更新
        setTimeout(() => {
            if (this.monacoInstance) this.monacoInstance.layout();
        }, 300);
    }
}