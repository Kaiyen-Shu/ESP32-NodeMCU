// 遊戲引擎類，負責管理遊戲切換、輸入處理和狀態更新
class GameEngine {
    // 建構函數，初始化遊戲引擎
    constructor() {
        this.games = { // 遊戲物件清單，對應三款遊戲
            0: new TicTacToeGame(), // ID 0: 井字遊戲
            1: new MemoryGame(),    // ID 1: 記憶遊戲
            2: new ReactionGame()   // ID 2: 反應遊戲
        };
        this.currentGame = null; // 當前運行的遊戲物件
        this.gameId = 0; // 當前遊戲 ID，預設為 0 (井字遊戲)
        this.lastButtonState = Array(9).fill(false); // 上次按鈕狀態，追蹤 9 個按鈕
        this.gameArea = document.getElementById('gameArea'); // 遊戲顯示區域的 DOM 元素
        this.debugMode = true; // 除錯模式，啟用時輸出日誌
        this.inputBuffer = []; // 輸入緩衝區，儲存待處理的按鈕輸入
        this.lastInputTime = 0; // 上次輸入處理的時間戳記
    }

    // 切換到指定遊戲
    switchGame(gameId) {
        if (this.debugMode) {
            console.log(`切換到遊戲 ${gameId}`); // 記錄遊戲切換日誌
        }
        this.gameId = gameId % 3; // 確保 gameId 在 0-2 範圍內
        this.currentGame = this.games[this.gameId]; // 設定當前遊戲
        if (this.currentGame) {
            this.currentGame.render(this.gameArea); // 渲染遊戲 UI
        }
    }

    // 開始指定遊戲，預設使用當前 gameId
    startGame(gameId = this.gameId) {
        if (this.debugMode) {
            console.log(`開始遊戲 ${gameId}`); // 記錄遊戲開始日誌
        }
        this.switchGame(gameId); // 切換到指定遊戲
        if (this.currentGame) {
            this.currentGame.start(); // 啟動遊戲邏輯
        }
    }

    // 重置當前遊戲
    resetGame() {
        if (this.debugMode) {
            console.log('重置遊戲'); // 記錄重置日誌
        }
        if (this.currentGame) {
            this.currentGame.reset(); // 呼叫當前遊戲的重置方法
        }
    }

    // 處理來自 ESP32 的輸入資料
    handleInput(data) {
        if (!this.currentGame) return; // 若無當前遊戲，忽略輸入
        try {
            // 驗證輸入資料格式
            if (!data || !Array.isArray(data.buttons)) {
                console.warn('無效的輸入資料格式:', data); // 記錄格式錯誤
                return;
            }
            const currentTime = Date.now(); // 當前時間
            // 限制輸入頻率，防止短時間內重複處理
            if (currentTime - this.lastInputTime < 50) {
                return;
            }
            this.lastInputTime = currentTime; // 更新上次輸入時間
            const buttonPressed = []; // 儲存新按下的按鈕索引
            // 檢測按鈕從未按到按下的變化
            data.buttons.forEach((current, i) => {
                if (current && !this.lastButtonState[i]) {
                    buttonPressed.push(i); // 記錄按下事件
                    if (this.debugMode) {
                        console.log(`🎮 遊戲引擎收到按鈕 ${i + 1} 按下`); // 記錄按鈕日誌
                    }
                }
            });
            this.lastButtonState = [...data.buttons]; // 更新按鈕狀態
            // 延遲處理按鈕輸入，防止快速重複觸發
            if (buttonPressed.length > 0) {
                if (this.inputTimeout) {
                    clearTimeout(this.inputTimeout); // 清除之前的延遲
                }
                this.inputTimeout = setTimeout(() => {
                    buttonPressed.forEach(button => {
                        this.processGameInput(button); // 處理每個按鈕輸入
                    });
                }, 50);
            }
            // 處理 Reset 按鈕
            if (data.reset) {
                this.resetGame(); // 重置遊戲
            }
        } catch (error) {
            console.error('遊戲輸入處理錯誤:', error); // 記錄錯誤
            console.log('錯誤的資料:', data); // 記錄錯誤資料
        }
    }

    // 將按鈕輸入傳遞給當前遊戲
    processGameInput(buttonIndex) {
        if (!this.currentGame) return; // 若無當前遊戲，忽略
        try {
            console.log(`🎯 遊戲 ${this.gameId} 處理按鈕 ${buttonIndex + 1}`); // 記錄處理日誌
            this.currentGame.onButtonPress(buttonIndex); // 呼叫遊戲的按鈕處理方法
        } catch (error) {
            console.error(`遊戲 ${this.gameId} 輸入處理錯誤:`, error); // 記錄錯誤
        }
    }
}

