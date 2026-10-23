
var game = document.getElementById("game-board");
var size = 20;
var speed = 150;
var target = 10;

var currentLevel = 1;
var availableLevels = 5;
var unlockedLevel = 1; //Level cao nhất người chơi được phép chọn
var levelTimeout = null; //Bộ hẹn giờ dùng để tự chuyển màn

var levels = [
    { name: "CLASSIC", speed: 200, target: 10, goalType: "apples", goalText: "Eat 10 apples" },
    { name: "SPEED", speed: 160, target: 15, goalType: "apples", goalText: "Eat 15 apples" },
    { name: "BARRIERS", speed: 170, target: 25, goalType: "length", goalText: "Reach 25 segments", setup: setupLevel3},
    { name: "POISON", speed: 200, target: 10, goalType: "apples", goalText: "Eat 10 apples", setup: setupLevel4 },
    { name: "PORTAL", speed: 230, target: 300, goalType: "score", goalText: "Earn 300 points", setup: setupLevel5 }
];

var levelWarnings = [
    "Ăn 10 táo. Tránh đâm tường và tự cắn thân.",
    "Ăn 15 táo. Hãy phản xạ nhanh vì rắn di chuyển nhanh hơn.",
    "Đạt 25 đốt. Cẩn thận chướng ngại vật hình H, T hoặc U.",
    "Ăn 10 táo thường. Né ma trận độc, chạm độc sẽ đảo phím trong 3 giây.",
    "Ăn mồi thường +10 điểm hoặc mồi Portal +20 điểm và dịch chuyển. Mỗi lượt chỉ xuất hiện một loại mồi.",
    "Thử thách cuối cùng đang chờ bạn."
];

var introTimer = null;
var introSeconds = 3;


var timer = null;
var snake = [];
var apple = null;
var obstacles = [];
// lv5
var portalA = null;
var portalB = null;

var poisonApples = []; //lưu danh sách nhiều mồi độc
var poisonMatrixSteps = 0; //đếm số bước trước khi ma trận biến mất.
var poisonEnabled = false;
var poisonRemaining = 0;
var poisonExpiresAt = 0;
var poisonTimer = null;
var warningTimer = null;
var poisonUiTimer = null;
var poisonTotalDuration = 3000;
var level4IntroDuration = 3000;


var direction = "right";
var inputQueue = [];
var score = 0;
var levelScore = 0;
var appleCount = 0;
var bestScore = 0;
var status = "menu";
var levelNames = ["CLASSIC", "SPEED", "BARRIERS", "POISON", "PORTAL", "FINAL"];





function readData(key) {
    try { return localStorage.getItem(key); }
    catch (error) { return null; }
}

function saveData(key, value) {
    try { localStorage.setItem(key, value); }
    catch (error) { }
}

function formatScore(value) {
    let text = String(value);
    while (text.length < 6) text = "0" + text;
    return text;
}

