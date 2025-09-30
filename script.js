// --- Global Game State ---
let correctPlacement = []; // Stores objects like { piece: 'wR', squareId: 'a1' }
let userPlacement = {};    // Stores key-value pairs like { 'a1': 'wR', 'd4': 'bQ' }
let availableSquares = []; // List of square IDs (e.g., 'a1', 'h8')
let countdownTimer;
let timeLeft = 15; // Time for memorization in seconds
let isGameActive = false;
let activePieceType = null; // The piece the user has selected from the sidebar

// --- Piece Definitions (Unicode Chess Symbols) ---
const PIECES = {
    'wP': '♙', 'wR': '♖', 'wN': '♘', 'wB': '♗', 'wQ': '♕', 'wK': '♔',
    'bP': '♟', 'bR': '♜', 'bN': '♞', 'bB': '♝', 'bQ': '♛', 'bK': '♚'
};
const ALL_PIECE_TYPES = ['wR', 'wN', 'wB', 'wQ', 'wK', 'wP', 'bR', 'bN', 'bB', 'bQ', 'bK', 'bP'];
const PIECE_WEIGHTS = { 'K': 1, 'Q': 1, 'R': 2, 'B': 2, 'N': 2, 'P': 8 }; // For piece type randomization

// --- DOM Elements ---
const boardEl = document.getElementById('board');
const selectionAreaEl = document.getElementById('selection-area');
const applyBtn = document.getElementById('apply-btn');
const checkBtn = document.getElementById('check-btn');
const timerDisplay = document.getElementById('time');
const whiteCountInput = document.getElementById('white-count');
const blackCountInput = document.getElementById('black-count');
const messageArea = document.getElementById('message-area');

// --- Initialization Functions ---

/**
 * Creates the 8x8 chess board squares in the DOM.
 */
function createBoard() {
    boardEl.innerHTML = '';
    availableSquares = [];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    for (let rank = 8; rank >= 1; rank--) {
        for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
            const file = files[fileIndex];
            const squareId = file + rank;
            const isDark = (rank + fileIndex) % 2 !== 0;

            const squareEl = document.createElement('div');
            squareEl.className = `square ${isDark ? 'dark' : 'light'}`;
            squareEl.id = squareId;
            squareEl.addEventListener('click', handleSquareClick);
            
            boardEl.appendChild(squareEl);
            availableSquares.push(squareId);
        }
    }
}

/**
 * Creates the selectable pieces in the sidebar.
 */
function createSelectionArea() {
    selectionAreaEl.innerHTML = '<h2>Select Piece:</h2>';
    ALL_PIECE_TYPES.forEach(type => {
        const pieceEl = document.createElement('span');
        pieceEl.className = 'selectable-piece';
        pieceEl.dataset.pieceType = type;
        
        // Add color class for styling
        const color = type.startsWith('w') ? 'white' : 'black';
        pieceEl.classList.add(color);
        
        pieceEl.innerHTML = PIECES[type];
        pieceEl.addEventListener('click', handleSelectPiece);
        selectionAreaEl.appendChild(pieceEl);
    });
}

/**
 * Generates a random piece type based on color and probability (optional, defaults to random piece).
 * @param {string} color - 'w' or 'b'
 */
function getRandomPieceType(color) {
    // Basic implementation: just choose a random piece type of that color
    const colorPieces = Object.keys(PIECES).filter(p => p.startsWith(color));
    const randomIndex = Math.floor(Math.random() * colorPieces.length);
    return colorPieces[randomIndex];
}

/**
 * Initializes the game state, randomly placing the required number of pieces.
 */
function initializeGame() {
    messageArea.textContent = 'Memorize the board!';
    isGameActive = true;
    correctPlacement = [];
    userPlacement = {};
    activePieceType = null;

    // Reset board appearance
    document.querySelectorAll('.square').forEach(sq => {
        sq.innerHTML = '';
        sq.classList.remove('correct', 'incorrect');
        sq.style.cursor = 'default';
    });
    
    // Reset selection area
    document.querySelectorAll('.selectable-piece').forEach(p => p.classList.remove('selected'));

    const whiteCount = parseInt(whiteCountInput.value);
    const blackCount = parseInt(blackCountInput.value);
    const totalPieces = whiteCount + blackCount;

    // Ensure we don't exceed the board size (64 squares)
    if (totalPieces > 64) {
        messageArea.textContent = 'Error: Too many pieces selected!';
        return;
    }

    // Shuffle squares for random placement
    const shuffledSquares = [...availableSquares].sort(() => 0.5 - Math.random());

    // 1. Place White Pieces
    for (let i = 0; i < whiteCount; i++) {
        const squareId = shuffledSquares.pop();
        const pieceType = getRandomPieceType('w');
        correctPlacement.push({ piece: pieceType, squareId: squareId });
        
        // Show piece immediately with color class
        const squareEl = document.getElementById(squareId);
        squareEl.innerHTML = `<span class="piece white">${PIECES[pieceType]}</span>`;
    }

    // 2. Place Black Pieces
    for (let i = 0; i < blackCount; i++) {
        const squareId = shuffledSquares.pop();
        const pieceType = getRandomPieceType('b');
        correctPlacement.push({ piece: pieceType, squareId: squareId });

        // Show piece immediately with color class
        const squareEl = document.getElementById(squareId);
        squareEl.innerHTML = `<span class="piece black">${PIECES[pieceType]}</span>`;
    }

    // Start the timer and hide pieces after timeout
    startCountdown(timeLeft);
}

