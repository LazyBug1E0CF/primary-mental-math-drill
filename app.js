/**
 * 小学生口算题生成器
 * 核心功能实现
 */

// ==================== 全局状态管理 ====================
const state = {
    // 题目数据：每个格子的配置和内容
    questions: [],
    // 当前选中的格子索引
    selectedCells: new Set(),
    // 当前工具：brush | eraser
    currentTool: 'brush',
    // 是否正在拖拽
    isDragging: false,
    // 拖拽起始格子索引
    dragStartIndex: -1,
    // 拖拽当前格子索引
    dragCurrentIndex: -1,
    // 拖拽选区是否已激活（鼠标离开起始格子后激活）
    dragActivated: false,
    // 当前列数（用于计算行列位置）
    currentColumns: 4,
    // 拖拽预览数据：存储预览题目 { index: { text, answer } }
    dragPreview: {},
    // 上一次选区的索引集合（用于判断选区变化）
    lastSelectedIndices: [],
    // 撤销/重做历史
    history: [],
    historyIndex: -1,
    maxHistory: 50,
    // 已生成的题目集合（用于去重）
    generatedQuestions: new Set(),
    // 预设数据
    brushPresets: [],
    paperPresets: [],
    rangePresets: [
        { min: 1, max: 10 },
        { min: 1, max: 20 },
        { min: 1, max: 50 },
        { min: 1, max: 100 }
    ]
};

// ==================== 题刷配置 ====================
const brushConfig = {
    operandCount: 2,            // 运算数个数
    // 每个数字的范围
    ranges: [
        { min: 1, max: 20 },    // 数字1
        { min: 1, max: 20 },    // 数字2
        { min: 1, max: 20 }     // 数字3
    ],
    // 每个位置允许的运算符（符号形式）
    operators: [
        ['+', '-'],             // 运算符1
        ['+', '-']              // 运算符2
    ],
    useBracket: false,          // 使用括号
    questionFormat: 'standard'  // 题目格式
};

// ==================== DOM 元素引用 ====================
const elements = {};

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    initElements();
    loadFromStorage();
    initGrid();
    initEventListeners();
    updateUIFromConfig();
});

function initElements() {
    elements.questionsGrid = document.getElementById('questionsGrid');
    elements.answersGrid = document.getElementById('answersGrid');
    elements.answerPage = document.getElementById('answerPage');
    elements.paperHeader = document.getElementById('paperHeader');
    elements.configPanel = document.getElementById('configPanel');
    elements.panelToggle = document.getElementById('panelToggle');
    elements.brushTool = document.getElementById('brushTool');
    elements.eraserTool = document.getElementById('eraserTool');
    elements.brushConfig = document.getElementById('brushConfig');
    elements.presetModal = document.getElementById('presetModal');
    elements.editModal = document.getElementById('editModal');
    
    // Tab 元素
    elements.tabButtons = document.querySelectorAll('.tab-btn');
    elements.tabBrush = document.getElementById('tabBrush');
    elements.tabPaper = document.getElementById('tabPaper');
    
    // 配置输入元素
    elements.operandCountBtns = document.getElementById('operandCountBtns');
    elements.expressionBuilder = document.getElementById('expressionBuilder');
    elements.bracketGroup = document.getElementById('bracketGroup');
    elements.useBracket = document.getElementById('useBracket');
    elements.questionFormat = document.getElementById('questionFormat');
    
    // 表达式配置元素
    elements.num1Min = document.getElementById('num1Min');
    elements.num1Max = document.getElementById('num1Max');
    elements.num2Min = document.getElementById('num2Min');
    elements.num2Max = document.getElementById('num2Max');
    elements.num3Min = document.getElementById('num3Min');
    elements.num3Max = document.getElementById('num3Max');
    elements.ops1 = document.getElementById('ops1');
    elements.ops2 = document.getElementById('ops2');
    elements.ops2Group = document.getElementById('ops2Group');
    elements.num3Group = document.getElementById('num3Group');
    
    // 试卷设置
    elements.questionCount = document.getElementById('questionCount');
    elements.questionCountOptions = document.getElementById('questionCountOptions');
    elements.columnCount = document.getElementById('columnCount');
    elements.showNumbers = document.getElementById('showNumbers');
    elements.paperTitle = document.getElementById('paperTitle');
    elements.headerMode = document.getElementById('headerMode');
    elements.paperTitleText = document.getElementById('paperTitleText');
    elements.answerTitleText = document.getElementById('answerTitleText');
    
    // 操作按钮
    elements.fillAllBtn = document.getElementById('fillAllBtn');
    elements.clearAllBtn = document.getElementById('clearAllBtn');
    elements.undoBtn = document.getElementById('undoBtn');
    elements.redoBtn = document.getElementById('redoBtn');
    elements.printBtn = document.getElementById('printBtn');
    
    // 预设相关
    elements.saveBrushPreset = document.getElementById('saveBrushPreset');
    elements.savePaperPreset = document.getElementById('savePaperPreset');
    elements.brushPresetList = document.getElementById('brushPresetList');
    elements.paperPresetList = document.getElementById('paperPresetList');
    elements.presetName = document.getElementById('presetName');
    elements.modalTitle = document.getElementById('modalTitle');
    elements.modalCancel = document.getElementById('modalCancel');
    elements.modalConfirm = document.getElementById('modalConfirm');
    elements.editCancel = document.getElementById('editCancel');
    elements.editConfirm = document.getElementById('editConfirm');
}

// ==================== 网格初始化 ====================
function initGrid() {
    const count = parseInt(elements.questionCount.value) || 100;
    state.questions = new Array(count).fill(null).map(() => ({
        config: null,
        text: '',
        answer: ''
    }));
    renderGrid();
}

