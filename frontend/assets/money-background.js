/*
The MIT License (MIT)

Copyright (c) 2025 Zlerp (https://codepen.io/Zlerp/pen/WVExaK)
Fork of an original work Make It Rain (https://codepen.io/raemadeline/pen/RaaoQR)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/*
Modded by Futuraura under the same license
*/

$(document).ready(function () {
  width = null;
  height = null;
  imageHeight = 100;
  fallingMoney = [];
  canvasContext = null;
  animationId = null;

  const moneyBackgroundDiv = document.getElementById("moneyBackground");

  width = $(document).width();
  height = $(document).height();
  canvas = $('<canvas class="rain"></canvas>');
  canvas.attr("width", width);
  canvas.attr("height", height);
  canvas.appendTo(moneyBackgroundDiv);
  initAnimation();
});

function initAnimation() {
  numMoney = 20;
  speedOffset = 3;
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
      rotationSpeed: 0.01 + Math.random() * 0.03, // random slow rotation speed
      driftAmplitude: 20 + Math.random() * 30, // smooth horizontal drift
      driftFrequency: 0.003 + Math.random() * 0.004, // slow, unique frequency
    };

    imageIndex = _.random(numImages);
    money.image.src =
      "https://images.vexels.com/media/users/3/144032/isolated/preview/1f5414b9d04b71a4972208c035a7d278-stroke-dollar-bill-by-vexels.png";
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
    money.angle += money.direction * money.rotationSpeed;
    money.x +=
      Math.sin(money.currentFrame * money.driftFrequency + index) * (money.driftAmplitude / 100);

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
  canvasContext.drawImage(money.image, 0, 0, 100, (100 * money.image.height) / money.image.width);
  canvasContext.restore();
}

function endAnimation() {
  cancelAnimationFrame(animationId);
  fallingMoney = [];
  canvas.detach();
}
