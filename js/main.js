
var game = document.getElementById("game-board");
var size = 20;
var speed = 150;
var target = 10;

var currentLevel = 1;
var availableLevels = 3;
var unlockedLevel = 1; //Level cao nhất người chơi được phép chọn
var levelTimeout = null; //Bộ hẹn giờ dùng để tự chuyển màn

var levels = [
    { name: "CLASSIC", speed: 200, target: 10, goalType: "apples", goalText: "Eat 10 apples" },
    { name: "SPEED", speed: 170, target: 15, goalType: "apples", goalText: "Eat 15 apples" },
    { name: "BARRIERS", speed: 170, target: 25, goalType: "length", goalText: "Reach 25 segments", setup: setupLevel3 }
];

var timer = null;
var snake = [];
var apple = null;
var obstacles = [];
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


function prepareLevel() {
    obstacles = [];
    let setup = levels[currentLevel - 1].setup;
    if (typeof setup === "function") setup();
}

function isObstacle(x, y) {
    return obstacles.some(part => part.x === x && part.y === y);
}

function isOnSnake(x, y) {
    return snake.some(part => part.x === x && part.y === y);
}
// =============

function clear() {
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            let cell = document.getElementById("dot" + i + "_" + j);
            cell.classList.remove("snake-head", "snake-body", "apple", "obstacle");        }
    }
}

// Vẽ Snake
function snakeDraw() {
    clear();

    for (let i = 0; i < obstacles.length; i++) {
        let wall = obstacles[i];
        document.getElementById("dot" + wall.y + "_" + wall.x).classList.add("obstacle");
    }

    if (apple !== null) {
        let foodCell = document.getElementById("dot" + apple.y + "_" + apple.x);
        foodCell.classList.add("apple");
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
            if (!isOnSnake(x, y) && !isObstacle(x, y)) empty.push({ x: x, y: y });
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
    if (inputQueue.length > 0) direction = inputQueue.shift();

    let head = snake[snake.length - 1];
    let x = head.x;
    let y = head.y;

    if (direction === "up") y--;
    if (direction === "down") y++;
    if (direction === "left") x--;
    if (direction === "right") x++;

    //va chạm => return
    if (x < 0 || x >= size || y < 0 || y >= size || isObstacle(x, y)) {        finishGame("over");
        return;
    }

    let eating = apple !== null && x === apple.x && y === apple.y;
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
        apple = createApple();
    } else {
        let tail = snake.shift();
        tail.x = x;
        tail.y = y;
        snake.push(tail);
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
    apple = createApple();
    status = "playing";

    hideOverlays();
    document.getElementById("pause-btn").textContent = "Ⅱ PAUSE";
    document.getElementById("level-name").textContent = "LEVEL " + String(level).padStart(2, "0") + " · " + config.name;
    document.querySelector(".goal-heading strong").textContent = config.goalText;

    showScreen("game-screen");
    snakeDraw();
    timer = setInterval(moveSnake, speed);
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
        levelTimeout = setTimeout(nextLevel, 1500);
    }
}


function pauseGame() {
    if (status === "playing") {
        stopGame();
        status = "paused";
        document.getElementById("pause-overlay").hidden = false;
        document.getElementById("pause-btn").textContent = "▶ RESUME";
    } else if (status === "paused") {
        inputQueue = [];
        status = "playing";
        document.getElementById("pause-overlay").hidden = true;
        document.getElementById("pause-btn").textContent = "Ⅱ PAUSE";
        timer = setInterval(moveSnake, speed);
    }
}

// btn back MENU
function backToMenu() {
    stopGame();
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
    let next = "";
    if (key === "w" || key === "arrowup") next = "up";
    if (key === "s" || key === "arrowdown") next = "down";
    if (key === "a" || key === "arrowleft") next = "left";
    if (key === "d" || key === "arrowright") next = "right";

    if ((next !== "" || key === " " || key === "p") && (status === "playing" || status === "paused")) event.preventDefault();
    if (next !== "") changeDirection(next);
    if ((key === " " || key === "p") && !event.repeat && (status === "playing" || status === "paused")) pauseGame();
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
    document.addEventListener("keydown", handleKey);

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

initGame();
createLevelCards();
initButtons();
showScreen("menu-home");
