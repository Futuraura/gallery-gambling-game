$(document).ready(function () {
  width = null;
  height = null;
  imageHeight = 100;
  fallingMoney = [];
  canvasContext = null;
  animationId = null;

  // Auto-start animation on page load
  const moneyBackgroundDiv = document.getElementById("moneyBackground");

  width = $(document).width();
  height = $(document).height();
  canvas = $('<canvas class="rain"></canvas>');
  canvas.attr("width", width);
  canvas.attr("height", height);
  canvas.appendTo(moneyBackgroundDiv);
  initAnimation();

  // $('body').on('click', '.rain', function() {
  //   endAnimation()
  // });
});

function initAnimation() {
  numMoney = 20;
  speedOffset = 8;
  speedRange = 2;
  numImages = 3;

  canvasContext = $(".rain")[0].getContext("2d");

  _.range(numMoney).forEach(function (index) {
    isOdd = index % 2 == 1;
    direction = 0;
    if (isOdd) direction = 1;
    else direction = -1;

    money = {
      image: new Image(),
      x: _.random(width),
      y: _.random(-height * 1, -imageHeight),
      angle: _.random(2 * Math.PI),
      speed: speedOffset + _.random(speedRange),
      currentFrame: 0,
      direction: direction,
    };

    imageIndex = _.random(numImages);
    // money.image.src = "https://dl.dropboxusercontent.com/u/58679421/make_it_rain_images/money_" +
    //   imageIndex + ".png"
    money.image.src =
      "https://images.vexels.com/media/users/3/144032/isolated/preview/1f5414b9d04b71a4972208c035a7d278-stroke-dollar-bill-by-vexels.png";
    // money.image.src = "https://bangbroschat.com/svg/coin.svg"
    fallingMoney.push(money);
  });

  function animate() {
    draw();
    animationId = requestAnimationFrame(animate);
  }
  animate();
}

function draw() {
  clearWindow();

  fallingMoney.forEach(function (money, index) {
    drawRotatedImage(money);

    money.currentFrame += 1;
    money.y += money.speed;
    money.angle += money.direction * 0.05;
    radius = money.direction * (10 + (index % 2));
    money.x += Math.sin((money.currentFrame + index) / (1 * Math.PI));

    // Reset money position when it falls off the screen
    if (money.y > height + imageHeight) {
      money.y = _.random(-height * 0.5, -imageHeight);
      money.x = _.random(width);
      money.currentFrame = 0;
    }
  });
}

function clearWindow() {
  canvasContext.clearRect(0, 0, width, height);
}

function drawRotatedImage(money) {
  canvasContext.save();
  canvasContext.translate(money.x, money.y);
  canvasContext.rotate(money.angle);
  canvasContext.drawImage(
    money.image,
    0,
    0,
    100,
    (100 * money.image.height) / money.image.width
  );
  canvasContext.restore();
}

function endAnimation() {
  cancelAnimationFrame(animationId);
  fallingMoney = [];
  canvas.detach();
}