function renderGrid() {
    const count = state.questions.length;
    elements.questionsGrid.innerHTML = '';
    
    // 设置列数
    const colSetting = elements.columnCount.value;
    elements.questionsGrid.className = 'questions-grid';
    if (colSetting === 'auto') {
        const cols = calculateOptimalColumns(count);
        elements.questionsGrid.classList.add(`cols-${cols}`);
    } else {
        elements.questionsGrid.classList.add(`cols-${colSetting}`);
    }
    
    // 渲染格子
    state.questions.forEach((q, index) => {
        const cell = document.createElement('div');
        cell.className = 'question-cell' + (q.text ? ' filled' : ' empty');
        cell.dataset.index = index;
        
        if (elements.showNumbers.checked && q.text) {
            const numSpan = document.createElement('span');
            numSpan.className = 'question-number';
            numSpan.textContent = index + 1;
            cell.appendChild(numSpan);
        }
        
        const textSpan = document.createElement('span');
        textSpan.className = 'question-text';
        
        // 将答案显示在 ___ 的位置
        if (q.text && q.answer) {
            // 替换 ___ 为带样式的答案
            const parts = q.text.split('___');
            if (parts.length === 2) {
                textSpan.innerHTML = escapeHtml(parts[0]) + 
                    '<span class="question-answer">' + escapeHtml(q.answer) + '</span>' + 
                    escapeHtml(parts[1]);
            } else {
                textSpan.textContent = q.text;
            }
        } else {
            textSpan.textContent = q.text || '';
        }
        cell.appendChild(textSpan);
        
        // 已填充的格子添加清除按钮
        if (q.text) {
            const clearBtn = document.createElement('span');
            clearBtn.className = 'clear-btn';
            clearBtn.innerHTML = '&times;';
            clearBtn.title = '清除';
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                saveHistory();
                state.questions[index] = { config: null, text: '', answer: '' };
                renderGrid();
            });
            cell.appendChild(clearBtn);
        }
        
        if (state.selectedCells.has(index)) {
            cell.classList.add('selected');
        }
        
        elements.questionsGrid.appendChild(cell);
    });
    
    // 更新答案页
    renderAnswers();
}

function renderAnswers() {
    const colSetting = elements.columnCount.value;
    elements.answersGrid.className = 'answers-grid';
    if (colSetting === 'auto') {
        const cols = calculateOptimalColumns(state.questions.length);
        elements.answersGrid.classList.add(`cols-${cols}`);
    } else {
        elements.answersGrid.classList.add(`cols-${colSetting}`);
    }
    
    elements.answersGrid.innerHTML = '';
    state.questions.forEach((q, index) => {
        const cell = document.createElement('div');
        cell.className = 'answer-cell';
        if (q.answer) {
            cell.textContent = `${index + 1}. ${q.answer}`;
        }
        elements.answersGrid.appendChild(cell);
    });
}

function calculateOptimalColumns(count) {
    if (count <= 20) return 2;
    if (count <= 40) return 3;
    if (count <= 80) return 4;
    return 5;
}

// ==================== 事件监听 ====================
function initEventListeners() {
    // 面板折叠
    elements.panelToggle.addEventListener('click', togglePanel);
    
    // Tab 切换
    elements.tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // 工具切换
    elements.brushTool.addEventListener('click', () => setTool('brush'));
    elements.eraserTool.addEventListener('click', () => setTool('eraser'));
    
    // 运算数个数按钮点击
    elements.operandCountBtns.addEventListener('click', (e) => {
        const btn = e.target.closest('.operand-btn');
        if (btn) {
            elements.operandCountBtns.querySelectorAll('.operand-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            brushConfig.operandCount = parseInt(btn.dataset.count);
            onOperandCountChange();
        }
    });
    
    // 表达式配置变化 - 数字范围
    elements.num1Min.addEventListener('change', () => syncRangeConfig());
    elements.num1Max.addEventListener('change', () => syncRangeConfig());
    elements.num2Min.addEventListener('change', () => syncRangeConfig());
    elements.num2Max.addEventListener('change', () => syncRangeConfig());
    elements.num3Min.addEventListener('change', () => syncRangeConfig());
    elements.num3Max.addEventListener('change', () => syncRangeConfig());
    
    // 表达式配置变化 - 运算符
    elements.ops1.addEventListener('change', () => syncOperatorsConfig());
    elements.ops2.addEventListener('change', () => syncOperatorsConfig());
    
    // 括号和格式
    elements.useBracket.addEventListener('change', () => {
        brushConfig.useBracket = elements.useBracket.checked;
    });
    elements.questionFormat.addEventListener('change', () => {
        brushConfig.questionFormat = elements.questionFormat.value;
    });
    
    // 试卷设置变化
    elements.questionCount.addEventListener('change', onQuestionCountChange);
    elements.questionCountOptions.addEventListener('click', onQuestionCountQuickSelect);
    elements.columnCount.addEventListener('change', renderGrid);
    elements.showNumbers.addEventListener('change', renderGrid);
    elements.paperTitle.addEventListener('input', onPaperTitleChange);
    elements.headerMode.addEventListener('change', onHeaderModeChange);
    
    // 快捷操作
    elements.fillAllBtn.addEventListener('click', fillAllEmpty);
    elements.clearAllBtn.addEventListener('click', clearAll);
    elements.undoBtn.addEventListener('click', undo);
    elements.redoBtn.addEventListener('click', redo);
    elements.printBtn.addEventListener('click', printPaper);
    
    // 预设操作
    elements.saveBrushPreset.addEventListener('click', () => showPresetModal('brush'));
    elements.savePaperPreset.addEventListener('click', () => showPresetModal('paper'));
    elements.modalCancel.addEventListener('click', hidePresetModal);
    elements.modalConfirm.addEventListener('click', savePreset);
    elements.editCancel.addEventListener('click', hideEditModal);
    elements.editConfirm.addEventListener('click', confirmEditQuestion);
    
    // 网格交互
    elements.questionsGrid.addEventListener('mousedown', onGridMouseDown);
    elements.questionsGrid.addEventListener('mousemove', onGridMouseMove);
    document.addEventListener('mouseup', onGridMouseUp);
    
    // 键盘快捷键
    document.addEventListener('keydown', onKeyDown);
}

// ==================== 工具切换 ====================
function setTool(tool) {
    state.currentTool = tool;
    elements.brushTool.classList.toggle('active', tool === 'brush');
    elements.eraserTool.classList.toggle('active', tool === 'eraser');
    elements.brushConfig.style.display = tool === 'brush' ? 'block' : 'none';
}

function togglePanel() {
    elements.configPanel.classList.toggle('collapsed');
    document.querySelector('.paper-area').classList.toggle('panel-collapsed');
}

// ==================== Tab 切换 ====================
function switchTab(tabName) {
    // 更新按钮状态
    elements.tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // 更新内容显示
    elements.tabBrush.classList.toggle('active', tabName === 'brush');
    elements.tabPaper.classList.toggle('active', tabName === 'paper');
}

// ==================== 表达式配置同步 ====================
function syncRangeConfig() {
    brushConfig.ranges[0] = {
        min: parseInt(elements.num1Min.value) || 1,
        max: parseInt(elements.num1Max.value) || 20
    };
    brushConfig.ranges[1] = {
        min: parseInt(elements.num2Min.value) || 1,
        max: parseInt(elements.num2Max.value) || 20
    };
    brushConfig.ranges[2] = {
        min: parseInt(elements.num3Min.value) || 1,
        max: parseInt(elements.num3Max.value) || 20
    };
}

function syncOperatorsConfig() {
    // 获取运算符1的选中状态
    const ops1Checkboxes = elements.ops1.querySelectorAll('input[type="checkbox"]');
    const ops1Selected = [];
    ops1Checkboxes.forEach(cb => {
        if (cb.checked) ops1Selected.push(cb.value);
    });
    // 至少选中一个
    if (ops1Selected.length === 0) {
        ops1Checkboxes[0].checked = true;
        ops1Selected.push(ops1Checkboxes[0].value);
    }
    brushConfig.operators[0] = ops1Selected;
    
    // 获取运算符2的选中状态
    const ops2Checkboxes = elements.ops2.querySelectorAll('input[type="checkbox"]');
    const ops2Selected = [];
    ops2Checkboxes.forEach(cb => {
        if (cb.checked) ops2Selected.push(cb.value);
    });
    // 至少选中一个
    if (ops2Selected.length === 0) {
        ops2Checkboxes[0].checked = true;
        ops2Selected.push(ops2Checkboxes[0].value);
    }
    brushConfig.operators[1] = ops2Selected;
}

function onOperandCountChange() {
    const count = brushConfig.operandCount;
    
    // 显示/隐藏运算符2和数字3
    elements.ops2Group.style.display = count >= 3 ? 'flex' : 'none';
    elements.num3Group.style.display = count >= 3 ? 'flex' : 'none';
    
    // 3个运算数时才显示括号选项
    elements.bracketGroup.style.display = count >= 3 ? 'block' : 'none';
}

function onQuestionCountChange() {
    let newCount = parseInt(elements.questionCount.value) || 100;
    
    // 限制范围 60~120
    if (newCount < 60) {
        newCount = 60;
        elements.questionCount.value = 60;
    } else if (newCount > 120) {
        newCount = 120;
        elements.questionCount.value = 120;
    }
    
    // 更新快捷按钮状态
    updateQuestionCountButtons(newCount);
    
    const oldCount = state.questions.length;
    
    saveHistory();
    
    if (newCount > oldCount) {
        for (let i = oldCount; i < newCount; i++) {
            state.questions.push({ config: null, text: '', answer: '' });
        }
    } else {
        state.questions = state.questions.slice(0, newCount);
    }
    
    renderGrid();
}

function updateQuestionCountButtons(count) {
    elements.questionCountOptions.querySelectorAll('.quick-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.value) === count);
    });
}

