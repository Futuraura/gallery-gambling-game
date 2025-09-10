let socket;

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
  endScreen.style.display = "none";
  bankDiv.style.display = "none";
  auctionDiv.style.display = "none";
  paintingDiv.style.display = "none";
  mainMenuDiv.style.display = "none";

  screen.style.display = "flex";
}

function initSocket() {
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
      case "end":
        switchScreen(endScreen);
        break;
      default:
        console.error("Unknown game state:", gameState);
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

const dotsElem = document.getElementById("connectedDots");
const frames = ["", ".", "..", "..."];
let frame = 0;
let dotsInterval = setInterval(() => {
  dotsElem.innerText = frames[frame];
  frame = (frame + 1) % frames.length;
}, 300);

/* Painting & Stuff */

const colorSelector = document.getElementById("colorSelector");
const paintBucket = document.querySelector(".tool.filled");

const opacitySelector = document.getElementById("opacityRange");
const brushSizeSelector = document.getElementById("brushSize");

let paintBucketActive = false;

paintBucket.addEventListener("click", () => {
  paintBucketActive = !paintBucketActive;
  paintBucket.classList.toggle("selected", paintBucketActive);
  paintBucket.querySelector("img:nth-of-type(1)").style.display = paintBucketActive
    ? "none"
    : "block";
  paintBucket.querySelector("img:nth-of-type(2)").style.display = paintBucketActive
    ? "block"
    : "none";
});

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
    const selectedColor = colorButton.value;
    colorSelector.value = selectedColor;
    colorSelector.style.backgroundColor = selectedColor;
  });
});

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