// --- Timer and Phase Management ---

/**
 * Starts the countdown timer.
 * @param {number} duration - Time in seconds.
 */
function startCountdown(duration) {
    timeLeft = duration;
    clearInterval(countdownTimer);
    
    // Show board and hide selection area during memorization
    boardEl.classList.remove('hidden');
    selectionAreaEl.classList.add('hidden');
    checkBtn.disabled = true;
    applyBtn.disabled = true;

    const tick = () => {
        const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const seconds = (timeLeft % 60).toString().padStart(2, '0');
        timerDisplay.textContent = `${minutes}:${seconds}`;

        if (timeLeft <= 0) {
            clearInterval(countdownTimer);
            memorizationPhaseEnd();
            return;
        }
        timeLeft--;
    };

    tick(); // Call once immediately
    countdownTimer = setInterval(tick, 1000);
}

/**
 * Handles the transition from the memorization phase to the placement phase.
 */
function memorizationPhaseEnd() {
    messageArea.textContent = 'Time\'s up! Place the pieces now.';
    
    // Hide all pieces
    document.querySelectorAll('.square').forEach(sq => sq.innerHTML = '');
    
    // Enable user placement controls
    selectionAreaEl.classList.remove('hidden');
    checkBtn.disabled = false;
    applyBtn.disabled = false; // Allow re-start if needed
}

// --- User Interaction Handlers ---

/**
 * Handles the selection of a piece from the sidebar.
 * @param {Event} e - The click event.
 */
function handleSelectPiece(e) {
    document.querySelectorAll('.selectable-piece').forEach(p => p.classList.remove('selected'));
    
    const selectedPieceEl = e.currentTarget;
    const pieceType = selectedPieceEl.dataset.pieceType;

    if (activePieceType === pieceType) {
        // Deselect
        activePieceType = null;
    } else {
        // Select new piece
        activePieceType = pieceType;
        selectedPieceEl.classList.add('selected');
    }
}

/**
 * Handles the placement of a piece on the board.
 * @param {Event} e - The click event on a square.
 */
function handleSquareClick(e) {
    if (!isGameActive || !activePieceType) {
        messageArea.textContent = 'First, select a piece from the side!';
        return;
    }

    const squareEl = e.currentTarget;
    const squareId = squareEl.id;

    // Place the piece with color class
    const color = activePieceType.startsWith('w') ? 'white' : 'black';
    userPlacement[squareId] = activePieceType;
    squareEl.innerHTML = `<span class="piece ${color}">${PIECES[activePieceType]}</span>`;
    messageArea.textContent = `Placed ${activePieceType} on ${squareId}.`;
}

/**
 * Compares the user's placement with the correct placement and reveals the results.
 */
function checkAnswer() {
    if (!isGameActive) return;

    clearInterval(countdownTimer);
    isGameActive = false;
    checkBtn.disabled = true;
    applyBtn.disabled = false;

    let correctCount = 0;
    
    // 1. Check all correct placements
    correctPlacement.forEach(correctItem => {
        const { piece, squareId } = correctItem;
        const userPiece = userPlacement[squareId];
        const squareEl = document.getElementById(squareId);
        const color = piece.startsWith('w') ? 'white' : 'black';

        // a. Square has a piece and it's the correct piece
        if (userPiece === piece) {
            squareEl.classList.add('correct');
            squareEl.innerHTML = `<span class="piece ${color}">${PIECES[piece]}</span>`;
            correctCount++;
        } 
        // b. Square has a piece, but it's the wrong piece
        else if (userPiece) {
            squareEl.classList.add('incorrect');
            // Show the WRONG piece the user placed, but color the square red
        } 
        // c. Square is empty, but it should have had a piece
        else {
            squareEl.classList.add('incorrect');
            // Reveal the MISSING correct piece
            squareEl.innerHTML = `<span class="piece ${color}">${PIECES[piece]}</span>`;
        }
        delete userPlacement[squareId]; // Mark as checked
    });

    // 2. Check all remaining user placements (incorrectly placed pieces)
    for (const squareId in userPlacement) {
        const pieceType = userPlacement[squareId];
        const squareEl = document.getElementById(squareId);
        const color = pieceType.startsWith('w') ? 'white' : 'black';
        
        // This means the user placed a piece here, but nothing should have been here
        squareEl.classList.add('incorrect');
        squareEl.innerHTML = `<span class="piece ${color}">${PIECES[pieceType]}</span>`;
    }

    const total = correctPlacement.length;
    messageArea.textContent = `Game Over! You got ${correctCount} out of ${total} pieces correct!`;
    selectionAreaEl.classList.add('hidden');
}

// --- Event Listeners ---
applyBtn.addEventListener('click', initializeGame);
checkBtn.addEventListener('click', checkAnswer);

// --- Initial Setup on Load ---
document.addEventListener('DOMContentLoaded', () => {
    createBoard();
    createSelectionArea();
    //boardEl.classList.add('hidden'); // Hide board until start
});