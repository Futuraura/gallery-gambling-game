import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 3001 });

let availableColors = [
  "red",
  "blue",
  "green",
  "yellow",
  "gray",
  "orange",
  "purple",
];

let players = {};

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    let objectData = JSON.parse(data);
    switch (objectData.type) {
      case "addPlayer":
        console.log(`Player ${objectData.playerName} added!`);
        ws.send();

        break;

      default:
        break;
    }
  });

  ws.send("sumthin");
});
