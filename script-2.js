// --- 1) Canvas と DOM の取得 ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startScreen = document.getElementById("startScreen");
const message = document.getElementById("message");
const timeDisplay = document.getElementById("time");
const levelDisplay = document.getElementById("level");
const rankDisplay = document.getElementById("rank");
const resultBox = document.getElementById("resultBox");
const resultMessage = document.getElementById("resultMessage");
const resultDetail = document.getElementById("resultDetail");
const restartBtn = document.getElementById("restartBtn");

const startBtn = document.getElementById("startBtn");
const menuBtn = document.getElementById("menuBtn");
const menuPanel = document.getElementById("menuPanel");
const menuClose = document.getElementById("menuClose");
const resumeBtn = document.getElementById("resumeBtn");
const restartBtnMenu = document.getElementById("restartBtnMenu");
const soundToggle = document.getElementById("soundToggle");

// --- 2) キャンバスサイズ（固定） ---
canvas.width = 600;
canvas.height = 670;

// スタート画面をキャンバスサイズに合わせるユーティリティ
function fitStartScreen() {
    startScreen.style.position = "absolute";
    startScreen.style.width = canvas.width + "px";
    startScreen.style.height = canvas.height + "px";
    startScreen.style.top = "0";
    startScreen.style.left = "0";
}
fitStartScreen();
window.addEventListener("resize", fitStartScreen);

// --- 3) ゲームオブジェクト初期化 ---
// player: 下側のパドル（左右のみ動く）
let player = {
    x: canvas.width / 2,
    y: canvas.height - 300, // 縦位置は固定
    r: 35,
    color: "#0ff"
};

// cpu: 上側の自動パドル
let cpu = {
    x: canvas.width / 2,
    y: 50,
    r: 35,
    color: "#f33"
};

// puck（パック）
let puck = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    vx: 0,
    vy: 6,
    r: 20,
    color: "#fff"
};

// --- 4) ゲーム状態 ---
let startTime = null;
let elapsed = 0;
let level = 1;
let maxLevel = 10;
let gameRunning = false;
let animationId = null;
let menuOpen = false;

// --- 5) サウンド（簡易） ---
let audioCtx = null; // 必要なときに作る（ユーザー操作での再生制限対応）
let gainNode = null;
let soundOn = true;
function ensureAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioCtx.createGain();
        gainNode.gain.value = 0.05;
        gainNode.connect(audioCtx.destination);
    }
}
function playTone(freq, dur = 0.05) {
    if (!soundOn) return;
    ensureAudio();
    const o = audioCtx.createOscillator();
    o.frequency.value = freq;
    o.connect(gainNode);
    o.start();
    o.stop(audioCtx.currentTime + dur);
}

// --- 6) ヘルパー描画関数 ---
function drawCircle(obj) {
    ctx.beginPath();
    ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI * 2);
    ctx.fillStyle = obj.color;
    ctx.fill();
}
function draw() {
    // 背景（キャンバス自体に CSS でグラデーション入ってる場合はここ不要だが、クリアは必要）
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 描画順：プレイヤー・CPU・パック（見やすさのためパックを上にしてもOK）
    drawCircle(player);
    drawCircle(cpu);
    drawCircle(puck);
}

// --- 7) リセット処理 ---
function resetGame() {
    // CPUからのサーブ位置にセット
    cpu.x = canvas.width / 2;
    cpu.y = 50;

    player.x = canvas.width / 2;
    player.y = canvas.height - 70;

    puck.x = cpu.x;
    puck.y = cpu.y + cpu.r + puck.r + 10;
    puck.vx = (Math.random() - 0.5) * 6;
    puck.vy = 8;

    // ゲーム状態初期化
    level = 1;
    elapsed = 0;
    timeDisplay.textContent = "0";
    levelDisplay.textContent = "1";
    rankDisplay.textContent = getRank(0);
}

// --- 8) ランク関数（そのまま） ---
function getRank(t) {
    if (t < 15) return "D";
    if (t < 30) return "C";
    if (t < 45) return "B";
    if (t < 60) return "A";
    if (t < 70) return "S";
    return "MASTER";
}


// --- 9) ゲーム開始処理（カウントダウン含む） ---
function startGame() {
    // ユーザー操作でオーディオの許可を得る（Chrome 等の自動再生制限対策）
    ensureAudio();

    let count = 3;
    message.style.display = "block";
    message.textContent = count;
    draw(); // カウント中も見た目更新

    const countdown = setInterval(() => {
        count--;
        if (count > 0) {
            message.textContent = count;
        } else if (count === 0) {
            message.textContent = "GAME START‼️";
            playTone(880, 0.08);
        } else {
            clearInterval(countdown);
            message.style.display = "none";
            resetGame();
            gameRunning = true;
            startTime = performance.now();
            // 開始ループ
            animationId = requestAnimationFrame(gameLoop);
        }
        draw();
    }, 1000);
}

