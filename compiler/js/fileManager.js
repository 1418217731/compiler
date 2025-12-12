// 文件管理器
class FileManager {
    constructor(isTeacher = true) {
        this.isTeacher = isTeacher;
        this.currentUser = db.getCurrentUser();
        this.projects = this.loadProjects();
        this.currentFile = null;
        this.openTabs = [];
    }

    loadProjects() {
        if (this.isTeacher) {
            return db.getTeacherProjects();
        } else {
            return db.getStudentProjects(this.currentUser.id);
        }
    }

    saveProjects() {
        if (this.isTeacher) {
            db.saveTeacherProjects(this.projects);
        } else {
            db.saveStudentProjects(this.currentUser.id, this.projects);
        }
    }

    getAllFiles() {
        return this.projects.files || [];
    }

    getAllFolders() {
        return this.projects.folders || [];
    }

    getFileById(id) {
        return this.projects.files.find(f => f.id === id);
    }

    getFolderByPath(path) {
        if (!this.projects.folders) return null;
        return this.projects.folders.find(f => f.path === path);
    }

    ensureFolder(path) {
        // path should start with / and end with /
        if (!path.startsWith('/')) path = '/' + path;
        if (!path.endsWith('/')) path = path + '/';
        
        if (path === '/') return null; // Root always exists conceptually

        // Check if already exists
        const existing = this.getFolderByPath(path);
        if (existing) return existing;

        // Split path: /a/b/c/ -> ['', 'a', 'b', 'c', '']
        const parts = path.split('/').filter(p => p);
        
        let currentPath = '/';
        let lastFolder = null;

        for (const part of parts) {
            const nextPath = currentPath + part + '/';
            let folder = this.getFolderByPath(nextPath);
            if (!folder) {
                folder = this.createFolder(part, currentPath);
            }
            currentPath = nextPath;
            lastFolder = folder;
        }
        return lastFolder;
    }

    createFile(name, content = '', type = 'javascript', path = '/') {
        const fileType = this.getFileType(name);
        const file = {
            id: 'file-' + Date.now() + Math.floor(Math.random() * 1000),
            name: name,
            type: fileType,
            path: path + name,
            content: content || this.getDefaultContent(fileType),
            createdAt: new Date().toISOString()
        };
        
        if (!this.projects.files) {
            this.projects.files = [];
        }
        this.projects.files.push(file);
        this.saveProjects();
        return file;
    }

    getFileType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const typeMap = {
            'html': 'html',
            'htm': 'html',
            'css': 'css',
            'js': 'javascript',
            'json': 'json',
            'txt': 'text'
        };
        return typeMap[ext] || 'text';
    }

    getDefaultContent(type) {
        const defaults = {
            'html': '<!DOCTYPE html>\n<html>\n<head>\n    <title>Document</title>\n</head>\n<body>\n    \n</body>\n</html>',
            'css': '/* CSS代码 */\n',
            'javascript': '// JavaScript代码\n',
            'json': '{\n    \n}',
            'text': ''
        };
        return defaults[type] || '';
    }

    createFolder(name, path = '/') {
        const fullPath = path + name + '/';
        const existing = this.getFolderByPath(fullPath);
        if (existing) return existing;

        const folder = {
            id: 'folder-' + Date.now() + Math.floor(Math.random() * 1000),
            name: name,
            path: fullPath,
            createdAt: new Date().toISOString()
        };
        
        if (!this.projects.folders) {
            this.projects.folders = [];
        }
        this.projects.folders.push(folder);
        this.saveProjects();
        return folder;
    }

    updateFile(id, updates) {
        const file = this.getFileById(id);
        if (file) {
            Object.assign(file, updates);
            file.updatedAt = new Date().toISOString();
            this.saveProjects();
            return file;
        }
        return null;
    }

    deleteFile(id) {
        const index = this.projects.files.findIndex(f => f.id === id);
        if (index !== -1) {
            this.projects.files.splice(index, 1);
            this.saveProjects();
            // 从打开的标签页中移除
            this.closeTab(id);
            return true;
        }
        return false;
    }

    deleteFolder(id) {
        const folder = this.projects.folders.find(f => f.id === id);
        if (folder) {
            // 删除文件夹下的所有文件
            this.projects.files = this.projects.files.filter(f => !f.path.startsWith(folder.path));
            // 删除子文件夹
            this.projects.folders = this.projects.folders.filter(f => !f.path.startsWith(folder.path));
            this.saveProjects();
            return true;
        }
        return false;
    }

    renameFile(id, newName) {
        const file = this.getFileById(id);
        if (file) {
            const pathParts = file.path.split('/');
            pathParts[pathParts.length - 1] = newName;
            file.name = newName;
            file.path = pathParts.join('/');
            file.type = this.getFileType(newName);
            this.saveProjects();
            return file;
        }
        return null;
    }

    openTab(fileId) {
        if (!this.openTabs.includes(fileId)) {
            this.openTabs.push(fileId);
        }
        this.currentFile = fileId;
    }

    closeTab(fileId) {
        const index = this.openTabs.indexOf(fileId);
        if (index !== -1) {
            this.openTabs.splice(index, 1);
            if (this.currentFile === fileId) {
                this.currentFile = this.openTabs.length > 0 ? this.openTabs[this.openTabs.length - 1] : null;
            }
        }
    }

    getFileIcon(type) {
        const icons = {
            'html': '📄',
            'css': '🎨',
            'javascript': '⚡',
            'json': '📋',
            'text': '📝'
        };
        return icons[type] || '📄';
    }

    exportProject() {
        return JSON.stringify(this.projects, null, 2);
    }

    importProject(projectData) {
        try {
            this.projects = JSON.parse(projectData);
            this.saveProjects();
            return true;
        } catch (e) {
            console.error('导入失败:', e);
            return false;
        }
    }

    clearAll() {
        this.projects.files = [];
        this.projects.folders = [];
        this.openTabs = [];
        this.currentFile = null;
        this.saveProjects();
    }
}