const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const ui = document.getElementById('ui');
const startBtn = document.getElementById('startBtn');
const scoreDisplay = document.getElementById('currentScore');
const bestDisplay = document.getElementById('bestScore');

// 초기 설정
canvas.width = 450;
canvas.height = 800;

let gameActive = false;
let score = 0;
let highScore = localStorage.getItem('starDodgerBest') || 0;
bestDisplay.innerText = highScore;

let player, enemies, particles, items;
let gameSpeed = 1;

// --- 효과음 (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(freq, type, duration, vol = 0.1) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + duration);
}

// --- 클래스 정의 ---
class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.size = Math.random() * 3 + 1;
        this.speedX = (Math.random() - 0.5) * 10;
        this.speedY = (Math.random() - 0.5) * 10;
        this.life = 1.0;
    }
    update() {
        this.x += this.speedX; this.y += this.speedY;
        this.life -= 0.02;
    }
    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}

function init() {
    player = { x: canvas.width / 2, y: canvas.height - 100, size: 25, shield: false };
    enemies = []; particles = []; items = [];
    score = 0; gameSpeed = 1;
    scoreDisplay.innerText = score;
}

// 입력 처리 (마우스 & 터치 공용)
function handleMove(e) {
    if (!gameActive) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    player.x = (clientX - rect.left) * (canvas.width / rect.width);
}
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleMove(e); }, { passive: false });

function update() {
    if (!gameActive) return;

    // 난이도 상승
    gameSpeed += 0.0005;

    // 적 생성
    if (Math.random() < 0.04 * gameSpeed) {
        enemies.push({
            x: Math.random() * canvas.width, y: -20,
            size: Math.random() * 20 + 15,
            speed: (Math.random() * 3 + 2) * gameSpeed,
            color: '#e94560'
        });
    }

    // 아이템 생성 (보호막)
    if (Math.random() < 0.005) {
        items.push({ x: Math.random() * canvas.width, y: -20, size: 20, speed: 3 });
    }

    // 아이템 로직
    items.forEach((item, i) => {
        item.y += item.speed;
        if (Math.hypot(player.x - item.x, player.y - item.y) < player.size) {
            player.shield = true;
            playSound(600, 'sine', 0.3, 0.2);
            items.splice(i, 1);
        }
    });

    // 적 로직
    enemies.forEach((enemy, i) => {
        enemy.y += enemy.speed;
        const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);

        if (dist < (player.size + enemy.size) / 2) {
            if (player.shield) {
                player.shield = false;
                enemies.splice(i, 1);
                playSound(300, 'square', 0.2);
                for(let j=0; j<10; j++) particles.push(new Particle(enemy.x, enemy.y, '#gold'));
            } else {
                gameOver();
            }
        }

        if (enemy.y > canvas.height) {
            enemies.splice(i, 1);
            score++;
            scoreDisplay.innerText = score;
            if (score % 20 === 0) playSound(800, 'triangle', 0.1);
        }
    });

    particles.forEach((p, i) => {
        p.update();
        if (p.life <= 0) particles.splice(i, 1);
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 파티클
    particles.forEach(p => p.draw());

    // 아이템 (노란색 별)
    items.forEach(item => {
        ctx.fillStyle = '#fbc531';
        ctx.beginPath(); ctx.arc(item.x, item.y, item.size/2, 0, Math.PI*2); ctx.fill();
    });

    // 적
    enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        ctx.shadowBlur = 10; ctx.shadowColor = enemy.color;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.size/2, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
    });

    // 플레이어
    ctx.fillStyle = '#00d2ff';
    ctx.shadowBlur = 15; ctx.shadowColor = '#00d2ff';
    ctx.beginPath(); ctx.arc(player.x, player.y, player.size/2, 0, Math.PI*2); ctx.fill();
    
    // 보호막 표시
    if (player.shield) {
        ctx.strokeStyle = '#fbc531';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(player.x, player.y, player.size/1.2, 0, Math.PI*2); ctx.stroke();
    }
    ctx.shadowBlur = 0;

    if (gameActive) requestAnimationFrame(() => { update(); draw(); });
}

function gameOver() {
    gameActive = false;
    playSound(100, 'sawtooth', 0.6, 0.3);
    for(let i=0; i<30; i++) particles.push(new Particle(player.x, player.y, '#00d2ff'));
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('starDodgerBest', highScore);
        bestDisplay.innerText = highScore;
    }

    ui.classList.remove('hidden');
    document.getElementById('title').innerText = "GAME OVER";
    startBtn.innerText = "다시 도전";
}

startBtn.onclick = () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    init();
    gameActive = true;
    ui.classList.add('hidden');
    playSound(400, 'sine', 0.2);
    draw();
};