// --- 10) 更新処理（1フレーム分） ---
function update(delta) {
    // --- パック移動 ---
    puck.x += puck.vx;
    puck.y += puck.vy;

    // --- 壁バウンド（左右） ---
        if (puck.x <= puck.r) {
        puck.x = puck.r;
        if (puck.vx < 0) puck.vx *= -1;  // 左に向かっていたら反転
    } else if (puck.x >= canvas.width - puck.r) {
        puck.x = canvas.width - puck.r;
        if (puck.vx > 0) puck.vx *= -1;  // 右に向かっていたら反転
    }

    // --- プレイヤーとの衝突判定（円と円） ---
    const dxP = puck.x - player.x;
    const dyP = puck.y - player.y;
    const distP = Math.sqrt(dxP * dxP + dyP * dyP);

    if (distP < puck.r + player.r) {
        // 位置補正
        const overlap = puck.r + player.r - distP;
        const nx = dxP / distP;
        const ny = dyP / distP;
        if (!isFinite(nx) || !isFinite(ny)) {
            // 万一ゼロ除算風の値になったら小さくずらす
            nx = 0;
            ny = -1;
        }
        puck.x += nx * overlap;
        puck.y += ny * overlap;

        // 反射
        const dot = puck.vx * nx + puck.vy * ny;
        puck.vx -= 2 * dot * nx;
        puck.vy -= 2 * dot * ny;

        // 速度制限（暴走防止）
        let speed = Math.sqrt(puck.vx * puck.vx + puck.vy * puck.vy);
        const maxSpeedLimit = 12;
        if (speed > maxSpeedLimit) {
            puck.vx *= maxSpeedLimit / speed;
            puck.vy *= maxSpeedLimit / speed;
            speed = maxSpeedLimit;
        }

        // --- 横カン防止 ---
        const minVy = 2; // 下方向の最低速度
        if (Math.abs(puck.vy) < minVy) {
            puck.vy = (puck.vy > 0 ? 1 : -1) * minVy;
        }
        playTone(440, 0.03);
    }

// --- CPUの自動追尾と打ち返し ---
if (puck.vy < 0) { // パックが上方向に飛んでいる時のみCPU反応
    cpu.x += (puck.x - cpu.x) * 0.2;

    const dx = puck.x - cpu.x;
    const dy = puck.y - cpu.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < cpu.r + puck.r) {
        // 衝突判定 → パックの方向を反転（下向きに飛ばす）
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = cpu.r + puck.r - dist;

        puck.x += nx * overlap;
        puck.y += ny * overlap;

        const dot = puck.vx * nx + puck.vy * ny;
        puck.vx -= 2 * dot * nx;
        puck.vy -= 2 * dot * ny;

        // ✅ 必ずプレイヤー側（下向き）へ返す
        if (puck.vy < 3) puck.vy = 3;

        playTone(660, 0.05);
    }
} else {
    // パックが下向きのときはCPUを中央に戻す
    cpu.x += (canvas.width / 2 - cpu.x) * 0.05;
}

// --- 上壁に当たったら反射して戻す（これがないと上から帰ってこない）---
if (puck.y < puck.r) {
    puck.y = puck.r;
    puck.vy *= -1;  // ←これで下向きに戻す！
    playTone(200, 0.05);
}

    // --- ゴール判定：パックが画面下に出たらプレイヤー負け ---
    if (puck.y - puck.r > player.y + player.r) {
        gameRunning = false;
        // 結果表示
        const finalTime = elapsed.toFixed(0);
        const finalRank = getRank(elapsed);

        if (elapsed >= 100) {
            resultMessage.textContent = "GAME CLEAR‼️";
            resultMessage.style.color = "#0ff";
            playTone(880, 0.18);
        } else {
            resultMessage.textContent = "GAME OVER‼️";
            resultMessage.style.color = "#f33";
        }

        let rankColor = "#fff";
        if (finalRank === "D" || finalRank === "C") rankColor = "#f33";
        else if (finalRank === "B") rankColor = "#ffa500";
        else if (finalRank === "A") rankColor = "#ff0";
        else if (finalRank === "S") rankColor = "#0ff";

        resultDetail.innerHTML = `Time：${finalTime}s<br><span class="rank" style="color:${rankColor}">Rank：${finalRank}</span>`;
        resultBox.style.display = "block";

        // リスタートボタン
        restartBtn.onclick = () => {
            resultBox.style.display = "none";
            message.style.display = "block";
            resetGame();
            startGame();
        };

        // 停止して早期return（フレーム内で余計な処理をしない）
        return;
    }

    // --- 経過時間更新 ---
    elapsed = (performance.now() - startTime) / 1000;
    timeDisplay.textContent = Math.floor(elapsed);
    rankDisplay.textContent = getRank(elapsed);

    // --- レベル算出（10秒ごとに+1）と速度反映 ---
    const newLevel = Math.floor(elapsed / 10) + 1;
    if (newLevel > level) {
        level = newLevel;
        levelDisplay.textContent = level;

        // レベルアップ演出
        message.textContent = "LEVEL UP!";
        message.style.display = "block";
        message.style.color = "#ff0";
        playTone(1000, 0.08);

        setTimeout(() => {
            if (message.textContent === "LEVEL UP!") {
                message.style.display = "none";
            }
        }, 1400);
    } else {
        // 画面の表示は常に最新の newLevel を見せる（冗長だが安全）
        levelDisplay.textContent = newLevel;
    }

    // 速度増加（レベルに応じた倍率）
    const speedPerLevel = 1.08; // 1レベルごとに約8%  — 調整しやすい値
    const baseSpeed = 10;
    const maxSpeed = 120;
    const totalSpeedFactor = Math.pow(speedPerLevel, newLevel - 1);
    const angle = Math.atan2(puck.vy, puck.vx);
    const newSpeed = Math.min(baseSpeed * totalSpeedFactor, maxSpeed);
    puck.vx = Math.cos(angle) * newSpeed;
    puck.vy = Math.sin(angle) * newSpeed;
}

