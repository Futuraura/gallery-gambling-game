import { Server } from "socket.io";
import dotenv from "dotenv";
import { createServer } from "http";
import bcrypt from "bcrypt";

/* TODO:
- Refactor the whole shit to support multiple rooms
Maybe databases would be nice?

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
*/

let gameStartTimer = null;

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

/* Painting themes, randomized*/

let paintingThemes = [
  "Car Dealership",
  "Juice",
  "Parking Lot",
  "Roadmap",
  "Skateboard",
  "Party",
  "Mona Lisa",
  "Hello World!",
  "Sunset",
  "Mountain",
  "A roll of toilet paper",
  "Cat",
  "Dog",
  "House",
  "Tree",
  "Wrist watch",
  "Bank™ Logo",
  "A single sock",
  "A broken pencil",
  "A spilled drink",
  "A sandwich cut in half",
  "A traffic cone",
  "A shopping cart",
  "A mailbox",
  "A slice of watermelon",
  "A paper airplane",
  "A pair of sunglasses",
  "A rubber duck",
  "A pizza box",
  "A cactus in a pot",
  "A snow globe",
  "A chess piece",
  "A lightbulb",
  "A ladder",
  "A pair of boots",
  "A kite",
  "A mug with steam",
  "A traffic light",
  "A calendar page",
  "A doormat",
  "A slice of cheese",
  "A paintbrush",
  "A keychain",
  "A sticky note",
  "A remote control",
  "A pillow",
  "A goldfish bowl",
  "A bar of soap",
]
  .map((a) => ({ sort: Math.random(), value: a }))
  .sort((a, b) => a.sort - b.sort)
  .map((a) => a.value);

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
    this.getPlayerInfo();
  }

  getPlayerInfo() {
    colorfulLog(
      `Player info: SocketID: ${this.socketID}, Nickname: ${this.nickname}, Color: ${this.color}, Balance: ${this.balance}, Loans: ${this.loans}`,
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
  colorfulLog(`Total active connections: ${io.engine.clientsCount}`, "info", "connection");

  socket.on("adminOverride", (arg, callback) => {
    let argObject = JSON.parse(arg);
    colorfulLog(`Received adminOverride request`, "info", "admin");
    /* Example admin override structure:
    {
      password: "adminPassword",
      command: "overrideGameState", // Possible actions: overrideGameState, kickPlayer
      parameters: "" // could be anything, but for overrideGameState it would be the new state
    }

    Callbacks are for later use, currently not implemented on frontend
    */
    bcrypt.compare(argObject.password, process.env.ADMIN_OVERRIDE_HASH).then((result) => {
      if (result) {
        colorfulLog("Admin password correct", "info", "admin");
        switch (argObject.command) {
          case "overrideGameState":
            if (
              ["waiting", "painting", "auction", "bank", "ended"].includes(argObject.parameters)
            ) {
              gameState.state = argObject.parameters;
              io.emit("gameStateUpdate", JSON.stringify(gameState.state));
              colorfulLog(`Game state overridden to ${argObject.parameters}`, "info", "admin");
              /* callback(JSON.stringify({ success: true }));*/
            } else {
              colorfulLog(`Invalid game state: ${argObject.parameters}`, "warn", "admin");
              /* callback(
                JSON.stringify({
                  success: false,
                  reason: "Invalid game state",
                })
              ); */
            }
            break;
          case "startTimer":
            const date = new Date(Date.now());
            date.setMinutes(date.getMinutes() + 1);
            date.setSeconds(date.getSeconds() + 30);
            io.emit("startTimer", JSON.stringify({ endTime: date.getTime() }));
        }
      } else {
        colorfulLog("Admin password incorrect", "warn", "admin");
        /* callback(JSON.stringify({ success: false, reason: "Invalid admin password" })); */
      }
    });
  });

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
          `Rejecting player ${argObject.playerName} - test name not allowed`,
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
          io.emit("playerUpdate", JSON.stringify(gameState.players));
          socket.emit("gameStateUpdate", JSON.stringify(gameState.state));
          if (gameState.players.length === 3) {
            colorfulLog("Minimum players reached. Starting game...", "info", "game");

            /* TBD: Make this into a ticking timer on user's screen and make the game begin properly */
            {
              const date = new Date(Date.now());
              date.setSeconds(date.getSeconds() + 10);
              io.emit("startGameStartCountdown", JSON.stringify({ endTime: date.getTime() }));
            }
            gameStartTimer = setTimeout(() => {
              gameState.state = "painting";
              io.emit("gameStateUpdate", JSON.stringify(gameState.state));
              io.emit("cancelGameStartCountdown");
              gameState.players.forEach((player) => {
                const playerSocket = io.sockets.sockets.get(player.socketID);
                if (playerSocket) {
                  const paintingObjectsToBeSent = [];

                  for (let i = 1; i <= 2; i++) {
                    /* Later the socket can be used to check whether the player is that exact player or it's a fake */

                    let paintingObject = {
                      id: gameState.artwork.length + 1,
                      artist: player.socketID,
                      prompt: paintingThemes.pop(),
                      price: Math.round((Math.random() * 5000) / 100) * 100,
                      base64: "",
                    };

                    if (paintingObject.price <= 300) paintingObject.price = 400;

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
              gameStartTimer = null;
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
      if (typeof callback === "function") {
        colorfulLog("Sending error response to client", "info", "socket");
        callback(JSON.stringify({ success: false, reason: "Invalid payload" }));
      }
    }
  });

  socket.on("submitPainting", (arg, callback) => {
    colorfulLog(`Received submitPainting request`, "info", "socket");
    /* Example submitPainting structure:
    {
      id: 1,
      base64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAYAAAC0..."
    }
    */
    try {
      let argObject = JSON.parse(arg);
      colorfulLog(`Parsed submitPainting object:`, "info", "socket", argObject);
      let painting = gameState.artwork.find((a) => a.id === argObject.id);
      if (painting) {
        if (painting.artist === socket.id) {
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
      }
    } catch (e) {
      colorfulLog(`Error processing submitPainting request: ${e}`, "error", "socket");
      colorfulLog(
        `Invalid submitPainting payload - arg: ${arg}, error: ${e?.message}`,
        "warn",
        "socket"
      );
    }
  });

  socket.on("disconnect", (reason) => {
    colorfulLog(`Client ${socket.id} disconnected. Reason: ${reason}`, "info", "connection");
    colorfulLog(`Total active connections: ${io.engine.clientsCount}`, "info", "connection");

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
