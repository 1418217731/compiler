// 代码模板管理
const CodeTemplates = {
    // HTML模板
    html: {
        basic: {
            name: '基础HTML',
            icon: '📄',
            content: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>文档标题</title>
</head>
<body>
    <h1>Hello World!</h1>
</body>
</html>`
        },
        form: {
            name: '表单页面',
            icon: '📝',
            content: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>表单示例</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h2 { color: #333; text-align: center; margin-bottom: 30px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; color: #666; font-weight: bold; }
        input, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; }
        input:focus, textarea:focus { outline: none; border-color: #667eea; }
        textarea { resize: vertical; min-height: 100px; }
        button { width: 100%; padding: 12px; background: #667eea; color: white; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; }
        button:hover { background: #5568d3; }
    </style>
</head>
<body>
    <div class="container">
        <h2>用户注册</h2>
        <form id="myForm">
            <div class="form-group">
                <label>用户名</label>
                <input type="text" name="username" placeholder="请输入用户名" required>
            </div>
            <div class="form-group">
                <label>邮箱</label>
                <input type="email" name="email" placeholder="请输入邮箱" required>
            </div>
            <div class="form-group">
                <label>个人简介</label>
                <textarea name="bio" placeholder="介绍一下自己..."></textarea>
            </div>
            <button type="submit">提交</button>
        </form>
    </div>
    <script>
        document.getElementById('myForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            console.log('表单数据:', data);
            alert('提交成功！');
        });
    </script>
</body>
</html>`
        }
    },

    // JavaScript模板
    javascript: {
        basic: {
            name: '基础JS',
            icon: '⚡',
            content: `// 基础JavaScript代码
console.log('Hello, JavaScript!');

// 变量声明
let message = 'Welcome';
const PI = 3.14159;

// 函数
function greet(name) {
    return \`Hello, \${name}!\`;
}

console.log(greet('World'));`
        },
        dom: {
            name: 'DOM操作',
            icon: '🎨',
            content: `// DOM操作示例
document.addEventListener('DOMContentLoaded', function() {
    // 获取元素
    const app = document.getElementById('app');
    
    // 创建元素
    const heading = document.createElement('h1');
    heading.textContent = '欢迎！';
    heading.style.color = '#667eea';
    
    const button = document.createElement('button');
    button.textContent = '点击我';
    button.style.padding = '10px 20px';
    button.style.background = '#667eea';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    
    // 添加元素
    app.appendChild(heading);
    app.appendChild(button);
    
    // 事件监听
    button.addEventListener('click', function() {
        heading.textContent = '你点击了按钮！';
        button.style.background = '#764ba2';
    });
});`
        },
        array: {
            name: '数组操作',
            icon: '📋',
            content: `// 数组方法示例
const numbers = [1, 2, 3, 4, 5];

// map - 映射
const doubled = numbers.map(n => n * 2);
console.log('doubled:', doubled);

// filter - 过滤
const evens = numbers.filter(n => n % 2 === 0);
console.log('evens:', evens);

// reduce - 归约
const sum = numbers.reduce((acc, n) => acc + n, 0);
console.log('sum:', sum);

// forEach - 遍历
numbers.forEach(n => console.log(n));

// find - 查找
const found = numbers.find(n => n > 3);
console.log('found:', found);

// some/every
const hasEven = numbers.some(n => n % 2 === 0);
const allPositive = numbers.every(n => n > 0);
console.log('hasEven:', hasEven, 'allPositive:', allPositive);`
        },
        async: {
            name: '异步编程',
            icon: '⏱️',
            content: `// 异步编程示例

// Promise
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// async/await
async function asyncExample() {
    console.log('开始...');
    await delay(1000);
    console.log('1秒后...');
    await delay(1000);
    console.log('2秒后...');
    return '完成！';
}

asyncExample().then(result => console.log(result));

// Fetch API
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('请求失败');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('错误:', error);
    }
}`
        },
        class: {
            name: 'ES6类',
            icon: '📦',
            content: `// ES6 类示例
class Person {
    constructor(name, age) {
        this.name = name;
        this.age = age;
    }
    
    introduce() {
        return \`我叫\${this.name}，今年\${this.age}岁。\`;
    }
    
    static create(name, age) {
        return new Person(name, age);
    }
}

// 继承
class Student extends Person {
    constructor(name, age, grade) {
        super(name, age);
        this.grade = grade;
    }
    
    study() {
        return \`\${this.name}正在学习\`;
    }
    
    get info() {
        return \`\${this.introduce()} 年级:\${this.grade}\`;
    }
}

const student = new Student('小明', 18, '高三');
console.log(student.info);
console.log(student.study());`
        }
    },

    // CSS模板
    css: {
        basic: {
            name: '基础CSS',
            icon: '🎨',
            content: `/* 基础样式 */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    color: #333;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

h1 {
    color: #667eea;
    margin-bottom: 20px;
}

p {
    margin-bottom: 15px;
}`
        },
        flexbox: {
            name: 'Flexbox布局',
            icon: '📐',
            content: `/* Flexbox 布局示例 */
.flex-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    padding: 20px;
    background: #f5f5f5;
}

.flex-item {
    flex: 1;
    padding: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* 响应式 */
@media (max-width: 768px) {
    .flex-container {
        flex-direction: column;
    }
}`
        },
        grid: {
            name: 'Grid布局',
            icon: '🔲',
            content: `/* Grid 布局示例 */
.grid-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    padding: 20px;
}

.grid-item {
    padding: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: transform 0.3s;
}

.grid-item:hover {
    transform: translateY(-5px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}`
        }
    },

    // D3.js模板
    d3: {
        bar: {
            name: 'D3柱状图',
            icon: '📊',
            content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>D3.js 柱状图</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .bar { fill: steelblue; }
        .bar:hover { fill: orange; }
        .axis { font-size: 12px; }
    </style>
</head>
<body>
    <div id="chart"></div>
    <script>
        // 数据
        const data = [30, 86, 168, 281, 303, 365];
        
        // 尺寸
        const margin = {top: 20, right: 20, bottom: 30, left: 40};
        const width = 600 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;
        
        // 创建SVG
        const svg = d3.select('#chart')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', \`translate(\${margin.left},\${margin.top})\`);
        
        // 比例尺
        const x = d3.scaleBand()
            .range([0, width])
            .domain(data.map((d, i) => i))
            .padding(0.1);
        
        const y = d3.scaleLinear()
            .range([height, 0])
            .domain([0, d3.max(data)]);
        
        // 绘制柱子
        svg.selectAll('.bar')
            .data(data)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', (d, i) => x(i))
            .attr('width', x.bandwidth())
            .attr('y', d => y(d))
            .attr('height', d => height - y(d));
        
        // 添加坐标轴
        svg.append('g')
            .attr('class', 'axis')
            .attr('transform', \`translate(0,\${height})\`)
            .call(d3.axisBottom(x));
        
        svg.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(y));
    </script>
</body>
</html>`
        },
        line: {
            name: 'D3折线图',
            icon: '📈',
            content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>D3.js 折线图</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .line { fill: none; stroke: steelblue; stroke-width: 2px; }
        .dot { fill: steelblue; }
        .dot:hover { fill: orange; r: 6; }
    </style>
</head>
<body>
    <div id="chart"></div>
    <script>
        // 数据
        const data = [
            {x: 0, y: 30},
            {x: 1, y: 86},
            {x: 2, y: 168},
            {x: 3, y: 281},
            {x: 4, y: 303},
            {x: 5, y: 365}
        ];
        
        // 尺寸
        const margin = {top: 20, right: 20, bottom: 30, left: 40};
        const width = 600 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;
        
        // 创建SVG
        const svg = d3.select('#chart')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', \`translate(\${margin.left},\${margin.top})\`);
        
        // 比例尺
        const x = d3.scaleLinear()
            .range([0, width])
            .domain(d3.extent(data, d => d.x));
        
        const y = d3.scaleLinear()
            .range([height, 0])
            .domain([0, d3.max(data, d => d.y)]);
        
        // 线条生成器
        const line = d3.line()
            .x(d => x(d.x))
            .y(d => y(d.y));
        
        // 绘制线条
        svg.append('path')
            .datum(data)
            .attr('class', 'line')
            .attr('d', line);
        
        // 绘制点
        svg.selectAll('.dot')
            .data(data)
            .enter().append('circle')
            .attr('class', 'dot')
            .attr('cx', d => x(d.x))
            .attr('cy', d => y(d.y))
            .attr('r', 4);
        
        // 添加坐标轴
        svg.append('g')
            .attr('transform', \`translate(0,\${height})\`)
            .call(d3.axisBottom(x));
        
        svg.append('g')
            .call(d3.axisLeft(y));
    </script>
</body>
</html>`
        }
    }
};