function onQuestionCountQuickSelect(e) {
    const btn = e.target.closest('.quick-btn');
    if (!btn) return;
    
    const value = parseInt(btn.dataset.value);
    elements.questionCount.value = value;
    
    onQuestionCountChange();
}

// ==================== 头部信息设置 ====================
function onPaperTitleChange() {
    const title = elements.paperTitle.value || '口算练习';
    elements.paperTitleText.textContent = title;
    elements.answerTitleText.textContent = title + ' - 答案';
    saveToStorage();
}

function onHeaderModeChange() {
    const mode = elements.headerMode.value;
    elements.paperHeader.classList.remove('hidden', 'print-only');
    
    if (mode === 'hidden') {
        elements.paperHeader.classList.add('hidden');
    } else if (mode === 'print-only') {
        elements.paperHeader.classList.add('print-only');
    }
    // mode === 'show' 不需要添加任何类
    
    saveToStorage();
}

// ==================== 网格交互 ====================
function onGridMouseDown(e) {
    const cell = e.target.closest('.question-cell');
    if (!cell) return;
    
    // 如果点击的是清除按钮，不开始拖拽
    if (e.target.classList.contains('clear-btn')) {
        return;
    }
    
    const index = parseInt(cell.dataset.index);
    
    // 开始拖拽，但先不激活选区（等待鼠标离开起始格子）
    state.isDragging = true;
    state.dragStartIndex = index;
    state.dragCurrentIndex = index;
    state.dragActivated = false;  // 标记选区是否已激活
    state.selectedCells.clear();
    state.dragPreview = {};
    state.lastSelectedIndices = [];
    
    // 添加拖拽样式
    elements.questionsGrid.classList.add('dragging');
    
    e.preventDefault(); // 防止文字选中
}

function onGridMouseMove(e) {
    if (!state.isDragging) return;
    
    const cell = e.target.closest('.question-cell');
    if (!cell) return;
    
    const index = parseInt(cell.dataset.index);
    
    // 如果回到起始格子，取消选区激活，清除预览
    if (index === state.dragStartIndex) {
        if (state.dragActivated) {
            state.dragActivated = false;
            clearSelectionPreview();
        }
        state.dragCurrentIndex = index;
        return;
    }
    
    // 离开起始格子，激活选区
    if (!state.dragActivated) {
        state.dragActivated = true;
    }
    
    // 更新当前格子并显示预览
    if (index !== state.dragCurrentIndex) {
        state.dragCurrentIndex = index;
        updateSelectionPreview();
    }
}

function onGridMouseUp() {
    if (state.isDragging) {
        state.isDragging = false;
        
        // 移除拖拽样式
        elements.questionsGrid.classList.remove('dragging');
        
        // 只有激活了选区才应用操作
        if (state.dragActivated) {
            // 获取选区内的所有格子
            const selectedIndices = getSelectedRectIndices();
            
            // 只有选区非空时才保存历史和应用操作
            if (selectedIndices.length > 0) {
                // 保存历史
                saveHistory();
                
                // 将预览内容正式应用到数据
                if (state.currentTool === 'brush') {
                    selectedIndices.forEach(idx => {
                        if (state.dragPreview[idx]) {
                            state.questions[idx] = {
                                config: { ...brushConfig },
                                text: state.dragPreview[idx].text,
                                answer: state.dragPreview[idx].answer
                            };
                        }
                    });
                } else {
                    selectedIndices.forEach(idx => eraseCellContent(idx));
                }
            }
        }
        
        // 清除预览数据和选区状态
        state.dragPreview = {};
        state.lastSelectedIndices = [];
        state.dragStartIndex = -1;
        state.dragCurrentIndex = -1;
        state.dragActivated = false;
        renderGrid();
    }
}

