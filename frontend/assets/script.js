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
    paintingCanvas.width = paintingCanvas.offsetWidth;
    paintingCanvas.height = paintingCanvas.offsetHeight;
    setCanvasBackground();

    setTimeout(() => {
      resizeCanvasToDisplaySize(paintingCanvas);
    }, 0);
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

function resizeCanvasToDisplaySize(canvas) {
  const rect = canvas.getBoundingClientRect();
  if (canvas.width !== Math.round(rect.width) || canvas.height !== Math.round(rect.height)) {
    canvas.width = Math.round(rect.width);
    canvas.height = Math.round(rect.height);
    setCanvasBackground();
  }
}

window.addEventListener("resize", () => {
  if (paintingDiv.style.display !== "none") {
    resizeCanvasToDisplaySize(paintingCanvas);
  }
});

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

window.addEventListener("load", () => {
  paintingCanvas.width = paintingCanvas.offsetWidth;
  paintingCanvas.height = paintingCanvas.offsetHeight;
  setCanvasBackground();
});

const drawRect = (e) => {
  ctx.save();
  ctx.globalAlpha = opacitySelector.value;
  ctx.lineWidth = brushWidth;
  ctx.strokeStyle = selectedTool === "eraser" ? "#ffffff" : selectedColor;
  ctx.fillStyle = selectedColor;

  const width = prevMouseX - e.offsetX;
  const height = prevMouseY - e.offsetY;
  if (!paintBucketActive) {
    ctx.strokeRect(e.offsetX, e.offsetY, width, height);
  } else {
    ctx.fillRect(e.offsetX, e.offsetY, width, height);
  }
  ctx.restore();
};

const drawCircle = (e) => {
  ctx.save();
  ctx.globalAlpha = opacitySelector.value;
  ctx.lineWidth = brushWidth;
  ctx.strokeStyle = selectedTool === "eraser" ? "#ffffff" : selectedColor;
  ctx.fillStyle = selectedColor;

  ctx.beginPath();
  let radius = Math.sqrt(Math.pow(prevMouseX - e.offsetX, 2) + Math.pow(prevMouseY - e.offsetY, 2));
  ctx.arc(prevMouseX, prevMouseY, radius, 0, 2 * Math.PI);
  paintBucketActive ? ctx.fill() : ctx.stroke();
  ctx.restore();
};