// 井字遊戲類，實現井字遊戲邏輯
class TicTacToeGame {
    // 建構函數，初始化遊戲狀態
    constructor() {
        this.board = Array(9).fill(''); // 9 格棋盤，初始為空
        this.currentPlayer = 'X'; // 當前玩家，預設為 X
        this.gameOver = false; // 遊戲是否結束
        this.winner = null; // 贏家，X 或 O
        this.isPlayerTurn = true; // 是否輪到玩家操作
    }

    // 渲染遊戲 UI
    render(container) {
        if (!container) return; // 若無容器，退出
        // 生成遊戲 HTML 結構
        container.innerHTML = `
            <div class="game-container active">
                <h4>🎯 井字遊戲</h4>
                <div class="game-info">
                    <div id="tic-status">當前玩家: X</div>
                    <div class="score">
                        <div class="score-item">
                            <div>玩家 X</div>
                            <div id="score-x">0</div>
                        </div>
                        <div class="score-item">
                            <div>玩家 O</div>
                            <div id="score-o">0</div>
                        </div>
                        <div class="score-item">
                            <div>平局</div>
                            <div id="score-tie">0</div>
                        </div>
                    </div>
                </div>
                <div class="matrix" id="tic-board">
                    ${Array(9).fill(0).map((_, i) => `<div class="btn" id="tic-${i}"></div>`).join('')}
                </div>
            </div>
        `;
        this.updateDisplay(); // 更新顯示
    }

    // 開始遊戲
    start() {
        this.reset(); // 重置遊戲狀態
    }

    // 重置遊戲狀態
    reset() {
        this.board = Array(9).fill(''); // 清空棋盤
        this.currentPlayer = 'X'; // 恢復初始玩家
        this.gameOver = false; // 重置遊戲結束標記
        this.winner = null; // 清空贏家
        this.isPlayerTurn = true; // 允許玩家操作
        this.updateDisplay(); // 更新顯示
    }

    // 處理按鈕輸入
    onButtonPress(position) {
        // 若遊戲結束、格子已填或非玩家回合，忽略輸入
        if (this.gameOver || this.board[position] !== '' || !this.isPlayerTurn) return;
        this.makeMove(position); // 執行移動
    }

    // 執行玩家或 AI 的移動
    makeMove(position) {
        this.board[position] = this.currentPlayer; // 填入當前玩家符號
        this.updateDisplay(); // 更新顯示
        // 檢查是否獲勝
        if (this.checkWin()) {
            this.gameOver = true;
            this.winner = this.currentPlayer;
            this.updateScore(); // 更新分數
            setTimeout(() => {
                alert(`玩家 ${this.winner} 獲勝！`); // 顯示勝利提示
                this.reset(); // 重置遊戲
            }, 500);
        } else if (this.board.every(cell => cell !== '')) {
            // 檢查是否平局
            this.gameOver = true;
            this.updateScore(); // 更新平局分數
            setTimeout(() => {
                alert('平局！'); // 顯示平局提示
                this.reset(); // 重置遊戲
            }, 500);
        } else {
            // 切換玩家
            this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
            // 若輪到 O，執行 AI 移動
            if (this.currentPlayer === 'O') {
                this.isPlayerTurn = false;
                setTimeout(() => this.aiMove(), 1000); // 延遲 AI 移動
            }
        }
    }

    // AI 隨機移動
    aiMove() {
        if (this.gameOver) return; // 若遊戲結束，退出
        // 找出空格
        const emptyCells = this.board.map((cell, index) => cell === '' ? index : null).filter(val => val !== null);
        if (emptyCells.length > 0) {
            const randomMove = emptyCells[Math.floor(Math.random() * emptyCells.length)]; // 隨機選擇
            this.makeMove(randomMove); // 執行移動
        }
        this.isPlayerTurn = true; // 恢復玩家回合
    }

