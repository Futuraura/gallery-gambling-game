import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
const VERSION = process.env.APP_VERSION;

const io = new Server(3001, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log(`New client connected. Assigned the ID: ${socket.id}`);

  socket.on("openConnection", (arg, callback) => {
    console.log(arg);
    callback(JSON.stringify({ version: "Alpha DEV_0.0.1" }));
  });

  socket.on("playerJoin", (arg, callback) => {
    let argObject = JSON.parse(arg);
    if (argObject.playerName === "test") {
      console.log(`Rejecting player ${argObject.playerName}`);
      callback(JSON.stringify({ success: false, reason: "No." }));
    } else {
      console.log(`Adding player ${argObject.playerName}`);
      callback(JSON.stringify({ success: true }));
    }
  });
});