const startDraw = (e) => {
  isDrawing = true;
  prevMouseX = e.offsetX;
  prevMouseY = e.offsetY;

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
    offscreenCtx.lineCap = "round";
    offscreenCtx.lineJoin = "round";
    offscreenCtx.lineTo(e.offsetX, e.offsetY);
    offscreenCtx.stroke();
    prevMouseX = e.offsetX;
    prevMouseY = e.offsetY;

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
  socket.emit("submitPainting", JSON.stringify({ image: paintingDataURL }), (res) => {
    let resObject = JSON.parse(res);
    if (resObject.success) {
      Toastify({
        text: "Painting submitted successfully!",
        duration: 3000,
        gravity: "bottom",
        position: "right",
      }).showToast();
    }
  });
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
    if (data.devMode === true) {
      console.log("Development mode is enabled");

      const devMenuButton = document.createElement("div");
      devMenuButton.id = "devMenu";
      devMenuButton.style.position = "fixed";
      devMenuButton.style.top = "20px";
      devMenuButton.style.right = "30px";
      devMenuButton.style.width = "48px";
      devMenuButton.style.height = "48px";
      devMenuButton.style.display = "flex";
      devMenuButton.style.alignItems = "center";
      devMenuButton.style.justifyContent = "center";
      devMenuButton.style.background = "rgba(30,30,30,0.85)";
      devMenuButton.style.backdropFilter = "blur(10px)";
      devMenuButton.style.borderRadius = "16px";
      devMenuButton.style.boxShadow = "0 4px 24px rgba(0,0,0,0.32)";
      devMenuButton.style.border = "1px solid rgba(60,60,60,0.5)";
      devMenuButton.style.cursor = "pointer";
      devMenuButton.style.zIndex = "1000";
      devMenuButton.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 512 512"><path fill="#fff" d="m496.059 182.581l-.025-70.7l-32 .012l.017 48.172l-66.288 23.779l-45.729.007v-30.964A96.55 96.55 0 0 0 329.92 91.3l43.129-43.413h42.84v-32h-56.157l-53.987 54.344a96.82 96.82 0 0 0-100.511-.554l-53.056-53.84l-56.158.05l.029 32l42.748-.038L180.824 90.5a96.56 96.56 0 0 0-22.79 62.39v30.99l-43.235.007L48 160.093v-48.172H16v70.742l80.035 28.509l.007 84.715H16.034v32h80.01v8.01a159.7 159.7 0 0 0 9.7 54.979l-89.71 34.572v70.439h32v-48.476l71.73-27.642a159.794 159.794 0 0 0 249.578 29.044a161.5 161.5 0 0 0 23.058-29.146l71.638 27.727v48.493h32v-70.421l-89.618-34.685a159.2 159.2 0 0 0 9.614-55.1v-7.794h80v-32h-80v-84.6ZM240 463.029C176.991 455.235 128.045 401.2 128.045 335.9l-.01-120.011h30v.007H240Zm-49.966-279.154v-30.988a65 65 0 0 1 130 0v30.968Zm194 151.849A128.28 128.28 0 0 1 272 462.979V215.887h80.032v-.036h32Z"/></svg>';

      devMenuButton.addEventListener("click", () => {
        let existing = document.getElementById("devMenuDropdown");
        if (existing) {
          existing.remove();
          return;
        }
        const dropdown = document.createElement("div");
        dropdown.id = "devMenuDropdown";
        dropdown.style.position = "absolute";
        dropdown.style.top = "60px";
        dropdown.style.backdropFilter = "blur(10px)";
        dropdown.style.right = "0";
        dropdown.style.minWidth = "300px";
        dropdown.style.background = "rgba(24,24,24,0.98)";
        dropdown.style.borderRadius = "12px";
        dropdown.style.boxShadow = "0 8px 32px rgba(0,0,0,0.38)";
        dropdown.style.border = "1px solid rgba(60,60,60,0.5)";
        dropdown.style.zIndex = "1001";
        dropdown.style.display = "flex";
        dropdown.style.flexDirection = "column";
        dropdown.style.gap = "4px";

        const adminOption = document.createElement("button");
        adminOption.innerText = "Admin Override Menu";
        adminOption.style.background = "none";
        adminOption.style.border = "none";
        adminOption.style.color = "#fff";
        adminOption.style.fontSize = "16px";
        adminOption.style.padding = "10px 24px";
        adminOption.style.textAlign = "left";
        adminOption.style.cursor = "pointer";
        adminOption.style.borderRadius = "8px";
        adminOption.style.transition = "background 0.2s";
        adminOption.onmouseover = () => {
          adminOption.style.background = "rgba(255,255,255,0.08)";
        };
        adminOption.onmouseout = () => {
          adminOption.style.background = "none";
        };
        adminOption.onclick = () => {
          const adminMenu = document.createElement("div");
          adminMenu.id = "adminOverrideMenu";
          adminMenu.style.position = "fixed";
          adminMenu.style.top = "50%";
          adminMenu.style.left = "50%";
          adminMenu.style.transform = "translate(-50%, -50%)";
          adminMenu.style.width = "400px";
          adminMenu.style.padding = "24px";
          adminMenu.style.background = "rgba(24,24,24,0.98)";
          adminMenu.style.backdropFilter = "blur(10px)";
          adminMenu.style.borderRadius = "16px";
          adminMenu.style.boxShadow = "0 8px 32px rgba(0,0,0,0.38)";
          adminMenu.style.border = "1px solid rgba(60,60,60,0.5)";
          adminMenu.style.zIndex = "1002";

          const title = document.createElement("h2");
          title.innerText = "Admin Override Menu";
          title.style.marginBottom = "16px";
          title.style.color = "#fff";

          const closeButton = document.createElement("button");
          closeButton.innerText = "Close";
          closeButton.style.position = "absolute";
          closeButton.style.top = "16px";
          closeButton.style.right = "16px";
          closeButton.style.background = "rgba(255,0,0,0.25)";
          closeButton.style.border = "none";
          closeButton.style.color = "#fff";
          closeButton.style.padding = "8px 12px";
          closeButton.style.borderRadius = "8px";
          closeButton.style.cursor = "pointer";
          closeButton.onmouseover = () => {
            closeButton.style.background = "rgba(255,0,0,0.45)";
          };
          closeButton.onmouseout = () => {
            closeButton.style.background = "rgba(255,0,0,0.25)";
          };
          closeButton.onclick = () => {
            adminMenu.remove();
          };

          const passwordInput = document.createElement("input");
          passwordInput.type = "password";
          passwordInput.placeholder = "Enter admin password";
          passwordInput.style.width = "100%";
          passwordInput.style.padding = "10px";
          passwordInput.style.marginBottom = "16px";
          passwordInput.style.border = "1px solid rgba(255,255,255,0.2)";
          passwordInput.style.borderRadius = "8px";
          passwordInput.style.background = "rgba(255,255,255,0.05)";
          passwordInput.style.color = "#fff";
          passwordInput.style.fontSize = "16px";
          passwordInput.style.outline = "none";
          passwordInput.onfocus = () => {
            passwordInput.style.border = "1px solid rgba(255,255,255,0.5)";
          };
          passwordInput.onblur = () => {
            passwordInput.style.border = "1px solid rgba(255,255,255,0.2)";
          };

          const commandInput = document.createElement("input");
          commandInput.type = "text";
          commandInput.placeholder = "Enter admin override action";
          commandInput.style.width = "100%";
          commandInput.style.padding = "10px";
          commandInput.style.marginBottom = "16px";
          commandInput.style.border = "1px solid rgba(255,255,255,0.2)";
          commandInput.style.borderRadius = "8px";
          commandInput.style.background = "rgba(255,255,255,0.05)";
          commandInput.style.color = "#fff";
          commandInput.style.fontSize = "16px";
          commandInput.style.outline = "none";
          commandInput.onfocus = () => {
            commandInput.style.border = "1px solid rgba(255,255,255,0.5)";
          };
          commandInput.onblur = () => {
            commandInput.style.border = "1px solid rgba(255,255,255,0.2)";
          };

          const parameterInput = document.createElement("input");
          parameterInput.type = "text";
          parameterInput.placeholder = "Enter override parameters";
          parameterInput.style.width = "100%";
          parameterInput.style.padding = "10px";
          parameterInput.style.marginBottom = "16px";
          parameterInput.style.border = "1px solid rgba(255,255,255,0.2)";
          parameterInput.style.borderRadius = "8px";
          parameterInput.style.background = "rgba(255,255,255,0.05)";
          parameterInput.style.color = "#fff";
          parameterInput.style.fontSize = "16px";
          parameterInput.style.outline = "none";
          parameterInput.onfocus = () => {
            parameterInput.style.border = "1px solid rgba(255,255,255,0.5)";
          };
          parameterInput.onblur = () => {
            parameterInput.style.border = "1px solid rgba(255,255,255,0.2)";
          };

          const submitButton = document.createElement("button");
          submitButton.innerText = "Submit";
          submitButton.style.background = "rgba(0,150,0,0.25)";
          submitButton.style.border = "none";
          submitButton.style.color = "#fff";
          submitButton.style.padding = "10px 16px";
          submitButton.style.borderRadius = "8px";
          submitButton.style.cursor = "pointer";
          submitButton.style.fontSize = "16px";
          submitButton.onmouseover = () => {
            submitButton.style.background = "rgba(0,150,0,0.45)";
          };
          submitButton.onmouseout = () => {
            submitButton.style.background = "rgba(0,150,0,0.25)";
          };
          submitButton.onclick = () => {
            if (passwordInput.value.length === 0) {
              Toastify({
                text: "Please enter the admin password.",
                duration: 3000,
                close: true,
                gravity: "top",
                position: "right",
                backgroundColor: "linear-gradient(to right, #eb2333ff, #750707ff)",
              }).showToast();
              return;
            }

            const command = commandInput.value;
            const parameters = parameterInput.value;

            socket.emit(
              "adminOverride",
              JSON.stringify({
                password: passwordInput.value,
                command,
                parameters,
              })
            );
          };

          adminMenu.appendChild(title);
          adminMenu.appendChild(passwordInput);
          adminMenu.appendChild(commandInput);
          adminMenu.appendChild(parameterInput);
          adminMenu.appendChild(submitButton);
          adminMenu.appendChild(closeButton);
          document.body.appendChild(adminMenu);
        };

        dropdown.appendChild(adminOption);
        devMenuButton.appendChild(dropdown);
      });

      document.body.appendChild(devMenuButton);

      socket = io(data.backendIP, { transports: ["websocket"] });
      initSocket();
    }
  });