// 清除选区预览显示
function clearSelectionPreview() {
    // 恢复所有之前选中格子的原始内容
    state.lastSelectedIndices.forEach(idx => {
        const cell = document.querySelector(`.question-cell[data-index="${idx}"]`);
        if (cell) {
            cell.classList.remove('brushing', 'erasing');
            const original = state.questions[idx];
            const textSpan = cell.querySelector('.question-text');
            if (textSpan) {
                textSpan.textContent = original.text || '';
            }
            cell.classList.toggle('filled', !!original.text);
            cell.classList.toggle('empty', !original.text);
        }
    });
    
    state.dragPreview = {};
    state.lastSelectedIndices = [];
}

// 获取当前列数
function getCurrentColumns() {
    const colSetting = elements.columnCount.value;
    if (colSetting === 'auto') {
        return calculateOptimalColumns(state.questions.length);
    }
    return parseInt(colSetting);
}

// 根据索引获取行列位置
function getRowCol(index) {
    const cols = getCurrentColumns();
    return {
        row: Math.floor(index / cols),
        col: index % cols
    };
}

// 根据行列位置获取索引
function getIndex(row, col) {
    const cols = getCurrentColumns();
    return row * cols + col;
}

// 获取矩形选区内的所有格子索引
function getSelectedRectIndices() {
    if (state.dragStartIndex < 0 || state.dragCurrentIndex < 0) {
        return [];
    }
    
    const start = getRowCol(state.dragStartIndex);
    const end = getRowCol(state.dragCurrentIndex);
    
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    
    const indices = [];
    for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
            const idx = getIndex(row, col);
            if (idx < state.questions.length) {
                indices.push(idx);
            }
        }
    }
    
    return indices;
}

// 更新选区预览显示
function updateSelectionPreview() {
    const currentIndices = getSelectedRectIndices();
    const currentSet = new Set(currentIndices);
    const lastSet = new Set(state.lastSelectedIndices);
    
    // 找出不再选中的格子，恢复其原始内容显示
    state.lastSelectedIndices.forEach(idx => {
        if (!currentSet.has(idx)) {
            const cell = document.querySelector(`.question-cell[data-index="${idx}"]`);
            if (cell) {
                cell.classList.remove('brushing', 'erasing');
                // 恢复原始内容
                const original = state.questions[idx];
                const textSpan = cell.querySelector('.question-text');
                if (textSpan) {
                    textSpan.textContent = original.text || '';
                }
                cell.classList.toggle('filled', !!original.text);
                cell.classList.toggle('empty', !original.text);
            }
            // 从预览中删除
            delete state.dragPreview[idx];
        }
    });
    
    // 找出新选中的格子，生成预览内容
    const highlightClass = state.currentTool === 'brush' ? 'brushing' : 'erasing';
    
    currentIndices.forEach(idx => {
        const cell = document.querySelector(`.question-cell[data-index="${idx}"]`);
        if (!cell) return;
        
        cell.classList.remove('brushing', 'erasing');
        cell.classList.add(highlightClass);
        
        if (state.currentTool === 'brush') {
            // 如果是新选中的格子，生成预览题目
            if (!lastSet.has(idx)) {
                const generated = generateQuestion({ ...brushConfig });
                if (generated) {
                    state.dragPreview[idx] = {
                        text: generated.text,
                        answer: generated.answer
                    };
                }
            }
            // 显示预览内容
            if (state.dragPreview[idx]) {
                const textSpan = cell.querySelector('.question-text');
                if (textSpan) {
                    textSpan.textContent = state.dragPreview[idx].text;
                }
                cell.classList.remove('empty');
                cell.classList.add('filled');
            }
        } else {
            // 橡皮擦模式：显示为空
            const textSpan = cell.querySelector('.question-text');
            if (textSpan) {
                textSpan.textContent = '';
            }
            cell.classList.remove('filled');
            cell.classList.add('empty');
        }
    });
    
    // 更新上一次选区记录
    state.lastSelectedIndices = currentIndices;
}

function applyBrushToCell(index) {
    const question = state.questions[index];
    
    // 如果已有内容，则覆盖重新生成
    const generated = generateQuestion({ ...brushConfig });
    if (generated) {
        question.config = { ...brushConfig };
        question.text = generated.text;
        question.answer = generated.answer;
    }
}

function eraseCellContent(index) {
    state.questions[index] = { config: null, text: '', answer: '' };
}

// ==================== 题目生成算法 ====================
function generateQuestion(config) {
    const maxAttempts = 100;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // 使用新的表达式生成
        const result = generateExpression(config);
        
        if (result) {
            // 根据格式生成最终文本
            const finalResult = applyFormat(result, config);
            
            // 检查去重
            const key = finalResult.text;
            if (!state.generatedQuestions.has(key)) {
                state.generatedQuestions.add(key);
                return finalResult;
            }
        }
    }
    
    // 如果多次尝试都失败，清除去重集合重试
    state.generatedQuestions.clear();
    return generateQuestion(config);
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// HTML 转义，防止 XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 根据新的配置结构生成表达式
function generateExpression(config) {
    const count = config.operandCount || 2;
    const ranges = config.ranges || [{ min: 1, max: 20 }, { min: 1, max: 20 }, { min: 1, max: 20 }];
    const operatorSets = config.operators || [['+', '-'], ['+', '-']];
    
    // 如果启用括号，先决定是否要生成带括号的题目
    const wantBracket = config.useBracket && count >= 3 && Math.random() < 0.5;
    
    let operands = [];
    let operators = [];
    let bracketStart = -1;
    let bracketEnd = -1;
    
    // 最多尝试20次生成符合条件的表达式
    for (let attempt = 0; attempt < 20; attempt++) {
        operands = [];
        operators = [];
        
        // 生成操作数和运算符
        for (let i = 0; i < count; i++) {
            const range = ranges[i] || { min: 1, max: 20 };
            operands.push(randomInt(range.min, range.max));
            
            if (i < count - 1) {
                const opSet = operatorSets[i] || ['+'];
                const selectedOp = opSet[Math.floor(Math.random() * opSet.length)];
                operators.push(selectedOp);
            }
        }
        
        // 判断是否需要添加括号
        bracketStart = -1;
        bracketEnd = -1;
        
        if (wantBracket) {
            const bracketPosition = findMeaningfulBracket(operators);
            if (bracketPosition) {
                bracketStart = bracketPosition.start;
                bracketEnd = bracketPosition.end;
                break; // 找到有效括号位置，跳出循环
            }
            // 没找到有效括号位置，继续尝试生成新的运算符组合
        } else {
            break; // 不需要括号，直接使用当前生成的表达式
        }
    }
    
    // 验证并调整表达式（确保中间结果合法）
    const adjusted = adjustExpression(operands, operators, config, bracketStart, bracketEnd);
    if (!adjusted) return null;
    
    return {
        operands: adjusted.operands,
        operators: adjusted.operators,
        result: adjusted.result,
        bracketStart: adjusted.bracketStart,
        bracketEnd: adjusted.bracketEnd
    };
}

