import dotenv from "dotenv";
import { Server } from "socket.io";
import { createServer } from "http";
import { v4 } from "uuid";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/* TODO:
- Refactor the whole shit show to support multiple rooms
Maybe databases would be nice?

- Add input sanitization, EVERYWHERE.
- Implement rate limiting for incoming connections.
*/

dotenv.config({ path: path.join(__dirname, ".env"), quiet: true });
const CONFIG = {
  HOST: process.env.HOST,
  PORT: parseInt(process.env.PORT),
  MAX_IMAGE_SIZE: parseInt(process.env.MAX_IMAGE_SIZE_MB) * 1024 * 1024,
  VERSION: process.env.VERSION,
  MIN_PLAYERS: parseInt(process.env.MIN_PLAYERS),
  GAME_START_DELAY: parseInt(process.env.GAME_START_DELAY),
  PAINTING_TIME: parseInt(process.env.PAINTING_TIME),
  HOST_DIALOGUE_TYPE_SPEED: parseInt(process.env.HOST_DIALOGUE_TYPE_SPEED),
  HOST_DIALOGUE_MIN_DELAY: parseInt(process.env.HOST_DIALOGUE_MIN_DELAY),
  AUCTION_HINTS_COUNT: parseInt(process.env.AUCTION_HINTS_COUNT),
};

console.log(`--------------------------------------------------------`);
colorfulLog(`App version: ${CONFIG.VERSION}`, "info", "startup");
colorfulLog(`Max image size: ${CONFIG.MAX_IMAGE_SIZE} bytes`, "info", "startup");
colorfulLog(`Host: ${CONFIG.HOST}`, "info", "startup");
colorfulLog(`Port: ${CONFIG.PORT}`, "info", "startup");
colorfulLog(`Min players to start: ${CONFIG.MIN_PLAYERS}`, "info", "startup");
colorfulLog(`Game start delay: ${CONFIG.GAME_START_DELAY} seconds`, "info", "startup");
colorfulLog(`Painting time: ${CONFIG.PAINTING_TIME} seconds`, "info", "startup");
colorfulLog(`Auction hints count: ${CONFIG.AUCTION_HINTS_COUNT}`, "info", "startup");
colorfulLog(`Host dialogue type speed: ${CONFIG.HOST_DIALOGUE_TYPE_SPEED} ms`, "info", "startup");
colorfulLog(`Host dialogue min delay: ${CONFIG.HOST_DIALOGUE_MIN_DELAY} ms`, "info", "startup");
console.log(`--------------------------------------------------------`);

function colorfulLog(message, mode = "info", department = "general") {
  const timestamp = new Date().toISOString();
  const colors = {
    todo: "\u001b[34m", // Light Blue
    info: "\u001b[32m", // Light Green
    warn: "\u001b[33m", // Yellow
    error: "\u001b[31m", // Red
  };

  console.log(`[${timestamp}] [${department.toUpperCase()}]\t${colors[mode]}${message}\x1b[0m`);
}

