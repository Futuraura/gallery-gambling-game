import { Server } from "socket.io";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config({ path: ".env" });
const VERSION = process.env.APP_VERSION;

let colors = ["red", "blue", "green", "orange", "purple", "yellow", "gray"];

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
    this.UUID = UUID;
    this.socketID = socketID;
    this.nickname = nickname;
    this.color = colors.slice(Math.floor(Math.random() * colors.length), 1);
    this.UUIDvalidUntil = UUIDvalidUntil;

    this.balance = 3000;
    this.loans = 0;
    this.paintings = 0;
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

const io = new Server(3001, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log(`New client connected. Assigned the ID: ${socket.id}`);

  socket.on("openConnection", (arg, callback) => {
    let argObject = JSON.parse(arg);
    if (argObject.UUID) {
      let player = players.find((p) => p.UUID === argObject.UUID);
      if (player) {
        player.socketID = socket.id;
        player.UUIDvalidUntil = Date.now() + 1800000;
        console.log(`Reconnected player ${player.nickname}`);
        return callback(
          JSON.stringify({
            UUID: player.UUID,
            UUIDvalidUntil: player.UUIDvalidUntil,
            version: VERSION,
            success: true,
          })
        );
      }
    }

    const newUUID = uuidv4();
    const UUIDvalidUntil = Date.now() + 1800000;

    callback(
      JSON.stringify({
        UUID: newUUID,
        UUIDvalidUntil: UUIDvalidUntil,
        version: VERSION,
        success: true,
      })
    );
  });

  socket.on("playerJoin", (arg, callback) => {
    try {
      let argObject = JSON.parse(arg);
      if (argObject.playerName === "test") {
        console.log(`Rejecting player ${argObject.playerName}`);
        callback(JSON.stringify({ success: false, reason: "No." }));
      } else {
        console.log(`Adding player ${argObject.playerName}`);
        callback(JSON.stringify({ success: true }));
      }
    } catch (e) {
      console.warn("Invalid playerJoin payload", { arg, error: e?.message });
      if (typeof callback === "function")
        callback({ success: false, reason: "Invalid payload" });
    }
  });
});