function initGame() {
    game.innerHTML = "";
    let table = document.createElement("table");
    let tbody = document.createElement("tbody");

    for (let i = 0; i < size; i++) {
        let tr = document.createElement("tr");
        for (let j = 0; j < size; j++) {
            let td = document.createElement("td");
            td.classList.add("cell");
            td.id = "dot" + i + "_" + j;
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    game.appendChild(table);
}

function initSnake() {
    let list = [];
    list.push({ x: 8, y: 10 });
    list.push({ x: 9, y: 10 });
    list.push({ x: 10, y: 10 });
    return list;
}

// Level 3
function setupLevel3() {
    snake = [{ x: 2, y: 16 }, { x: 3, y: 16 }, { x: 4, y: 16 }];

    let shapes = ["H", "T", "U"];
    let shape = shapes[Math.floor(Math.random() * shapes.length)];

    if (shape === "H" || shape === "U") {
        for (let y = 6; y <= 13; y++) {
            obstacles.push({ x: 7, y: y });
            obstacles.push({ x: 12, y: y });
        }

        let row = shape === "H" ? 9 : 13;
        for (let x = 8; x <= 11; x++) obstacles.push({ x: x, y: row });
    }

    if (shape === "T") {
        for (let x = 5; x <= 14; x++) obstacles.push({ x: x, y: 5 });
        for (let y = 6; y <= 15; y++) obstacles.push({ x: 10, y: y });
    }
}

//lv4
function setupLevel4() {
    poisonEnabled = true;
}


function isPoisonApple(x, y) {
    return poisonApples.some(p => p.x === x && p.y === y);
}

function createPoisonMatrix() {
    poisonApples = [];
    poisonMatrixSteps = 0;

    let head = snake[snake.length - 1];

    // Năm vị trí độc trong ma trận 3x3
    let pattern = [
        [0, 0], [2, 0],
        [1, 1],
        [0, 2], [2, 2]
    ];

    let positions = [];

    for (let y = 2; y <= size - 5; y++) {
        for (let x = 2; x <= size - 5; x++) {
            let valid = pattern.every(([dx, dy]) => {
                let px = x + dx;
                let py = y + dy;

                return !isOnSnake(px, py) && !isObstacle(px, py) && !(apple && apple.x === px && apple.y === py)
                    && Math.abs(px - head.x) + Math.abs(py - head.y) >= 4;
            });

            if (valid) positions.push({ x, y });
        }
    }

    if (positions.length === 0) return;
    let start = positions[Math.floor(Math.random() * positions.length)];
    poisonApples = pattern.map(([dx, dy]) => ({
        x: start.x + dx,
        y: start.y + dy
    }));
    poisonMatrixSteps = 20;
}


//Hàm show cảnh báo mồi độc
function showLevel4Intro() {
    status = "warning";
    let warning = document.getElementById("poison-warning-overlay");
    warning.hidden = false;
    warning.querySelector("h3").textContent = "LEVEL 4 · POISON";
    warning.querySelector(".warning-message").textContent =
        "Cẩn thận táo tím! Ăn phải sẽ đảo hướng điều khiển trong 3 giây.";
    warning.querySelector(".warning-hint").textContent = "↑ ↔ ↓   |   ← ↔ →";

    let remaining = level4IntroDuration;
    warning.querySelector(".warning-count").textContent = "BẮT ĐẦU SAU 3 GIÂY";

    warningTimer = setInterval(function () {
        remaining -= 100;

        warning.querySelector(".warning-count").textContent =
            "BẮT ĐẦU SAU " + Math.max(1, Math.ceil(remaining / 1000)) + " GIÂY";

        if (remaining > 0) return;

        clearInterval(warningTimer);
        warningTimer = null;
        warning.hidden = true;

        status = "playing";
        timer = setInterval(moveSnake, speed);
    }, 100);
}



function updatePoisonUI() {
    let line = document.querySelector(".help-line");
    let hud = document.getElementById("poison-timer");
    let active = poisonRemaining > 0;

    line.textContent = active
        ? "POISONED: PHÍM ĐANG ĐẢO NGƯỢC"
        : "MOVE: WASD / ARROWS · PAUSE: SPACE / P";

    line.classList.toggle("poison-warning", active);
    hud.hidden = !active;

    if (!active) return;

    let left = status === "paused"
        ? poisonRemaining
        : Math.max(0, poisonExpiresAt - Date.now());

    document.getElementById("poison-seconds").textContent =
        (left / 1000).toFixed(1) + "s";

    document.getElementById("poison-timer-fill").style.width =
        Math.max(0, left / poisonTotalDuration * 100) + "%";
}

function resetPoisonEffect() {
    clearInterval(warningTimer);
    warningTimer = null;
    document.getElementById("poison-warning-overlay").hidden = true;

    clearTimeout(poisonTimer);
    poisonTimer = null;

    clearInterval(poisonUiTimer);
    poisonUiTimer = null;

    poisonRemaining = 0;
    poisonExpiresAt = 0;
    poisonApples = [];
    poisonMatrixSteps = 0;
    inputQueue = [];

    updatePoisonUI();
}

function endPoisonEffect() {
    poisonTimer = null;

    clearInterval(poisonUiTimer);
    poisonUiTimer = null;

    poisonRemaining = 0;
    poisonExpiresAt = 0;
    inputQueue = [];

    updatePoisonUI();
}

function resumePoisonEffect() {
    if (poisonRemaining <= 0) return;

    poisonExpiresAt = Date.now() + poisonRemaining;

    clearTimeout(poisonTimer);
    clearInterval(poisonUiTimer);

    poisonTimer = setTimeout(endPoisonEffect, poisonRemaining);
    poisonUiTimer = setInterval(updatePoisonUI, 50);

    updatePoisonUI();
}

function pausePoisonEffect() {
    if (poisonTimer === null) return;

    poisonRemaining = Math.max(0, poisonExpiresAt - Date.now());

    clearTimeout(poisonTimer);
    poisonTimer = null;

    clearInterval(poisonUiTimer);
    poisonUiTimer = null;

    updatePoisonUI();
}


function isPoisonReversed() {
    return status === "playing" && poisonRemaining > 0 && Date.now() < poisonExpiresAt;
}


function getPoisonDirection(next) {
    if (!isPoisonReversed()) return next;

    if (next === "up") return "down";
    if (next === "down") return "up";
    if (next === "left") return "right";
    if (next === "right") return "left";

    return next;
}




function eatPoisonApple() {
    if (snake.length > 3)
        snake.shift();
    let head = snake[snake.length - 1];
    poisonApples = poisonApples.filter(p => p.x !== head.x || p.y !== head.y);
    inputQueue = [];
    poisonRemaining = poisonTotalDuration;
    resumePoisonEffect();
    let board = document.querySelector(".board-frame");
    board.classList.remove("poison-hit");
    void board.offsetWidth;
    board.classList.add("poison-hit");
}


// lv5
function setupLevel5() {
    portalA = null;
    portalB = null;
}

function isPortal(x, y) {
    return (portalA !== null && portalA.x === x && portalA.y === y) ||
        (portalB !== null && portalB.x === x && portalB.y === y);
}

function createPortalPair() {
    portalA = null;
    portalB = null;
    if (currentLevel !== 5) return;
    let empty = [];
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (!isOnSnake(x, y) && !isObstacle(x, y) && !isPoisonApple(x, y) &&
                !(apple && apple.x === x && apple.y === y)) {
                empty.push({ x: x, y: y });
            }
        }
    }

    if (empty.length < 2) return;

    let index = Math.floor(Math.random() * empty.length);
    portalA = empty.splice(index, 1)[0];

    let distant = empty.filter(p =>
        Math.abs(p.x - portalA.x) + Math.abs(p.y - portalA.y) >= 7
    );

    let choices = distant.length ? distant : empty;
    portalB = choices[Math.floor(Math.random() * choices.length)];
}

