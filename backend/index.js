import { Server } from "socket.io";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

console.log("Starting application...");
dotenv.config({ path: ".env" });
const VERSION = process.env.APP_VERSION;
console.log(`App version: ${VERSION}`);

let colors = ["red", "blue", "green", "orange", "purple", "yellow", "gray"];
console.log(`Available colors: ${colors.join(", ")}`);

let gameState = {
  state: "waiting", // waiting, painting, auction, bank, ended
  players: [],
};

class Player {
  UUID;
  socketID;
  nickname;
  color;
  UUIDvalidUntil;

  balance;
  loans;
  paintings;

  constructor(UUID, socketID, nickname, UUIDvalidUntil) {
    console.log(
      `Creating new player:\nUUID: ${UUID}\nsocketID: ${socketID}\nnickname: ${nickname}`
    );
    this.UUID = UUID;
    this.socketID = socketID;
    this.nickname = nickname;
    this.color = colors.slice(Math.floor(Math.random() * colors.length), 1);
    this.UUIDvalidUntil = UUIDvalidUntil;

    this.balance = 3000;
    this.loans = 0;
    this.paintings = 0;
    console.log(
      `Player created with:\ncolor: ${this.color}\nbalance: ${this.balance}`
    );
  }

  getPlayerInfo() {
    console.log(`
UUID: ${this.UUID}
SocketID: ${this.socketID}
Nickname: ${this.nickname}
Color: ${this.color}
Balance: ${this.balance}
Loans: ${this.loans}
Paintings: ${this.paintings}
    `);
  }
}

let players = [];
console.log("Players array initialized");

const io = new Server(3001, {
  cors: {
    origin: "*",
  },
});
console.log("Socket.IO server created on port 3001");

io.on("connection", (socket) => {
  console.log(`New client connected. Assigned the ID: ${socket.id}`);
  console.log(`Total active connections: ${io.engine.clientsCount}`);

  socket.on("openConnection", (arg, callback) => {
    console.log(`Received openConnection request: ${arg}`);
    let argObject = JSON.parse(arg);
    console.log(`Parsed argument object:`, argObject);

    if (argObject.UUID) {
      console.log(`Looking for existing player with UUID: ${argObject.UUID}`);
      let player = players.find((p) => p.UUID === argObject.UUID);
      if (player) {
        console.log(`Found existing player: ${player.nickname}`);
        player.socketID = socket.id;
        player.UUIDvalidUntil = Date.now() + 1800000;
        console.log(
          `Reconnected player ${player.nickname} with new socket ID: ${socket.id}`
        );
        return callback(
          JSON.stringify({
            UUID: player.UUID,
            UUIDvalidUntil: player.UUIDvalidUntil,
            version: VERSION,
            success: true,
          })
        );
      } else {
        console.log(`No existing player found with UUID: ${argObject.UUID}`);
      }
    } else {
      console.log("No UUID provided in request");
    }

    const newUUID = uuidv4();
    const UUIDvalidUntil = Date.now() + 1800000;
    console.log(
      `Generated new UUID: ${newUUID}, valid until: ${new Date(UUIDvalidUntil)}`
    );

    callback(
      JSON.stringify({
        UUID: newUUID,
        UUIDvalidUntil: UUIDvalidUntil,
        version: VERSION,
        success: true,
      })
    );
    console.log(`Sent new UUID response to client`);
  });

  socket.on("playerJoin", (arg, callback) => {
    console.log(`Received playerJoin request: ${arg}`);
    try {
      let argObject = JSON.parse(arg);
      console.log(`Parsed playerJoin object:`, argObject);

      if (argObject.playerName === "test") {
        console.log(
          `Rejecting player ${argObject.playerName} - test name not allowed`
        );
        callback(JSON.stringify({ success: false, reason: "Nah." }));
      } else {
        console.log(
          `Processing join request for player: ${argObject.playerName}`
        );
        console.log(`Available colors remaining: ${colors.length}`);

        if (colors.length === 0) {
          console.log("No colors left! Game is full.");
          callback(
            JSON.stringify({ success: false, reason: "The game is full." })
          );
        } else {
          console.log(
            `Accepting player ${
              argObject.playerName
            } - colors available: ${colors.join(", ")}`
          );
          callback(JSON.stringify({ success: true }));
        }
      }
    } catch (e) {
      console.error("Error processing playerJoin request:", e);
      console.warn("Invalid playerJoin payload", { arg, error: e?.message });
      if (typeof callback === "function") {
        console.log("Sending error response to client");
        callback({ success: false, reason: "Invalid payload" });
      }
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`Client ${socket.id} disconnected. Reason: ${reason}`);
    console.log(`Total active connections: ${io.engine.clientsCount}`);

    const disconnectedPlayer = players.find((p) => p.socketID === socket.id);
    if (disconnectedPlayer) {
      console.log(
        `Disconnected player: ${disconnectedPlayer.nickname} (UUID: ${disconnectedPlayer.UUID})`
      );
    }
  });
});
