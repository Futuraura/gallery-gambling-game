const socket = new io("ws://127.0.0.1:3001");

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

socket.on("connect", () => {
  socket.emit("openConnection", {}, (res) => {
    console.log("Received response:", res);
    console.log("Type of response:", typeof res);
    let objectRes = JSON.parse(res);

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