function createFoodLevel5(firstRound = false) {
    apple = null;
    portalA = null;
    portalB = null;

    if (currentLevel !== 5) return;

    if (firstRound || Math.random() < 0.7) {
        apple = createApple();
    } else {
        createPortalPair();
    }
}


function getPortalDestination(x, y) {
    if (currentLevel !== 5 || portalA === null || portalB === null) return null;
    if (x === portalA.x && y === portalA.y)
        return { x: portalB.x, y: portalB.y };
    if (x === portalB.x && y === portalB.y)
        return { x: portalA.x, y: portalA.y };
    return null;
}


function eatPortalPair(entryX, entryY, exit) {
    if (isOnSnake(entryX, entryY) || isOnSnake(exit.x, exit.y)) {
        finishGame("over");
        return;
    }
    // Ăn mồi thứ nhất và dịch chuyển tới mồi thứ hai
    snake.push({ x: entryX, y: entryY });
    snake.push({ x: exit.x, y: exit.y });

    // Hai mồi: mỗi mồi 10 điểm và 1 đốt
    appleCount += 2;
    score += 20;
    levelScore += 20;

    if (score > bestScore) {
        bestScore = score;
        saveData("pixelSnakeBest", String(bestScore));
    }

    //xóa cặp Portal cũ
    portalA = null;
    portalB = null;

    if (isLevelComplete()) {
        snakeDraw();
        finishGame("win");
        return;
    }

    // Sinh cặp Portal mới
    createFoodLevel5();
    snakeDraw();
}