    // 檢查是否獲勝
    checkWin() {
        const winPatterns = [ // 勝利組合
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // 橫排
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // 直排
            [0, 4, 8], [2, 4, 6] // 對角線
        ];
        // 檢查是否有勝利組合
        return winPatterns.some(pattern => {
            const [a, b, c] = pattern;
            return this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c];
        });
    }

    // 更新遊戲顯示
    updateDisplay() {
        // 更新狀態文字
        const statusEl = document.getElementById('tic-status');
        if (statusEl) {
            if (this.gameOver) {
                statusEl.textContent = this.winner ? `玩家 ${this.winner} 獲勝！` : '平局！';
            } else {
                statusEl.textContent = `當前玩家: ${this.currentPlayer}`;
            }
        }
        // 更新棋盤格子
        this.board.forEach((cell, i) => {
            const btn = document.getElementById(`tic-${i}`);
            if (btn) {
                btn.textContent = cell; // 顯示 X 或 O
                btn.className = `btn ${cell.toLowerCase()}`; // 更新樣式
            }
        });
    }

    // 更新分數
    updateScore() {
        const scoreKey = this.winner ? `score-${this.winner.toLowerCase()}` : 'score-tie';
        const scoreEl = document.getElementById(scoreKey);
        if (scoreEl) {
            scoreEl.textContent = parseInt(scoreEl.textContent) + 1; // 遞增分數
        }
    }
}

// 記憶遊戲類，實現序列記憶遊戲邏輯
class MemoryGame {
    // 建構函數，初始化遊戲狀態
    constructor() {
        this.sequence = []; // 目標序列
        this.playerSequence = []; // 玩家輸入序列
        this.level = 1; // 當前等級
        this.isPlaying = false; // 是否接受玩家輸入
        this.showingSequence = false; // 是否正在顯示序列
        this.score = 0; // 玩家得分
        this.inputLocked = false; // 輸入鎖定，防止重複輸入
    }

    // 渲染遊戲 UI
    render(container) {
        if (!container) return; // 若無容器，退出
        // 生成遊戲 HTML 結構
        container.innerHTML = `
            <div class="game-container active">
                <h4>🧠 記憶遊戲</h4>
                <div class="game-info">
                    <div>等級: <span id="memory-level">${this.level}</span></div>
                    <div>得分: <span id="memory-score">${this.score}</span></div>
                    <div id="memory-status">按確認鈕開始遊戲</div>
                </div>
                <div class="matrix" id="memory-board">
                    ${Array(9).fill(0).map((_, i) => `<div class="btn" id="memory-${i}">${i + 1}</div>`).join('')}
                </div>
            </div>
        `;
        this.updateDisplay(); // 更新顯示
    }

    // 開始遊戲
    start() {
        console.log('記憶遊戲開始'); // 記錄開始日誌
        this.reset(); // 重置遊戲
        this.newRound(); // 開始新回合
    }

    // 重置遊戲狀態
    reset() {
        this.sequence = []; // 清空目標序列
        this.playerSequence = []; // 清空玩家序列
        this.level = 1; // 重置等級
        this.isPlaying = false; // 禁用玩家輸入
        this.showingSequence = false; // 停止序列顯示
        this.score = 0; // 重置得分
        this.updateDisplay(); // 更新顯示
        this.updateStatus('按確認鈕開始遊戲'); // 更新狀態提示
    }

    // 開始新回合
    newRound() {
        this.playerSequence = []; // 清空玩家序列
        this.sequence.push(Math.floor(Math.random() * 9)); // 添加隨機按鈕
        console.log(`新回合，序列: ${this.sequence}`); // 記錄序列
        this.showSequence(); // 顯示序列
        this.updateDisplay(); // 更新等級顯示
    }

    // 顯示目標序列
    async showSequence() {
        this.showingSequence = true; // 標記正在顯示序列
        this.updateStatus('記住這個序列...'); // 更新狀態提示
        // 逐一高亮序列中的按鈕
        for (let i = 0; i < this.sequence.length; i++) {
            await this.wait(600); // 等待 600ms
            this.highlightButton(this.sequence[i]); // 高亮按鈕
            await this.wait(400); // 持續 400ms
            this.clearHighlight(this.sequence[i]); // 清除高亮
        }
        this.showingSequence = false; // 結束序列顯示
        this.isPlaying = true; // 允許玩家輸入
        this.updateStatus('重複剛才的序列'); // 更新狀態提示
    }

