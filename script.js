// 🎯 Canvas（ゲーム画面）を取得して、2D描画の準備をする
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startScreen = document.getElementById("startScreen");


// 🎯 ゲーム画面サイズを設定（縦長）
canvas.width = 600;
canvas.height = 670;

// 🎯 スタート画面をキャンバスにぴったり合わせる
function fitStartScreen() {
    startScreen.style.position = "absolute";
    startScreen.style.width = canvas.width + "px";
    startScreen.style.height = canvas.height + "px";
    startScreen.style.top = "0";
    startScreen.style.left = "0";
}

// 初期実行
fitStartScreen();

// 画面サイズを変えたときも追従（保険）
window.addEventListener("resize", fitStartScreen);

// 🎯 各オブジェクト（プレイヤー・CPU・パック）の初期データ
let player = { x: 300, y: 600, r: 35, color: "#0ff" }; // プレイヤー（下側）
let cpu = { x: 300, y: 50, r: 35, color: "#f33" };      // CPU（上側）
let puck = { x: 300, y: 450, vx: 0, vy: 6, r: 20, color: "#fff" }; // パック

// 🎯 ゲーム状態を管理する変数
let startTime = null;   // ゲーム開始時刻
let elapsed = 0;        // 経過時間（秒）
let level = 1;          // 現在のレベル
let maxLevel = 10;       // 最大レベル
let gameRunning = false;// ゲーム中かどうか

// 🎯 HTML上の要素を取得（メッセージやスコア表示）
let message = document.getElementById("message");
let timeDisplay = document.getElementById("time");
let levelDisplay = document.getElementById("level");
let rankDisplay = document.getElementById("rank");

// 🎵 簡易サウンド用オーディオ設定
let bgm = new AudioContext();
let gain = bgm.createGain();
gain.connect(bgm.destination);

function stopGame() {
    gameRunning = false;
    if (animationId) {
        cancelAnimationFrame(animationId); // 🔹 ループを完全に停止
        animationId = null;
    }
}


// 🔊 音を鳴らす関数（周波数と時間を指定）
function playTone(freq, dur) {
    const osc = bgm.createOscillator();
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start();
    osc.stop(bgm.currentTime + dur);
}

// 🏅 経過時間に応じたランクを返す関数
function getRank(t) {
    if (t < 25) return "D";
    if (t < 50) return "C";
    if (t < 75) return "B";
    if (t < 100) return "A";
    if (t < 120) return "S";
    //if (t < 120) return "SS";
    //return "MASTER";
}

// 🎯 パック・プレイヤー・CPUの位置リセット
function resetGame() {

// 🎯 CPU側からサーブする設定
puck.x = cpu.x;     // CPUの真下からスタート
puck.y = cpu.y + cpu.r + puck.r + 10; // CPUの下あたりに配置
puck.vx = (Math.random() - 0.5) * 6;  // 少し横にズレるように
puck.vy = 6; // 下向き（プレイヤー側）へ動く

    player.x = canvas.width / 2;
    player.y = canvas.height - 70;

    cpu.x = canvas.width / 2;
    cpu.y = 50;


    // 🕒 時間・レベルの初期化
    level = 1;
    elapsed = 0;
    timeDisplay.textContent = "0";
    levelDisplay.textContent = "1";
    rankDisplay.textContent = "D";
}


// 🚀 ゲーム開始処理
function startGame() {
      let count = 3; // カウント開始値
    message.style.display = "block"; // 表示を確実にONにする
    message.textContent = count;

    draw();// 🎨 カウント中も背景＆キャラを描く

    // カウントダウン処理
    let countdown = setInterval(() => {
        count--;
        if (count > 0) {
            message.textContent = count;
        } else if (count === 0) {
            message.textContent = "GAME START‼️";
        } else {
            clearInterval(countdown); // カウント停止
            message.style.display = "none"; // メッセージ非表示

            resetGame(); // 🎯 初期化関数を呼ぶ（位置・変数リセット ）
            gameRunning = true;
            startTime = performance.now(); // 開始時間を記録
            gain.gain.value = 0.05; // 音量設定

            playTone(660, 0.1); // サーブ音

            gameLoop(); 
        }
        draw();// カウントが進むたびに毎回再描画（見た目更新）
    },1000);// ゲームループ開始
}


// 🖱️ マウスの動きでプレイヤーを操作
canvas.addEventListener("mousemove", e => {
    if (!gameRunning || menuOpen) return;
    const rect = canvas.getBoundingClientRect();
    player.x = e.clientX - rect.left - player.r / 2; // マウス位置に合わせてx座標を変更
});

// ⚪ 円（プレイヤー・CPU・パック）を描画する関数
function drawCircle(obj) {
    ctx.beginPath();
    ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI * 2);
    ctx.fillStyle = obj.color;
    ctx.fill();
}

