import { Server } from "socket.io";
import dotenv from "dotenv";
import { createServer } from "http";
import { v4 } from "uuid";
import * as fs from "fs";

/* TODO:
- Refactor the whole shit to support multiple rooms
Maybe databases would be nice?

- !!!!! ADD SOME DAMN COMMENTS HERE !!!

- Add input sanitization, EVERYWHERE.
- Remove the Hash from the files.
- Implement rate limiting for incoming connections.
- Consider using a logging library instead of making a whole function for that.

- Split the whole shit into different files for easier management.
Maybe redo everything in an MVC or a service-based structure.
backend/
  ├── app.js
  ├── server.js
  ├── sockets/
  │     ├── game.js
  │     └── admin.js
  ├── models/
  │     └── player.js
  ├── utils/
  │     └── logger.js
  └── config/
        └── index.js

- Add the ascii art category names that are present in frontend for easier finding of everything.

- [CODERABBIT] Refactor deeply nested callbacks and extract constants.

  This code segment has become difficult to maintain due to:

  Deeply nested callbacks (4+ levels) creating "callback hell"
  Magic numbers that should be named constants
  All game initialization logic crammed into one place
  Consider:

  Using async/await or Promises to flatten the callback structure
  Extracting magic numbers to named constants
  Breaking down the initialization into smaller functions
*/

dotenv.config({ path: ".env", quiet: true });
const VERSION = process.env.APP_VERSION;
const MAX_IMAGE_SIZE = process.env.MAX_IMAGE_SIZE_MB
  ? parseInt(process.env.MAX_IMAGE_SIZE_MB) * 1024 * 1024
  : 5 * 1024 * 1024;
const HOST = process.env.HOST;
const PORT = process.env.PORT;

console.log(`--------------------------------------------------------`);
colorfulLog(`App version: ${VERSION}`, "info", "startup");
colorfulLog(`Max image size: ${MAX_IMAGE_SIZE} bytes`, "info", "startup");
colorfulLog(`Host: ${HOST}`, "info", "startup");
colorfulLog(`Port: ${PORT}`, "info", "startup");
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
      JSON.parse(fs.readFileSync("jackboxPrompts/prompts.json", "utf-8"))
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
      artist: gameState.players[i].playerID,
      price: Math.max(400, Math.round((Math.random() * 4000) / 100) * 100),
      base64: "",
    });
    gameState.artwork.push({
      id: prompt2.id,
      prompt: prompt2.text,
      artist: gameState.players[(i + 1) % gameState.players.length].playerID,
      price: Math.max(400, Math.round((Math.random() * 4000) / 100) * 100),
      base64: "",
    });
  }
}