    // 處理按鈕輸入
    onButtonPress(position) {
        // 若非玩家回合、正在顯示序列或輸入鎖定，忽略輸入
        if (!this.isPlaying || this.showingSequence || this.inputLocked) {
            console.log(`輸入忽略: isPlaying=${this.isPlaying}, showingSequence=${this.showingSequence}, inputLocked=${this.inputLocked}`);
            return;
        }
        console.log(`處理按鈕 ${position + 1}`); // 記錄輸入
        this.inputLocked = true; // 鎖定輸入
        setTimeout(() => {
            this.inputLocked = false; // 300ms 後解鎖
        }, 300);
        this.playerSequence.push(position); // 添加玩家輸入
        console.log(`玩家輸入: ${position}, 當前序列: ${this.playerSequence}, 目標序列: ${this.sequence}`);
        this.highlightButton(position, 'correct'); // 高亮輸入按鈕
        setTimeout(() => this.clearHighlight(position), 200); // 清除高亮
        const currentStep = this.playerSequence.length - 1; // 當前步驟
        // 檢查輸入是否正確
        if (this.playerSequence[currentStep] !== this.sequence[currentStep]) {
            console.log('輸入錯誤，遊戲結束'); // 記錄錯誤
            this.gameOver(); // 結束遊戲
            return;
        }
        // 檢查是否完成序列
        if (this.playerSequence.length === this.sequence.length) {
            this.score += this.level * 10; // 增加得分
            this.level++; // 遞增等級
            console.log(`完成序列，得分: ${this.score}, 等級: ${this.level}`); // 記錄進度
            this.isPlaying = false; // 禁用玩家輸入
            this.updateStatus('正確！準備下一關...'); // 更新狀態
            this.updateDisplay(); // 更新得分和等級
            setTimeout(() => this.newRound(), 1500); // 開始新回合
        }
    }

    // 處理遊戲結束
    gameOver() {
        this.isPlaying = false; // 禁用玩家輸入
        this.updateStatus(`遊戲結束！最終得分: ${this.score}`); // 更新狀態
        this.updateDisplay(); // 更新顯示
        setTimeout(() => {
            alert(`遊戲結束！你達到了等級 ${this.level}，得分 ${this.score}`); // 顯示結束提示
            this.reset(); // 重置遊戲
        }, 1000);
    }

    // 高亮指定按鈕
    highlightButton(position, type = 'sequence') {
        const btn = document.getElementById(`memory-${position}`);
        if (btn) {
            btn.classList.add(type); // 添加高亮樣式
        } else {
            console.warn(`未找到按鈕 memory-${position}`); // 記錄錯誤
        }
    }

    // 清除按鈕高亮
    clearHighlight(position) {
        const btn = document.getElementById(`memory-${position}`);
        if (btn) {
            btn.className = 'btn'; // 恢復預設樣式
        }
    }

    // 更新等級和得分顯示
    updateDisplay() {
        const levelEl = document.getElementById('memory-level');
        const scoreEl = document.getElementById('memory-score');
        if (levelEl) {
            levelEl.textContent = this.level; // 更新等級
        } else {
            console.warn('未找到 memory-level 元素'); // 記錄錯誤
        }
        if (scoreEl) {
            scoreEl.textContent = this.score; // 更新得分
        } else {
            console.warn('未找到 memory-score 元素'); // 記錄錯誤
        }
    }

    // 更新狀態提示
    updateStatus(text) {
        const statusEl = document.getElementById('memory-status');
        if (statusEl) statusEl.textContent = text; // 更新文字
    }

    // 延遲等待
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms)); // 返回延遲承諾
    }
}

// 反應遊戲類，實現反應速度測試
class ReactionGame {
    // 建構函數，初始化遊戲狀態
    constructor() {
        this.isWaiting = false; // 是否等待玩家反應
        this.startTime = 0; // 反應計時開始時間
        this.bestTime = Infinity; // 最佳反應時間
        this.attempts = 0; // 嘗試次數
        this.totalTime = 0; // 總反應時間
        this.gameState = 'idle'; // 遊戲狀態：idle, ready, waiting, finished
        this.inputLocked = false; // 輸入鎖定，防止重複輸入
    }

    // 渲染遊戲 UI
    render(container) {
        if (!container) return; // 若無容器，退出
        // 生成遊戲 HTML 結構
        container.innerHTML = `
            <div class="game-container active">
                <h4>⚡ 反應遊戲</h4>
                <div class="game-info">
                    <div class="score">
                        <div class="score-item">
                            <div>最佳時間</div>
                            <div id="best-time">${this.bestTime === Infinity ? '--' : this.bestTime + 'ms'}</div>
                        </div>
                        <div class="score-item">
                            <div>平均時間</div>
                            <div id="avg-time">${this.attempts ? Math.round(this.totalTime / this.attempts) + 'ms' : '--'}</div>
                        </div>
                        <div class="score-item">
                            <div>嘗試次數</div>
                            <div id="attempts">${this.attempts}</div>
                        </div>
                    </div>
                </div>
                <div class="reaction-area" id="reaction-area">
                    <h3 id="reaction-text">按任意按鈕開始</h3>
                    <p id="reaction-subtitle">準備測試你的反應速度！</p>
                </div>
            </div>
        `;
    }

    // 開始遊戲
    start() {
        this.reset(); // 重置遊戲
        this.waitForStart(); // 等待玩家開始
    }