// 找到有意义的括号位置（只在能改变运算优先级时添加括号）
function findMeaningfulBracket(operators) {
    // 对于3个运算数，有2个运算符：op1, op2
    // 括号位置只有两种：(a op1 b) op2 c 或 a op1 (b op2 c)
    
    if (operators.length !== 2) return null;
    
    const op1 = operators[0];
    const op2 = operators[1];
    
    const isHighPriority = (op) => op === '×' || op === '÷';
    const isLowPriority = (op) => op === '+' || op === '-';
    
    const possiblePositions = [];
    
    // 情况1：(a op1 b) op2 c
    // 当 op1 是低优先级（+、-），op2 是高优先级（×、÷）时有意义
    if (isLowPriority(op1) && isHighPriority(op2)) {
        possiblePositions.push({ start: 0, end: 1 });
    }
    
    // 情况2：a op1 (b op2 c)
    // 当 op1 是 ÷ 且 op2 是低优先级时有意义（a ÷ (b + c)）
    if (op1 === '÷' && isLowPriority(op2)) {
        possiblePositions.push({ start: 1, end: 2 });
    }
    // 当 op1 是 × 且 op2 是低优先级时有意义（a × (b + c)）
    if (op1 === '×' && isLowPriority(op2)) {
        possiblePositions.push({ start: 1, end: 2 });
    }
    // 当 op1 是 - 时，后面加括号会改变结果（a - (b + c) ≠ a - b + c）
    if (op1 === '-') {
        possiblePositions.push({ start: 1, end: 2 });
    }
    
    if (possiblePositions.length === 0) return null;
    
    // 随机选择一个有效位置
    return possiblePositions[Math.floor(Math.random() * possiblePositions.length)];
}

function adjustExpression(operands, operators, config, bracketStart, bracketEnd) {
    // 复制数组以避免修改原数组
    const ops = [...operands];
    const oprs = [...operators];
    
    // 计算结果（考虑运算优先级和括号）
    const result = calculateExpression(ops, oprs, bracketStart, bracketEnd);
    
    if (result === null || result < 0 || !Number.isInteger(result)) {
        return null;
    }
    
    return {
        operands: ops,
        operators: oprs,
        result,
        bracketStart,
        bracketEnd
    };
}

function calculateExpression(operands, operators, bracketStart = -1, bracketEnd = -1) {
    const ops = [...operands];
    const oprs = [...operators];
    
    // 如果有括号，先计算括号内的
    if (bracketStart >= 0 && bracketEnd > bracketStart) {
        const subOps = ops.slice(bracketStart, bracketEnd + 1);
        const subOprs = oprs.slice(bracketStart, bracketEnd);
        const subResult = calculateSimple(subOps, subOprs);
        if (subResult === null) return null;
        
        // 替换括号部分
        ops.splice(bracketStart, bracketEnd - bracketStart + 1, subResult);
        oprs.splice(bracketStart, bracketEnd - bracketStart);
    }
    
    return calculateSimple(ops, oprs);
}

function calculateSimple(operands, operators) {
    const ops = [...operands];
    const oprs = [...operators];
    
    // 先处理乘除
    let i = 0;
    while (i < oprs.length) {
        if (oprs[i] === '×' || oprs[i] === '÷') {
            let result;
            if (oprs[i] === '×') {
                result = ops[i] * ops[i + 1];
            } else {
                if (ops[i + 1] === 0 || ops[i] % ops[i + 1] !== 0) {
                    return null; // 不能整除或除以0
                }
                result = ops[i] / ops[i + 1];
            }
            ops.splice(i, 2, result);
            oprs.splice(i, 1);
        } else {
            i++;
        }
    }
    
    // 再处理加减
    let result = ops[0];
    for (let j = 0; j < oprs.length; j++) {
        if (oprs[j] === '+') {
            result += ops[j + 1];
        } else {
            result -= ops[j + 1];
            if (result < 0) return null; // 结果为负
        }
    }
    
    return result;
}

function applyFormat(questionData, config) {
    const { operands, operators, result, bracketStart, bracketEnd } = questionData;
    let text = '';
    let answer = String(result);
    
    // 判断是否使用填空格式
    const useFillBlank = config.questionFormat === 'fillblank' || 
                         (config.questionFormat === 'mixed' && Math.random() < 0.5);
    
    if (useFillBlank) {
        // 填空格式：随机选择一个操作数变成空
        const blankIndex = Math.floor(Math.random() * operands.length);
        const blankValue = operands[blankIndex];
        
        // 构建带空格的表达式
        const parts = [];
        for (let i = 0; i < operands.length; i++) {
            let part = '';
            if (bracketStart === i) part += '(';
            part += (i === blankIndex) ? '___' : operands[i];
            if (bracketEnd === i) part += ')';
            parts.push(part);
        }
        
        text = parts[0];
        for (let i = 0; i < operators.length; i++) {
            text += ` ${operators[i]} ${parts[i + 1]}`;
        }
        text += ` = ${result}`;
        answer = String(blankValue);
    } else {
        // 标准格式：构建表达式文本
        for (let i = 0; i < operands.length; i++) {
            if (bracketStart === i) text += '(';
            text += operands[i];
            if (bracketEnd === i) text += ')';
            if (i < operators.length) {
                text += ` ${operators[i]} `;
            }
        }
        text += ' = ___';
    }
    
    return { text, answer };
}

// ==================== 快捷操作 ====================
function fillAllEmpty() {
    saveHistory();
    state.generatedQuestions.clear();
    
    state.questions.forEach((q, index) => {
        if (!q.text) {
            applyBrushToCell(index);
        }
    });
    
    renderGrid();
}

function clearAll() {
    saveHistory();
    state.questions = state.questions.map(() => ({ config: null, text: '', answer: '' }));
    state.generatedQuestions.clear();
    renderGrid();
}

