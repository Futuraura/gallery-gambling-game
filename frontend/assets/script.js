let config = fetch("./assets/config.json").then((response) => {
  return response.json();
});
const socket = io(config.backendIP, { transports: ["websocket"] });

const waitingScreenDiv = document.getElementById("waitingScreenDiv");
const loadingScreenDiv = document.getElementById("loadingScreenDiv");
const endScreen = document.getElementById("endScreen");
const bankDiv = document.getElementById("bankDiv");
const auctionDiv = document.getElementById("auctionDiv");
const paintingDiv = document.getElementById("paintingDiv");
const mainMenuDiv = document.getElementById("mainMenuDiv");
const versionNumber = document.getElementById("versionNumber");

function throwError(code, details) {
  const errorCode = document.getElementById("errorCode");
  const errorDetails = document.getElementById("errorMoreInfo");
  const errorDiv = document.getElementById("somethingWentWrongDiv");

  errorDiv.style.display = "flex";

  errorCode.innerText = code;
  errorDetails.innerText = details;
}

function switchScreen(screen) {
  waitingScreenDiv.style.display = "none";
  loadingScreenDiv.style.display = "none";
  endScreen.style.display = "none";
  bankDiv.style.display = "none";
  auctionDiv.style.display = "none";
  paintingDiv.style.display = "none";
  mainMenuDiv.style.display = "none";

  screen.style.display = "flex";
}

socket.on("playerUpdate", (data) => {
  let players = JSON.parse(data);
  const playerListAuction = document.getElementById("playerListAuction");
  const playerListPainting = document.getElementById("playerListPainting");
  playerListAuction.innerHTML = "";
  playerListPainting.innerHTML = "";
  players.forEach((element) => {
    const playerDiv = document.createElement("div");
    playerDiv.classList.add("player");
    playerDiv.innerHTML = `
      <p class="playerNickname">${element.nickname}</p>
      <img src="./assets/img/player.svg" style="color: ${element.color}" />
    `;
    playerListAuction.appendChild(playerDiv);
    playerListPainting.appendChild(playerDiv.cloneNode(true));
  });
  document.getElementById("connectedPlayersCount").innerText = players.length;
});

const dotsElem = document.getElementById("connectedDots");
const frames = ["", ".", "..", "..."];
let frame = 0;
setInterval(() => {
  dotsElem.innerText = frames[frame];
  frame = (frame + 1) % frames.length;
}, 300);

socket.on("gameStateUpdate", (data) => {
  let gameState = JSON.parse(data);
  switch (gameState) {
    case "waiting":
      switchScreen(waitingScreenDiv);
      break;
    case "painting":
      switchScreen(paintingDiv);
      break;
    case "auction":
      switchScreen(auctionDiv);
      break;
    case "bank":
      switchScreen(bankDiv);
      break;
  }
});

socket.on("connect", () => {
  socket
    .timeout(5000)
    .emit("openConnection", JSON.stringify({}), (err, res) => {
      if (err) {
        throwError("0x002", "Handshake timeout.");
        return;
      }

      let objectRes = JSON.parse(res);

      if (objectRes.success === false) {
        throwError("0x003", "Handshake failed.");
        return;
      }

      versionNumber.innerText = objectRes.version;

      mainMenuDiv.style.display = "flex";
      loadingScreenDiv.classList.toggle("hidden");

      loadingScreenDiv.addEventListener("transitionend", () => {
        loadingScreenDiv.style.display = "none";
      });
    });
});

socket.on("disconnect", () => {
  throwError("0x001", "Disconnected from server.");
});

document
  .getElementById("startMenuStartButton")
  .addEventListener("click", (e) => {
    socket.emit(
      "playerJoin",
      JSON.stringify({
        playerName: document.getElementById("nickNameInput").value,
      }),
      (res) => {
        let resObject = JSON.parse(res);
        if (!resObject.success) {
          Toastify({
            text: resObject.reason,
            duration: 3000,
            gravity: "bottom",
            position: "right",
            style: {
              background: "linear-gradient(to right, #ff0000, #c0392b)",
            },
          }).showToast();
        }
      }
    );
  });
