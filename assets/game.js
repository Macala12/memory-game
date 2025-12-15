/******************************
 *   CONFIGURATIONS
 ******************************/

const API_BASE_URL = 'http://localhost:3000';
const urlParams = new URLSearchParams(window.location.search);
const userid = urlParams.get("userid");
const id = urlParams.get("id");
const key = urlParams.get("key");


// Change difficulty here: "medium" or "hard"
let CPU_DIFFICULTY = "hard";
const randomValue = +(Math.random() * 0.8 + 0.1).toFixed(2);

const music = new Audio('./assets/music.mp3');
const cardSound = new Audio('./assets/card.mp3');
const win  = new Audio('./assets/win.mp3');
const lose = new Audio('./assets/lose.mp3');
music.loop = true;  

/******************************
 *  SET VOLUME
 *  ******************************/
music.volume = 1; 
cardSound.volume = 0.5;
win.volume = 0.5;
lose.volume = 0.5;

document.querySelector(".start_game_btn").addEventListener("click", () => {
    document.querySelector(".homeScreen").classList.remove("active");
    document.querySelector(".homeScreen").style.display = 'none';
    document.querySelector(".main").style.display = 'block';
    music.play();
});

/******************************
 *   SELECTORS & STATE
 ******************************/

const selectors = {
    boardContainer: document.querySelector('.board-container'),
    board: document.querySelector('.board'),
    start: document.querySelector('button'),
    userMoves: document.querySelector('.user_moves'),
    opponentMoves: document.querySelector('.opponent_moves'),
    win: document.querySelector('.win'),
    user_score: document.querySelector('.user_score'),
    opponent_score: document.querySelector('.opponent_score'),
    octacoin: document.querySelector('.octacoin'),
    wallet: document.querySelector('.value_balance')
}

const state = {
    gameStarted: false,
    flippedCards: 0,
    totalFlips: 0,
    memory: {},             // CPU memory of seen cards
    currentTurn: "player",  // "player" or "cpu"
    lockInput: false,
    matched: 0,
    userFlips: 0,
    cpuFlips: 0,
    playerScore: 0, 
    cpuScore: 0,
    wager: 0,
    reward: 0      

}

PreloadGame().then(initialize => {
    if (!initialize.payload.status) {
        console.log(initialize);
        
        // window.location.href = `${API_BASE_URL}/not_found`;
    }

    state.playerScore = initialize.payload.payload.score;
    state.userFlips = initialize.payload.payload.moves;
    state.cpuScore = initialize.payload.payload.oppScore;
    state.cpuFlips = initialize.payload.payload.oppMoves;
    state.wager = initialize.payload.payload.wagerOctacoin;
    state.reward = initialize.payload.payload.reward;
    selectors.octacoin.innerHTML = `
        <img src="./assets/logo.png" width="20px" alt="coin">
        ${initialize.payload.payload.wagerOctacoin}
    `;
    reward = initialize.payload.payload.reward;
    selectors.wallet.innerHTML = `
        <img src="./assets/dollars.png" width="20px" alt="coin">
        ${initialize.payload.payload.reward}
    `;
    document.querySelector('.reward').innerHTML = 'N'+initialize.payload.payload.reward;
    document.querySelector('.reward_ui').innerHTML = 'N'+initialize.payload.payload.reward;
    document.querySelector('.oppName').innerHTML = initialize.payload.payload.oppUsername;
    selectors.userMoves.innerHTML = `
        ${state.userFlips} moves
    `;
    selectors.user_score.innerHTML = `
        score: ${state.playerScore}
    `;
    selectors.opponent_score.innerHTML = `
        score: ${state.cpuScore}
    `;
    selectors.opponentMoves.innerHTML = `
        ${state.cpuFlips} moves
    `;
});

/******************************
 *   UTILITIES
 ******************************/

const shuffle = array => {
    const clonedArray = [...array]
    for (let index = clonedArray.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(Math.random() * (index + 1))
        const original = clonedArray[index]

        clonedArray[index] = clonedArray[randomIndex]
        clonedArray[randomIndex] = original
    }
    return clonedArray
}

