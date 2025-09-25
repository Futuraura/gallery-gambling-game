let socket;

const waitingScreenDiv = document.getElementById("waitingScreenDiv");
const loadingScreenDiv = document.getElementById("loadingScreenDiv");
const endScreen = document.getElementById("endScreen");
const bankDiv = document.getElementById("bankDiv");
const auctionDiv = document.getElementById("auctionDiv");
const paintingDiv = document.getElementById("paintingDiv");
const mainMenuDiv = document.getElementById("mainMenuDiv");
const versionNumber = document.getElementById("versionNumber");
const hostIntermissionDiv = document.getElementById("hostIntermissionDiv");
const hostDialogueText = document.getElementById("hostDialogueText");
const dotsElem = document.getElementById("connectedDots");

const promptElement = document.getElementById("currentPrompt");
const promptCounter = document.getElementById("currentPromptIndex");

const paintingCanvas = document.getElementById("paintingCanvas");

let gameState = {
  paintingPrompts: [],
  promptsSubmitted: 0,
};

const frames = ["", ".", "..", "..."];
let frame = 0;
let dotsInterval = setInterval(() => {
  dotsElem.innerText = frames[frame];
  frame = (frame + 1) % frames.length;
}, 300);

function triggerAuctionSignFly() {
  const sign = document.querySelector(".auctionSign");
  if (!sign) return;

  sign.classList.remove("fly-in", "fly-out");

  sign.classList.add("fly-in");

  setTimeout(() => {
    sign.classList.remove("fly-in");
    sign.classList.add("fly-out");
  }, 3000);

  setTimeout(() => {
    sign.classList.remove("fly-out");
  }, 4000);
}

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
  hostIntermissionDiv.style.display = "none";

  screen.style.display = "flex";

  if (screen === paintingDiv) {
    setCanvasBackground();
  }
}

