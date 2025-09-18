let socket;

const waitingScreenDiv = document.getElementById("waitingScreenDiv");
const loadingScreenDiv = document.getElementById("loadingScreenDiv");
const endScreen = document.getElementById("endScreen");
const bankDiv = document.getElementById("bankDiv");
const auctionDiv = document.getElementById("auctionDiv");
const paintingDiv = document.getElementById("paintingDiv");
const mainMenuDiv = document.getElementById("mainMenuDiv");
const versionNumber = document.getElementById("versionNumber");

const promptElement = document.getElementById("currentPrompt");
const promptCounter = document.getElementById("currentPromptIndex");

const paintingCanvas = document.getElementById("paintingCanvas");

let gameState = {
  paintingPrompts: [],
  promptsSubmitted: 0,
};

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
  endScreen.style.display = "none";
  bankDiv.style.display = "none";
  auctionDiv.style.display = "none";
  paintingDiv.style.display = "none";
  mainMenuDiv.style.display = "none";

  screen.style.display = "flex";

  if (screen === paintingDiv) {
    setCanvasBackground();
  }
}

function startTimer(endTime, timerElement) {
  if (!timerElement) {
    console.error("Timer element not found");
    return;
  }

  if (timerElement._interval) {
    clearInterval(timerElement._interval);
  }

  timerElement._interval = setInterval(() => {
    const now = Date.now();
    const diff = endTime - now;

    if (diff <= 0) {
      timerElement.innerText = "00:00:00";
      clearInterval(timerElement._interval);
      return;
    }

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    const milliseconds = Math.floor((diff % 1000) / 10);
    timerElement.innerText = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}:${String(milliseconds).padStart(2, "0")}`;
  }, 10);
}

function cancelTimer(timerElement) {
  if (timerElement && timerElement._interval) {
    clearInterval(timerElement._interval);
    timerElement.innerText = "00:00:00";
  }
}

function displayCurrentPrompt() {
  promptElement.innerText = gameState.paintingPrompts[gameState.promptsSubmitted].prompt;
  promptCounter.innerText = gameState.promptsSubmitted + 1;
}

/*
 /$$$$$$           /$$   /$$                                         /$$                   /$$    
|_  $$_/          |__/  | $$                                        | $$                  | $$    
  | $$   /$$$$$$$  /$$ /$$$$$$          /$$$$$$$  /$$$$$$   /$$$$$$$| $$   /$$  /$$$$$$  /$$$$$$  
  | $$  | $$__  $$| $$|_  $$_/         /$$_____/ /$$__  $$ /$$_____/| $$  /$$/ /$$__  $$|_  $$_/  
  | $$  | $$  \ $$| $$  | $$          |  $$$$$$ | $$  \ $$| $$      | $$$$$$/ | $$$$$$$$  | $$    
  | $$  | $$  | $$| $$  | $$ /$$       \____  $$| $$  | $$| $$      | $$_  $$ | $$_____/  | $$ /$$
 /$$$$$$| $$  | $$| $$  |  $$$$/       /$$$$$$$/|  $$$$$$/|  $$$$$$$| $$ \  $$|  $$$$$$$  |  $$$$/
|______/|__/  |__/|__/   \___/        |_______/  \______/  \_______/|__/  \__/ \_______/   \___/  
*/

/* TODO:
- Add error catching for if the JSON is invalid. Wrap the JSON.parse in a try catch block.
- Add exact array/object/string checking to esnure that the data is valid.
*/

function initSocket() {
  /* TODO: Refactor this to create one line with player list, not add a div for each one separately. */
  socket.on("playerUpdate", (data) => {
    let players = JSON.parse(data);
    const playerListAuction = document.getElementById("playerListAuction");
    const playerListPainting = document.getElementById("playerListPainting");
    playerListAuction.innerHTML = "";
    playerListPainting.innerHTML = "";
    players.forEach((element) => {
      const playerDiv = document.createElement("div");
      playerDiv.classList.add("player");

      const nicknameElement = document.createElement("p");
      nicknameElement.className = "playerNickname";
      nicknameElement.textContent = element.nickname;

      const imgElement = document.createElement("img");
      imgElement.src = "./assets/img/player.svg";
      imgElement.style.color = element.color;

      playerDiv.appendChild(nicknameElement);
      playerDiv.appendChild(imgElement);

      playerListAuction.appendChild(playerDiv);
      playerListPainting.appendChild(playerDiv.cloneNode(true));
    });
    document.getElementById("connectedPlayersCount").innerText = players.length;
  });

  socket.on("gameStateUpdate", (data) => {
    let newState = JSON.parse(data);
    switch (newState) {
      case "waiting":
        switchScreen(waitingScreenDiv);
        break;
      case "painting":
        let flyOutDiv = document.getElementById("flyOutDiv");
        flyOutDiv.style.display = "none";
        switchScreen(paintingDiv);
        break;
      case "auction":
        switchScreen(auctionDiv);
        break;
      case "bank":
        switchScreen(bankDiv);
        break;
      case "end":
        switchScreen(endScreen);
        break;
      default:
        console.error("Unknown game state:", newState);
    }
  });

  socket.on("connect", () => {
    socket.timeout(5000).emit("openConnection", JSON.stringify({}), (err, res) => {
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

  socket.on("startGameStartCountdown", (data) => {
    let obj = JSON.parse(data);
    let flyOutDiv = document.getElementById("flyOutDiv");
    flyOutDiv.style.display = "flex";
    startTimer(obj.endTime, document.getElementById("gameStartCountdown"));
  });

  socket.on("cancelGameStartCountdown", () => {
    clearTimeout(gameStartCountdown);
    document.getElementById("flyOutDiv").style.display = "none";
  });

  socket.on("startPaintingTimer", (data) => {
    let obj = JSON.parse(data);
    startTimer(obj.endTime, document.getElementById("paintingTimer"));
  });

  socket.on("updatePaintingPrompts", (data) => {
    let obj = JSON.parse(data);
    gameState.paintingPrompts = obj;
    displayCurrentPrompt();
  });

  socket.on("disconnect", () => {
    throwError("0x001", "Disconnected from server.");
  });

  document.getElementById("startMenuStartButton").addEventListener("click", (e) => {
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
}

/*
 /$$$$$$$$                 /$$        /$$$$$$                      /$$                   /$$           /$$$$$$           /$$   /$$    
| $$_____/                | $$       /$$__  $$                    | $$                  | $$          |_  $$_/          |__/  | $$    
| $$       /$$$$$$$   /$$$$$$$      | $$  \__/  /$$$$$$   /$$$$$$$| $$   /$$  /$$$$$$  /$$$$$$          | $$   /$$$$$$$  /$$ /$$$$$$  
| $$$$$   | $$__  $$ /$$__  $$      |  $$$$$$  /$$__  $$ /$$_____/| $$  /$$/ /$$__  $$|_  $$_/          | $$  | $$__  $$| $$|_  $$_/  
| $$__/   | $$  \ $$| $$  | $$       \____  $$| $$  \ $$| $$      | $$$$$$/ | $$$$$$$$  | $$            | $$  | $$  \ $$| $$  | $$    
| $$      | $$  | $$| $$  | $$       /$$  \ $$| $$  | $$| $$      | $$_  $$ | $$_____/  | $$ /$$        | $$  | $$  | $$| $$  | $$ /$$
| $$$$$$$$| $$  | $$|  $$$$$$$      |  $$$$$$/|  $$$$$$/|  $$$$$$$| $$ \  $$|  $$$$$$$  |  $$$$/       /$$$$$$| $$  | $$| $$  |  $$$$/
|________/|__/  |__/ \_______/       \______/  \______/  \_______/|__/  \__/ \_______/   \___/        |______/|__/  |__/|__/   \___/  
*/

const dotsElem = document.getElementById("connectedDots");
const frames = ["", ".", "..", "..."];
let frame = 0;
let dotsInterval = setInterval(() => {
  dotsElem.innerText = frames[frame];
  frame = (frame + 1) % frames.length;
}, 300);

/* 
 /$$$$$$$           /$$             /$$     /$$                    
| $$__  $$         |__/            | $$    |__/                    
| $$  \ $$ /$$$$$$  /$$ /$$$$$$$  /$$$$$$   /$$ /$$$$$$$   /$$$$$$ 
| $$$$$$$/|____  $$| $$| $$__  $$|_  $$_/  | $$| $$__  $$ /$$__  $$
| $$____/  /$$$$$$$| $$| $$  \ $$  | $$    | $$| $$  \ $$| $$  \ $$
| $$      /$$__  $$| $$| $$  | $$  | $$ /$$| $$| $$  | $$| $$  | $$
| $$     |  $$$$$$$| $$| $$  | $$  |  $$$$/| $$| $$  | $$|  $$$$$$$
|__/      \_______/|__/|__/  |__/   \___/  |__/|__/  |__/ \____  $$
                                                          /$$  \ $$
                                                         |  $$$$$$/
                                                          \______/ 
*/

const colorSelector = document.getElementById("colorSelector");
const paintBucket = document.querySelector(".tool.filled");

const selectableTools = document.querySelectorAll(".selectableTool");

const opacitySelector = document.getElementById("opacityRange");
const brushSizeSelector = document.getElementById("brushSize");

const clearButton = document.querySelector(".tool.clearCanvas");

const ctx = paintingCanvas.getContext("2d");

paintingCanvas.width = 600;
paintingCanvas.height = 750;

let offscreenCanvas = document.createElement("canvas");
let offscreenCtx = offscreenCanvas.getContext("2d");

let prevMouseX,
  prevMouseY,
  snapshot,
  isDrawing = false,
  selectedTool = "",
  selectedColor = "#eaeaea",
  brushWidth = 10;

let paintBucketActive = false;

clearButton.addEventListener("click", () => {
  if (
    clearButton.classList.contains("confirmationRequest") ||
    clearButton.classList.contains("confirmed")
  ) {
    return;
  }
  clearButton.innerHTML = '<img src="./assets/img/questionmark.svg" alt="" />';
  clearButton.classList.add("confirmationRequest");

  clearButton.onclick = () => {
    clearButton.classList.remove("confirmationRequest");
    clearButton.classList.add("confirmed");
    clearButton.innerHTML = '<img src="./assets/img/checkmark.svg" alt="" />';
    ctx.clearRect(0, 0, paintingCanvas.width, paintingCanvas.height);
    setCanvasBackground();

    ctx.strokeStyle = selectedTool === "eraser" ? "#ffffff" : selectedColor;
    ctx.fillStyle = selectedColor;

    clearButton.onclick = null;
    setTimeout(() => {
      clearButton.classList.remove("confirmationRequest");
      clearButton.classList.remove("confirmed");
      clearButton.innerText = "";
      clearButton.innerHTML = '<img src="./assets/img/clear.svg" alt="" />';
      clearButton.onclick = null;
      clearButton.onmouseout = null;
    }, 3000);
  };

  clearButton.onmouseout = () => {
    var clearCanvasTimeout = setTimeout(() => {
      clearButton.innerText = "";
      clearButton.innerHTML = '<img src="./assets/img/clear.svg" alt="" />';
      clearButton.classList.remove("confirmationRequest");
      clearButton.onclick = null;
      clearButton.onmouseout = null;
    }, 3000);
    clearButton.onmouseover = () => {
      clearTimeout(clearCanvasTimeout);
    };
  };
});

paintBucket.addEventListener("click", () => {
  if (document.querySelector(".tool.eraser").classList.contains("selected")) return;
  if (paintBucket.classList.contains("inactive")) return;
  paintBucketActive = !paintBucketActive;
  paintBucket.classList.toggle("selected", paintBucketActive);
  paintBucket.querySelector("img:nth-of-type(1)").style.display = paintBucketActive
    ? "none"
    : "block";
  paintBucket.querySelector("img:nth-of-type(2)").style.display = paintBucketActive
    ? "block"
    : "none";
});

selectableTools.forEach((tool) => {
  tool.addEventListener("click", selectTool);
});

function selectTool() {
  selectableTools.forEach((tool) => {
    tool.classList.remove("selected");
  });
  selectedTool = this.dataset.tool;
  this.classList.add("selected");
  if (this === document.querySelector(".tool.eraser")) {
    paintBucketActive = false;
    paintBucket.classList.add("inactive");
    paintBucket.classList.remove("selected", paintBucketActive);
    paintBucket.querySelector("img:nth-of-type(1)").style.display = "block";
    paintBucket.querySelector("img:nth-of-type(2)").style.display = "none";
  } else {
    paintBucket.classList.remove("inactive");
  }
}

Coloris({
  themeMode: "auto",
  theme: "polaroid",
  alpha: false,
  wrap: false,
  format: "hex",
  onChange: (color, inputEl) => {
    colorSelector.value = color;
    colorSelector.style.backgroundColor = color;
  },
  el: colorSelector,
});

const colors = document.querySelectorAll(".color:not(#colorSelector)");
colors.forEach((colorButton) => {
  colorButton.addEventListener("click", () => {
    selectedColor = colorButton.value;
    colorSelector.value = selectedColor;
    colorSelector.style.backgroundColor = selectedColor;
    ctx.strokeStyle = selectedTool === "eraser" ? "#ffffff" : selectedColor;
    ctx.fillStyle = selectedColor;
  });
});

/* ------------------------------------------------------------------------- */
/* Painting Logic */
/* ------------------------------------------------------------------------- */

const setCanvasBackground = () => {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, paintingCanvas.width, paintingCanvas.height);
};

function getCanvasCoords(e) {
  const rect = paintingCanvas.getBoundingClientRect();
  const scaleX = paintingCanvas.width / rect.width;
  const scaleY = paintingCanvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

window.addEventListener("load", () => {
  setCanvasBackground();
});

const drawRect = (e) => {
  ctx.save();
  ctx.globalAlpha = opacitySelector.value;
  ctx.lineWidth = brushWidth;
  ctx.strokeStyle = selectedTool === "eraser" ? "#ffffff" : selectedColor;
  ctx.fillStyle = selectedColor;
  const { x, y } = getCanvasCoords(e);

  const width = prevMouseX - x;
  const height = prevMouseY - y;
  if (!paintBucketActive) {
    ctx.strokeRect(x, y, width, height);
  } else {
    ctx.fillRect(x, y, width, height);
  }
  ctx.restore();
};

const drawCircle = (e) => {
  ctx.save();
  ctx.globalAlpha = opacitySelector.value;
  ctx.lineWidth = brushWidth;
  ctx.strokeStyle = selectedTool === "eraser" ? "#ffffff" : selectedColor;
  ctx.fillStyle = selectedColor;
  const { x, y } = getCanvasCoords(e);

  ctx.beginPath();
  let radius = Math.sqrt(Math.pow(prevMouseX - x, 2) + Math.pow(prevMouseY - y, 2));
  ctx.arc(prevMouseX, prevMouseY, radius, 0, 2 * Math.PI);
  paintBucketActive ? ctx.fill() : ctx.stroke();
  ctx.restore();
};

const startDraw = (e) => {
  isDrawing = true;
  const { x, y } = getCanvasCoords(e);
  prevMouseX = x;
  prevMouseY = y;

  offscreenCanvas.width = paintingCanvas.width;
  offscreenCanvas.height = paintingCanvas.height;
  offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

  offscreenCtx.lineWidth = brushWidth;
  offscreenCtx.strokeStyle = selectedTool === "eraser" ? "#ffffff" : selectedColor;
  offscreenCtx.lineCap = "round";
  offscreenCtx.lineJoin = "round";
  offscreenCtx.beginPath();
  offscreenCtx.moveTo(prevMouseX, prevMouseY);

  snapshot = ctx.getImageData(0, 0, paintingCanvas.width, paintingCanvas.height);
};

const drawing = (e) => {
  if (!isDrawing) return;

  if (selectedTool === "brush" || selectedTool === "eraser") {
    offscreenCtx.strokeStyle = selectedTool === "eraser" ? "#ffffff" : selectedColor;
    offscreenCtx.lineWidth = brushWidth;
    const { x, y } = getCanvasCoords(e);
    offscreenCtx.lineCap = "round";
    offscreenCtx.lineJoin = "round";
    offscreenCtx.lineTo(x, y);
    offscreenCtx.stroke();
    prevMouseX = x;
    prevMouseY = y;

    ctx.putImageData(snapshot, 0, 0);
    ctx.globalAlpha = opacitySelector.value;
    ctx.drawImage(offscreenCanvas, 0, 0);
    ctx.globalAlpha = 1.0;
  } else if (selectedTool === "rectangle" || selectedTool === "circle") {
    ctx.putImageData(snapshot, 0, 0);
    if (selectedTool === "rectangle") {
      drawRect(e);
    } else if (selectedTool === "circle") {
      drawCircle(e);
    }
  }
};

brushSizeSelector.addEventListener("change", () => {
  brushWidth = brushSizeSelector.value;
});

colorSelector.addEventListener("change", () => {
  selectedColor = colorSelector.value;
  ctx.strokeStyle = selectedTool === "eraser" ? "#ffffff" : selectedColor;
  ctx.fillStyle = selectedColor;
});

paintingCanvas.addEventListener("mousedown", (e) => {
  selectedTool = document.querySelector(".tool.selectableTool.selected").dataset.tool;
  startDraw(e);
  paintingCanvas.addEventListener("mousemove", drawing);

  const stopDraw = (ev) => {
    if (!isDrawing) return;
    isDrawing = false;
    ctx.closePath();
    paintingCanvas.removeEventListener("mousemove", drawing);

    if (selectedTool === "brush" || selectedTool === "eraser") {
      ctx.putImageData(snapshot, 0, 0);
      ctx.globalAlpha = opacitySelector.value;
      ctx.drawImage(offscreenCanvas, 0, 0);
      ctx.globalAlpha = 1.0;
      snapshot = ctx.getImageData(0, 0, paintingCanvas.width, paintingCanvas.height);
    } else if (selectedTool === "rectangle") {
      ctx.putImageData(snapshot, 0, 0);
      drawRect(ev);
      snapshot = ctx.getImageData(0, 0, paintingCanvas.width, paintingCanvas.height);
    } else if (selectedTool === "circle") {
      ctx.putImageData(snapshot, 0, 0);
      drawCircle(ev);
      snapshot = ctx.getImageData(0, 0, paintingCanvas.width, paintingCanvas.height);
    }
    window.removeEventListener("mouseup", stopDraw);
  };
  window.addEventListener("mouseup", stopDraw);
});

const submitPaintingButton = document.getElementById("submitPaintingButton");

submitPaintingButton.addEventListener("click", () => {
  const paintingDataURL = paintingCanvas.toDataURL("image/png");
  socket.emit(
    "submitPainting",
    JSON.stringify({
      id: gameState.paintingPrompts[gameState.promptsSubmitted].id,
      base64: paintingDataURL,
    }),
    (res) => {
      let resObject = JSON.parse(res);
      if (resObject.success) {
        Toastify({
          text: "Painting submitted successfully!",
          duration: 3000,
          gravity: "bottom",
          position: "right",
        }).showToast();
        gameState.promptsSubmitted += 1;
        if (gameState.promptsSubmitted < gameState.paintingPrompts.length) {
          displayCurrentPrompt();
          ctx.clearRect(0, 0, paintingCanvas.width, paintingCanvas.height);
          setCanvasBackground();
          snapshot = ctx.getImageData(0, 0, paintingCanvas.width, paintingCanvas.height);
        } else {
          submitPaintingButton.disabled = true;
          promptElement.innerText = "All paintings submitted!";
          promptCounter.innerText = gameState.promptsSubmitted + 1;
        }
      } else {
        Toastify({
          text: "Failed to submit painting. Please try again.",
          duration: 3000,
          gravity: "bottom",
          position: "right",
        }).showToast();
      }
    }
  );
});

/*
 /$$$$$$$           /$$             /$$     /$$                           /$$$$$$$$                 /$$
| $$__  $$         |__/            | $$    |__/                          | $$_____/                | $$
| $$  \ $$ /$$$$$$  /$$ /$$$$$$$  /$$$$$$   /$$ /$$$$$$$   /$$$$$$       | $$       /$$$$$$$   /$$$$$$$
| $$$$$$$/|____  $$| $$| $$__  $$|_  $$_/  | $$| $$__  $$ /$$__  $$      | $$$$$   | $$__  $$ /$$__  $$
| $$____/  /$$$$$$$| $$| $$  \ $$  | $$    | $$| $$  \ $$| $$  \ $$      | $$__/   | $$  \ $$| $$  | $$
| $$      /$$__  $$| $$| $$  | $$  | $$ /$$| $$| $$  | $$| $$  | $$      | $$      | $$  | $$| $$  | $$
| $$     |  $$$$$$$| $$| $$  | $$  |  $$$$/| $$| $$  | $$|  $$$$$$$      | $$$$$$$$| $$  | $$|  $$$$$$$
|__/      \_______/|__/|__/  |__/   \___/  |__/|__/  |__/ \____  $$      |________/|__/  |__/ \_______/
                                                          /$$  \ $$                                    
                                                         |  $$$$$$/                                    
                                                          \______/                                     
*/

fetch("./assets/config.json")
  .then((response) => response.json())
  .then((data) => {
    socket = io(data.backendIP, { transports: ["websocket"] });
    initSocket();
  });