function prepareLevel() {
    obstacles = [];
    poisonEnabled = false;
    portalA = null;
    portalB = null;

    let setup = levels[currentLevel - 1].setup;
    if (typeof setup === "function") setup();
}


function isObstacle(x, y) {
    return obstacles.some(part => part.x === x && part.y === y);
}

function isOnSnake(x, y) {
    return snake.some(part => part.x === x && part.y === y);
}


function clear() {
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            let cell = document.getElementById("dot" + i + "_" + j);
            cell.classList.remove("snake-head", "snake-body", "apple", "obstacle", "poison-apple", "portal-a", "portal-b");
        }
    }
}

// Vẽ Snake
function snakeDraw() {
    clear();
    // lv5
    if (portalA) {
        document.getElementById("dot" + portalA.y + "_" + portalA.x).classList.add("portal-a");
    }
    if (portalB) {
        document.getElementById("dot" + portalB.y + "_" + portalB.x).classList.add("portal-b");
    }
    //=====

    for (let i = 0; i < obstacles.length; i++) {
        let wall = obstacles[i];
        document.getElementById("dot" + wall.y + "_" + wall.x).classList.add("obstacle");
    }

    if (apple !== null) {
        let foodCell = document.getElementById("dot" + apple.y + "_" + apple.x);
        foodCell.classList.add("apple");
    }
    //lv4
    for (let i = 0; i < poisonApples.length; i++) {
        let p = poisonApples[i];
        let cell = document.getElementById("dot" + p.y + "_" + p.x);
        cell.classList.add("poison-apple");
    }


    for (let i = 0; i < snake.length; i++) {
        let part = snake[i];
        let cell = document.getElementById("dot" + part.y + "_" + part.x);
        if (i === snake.length - 1) cell.classList.add("snake-head");
        else cell.classList.add("snake-body");
    }
    updateScore();
}

// tạo random Apple + không cho xuất hiện trên vật cản(level3)
function createApple() {
    let empty = [];

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (!isOnSnake(x, y) && !isObstacle(x, y) && !isPoisonApple(x, y) && !isPortal(x, y)) {
                empty.push({x: x, y: y});
            }
        }
    }

    if (empty.length === 0) return null;
    return empty[Math.floor(Math.random() * empty.length)];
}

// level 3
function getLevelProgress() {
    let type = levels[currentLevel - 1].goalType;

    if (type === "length") return snake.length;
    if (type === "score") return levelScore;
    return appleCount;
}

function getProgressLabel() {
    let type = levels[currentLevel - 1].goalType;

    if (type === "length") return getLevelProgress() + " / " + target + " SEGMENTS";
    if (type === "score") return getLevelProgress() + " / " + target + " POINTS";
    return getLevelProgress() + " / " + target + " APPLES";
}

function isLevelComplete() {
    return getLevelProgress() >= target;
}