function replaceEmptyPaintings() {
  didHaveEmpty = false;

  for (let painting of gameState.artwork) {
    if (!painting.base64 || painting.base64.length === 0) {
      colorfulLog(
        `Painting ${painting.id} by player ${painting.artist} is empty. Replacing with placeholder.`,
        "warn",
        "game"
      );
      painting.base64 = fs.readFileSync(`jackboxPrompts/placeholders/${painting.id}.png`, "utf-8");
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

function canPlayerJoin(nickname) {
  if (nickname === "admin") {
    colorfulLog(`Rejecting player ${nickname} - name not allowed`, "warn", "validation");
    return [true, "Name not allowed."];
  } else if (gameState.players.find((p) => p.nickname === nickname)) {
    colorfulLog(`Rejecting player ${nickname} - name already taken`, "warn", "validation");
    return [true, "Name already taken."];
  } else if (nickname.length < 3 || nickname.length > 16) {
    colorfulLog(`Rejecting player ${nickname} - invalid name length`, "warn", "validation");
    return [true, "Invalid name length."];
  } else if (nickname.match(/[^a-zA-Z0-9_]/)) {
    colorfulLog(`Rejecting player ${nickname} - invalid characters`, "warn", "validation");
    return [true, "Invalid characters."];
  } else if (colors.length === 0) {
    colorfulLog(`Rejecting player ${nickname} - game is full`, "warn", "validation");
    return [true, "The game is full."];
  } else if (gameState.state === "ended") {
    colorfulLog(`Rejecting player ${nickname} - game has ended`, "warn", "validation");
    return [true, "Game has ended."];
  }
  return false;
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
      colorfulLog(`Parsed playerJoin object:`, "info", "socket", argObject);

      /* Running some validations for the player nickname */

      if (argObject.playerName === "admin") {
        colorfulLog(
          `Rejecting player ${argObject.playerName} - name not allowed`,
          "warn",
          "validation"
        );
        callback(JSON.stringify({ success: false, reason: "Nah." }));
      } else if (gameState.players.find((p) => p.nickname === argObject.playerName)) {
        colorfulLog(
          `Rejecting player ${argObject.playerName} - name already taken`,
          "warn",
          "validation"
        );
        callback(JSON.stringify({ success: false, reason: "Name already taken." }));
      } else if (argObject.playerName.length < 3 || argObject.playerName.length > 16) {
        colorfulLog(
          `Rejecting player ${argObject.playerName} - invalid name length`,
          "warn",
          "validation"
        );
        callback(JSON.stringify({ success: false, reason: "Invalid name length." }));
      } else if (argObject.playerName.match(/[^a-zA-Z0-9_]/)) {
        colorfulLog(
          `Rejecting player ${argObject.playerName} - invalid characters`,
          "warn",
          "validation"
        );
        callback(JSON.stringify({ success: false, reason: "Invalid characters." }));
      } else {
        /* All validations passed, proceed to add the player */

        colorfulLog(
          `Processing join request for player: ${argObject.playerName}`,
          "info",
          "player"
        );
        colorfulLog(`Available colors remaining: ${colors.length}`, "info", "game");

        if (colors.length === 0) {
          colorfulLog("No colors left! Game is full.", "warn", "game");
          callback(JSON.stringify({ success: false, reason: "The game is full." }));
        } else if (gameState.state === "ended") {
          colorfulLog("Game has ended. No new players can join.", "warn", "game");
          callback(JSON.stringify({ success: false, reason: "Game has ended." }));
        } else {
          colorfulLog(
            `Accepting player ${argObject.playerName} - colors available: ${colors.join(", ")}`,
            "info",
            "player"
          );
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
          if (gameState.players.length === 3) {
            colorfulLog("Minimum players reached. Starting game...", "info", "game");

            {
              const date = new Date(Date.now());
              date.setSeconds(date.getSeconds() + 10);
              io.emit("startGameStartCountdown", JSON.stringify({ endTime: date.getTime() }));
            }
            gameStartTimer = setTimeout(() => {
              gameState.state = "intermission";
              io.emit("gameStateUpdate", JSON.stringify(gameState.state));
              io.emit("cancelGameStartCountdown");

              emitHostDialogueAndAwait(
                io,
                gameState.players,
                [
                  "Welcome to this <b>WoNdRfUl</b> establishment.",
                  "Here you will learn how to paint, bid, and lose all your money!",
                  "Let's get started with a quick tutorial...",
                ],
                35,
                900,
                () => {
                  gameState.state = "painting";
                  io.emit("gameStateUpdate", JSON.stringify(gameState.state));
                  gameState.players.forEach((player) => {
                    const playerSocket = io.sockets.sockets.get(player.socketID);
                    if (playerSocket) {
                      const paintingObjectsToBeSent = [];
                      for (let i = 1; i <= 2; i++) {
                        let paintingObject = {
                          id: gameState.artwork.length + 1,
                          artist: player.socketID,
                          prompt: paintingThemes.pop(),
                          price: Math.max(400, Math.round((Math.random() * 5000) / 100) * 100),
                          base64: "",
                        };
                        gameState.artwork.push(paintingObject);
                        paintingObjectsToBeSent.push({
                          id: paintingObject.id,
                          prompt: paintingObject.prompt,
                        });
                      }
                      playerSocket.emit(
                        "updatePaintingPrompts",
                        JSON.stringify(paintingObjectsToBeSent)
                      );
                    }
                  });
                  io.emit("startPaintingTimer", JSON.stringify({ endTime: Date.now() + 90000 }));
                  colorfulLog("Game state updated to 'painting' and broadcasted.", "info", "game");
                  setTimeout(() => {
                    gameState.state = "auction";
                    io.emit("gameStateUpdate", JSON.stringify(gameState.state));
                    colorfulLog("Game state updated to 'auction' and broadcasted.", "info", "game");
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
                  }, 90000);
                  gameStartTimer = null;
                }
              );
            }, 10000);
          }
        }
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
      colorfulLog(`Parsed submitPainting object:`, "info", "socket", argObject);

      // Validate base64 data
      if (!argObject.base64 || typeof argObject.base64 !== "string") {
        callback(JSON.stringify({ success: false, reason: "Invalid image data." }));
        return;
      }

      if (argObject.base64.length > MAX_IMAGE_SIZE) {
        callback(JSON.stringify({ success: false, reason: "Image too large." }));
        return;
      }

      let painting = gameState.artwork.find((a) => a.id === argObject.id);
      if (!painting) {
        callback(JSON.stringify({ success: false, reason: "Painting not found." }));
      } else if (painting.artist === socket.id) {
        painting.base64 = argObject.base64;
        colorfulLog(`Painting ${argObject.id} submitted by player ${socket.id}`, "info", "game");
        callback(JSON.stringify({ success: true }));
      } else {
        colorfulLog(
          `Player ${socket.id} attempted to submit painting ${argObject.id} they do not own`,
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
        colorfulLog("Not enough players to start the game. Waiting timer cleared.", "info", "game");
      }
    }
  });
});