function shuffleArray(array) {
  return array
    .map((set) => {
      return {
        value: set,
        sort: Math.random(),
      };
    })
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

/*
 /$$   /$$                       /$$
| $$  | $$                      | $$
| $$  | $$  /$$$$$$   /$$$$$$$ /$$$$$$
| $$$$$$$$ /$$__  $$ /$$_____/|_  $$_/
| $$__  $$| $$  \ $$|  $$$$$$   | $$
| $$  | $$| $$  | $$ \____  $$  | $$ /$$
| $$  | $$|  $$$$$$/ /$$$$$$$/  |  $$$$/
|__/  |__/ \______/ |_______/    \___/
                                                            
                                                            
                                                            
  /$$$$$$                                          /$$
 /$$__  $$                                        | $$
| $$  \__/  /$$$$$$   /$$$$$$   /$$$$$$   /$$$$$$$| $$$$$$$ 
|  $$$$$$  /$$__  $$ /$$__  $$ /$$__  $$ /$$_____/| $$__  $$
 \____  $$| $$  \ $$| $$$$$$$$| $$$$$$$$| $$      | $$  \ $$
 /$$  \ $$| $$  | $$| $$_____/| $$_____/| $$      | $$  | $$
|  $$$$$$/| $$$$$$$/|  $$$$$$$|  $$$$$$$|  $$$$$$$| $$  | $$
 \______/ | $$____/  \_______/ \_______/ \_______/|__/  |__/
          | $$
          | $$
          |__/
*/
const dialogueTrackers = new Map();

function emitHostDialogueAndAwait(io, players, texts, typeSpeed, minDelay, onComplete) {
  const dialogueId = v4();
  const expected = new Set(players.map((p) => p.socketID));
  const responded = new Set();
  dialogueTrackers.set(dialogueId, { expected, responded, callback: onComplete });

  io.emit(
    "hostDialogue",
    JSON.stringify({
      dialogueId,
      texts,
      typeSpeed,
      minDelay,
    })
  );
  return dialogueId;
}

/*
  /$$$$$$                                          /$$    /$$                             
 /$$__  $$                                        | $$   | $$                             
| $$  \__/  /$$$$$$  /$$$$$$/$$$$   /$$$$$$       | $$   | $$ /$$$$$$   /$$$$$$   /$$$$$$$
| $$ /$$$$ |____  $$| $$_  $$_  $$ /$$__  $$      |  $$ / $$/|____  $$ /$$__  $$ /$$_____/
| $$|_  $$  /$$$$$$$| $$ \ $$ \ $$| $$$$$$$$       \  $$ $$/  /$$$$$$$| $$  \__/|  $$$$$$ 
| $$  \ $$ /$$__  $$| $$ | $$ | $$| $$_____/        \  $$$/  /$$__  $$| $$       \____  $$
|  $$$$$$/|  $$$$$$$| $$ | $$ | $$|  $$$$$$$         \  $/  |  $$$$$$$| $$       /$$$$$$$/
 \______/  \_______/|__/ |__/ |__/ \_______/          \_/    \_______/|__/      |_______/ 
*/

let gameStartTimer = null;

colorfulLog("Declaring game variables...", "info", "startup");

let colors = ["red", "blue", "green", "orange", "purple", "yellow", "gray"];

let gameState = {
  state: "waiting", // waiting, painting, auction, bank, ended
  artwork: [],
  players: [],
};

let paintingPrompts;
function dealPrompts() {
  try {
    paintingPrompts = shuffleArray(
      JSON.parse(fs.readFileSync(path.join(__dirname, "jackboxPrompts/prompts.json"), "utf-8"))
    );
    colorfulLog(
      `Loaded painting prompts from prompts.json. ${paintingPrompts.length} prompt categories available.`,
      "info",
      "startup"
    );
  } catch (e) {
    colorfulLog(
      `Failed to load painting prompts from prompts.json: ${e.message}`,
      "error",
      "startup"
    );
    process.exit(1);
  }
  const selectedSets = paintingPrompts.slice(0, gameState.players.length);

  for (let i = 0; i < selectedSets.length; i++) {
    const randomPrompts = shuffleArray(selectedSets[i].prompts);
    const prompt1 = randomPrompts.pop();
    const prompt2 = randomPrompts.pop();

    gameState.artwork.push({
      id: prompt1.id,
      prompt: prompt1.text,
      replacement: prompt1.image,
      artist: gameState.players[i].playerID,
      price: Math.max(400, Math.round((Math.random() * 4000) / 100) * 100),
      base64: "",
    });
    gameState.artwork.push({
      id: prompt2.id,
      prompt: prompt2.text,
      replacement: prompt2.image,
      artist: gameState.players[(i + 1) % gameState.players.length].playerID,
      price: Math.max(400, Math.round((Math.random() * 4000) / 100) * 100),
      base64: "",
    });
  }
}

function replaceEmptyPaintings() {
  let didHaveEmpty = false;

  for (let painting of gameState.artwork) {
    if (!painting.base64 || painting.base64.length === 0) {
      colorfulLog(
        `Painting ${painting.id} by player ${painting.artist} is empty. Replacing with placeholder.`,
        "warn",
        "game"
      );
      painting.base64 = fs.readFileSync(
        path.join(__dirname, `jackboxPrompts/${painting.replacement}`),
        "utf-8"
      );
      didHaveEmpty = true;
    }
  }

  if (didHaveEmpty) {
    colorfulLog(
      "Some paintings were empty and have been replaced with placeholders.",
      "info",
      "game"
    );
    return true;
  } else {
    colorfulLog("All paintings were submitted properly.", "info", "game");
    return false;
  }
}

function validateAndAddPlayer(arg, callback, socket) {
  const nickname = arg.playerName;
  const blockedNames = ["admin", "moderator", "mod", "host", "system"];

  if (!nickname) {
    colorfulLog(`Rejecting player ${nickname} - no name provided`, "warn", "validation");
    callback(JSON.stringify({ success: false, reason: "No name provided." }));
    return;
  } else if (blockedNames.includes(nickname.toLowerCase())) {
    colorfulLog(`Rejecting player ${nickname} - name not allowed`, "warn", "validation");
    callback(JSON.stringify({ success: false, reason: "Name not allowed." }));
    return;
  } else if (gameState.players.find((p) => p.nickname === nickname)) {
    colorfulLog(`Rejecting player ${nickname} - name already taken`, "warn", "validation");
    callback(JSON.stringify({ success: false, reason: "Name already taken." }));
    return;
  } else if (nickname.length < 3 || nickname.length > 16) {
    colorfulLog(`Rejecting player ${nickname} - invalid name length`, "warn", "validation");
    callback(JSON.stringify({ success: false, reason: "Invalid name length." }));
    return;
  } else if (nickname.match(/[^a-zA-Z0-9_]/)) {
    colorfulLog(`Rejecting player ${nickname} - invalid characters`, "warn", "validation");
    callback(JSON.stringify({ success: false, reason: "Invalid characters." }));
    return;
  } else if (colors.length === 0) {
    colorfulLog(`Rejecting player ${nickname} - game is full`, "warn", "validation");
    callback(JSON.stringify({ success: false, reason: "The game is full." }));
    return;
  } else if (gameState.state === "ended") {
    colorfulLog(`Rejecting player ${nickname} - game has ended`, "warn", "validation");
    callback(JSON.stringify({ success: false, reason: "Game has ended." }));
    return;
  }

  /* Если всё ок, добавляем игрока */
  gameState.players.push(new Player(socket.id, nickname));
  callback(JSON.stringify({ success: true }));
  emitToPlayers(
    "playerUpdate",
    JSON.stringify(
      gameState.players.map((p) => {
        return {
          nickname: p.nickname,
          color: p.color,
        };
      })
    )
  );
  socket.emit("gameStateUpdate", JSON.stringify(gameState.state));
}

function emitToPlayers(event, data) {
  gameState.players.forEach((player) => {
    const playerSocket = io.sockets.sockets.get(player.socketID);
    if (playerSocket) {
      playerSocket.emit(event, data);
    }
  });
}

class Player {
  socketID;
  nickname;
  color;
  playerID;

  balance;
  loans;

  constructor(socketID, nickname) {
    this.socketID = socketID;
    this.playerID = v4();
    this.nickname = nickname;
    this.color = colors.splice(Math.floor(Math.random() * colors.length), 1)[0];

    this.balance = 3000;
    this.loans = 0;
    this.getPlayerInfo();
  }

  getPlayerInfo() {
    colorfulLog(
      `Player info: SocketID: ${this.socketID}, UUID: ${this.playerID}, Nickname: ${this.nickname}, Color: ${this.color}, Balance: ${this.balance}, Loans: ${this.loans}`,
      "info",
      "player"
    );
  }
}

/*
  /$$$$$$                                          /$$$$$$$  /$$                                              
 /$$__  $$                                        | $$__  $$| $$                                              
| $$  \__/  /$$$$$$  /$$$$$$/$$$$   /$$$$$$       | $$  \ $$| $$$$$$$   /$$$$$$   /$$$$$$$  /$$$$$$   /$$$$$$$
| $$ /$$$$ |____  $$| $$_  $$_  $$ /$$__  $$      | $$$$$$$/| $$__  $$ |____  $$ /$$_____/ /$$__  $$ /$$_____/
| $$|_  $$  /$$$$$$$| $$ \ $$ \ $$| $$$$$$$$      | $$____/ | $$  \ $$  /$$$$$$$|  $$$$$$ | $$$$$$$$|  $$$$$$ 
| $$  \ $$ /$$__  $$| $$ | $$ | $$| $$_____/      | $$      | $$  | $$ /$$__  $$ \____  $$| $$_____/ \____  $$
|  $$$$$$/|  $$$$$$$| $$ | $$ | $$|  $$$$$$$      | $$      | $$  | $$|  $$$$$$$ /$$$$$$$/|  $$$$$$$ /$$$$$$$/
 \______/  \_______/|__/ |__/ |__/ \_______/      |__/      |__/  |__/ \_______/|_______/  \_______/|_______/ 
*/

function startGameCountdown() {
  colorfulLog("Minimum players reached. Starting game countdown...", "info", "game");

  let gameStartTimerEnd = new Date(Date.now());
  gameStartTimerEnd.setSeconds(gameStartTimerEnd.getSeconds() + CONFIG.GAME_START_DELAY);

  emitToPlayers(
    "startGameStartCountdown",
    JSON.stringify({ endTime: gameStartTimerEnd.getTime() })
  );

  gameStartTimer = setTimeout(() => {
    emitToPlayers("resetGameStartCountdown");
    startPaintingPhase();
  }, gameStartTimerEnd.getTime() - Date.now());
}

function startPaintingPhase() {
  colorfulLog("Starting painting phase...", "info", "game");

  dealPrompts();

  emitHostDialogueAndAwait(
    gameState.players,
    [
      "1",
      /*"Welcome to this wonderful establishment!",
        "Here you will learn how to paint, bid, and lose all your money!",
        "Let's get started with a quick tutorial...",
        "First, you'll be given two painting prompts.",
        "Unleash your inner Leonardo Da Vinci and create a masterpiece for each prompt.",
        "You will be given 90 seconds, because true art cannot be rushed.",
        "Once the timer ends, the auction will start and your masterpieces will get a random price.",*/
    ],
    CONFIG.HOST_DIALOGUE_TYPE_SPEED,
    CONFIG.HOST_DIALOGUE_MIN_DELAY,
    () => {
      // Update game state
      gameState.state = "painting";
      emitToPlayers("gameStateUpdate", JSON.stringify(gameState.state));

      sendPaintingPromptsToPlayers();

      emitToPlayers(
        "startPaintingTimer",
        JSON.stringify({ endTime: Date.now() + CONFIG.PAINTING_TIME * 1000 })
      );
      colorfulLog("Game state updated to 'painting' and broadcasted.", "info", "game");

      setTimeout(() => {
        startAuctionPhase();
      }, CONFIG.PAINTING_TIME * 1000);

      gameStartTimer = null;
    }
  );
}

function startAuctionPhase() {
  colorfulLog("Painting phase ended. Starting auction phase...", "info", "game");

  emitHostDialogueAndAwait(
    gameState.players,
    [
      "2",
      /*"Time's up! Put down your brushes and step away from your masterpieces.",
        "It's time for the auction! Each of your paintings has been assigned a random price.",
        "Remember, you cannot bid on your own artwork, so choose wisely.",*/
    ],
    CONFIG.HOST_DIALOGUE_TYPE_SPEED,
    CONFIG.HOST_DIALOGUE_MIN_DELAY,
    () => {
      gameState.state = "auction";
      emitToPlayers("gameStateUpdate", JSON.stringify(gameState.state));

      replaceEmptyPaintings();

      sendAuctionHintsToPlayers();
    }
  );
}

function sendPaintingPromptsToPlayers() {
  gameState.players.forEach((player) => {
    const playerSocket = io.sockets.sockets.get(player.socketID);
    if (playerSocket) {
      playerSocket.emit(
        "updatePaintingPrompts",
        JSON.stringify(
          gameState.artwork
            .filter((a) => a.artist === player.playerID)
            .map((painting) => ({ id: painting.id, prompt: painting.prompt }))
        )
      );
    }
  });
}

function sendAuctionHintsToPlayers() {
  gameState.players.forEach((player) => {
    const hints = shuffleArray(gameState.artwork.filter((a) => a.artist !== player.socketID))
      .slice(0, CONFIG.AUCTION_HINTS_COUNT)
      .map((painting) => ({
        prompt: painting.prompt,
        price: painting.price,
      }));

    const playerSocket = io.sockets.sockets.get(player.socketID);
    if (playerSocket) {
      playerSocket.emit("auctionHints", JSON.stringify(hints));
    }
  });
}

/*
 /$$$$$$$  /$$                                              
| $$__  $$| $$                                              
| $$  \ $$| $$$$$$$   /$$$$$$   /$$$$$$$  /$$$$$$   /$$$$$$$
| $$$$$$$/| $$__  $$ |____  $$ /$$_____/ /$$__  $$ /$$_____/
| $$____/ | $$  \ $$  /$$$$$$$|  $$$$$$ | $$$$$$$$|  $$$$$$ 
| $$      | $$  | $$ /$$__  $$ \____  $$| $$_____/ \____  $$
| $$      | $$  | $$|  $$$$$$$ /$$$$$$$/|  $$$$$$$ /$$$$$$$/
|__/      |__/  |__/ \_______/|_______/  \_______/|_______/ 
*/

/*
 /$$   /$$ /$$$$$$$$ /$$$$$$$$ /$$$$$$$        /$$           /$$   /$$    
| $$  | $$|__  $$__/|__  $$__/| $$__  $$      |__/          |__/  | $$    
| $$  | $$   | $$      | $$   | $$  \ $$       /$$ /$$$$$$$  /$$ /$$$$$$  
| $$$$$$$$   | $$      | $$   | $$$$$$$/      | $$| $$__  $$| $$|_  $$_/  
| $$__  $$   | $$      | $$   | $$____/       | $$| $$  \ $$| $$  | $$    
| $$  | $$   | $$      | $$   | $$            | $$| $$  | $$| $$  | $$ /$$
| $$  | $$   | $$      | $$   | $$            | $$| $$  | $$| $$  |  $$$$/
|__/  |__/   |__/      |__/   |__/            |__/|__/  |__/|__/   \___/  
*/

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

httpServer.listen(PORT, HOST, () => {
  colorfulLog(`HTTP server listening on ${HOST}:${PORT}`, "info", "startup");
});

/*
 /$$$$$$  /$$$$$$                    /$$                                                
|_  $$_/ /$$__  $$                  | $$                                                
  | $$  | $$  \ $$        /$$$$$$$ /$$$$$$    /$$$$$$   /$$$$$$   /$$$$$$  /$$$$$$/$$$$ 
  | $$  | $$  | $$       /$$_____/|_  $$_/   /$$__  $$ /$$__  $$ |____  $$| $$_  $$_  $$
  | $$  | $$  | $$      |  $$$$$$   | $$    | $$  \__/| $$$$$$$$  /$$$$$$$| $$ \ $$ \ $$
  | $$  | $$  | $$       \____  $$  | $$ /$$| $$      | $$_____/ /$$__  $$| $$ | $$ | $$
 /$$$$$$|  $$$$$$/       /$$$$$$$/  |  $$$$/| $$      |  $$$$$$$|  $$$$$$$| $$ | $$ | $$
|______/ \______/       |_______/    \___/  |__/       \_______/ \_______/|__/ |__/ |__/
*/

io.on("connection", (socket) => {
  colorfulLog(
    `New client connected from ${socket.handshake.address}. Assigned the ID: ${socket.id}.`,
    "info",
    "connection"
  );

  socket.on("hostDialogueComplete", (data) => {
    let obj;
    try {
      obj = JSON.parse(data);
    } catch (e) {
      colorfulLog(
        `Failed to parse hostDialogueComplete data: ${e.message}\nWith data: ${data}`,
        "error",
        "socket"
      );
      return;
    }
    const tracker = dialogueTrackers.get(obj.dialogueId);
    if (!tracker) return;
    tracker.responded.add(socket.id);
    if (tracker.responded.size >= tracker.expected.size) {
      if (typeof tracker.callback === "function") tracker.callback();
      dialogueTrackers.delete(obj.dialogueId);
    }
  });

  socket.on("openConnection", (arg, callback) => {
    callback(
      JSON.stringify({
        version: VERSION,
        success: true,
      })
    );
  });

  socket.on("playerJoin", (arg, callback) => {
    colorfulLog(`Received playerJoin request: ${arg}`, "info", "socket");

    /*  Вот такой вот неприятный костыль пока не придумаю норм механику захода. */
    if (gameState.state !== "waiting") {
      colorfulLog("Game already in progress. Rejecting new player.", "warn", "game");
      callback(JSON.stringify({ success: false, reason: "Game already in progress." }));
      return;
    }

    try {
      let argObject = JSON.parse(arg);

      /* Проверка ника игрока */
      let joinValidation = canPlayerJoin(argObject.playerName);
      if (joinValidation) {
        callback(JSON.stringify({ success: false, reason: joinValidation[1] }));
        return;
      }

      colorfulLog(`Processing join request for player: ${argObject.playerName}`, "info", "player");

      gameState.players.push(new Player(socket.id, argObject.playerName));
      callback(JSON.stringify({ success: true }));
      io.emit(
        "playerUpdate",
        JSON.stringify(
          gameState.players.map((p) => {
            return {
              nickname: p.nickname,
              color: p.color,
            };
          })
        )
      );
      socket.emit("gameStateUpdate", JSON.stringify(gameState.state));

      /* Запуск игры */
      if (gameState.players.length === 3) {
        colorfulLog("Minimum players reached. Starting game...", "info", "game");

        /* Создаём таймер и рассылаем всем */
        let gameStartTimerEnd = new Date(Date.now());
        gameStartTimerEnd.setSeconds(gameStartTimerEnd.getSeconds() + 10);
        io.emit(
          "startGameStartCountdown",
          JSON.stringify({ endTime: gameStartTimerEnd.getTime() })
        );

        gameStartTimer = setTimeout(() => {
          io.emit("resetGameStartCountdown");

          /* Раздаём темы для рисования */
          dealPrompts();

          /* Начинаем диалог хоста */
          emitHostDialogueAndAwait(
            io,
            gameState.players,
            [
              "1",
              /*"Welcome to this wonderful establishment!",
                "Here you will learn how to paint, bid, and lose all your money!",
                "Let's get started with a quick tutorial...",
                "First, you'll be given two painting prompts.",
                "Unleash your inner Leonardo Da Vinci and create a masterpiece for each prompt.",
                "You will be given 90 seconds, because true art cannot be rushed.",
                "Once the timer ends, the auction will start and your masterpieces will get a random price.",*/
            ],
            35,
            900,
            () => {
              gameState.state = "painting";
              io.emit("gameStateUpdate", JSON.stringify(gameState.state));

              /* Отправляем каждому игроку его темы для рисования */
              gameState.players.forEach((player) => {
                const playerSocket = io.sockets.sockets.get(player.socketID);

                const paintingObjectsToBeSent = gameState.artwork
                  .filter((a) => a.artist === player.playerID)
                  .map((painting) => ({ id: painting.id, prompt: painting.prompt }));

                playerSocket.emit("updatePaintingPrompts", JSON.stringify(paintingObjectsToBeSent));
              });

              io.emit("startPaintingTimer", JSON.stringify({ endTime: Date.now() + 90000 }));
              colorfulLog("Game state updated to 'painting' and broadcasted.", "info", "game");
              setTimeout(() => {
                colorfulLog("Painting phase ended. Starting auction phase...", "info", "game");
                emitHostDialogueAndAwait(
                  io,
                  gameState.players,
                  [
                    "2",
                    /*"Time's up! Put down your brushes and step away from your masterpieces.",
                      "It's time for the auction! Each of your paintings has been assigned a random price.",
                      "Remember, you cannot bid on your own artwork, so choose wisely.",*/
                  ],
                  35,
                  900,
                  () => {
                    gameState.state = "auction";
                    io.emit("gameStateUpdate", JSON.stringify(gameState.state));

                    /* Проверяем, все ли сдали свои работы */
                    replaceEmptyPaintings();

                    /* Отправляем каждому игроку 3 подсказки для аукциона */
                    gameState.players.forEach((player) => {
                      const otherPaintings = gameState.artwork.filter(
                        (a) => a.artist !== player.socketID
                      );
                      const shuffled = otherPaintings
                        .map((value) => ({ value, sort: Math.random() }))
                        .sort((a, b) => a.sort - b.sort)
                        .map(({ value }) => value);
                      const hints = shuffled.slice(0, 3).map((painting) => ({
                        prompt: painting.prompt,
                        price: painting.price,
                      }));
                      const playerSocket = io.sockets.sockets.get(player.socketID);
                      if (playerSocket) {
                        playerSocket.emit("auctionHints", JSON.stringify(hints));
                      }
                    });
                  }
                );
              }, 90000);
              gameStartTimer = null;
            }
          );
        }, gameStartTimerEnd.getTime() - Date.now());
      }
    } catch (e) {
      colorfulLog(`Error processing playerJoin request: ${e}`, "error", "socket");
      colorfulLog(
        `Invalid playerJoin payload - arg: ${arg}, error: ${e?.message}`,
        "warn",
        "socket"
      );
    }
  });

  socket.on("submitPainting", (arg, callback) => {
    colorfulLog(`Received submitPainting request`, "info", "socket");

    if (gameState.state !== "painting") {
      callback(JSON.stringify({ success: false, reason: "Not in painting phase." }));
      return;
    }

    try {
      let argObject = JSON.parse(arg);

      if (!argObject.base64 || typeof argObject.base64 !== "string") {
        callback(JSON.stringify({ success: false, reason: "Invalid image data." }));
        return;
      }

      if (argObject.base64.length > MAX_IMAGE_SIZE) {
        callback(JSON.stringify({ success: false, reason: "Image too large." }));
        return;
      }

      let painting = gameState.artwork.find((a) => a.id === argObject.id);
      let artist = gameState.players.find((p) => p.socketID === socket.id);
      if (!artist) {
        colorfulLog(`Player with socket ID ${socket.id} not found in game state.`, "error", "game");
        callback(JSON.stringify({ success: false, reason: "Player not found." }));
        return;
      } else if (!painting) {
        callback(JSON.stringify({ success: false, reason: "Painting not found." }));
      } else if (painting.artist === artist.playerID) {
        painting.base64 = argObject.base64;
        colorfulLog(
          `Painting ${argObject.id} submitted by player ${artist.playerID}`,
          "info",
          "game"
        );
        callback(JSON.stringify({ success: true }));
      } else {
        colorfulLog(
          `Player ${artist.playerID} attempted to submit painting ${argObject.id} they do not own`,
          "warn",
          "game"
        );
        callback(JSON.stringify({ success: false, reason: "You do not own this painting." }));
      }
    } catch (e) {
      colorfulLog(`Error processing submitPainting request: ${e}`, "error", "socket");
      colorfulLog(
        `Invalid submitPainting payload - arg: ${arg}, error: ${e?.message}`,
        "warn",
        "socket"
      );
      if (typeof callback === "function") {
        callback(JSON.stringify({ success: false, reason: "Invalid payload" }));
      }
    }
  });

  socket.on("disconnect", (reason) => {
    colorfulLog(`Client ${socket.id} disconnected. Reason: ${reason}`, "info", "connection");

    for (const tracker of dialogueTrackers.values()) {
      tracker.expected.delete(socket.id);
      tracker.responded.delete(socket.id);
    }

    const disconnectedPlayer = gameState.players.find((p) => p.socketID === socket.id);
    if (disconnectedPlayer) {
      const playersIndex = gameState.players.indexOf(disconnectedPlayer);
      if (playersIndex !== -1) {
        gameState.players.splice(playersIndex, 1);
      }
      colors.push(disconnectedPlayer.color);
      colorfulLog(`Disconnected player: ${disconnectedPlayer.nickname}`, "info", "player");
      io.emit("playerUpdate", JSON.stringify(gameState.players));
      if (gameState.players.length === 0) {
        colorfulLog("All players have left. Exiting the game.", "todo", "game");

        /* UNCOMMENT ONCE OUT OF TESTING */

        // exit(0);
      }
      if (gameState.players.length < 3 && gameState.state === "waiting") {
        if (gameStartTimer) {
          clearTimeout(gameStartTimer);
        }
        io.emit("resetGameStartCountdown");
        colorfulLog("Not enough players to start the game. Waiting timer cleared.", "info", "game");
      }
    }
  });
});
