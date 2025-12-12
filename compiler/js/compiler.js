// 代码编译和执行引擎
class Compiler {
    constructor(consoleOutputId, previewFrameId) {
        this.consoleOutput = document.getElementById(consoleOutputId);
        this.previewFrame = document.getElementById(previewFrameId);
        this.setupConsole();
    }

    setupConsole() {
        // 保存原始console方法
        this.originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };
    }

    clearConsole() {
        if (this.consoleOutput) {
            this.consoleOutput.innerHTML = '';
        }
    }

    log(message, type = 'log') {
        if (!this.consoleOutput) return;

        const logEntry = document.createElement('div');
        logEntry.className = `console-${type}`;
        
        // 格式化输出
        let formattedMessage = message;
        if (typeof message === 'object') {
            try {
                formattedMessage = JSON.stringify(message, null, 2);
            } catch (e) {
                formattedMessage = String(message);
            }
        }
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.innerHTML = `<span style="color:#888">[${timestamp}]</span> ${this.escapeHtml(formattedMessage)}`;
        this.consoleOutput.appendChild(logEntry);
        this.consoleOutput.scrollTop = this.consoleOutput.scrollHeight;
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    runJavaScript(code) {
        this.clearConsole();
        
        try {
            // 创建自定义console对象
            const customConsole = {
                log: (...args) => this.log(args.join(' '), 'log'),
                error: (...args) => this.log(args.join(' '), 'error'),
                warn: (...args) => this.log(args.join(' '), 'warn'),
                info: (...args) => this.log(args.join(' '), 'info')
            };

            // 使用Function构造函数执行代码
            const func = new Function('console', code);
            func(customConsole);
            
            this.log('代码执行完成', 'info');
        } catch (error) {
            this.log('错误: ' + error.message, 'error');
            console.error(error);
        }
    }

    runHTML(html, css = '', js = '') {
        if (!this.previewFrame) return;

        // 构建完整的HTML文档
        const fullHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
        ${css}
    </style>
</head>
<body>
    ${html}
    <script>
        // 重定向console到父窗口
        (function() {
            const originalConsole = window.console;
            window.console = {
                log: function(...args) {
                    window.parent.postMessage({type: 'console', method: 'log', args: args}, '*');
                },
                error: function(...args) {
                    window.parent.postMessage({type: 'console', method: 'error', args: args}, '*');
                },
                warn: function(...args) {
                    window.parent.postMessage({type: 'console', method: 'warn', args: args}, '*');
                },
                info: function(...args) {
                    window.parent.postMessage({type: 'console', method: 'info', args: args}, '*');
                }
            };

            // 捕获错误
            window.onerror = function(message, source, lineno, colno, error) {
                window.parent.postMessage({
                    type: 'console',
                    method: 'error',
                    args: ['Error: ' + message + ' at line ' + lineno]
                }, '*');
                return true;
            };
        })();

        ${js}
    </script>
</body>
</html>`;

        // 写入iframe
        const frame = this.previewFrame;
        frame.srcdoc = fullHTML;

        this.clearConsole();
        this.log('预览已更新', 'info');
    }

    runCode(fileManager) {
        const files = fileManager.getAllFiles();
        
        // 查找HTML, CSS, JS文件
        const htmlFile = files.find(f => f.type === 'html');
        const cssFiles = files.filter(f => f.type === 'css');
        const jsFiles = files.filter(f => f.type === 'javascript');

        if (htmlFile) {
            // 如果有HTML文件，运行完整项目
            const css = cssFiles.map(f => f.content).join('\n');
            const js = jsFiles.map(f => f.content).join('\n');
            this.runHTML(htmlFile.content, css, js);
        } else if (jsFiles.length > 0) {
            // 如果只有JS文件，直接执行
            const js = jsFiles.map(f => f.content).join('\n');
            this.runJavaScript(js);
        } else if (fileManager.currentFile) {
            // 执行当前文件
            const currentFile = fileManager.getFileById(fileManager.currentFile);
            if (currentFile) {
                if (currentFile.type === 'javascript') {
                    this.runJavaScript(currentFile.content);
                } else if (currentFile.type === 'html') {
                    this.runHTML(currentFile.content);
                }
            }
        } else {
            this.log('没有可执行的代码', 'warn');
        }
    }
}

// 监听来自iframe的console消息
window.addEventListener('message', function(event) {
    if (event.data.type === 'console') {
        const compiler = window.editorCompiler || window.studentCompiler;
        if (compiler) {
            const args = event.data.args.map(arg => {
                if (typeof arg === 'object') {
                    return JSON.stringify(arg);
                }
                return String(arg);
            }).join(' ');
            compiler.log(args, event.data.method);
        }
    }
});