// Di chuyển snake
function moveSnake() {
    if (status !== "playing") return;
    if (poisonMatrixSteps > 0) {
        poisonMatrixSteps--;
        if (poisonMatrixSteps === 0) poisonApples = [];
    }
    if (inputQueue.length > 0) direction = inputQueue.shift();

    let head = snake[snake.length - 1];
    let x = head.x;
    let y = head.y;

    if (direction === "up") y--;
    if (direction === "down") y++;
    if (direction === "left") x--;
    if (direction === "right") x++;

    /*lv5*/
    let destination = getPortalDestination(x, y);
    if (destination !== null) {
        eatPortalPair(x, y, destination);
        return;//tránh xly tiếp ăn mồi thường ữa
    }


    //va chạm => return
    if (x < 0 || x >= size || y < 0 || y >= size || isObstacle(x, y)) {
        finishGame("over");
        return;
    }

    let eating = apple !== null && x === apple.x && y === apple.y;
    let eatingPoison = isPoisonApple(x, y);
    let start = 1; // Đuôi cuối sẽ rời đi nếu không ăn táo.
    if (eating) start = 0;

    for (let i = start; i < snake.length; i++) {
        if (snake[i].x === x && snake[i].y === y) {
            finishGame("over");
            return;
        }
    }

    if (eating) {
        snake.push({ x: x, y: y });
        appleCount++;
        score += 10;
        levelScore += 10;

        if (score > bestScore) {
            bestScore = score;
            saveData("pixelSnakeBest", String(bestScore));
        }

        if (isLevelComplete()) {
            apple = null;
            snakeDraw();
            finishGame("win");
            return;
        }
        if (currentLevel === 5) {
            createFoodLevel5();
        } else {
            apple = createApple();
        }
        if (currentLevel === 4)
            createPoisonMatrix();
    } else {
        let tail = snake.shift();
        tail.x = x;
        tail.y = y;
        snake.push(tail);
        if (eatingPoison) eatPoisonApple();
    }
    snakeDraw();
}

// Update score
function updateScore() {
    document.getElementById("score").textContent = formatScore(score);
    document.getElementById("best-score").textContent = formatScore(bestScore);
    document.getElementById("level").textContent = String(currentLevel).padStart(2, "0") + "/06";
    document.getElementById("progress-fill").style.width = Math.min(100, getLevelProgress() / target * 100) + "%";
    document.getElementById("progress-label").textContent = getProgressLabel();

}


function stopGame() {
    clearInterval(timer);
    timer = null;
}

function hideOverlays() {
    let overlays = document.querySelectorAll(".overlay");
    for (let i = 0; i < overlays.length; i++) overlays[i].hidden = true;
}

// hiển thị giao dieenj


function showScreen(id) {
    if (id === "menu-screen") id = "menu-home";
    let screens = document.querySelectorAll("#menu-home, .screen");
    for (let i = 0; i < screens.length; i++) screens[i].hidden = screens[i].id !== id;

    document.body.classList.toggle("in-game", id === "game-screen");

    if (id === "scores-screen") {
        document.getElementById("record-score").textContent = formatScore(bestScore);
    }
}