// ==================== 撤销/重做 ====================
function saveHistory() {
    // 删除当前位置之后的历史
    state.history = state.history.slice(0, state.historyIndex + 1);
    
    // 保存当前状态
    state.history.push(JSON.stringify(state.questions));
    
    // 限制历史长度
    if (state.history.length > state.maxHistory) {
        state.history.shift();
    }
    
    state.historyIndex = state.history.length - 1;
    updateUndoRedoButtons();
}

function undo() {
    if (state.historyIndex > 0) {
        state.historyIndex--;
        state.questions = JSON.parse(state.history[state.historyIndex]);
        renderGrid();
        updateUndoRedoButtons();
    }
}

function redo() {
    if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        state.questions = JSON.parse(state.history[state.historyIndex]);
        renderGrid();
        updateUndoRedoButtons();
    }
}

function updateUndoRedoButtons() {
    elements.undoBtn.disabled = state.historyIndex <= 0;
    elements.redoBtn.disabled = state.historyIndex >= state.history.length - 1;
}

// ==================== 编辑题目模态框 ====================
let editingIndex = -1;

function showEditModal(index) {
    editingIndex = index;
    const question = state.questions[index];
    
    // 使用题目原有配置或当前题刷配置
    const config = question.config || brushConfig;
    const operandCount = config.operandCount || 2;
    const ranges = config.ranges || [{ min: 1, max: 20 }, { min: 1, max: 20 }, { min: 1, max: 20 }];
    const operatorSets = config.operators || [['+', '-'], ['+', '-']];
    
    // 创建编辑配置界面
    const editConfig = document.querySelector('.edit-config');
    editConfig.innerHTML = `
        <div class="config-group">
            <label class="config-label">运算数个数</label>
            <div class="edit-operand-btns">
                <button type="button" class="operand-btn ${operandCount === 2 ? 'active' : ''}" data-count="2">2个</button>
                <button type="button" class="operand-btn ${operandCount === 3 ? 'active' : ''}" data-count="3">3个</button>
            </div>
        </div>
        <div class="config-group">
            <label class="config-label">数字1范围</label>
            <div class="range-custom">
                <input type="number" id="editNum1Min" class="range-input" value="${ranges[0]?.min || 1}" min="0" max="999">
                <span>至</span>
                <input type="number" id="editNum1Max" class="range-input" value="${ranges[0]?.max || 20}" min="1" max="1000">
            </div>
        </div>
        <div class="config-group">
            <label class="config-label">运算符1</label>
            <div class="edit-ops-checkboxes" id="editOps1">
                <label class="op-checkbox"><input type="checkbox" value="+" ${operatorSets[0]?.includes('+') ? 'checked' : ''}><span>+</span></label>
                <label class="op-checkbox"><input type="checkbox" value="-" ${operatorSets[0]?.includes('-') ? 'checked' : ''}><span>−</span></label>
                <label class="op-checkbox"><input type="checkbox" value="×" ${operatorSets[0]?.includes('×') ? 'checked' : ''}><span>×</span></label>
                <label class="op-checkbox"><input type="checkbox" value="÷" ${operatorSets[0]?.includes('÷') ? 'checked' : ''}><span>÷</span></label>
            </div>
        </div>
        <div class="config-group">
            <label class="config-label">数字2范围</label>
            <div class="range-custom">
                <input type="number" id="editNum2Min" class="range-input" value="${ranges[1]?.min || 1}" min="0" max="999">
                <span>至</span>
                <input type="number" id="editNum2Max" class="range-input" value="${ranges[1]?.max || 20}" min="1" max="1000">
            </div>
        </div>
        <div class="config-group edit-ops2-group" style="display: ${operandCount >= 3 ? 'block' : 'none'}">
            <label class="config-label">运算符2</label>
            <div class="edit-ops-checkboxes" id="editOps2">
                <label class="op-checkbox"><input type="checkbox" value="+" ${operatorSets[1]?.includes('+') ? 'checked' : ''}><span>+</span></label>
                <label class="op-checkbox"><input type="checkbox" value="-" ${operatorSets[1]?.includes('-') ? 'checked' : ''}><span>−</span></label>
                <label class="op-checkbox"><input type="checkbox" value="×" ${operatorSets[1]?.includes('×') ? 'checked' : ''}><span>×</span></label>
                <label class="op-checkbox"><input type="checkbox" value="÷" ${operatorSets[1]?.includes('÷') ? 'checked' : ''}><span>÷</span></label>
            </div>
        </div>
        <div class="config-group edit-num3-group" style="display: ${operandCount >= 3 ? 'block' : 'none'}">
            <label class="config-label">数字3范围</label>
            <div class="range-custom">
                <input type="number" id="editNum3Min" class="range-input" value="${ranges[2]?.min || 1}" min="0" max="999">
                <span>至</span>
                <input type="number" id="editNum3Max" class="range-input" value="${ranges[2]?.max || 20}" min="1" max="1000">
            </div>
        </div>
        <div class="config-group">
            <label class="config-label">题目格式</label>
            <select id="editQuestionFormat" class="config-select">
                <option value="standard" ${config.questionFormat === 'standard' ? 'selected' : ''}>标准格式 (a+b=__)</option>
                <option value="fillblank" ${config.questionFormat === 'fillblank' ? 'selected' : ''}>填空格式 (a+__=c)</option>
                <option value="mixed" ${config.questionFormat === 'mixed' ? 'selected' : ''}>混合格式</option>
            </select>
        </div>
    `;
    
    // 绑定运算数个数按钮事件
    const operandBtns = editConfig.querySelectorAll('.edit-operand-btns .operand-btn');
    operandBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            operandBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const count = parseInt(btn.dataset.count);
            editConfig.querySelector('.edit-ops2-group').style.display = count >= 3 ? 'block' : 'none';
            editConfig.querySelector('.edit-num3-group').style.display = count >= 3 ? 'block' : 'none';
        });
    });
    
    elements.editModal.classList.add('show');
}

function hideEditModal() {
    elements.editModal.classList.remove('show');
    editingIndex = -1;
}