const pickRandom = (array, items) => {
    const clonedArray = [...array]
    const randomPicks = []

    for (let index = 0; index < items; index++) {
        const randomIndex = Math.floor(Math.random() * clonedArray.length)
        randomPicks.push(clonedArray[randomIndex])
        clonedArray.splice(randomIndex, 1)
    }
    return randomPicks
}


/******************************
 *   GAME CREATION
 ******************************/

const generateGame = () => {
    let boardNumber;
    let emoji;
    if (randomValue < 0.6) {
        boardNumber = 4;
        emoji = [
        '🍒', '🥕', '🍇',
        '🍉', '🍌', '🥭', '🍍', '🍎', 
        ];
    }else{
        boardNumber = 6;
        emoji = ['🥔', '🍒', '🥑', '🌽', '🥕', '🍇',
                '🍉', '🍌', '🥭', '🍍', '🍎', '🍋',
                '🍓', '🥝', '🥥', '🫐', '🍑', '🍐',
                '🥭', '🍊', '🍈', '🍏', '🍅', '🌶️']
    }
    const dimensions = boardNumber;

    if (dimensions % 2 !== 0) {
        throw new Error("Board dimension must be an even number.")
    }

    const emojis = emoji;
    const picks = pickRandom(emojis, (dimensions * dimensions) / 2)
    const items = shuffle([...picks, ...picks])

    const cards = `
        <div class="board" style="grid-template-columns: repeat(${dimensions}, auto)">
            ${items.map(item => `
                <div class="card" data-value="${item}">
                    <div class="card-front">
                        <img src="./assets/logo.png" width="25px" alt="logo">
                    </div>
                    <div class="card-back">${item}</div>
                </div>
            `).join('')}
        </div>
    `
    
    const parser = new DOMParser().parseFromString(cards, 'text/html')
    selectors.board.replaceWith(parser.querySelector('.board'))

    state.memory = {}
    state.matched = 0
}


/******************************
 *   TURN SYSTEM
 ******************************/

function switchTurn() {
    state.currentTurn = state.currentTurn === "player" ? "cpu" : "player";
    
    if (state.currentTurn === "cpu") {
        document.querySelector('.opponent').style.display = 'block';
        document.querySelector('.user').style.display = 'none';
        setTimeout(cpuTurn, 700);
    }else{
        document.querySelector('.opponent').style.display = 'none';
        document.querySelector('.user').style.display = 'block';
    }
}


/******************************
 *   PLAYER LOGIC
 ******************************/

function handlePlayerFlip(card) {
    if (state.lockInput || state.currentTurn !== "player") return;
    if (card.classList.contains("flipped") || card.classList.contains("matched")) return;

    flipCard(card);
}


/******************************
 *   CPU LOGIC
 ******************************/

function cpuTurn() {
    if (state.currentTurn !== "cpu") return;

    state.lockInput = true;

    const available = Array.from(
        document.querySelectorAll('.card:not(.flipped):not(.matched)')
    ).filter(c => c && c.classList);

    if (available.length < 2) return;

    // HARD / MEDIUM memory logic
    let pair = findKnownPairs();

    let firstCard, secondCard;

    if (pair && pair.length === 2) {
        [firstCard, secondCard] = pair;
    } else {
        // pick random
        firstCard = available[Math.floor(Math.random() * available.length)];

        const remaining = available.filter(c =>
            c &&
            c !== firstCard &&
            c.classList &&
            !c.classList.contains("flipped")
        );

        secondCard = remaining[Math.floor(Math.random() * remaining.length)];
    }

    // Safety guard
    if (!firstCard || !secondCard) {
        state.lockInput = false;
        switchTurn();
        return;
    }

    // Flip cards with delay
    setTimeout(() => flipCard(firstCard), 300);
    setTimeout(() => flipCard(secondCard), 700);
}

