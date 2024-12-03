import { ElementSize } from './fluid-level-background-card';
import { FluidMeterInstance, FluidMeterOptions, Layer, FluidMeterEnv, Bubble } from './fluid-meter.interface';
import { rgbaToString } from './utils/color';

export function FluidMeter(): FluidMeterInstance {
  let canvas;
  let context: CanvasRenderingContext2D | null;
  let targetContainer: Element;

  let time: number | null = null;
  let dt = 0;

  let stop = false;
  let fpsInterval, startTime, then, elapsed;

  const options: FluidMeterOptions = {
    drawShadow: true,
    drawText: true,
    drawPercentageSign: true,
    drawBubbles: false,
    fontSize: '70px',
    fontFamily: 'Arial',
    fontFillStyle: 'white',
    size: 300,
    width: 300,
    levelOffset: 0,
    borderWidth: 25,
    backgroundColor: '#e2e2e2',
    foregroundColor: '#fafafa',
  };

  let currentFillPercentage = 0;
  let fillPercentage = 0;

  //#region fluid context values
  const foregroundFluidLayer: Layer = {
    fillStyle: 'purple',
    angle: 0,
    horizontalPosition: 0,
    angularSpeed: 0,
    maxAmplitude: 9,
    frequency: 30,
    horizontalSpeed: -150,
    initialHeight: 0,
  };

  const backgroundFluidLayer: Layer = {
    fillStyle: 'pink',
    angle: 0,
    horizontalPosition: 0,
    angularSpeed: 140,
    maxAmplitude: 12,
    frequency: 40,
    horizontalSpeed: 150,
    initialHeight: 0,
  };

  const bubblesLayer = {
    bubbles: [],
    amount: 12,
    amountLimit: 12,
    speed: 20,
    current: 0,
    swing: 0,
    size: 2,
    reset: function (bubble: Bubble) {
      // calculate the area where to spawn the bubble based on the fluid area
      const meterBottom = getMeterBottom();
      const fluidAmount = getFluidAmount();

      bubble.r = random(this.size, this.size * 2) / 2;
      bubble.x = random(0, options.width);
      bubble.y = random(meterBottom, meterBottom - fluidAmount);
      bubble.velX = 0;
      bubble.velY = random(this.speed, this.speed * 2);
      bubble.swing = random(0, 2 * Math.PI);
    },
    init() {
      const meterBottom = getMeterBottom();
      const fluidAmount = getFluidAmount();

      for (let i = 0; i < this.amount; i++) {
        (this.bubbles as Bubble[]).push({
          x: random(0, options.width),
          y: random(meterBottom, meterBottom - fluidAmount),
          r: random(this.size, this.size * 2) / 2,
          velX: 0,
          velY: random(this.speed, this.speed * 2),
        } as Bubble);
      }
    },
  };
  //#endregion

  /**
   * initializes and mount the canvas element on the document
   */
  function setupCanvas() {
    canvas = document.createElement('canvas');
    canvas.width = options.width as number;
    canvas.height = options.height as number;
    context = canvas.getContext('2d');

    if (context) {
      context.imageSmoothingEnabled = true;
      targetContainer.appendChild(canvas);

      // shadow is not required  to be on the draw loop
      //#region shadow
      if (options.drawShadow) {
        context.save();
        context.beginPath();
        context.filter = 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))';
        context.arc(options.size * 0.5, options.size * 0.5, getMeterRadius() * 0.5, 0, 2 * Math.PI);
        context.closePath();
        context.fill();
        context.restore();
      }
      //#endregion
    }
  }

  function startDrawing(fps: number) {
    fpsInterval = 1000 / fps;
    then = window.performance.now();
    startTime = then;
    draw(startTime);
  }

  /**
   * draw cycle
   */
  function draw(newtime: number) {
    if (stop) {
      return;
    }
    const now = newtime ?? new Date().getTime();
    dt = (newtime - (time || now)) / 1000;
    time = newtime;

    elapsed = now - then;

    requestAnimationFrame(draw);

    if (elapsed > fpsInterval) {
      if (context) {
        context.clearRect(0, 0, options.width as number, options.height as number);
      }
      drawMeterBackground();
      drawFluid();
      if (options.drawText) {
        drawText();
      }
    }
  }

  function drawMeterBackground() {
    const arcX = options.size * 0.5;
    const arcY = options.size * 0.5;
    const arcRadius = getMeterRadius() - options.borderWidth;

    if (arcX < 0 || arcY < 0 || arcRadius < 0) {
      return;
    }

    if (context) {
      context.save();
      context.fillStyle = options.backgroundColor;
      context.beginPath();
      context.arc(options.size * 0.5, options.size * 0.5, getMeterRadius() - options.borderWidth, 0, 2 * Math.PI);
      context.rect(0, 0, options.width as number, options.height as number);

      context.closePath();
      context.fill();
      context.restore();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function drawMeterForeground() {
    if (context) {
      context.save();
      context.lineWidth = options.borderWidth;
      context.strokeStyle = options.foregroundColor;
      context.beginPath();
      context.arc(
        options.size * 0.5,
        options.size * 0.5,
        getMeterRadius() * 0.5 - options.borderWidth * 0.5,
        0,
        2 * Math.PI,
      );
      context.rect(0, 0, options.width as number, options.height as number);

      context.closePath();
      context.stroke();
      context.restore();
    }
  }
  /**
   * draws the fluid contents of the meter
   */
  function drawFluid() {
    if (context) {
      context.save();

      drawFluidLayer(backgroundFluidLayer);
      drawFluidLayer(foregroundFluidLayer);
      if (options.drawBubbles) {
        drawBubblesLayer();
      }
      context.restore();
    }
  }

  /**
   * draws the foreground fluid layer
   * @param  {} dt elapsed time since last frame
   */
  function drawFluidLayer(layer) {
    // calculate wave angle
    if (layer.angularSpeed > 0) {
      layer.angle += layer.angularSpeed * dt;
      layer.angle = layer.angle < 0 ? layer.angle + 360 : layer.angle;
    }

    // calculate horizontal position
    layer.horizontalPosition += layer.horizontalSpeed * dt;
    if (layer.horizontalSpeed > 0) {
      layer.horizontalPosition = layer.horizontalPosition > Math.pow(2, 53) ? 0 : layer.horizontalPosition;
    } else if (layer.horizontalPosition < 0) {
      layer.horizontalPosition = layer.horizontalPosition < -1 * Math.pow(2, 53) ? 0 : layer.horizontalPosition;
    }

    let x = 0;
    let y = 0;
    const amplitude = layer.maxAmplitude * Math.sin((layer.angle * Math.PI) / 180);

    const meterBottom = getMeterBottom();
    const fluidAmount = getFluidAmount();

    if (currentFillPercentage < fillPercentage) {
      currentFillPercentage += 15 * dt;
    } else if (currentFillPercentage > fillPercentage) {
      currentFillPercentage -= 15 * dt;
    }

    layer.initialHeight = meterBottom - fluidAmount;

    if (context) {
      context.save();
      context.beginPath();

      context.lineTo(0, layer.initialHeight);

      while (x < options.size) {
        y = layer.initialHeight + amplitude * Math.sin((x + layer.horizontalPosition) / layer.frequency);
        context.lineTo(x, y);
        x++;
      }

      context.lineTo(x, options.size);
      context.lineTo(0, options.size);
      context.closePath();

      context.fillStyle = layer.fillStyle;
      context.fill();
      context.clip();
      context.restore();
    }
  }

  /**
   * clipping mask for objects within the fluid constrains
   * @param {Object} layer layer to be used as a mask
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function drawFluidMask(layer) {
    let x = 0;
    let y = 0;
    const amplitude = layer.maxAmplitude * Math.sin((layer.angle * Math.PI) / 180);

    if (context) {
      context.beginPath();

      context.lineTo(0, layer.initialHeight);

      while (x < options.size) {
        y = layer.initialHeight + amplitude * Math.sin((x + layer.horizontalPosition) / layer.frequency);
        context.lineTo(x, y);
        x++;
      }
      context.lineTo(x, options.size);
      context.lineTo(0, options.size);
      context.closePath();
      context.clip();
    }
  }

  function drawBubblesLayer() {
    if (!context) {
      return;
    }
    context.save();
    const meterBottom = getMeterBottom();
    const fluidAmount = getFluidAmount();

    bubblesLayer.bubbles.forEach((bubble: Bubble, index: number) => {
      if (fillPercentage > 10 && index < Math.max(bubblesLayer.amountLimit - 1, 1)) {
        drawBubble(bubble, fluidAmount, meterBottom);
      }
    });

    context.restore();
  }

  function drawBubble(bubble: Bubble, fluidAmount: number, meterBottom: number): void {
    if (!context) {
      return;
    }

    const limit = meterBottom - fluidAmount;
    const opacity = (bubble.y - limit) / (meterBottom - limit);

    context.beginPath();
    context.strokeStyle = `rgba(255,255,255, ${opacity})`;
    context.arc(bubble.x, bubble.y, bubble.r, 0, 2 * Math.PI, false);
    context.stroke();
    context.closePath();

    const currentSpeed = bubblesLayer.current * dt;
    let swing = bubblesLayer.swing;
    const adjustedSwing = (swing += 0.03);

    bubble.velX =
      Math.abs(bubble.velX) < Math.abs(bubblesLayer.current) ? bubble.velX + currentSpeed : bubblesLayer.current;
    bubble.y = bubble.y - bubble.velY * dt;
    bubble.x += (swing ? 0.4 * Math.cos(adjustedSwing) * swing : 0) + bubble.velX * 0.5;

    // determine if current bubble is outside the safe area
    if (bubble.y <= meterBottom - fluidAmount + 10) {
      bubblesLayer.reset(bubble);
    }
  }

  function drawText() {
    const text = options.drawPercentageSign ? currentFillPercentage.toFixed(0) + '%' : currentFillPercentage.toFixed(0);

    if (context) {
      context.save();
      context.font = getFontSize();
      context.fillStyle = options.fontFillStyle as string;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.filter = 'drop-shadow(0px 0px 5px rgba(0,0,0,0.4))';
      context.fillText(text, options.size / 2, options.size / 2);
      context.restore();
    }
  }

  //#region helper methods
  function clamp(number, min, max) {
    return Math.min(Math.max(number, min), max);
  }

  function getMeterRadius() {
    return options.size * 0.9;
  }

  function random(min, max) {
    const delta = max - min;
    return max === min ? min : Math.random() * delta + min;
  }

  function getFontSize() {
    return options.fontSize + ' ' + options.fontFamily;
  }

  function getMeterBottom(): number {
    return options.height ?? 0 - options.levelOffset - (options.size - getMeterRadius()) * 0.5 - options.borderWidth;
  }

  function getFluidAmount(): number {
    return (currentFillPercentage * (options.height as number)) / 100;
  }

  function initOptions(envOptions: FluidMeterOptions): void {
    options.drawShadow = envOptions.drawShadow === false ? false : true;
    options.size = envOptions.size;
    options.width = envOptions.width;
    options.height = envOptions.height;
    options.drawBubbles = envOptions.drawBubbles === false ? false : true;
    options.borderWidth = envOptions.borderWidth || options.borderWidth;
    options.foregroundFluidColor = envOptions.foregroundFluidColor || options.foregroundFluidColor;
    options.backgroundFluidColor = envOptions.backgroundFluidColor || options.backgroundFluidColor;
    options.backgroundColor = envOptions.backgroundColor || options.backgroundColor;
    options.foregroundColor = envOptions.foregroundColor || options.foregroundColor;

    options.drawText = envOptions.drawText === false ? false : true;
    options.drawPercentageSign = envOptions.drawPercentageSign === false ? false : true;
    options.fontSize = envOptions.fontSize || options.fontSize;
    options.fontFamily = envOptions.fontFamily || options.fontFamily;
    options.fontFillStyle = envOptions.fontFillStyle || options.fontFillStyle;
    // fluid settings

    if (envOptions.foregroundFluidLayer) {
      initLayerOptions(foregroundFluidLayer, envOptions.foregroundFluidLayer);
    }

    if (envOptions.backgroundFluidLayer) {
      initLayerOptions(backgroundFluidLayer, envOptions.backgroundFluidLayer);
    }
  }

  function initLayerOptions(layer: Layer, envLayer: Layer): void {
    layer.fillStyle = envLayer.fillStyle || layer.fillStyle;
    layer.angularSpeed = envLayer.angularSpeed || layer.angularSpeed;
    layer.maxAmplitude = envLayer.maxAmplitude || layer.maxAmplitude;
    layer.frequency = envLayer.frequency || layer.frequency;
    layer.horizontalSpeed = envLayer.horizontalSpeed || layer.horizontalSpeed;
  }
  //#endregion

  return {
    init: function (env: FluidMeterEnv) {
      if (!env.targetContainer) {
        throw new Error('empty or invalid container');
      }

      targetContainer = env.targetContainer;
      fillPercentage = clamp(env.fillPercentage, 0, 100);

      if (env.options) {
        initOptions(env.options);
      }

      bubblesLayer.init();
      setupCanvas();
      this.start();
    },
    setPercentage(percentage: number) {
      fillPercentage = clamp(percentage, 0, 100);
      bubblesLayer.amountLimit = Math.round(bubblesLayer.amount * (fillPercentage / 100));
    },
    setDrawBubbles(shouldDraw: boolean) {
      if (!shouldDraw) {
        options.drawBubbles = false;
        return;
      }

      const drawBubbles = () => {
        const now = new Date().getTime();
        dt = (now - (time || now)) / 1000;
        options.drawBubbles = true;
        drawBubblesLayer();
      };

      requestAnimationFrame(drawBubbles);
    },
    setColor(foreggroundColor: string, backgroundColor: string) {
      backgroundFluidLayer.fillStyle = backgroundColor;
      foregroundFluidLayer.fillStyle = foreggroundColor;
    },
    setBackGroundColor(backgroundColor: number[]) {
      if (backgroundColor.length < 3) {
        return;
      }
      const alpha = backgroundColor.length > 3 ? backgroundColor[3] : 1;
      options.backgroundColor = rgbaToString(backgroundColor, alpha);
    },
    setLevelColor(levelColor: number[]) {
      if (levelColor.length < 3) {
        return;
      }
      const alpha = levelColor.length > 3 ? levelColor[3] : 1;
      const backgroundAlpha = alpha * 0.3;

      foregroundFluidLayer.fillStyle = rgbaToString(levelColor, alpha);
      backgroundFluidLayer.fillStyle = rgbaToString(levelColor, backgroundAlpha);
    },
    resizeCanvas(size: ElementSize) {
      options.width = size.width;
      options.height = size.height;
      // we choose the largest number to fill tha container with the meter
      options.size = Math.max(size.height, size.width);

      if (canvas) {
        canvas.width = size.width;
        canvas.height = size.height;
        context = canvas.getContext('2d');
      }
    },
    stop() {
      stop = true;
    },
    start() {
      stop = false;
      startDrawing(24);
    },
  };
}