function confirmEditQuestion() {
    if (editingIndex < 0) return;
    
    saveHistory();
    
    const editConfig = document.querySelector('.edit-config');
    
    // 获取运算数个数
    const activeOperandBtn = editConfig.querySelector('.edit-operand-btns .operand-btn.active');
    const operandCount = activeOperandBtn ? parseInt(activeOperandBtn.dataset.count) : 2;
    
    // 获取数字范围
    const ranges = [
        { min: parseInt(document.getElementById('editNum1Min').value) || 1, max: parseInt(document.getElementById('editNum1Max').value) || 20 },
        { min: parseInt(document.getElementById('editNum2Min').value) || 1, max: parseInt(document.getElementById('editNum2Max').value) || 20 },
        { min: parseInt(document.getElementById('editNum3Min').value) || 1, max: parseInt(document.getElementById('editNum3Max').value) || 20 }
    ];
    
    // 获取运算符1
    const ops1Selected = [];
    document.querySelectorAll('#editOps1 input:checked').forEach(cb => ops1Selected.push(cb.value));
    if (ops1Selected.length === 0) ops1Selected.push('+');
    
    // 获取运算符2
    const ops2Selected = [];
    document.querySelectorAll('#editOps2 input:checked').forEach(cb => ops2Selected.push(cb.value));
    if (ops2Selected.length === 0) ops2Selected.push('+');
    
    const config = {
        operandCount,
        ranges,
        operators: [ops1Selected, ops2Selected],
        useBracket: false,
        questionFormat: document.getElementById('editQuestionFormat').value
    };
    
    const generated = generateQuestion(config);
    if (generated) {
        state.questions[editingIndex] = {
            config: JSON.parse(JSON.stringify(config)),
            text: generated.text,
            answer: generated.answer
        };
    }
    
    hideEditModal();
    renderGrid();
}

// ==================== 预设系统 ====================
let currentPresetType = 'brush';

function showPresetModal(type) {
    currentPresetType = type;
    elements.modalTitle.textContent = type === 'brush' ? '保存题刷预设' : '保存试卷预设';
    elements.presetName.value = '';
    elements.presetModal.classList.add('show');
    elements.presetName.focus();
}

function hidePresetModal() {
    elements.presetModal.classList.remove('show');
}

function savePreset() {
    const name = elements.presetName.value.trim();
    if (!name) return;
    
    if (currentPresetType === 'brush') {
        // 深拷贝配置，确保数组被正确复制
        state.brushPresets.push({
            name,
            config: JSON.parse(JSON.stringify(brushConfig))
        });
        renderBrushPresets();
    } else {
        state.paperPresets.push({
            name,
            questions: state.questions.map(q => q.config ? JSON.parse(JSON.stringify(q.config)) : null),
            settings: {
                count: state.questions.length,
                columns: elements.columnCount.value,
                showNumbers: elements.showNumbers.checked,
                paperTitle: elements.paperTitle.value,
                headerMode: elements.headerMode.value
            }
        });
        renderPaperPresets();
    }
    
    saveToStorage();
    hidePresetModal();
}

function renderBrushPresets() {
    elements.brushPresetList.innerHTML = '';
    state.brushPresets.forEach((preset, index) => {
        const item = document.createElement('div');
        item.className = 'preset-item';
        item.innerHTML = `
            <span class="preset-name">${preset.name}</span>
            <button class="preset-delete" data-index="${index}">×</button>
        `;
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('preset-delete')) {
                state.brushPresets.splice(index, 1);
                renderBrushPresets();
                saveToStorage();
            } else {
                applyBrushPreset(preset);
            }
        });
        elements.brushPresetList.appendChild(item);
    });
}

function renderPaperPresets() {
    elements.paperPresetList.innerHTML = '';
    state.paperPresets.forEach((preset, index) => {
        const item = document.createElement('div');
        item.className = 'preset-item';
        item.innerHTML = `
            <span class="preset-name">${preset.name}</span>
            <button class="preset-delete" data-index="${index}">×</button>
        `;
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('preset-delete')) {
                state.paperPresets.splice(index, 1);
                renderPaperPresets();
                saveToStorage();
            } else {
                applyPaperPreset(preset);
            }
        });
        elements.paperPresetList.appendChild(item);
    });
}

function applyBrushPreset(preset) {
    // 深拷贝配置到 brushConfig
    const newConfig = JSON.parse(JSON.stringify(preset.config));
    Object.assign(brushConfig, newConfig);
    updateUIFromConfig();
}

function applyPaperPreset(preset) {
    saveHistory();
    
    // 应用设置
    elements.questionCount.value = preset.settings.count;
    elements.columnCount.value = preset.settings.columns;
    elements.showNumbers.checked = preset.settings.showNumbers;
    
    // 应用标题设置
    const paperTitle = preset.settings.paperTitle || '口算练习';
    elements.paperTitle.value = paperTitle;
    elements.paperTitleText.textContent = paperTitle;
    elements.answerTitleText.textContent = paperTitle + ' - 答案';
    
    // 应用头部显示模式
    const headerMode = preset.settings.headerMode || 'show';
    elements.headerMode.value = headerMode;
    elements.paperHeader.classList.remove('hidden', 'print-only');
    if (headerMode === 'hidden') {
        elements.paperHeader.classList.add('hidden');
    } else if (headerMode === 'print-only') {
        elements.paperHeader.classList.add('print-only');
    }
    
    // 重建题目数组
    state.questions = preset.questions.map(config => {
        if (config) {
            const generated = generateQuestion(config);
            return {
                config: { ...config },
                text: generated ? generated.text : '',
                answer: generated ? generated.answer : ''
            };
        }
        return { config: null, text: '', answer: '' };
    });
    
    renderGrid();
}

function updateUIFromConfig() {
    // 更新运算数个数按钮状态
    elements.operandCountBtns.querySelectorAll('.operand-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.count) === brushConfig.operandCount);
    });
    
    // 更新数字范围
    const ranges = brushConfig.ranges || [{ min: 1, max: 20 }, { min: 1, max: 20 }, { min: 1, max: 20 }];
    elements.num1Min.value = ranges[0]?.min || 1;
    elements.num1Max.value = ranges[0]?.max || 20;
    elements.num2Min.value = ranges[1]?.min || 1;
    elements.num2Max.value = ranges[1]?.max || 20;
    elements.num3Min.value = ranges[2]?.min || 1;
    elements.num3Max.value = ranges[2]?.max || 20;
    
    // 更新运算符复选框状态
    const operatorSets = brushConfig.operators || [['+', '-'], ['+', '-']];
    
    // 运算符1
    elements.ops1.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = (operatorSets[0] || ['+', '-']).includes(cb.value);
    });
    
    // 运算符2
    elements.ops2.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = (operatorSets[1] || ['+', '-']).includes(cb.value);
    });
    
    elements.useBracket.checked = brushConfig.useBracket;
    elements.questionFormat.value = brushConfig.questionFormat;
    
    onOperandCountChange();
}