function findKnownPairs() {
    for (const value in state.memory) {
        const cards = state.memory[value].filter(c =>
            c &&
            c instanceof HTMLElement &&
            c.classList &&
            !c.classList.contains("matched") &&
            !c.classList.contains("flipped")
        );

        if (cards.length >= 2) {
            return cards.slice(0, 2);
        }
    }
    return null;
}

/******************************
 *   CARD FLIP + MATCH LOGIC
 ******************************/

function flipCard(card) {
    card.classList.add("flipped");
    const value = card.getAttribute("data-value");
    cardSound.play();

    // Store in memory
    if (!state.memory[value]) state.memory[value] = [];
    if (!state.memory[value].includes(card)) state.memory[value].push(card);

    state.flippedCards++;
    state.totalFlips++;

    if (state.flippedCards === 2) {
        state.lockInput = true;

        const flipped = document.querySelectorAll('.flipped:not(.matched)');
        const [c1, c2] = flipped;

        if (c1.getAttribute("data-value") === c2.getAttribute("data-value")) {
            if (state.currentTurn === "player") {
                state.playerScore++;
                selectors.user_score.innerHTML = `Score: ${state.playerScore}`;
            }else{
                state.cpuScore++;
                selectors.opponent_score.innerHTML = `Score: ${state.cpuScore}`;
            }

            saveGameState();

            c1.classList.add('matched');
            c2.classList.add('matched');
            state.matched += 2;

            setTimeout(() => {
                resetFlipped();
                checkWin();
                if (state.currentTurn === "player") return;
                if (state.currentTurn === "cpu") cpuTurn();
                else switchTurn();
            }, 500);
        } else {
            saveGameState();
            setTimeout(() => {
                resetFlipped();
                switchTurn();
            }, 700);
        }
    }

    if (state.currentTurn === "player") {
        state.userFlips++;
        selectors.userMoves.innerText = `${state.userFlips} moves`;
    } else {
        state.cpuFlips++;
        selectors.opponentMoves.innerText = `${state.cpuFlips} moves`;
    }

    UpdateGameData(state.playerScore, state.userFlips, state.cpuScore, state.cpuFlips).then(initialize => {
        if (!initialize.payload.status) {
            alert(initialize.payload.message);
        } else{
            console.log("success");                  
        }
    });
}

function resetFlipped() {
    document.querySelectorAll('.card.flipped:not(.matched)').forEach(c => {
        c.classList.remove('flipped');
    });
    state.flippedCards = 0;
    state.lockInput = false;
}


/******************************
 *   WIN CONDITION
 ******************************/

function checkWin() {
    const totalCards = document.querySelectorAll('.card').length;

    // If all cards are matched, end game
    if (state.matched === totalCards) {
        music.pause();
        selectors.boardContainer.classList.add('flipped');

        // Show user vs CPU moves
        const userMoves = state.playerScore || 0;
        const cpuMoves = state.cpuScore || 0;

        // Determine winner
        let message = '';
        let reward = 0;
        let gameState;
        document.querySelector('.user').style.display = 'none';
        document.querySelector('.opponent').style.display = 'none';

        if (userMoves > cpuMoves) {
            // Player wins
            message = "🎉 You Won! 🎉";
            reward = state.reward;
            gameState = 'won';
            win.play();
        } else if (userMoves === cpuMoves) {
            message = " Draw! ";
            reward = 300;
            gameState = 'draw';
            win.play();
        } else {
            // CPU wins
            message = "😢 You Lose!";
            gameState = 'lose';
            lose.play();
        }

        gameOver(state.playerScore, state.cpuScore).then(initialize => {
            if (!initialize.payload.status) {
                alert(initialize.payload.message);
            } else{
                localStorage.removeItem("memoryGameState");
                console.log("gameOver");
            }
        });

        selectors.win.innerHTML = `
            <span class="win-text">
                ${message}<br><br>
                <div class="win-box">
                    Your Score: <span class="highlight">${userMoves}</span><br>
                    Opponent Score: <span class="highlight">${cpuMoves}</span><br>
                    ${state.reward > 0 ? `Reward: <span class="highlight">N${state.reward}</span>` : ''}
                </div>
                <button class="btn replay" onclick="playAgain()">
                    Play again
                    <br>
                    (${state.wager} octacoins)
                </button>
            </span>
        `;
    }
}

