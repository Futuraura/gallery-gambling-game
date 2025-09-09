import { Server } from "socket.io";
import dotenv from "dotenv";
import { createServer } from "http";
import { clear } from "console";

function colorfulLog(message, mode = "info", department = "general") {
  const timestamp = new Date().toISOString();
  const colors = {
    todo: "\u001b[34m", // Light Blue
    info: "\u001b[32m", // Light Green
    warn: "\u001b[33m", // Yellow
    error: "\u001b[31m", // Red
  };

  console.log(
    `[${timestamp}] [${department.toUpperCase()}]\t${
      colors[mode]
    }${message}\x1b[0m`
  );
}

colorfulLog("Starting application...", "info", "startup");
dotenv.config({ path: ".env" });
const VERSION = process.env.APP_VERSION;
colorfulLog(`App version: ${VERSION}`, "info", "startup");

let colors = ["red", "blue", "green", "orange", "purple", "yellow", "gray"];
colorfulLog(`Available colors: ${colors.join(", ")}`, "info", "startup");

let gameState = {
  state: "waiting", // waiting, painting, auction, bank, ended
  /* 
    Example artwork structure for future use:
    {
      id: 1,
      prompt: "A duck",
      artist: <playerID>,
      price: 4800,
      base64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAYAAAC0...",
    }
  */
  artwork: [],
  players: [],
};

class Player {
  socketID;
  nickname;
  color;

  balance;
  loans;
  paintings;

  constructor(socketID, nickname) {
    this.socketID = socketID;
    this.nickname = nickname;
    this.color = colors.splice(Math.floor(Math.random() * colors.length), 1)[0];

    this.balance = 3000;
    this.loans = 0;
    this.paintings = 0;
    this.getPlayerInfo();
  }

  getPlayerInfo() {
    colorfulLog(
      `Player info: SocketID: ${this.socketID}, Nickname: ${this.nickname}, Color: ${this.color}, Balance: ${this.balance}, Loans: ${this.loans}, Paintings: ${this.paintings}`,
      "info",
      "player"
    );
  }
}

colorfulLog("Players array initialized", "info", "game");

const httpServer = createServer();
colorfulLog("HTTP server created", "info", "startup");

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

const HOST = process.env.HOST;
const PORT = process.env.PORT;

httpServer.listen(PORT, HOST, () => {
  colorfulLog(`HTTP server listening on ${HOST}:${PORT}`, "info", "startup");
});

colorfulLog("Socket.IO server created", "info", "startup");