function startLevel(level, keepScore) {
    if (level < 1 || level > availableLevels) return;

    stopGame();
    clearTimeout(levelTimeout);
    levelTimeout = null;
    clearInterval(introTimer);
    introTimer = null;
    resetPoisonEffect();

    currentLevel = level;
    let config = levels[currentLevel - 1];
    speed = config.speed;
    target = config.target;

    snake = initSnake();
    prepareLevel();
    direction = "right";
    inputQueue = [];
    if (!keepScore) score = 0;
    levelScore = 0;
    appleCount = 0;

    //lv5
    if (currentLevel === 5) {
        createFoodLevel5(true);
    } else {
        apple = createApple();
    }


    //lv4
    poisonApples = [];
    poisonMatrixSteps = 0;
    status = "playing";


    hideOverlays();
    document.getElementById("pause-btn").textContent = "Ⅱ PAUSE";
    document.getElementById("level-name").textContent = "LEVEL " + String(level).padStart(2, "0") + " · " + config.name;
    document.querySelector(".goal-heading strong").textContent = config.goalText;

    showScreen("game-screen");
    snakeDraw();
    showLevelIntro();

}
// show intro hướng dẫn màn chơi
function showLevelIntro() {
    status = "warning";

    let overlay = document.getElementById("level-intro-overlay");
    let title = document.getElementById("intro-title");
    let description = document.getElementById("intro-description");
    let countdown = document.getElementById("intro-countdown");

    title.textContent = "LEVEL " + currentLevel + " · " + levels[currentLevel - 1].name;
    description.textContent = levelWarnings[currentLevel - 1];

    overlay.hidden = false;

    let remaining = introSeconds;
    countdown.textContent = "BẮT ĐẦU SAU " + remaining + " GIÂY";

    clearInterval(introTimer);

    introTimer = setInterval(function () {
        remaining--;

        if (remaining > 0) {
            countdown.textContent = "BẮT ĐẦU SAU " + remaining + " GIÂY";
            return;
        }

        clearInterval(introTimer);
        introTimer = null;
        overlay.hidden = true;

        status = "playing";
        timer = setInterval(moveSnake, speed);
    }, 1000);
}


function startGame() {
    startLevel(1, false);
}

function restartLevel() {
    startLevel(currentLevel, false);
}

function nextLevel() {
    if (status !== "win" || currentLevel >= availableLevels) return;
    startLevel(currentLevel + 1, true);
}



function finishGame(result) {
    stopGame();
    clearInterval(introTimer);
    introTimer = null;
    status = result;

    if (result === "over") {
        document.getElementById("over-detail").textContent = "Level: " + currentLevel + " · Score: " + score + " · Apples: " + appleCount;
        document.getElementById("over-overlay").hidden = false;
        return;
    }

    let hasNext = currentLevel < availableLevels;
    let nextButton = document.getElementById("next-btn");
    nextButton.hidden = !hasNext;

    document.getElementById("win-detail").textContent = hasNext
        ? "Hoàn thành Level " + currentLevel + "! Chuyển màn sau 1,5 giây..."
        :  "Bạn đã hoàn thành Level " + currentLevel + "! Các level tiếp theo đang phát triển.";

    document.getElementById("win-overlay").hidden = false;

    if (hasNext) {
        unlockedLevel = Math.max(unlockedLevel, currentLevel + 1);
        saveData("snakeUnlockedLevel", String(unlockedLevel));
        createLevelCards();
        levelTimeout = setTimeout(nextLevel, 6000);
    }
}


function pauseGame() {
    if (status === "playing") {
        stopGame();
        status = "paused";
        updatePoisonUI();

        document.getElementById("pause-overlay").hidden = false;
        document.getElementById("pause-btn").textContent = "▶ RESUME";
    } else if (status === "paused") {
        inputQueue = [];
        status = "playing";
        resumePoisonEffect();
        updatePoisonUI();

        document.getElementById("pause-overlay").hidden = true;
        document.getElementById("pause-btn").textContent = "Ⅱ PAUSE";
        timer = setInterval(moveSnake, speed);
    }
}

// btn back MENU
function backToMenu() {
    stopGame();
    clearInterval(introTimer);
    introTimer = null;
    document.getElementById("level-intro-overlay").hidden = true;
    clearTimeout(levelTimeout);
    levelTimeout = null;
    status = "menu";
    hideOverlays();
    showScreen("menu-home");
}



function createLevelCards() {
    let container = document.getElementById("level-grid");
    container.innerHTML = "";

    for (let i = 0; i < levelNames.length; i++) {
        let level = i + 1;
        let button = document.createElement("button");
        button.className = "btn level-card";

        let ready = level <= availableLevels;
        let unlocked = level <= unlockedLevel;
        button.disabled = !ready || !unlocked;

        let caption = "COMING SOON";
        if (ready && !unlocked) caption = "LOCKED";
        if (ready && unlocked) caption = "▶ PLAY";

        button.innerHTML = "<b>" + level + "</b><span>" + levelNames[i] + "</span><small>" + caption + "</small>";

        if (ready && unlocked) {
            button.addEventListener("click", function () {
                startLevel(level, false);
            });
        }

        container.appendChild(button);
    }
}