document.querySelector('.cancel_btn').addEventListener('click', () => {
    window.location.href = `${API_BASE_URL}/home`;
});

async function playAgain() {
    document.querySelector('.replay').innerHTML = 'Initializing...';
    const response = await fetch(`${API_BASE_URL}/new_game`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            userid: userid,
            id: id,
            key: key
        })
    });
    const result = await response.json();

    if (result.status) {
        localStorage.removeItem("memoryGameState");
        window.location.href = `${result.url}/?userid=${result.payload.userid}&id=${result.payload.gameid}&key=${result.payload.gameKey}`   
    }else{
        document.querySelector('.replay').innerHTML = result.message;
    }
}

function saveGameState() {
    const matchedCards = Array.from(document.querySelectorAll('.card')).map((card, index) => ({
        index,
        matched: card.classList.contains("matched"),
        value: card.getAttribute("data-value")
    }));

    const stateToSave = {
        matchedCards,
        playerScore: state.playerScore,
        cpuScore: state.cpuScore,
        userFlips: state.userFlips,
        cpuFlips: state.cpuFlips,
        currentTurn: state.currentTurn,
        memory: state.memory
    };

    localStorage.setItem("memoryGameState", JSON.stringify(stateToSave));
}

function loadGameState() {
    const saved = localStorage.getItem("memoryGameState");
    if (!saved) return;

    const data = JSON.parse(saved);
    const cards = document.querySelectorAll(".card");

    data.matchedCards.forEach((item, index) => {
        if (item.matched) {
            cards[index].classList.add("matched", "flipped");
        }
        cards[index].setAttribute("data-value", item.value);
    });

    // Restore state values
    state.playerScore = data.playerScore;
    state.cpuScore = data.cpuScore;
    state.userFlips = data.userFlips;
    state.cpuFlips = data.cpuFlips;
    state.currentTurn = data.currentTurn;
    state.memory = data.memory;

    // Update UI
    selectors.user_score.innerText = state.playerScore;
    selectors.opponent_score.innerText = state.cpuScore;

    selectors.userMoves.innerText = `${state.userFlips} moves`;
    selectors.opponentMoves.innerText = `${state.cpuFlips} moves`;

    // If it's CPU turn, resume CPU
    if (state.currentTurn === "cpu") {
        setTimeout(cpuTurn, 500);
    }
}

/******************************
 *   EVENT LISTENERS
 ******************************/

const attachEvents = () => {
    document.addEventListener('click', e => {
        const card = e.target.closest('.card');
        if (card) handlePlayerFlip(card);

        if (e.target.nodeName === 'BUTTON' && !selectors.start.classList.contains('disabled')) {
            selectors.start.classList.add('disabled');
            state.gameStarted = true;
            cpuMaybeStarts();
        }
    });
}

function cpuMaybeStarts() {
    if (state.currentTurn === "cpu") {
        setTimeout(cpuTurn, 700);
    }
}

async function PreloadGame() {
    const response = await fetch(`${API_BASE_URL}/initialize_game?id=${id}&userid=${userid}&key=${key}`, {
        method: "GET"
    });
    const result = await response.json();
    
    return { payload: result };
}

async function UpdateGameData(score, moves, oppScore, oppMoves) {
    const response = await fetch(`${API_BASE_URL}/update_game?userid=${userid}&id=${id}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            score: score,
            moves: moves,
            oppScore: oppScore,
            oppMoves: oppMoves
        })
    });
    const result = await response.json();

    return { payload: result };
}

async function gameOver(userscore, oppscore) {
    const response = await fetch(`${API_BASE_URL}/end_game`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            userid: userid,
            id: id,
            userScore: userscore,
            oppScore: oppscore
        })
    });
    const result = await response.json();

    return { payload: result };
}

/******************************
 *   INIT
 ******************************/

generateGame();
loadGameState();
attachEvents();