function startTimer(endTime, timerElement, includeMilliseconds = true) {
  if (!timerElement) {
    console.error("Timer element not found");
    return;
  }

  if (timerElement._interval) {
    clearInterval(timerElement._interval);
  }

  timerElement._interval = setInterval(
    () => {
      const now = Date.now();
      const diff = endTime - now;

      if (diff <= 0) {
        timerElement.innerText = includeMilliseconds ? "00:00:00" : "00:00";
        clearInterval(timerElement._interval);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      const milliseconds = Math.floor((diff % 1000) / 10);

      if (includeMilliseconds) {
        timerElement.innerText = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
          2,
          "0"
        )}:${String(milliseconds).padStart(2, "0")}`;
      } else {
        timerElement.innerText = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
          2,
          "0"
        )}`;
      }
    },
    includeMilliseconds ? 10 : 1000
  );
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
  socket.on("balanceUpdate", (data) => {
    let balance = 0;
    try {
      const balanceData = JSON.parse(data);
      balance = balanceData.balance;
      loanAmount = balanceData.loanAmount;
      maxLoans = balanceData.maxLoans;
      playerBalance = balance;
    } catch (e) {
      console.error("Invalid balance update:", e);
    }
    document.getElementById("currentCredits").innerText = `${balance}$`;
    document.getElementById("currentDebt").innerText = `${loanAmount}/${maxLoans}`;

    if (currentLotData) {
      updateBidButtons(currentLotData.currentBid || 300);
    }
  });

  socket.on("auctionHints", (data) => {
    let hints = [];
    try {
      hints = JSON.parse(data);
    } catch (e) {
      hints = [];
    }
    const hintsList = document.querySelector(".auctionDiv .hintsList");
    if (hintsList) {
      hintsList.innerHTML = "";
      hints.forEach((hintObj) => {
        const p = document.createElement("p");
        p.className = "artHint";
        if (
          hintObj &&
          typeof hintObj === "object" &&
          hintObj.prompt &&
          hintObj.price !== undefined
        ) {
          p.textContent = `${hintObj.prompt} is worth ${hintObj.price}$`;
        }
        hintsList.appendChild(p);
      });
    }
  });
  /* TODO: Refactor this to create one line with player list, not add a div for each one separately. */
  socket.on("playerUpdate", (data) => {
    let players = JSON.parse(data);
    const playerListAuction = document.getElementById("playerListAuction");
    const playerListPainting = document.getElementById("playerListPainting");
    playerListAuction.innerHTML = "";
    playerListPainting.innerHTML = "";
    const playerIconSvg = `<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 76 96"
>
  <path
    d="M38.0002 0.666992C58.7279 0.667077 75.5313 17.4699 75.5315 38.1973C75.5315 55.0456 64.4287 69.3002 49.1409 74.0459V87.667C49.1409 92.0853 45.5591 95.667 41.1409 95.667H35.4436C31.0253 95.667 27.4436 92.0853 27.4436 87.667V74.2207C11.8554 69.6603 0.468994 55.2594 0.468994 38.1973C0.469141 17.4698 17.2725 0.666992 38.0002 0.666992Z"
    fill="#000"
  />
</svg>
`;
    players.forEach((element) => {
      const playerDiv = document.createElement("div");
      playerDiv.classList.add("player");

      playerDiv.appendChild(document.createRange().createContextualFragment(playerIconSvg));
      const svg = playerDiv.querySelector("svg");
      const path = svg.querySelector("path");
      if (path) path.setAttribute("fill", element.color);

      const nicknameElement = document.createElement("p");
      nicknameElement.className = "playerNickname";
      nicknameElement.textContent = element.nickname;

      playerDiv.appendChild(nicknameElement);

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
      case "intermission":
        switchScreen(hostIntermissionDiv);
        break;
      default:
        console.error("Unknown game state:", newState);
    }
  });

  socket.on("hostDialogue", (data) => {
    let obj = JSON.parse(data);
    switchScreen(hostIntermissionDiv);
    if (hostDialogueText._typedInstance) {
      hostDialogueText._typedInstance.destroy();
    }
    hostDialogueText.innerHTML = "";
    hostDialogueText._typedInstance = new Typed(hostDialogueText, {
      strings: obj.texts,
      typeSpeed: obj.typeSpeed,
      backSpeed: 0,
      startDelay: 0,
      backDelay: obj.minDelay,
      smartBackspace: false,
      shuffle: false,
      fadeOut: false,
      loop: false,
      showCursor: false,
      contentType: "html",
      onComplete: () => {
        hostDialogueText._typedInstance = null;
        if (obj.dialogueId) {
          setTimeout(() => {
            socket.emit("hostDialogueComplete", JSON.stringify({ dialogueId: obj.dialogueId }));
          }, 1000);
        }
      },
    });
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
    startTimer(obj.endTime, document.getElementById("gameStartCountdown"), false);
  });

  socket.on("resetGameStartCountdown", () => {
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

  socket.on("auctionNewLot", (data) => {
    let obj = JSON.parse(data);
    displayNewAuctionLot(obj);
  });

  socket.on("auctionBidUpdate", (data) => {
    let obj = JSON.parse(data);
    updateCurrentBid(obj);
  });

  socket.on("auctionCountdown", (data) => {
    let obj = JSON.parse(data);
    updateAuctionCountdown(obj);
  });

  socket.on("auctionLotResult", (data) => {
    let obj = JSON.parse(data);
    displayLotResult(obj);
  });

  socket.on("auctionComplete", (data) => {
    let obj = JSON.parse(data);
    displayFinalResults(obj);
  });

  socket.on("auctionCountdown", (data) => {
    let obj = JSON.parse(data);
    updateAuctionCountdown(obj);
  });

  socket.on("auctionLotResult", (data) => {
    let obj = JSON.parse(data);
    displayLotResult(obj);
  });

  socket.on("auctionComplete", (data) => {
    let obj = JSON.parse(data);
    displayFinalResults(obj);
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
 /$$                           /$$                                 
| $$                          |__/                                 
| $$        /$$$$$$   /$$$$$$  /$$  /$$$$$$$                       
| $$       /$$__  $$ /$$__  $$| $$ /$$_____/                       
| $$      | $$  \ $$| $$  \ $$| $$| $$                             
| $$      | $$  | $$| $$  | $$| $$| $$                             
| $$$$$$$$|  $$$$$$/|  $$$$$$$| $$|  $$$$$$$                       
|________/ \______/  \____  $$|__/ \_______/                       
                     /$$  \ $$                                     
                    |  $$$$$$/                                     
                     \______/                                      
*/

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

// Thx to William Malone for the algorithm
const floodFill = (startX, startY, fillColor) => {
  const imageData = ctx.getImageData(0, 0, paintingCanvas.width, paintingCanvas.height);
  const canvasWidth = paintingCanvas.width;
  const canvasHeight = paintingCanvas.height;

  // Stackoverflow has done the deed here :D
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  const fillRgb = hexToRgb(fillColor);
  if (!fillRgb) return;

  const fillColorR = fillRgb.r;
  const fillColorG = fillRgb.g;
  const fillColorB = fillRgb.b;

  const startPixelPos = (startY * canvasWidth + startX) * 4;
  const startR = imageData.data[startPixelPos];
  const startG = imageData.data[startPixelPos + 1];
  const startB = imageData.data[startPixelPos + 2];

  if (startR === fillColorR && startG === fillColorG && startB === fillColorB) {
    return;
  }

  const matchStartColor = (pixelPos) => {
    const r = imageData.data[pixelPos];
    const g = imageData.data[pixelPos + 1];
    const b = imageData.data[pixelPos + 2];
    return r === startR && g === startG && b === startB;
  };

  const colorPixel = (pixelPos) => {
    imageData.data[pixelPos] = fillColorR;
    imageData.data[pixelPos + 1] = fillColorG;
    imageData.data[pixelPos + 2] = fillColorB;
    imageData.data[pixelPos + 3] = 255;
  };

  const pixelStack = [[startX, startY]];

  while (pixelStack.length) {
    const newPos = pixelStack.pop();
    let x = newPos[0];
    let y = newPos[1];

    let pixelPos = (y * canvasWidth + x) * 4;

    while (y >= 0 && matchStartColor(pixelPos)) {
      y--;
      pixelPos -= canvasWidth * 4;
    }
    pixelPos += canvasWidth * 4;
    y++;

    let reachLeft = false;
    let reachRight = false;

    while (y < canvasHeight && matchStartColor(pixelPos)) {
      colorPixel(pixelPos);

      if (x > 0) {
        if (matchStartColor(pixelPos - 4)) {
          if (!reachLeft) {
            pixelStack.push([x - 1, y]);
            reachLeft = true;
          }
        } else if (reachLeft) {
          reachLeft = false;
        }
      }

      if (x < canvasWidth - 1) {
        if (matchStartColor(pixelPos + 4)) {
          if (!reachRight) {
            pixelStack.push([x + 1, y]);
            reachRight = true;
          }
        } else if (reachRight) {
          reachRight = false;
        }
      }

      pixelPos += canvasWidth * 4;
      y++;
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

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

  if (selectedTool === "brush" && paintBucketActive) {
    const { x, y } = getCanvasCoords(e);
    floodFill(Math.floor(x), Math.floor(y), selectedColor);
    snapshot = ctx.getImageData(0, 0, paintingCanvas.width, paintingCanvas.height);
    return;
  }

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
 /$$$$$$$$          /$$               /$$              /$$$           /$$$$$$$                        /$$    
| $$_____/         | $$              | $$             /$$ $$         | $$__  $$                      | $$    
| $$     /$$$$$$  /$$$$$$    /$$$$$$$| $$$$$$$       |  $$$          | $$  \ $$  /$$$$$$   /$$$$$$  /$$$$$$  
| $$$$$ /$$__  $$|_  $$_/   /$$_____/| $$__  $$       /$$ $$/$$      | $$$$$$$  /$$__  $$ /$$__  $$|_  $$_/  
| $$__/| $$$$$$$$  | $$    | $$      | $$  \ $$      | $$  $$_/      | $$__  $$| $$  \ $$| $$  \ $$  | $$    
| $$   | $$_____/  | $$ /$$| $$      | $$  | $$      | $$\  $$       | $$  \ $$| $$  | $$| $$  | $$  | $$ /$$
| $$   |  $$$$$$$  |  $$$$/|  $$$$$$$| $$  | $$      |  $$$$/$$      | $$$$$$$/|  $$$$$$/|  $$$$$$/  |  $$$$/
|__/    \_______/   \___/   \_______/|__/  |__/       \____/\_/      |_______/  \______/  \______/    \___/  
*/

fetch("./assets/config.json")
  .then((response) => response.json())
  .then((data) => {
    socket = io(data.backendIP, { transports: ["websocket"] });
    initSocket();
  });