// 🎨 全体描画（毎フレーム呼び出し）
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 前のフレームを消去
    drawCircle(player); // プレイヤー描画
    drawCircle(cpu);    // CPU描画
    drawCircle(puck);   // パック描画
}

// ⚙️ ゲームの動きを更新する関数（1フレーム分）
function update(delta) {
    // パックの位置を更新
    puck.x += puck.vx;
    puck.y += puck.vy;

    // --- 壁との反射処理 ---
    if (puck.x < puck.r || puck.x > canvas.width - puck.r) {
        puck.vx *= -1;       // 横方向反転
        playTone(200, 0.05); // 壁に当たった音
    }

    // --- プレイヤーとパックの衝突判定 ---
    // --- プレイヤーとパックの衝突判定 ---
let dxP = puck.x - player.x;
let dyP = puck.y - player.y;
let distP = Math.sqrt(dxP ** 2 + dyP ** 2);

if (distP < puck.r + player.r) {
    // 衝突時にめり込みを補正（円の外に押し出す）
    const overlap = puck.r + player.r - distP;
    const nx = dxP / distP; // 法線ベクトル（x）
    const ny = dyP / distP; // 法線ベクトル（y）
    puck.x += nx * overlap;
    puck.y += ny * overlap;

    // 反射ベクトルを計算
    const dot = puck.vx * nx + puck.vy * ny;
    puck.vx -= 2 * dot * nx;
    puck.vy -= 2 * dot * ny;

    // 速度を少し調整して暴れすぎ防止
    const speed = Math.sqrt(puck.vx ** 2 + puck.vy ** 2);
    const maxSpeed = 10;
    if (speed > maxSpeed) {
        puck.vx *= maxSpeed / speed;
        puck.vy *= maxSpeed / speed;
    }

    playTone(440, 0.05);
}


// --- CPUの自動追尾＆確実に打ち返すロジック ---
if (puck.vy < 0) {
    // パックがCPU側に向かってくるときのみ動く
    cpu.x += (puck.x - cpu.x) * 0.2;  // 徐々に追従（0.2で滑らかさ調整）

    // パックがCPUのすぐ近くまで来たら、自動的に打ち返す
    if (puck.y - cpu.y < cpu.r + puck.r) {
        // 🎯 反射方向を自然にする
        const dx = puck.x - cpu.x;
        const dy = puck.y - cpu.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const nx = dx / dist;  // 法線ベクトル（x）
        const ny = dy / dist;  // 法線ベクトル（y）

        // パックをCPUの外側に押し出す
        const overlap = cpu.r + puck.r - dist;
        puck.x += nx * overlap;
        puck.y += ny * overlap;

        // 反射処理
        const dot = puck.vx * nx + puck.vy * ny;
        puck.vx -= 2 * dot * nx;
        puck.vy -= 2 * dot * ny;

        // 下方向に向かせる（CPUが上にいるため）
        if (puck.vy < 3) puck.vy = 3; // 下向きの最低速度

        playTone(660, 0.05);
    }
} else {
    // パックがプレイヤー側にある間は、中央付近に戻る
    cpu.x += (canvas.width / 2 - cpu.x) * 0.05;
}


    // --- ゴール判定（プレイヤー側の負け） ---
    if (puck.y > canvas.height) {
        gameRunning = false;

    // 🧾 結果表示
        const finalTime = elapsed.toFixed(0);
        const finalRank = getRank(elapsed);

    // メッセージ非表示・リザルト表示
        message.style.display = "none";

        const resultBox = document.getElementById("resultBox");
        const resultMessage = document.getElementById("resultMessage");
        const resultDetail = document.getElementById("resultDetail");
            // 💡ランクごとの色設定
        let rankColor = "#fff";
        if (finalRank === "D" || finalRank === "C") rankColor = "#f33";
        else if (finalRank === "B") rankColor = "#ffa500";
        else if (finalRank === "A") rankColor = "#ff0";
        else if (finalRank === "S") rankColor = "#0ff";
        else if (finalRank === "SS" || finalRank === "MASTER") rankColor = "#ffd700";

        // 🎯 120秒以上遊んでいたら「GAME CLEAR‼️」
        if (elapsed >= 100) {
            resultMessage.textContent = "GAME CLEAR‼️";
            resultMessage.style.color = "#0ff";
            playTone(880, 0.2);
        } else {
            resultMessage.textContent = "GAME OVER‼️";
            resultMessage.style.color = "#f33";
        }

        resultDetail.innerHTML = `Time：${finalTime}s<br><span class="rank"style="color:${rankColor}">Rank：${finalRank}</span>`;
        resultBox.style.display = "block";

        const restartBtn = document.getElementById("restartBtn");
        restartBtn.onclick = () => {
        resultBox.style.display = "none"; // リザルト非表示
        message.style.display = "block";  // カウントダウン用に再表示
        resetGame();// 🎯 初期化関数を呼ぶ（位置・変数リセット）
        startGame(); // 再スタート！
        };
}

    // --- 経過時間の更新 ---
    elapsed = (performance.now() - startTime) / 1000;
    timeDisplay.textContent = elapsed.toFixed(0);
    rankDisplay.textContent = getRank(elapsed);

    // --- レベルアップ判定（30秒ごとに1レベル上昇） ---
    let newLevel = Math.floor(elapsed / 10) + 1;
    if (newLevel > level && newLevel <= maxLevel) {
        level = newLevel;
        message.textContent = "LEVEL UP!";
        message.style.display = "block";
        message.style.color = "#ff0";
        puck.vy *= 1.25; // スピードアップ
        playTone(880, 0.2);

        setTimeout(() => {
        if (message.textContent === "LEVEL UP!") {
            message.style.display = "none";
        }
    }, 1500);
    }

    levelDisplay.textContent = level;

    // --- 180秒経過でゲームクリア ---
    if (elapsed >= 100 && !message.classList.contains("cleared")) {
        message.textContent = "GAME CLEAR‼️";
        message.style.display = "block";
        message.style.color = "#0ff";
        message.classList.add("cleared");
    }
}