// ==================== 打印功能 ====================
function printPaper() {
    // 计算并设置行高，使题目占满一张A4纸
    calculatePrintRowHeight();
    
    // 延迟一点确保样式应用
    setTimeout(() => {
        window.print();
    }, 100);
}

// 计算打印时的行高
function calculatePrintRowHeight() {
    const questionCount = state.questions.length;
    const colSetting = elements.columnCount.value;
    const cols = colSetting === 'auto' ? calculateOptimalColumns(questionCount) : parseInt(colSetting);
    const rows = Math.ceil(questionCount / cols);
    
    // A4纸：297mm 高，减去 @page margin 8mm*2 = 16mm，实际可用 281mm
    // 头部是否显示
    const headerMode = elements.headerMode.value;
    // 头部高度：padding 2mm*2 + 标题行约7mm + 信息行约6mm = 约17mm
    const headerHeight = (headerMode === 'hidden') ? 0 : 17;
    const availableHeight = 281 - headerHeight;
    
    // 计算每行高度（mm）
    const rowHeight = availableHeight / rows;
    
    // 设置 CSS 变量
    document.documentElement.style.setProperty('--print-row-height', `${rowHeight.toFixed(2)}mm`);
}

// ==================== 键盘快捷键 ====================
function onKeyDown(e) {
    // Ctrl+Z 撤销
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
    }
    // Ctrl+Y 或 Ctrl+Shift+Z 重做
    if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        redo();
    }
    // Escape 关闭模态框
    if (e.key === 'Escape') {
        hidePresetModal();
        hideEditModal();
    }
}

// ==================== 本地存储 ====================
function saveToStorage() {
    const data = {
        brushPresets: state.brushPresets,
        paperPresets: state.paperPresets,
        rangePresets: state.rangePresets,
        brushConfig: brushConfig,
        settings: {
            columns: elements.columnCount.value,
            showNumbers: elements.showNumbers.checked,
            paperTitle: elements.paperTitle.value,
            headerMode: elements.headerMode.value
        }
    };
    localStorage.setItem('mathQuizGenerator', JSON.stringify(data));
}

function loadFromStorage() {
    try {
        const data = JSON.parse(localStorage.getItem('mathQuizGenerator'));
        if (data) {
            state.brushPresets = (data.brushPresets || []).map(preset => migrateConfig(preset));
            state.paperPresets = data.paperPresets || [];
            state.rangePresets = data.rangePresets || state.rangePresets;
            
            // 迁移旧配置
            const loadedConfig = migrateConfig({ config: data.brushConfig || {} }).config;
            Object.assign(brushConfig, loadedConfig);
            
            if (data.settings) {
                elements.columnCount.value = data.settings.columns || 'auto';
                elements.showNumbers.checked = data.settings.showNumbers || false;
                
                // 加载标题
                if (data.settings.paperTitle) {
                    elements.paperTitle.value = data.settings.paperTitle;
                    elements.paperTitleText.textContent = data.settings.paperTitle;
                    elements.answerTitleText.textContent = data.settings.paperTitle + ' - 答案';
                }
                
                // 加载头部显示模式
                const headerMode = data.settings.headerMode || 'show';
                elements.headerMode.value = headerMode;
                elements.paperHeader.classList.remove('hidden', 'print-only');
                if (headerMode === 'hidden') {
                    elements.paperHeader.classList.add('hidden');
                } else if (headerMode === 'print-only') {
                    elements.paperHeader.classList.add('print-only');
                }
            }
            
            renderBrushPresets();
            renderPaperPresets();
        }
    } catch (e) {
        console.error('Failed to load from storage:', e);
    }
}

// 迁移旧配置格式到新格式
function migrateConfig(preset) {
    if (!preset || !preset.config) return preset;
    
    const config = preset.config;
    
    // 如果已经有新格式的 ranges 数组，说明是新格式，不需要迁移
    if (Array.isArray(config.ranges) && Array.isArray(config.operators) && Array.isArray(config.operators[0])) {
        return preset;
    }
    
    // 旧格式迁移到新格式
    const rangeMin = config.rangeMin || 1;
    const rangeMax = config.rangeMax || 20;
    
    // 设置 ranges（所有数字使用相同范围）
    config.ranges = [
        { min: rangeMin, max: rangeMax },
        { min: rangeMin, max: rangeMax },
        { min: rangeMin, max: rangeMax }
    ];
    
    // 设置 operandCount（默认2个运算数）
    if (!config.operandCount) {
        config.operandCount = 2;
    }
    
    // 迁移运算符格式
    let symbolOps = ['+', '-']; // 默认
    
    // 旧格式：operators = ['add', 'subtract'] 或 questionType = 'add-subtract'
    const oldOps = config.operators || [];
    const oldType = config.questionType;
    
    if (oldType) {
        // 从 questionType 迁移
        switch (oldType) {
            case 'add': symbolOps = ['+']; break;
            case 'subtract': symbolOps = ['-']; break;
            case 'multiply': symbolOps = ['×']; break;
            case 'divide': symbolOps = ['÷']; break;
            case 'add-subtract': symbolOps = ['+', '-']; break;
            case 'multiply-divide': symbolOps = ['×', '÷']; break;
            case 'all': symbolOps = ['+', '-', '×', '÷']; break;
        }
        delete config.questionType;
    } else if (Array.isArray(oldOps) && oldOps.length > 0 && typeof oldOps[0] === 'string' && !Array.isArray(oldOps[0])) {
        // 从旧的 operators 数组迁移（如 ['add', 'subtract']）
        symbolOps = oldOps.map(op => {
            switch (op) {
                case 'add': return '+';
                case 'subtract': return '-';
                case 'multiply': return '×';
                case 'divide': return '÷';
                default: return op; // 可能已经是符号
            }
        });
    }
    
    // 设置新格式的 operators（每个位置使用相同的运算符集）
    config.operators = [symbolOps, symbolOps];
    
    // 删除旧字段
    delete config.rangeMin;
    delete config.rangeMax;
    delete config.divisorMin;
    delete config.divisorMax;
    
    return preset;
}

// 定期保存
setInterval(saveToStorage, 30000);
window.addEventListener('beforeunload', saveToStorage);