io.on("connection", (socket) => {
  colorfulLog(
    `New client connected from ${socket.handshake.address}. Assigned the ID: ${socket.id}`,
    "info",
    "connection"
  );
  colorfulLog(
    `Total active connections: ${io.engine.clientsCount}`,
    "info",
    "connection"
  );

  socket.on("openConnection", (arg, callback) => {
    colorfulLog(`Received openConnection request: ${arg}`, "info", "socket");

    callback(
      JSON.stringify({
        version: VERSION,
        success: true,
      })
    );
  });

  socket.on("playerJoin", (arg, callback) => {
    colorfulLog(`Received playerJoin request: ${arg}`, "info", "socket");
    try {
      let argObject = JSON.parse(arg);
      colorfulLog(`Parsed playerJoin object:`, "info", "socket", argObject);

      /* Running some validations for the player nickname */

      if (argObject.playerName === "test") {
        colorfulLog(
          `Rejecting player ${argObject.playerName} - test name not allowed`,
          "warn",
          "validation"
        );
        callback(JSON.stringify({ success: false, reason: "Nah." }));
      } else if (
        gameState.players.find((p) => p.nickname === argObject.playerName)
      ) {
        colorfulLog(
          `Rejecting player ${argObject.playerName} - name already taken`,
          "warn",
          "validation"
        );
        callback(
          JSON.stringify({ success: false, reason: "Name already taken." })
        );
      } else if (
        argObject.playerName.length < 3 ||
        argObject.playerName.length > 16
      ) {
        colorfulLog(
          `Rejecting player ${argObject.playerName} - invalid name length`,
          "warn",
          "validation"
        );
        callback(
          JSON.stringify({ success: false, reason: "Invalid name length." })
        );
      } else if (argObject.playerName.match(/[^a-zA-Z0-9_]/)) {
        colorfulLog(
          `Rejecting player ${argObject.playerName} - invalid characters`,
          "warn",
          "validation"
        );
        callback(
          JSON.stringify({ success: false, reason: "Invalid characters." })
        );
      } else {
        /* All validations passed, proceed to add the player */
        colorfulLog(
          `Processing join request for player: ${argObject.playerName}`,
          "info",
          "player"
        );
        colorfulLog(
          `Available colors remaining: ${colors.length}`,
          "info",
          "game"
        );

        if (colors.length === 0) {
          colorfulLog("No colors left! Game is full.", "warn", "game");
          callback(
            JSON.stringify({ success: false, reason: "The game is full." })
          );
        } else if (gameState.state === "ended") {
          colorfulLog(
            "Game has ended. No new players can join.",
            "warn",
            "game"
          );
          callback(
            JSON.stringify({ success: false, reason: "Game has ended." })
          );
        } else {
          colorfulLog(
            `Accepting player ${
              argObject.playerName
            } - colors available: ${colors.join(", ")}`,
            "info",
            "player"
          );
          gameState.players.push(new Player(socket.id, argObject.playerName));
          callback(JSON.stringify({ success: true }));
          io.emit("playerUpdate", JSON.stringify(gameState.players));
          socket.emit("gameStateUpdate", JSON.stringify(gameState.state));
          if (gameState.players.length >= 3) {
            colorfulLog(
              "Minimum players reached. Starting game...",
              "info",
              "game"
            );

            /* TBD: Make this into a ticking timer on user's screen and make the game begin properly */
            var gameStartTimer = setTimeout(() => {
              gameState.state = "painting";
              io.emit("gameStateUpdate", JSON.stringify(gameState.state));
              colorfulLog(
                "Game state updated to 'painting' and broadcasted.",
                "info",
                "game"
              );
              gameStartTimer = null;
            }, 10000);
          }
        }
      }
    } catch (e) {
      colorfulLog(
        `Error processing playerJoin request: ${e}`,
        "error",
        "socket"
      );
      colorfulLog(
        `Invalid playerJoin payload - arg: ${arg}, error: ${e?.message}`,
        "warn",
        "socket"
      );
      if (typeof callback === "function") {
        colorfulLog("Sending error response to client", "info", "socket");
        callback(JSON.stringify({ success: false, reason: "Invalid payload" }));
      }
    }
  });

  socket.on("disconnect", (reason) => {
    colorfulLog(
      `Client ${socket.id} disconnected. Reason: ${reason}`,
      "info",
      "connection"
    );
    colorfulLog(
      `Total active connections: ${io.engine.clientsCount}`,
      "info",
      "connection"
    );

    const disconnectedPlayer = gameState.players.find(
      (p) => p.socketID === socket.id
    );
    if (disconnectedPlayer) {
      const playersIndex = gameState.players.indexOf(disconnectedPlayer);
      if (playersIndex !== -1) {
        gameState.players.splice(playersIndex, 1);
      }
      colors.push(disconnectedPlayer.color);
      colorfulLog(
        `Disconnected player: ${disconnectedPlayer.nickname}`,
        "info",
        "player"
      );
      io.emit("playerUpdate", JSON.stringify(gameState.players));
      if (gameState.players.length === 0) {
        /* TBD: Reset game state if all players leave */
        colorfulLog(
          "All players have left. Game state reset TBD.",
          "todo",
          "game"
        );
      }
      if (gameState.players.length < 3 && gameState.state === "waiting") {
        if (gameStartTimer) clearTimeout(gameStartTimer);
        colorfulLog(
          "Not enough players to start the game. Waiting timer cleared.",
          "info",
          "game"
        );
      }
    }
  });
});