// --- 11) メインループ（update と draw を呼ぶ） ---
function gameLoop(timestamp) {
    if (!gameRunning) return;
    update(16); // delta を簡易化（固定値）して呼ぶ
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

// --- 12) 入力：マウス（下半分で有効） ---
// 🖱 マウス操作（画面全体で動作 / 追従を滑らかに）
canvas.addEventListener("mousemove", e => {
    if (!gameRunning || menuOpen) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // ✅ 感度・操作性を高める：マウスに一気に追従せず、少しずつ近づける
    const speed = 0.3; // ← ここで感度・追従速度を調整（0.2〜0.35がおすすめ）

    player.x += (mouseX - player.x) * speed;
    player.y += (mouseY - player.y) * speed;

    // ✅ 画面外に出ないように制限
    player.x = Math.max(player.r, Math.min(player.x, canvas.width - player.r));
    player.y = Math.max(canvas.height / 2, Math.min(player.y, canvas.height - player.r));
});




// --- 13) タッチ対応（モバイル：下半分で操作） ---
canvas.addEventListener("touchmove", e => {
    if (!gameRunning || menuOpen) return;
    e.preventDefault(); // ページスクロール防止

    const rect = canvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;

    // 左右のみ追従、上下固定
    const speed = 0.25;
    player.x += (touchX - player.x) * speed;
    player.y = canvas.height - 70; // 下半分に固定

    // 画面外に出ないように clamp
    player.x = Math.max(player.r, Math.min(player.x, canvas.width - player.r));
});




// --- 14) UI ボタン処理 ---
// スタートボタン
startBtn.onclick = () => {
    startScreen.style.display = "none";
    resetGame();
    startGame();
};

// メニュー
function openMenu() {
    menuPanel.classList.add("open");
    menuPanel.setAttribute("aria-hidden", "false");
    menuOpen = true;

    if (gameRunning) {
        gameRunning = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        message.style.display = "block";
        message.textContent = "PAUSED";
    }
}
function closeMenu() {
    menuPanel.classList.remove("open");
    menuPanel.setAttribute("aria-hidden", "true");
    menuOpen = false;

    if (!gameRunning) {
        message.style.display = "none";
        gameRunning = true;
        animationId = requestAnimationFrame(gameLoop);
    }
}
menuBtn.addEventListener("click", () => {
    if (!menuOpen) openMenu();
    else closeMenu();
});
menuClose.addEventListener("click", closeMenu);
resumeBtn.addEventListener("click", closeMenu);

// メニュー内の「再スタート」
restartBtnMenu.addEventListener("click", () => {
    resultBox.style.display = "none";
    closeMenu();
    if (animationId) cancelAnimationFrame(animationId);
    gameRunning = false;
    resetGame();
    startScreen.style.display = "flex";
});

// サウンドトグル
soundToggle.addEventListener("click", () => {
    soundOn = !soundOn;
    soundToggle.textContent = `🔊音: ${soundOn ? "オン" : "オフ"}`;
    if (gainNode) gainNode.gain.value = soundOn ? 0.05 : 0;
});

// Esc キーでメニューを閉じる
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menuOpen) closeMenu();
});

// 初期表示の調整
levelDisplay.textContent = level;
timeDisplay.textContent = "0";
rankDisplay.textContent = getRank(0);
message.style.display = "block";
message.textContent = "GAME START‼️";