    // 重置遊戲狀態
    reset() {
        this.isWaiting = false; // 停止等待
        this.startTime = 0; // 清空計時
        this.updateDisplay(); // 更新顯示
    }

    // 等待玩家開始
    waitForStart() {
        const area = document.getElementById('reaction-area');
        const text = document.getElementById('reaction-text');
        const subtitle = document.getElementById('reaction-subtitle');
        // 更新顯示
        if (area) area.className = 'reaction-area';
        if (text) text.textContent = '按任意按鈕開始';
        if (subtitle) subtitle.textContent = '準備測試你的反應速度！';
    }

    // 處理按鈕輸入
    onButtonPress(position) {
        if (this.inputLocked) return; // 若輸入鎖定，忽略
        this.inputLocked = true; // 鎖定輸入
        setTimeout(() => {
            this.inputLocked = false; // 200ms 後解鎖
        }, 200);
        // 根據遊戲狀態處理輸入
        if (this.gameState === 'idle') {
            this.startReaction(); // 開始反應測試
        } else if (this.gameState === 'waiting') {
            this.recordReaction(); // 記錄反應時間
        } else if (this.gameState === 'tooEarly') {
            this.showResult(-1); // 過早按下
        }
    }

    // 開始反應測試
    startReaction() {
        this.gameState = 'ready'; // 進入準備狀態
        const area = document.getElementById('reaction-area');
        const text = document.getElementById('reaction-text');
        const subtitle = document.getElementById('reaction-subtitle');
        // 更新顯示
        if (area) area.className = 'reaction-area ready';
        if (text) text.textContent = '準備...';
        if (subtitle) subtitle.textContent = '等待綠色信號！';
        // 隨機延遲 2-5 秒
        const delay = 2000 + Math.random() * 3000;
        this.reactionTimeout = setTimeout(() => {
            if (this.gameState === 'ready') {
                this.gameState = 'waiting'; // 進入等待狀態
                if (area) area.className = 'reaction-area go';
                if (text) text.textContent = '現在！';
                if (subtitle) subtitle.textContent = '快按任意按鈕！';
                this.startTime = Date.now(); // 記錄開始時間
            }
        }, delay);
    }

    // 記錄反應時間
    recordReaction() {
        if (this.gameState !== 'waiting') return; // 非等待狀態，忽略
        clearTimeout(this.reactionTimeout); // 清除計時器
        const reactionTime = Date.now() - this.startTime; // 計算反應時間
        this.gameState = 'finished'; // 進入完成狀態
        this.attempts++; // 增加嘗試次數
        this.totalTime += reactionTime; // 累加總時間
        // 更新最佳時間
        if (reactionTime < this.bestTime && reactionTime > 50) {
            this.bestTime = reactionTime;
        }
        this.showResult(reactionTime); // 顯示結果
        this.updateDisplay(); // 更新顯示
    }

    // 顯示反應結果
    showResult(time) {
        const area = document.getElementById('reaction-area');
        const text = document.getElementById('reaction-text');
        const subtitle = document.getElementById('reaction-subtitle');
        if (area) area.className = 'reaction-area'; // 恢復預設樣式
        // 根據反應時間顯示不同訊息
        if (time === -1) {
            if (text) text.textContent = '太早了！';
            if (subtitle) subtitle.textContent = '等待綠色信號再按！';
        } else if (time < 50) {
            if (text) text.textContent = '無效！';
            if (subtitle) subtitle.textContent = '可能是誤觸？';
        } else {
            if (text) text.textContent = `${time}ms`;
            if (subtitle) {
                if (time < 200) subtitle.textContent = '超快反應！🚀';
                else if (time < 300) subtitle.textContent = '很好的反應！👍';
                else if (time < 400) subtitle.textContent = '還不錯！';
                else if (time < 600) subtitle.textContent = '需要多練習！';
                else subtitle.textContent = '反應有點慢...';
            }
        }
        // 3 秒後返回初始狀態
        setTimeout(() => {
            this.gameState = 'idle';
            this.waitForStart();
        }, 3000);
    }

    // 更新顯示
    updateDisplay() {
        const bestEl = document.getElementById('best-time');
        const avgEl = document.getElementById('avg-time');
        const attemptsEl = document.getElementById('attempts');
        // 更新最佳時間
        if (bestEl) bestEl.textContent = this.bestTime === Infinity ? '--' : this.bestTime + 'ms';
        // 更新平均時間
        if (avgEl) avgEl.textContent = this.attempts ? Math.round(this.totalTime / this.attempts) + 'ms' : '--';
        // 更新嘗試次數
        if (attemptsEl) attemptsEl.textContent = this.attempts;
    }
}