// Đổi hướng
function changeDirection(next) {
    if (status !== "playing" || inputQueue.length >= 2) return;
    let last = direction;
    if (inputQueue.length > 0) last = inputQueue[inputQueue.length - 1];
    if (next === last) return;
    if (last === "up" && next === "down") return;
    if (last === "down" && next === "up") return;
    if (last === "left" && next === "right") return;
    if (last === "right" && next === "left") return;
    inputQueue.push(next);
}

// xử lý press key từ bàn phím
function handleKey(event) {
    let key = event.key.toLowerCase();
    let code = event.code;
    let next = "";

    if (code === "KeyW" || key === "arrowup") next = "up";
    if (code === "KeyS" || key === "arrowdown") next = "down";
    if (code === "KeyA" || key === "arrowleft") next = "left";
    if (code === "KeyD" || key === "arrowright") next = "right";

    let pauseKey = code === "Space" || code === "KeyP" || key === " " || key === "p";

    if ((next !== "" || pauseKey) && (status === "playing" || status === "paused")) {
        event.preventDefault();
    }
    if (next !== "") changeDirection(getPoisonDirection(next));
    if (pauseKey && !event.repeat && (status === "playing" || status === "paused")) {
        pauseGame();
    }
}


function handleMouseClick(event) {
    if (status !== "playing") return;

    let rect = game.getBoundingClientRect();
    let cellX = Math.floor((event.clientX - rect.left) / rect.width * size);
    let cellY = Math.floor((event.clientY - rect.top) / rect.height * size);

    cellX = Math.max(0, Math.min(size - 1, cellX));
    cellY = Math.max(0, Math.min(size - 1, cellY));

    let head = snake[snake.length - 1];
    let dx = cellX - head.x;
    let dy = cellY - head.y;

    if (dx === 0 && dy === 0) return;
    let next = "";

    if (Math.abs(dx) >= Math.abs(dy)) {
        next = dx > 0 ? "right" : "left";
    } else {
        next = dy > 0 ? "down" : "up";
    }
    changeDirection(getPoisonDirection(next));
}



function initButtons() {
    document.getElementById("start-btn").addEventListener("click", startGame);
    document.getElementById("retry-btn").addEventListener("click", restartLevel);
    document.getElementById("restart-btn").addEventListener("click", restartLevel);
    document.getElementById("replay-btn").addEventListener("click", restartLevel);
    document.getElementById("next-btn").addEventListener("click", nextLevel);
    document.getElementById("pause-btn").addEventListener("click", pauseGame);
    document.getElementById("resume-btn").addEventListener("click", pauseGame);

    let menus = document.querySelectorAll("[data-menu]");
    for (let i = 0; i < menus.length; i++) menus[i].addEventListener("click", backToMenu);

    let buttons = document.querySelectorAll("[data-screen]");
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener("click", function () {
            showScreen(this.getAttribute("data-screen"));
        });
    }
    let toggle = document.getElementById("grid-toggle");
    toggle.checked = readData("pixelSnakeGrid") !== "false";
    document.body.classList.toggle("hide-grid", !toggle.checked);
    toggle.addEventListener("change", function () {
        document.body.classList.toggle("hide-grid", !this.checked);
        saveData("pixelSnakeGrid", String(this.checked));
    });
}



bestScore = Number(readData("pixelSnakeBest")) || 0;
unlockedLevel = Math.max(1, Math.min(availableLevels, Number(readData("snakeUnlockedLevel")) || 1));

document.addEventListener("keydown", handleKey);

initGame();
createLevelCards();
initButtons();
showScreen("menu-home");