// 🔁 毎フレーム呼び出されるメインループ
function gameLoop() {
    if (!gameRunning) return; // 終了時は停止
    update(16);               // ゲーム状態更新
    draw();                   // 画面描画
    animationId = requestAnimationFrame(gameLoop); // 次のフレーム呼び出し
}

// 🚀 ゲーム開始ボタン処理
const startBtn = document.getElementById("startBtn");


startBtn.onclick = () => {
    startScreen.style.display = "none"; // スタート画面を消す
    resetGame(); // 位置などを初期化
    startGame(); // カウントダウン→ゲーム開始！
};

/* -------------------------------
メニューの開閉処理
-------------------------------*/
const menuBtn = document.getElementById("menuBtn");
const menuPanel = document.getElementById("menuPanel");
const menuClose = document.getElementById("menuClose");
const resumeBtn = document.getElementById("resumeBtn");
const restartBtnMenu = document.getElementById("restartBtnMenu");
const soundToggle = document.getElementById("soundToggle");
//const helpBtn = document.getElementById("helpBtn");

let menuOpen = false;
let animationId = null;

function stopGame() {
    gameRunning = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

function openMenu() {
    menuPanel.classList.add("open");
    menuPanel.setAttribute("aria-hidden", "false");
    menuOpen = true;
    // ゲーム中は一時停止（簡易処理）
    if (gameRunning) {
        gameRunning = false;
        if (animationId) {
            cancelAnimationFrame(animationId); // ← これを確実に入れる
            animationId = null;
        }
         // 現在の状態（画面）をそのまま保持
        ctx.save();
        ctx.globalAlpha = 0.4; // 少し暗くする演出（任意）
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        message.style.display = "block";
        message.textContent = "PAUSED";
    }
}
function closeMenu() {
    menuPanel.classList.remove("open");
    menuPanel.setAttribute("aria-hidden", "true");
    menuOpen = false;

    // 再開（前の状態に戻す）
    if (!gameRunning) {
        message.style.display = "none";
        gameRunning = true;
        requestAnimationFrame(gameLoop); // 再スタート
    }
}

menuBtn.addEventListener("click", () => {
    if (!menuOpen) openMenu();
    else closeMenu();
});
menuClose.addEventListener("click", closeMenu);

// Resume ボタン（メニュー内の Continue）
resumeBtn.addEventListener("click", closeMenu);

// Restart（メニュー）: ゲームをリセットして再スタート
restartBtnMenu.addEventListener("click", () => {
    // 既存の restart 挙動に合わせる
    document.getElementById("resultBox").style.display = "none";
    closeMenu();
    stopGame();
    resetGame();
    document.getElementById("startScreen").style.display = "flex";
    //startGame();
});

// Sound トグル
let soundOn = true;
soundToggle.addEventListener("click", () => {
    soundOn = !soundOn;
    soundToggle.textContent = `🔊音: ${soundOn ? "オン" : "オフ"}`;
    gain.gain.value = soundOn ? 0.05 : 0;
});

// Help（簡易モーダル表示）
//helpBtn.addEventListener("click", () => {
//    alert("Move your mouse to control the paddle. Keep the puck from passing your side!");
//});

// Escで閉じる
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menuOpen) closeMenu();
});
