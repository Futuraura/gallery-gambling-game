const socket = io("http://127.0.0.1:3001", { transports: ["websocket"] });

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
  loadingScreenDiv.style.display = "none";
  endScreen.style.display = "none";
  bankDiv.style.display = "none";
  auctionDiv.style.display = "none";
  paintingDiv.style.display = "none";
  mainMenuDiv.style.display = "none";

  screen.style.display = "flex";
}

socket.on("connect", () => {
  if (!socket.connected) {
    throwError("0x001", "Could not connect to the server.");
    return;
  }

  let authData = {};

  if (localStorage.getItem("Auth")) {
    let auth = JSON.parse(localStorage.getItem("Auth"));
    if (auth.UUIDvalidUntil < Date.now()) {
      localStorage.removeItem("Auth");
      authData = {};
    } else {
      authData = auth;
    }
  }

  socket
    .timeout(5000)
    .emit("openConnection", JSON.stringify(authData), (err, res) => {
      if (err) {
        throwError("0x002", "Handshake timeout.");
        return;
      }

      let objectRes = JSON.parse(res);

      if (objectRes.success === false) {
        throwError("0x003", "Handshake failed.");
        return;
      }

      localStorage.setItem(
        "Auth",
        JSON.stringify({
          UUID: objectRes.UUID,
          UUIDvalidUntil: objectRes.UUIDvalidUntil,
        })
      );

      versionNumber.innerText = objectRes.version;

      mainMenuDiv.style.display = "flex";
      loadingScreenDiv.classList.toggle("hidden");

      loadingScreenDiv.addEventListener("transitionend", () => {
        loadingScreenDiv.style.display = "none";
      });
    });
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
        if (resObject.success) {
          mainMenuDiv.style.display = "none";
        } else if (!resObject.success) {
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
