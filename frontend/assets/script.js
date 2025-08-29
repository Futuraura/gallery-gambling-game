const loadingScreen = document.getElementById("loadingScreenDiv");
let webSocket;

fetch("./assets/config.json")
  .then((r) => r.json())
  .then((config) => {
    console.log(`Connecting to websocket ${config.webSocketIP}`);
    webSocket = new WebSocket(config.webSocketIP);
  });

window.addEventListener("load", () => {
  loadingScreen.classList.toggle("hidden");

  loadingScreen.addEventListener("transitionend", () => {
    loadingScreen.style.display = "none";
  });
});

const startButton = document.getElementById("startmenuStartButton");

startButton.addEventListener("click", (e) => {
  let playerInfo = {
    type: "addPlayer",
    playerName: document.getElementById("nickNameInput").value,
  };
  webSocket.send(JSON.stringify(playerInfo));
});
