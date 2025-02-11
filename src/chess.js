class ChessGame {
  constructor() {
    this.canvas = document.getElementById("chessboard");
    this.ctx = this.canvas.getContext("2d");
    this.boardSize = Math.min(window.innerWidth - 40, window.innerHeight - 200);
    this.squareSize = this.boardSize / 8;

    // Set canvas size
    this.canvas.width = this.boardSize;
    this.canvas.height = this.boardSize;

    // Initialize the board
    this.board = this.createInitialBoard();
    this.selectedPiece = null;
    this.currentPlayer = "white";

    // Bind event listeners with proper binding
    this.canvas.addEventListener("click", this.handleClick.bind(this));
    this.resetBtn = document.getElementById("resetBtn");
    this.undoBtn = document.getElementById("undoBtn");

    // Bind the methods to preserve 'this' context
    this.resetGame = this.resetGame.bind(this);
    this.undoMove = this.undoMove.bind(this);

    this.resetBtn.addEventListener("click", this.resetGame);
    this.undoBtn.addEventListener("click", this.undoMove);

    // Add tracking for pieces that have moved (for castling)
    this.movedPieces = new Set();

    this.isGameOver = false;

    // Add promotion state
    this.promotionChoice = null;
    this.pendingPromotion = null;

    // Add AI properties
    this.isAIEnabled = true;
    this.aiColor = "black";
    this.pieceValues = {
      pawn: 1,
      knight: 3.3,
      bishop: 3.3,
      rook: 5.1,
      queen: 9,
      king: 1000, // Effectively infinite value
    };

    // Update opening book with strong Black responses (using array coordinates)
    this.openings = [
      // Sicilian Defense
      {
        moves: ["6,4-4,4", "1,2-2,2"], // e2e4, c7c5
        name: "Sicilian Defense",
        evaluation: 0.8,
        description: "Sharp counter-attacking opening for Black",
      },
      // French Defense
      {
        moves: ["6,4-4,4", "1,4-2,4"], // e2e4, e7e6
        name: "French Defense",
        evaluation: 0.7,
        description: "Solid positional opening with counterattack potential",
      },
      // Caro-Kann Defense
      {
        moves: ["6,4-4,4", "1,2-2,2"], // e2e4, c7c6
        name: "Caro-Kann Defense",
        evaluation: 0.75,
        description: "Very solid defense with good counterplay",
      },
      // Scandinavian Defense
      {
        moves: ["6,4-4,4", "1,3-3,3"], // e2e4, d7d5
        name: "Scandinavian Defense",
        evaluation: 0.6,
        description: "Direct challenge to White's center",
      },
      // Nimzo-Indian Defense
      {
        moves: [
          "6,3-4,3",
          "1,6-2,6",
          "6,2-4,2",
          "1,4-2,4",
          "7,1-5,2",
          "0,5-2,3",
        ], // d2d4, Nf6, c2c4, e6, Nc3, Bb4
        name: "Nimzo-Indian Defense",
        evaluation: 0.85,
        description: "One of Black's most solid responses to 1.d4",
      },
      // King's Indian Defense
      {
        moves: ["6,3-4,3", "1,6-2,6", "6,2-4,2", "1,6-2,6"], // d2d4, Nf6, c2c4, g7g6
        name: "King's Indian Defense",
        evaluation: 0.8,
        description: "Dynamic counterattacking setup",
      },
    ];

    // Add opening-specific strategic plans
    this.openingPlans = {
      "Sicilian Defense": {
        centerControl: { squares: ["d5", "e5"], bonus: 0.3 },
        pieceDevelopment: ["c6", "d6", "e6"],
        counterplay: "queenside",
      },
      "French Defense": {
        pawnChain: ["e6", "d5"],
        lightSquaredBishop: "before_e7_pawn",
        counterplay: "center",
      },
      "Caro-Kann Defense": {
        pawnStructure: ["c6", "d5"],
        bishopDevelopment: "outside_pawn_chain",
        strategy: "solid_center",
      },
      // ... add more opening-specific plans
    };

    // Track game moves and opening success rates
    this.currentGameMoves = [];
    this.openingStats =
      JSON.parse(localStorage.getItem("chessOpeningStats")) || {};

    // Learning parameters
    this.learningRate = 0.1;
    this.positionWeights = {
      material: 1.0,
      center: 0.9, // Increased - AI showed strong preference for center control
      development: 0.8, // Increased - Early development was successful
      kingSafety: 0.85, // Slightly reduced - AI was perhaps too defensive
      pawnStructure: 0.7, // Increased - Pawn structure proved important
      mobility: 0.7, // Increased - Piece mobility was valuable
      castling: 0.6, // Unchanged - Balanced approach to castling
      openLines: 0.6, // Increased - Open files were valuable
      tempo: 0.5, // Increased - Tempo proved important
    };

    // Opening principles
    this.openingPrinciples = {
      centerControl: true,
      pieceDevelopment: true,
      kingSafety: true,
      pawnStructure: true,
    };

    // Add positional values for each piece type
    this.pieceSquareTables = {
      pawn: [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [20, 20, 25, 35, 35, 25, 20, 20], // Increased central pawn values
        [10, 10, 20, 35, 35, 20, 10, 10], // Higher value for d4/e4 pawns
        [5, 5, 10, 25, 25, 10, 5, 5],
        [0, 0, 5, 15, 15, 5, 0, 0], // Better protected pawns
        [5, 5, 5, -10, -10, 5, 5, 5],
        [0, 0, 0, 0, 0, 0, 0, 0],
      ],
      knight: [
        [-50, -40, -30, -30, -30, -30, -40, -50],
        [-40, -20, 0, 5, 5, 0, -20, -40],
        [-30, 5, 15, 20, 20, 15, 5, -30],
        [-30, 0, 20, 30, 30, 20, 0, -30], // Increased central knight value
        [-30, 0, 20, 25, 25, 20, 0, -30],
        [-30, 5, 15, 20, 20, 15, 5, -30],
        [-40, -20, 0, 5, 5, 0, -20, -40],
        [-50, -40, -30, -30, -30, -30, -40, -50],
      ],
      bishop: [
        [-20, -10, -10, -10, -10, -10, -10, -20],
        [-10, 5, 5, 5, 5, 5, 5, -10],
        [-10, 10, 10, 15, 15, 10, 10, -10],
        [-10, 5, 10, 15, 15, 10, 5, -10],
        [-10, 0, 15, 15, 15, 15, 0, -10],
        [-10, 10, 15, 15, 15, 15, 10, -10],
        [-10, 5, 0, 0, 0, 0, 5, -10],
        [-20, -10, -10, -10, -10, -10, -10, -20],
      ],
      queen: [
        [-20, -10, -10, -5, -5, -10, -10, -20],
        [-10, 0, 0, 0, 0, 0, 0, -10],
        [-10, 0, 5, 5, 5, 5, 0, -10],
        [-5, 0, 5, 5, 5, 5, 0, -5],
        [0, 0, 5, 5, 5, 5, 0, -5],
        [-10, 5, 5, 5, 5, 5, 0, -10],
        [-10, 0, 5, 0, 0, 0, 0, -10],
        [-20, -10, -10, -5, -5, -10, -10, -20],
      ],
      rook: [
        [0, 0, 0, 5, 5, 0, 0, 0],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [0, 0, 0, 0, 0, 0, 0, 0], // Better rook mobility
        [5, 5, 5, 5, 5, 5, 5, 5], // Preference for 7th rank
        [10, 10, 10, 10, 10, 10, 10, 10], // Strong preference for 7th rank
        [0, 0, 0, 5, 5, 0, 0, 0],
      ],
    };

    // Game history for learning
    this.moveHistory = [];

    // Add training data storage
    this.learningData = {
      openingSuccess: {}, // Track success of different openings
      piecePositionScores: {}, // Track successful piece positions
      materialTradeScores: {}, // Track successful material trades
      winningPatterns: {}, // Track winning position patterns
      gamesPlayed: 0,
    };

    // Load previously learned data if it exists
    const savedLearning = localStorage.getItem("chessAILearning");
    if (savedLearning) {
      this.learningData = JSON.parse(savedLearning);
    }

    // Add training button handler
    this.trainBtn = document.getElementById("trainBtn");
    this.trainBtn.addEventListener("click", this.startTraining.bind(this));

    // Strategic bonuses for specific positions
    this.strategicBonuses = {
      centralKnight: 0.4, // Increased - Knights in center were strong
      bishopPair: 0.5, // Unchanged - Already good
      rookOnOpenFile: 0.5, // Increased - Rooks on open files were strong
      connectedRooks: 0.4, // Increased - Connected rooks were valuable
      pawnChain: 0.3, // Increased - Pawn chains were important
      blockadingPawn: 0.3, // Unchanged
      fianchettoedBishop: 0.3,
      earlyQueenMove: -0.3, // New penalty for early queen development
      centralPawns: 0.4, // New bonus for central pawns
    };

    // Add evaluation for piece coordination
    this.pieceCoordination = {
      queenBishopBattery: 0.4, // Queen and bishop on same diagonal
      rooksBehindPassedPawn: 0.5, // Rooks supporting passed pawns
      knightsDefendingEachOther: 0.3,
    };

    // Draw the initial board
    this.draw();

    // Add game history tracking for learning
    this.currentGameHistory = [];

    // Add temperature control
    this.createTemperatureControl();
    this.temperature = 0.8; // Default temperature

    // Add AI mode control
    this.createAIModeControl();
    this.aiMode = "homegrown"; // Default to homegrown AI
    this.stockfish = null; // Will be initialized if stockfish mode is selected

    // Add game mode control
    this.createGameModeControl();
    this.gameMode = "humanVsAI"; // Default mode

    // Add draw detection properties
    this.movesSinceCaptureOrPawn = 0;
    this.positionHistory = new Map(); // For repetition detection

    this.isProcessingMove = false; // Add this flag
  }

  createInitialBoard() {
    const board = Array(8)
      .fill()
      .map(() => Array(8).fill(null));

    // Set up pawns
    for (let i = 0; i < 8; i++) {
      board[1][i] = { type: "pawn", color: "black" };
      board[6][i] = { type: "pawn", color: "white" };
    }

    // Set up other pieces
    const backRow = [
      "rook",
      "knight",
      "bishop",
      "queen",
      "king",
      "bishop",
      "knight",
      "rook",
    ];
    for (let i = 0; i < 8; i++) {
      board[0][i] = { type: backRow[i], color: "black" };
      board[7][i] = { type: backRow[i], color: "white" };
    }

    return board;
  }

  drawPiece(type, color, x, y) {
    const size = this.squareSize;
    const center = size / 2;
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = color === "white" ? "black" : "white";
    this.ctx.lineWidth = 2;

    switch (type) {
      case "pawn":
        // Base
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.3, y + size * 0.75);
        this.ctx.quadraticCurveTo(
          x + size * 0.5,
          y + size * 0.7,
          x + size * 0.7,
          y + size * 0.75
        );
        this.ctx.lineTo(x + size * 0.6, y + size * 0.5);
        this.ctx.lineTo(x + size * 0.4, y + size * 0.5);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        // Head
        this.ctx.beginPath();
        this.ctx.arc(
          x + size * 0.5,
          y + size * 0.35,
          size * 0.15,
          0,
          Math.PI * 2
        );
        this.ctx.fill();
        this.ctx.stroke();
        break;

      case "rook":
        // Base
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.3, y + size * 0.75);
        this.ctx.lineTo(x + size * 0.7, y + size * 0.75);
        this.ctx.lineTo(x + size * 0.65, y + size * 0.45);
        this.ctx.lineTo(x + size * 0.35, y + size * 0.45);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        // Top
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.3, y + size * 0.45);
        this.ctx.lineTo(x + size * 0.3, y + size * 0.25);
        this.ctx.lineTo(x + size * 0.4, y + size * 0.25);
        this.ctx.lineTo(x + size * 0.4, y + size * 0.35);
        this.ctx.lineTo(x + size * 0.6, y + size * 0.35);
        this.ctx.lineTo(x + size * 0.6, y + size * 0.25);
        this.ctx.lineTo(x + size * 0.7, y + size * 0.25);
        this.ctx.lineTo(x + size * 0.7, y + size * 0.45);
        this.ctx.fill();
        this.ctx.stroke();
        break;

      case "knight":
        // Base
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.3, y + size * 0.75);
        this.ctx.lineTo(x + size * 0.7, y + size * 0.75);
        this.ctx.lineTo(x + size * 0.65, y + size * 0.6);
        this.ctx.lineTo(x + size * 0.35, y + size * 0.6);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        // Head
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.35, y + size * 0.6);
        this.ctx.lineTo(x + size * 0.4, y + size * 0.3);
        this.ctx.quadraticCurveTo(
          x + size * 0.45,
          y + size * 0.25,
          x + size * 0.5,
          y + size * 0.25
        );
        this.ctx.quadraticCurveTo(
          x + size * 0.6,
          y + size * 0.3,
          x + size * 0.65,
          y + size * 0.35
        );
        this.ctx.quadraticCurveTo(
          x + size * 0.7,
          y + size * 0.4,
          x + size * 0.65,
          y + size * 0.6
        );
        this.ctx.fill();
        this.ctx.stroke();
        // Ear
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.4, y + size * 0.3);
        this.ctx.quadraticCurveTo(
          x + size * 0.35,
          y + size * 0.2,
          x + size * 0.45,
          y + size * 0.25
        );
        this.ctx.fill();
        this.ctx.stroke();
        break;

      case "bishop":
        // Base
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.3, y + size * 0.75);
        this.ctx.quadraticCurveTo(
          x + size * 0.5,
          y + size * 0.7,
          x + size * 0.7,
          y + size * 0.75
        );
        this.ctx.lineTo(x + size * 0.6, y + size * 0.5);
        this.ctx.lineTo(x + size * 0.4, y + size * 0.5);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        // Head
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.4, y + size * 0.5);
        this.ctx.quadraticCurveTo(
          x + size * 0.5,
          y + size * 0.45,
          x + size * 0.5,
          y + size * 0.25
        );
        this.ctx.quadraticCurveTo(
          x + size * 0.5,
          y + size * 0.45,
          x + size * 0.6,
          y + size * 0.5
        );
        this.ctx.fill();
        this.ctx.stroke();
        // Slash
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.4, y + size * 0.35);
        this.ctx.lineTo(x + size * 0.6, y + size * 0.35);
        this.ctx.stroke();
        break;

      case "queen":
        // Base
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.3, y + size * 0.75);
        this.ctx.quadraticCurveTo(
          x + size * 0.5,
          y + size * 0.7,
          x + size * 0.7,
          y + size * 0.75
        );
        this.ctx.lineTo(x + size * 0.6, y + size * 0.5);
        this.ctx.lineTo(x + size * 0.4, y + size * 0.5);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        // Crown
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.3, y + size * 0.5);
        this.ctx.lineTo(x + size * 0.3, y + size * 0.3);
        this.ctx.quadraticCurveTo(
          x + size * 0.5,
          y + size * 0.2,
          x + size * 0.7,
          y + size * 0.3
        );
        this.ctx.lineTo(x + size * 0.7, y + size * 0.5);
        this.ctx.fill();
        this.ctx.stroke();
        // Points
        for (let i = 0; i < 3; i++) {
          this.ctx.beginPath();
          this.ctx.arc(
            x + size * (0.35 + i * 0.15),
            y + size * 0.25,
            size * 0.05,
            0,
            Math.PI * 2
          );
          this.ctx.fill();
          this.ctx.stroke();
        }
        break;

      case "king":
        // Base
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.3, y + size * 0.75);
        this.ctx.quadraticCurveTo(
          x + size * 0.5,
          y + size * 0.7,
          x + size * 0.7,
          y + size * 0.75
        );
        this.ctx.lineTo(x + size * 0.6, y + size * 0.5);
        this.ctx.lineTo(x + size * 0.4, y + size * 0.5);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        // Crown
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.35, y + size * 0.5);
        this.ctx.lineTo(x + size * 0.35, y + size * 0.3);
        this.ctx.lineTo(x + size * 0.65, y + size * 0.3);
        this.ctx.lineTo(x + size * 0.65, y + size * 0.5);
        this.ctx.fill();
        this.ctx.stroke();
        // Cross
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.5, y + size * 0.15);
        this.ctx.lineTo(x + size * 0.5, y + size * 0.35);
        this.ctx.moveTo(x + size * 0.4, y + size * 0.25);
        this.ctx.lineTo(x + size * 0.6, y + size * 0.25);
        this.ctx.stroke();
        break;
    }
  }

  draw() {
    // Draw board
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        this.ctx.fillStyle = isLight ? "#FFFFFF" : "#769656";
        this.ctx.fillRect(
          col * this.squareSize,
          row * this.squareSize,
          this.squareSize,
          this.squareSize
        );

        // Draw piece if one exists at this position
        const piece = this.board[row][col];
        if (piece) {
          this.drawPiece(
            piece.type,
            piece.color,
            col * this.squareSize,
            row * this.squareSize
          );
        }
      }
    }

    // Highlight selected piece if any
    if (this.selectedPiece) {
      const { row, col } = this.selectedPiece;
      this.ctx.strokeStyle = "#ff0000";
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(
        col * this.squareSize,
        row * this.squareSize,
        this.squareSize,
        this.squareSize
      );
    }
  }

  handleClick(event) {
    if (this.isGameOver || this.pendingPromotion) return;

    // In AI vs AI or homegrownVsStockfish mode, ignore clicks
    if (this.gameMode === "AIvsAI" || this.gameMode === "homegrownVsStockfish")
      return;

    // In Human vs AI mode, only allow clicks during human's turn
    if (this.gameMode === "humanVsAI" && this.currentPlayer === this.aiColor)
      return;

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const col = Math.floor(x / this.squareSize);
    const row = Math.floor(y / this.squareSize);

    const clickedPiece = this.board[row][col];

    if (this.selectedPiece) {
      // If clicking the same piece, deselect it
      if (row === this.selectedPiece.row && col === this.selectedPiece.col) {
        this.selectedPiece = null;
        this.draw();
        return;
      }

      // Try to move the selected piece
      if (
        this.isValidMove(
          this.selectedPiece.row,
          this.selectedPiece.col,
          row,
          col
        )
      ) {
        this.movePiece(
          this.selectedPiece.row,
          this.selectedPiece.col,
          row,
          col
        );
        this.selectedPiece = null;
      } else {
        // If clicking a different piece of same color, select that piece instead
        if (clickedPiece && clickedPiece.color === this.currentPlayer) {
          this.selectedPiece = { row, col };
        } else {
          this.selectedPiece = null;
        }
      }
    } else {
      // Select a piece
      if (clickedPiece && clickedPiece.color === this.currentPlayer) {
        this.selectedPiece = { row, col };
      }
    }
    this.draw();
  }

  isValidMove(fromRow, fromCol, toRow, toCol, checkForCheck = true) {
    // Add boundary check
    if (toRow < 0 || toRow >= 8 || toCol < 0 || toCol >= 8) {
      return false;
    }

    const piece = this.board[fromRow][fromCol];
    const targetSquare = this.board[toRow][toCol];

    // Basic validation
    if (!piece) return false;

    // Can't move to the same square
    if (fromRow === toRow && fromCol === toCol) return false;

    // Can capture opponent's pieces but not your own
    if (targetSquare && targetSquare.color === piece.color) {
      return false;
    }

    // Check piece-specific move rules
    let validPieceMove = false;
    switch (piece.type) {
      case "pawn":
        validPieceMove = this.isValidPawnMove(fromRow, fromCol, toRow, toCol);
        break;
      case "rook":
        validPieceMove = this.isValidRookMove(fromRow, fromCol, toRow, toCol);
        break;
      case "knight":
        validPieceMove = this.isValidKnightMove(fromRow, fromCol, toRow, toCol);
        break;
      case "bishop":
        validPieceMove = this.isValidBishopMove(fromRow, fromCol, toRow, toCol);
        break;
      case "queen":
        validPieceMove = this.isValidQueenMove(fromRow, fromCol, toRow, toCol);
        break;
      case "king":
        // Check for castling
        if (Math.abs(toCol - fromCol) === 2 && fromRow === toRow) {
          validPieceMove = this.isValidCastling(fromRow, fromCol, toRow, toCol);
        } else {
          validPieceMove =
            Math.abs(toRow - fromRow) <= 1 && Math.abs(toCol - fromCol) <= 1;
        }
        break;
    }

    if (!validPieceMove) return false;

    // If we're checking for check
    if (checkForCheck) {
      // Make temporary move
      const originalTarget = this.board[toRow][toCol];
      this.board[toRow][toCol] = piece;
      this.board[fromRow][fromCol] = null;

      // Check if move puts/leaves own king in check
      const inCheck = this.isInCheck(piece.color);

      // Undo move
      this.board[fromRow][fromCol] = piece;
      this.board[toRow][toCol] = originalTarget;

      if (inCheck) return false;
    }

    return true;
  }

  isValidPawnMove(fromRow, fromCol, toRow, toCol) {
    const piece = this.board[fromRow][fromCol];
    const direction = piece.color === "white" ? -1 : 1;
    const startRow = piece.color === "white" ? 6 : 1;

    // Forward movement
    if (fromCol === toCol) {
      // One square forward
      if (toRow === fromRow + direction && !this.board[toRow][toCol]) {
        return true;
      }
      // Two squares forward from starting position
      if (
        fromRow === startRow &&
        toRow === fromRow + 2 * direction &&
        !this.board[fromRow + direction][fromCol] &&
        !this.board[toRow][toCol]
      ) {
        return true;
      }
    }
    // Diagonal capture
    if (Math.abs(toCol - fromCol) === 1 && toRow === fromRow + direction) {
      return (
        this.board[toRow][toCol] &&
        this.board[toRow][toCol].color !== piece.color
      );
    }
    return false;
  }

  isValidRookMove(fromRow, fromCol, toRow, toCol) {
    // Rook moves horizontally or vertically
    if (fromRow !== toRow && fromCol !== toCol) return false;
    return !this.isPathBlocked(fromRow, fromCol, toRow, toCol);
  }

  isValidKnightMove(fromRow, fromCol, toRow, toCol) {
    // Knight moves in L-shape
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
  }

  isValidBishopMove(fromRow, fromCol, toRow, toCol) {
    // Bishop moves diagonally
    if (Math.abs(toRow - fromRow) !== Math.abs(toCol - fromCol)) return false;
    return !this.isPathBlocked(fromRow, fromCol, toRow, toCol);
  }

  isValidQueenMove(fromRow, fromCol, toRow, toCol) {
    // Queen moves like rook or bishop
    if (
      fromRow === toRow ||
      fromCol === toCol ||
      Math.abs(toRow - fromRow) === Math.abs(toCol - fromCol)
    ) {
      return !this.isPathBlocked(fromRow, fromCol, toRow, toCol);
    }
    return false;
  }

  isValidCastling(fromRow, fromCol, toRow, toCol) {
    const piece = this.board[fromRow][fromCol];
    if (!piece || piece.type !== "king") return false;

    // Check if this specific king has moved
    if (this.movedPieces.has(`${piece.color}_king`)) return false;

    const isKingside = toCol > fromCol;
    const rookCol = isKingside ? 7 : 0;

    // Check the specific rook that would be involved in castling
    const rook = this.board[fromRow][rookCol];
    if (!rook || rook.type !== "rook" || rook.color !== piece.color)
      return false;

    // Check if this specific rook has moved
    const rookKey = `${piece.color}_rook_${
      isKingside ? "kingside" : "queenside"
    }`;
    if (this.movedPieces.has(rookKey)) return false;

    // Check if path is clear
    const direction = isKingside ? 1 : -1;
    for (let col = fromCol + direction; col !== rookCol; col += direction) {
      if (this.board[fromRow][col]) return false;
    }

    // Check if king is in check or passes through check
    for (let col = fromCol; col !== toCol + direction; col += direction) {
      if (this.isSquareUnderAttack(fromRow, col, piece.color)) return false;
    }

    return true;
  }

  isSquareUnderAttack(row, col, playerColor, checkKing = true) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && piece.color !== playerColor) {
          // For pawns, check diagonal attacks specifically
          if (piece.type === "pawn") {
            const direction = piece.color === "white" ? -1 : 1;
            if (r + direction === row && (c + 1 === col || c - 1 === col)) {
              return true;
            }
            continue;
          }

          // For kings, only check one square radius without recursion
          if (piece.type === "king") {
            const rowDiff = Math.abs(row - r);
            const colDiff = Math.abs(col - c);
            if (rowDiff <= 1 && colDiff <= 1) {
              return true;
            }
            continue;
          }

          // For other pieces, use basic move validation
          if (this.isValidPieceMove(r, c, row, col, piece.type)) {
            if (!this.isPathBlocked(r, c, row, col)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  isPathBlocked(fromRow, fromCol, toRow, toCol) {
    // If it's a knight move, no need to check path
    if (
      (Math.abs(toRow - fromRow) === 2 && Math.abs(toCol - fromCol) === 1) ||
      (Math.abs(toRow - fromRow) === 1 && Math.abs(toCol - fromCol) === 2)
    ) {
      return false;
    }

    const rowDir =
      fromRow === toRow ? 0 : (toRow - fromRow) / Math.abs(toRow - fromRow);
    const colDir =
      fromCol === toCol ? 0 : (toCol - fromCol) / Math.abs(toCol - fromCol);

    let row = fromRow + rowDir;
    let col = fromCol + colDir;

    // Check each square between start and end positions
    while (
      row >= 0 &&
      row < 8 &&
      col >= 0 &&
      col < 8 &&
      (row !== toRow || col !== toCol)
    ) {
      if (this.board[row][col]) {
        return true; // Path is blocked
      }
      row += rowDir;
      col += colDir;
    }

    return false;
  }

  movePiece(fromRow, fromCol, toRow, toCol) {
    // Record position before move
    const positionBefore = this.recordPosition();
    const piece = this.board[fromRow][fromCol];

    const isCastling = piece.type === "king" && Math.abs(toCol - fromCol) === 2;

    // Track specific piece movements
    if (piece.type === "king") {
      this.movedPieces.add(`${piece.color}_king`);
    } else if (piece.type === "rook") {
      const side = fromCol === 0 ? "queenside" : "kingside";
      this.movedPieces.add(`${piece.color}_rook_${side}`);
    }

    // Handle castling
    if (isCastling) {
      const isKingside = toCol > fromCol;
      const rookFromCol = isKingside ? 7 : 0;
      const rookToCol = isKingside ? 5 : 3;
      this.board[toRow][rookToCol] = this.board[fromRow][rookFromCol];
      this.board[fromRow][rookFromCol] = null;
    }

    // Move the piece
    this.board[toRow][toCol] = piece;
    this.board[fromRow][fromCol] = null;

    // Check for pawn promotion
    if (piece.type === "pawn" && (toRow === 0 || toRow === 7)) {
      if (piece.color === this.aiColor) {
        // AI chooses best promotion piece
        const bestPromotion = this.chooseBestPromotion(toRow, toCol);
        this.board[toRow][toCol] = { type: bestPromotion, color: piece.color };
      } else {
        // Human player gets to choose
        this.pendingPromotion = { row: toRow, col: toCol, color: piece.color };
        this.showPromotionDialog(toRow, toCol);
        return;
      }
    }

    // Record the move for learning
    this.currentGameHistory.push({
      position: positionBefore,
      move: { fromRow, fromCol, toRow, toCol, piece },
      evaluation: this.evaluatePosition(piece.color),
    });

    // Check for checkmate before changing turns
    const opponentColor = piece.color === "white" ? "black" : "white";
    const inCheck = this.isInCheck(opponentColor);

    if (inCheck) {
      if (this.isCheckmate(opponentColor)) {
        this.isGameOver = true;
        const winner = piece.color;
        this.learnFromHumanGame(winner);
        this.updateStatus(true, piece.color);
        return;
      } else {
        this.updateStatus(false, opponentColor);
      }
    }

    // Change turns
    this.currentPlayer = opponentColor;
    this.updateStatus();

    // Modify AI move trigger based on game mode
    if (!this.isGameOver && !this.pendingPromotion) {
      if (this.gameMode === "AIvsAI") {
        // Both players are AI
        setTimeout(() => this.makeAIMove(), 250);
      } else if (
        this.gameMode === "humanVsAI" &&
        this.currentPlayer === this.aiColor
      ) {
        // Only make AI move in human vs AI mode when it's AI's turn
        setTimeout(() => this.makeAIMove(), 250);
      }
    }

    // Update fifty-move rule counter
    if (piece.type === "pawn" || this.board[toRow][toCol]) {
      this.movesSinceCaptureOrPawn = 0;
    } else {
      this.movesSinceCaptureOrPawn++;
    }

    // Update position history for repetition detection
    const positionAfter = this.recordPosition();
    this.positionHistory.set(
      positionAfter,
      (this.positionHistory.get(positionAfter) || 0) + 1
    );

    // Check for draws before changing turns
    if (this.checkForDraw()) {
      return;
    }
  }

  checkForDraw() {
    if (this.isStalemate(this.currentPlayer)) {
      this.isGameOver = true;
      this.updateStatus(false, null, "Draw by stalemate");
      return true;
    }

    if (this.isInsufficientMaterial()) {
      this.isGameOver = true;
      this.updateStatus(false, null, "Draw by insufficient material");
      return true;
    }

    if (this.isThreefoldRepetition()) {
      this.isGameOver = true;
      this.updateStatus(false, null, "Draw by repetition");
      return true;
    }

    if (this.isFiftyMoveRule()) {
      this.isGameOver = true;
      this.updateStatus(false, null, "Draw by fifty-move rule");
      return true;
    }

    return false;
  }

  isStalemate(color) {
    // If the king is in check, it's not stalemate
    if (this.isInCheck(color)) return false;

    // Check if the player has any legal moves
    for (let fromRow = 0; fromRow < 8; fromRow++) {
      for (let fromCol = 0; fromCol < 8; fromCol++) {
        const piece = this.board[fromRow][fromCol];
        if (piece && piece.color === color) {
          for (let toRow = 0; toRow < 8; toRow++) {
            for (let toCol = 0; toCol < 8; toCol++) {
              if (this.isValidMove(fromRow, fromCol, toRow, toCol)) {
                return false;
              }
            }
          }
        }
      }
    }
    return true;
  }

  isInsufficientMaterial() {
    let pieces = {
      white: { count: 0, bishops: [], knights: 0 },
      black: { count: 0, bishops: [], knights: 0 },
    };

    // Count pieces
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.type !== "king") {
          pieces[piece.color].count++;
          if (piece.type === "bishop") {
            pieces[piece.color].bishops.push((row + col) % 2); // Store bishop square color
          } else if (piece.type === "knight") {
            pieces[piece.color].knights++;
          }
        }
      }
    }

    // King vs King
    if (pieces.white.count === 0 && pieces.black.count === 0) return true;

    // King vs King and Bishop
    if (
      (pieces.white.count === 0 &&
        pieces.black.count === 1 &&
        pieces.black.bishops.length === 1) ||
      (pieces.black.count === 0 &&
        pieces.white.count === 1 &&
        pieces.white.bishops.length === 1)
    )
      return true;

    // King vs King and Knight
    if (
      (pieces.white.count === 0 &&
        pieces.black.count === 1 &&
        pieces.black.knights === 1) ||
      (pieces.black.count === 0 &&
        pieces.white.count === 1 &&
        pieces.white.knights === 1)
    )
      return true;

    // King and Bishop vs King and Bishop (same colored bishops)
    if (
      pieces.white.count === 1 &&
      pieces.black.count === 1 &&
      pieces.white.bishops.length === 1 &&
      pieces.black.bishops.length === 1 &&
      pieces.white.bishops[0] === pieces.black.bishops[0]
    )
      return true;

    return false;
  }

  isThreefoldRepetition() {
    const currentPosition = this.recordPosition();
    const count = this.positionHistory.get(currentPosition) || 0;
    return count >= 2; // Position has appeared 3 times (including current position)
  }

  isFiftyMoveRule() {
    return this.movesSinceCaptureOrPawn >= 100; // 50 moves = 100 half-moves
  }

  chooseBestPromotion(row, col) {
    const promotionPieces = ["queen", "knight", "rook", "bishop"];
    let bestScore = -Infinity;
    let bestPiece = "queen"; // Default to queen
    const originalPiece = this.board[row][col];

    for (const pieceType of promotionPieces) {
      // Try each piece type
      this.board[row][col] = { type: pieceType, color: this.aiColor };

      let score = this.evaluatePosition(this.aiColor);

      // Add heavy bonus for queen
      if (pieceType === "queen") {
        score += 50; // Large bonus for queen promotion
      }

      // Only consider knight if there's an immediate fork opportunity
      if (pieceType === "knight") {
        if (this.canFork(row, col)) {
          score += 60; // Only exceed queen's bonus if fork is possible
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestPiece = pieceType;
      }

      // Restore original piece for next evaluation
      this.board[row][col] = originalPiece;
    }

    return bestPiece;
  }

  canFork(row, col) {
    const piece = this.board[row][col];
    if (!piece || piece.type !== "knight") return false;

    let attackedPieces = 0;
    const directions = [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ];

    for (const [dRow, dCol] of directions) {
      const newRow = row + dRow;
      const newCol = col + dCol;

      if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
        const targetPiece = this.board[newRow][newCol];
        if (
          targetPiece &&
          targetPiece.color !== piece.color &&
          (targetPiece.type === "king" ||
            targetPiece.type === "queen" ||
            targetPiece.type === "rook")
        ) {
          attackedPieces++;
        }
      }
    }

    return attackedPieces >= 2;
  }

  findKing(color) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.type === "king" && piece.color === color) {
          return { row, col };
        }
      }
    }
  }

  isInCheck(color) {
    const kingPos = this.findKing(color);
    if (!kingPos) return false;

    // Check if any opponent's piece can attack the king
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.color !== color) {
          // For pawns, check diagonal attacks specifically
          if (piece.type === "pawn") {
            const direction = piece.color === "white" ? -1 : 1;
            if (
              row + direction === kingPos.row &&
              (col + 1 === kingPos.col || col - 1 === kingPos.col)
            ) {
              return true;
            }
            continue;
          }

          // For other pieces, check if they can attack the king's square
          if (
            this.isValidPieceMove(
              row,
              col,
              kingPos.row,
              kingPos.col,
              piece.type
            ) &&
            !this.isPathBlocked(row, col, kingPos.row, kingPos.col)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // New helper method to check piece-specific moves without recursion
  isValidPieceMove(fromRow, fromCol, toRow, toCol, pieceType) {
    switch (pieceType) {
      case "pawn":
        return this.isValidPawnMove(fromRow, fromCol, toRow, toCol);
      case "rook":
        return fromRow === toRow || fromCol === toCol;
      case "knight":
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);
        return (
          (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2)
        );
      case "bishop":
        return Math.abs(toRow - fromRow) === Math.abs(toCol - fromCol);
      case "queen":
        return (
          fromRow === toRow ||
          fromCol === toCol ||
          Math.abs(toRow - fromRow) === Math.abs(toCol - fromCol)
        );
      case "king":
        return Math.abs(toRow - fromRow) <= 1 && Math.abs(toCol - fromCol) <= 1;
      default:
        return false;
    }
  }

  isCheckmate(color) {
    // If not in check, it's not checkmate
    if (!this.isInCheck(color)) return false;

    // Try all possible moves for all pieces
    for (let fromRow = 0; fromRow < 8; fromRow++) {
      for (let fromCol = 0; fromCol < 8; fromCol++) {
        const piece = this.board[fromRow][fromCol];
        if (piece && piece.color === color) {
          for (let toRow = 0; toRow < 8; toRow++) {
            for (let toCol = 0; toCol < 8; toCol++) {
              if (this.isValidMove(fromRow, fromCol, toRow, toCol)) {
                return false; // Found a legal move
              }
            }
          }
        }
      }
    }
    return true; // No legal moves found
  }

  resetGame() {
    // Clear the board
    this.board = this.createInitialBoard();
    this.currentPlayer = "white";
    this.selectedPiece = null;
    this.movedPieces.clear();
    this.isGameOver = false;
    this.currentGameMoves = [];

    // Update UI
    this.updateStatus();
    this.draw();

    // Clear game history
    this.currentGameHistory = [];

    // If in AI vs AI mode, start the game automatically
    if (this.gameMode === "AIvsAI") {
      setTimeout(() => this.makeAIMove(), 250);
    }
  }

  undoMove() {
    // TODO: Implement undo functionality
  }

  updateStatus(isCheckmate = false, winner = null, drawReason = null) {
    const statusDiv = document.getElementById("status"); // Changed from "gameStatus" to "status"
    if (!statusDiv) return;

    if (this.isGameOver) {
      // Add check for game over state
      if (isCheckmate) {
        statusDiv.textContent = `Game Over - ${winner.toUpperCase()} wins by checkmate!`;
      } else if (drawReason) {
        statusDiv.textContent = `Game Over - ${drawReason}`;
      } else {
        statusDiv.textContent = `Game Over`;
      }

      // Learn from the game when it ends
      if (winner) {
        this.learnFromHumanGame(winner);
      }
    } else if (this.isInCheck(this.currentPlayer)) {
      statusDiv.textContent = `${this.currentPlayer.toUpperCase()} is in check!`;
    } else {
      statusDiv.textContent = `${this.currentPlayer.toUpperCase()}'s turn`;
    }
  }

  showPromotionDialog(row, col) {
    const promotionDiv = document.createElement("div");
    promotionDiv.className = "promotion-dialog";
    promotionDiv.style.position = "absolute";

    // Position the dialog near the promotion square
    const rect = this.canvas.getBoundingClientRect();
    promotionDiv.style.left = `${rect.left + col * this.squareSize}px`;
    promotionDiv.style.top = `${rect.top + row * this.squareSize}px`;

    const pieces = ["queen", "rook", "bishop", "knight"];
    pieces.forEach((piece) => {
      const button = document.createElement("button");
      button.textContent = piece.charAt(0).toUpperCase();
      button.onclick = () => this.promotePawn(piece);
      promotionDiv.appendChild(button);
    });

    document.body.appendChild(promotionDiv);
  }

  promotePawn(pieceType) {
    if (!this.pendingPromotion) return;

    // Remove promotion dialog
    const dialog = document.querySelector(".promotion-dialog");
    if (dialog) dialog.remove();

    // Promote the pawn
    const { row, col, color } = this.pendingPromotion;
    this.board[row][col] = { type: pieceType, color: color };

    // Clear promotion state
    this.pendingPromotion = null;

    // Change turns
    this.currentPlayer = this.currentPlayer === "white" ? "black" : "white";
    this.updateStatus();
    this.draw();
  }

  // Add these new methods for AI

  async makeAIMove() {
    if (this.isGameOver || this.pendingPromotion) return;

    // Handle modes
    if (this.gameMode !== "AIvsAI" && this.currentPlayer !== this.aiColor)
      return;

    if (this.aiMode === "stockfish" && this.stockfish) {
      const fen = this.boardToFEN();
      this.stockfish.postMessage(`position fen ${fen}`);
      this.stockfish.postMessage("go movetime 1000");
    } else {
      const move = this.findBestMove();
      if (move) {
        await this.movePiece(
          move.fromRow,
          move.fromCol,
          move.toRow,
          move.toCol
        );
        this.draw();
      }
    }
  }

  // Helper method to convert board to FEN notation
  boardToFEN() {
    let fen = "";
    for (let row = 0; row < 8; row++) {
      let emptyCount = 0;
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece) {
          if (emptyCount > 0) {
            fen += emptyCount;
            emptyCount = 0;
          }
          let pieceChar = piece.type[0];
          if (piece.type === "knight") pieceChar = "n";
          fen += piece.color === "white" ? pieceChar.toUpperCase() : pieceChar;
        } else {
          emptyCount++;
        }
      }
      if (emptyCount > 0) {
        fen += emptyCount;
      }
      if (row < 7) fen += "/";
    }

    // Add current player
    fen += ` ${this.currentPlayer[0]}`;

    // Add castling availability (simplified)
    fen += " KQkq";

    // Add en passant target (simplified)
    fen += " -";

    // Add halfmove clock and fullmove number
    fen += " 0 1";

    return fen;
  }

  findBestMove() {
    // First, check if we're in the opening phase (first 10 moves)
    if (this.currentGameMoves.length < 10) {
      const openingMove = this.findBestOpeningMove();
      if (openingMove) {
        console.log("Playing opening move:", openingMove);
        return openingMove;
      }
    }

    let validMoves = [];

    // First, collect all valid moves
    for (let fromRow = 0; fromRow < 8; fromRow++) {
      for (let fromCol = 0; fromCol < 8; fromCol++) {
        const piece = this.board[fromRow][fromCol];
        if (piece && piece.color === this.aiColor) {
          for (let toRow = 0; toRow < 8; toRow++) {
            for (let toCol = 0; toCol < 8; toCol++) {
              if (this.isValidMove(fromRow, fromCol, toRow, toCol)) {
                // Make temporary move
                const originalTarget = this.board[toRow][toCol];
                this.board[toRow][toCol] = piece;
                this.board[fromRow][fromCol] = null;

                // Evaluate position
                const score = this.evaluatePosition(this.aiColor);

                // Undo move
                this.board[fromRow][fromCol] = piece;
                this.board[toRow][toCol] = originalTarget;

                validMoves.push({
                  fromRow,
                  fromCol,
                  toRow,
                  toCol,
                  piece,
                  score,
                });
              }
            }
          }
        }
      }
    }

    if (validMoves.length === 0) {
      return null;
    }

    // Apply temperature to move selection
    const moveScores = validMoves.map((move) => ({
      move,
      probability: Math.exp(move.score / this.temperature),
    }));

    // Calculate total probability
    const totalProbability = moveScores.reduce(
      (sum, item) => sum + item.probability,
      0
    );

    // Select move based on weighted probability
    let randomValue = Math.random() * totalProbability;
    let selectedMove = null;

    for (const item of moveScores) {
      randomValue -= item.probability;
      if (randomValue <= 0) {
        selectedMove = item.move;
        break;
      }
    }

    // Fallback to best move if something went wrong
    if (!selectedMove) {
      selectedMove = validMoves.reduce((best, current) =>
        current.score > best.score ? current : best
      );
    }

    console.log("Move selection (temperature:", this.temperature, ")");
    console.log("Total moves considered:", validMoves.length);
    console.log(
      "Move probabilities:",
      moveScores.map((m) => ({
        from: `${m.move.fromRow},${m.move.fromCol}`,
        to: `${m.move.toRow},${m.move.toCol}`,
        piece: m.move.piece.type,
        score: m.move.score,
        probability:
          ((m.probability / totalProbability) * 100).toFixed(2) + "%",
      }))
    );
    console.log("Selected move:", selectedMove);

    return selectedMove;
  }

  findBestOpeningMove() {
    // Get the current sequence of moves
    const currentMoveSequence = this.currentGameMoves.map(
      (move) => `${move.fromRow},${move.fromCol}-${move.toRow},${move.toCol}`
    );

    // Find matching openings
    const matchingOpenings = this.openings.filter((opening) => {
      // Check if current moves match the start of this opening
      for (let i = 0; i < currentMoveSequence.length; i++) {
        if (opening.moves[i] !== currentMoveSequence[i]) {
          return false;
        }
      }
      return true;
    });

    if (matchingOpenings.length > 0) {
      const nextMoveIndex = currentMoveSequence.length; // Define nextMoveIndex here

      // Only play Black's moves from the opening book
      if (nextMoveIndex % 2 === 1) {
        // Index 1, 3, 5, etc. are Black's moves
        // Apply temperature to opening selection
        const openingScores = matchingOpenings.map((opening) => ({
          opening,
          score: Math.exp(opening.evaluation / this.temperature), // Use temperature from UI
        }));

        // Calculate total score for probability distribution
        const totalScore = openingScores.reduce(
          (sum, item) => sum + item.score,
          0
        );

        // Select opening based on weighted probability
        let randomValue = Math.random() * totalScore;
        let selectedOpening = null;

        for (const item of openingScores) {
          randomValue -= item.score;
          if (randomValue <= 0) {
            selectedOpening = item.opening;
            break;
          }
        }

        // Fallback to highest rated if something went wrong
        if (!selectedOpening) {
          selectedOpening = matchingOpenings[0];
        }

        if (selectedOpening.moves[nextMoveIndex]) {
          // Parse the move coordinates
          const [from, to] = selectedOpening.moves[nextMoveIndex].split("-");
          const [fromRow, fromCol] = from.split(",").map(Number);
          const [toRow, toCol] = to.split(",").map(Number);

          // Verify this is a valid move
          if (this.isValidMove(fromRow, fromCol, toRow, toCol)) {
            console.log(
              `Playing ${selectedOpening.name} (${selectedOpening.evaluation}): ${selectedOpening.description}`
            );
            return {
              fromRow,
              fromCol,
              toRow,
              toCol,
              piece: this.board[fromRow][fromCol],
            };
          }
        }
      }
    }

    return null;
  }

  // Add method to convert algebraic notation to coordinates
  convertAlgebraicMove(algebraicMove) {
    const fromCol = algebraicMove[0].charCodeAt(0) - "a".charCodeAt(0);
    const fromRow = 8 - parseInt(algebraicMove[1]);
    const toCol = algebraicMove[2].charCodeAt(0) - "a".charCodeAt(0);
    const toRow = 8 - parseInt(algebraicMove[3]);

    return {
      fromRow,
      fromCol,
      toRow,
      toCol,
    };
  }

  evaluatePosition(color) {
    let score = 0;

    // Material evaluation
    score += this.evaluateMaterial(color) * this.positionWeights.material;

    // Find kings
    const friendlyKing = this.findKing(color);
    const enemyKing = this.findKing(color === "white" ? "black" : "white");

    if (!friendlyKing || !enemyKing) return score;

    // Check for potential checkmate patterns
    const checkmateScore = this.evaluateCheckmatePatterns(color, enemyKing);
    if (checkmateScore > 0) {
      score += checkmateScore * 10; // Heavily prioritize checkmate opportunities
    }

    // Rest of existing evaluation...
    return color === "white" ? score : -score;
  }

  evaluateCheckmatePatterns(color, enemyKing) {
    let score = 0;

    // Back-rank mate pattern
    if (this.canBackRankMate(color, enemyKing)) {
      score += 5;
    }

    // Queen and knight mate pattern
    if (this.canQueenKnightMate(color, enemyKing)) {
      score += 4;
    }

    // Two bishops mate pattern
    if (this.canTwoBishopsMate(color, enemyKing)) {
      score += 4;
    }

    // Smothered mate pattern
    if (this.canSmotheredMate(color, enemyKing)) {
      score += 6;
    }

    // Anastasia's mate pattern
    if (this.canAnastasiasMate(color, enemyKing)) {
      score += 5;
    }

    return score;
  }

  canBackRankMate(color, enemyKing) {
    // Check if enemy king is on back rank
    const backRank = enemyKing.color === "white" ? 7 : 0;
    if (enemyKing.row !== backRank) return false;

    // Check if king is trapped by own pawns
    const pawnRow = enemyKing.color === "white" ? 6 : 1;
    for (
      let col = Math.max(0, enemyKing.col - 1);
      col <= Math.min(7, enemyKing.col + 1);
      col++
    ) {
      const piece = this.board[pawnRow][col];
      if (!piece || piece.type !== "pawn" || piece.color !== enemyKing.color) {
        return false;
      }
    }

    // Check if we have a rook or queen that can deliver mate
    for (let col = 0; col < 8; col++) {
      for (let row = 0; row < 8; row++) {
        const piece = this.board[row][col];
        if (
          piece &&
          piece.color === color &&
          (piece.type === "rook" || piece.type === "queen")
        ) {
          if (this.isValidMove(row, col, backRank, enemyKing.col)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  canQueenKnightMate(color, enemyKing) {
    // Check if enemy king is near edge
    if (enemyKing.col > 1 && enemyKing.col < 6) return false;

    // Look for queen and knight combination
    let hasQueen = false;
    let hasKnight = false;
    let queenPos = null;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.color === color) {
          if (piece.type === "queen") {
            hasQueen = true;
            queenPos = { row, col };
          }
          if (piece.type === "knight") hasKnight = true;
        }
      }
    }

    if (hasQueen && hasKnight && queenPos) {
      // Check if queen can deliver mate supported by knight
      const canQueenAttack = this.isValidMove(
        queenPos.row,
        queenPos.col,
        enemyKing.row,
        enemyKing.col
      );
      return canQueenAttack;
    }

    return false;
  }

  canSmotheredMate(color, enemyKing) {
    // Check if enemy king is in corner or edge
    if (
      !(enemyKing.row === 0 || enemyKing.row === 7) ||
      !(enemyKing.col === 0 || enemyKing.col === 7)
    )
      return false;

    // Check if king is surrounded by own pieces
    let surroundedCount = 0;
    for (let dRow = -1; dRow <= 1; dRow++) {
      for (let dCol = -1; dCol <= 1; dCol++) {
        if (dRow === 0 && dCol === 0) continue;
        const newRow = enemyKing.row + dRow;
        const newCol = enemyKing.col + dCol;
        if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
          const piece = this.board[newRow][newCol];
          if (piece && piece.color === enemyKing.color) {
            surroundedCount++;
          }
        }
      }
    }

    // Look for knight that can deliver mate
    if (surroundedCount >= 3) {
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = this.board[row][col];
          if (piece && piece.color === color && piece.type === "knight") {
            if (this.isValidMove(row, col, enemyKing.row, enemyKing.col)) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  evaluateMaterial(color) {
    let score = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece) {
          const value = this.pieceValues[piece.type];
          if (piece.color === color) {
            score += value;
          } else {
            score -= value;
          }
        }
      }
    }
    return score;
  }

  evaluateCenterControl(color) {
    let score = 0;
    // Center squares
    const centerSquares = [
      { row: 3, col: 3 },
      { row: 3, col: 4 },
      { row: 4, col: 3 },
      { row: 4, col: 4 },
    ];

    for (const square of centerSquares) {
      const piece = this.board[square.row][square.col];
      if (piece && piece.color === color) {
        score += 3;
      }
      // Add points for attacking center squares
      if (this.isSquareControlled(square.row, square.col, color)) {
        score += 1;
      }
    }
    return score;
  }

  isSquareControlled(row, col, color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && piece.color === color) {
          if (this.isValidMove(r, c, row, col, false)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  isEarlyOrMidGame() {
    let pieceCount = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.type !== "pawn" && piece.type !== "king") {
          pieceCount++;
        }
      }
    }
    return pieceCount > 6; // More than 6 pieces (not counting pawns and kings) = early/midgame
  }

  evaluatePawnStructure(color) {
    let score = 0;

    // Evaluate each pawn
    for (let col = 0; col < 8; col++) {
      let hasPawn = false;
      for (let row = 0; row < 8; row++) {
        const piece = this.board[row][col];
        if (piece && piece.type === "pawn" && piece.color === color) {
          hasPawn = true;

          // Bonus for connected pawns
          if (this.hasConnectedPawn(row, col, color)) {
            score += 10;
          }

          // Penalty for isolated pawns
          if (this.isIsolatedPawn(row, col, color)) {
            score -= 20;
          }

          // Penalty for doubled pawns
          if (this.isDoubledPawn(col, color)) {
            score -= 15;
          }

          // Bonus for passed pawns
          if (this.isPassedPawn(row, col, color)) {
            score += 30;
          }
        }
      }
    }

    return score;
  }

  hasConnectedPawn(row, col, color) {
    // Check adjacent files for friendly pawns
    for (let adjCol of [col - 1, col + 1]) {
      if (adjCol >= 0 && adjCol < 8) {
        for (let r = 0; r < 8; r++) {
          const piece = this.board[r][adjCol];
          if (piece && piece.type === "pawn" && piece.color === color) {
            return true;
          }
        }
      }
    }
    return false;
  }

  isIsolatedPawn(row, col, color) {
    return !this.hasConnectedPawn(row, col, color);
  }

  isDoubledPawn(col, color) {
    let pawnCount = 0;
    for (let row = 0; row < 8; row++) {
      const piece = this.board[row][col];
      if (piece && piece.type === "pawn" && piece.color === color) {
        pawnCount++;
      }
    }
    return pawnCount > 1;
  }

  isPassedPawn(row, col, color) {
    const direction = color === "white" ? -1 : 1;
    const endRow = color === "white" ? 0 : 7;

    // Check if there are any opposing pawns ahead of this pawn
    for (let r = row; r !== endRow; r += direction) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (c >= 0 && c < 8) {
          const piece = this.board[r][c];
          if (piece && piece.type === "pawn" && piece.color !== color) {
            return false;
          }
        }
      }
    }
    return true;
  }

  evaluatePawnShield(row, col, color) {
    let score = 0;
    const direction = color === "white" ? -1 : 1;

    // Check three files (king's file and adjacent files)
    for (let c = col - 1; c <= col + 1; c++) {
      if (c >= 0 && c < 8) {
        // Check two ranks in front of king
        for (
          let r = row + direction;
          r !== row + 3 * direction;
          r += direction
        ) {
          if (r >= 0 && r < 8) {
            const piece = this.board[r][c];
            if (piece && piece.type === "pawn" && piece.color === color) {
              score += 2; // Bonus for each pawn shielding the king
            }
          }
        }
      }
    }
    return score;
  }

  evaluateMobility(color) {
    try {
      let moveCount = 0;
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = this.board[row][col];
          if (piece && piece.color === color) {
            moveCount += this.countValidMoves(row, col);
          }
        }
      }
      return moveCount * 0.1;
    } catch (error) {
      console.error("Error in evaluateMobility:", error);
      return 0;
    }
  }

  countValidMoves(row, col) {
    let count = 0;
    for (let toRow = 0; toRow < 8; toRow++) {
      for (let toCol = 0; toCol < 8; toCol++) {
        if (this.isValidMove(row, col, toRow, toCol)) {
          count++;
        }
      }
    }
    return count;
  }

  isProtected(row, col, color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && piece.color === color && !(r === row && c === col)) {
          if (this.isValidMove(r, c, row, col)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Learning mechanism
  adjustWeights(gameResult) {
    if (gameResult === this.aiColor) {
      // Increase weights that led to victory
      Object.keys(this.positionWeights).forEach((key) => {
        this.positionWeights[key] *= 1 + this.learningRate;
      });
    } else {
      // Decrease weights that led to defeat
      Object.keys(this.positionWeights).forEach((key) => {
        this.positionWeights[key] *= 1 - this.learningRate;
      });
    }
  }

  // Convert board position to algebraic notation
  toAlgebraic(row, col) {
    const files = "abcdefgh";
    const ranks = "87654321";
    return files[col] + ranks[row];
  }

  // Convert algebraic notation to board position
  fromAlgebraic(move) {
    const files = "abcdefgh";
    const ranks = "87654321";
    const fromFile = files.indexOf(move[0]);
    const fromRank = ranks.indexOf(move[1]);
    const toFile = files.indexOf(move[2]);
    const toRank = ranks.indexOf(move[3]);
    return {
      fromRow: fromRank,
      fromCol: fromFile,
      toRow: toRank,
      toCol: toFile,
    };
  }

  hasCastled(color) {
    // Check if king has moved from its starting position
    const kingStartRow = color === "white" ? 7 : 0;
    const king = this.board[kingStartRow][4];

    // If king is not in starting position and has moved
    if (
      !king ||
      king.type !== "king" ||
      !this.movedPieces.has(`${color}_king`)
    ) {
      return false;
    }

    // Check if either rook has moved to a castling position
    const rookStartCols = [0, 7];
    const rookCastlePositions = [3, 5]; // Positions where rooks end up after castling

    for (let castleCol of rookCastlePositions) {
      const piece = this.board[kingStartRow][castleCol];
      if (piece && piece.type === "rook" && piece.color === color) {
        return true;
      }
    }

    return false;
  }

  findQueen(color) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.type === "queen" && piece.color === color) {
          return { row, col };
        }
      }
    }
    return null;
  }

  countAttackingPieces(row, col, color) {
    let count = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && piece.color !== color) {
          // For pawns, check diagonal attacks specifically
          if (piece.type === "pawn") {
            const direction = piece.color === "white" ? -1 : 1;
            if (r + direction === row && (c + 1 === col || c - 1 === col)) {
              count++;
              continue;
            }
          }
          // For other pieces, check if they can attack the square
          if (
            this.isValidPieceMove(r, c, row, col, piece.type) &&
            !this.isPathBlocked(r, c, row, col)
          ) {
            count++;
          }
        }
      }
    }
    return count;
  }

  async trainAI(numGames = 200) {
    console.log("Starting AI training...");
    const startTime = Date.now();

    for (let i = 0; i < numGames; i++) {
      await this.playSelfTrainingGame();
      if (i % 10 === 0) {
        console.log(`Completed ${i} training games...`);
      }
    }

    // Save learned data
    this.saveLearningData();

    console.log(
      `Training completed in ${(Date.now() - startTime) / 1000} seconds`
    );
    console.log(
      "AI has learned from",
      this.learningData.gamesPlayed,
      "total games"
    );
  }

  async playSelfTrainingGame() {
    this.resetGame();
    let moveCount = 0;
    const gameHistory = [];

    while (!this.isGameOver && moveCount < 200) {
      // Prevent infinite games
      const move = this.findBestMove();
      if (!move) break;

      // Record position before move
      const positionBefore = this.recordPosition();

      // Make move
      this.movePiece(move.fromRow, move.fromCol, move.toRow, move.toCol);

      // Record move and its context
      gameHistory.push({
        position: positionBefore,
        move: move,
        evaluation: this.evaluatePosition(this.currentPlayer),
      });

      moveCount++;
      await new Promise((resolve) => setTimeout(resolve, 0)); // Allow UI updates
    }

    // Learn from this game
    this.learnFromGame(gameHistory, this.currentPlayer);
    this.learningData.gamesPlayed++;
  }

  learnFromGame(gameHistory, winner) {
    // Learn from opening moves (first 10 moves)
    const openingMoves = gameHistory.slice(0, 10);
    this.learnFromOpening(openingMoves, winner);

    // Learn from material trades
    this.learnFromMaterialTrades(gameHistory, winner);

    // Learn from piece positions
    this.learnFromPiecePositions(gameHistory, winner);

    // Update position weights based on success
    this.updatePositionWeights(gameHistory, winner);
  }

  learnFromOpening(openingMoves, winner) {
    const openingKey = openingMoves
      .map(
        (m) =>
          `${m.move.fromRow},${m.move.fromCol}-${m.move.toRow},${m.move.toCol}`
      )
      .join("|");

    if (!this.learningData.openingSuccess[openingKey]) {
      this.learningData.openingSuccess[openingKey] = { wins: 0, games: 0 };
    }

    this.learningData.openingSuccess[openingKey].games++;
    if (winner === "white") {
      this.learningData.openingSuccess[openingKey].wins++;
    }
  }

  learnFromMaterialTrades(gameHistory, winner) {
    for (let i = 1; i < gameHistory.length; i++) {
      const prevPosition = gameHistory[i - 1].position;
      const currentPosition = gameHistory[i].position;
      const materialDiff = this.calculateMaterialDifference(
        currentPosition,
        prevPosition
      );

      if (materialDiff !== 0) {
        const tradeKey = `${materialDiff}`;
        if (!this.learningData.materialTradeScores[tradeKey]) {
          this.learningData.materialTradeScores[tradeKey] = {
            wins: 0,
            games: 0,
          };
        }
        this.learningData.materialTradeScores[tradeKey].games++;
        if (winner === "white") {
          this.learningData.materialTradeScores[tradeKey].wins++;
        }
      }
    }
  }

  updatePositionWeights(gameHistory, winner) {
    const winningMoves = gameHistory.filter(
      (move) =>
        (move.evaluation > 0 && winner === "white") ||
        (move.evaluation < 0 && winner === "black")
    );

    winningMoves.forEach((move) => {
      // Adjust weights based on successful patterns
      this.positionWeights.center *= 1.001;
      this.positionWeights.mobility *= 1.001;
      this.positionWeights.pawnStructure *= 1.001;
      // etc...
    });
  }

  learnFromPiecePositions(gameHistory, winner) {
    // Learn from successful piece placements
    gameHistory.forEach((move) => {
      if (!move.move) return; // Skip if no move data

      const piece = move.position[move.move.fromRow][move.move.fromCol];
      if (!piece) return; // Skip if no piece

      const positionKey = `${piece.type}_${move.move.toRow}_${move.move.toCol}`;

      if (!this.learningData.piecePositionScores[positionKey]) {
        this.learningData.piecePositionScores[positionKey] = {
          wins: 0,
          games: 0,
          totalScore: 0,
        };
      }

      const data = this.learningData.piecePositionScores[positionKey];
      data.games++;
      data.totalScore += move.evaluation;

      if (winner === piece.color) {
        data.wins++;
      }

      // Update piece-square tables based on success
      if (this.pieceSquareTables[piece.type]) {
        if (winner === piece.color) {
          // Slightly increase the value for successful positions
          this.pieceSquareTables[piece.type][move.move.toRow][
            move.move.toCol
          ] *= 1.001;
        } else {
          // Slightly decrease the value for unsuccessful positions
          this.pieceSquareTables[piece.type][move.move.toRow][
            move.move.toCol
          ] *= 0.999;
        }
      }
    });

    // Apply learned position preferences to evaluation weights
    const successfulPositions = Object.entries(
      this.learningData.piecePositionScores
    ).filter(([_, data]) => data.games > 0 && data.wins / data.games > 0.5);

    if (successfulPositions.length > 0) {
      // Adjust weights based on successful patterns
      this.positionWeights.center *= 1.001;
      this.positionWeights.mobility *= 1.001;
      this.positionWeights.development *= 1.001;
    }
  }

  saveLearningData() {
    localStorage.setItem("chessAILearning", JSON.stringify(this.learningData));
  }

  recordPosition() {
    return JSON.parse(JSON.stringify(this.board));
  }

  calculateMaterialDifference(pos1, pos2) {
    const getMaterialValue = (position) => {
      let value = 0;
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = position[row][col];
          if (piece) {
            const pieceValue = this.pieceValues[piece.type];
            value += piece.color === "white" ? pieceValue : -pieceValue;
          }
        }
      }
      return value;
    };

    return getMaterialValue(pos1) - getMaterialValue(pos2);
  }

  async startTraining() {
    this.trainBtn.disabled = true;
    this.trainBtn.textContent = "Training...";

    try {
      await this.trainAI(200);
      alert(
        "Training complete! The AI has learned from " +
          this.learningData.gamesPlayed +
          " games."
      );
    } catch (error) {
      console.error("Training error:", error);
      alert("Training encountered an error. Check console for details.");
    } finally {
      this.trainBtn.disabled = false;
      this.trainBtn.textContent = "Start Training";
      this.resetGame(); // Start fresh game after training
    }
  }

  evaluatePieceCoordination(color) {
    let score = 0;

    // Check for bishop pair
    if (this.hasBishopPair(color)) {
      score += this.strategicBonuses.bishopPair;
    }

    // Check for connected rooks
    if (this.hasConnectedRooks(color)) {
      score += this.strategicBonuses.connectedRooks;
    }

    // Check for central knights
    score += this.evaluateCentralKnights(color);

    return score;
  }

  evaluateOutposts(color) {
    let score = 0;
    const enemyColor = color === "white" ? "black" : "white";

    for (let row = 2; row < 6; row++) {
      for (let col = 2; col < 6; col++) {
        const piece = this.board[row][col];
        if (
          piece &&
          piece.color === color &&
          (piece.type === "knight" || piece.type === "bishop")
        ) {
          // Check if square is protected by friendly pawn
          if (this.isProtectedByPawn(row, col, color)) {
            // Check if it cannot be attacked by enemy pawns
            if (!this.canBeAttackedByEnemyPawns(row, col, enemyColor)) {
              score += this.strategicBonuses.centralKnight;
            }
          }
        }
      }
    }
    return score;
  }

  evaluateOpenFiles(color) {
    let score = 0;
    for (let col = 0; col < 8; col++) {
      if (this.isOpenFile(col)) {
        // Check for rooks on open files
        for (let row = 0; row < 8; row++) {
          const piece = this.board[row][col];
          if (piece && piece.type === "rook" && piece.color === color) {
            score += this.strategicBonuses.rookOnOpenFile;
          }
        }
      }
    }
    return score;
  }

  isOpenFile(col) {
    for (let row = 0; row < 8; row++) {
      const piece = this.board[row][col];
      if (piece && piece.type === "pawn") {
        return false;
      }
    }
    return true;
  }

  hasBishopPair(color) {
    let lightSquareBishop = false;
    let darkSquareBishop = false;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.type === "bishop" && piece.color === color) {
          if ((row + col) % 2 === 0) {
            lightSquareBishop = true;
          } else {
            darkSquareBishop = true;
          }
        }
      }
    }
    return lightSquareBishop && darkSquareBishop;
  }

  evaluateCentralKnights(color) {
    let score = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.type === "knight" && piece.color === color) {
          if (this.isProtected(row, col, color)) {
            score += this.strategicBonuses.centralKnight;
          }
        }
      }
    }
    return score;
  }

  isProtectedByPawn(row, col, color) {
    const directions = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];
    for (const [dRow, dCol] of directions) {
      const newRow = row + dRow;
      const newCol = col + dCol;
      if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
        const pawn = this.board[newRow][newCol];
        if (pawn && pawn.type === "pawn" && pawn.color === color) {
          return true;
        }
      }
    }
    return false;
  }

  canBeAttackedByEnemyPawns(row, col, enemyColor) {
    const directions = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];
    for (const [dRow, dCol] of directions) {
      const newRow = row + dRow;
      const newCol = col + dCol;
      if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
        const pawn = this.board[newRow][newCol];
        if (pawn && pawn.type === "pawn" && pawn.color === enemyColor) {
          return true;
        }
      }
    }
    return false;
  }

  evaluatePawnChains(color) {
    let score = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.type === "pawn" && piece.color === color) {
          if (this.isPassedPawn(row, col, color)) {
            score += this.strategicBonuses.pawnChain;
          }
        }
      }
    }
    return score;
  }

  hasConnectedRooks(color) {
    let rooks = [];

    // Find all rooks of the given color
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.type === "rook" && piece.color === color) {
          rooks.push({ row, col });
        }
      }
    }

    // Check if any two rooks are connected
    for (let i = 0; i < rooks.length; i++) {
      for (let j = i + 1; j < rooks.length; j++) {
        const rook1 = rooks[i];
        const rook2 = rooks[j];

        // Check if rooks are on same rank
        if (rook1.row === rook2.row) {
          let blocked = false;
          // Check if path between rooks is clear
          for (
            let col = Math.min(rook1.col, rook2.col) + 1;
            col < Math.max(rook1.col, rook2.col);
            col++
          ) {
            if (this.board[rook1.row][col]) {
              blocked = true;
              break;
            }
          }
          if (!blocked) return true;
        }

        // Check if rooks are on same file
        if (rook1.col === rook2.col) {
          let blocked = false;
          // Check if path between rooks is clear
          for (
            let row = Math.min(rook1.row, rook2.row) + 1;
            row < Math.max(rook1.row, rook2.row);
            row++
          ) {
            if (this.board[row][rook1.col]) {
              blocked = true;
              break;
            }
          }
          if (!blocked) return true;
        }
      }
    }

    return false;
  }

  evaluatePositionHistory(move) {
    // Check if move matches successful patterns
    const moveKey = `${move.fromRow},${move.fromCol}-${move.toRow},${move.toCol}`;
    const successRate = this.learningData.openingSuccess[moveKey];

    if (successRate && successRate.games > 0) {
      return (successRate.wins / successRate.games) * 0.5; // Bonus for proven moves
    }
    return 0;
  }

  learnFromHumanGame(winner) {
    console.log("Learning from game...");

    // Analyze the game before learning
    const gameAnalysis = this.analyzeGame(this.currentGameHistory, winner);

    // Learn from the game
    this.learnFromGame(this.currentGameHistory, winner);
    this.learningData.gamesPlayed++;

    // Save updated learning data
    this.saveLearningData();

    // Display learnings
    this.displayGameLearnings(gameAnalysis, winner);

    // Reset game history
    this.currentGameHistory = [];

    console.log("Game analyzed and stored in training data");
  }

  analyzeGame(gameHistory, winner) {
    const analysis = {
      successfulMoves: [],
      materialGains: [],
      positionImprovements: [],
      mistakes: [],
      bestMove: null,
      worstMove: null,
    };

    let bestEval = -Infinity;
    let worstEval = Infinity;

    gameHistory.forEach((turn, index) => {
      const { move, evaluation } = turn;
      const piece = move.piece;

      // Track best and worst moves
      if (evaluation > bestEval) {
        bestEval = evaluation;
        analysis.bestMove = {
          piece: piece.type,
          from: `${move.fromRow},${move.fromCol}`,
          to: `${move.toRow},${move.toCol}`,
          evaluation,
        };
      }

      if (evaluation < worstEval) {
        worstEval = evaluation;
        analysis.worstMove = {
          piece: piece.type,
          from: `${move.fromRow},${move.fromCol}`,
          to: `${move.toRow},${move.toCol}`,
          evaluation,
        };
      }

      // Analyze material gains
      if (this.board[move.toRow][move.toCol]) {
        analysis.materialGains.push({
          piece: piece.type,
          captured: this.board[move.toRow][move.toCol].type,
          turn: index + 1,
        });
      }

      // Analyze position improvements
      if (evaluation > 0) {
        analysis.successfulMoves.push({
          piece: piece.type,
          to: `${move.toRow},${move.toCol}`,
          evaluation,
        });
      }
    });

    return analysis;
  }

  displayGameLearnings(analysis, winner) {
    // Create or get the learning display element
    let displayDiv = document.getElementById("gameLearnings");
    if (!displayDiv) {
      displayDiv = document.createElement("div");
      displayDiv.id = "gameLearnings";
      displayDiv.style.marginTop = "20px";
      displayDiv.style.padding = "10px";
      displayDiv.style.border = "1px solid #ccc";
      displayDiv.style.borderRadius = "5px";
      this.canvas.parentNode.appendChild(displayDiv);
    }

    // Format the learning content
    let content = `<h3>Game Analysis (Winner: ${winner})</h3>`;

    if (analysis.bestMove) {
      content += `<p><strong>Best Move:</strong> ${analysis.bestMove.piece} from ${analysis.bestMove.from} to ${analysis.bestMove.to}</p>`;
    }

    if (analysis.materialGains.length > 0) {
      content += "<p><strong>Material Gains:</strong></p><ul>";
      analysis.materialGains.forEach((gain) => {
        content += `<li>${gain.piece} captured ${gain.captured} on turn ${gain.turn}</li>`;
      });
      content += "</ul>";
    }

    if (analysis.successfulMoves.length > 0) {
      content += "<p><strong>Strong Positions:</strong></p><ul>";
      analysis.successfulMoves.slice(0, 3).forEach((move) => {
        content += `<li>${move.piece} to ${
          move.to
        } (evaluation: ${move.evaluation.toFixed(2)})</li>`;
      });
      content += "</ul>";
    }

    content += `<p><strong>Total Moves Analyzed:</strong> ${this.currentGameHistory.length}</p>`;
    content += `<p><strong>Total Games in Training Data:</strong> ${this.learningData.gamesPlayed}</p>`;

    // Update the display
    displayDiv.innerHTML = content;
  }

  canTwoBishopsMate(color, enemyKing) {
    // First check if we have two bishops
    let bishops = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.type === "bishop" && piece.color === color) {
          bishops.push({ row, col });
        }
      }
    }

    if (bishops.length < 2) return false;

    // Check if enemy king is near corner
    const isNearCorner =
      (enemyKing.row <= 1 || enemyKing.row >= 6) &&
      (enemyKing.col <= 1 || enemyKing.col >= 6);

    if (!isNearCorner) return false;

    // Check if bishops control key squares around king
    let controlledSquares = 0;
    const kingEscapeSquares = [
      { row: enemyKing.row - 1, col: enemyKing.col - 1 },
      { row: enemyKing.row - 1, col: enemyKing.col },
      { row: enemyKing.row - 1, col: enemyKing.col + 1 },
      { row: enemyKing.row, col: enemyKing.col - 1 },
      { row: enemyKing.row, col: enemyKing.col + 1 },
      { row: enemyKing.row + 1, col: enemyKing.col - 1 },
      { row: enemyKing.row + 1, col: enemyKing.col },
      { row: enemyKing.row + 1, col: enemyKing.col + 1 },
    ];

    for (const square of kingEscapeSquares) {
      if (
        square.row >= 0 &&
        square.row < 8 &&
        square.col >= 0 &&
        square.col < 8
      ) {
        for (const bishop of bishops) {
          if (
            this.isValidMove(bishop.row, bishop.col, square.row, square.col)
          ) {
            controlledSquares++;
            break;
          }
        }
      }
    }

    return controlledSquares >= 3; // Control at least 3 escape squares
  }

  canAnastasiasMate(color, enemyKing) {
    // Anastasia's mate requires a rook and knight combination
    // with the enemy king trapped against the edge

    // First check if king is on edge
    if (enemyKing.col !== 0 && enemyKing.col !== 7) return false;

    let hasRook = false;
    let hasKnight = false;
    let rookPos = null;

    // Look for rook and knight
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.color === color) {
          if (piece.type === "rook") {
            hasRook = true;
            rookPos = { row, col };
          }
          if (piece.type === "knight") {
            hasKnight = true;
          }
        }
      }
    }

    if (!hasRook || !hasKnight || !rookPos) return false;

    // Check if rook controls the file adjacent to the king
    const controlFile = enemyKing.col === 0 ? 1 : 6;
    if (
      !this.isValidMove(rookPos.row, rookPos.col, enemyKing.row, controlFile)
    ) {
      return false;
    }

    // Check if king is trapped by own pieces
    let blockedSquares = 0;
    const escapeSquares = [
      { row: enemyKing.row - 1, col: enemyKing.col },
      { row: enemyKing.row + 1, col: enemyKing.col },
      {
        row: enemyKing.row,
        col: enemyKing.col + (enemyKing.col === 0 ? 1 : -1),
      },
    ];

    for (const square of escapeSquares) {
      if (square.row >= 0 && square.row < 8) {
        const piece = this.board[square.row][square.col];
        if (piece && piece.color === enemyKing.color) {
          blockedSquares++;
        }
      }
    }

    return blockedSquares >= 2; // At least 2 escape squares blocked by own pieces
  }

  // Add method to recognize and follow opening plans
  evaluateOpeningPosition(color) {
    if (this.currentGameMoves.length > 10) return 0; // Only in opening phase

    let score = 0;
    const currentOpening = this.identifyOpening();

    if (currentOpening && this.openingPlans[currentOpening]) {
      const plan = this.openingPlans[currentOpening];

      // Evaluate adherence to opening plan
      if (plan.centerControl) {
        for (const square of plan.centerControl.squares) {
          if (this.isSquareControlled(this.algebraicToCoords(square), color)) {
            score += plan.centerControl.bonus;
          }
        }
      }

      // Check piece development according to plan
      if (plan.pieceDevelopment) {
        for (const square of plan.pieceDevelopment) {
          if (this.isPieceDevelopedTo(square, color)) {
            score += 0.2;
          }
        }
      }
    }

    return score;
  }

  // Helper method to convert algebraic notation to coordinates
  algebraicToCoords(square) {
    const file = square.charCodeAt(0) - "a".charCodeAt(0);
    const rank = 8 - parseInt(square[1]);
    return { row: rank, col: file };
  }

  createTemperatureControl() {
    // Create container div
    const controlDiv = document.createElement("div");
    controlDiv.style.marginTop = "10px";
    controlDiv.style.marginBottom = "10px";

    // Create label
    const label = document.createElement("label");
    label.textContent = "AI Randomness: ";
    label.htmlFor = "temperatureSelect";

    // Create select element
    const select = document.createElement("select");
    select.id = "temperatureSelect";

    // Add options
    const options = [
      { value: 0.1, text: "Very Conservative" },
      { value: 0.5, text: "Conservative" },
      { value: 0.8, text: "Balanced" },
      { value: 1.0, text: "Creative" },
      { value: 1.5, text: "Very Creative" },
    ];

    options.forEach((option) => {
      const optElement = document.createElement("option");
      optElement.value = option.value;
      optElement.textContent = option.text;
      if (option.value === 0.8) optElement.selected = true;
      select.appendChild(optElement);
    });

    // Add event listener
    select.addEventListener("change", (e) => {
      this.temperature = parseFloat(e.target.value);
      console.log(`Temperature set to: ${this.temperature}`);
    });

    // Append elements
    controlDiv.appendChild(label);
    controlDiv.appendChild(select);

    // Add to page
    this.canvas.parentNode.insertBefore(controlDiv, this.canvas);
  }

  createAIModeControl() {
    const controlDiv = document.createElement("div");
    controlDiv.style.marginTop = "10px";
    controlDiv.style.marginBottom = "10px";

    const label = document.createElement("label");
    label.textContent = "AI Engine: ";
    label.htmlFor = "aiModeSelect";

    const select = document.createElement("select");
    select.id = "aiModeSelect";

    const options = [
      { value: "homegrown", text: "Homegrown AI" },
      { value: "stockfish", text: "Stockfish Engine" },
    ];

    options.forEach((option) => {
      const optElement = document.createElement("option");
      optElement.value = option.value;
      optElement.textContent = option.text;
      select.appendChild(optElement);
    });

    select.addEventListener("change", async (e) => {
      this.aiMode = e.target.value;
      if (this.aiMode === "stockfish" && !this.stockfish) {
        try {
          // Initialize Stockfish using local file
          this.stockfish = new Worker("./stockfish.js");

          // Initialize engine
          this.stockfish.postMessage("uci");
          this.stockfish.postMessage("isready");
          this.stockfish.postMessage("setoption name Skill Level value 10");

          // Set up message handler
          this.stockfish.onmessage = (event) => {
            const msg = event.data;
            if (msg.includes("bestmove")) {
              const move = msg.split(" ")[1];
              this.makeStockfishMove(move);
            }
          };

          console.log("Stockfish initialized successfully");
        } catch (error) {
          console.error("Failed to load Stockfish:", error);
          this.aiMode = "homegrown";
          select.value = "homegrown";
          alert(
            "Failed to load Stockfish engine. Falling back to homegrown AI."
          );
        }
      }
      console.log(`AI mode set to: ${this.aiMode}`);
    });

    controlDiv.appendChild(label);
    controlDiv.appendChild(select);
    this.canvas.parentNode.insertBefore(controlDiv, this.canvas);
  }

  makeStockfishMove(move) {
    console.log("Processing Stockfish move:", move);

    // Prevent duplicate moves
    if (this.isProcessingMove) {
      console.log("Already processing a move, skipping...");
      return;
    }
    this.isProcessingMove = true;

    try {
      // Convert algebraic notation (e.g., "c2c4") to board coordinates
      const fromCol = move.charCodeAt(0) - "a".charCodeAt(0); // c -> 2
      const fromRow = 8 - parseInt(move[1]); // 2 -> 6
      const toCol = move.charCodeAt(2) - "a".charCodeAt(0); // c -> 2
      const toRow = 8 - parseInt(move[3]); // 4 -> 4

      console.log("Converted coordinates:", {
        from: `${fromRow},${fromCol} (${move.slice(0, 2)})`,
        to: `${toRow},${toCol} (${move.slice(2, 4)})`,
      });

      // Check if this is a castling move
      const piece = this.board[fromRow][fromCol];
      if (!piece) {
        console.error("No piece found at starting position:", fromRow, fromCol);
        return;
      }

      console.log(
        "Moving piece:",
        piece.type,
        "from",
        fromRow,
        fromCol,
        "to",
        toRow,
        toCol
      );

      if (piece.type === "king" && Math.abs(toCol - fromCol) === 2) {
        // This is a castling move
        console.log("Stockfish is attempting to castle");
        if (this.isValidCastling(fromRow, fromCol, toRow, toCol)) {
          console.log("Castling is legal, executing move");
          this.movePiece(fromRow, fromCol, toRow, toCol);
          this.draw();
          return;
        }
        console.log("Castling was not legal, attempting regular move");
      }

      // Regular move
      if (this.isValidMove(fromRow, fromCol, toRow, toCol)) {
        this.movePiece(fromRow, fromCol, toRow, toCol);
        this.draw();
      } else {
        console.error("Invalid move attempted by Stockfish:", move);
        console.error(
          "Board state at attempted move:",
          this.board[fromRow][fromCol]
        );
        console.error("Target square:", this.board[toRow][toCol]);
      }
    } finally {
      // Clear the processing flag after move is complete
      this.isProcessingMove = false;
    }
  }

  createGameModeControl() {
    const controlDiv = document.createElement("div");
    controlDiv.style.marginTop = "10px";
    controlDiv.style.marginBottom = "10px";

    const label = document.createElement("label");
    label.textContent = "Game Mode: ";
    label.htmlFor = "gameModeSelect";

    const select = document.createElement("select");
    select.id = "gameModeSelect";

    const options = [
      { value: "humanVsAI", text: "Human vs AI" },
      { value: "AIvsAI", text: "AI vs AI" },
      { value: "humanVsHuman", text: "Human vs Human" },
    ];

    options.forEach((option) => {
      const optElement = document.createElement("option");
      optElement.value = option.value;
      optElement.textContent = option.text;
      select.appendChild(optElement);
    });

    select.addEventListener("change", async (e) => {
      this.gameMode = e.target.value;
      this.resetGame();
      console.log(`Game mode set to: ${this.gameMode}`);
    });

    controlDiv.appendChild(label);
    controlDiv.appendChild(select);
    this.canvas.parentNode.insertBefore(controlDiv, this.canvas);
  }
}

// Start the game when the page loads
window.addEventListener("load", () => {
  new ChessGame();
});
