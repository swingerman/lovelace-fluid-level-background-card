interface Bubble {
  r: number;
  x: number;
  y: number;
  velX: number;
  velY: number;
  swing: number;
}

export interface Layer {
  fillStyle: string;
  angle?: number;
  horizontalPosition?: number;
  angularSpeed: number;
  maxAmplitude: number;
  frequency: number;
  horizontalSpeed: number;
  initialHeight?: number;
}

export interface FluidMeterOptions {
  drawShadow?: boolean;
  drawText?: boolean;
  drawPercentageSign: boolean;
  drawBubbles: boolean;
  fontSize?: string;
  fontFamily: string;
  fontFillStyle?: string;
  size: number;
  borderWidth: number;
  backgroundColor: string;
  foregroundColor: string;
  width?: number;
  height?: number;
  foregroundFluidColor?: string;
  backgroundFluidColor?: string;
  foregroundFluidLayer?: Layer;
  backgroundFluidLayer?: Layer;
}

export interface FluidMeterEnv {
  targetContainer: Element | null | undefined;
  fillPercentage: number;
  options: FluidMeterOptions;
}

export type FluidMeterInstance = {
  init(env: FluidMeterEnv);
  setPercentage(percentage: number);
};

export function FluidMeter(): FluidMeterInstance {
  let context: CanvasRenderingContext2D | null;
  let targetContainer: Element;

  let time: number | null = null;
  let dt: number | null = null;

  const options: FluidMeterOptions = {
    drawShadow: true,
    drawText: true,
    drawPercentageSign: true,
    drawBubbles: true,
    fontSize: '70px',
    fontFamily: 'Arial',
    fontFillStyle: 'white',
    size: 300,
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
    speed: 20,
    current: 0,
    swing: 0,
    size: 2,
    reset: function (bubble: Bubble) {
      // calculate the area where to spawn the bubble based on the fluid area
      const meterBottom = options.size - (options.size - getMeterRadius()) / 2 - options.borderWidth;
      const fluidAmount = (currentFillPercentage * (getMeterRadius() - options.borderWidth * 2)) / 100;

      bubble.r = random(this.size, this.size * 2) / 2;
      bubble.x = random(0, options.size);
      bubble.y = random(meterBottom, meterBottom - fluidAmount);
      bubble.velX = 0;
      bubble.velY = random(this.speed, this.speed * 2);
      bubble.swing = random(0, 2 * Math.PI);
    },
    init() {
      for (let i = 0; i < this.amount; i++) {
        const meterBottom = options.size - (options.size - getMeterRadius()) / 2 - options.borderWidth;
        const fluidAmount = (currentFillPercentage * (getMeterRadius() - options.borderWidth * 2)) / 100;
        (this.bubbles as Bubble[]).push({
          x: random(0, options.size),
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
    const canvas = document.createElement('canvas');
    canvas.width = options.size;
    canvas.height = options.size;
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
        context.arc(options.size / 2, options.size / 2, getMeterRadius() / 2, 0, 2 * Math.PI);
        context.closePath();
        context.fill();
        context.restore();
      }
      //#endregion
    }
  }

  /**
   * draw cycle
   */
  function draw() {
    const now = new Date().getTime();
    dt = (now - (time || now)) / 1000;
    time = now;

    requestAnimationFrame(draw);
    if (context) {
      context.clearRect(0, 0, options.width as number, options.height as number);
    }
    drawMeterBackground();
    drawFluid(dt);
    if (options.drawText) {
      drawText();
    }
    //drawMeterForeground();
  }

  function drawMeterBackground() {
    if (context) {
      context.save();
      context.fillStyle = options.backgroundColor;
      context.beginPath();
      //context.arc(options.size / 2, options.size / 2, getMeterRadius() / 2 - options.borderWidth, 0, 2 * Math.PI);
      context.arc(options.size / 2, options.size / 2, getMeterRadius() - options.borderWidth, 0, 2 * Math.PI);
      context.rect(0, 0, options.width as number, options.height as number);

      context.closePath();
      context.fill();
      context.restore();
    }
  }

  function drawMeterForeground() {
    if (context) {
      context.save();
      context.lineWidth = options.borderWidth;
      context.strokeStyle = options.foregroundColor;
      context.beginPath();
      context.arc(options.size / 2, options.size / 2, getMeterRadius() / 2 - options.borderWidth / 2, 0, 2 * Math.PI);
      context.rect(0, 0, options.width as number, options.height as number);

      context.closePath();
      context.stroke();
      context.restore();
    }
  }
  /**
   * draws the fluid contents of the meter
   * @param  {} dt elapsed time since last frame
   */
  function drawFluid(dt) {
    if (context) {
      context.save();
      context.arc(options.size / 2, options.size / 2, getMeterRadius() / 2 - options.borderWidth, 0, Math.PI * 2);
      //context.arc(options.size / 2, options.size / 2, getMeterRadius() - options.borderWidth, 0, Math.PI * 2);
      //context.rect(options.size / 2, options.size / 2, (options.size / 2) as number, options.height as number);
      context.clip();
      drawFluidLayer(backgroundFluidLayer, dt);
      drawFluidLayer(foregroundFluidLayer, dt);
      if (options.drawBubbles) {
        //drawFluidMask(foregroundFluidLayer);
        drawBubblesLayer(dt);
      }
      context.restore();
    }
  }

  /**
   * draws the foreground fluid layer
   * @param  {} dt elapsed time since last frame
   */
  function drawFluidLayer(layer, dt) {
    // calculate wave angle
    if (layer.angularSpeed > 0) {
      layer.angle += layer.angularSpeed * dt;
      layer.angle = layer.angle < 0 ? layer.angle + 360 : layer.angle;
    }

    // calculate horizontal position
    layer.horizontalPosition += layer.horizontalSpeed * dt;
    if (layer.horizontalSpeed > 0) {
      layer.horizontalPosition > Math.pow(2, 53) ? 0 : layer.horizontalPosition;
    } else if (layer.horizontalPosition < 0) {
      layer.horizontalPosition < -1 * Math.pow(2, 53) ? 0 : layer.horizontalPosition;
    }

    let x = 0;
    let y = 0;
    const amplitude = layer.maxAmplitude * Math.sin((layer.angle * Math.PI) / 180);

    const meterBottom = options.size - (options.size - getMeterRadius()) / 2 - options.borderWidth;
    const fluidAmount = (currentFillPercentage * (getMeterRadius() - options.borderWidth * 2)) / 100;

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

  function drawBubblesLayer(dt) {
    if (context) {
      context.save();
      for (let i = 0; i < bubblesLayer.bubbles.length; i++) {
        const bubble = bubblesLayer.bubbles[i] as Bubble;

        context.beginPath();
        context.strokeStyle = 'white';
        context.arc(bubble.x, bubble.y, bubble.r, 2 * Math.PI, 2 * Math.PI, false);
        context.stroke();
        context.closePath();

        const currentSpeed = bubblesLayer.current * dt;

        bubble.velX =
          Math.abs(bubble.velX) < Math.abs(bubblesLayer.current) ? bubble.velX + currentSpeed : bubblesLayer.current;
        bubble.y = bubble.y - bubble.velY * dt;
        bubble.x =
          bubble.x +
          (bubblesLayer.swing ? 0.4 * Math.cos((bubblesLayer.swing += 0.03)) * bubblesLayer.swing : 0) +
          bubble.velX * 0.5;

        // determine if current bubble is outside the safe area
        const meterBottom = options.size - (options.size - getMeterRadius()) / 2 - options.borderWidth;
        const fluidAmount = (currentFillPercentage * (getMeterRadius() - options.borderWidth * 2)) / 100;

        if (bubble.y <= meterBottom - fluidAmount) {
          bubblesLayer.reset(bubble);
        }
      }
      context.restore();
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
  //#endregion

  return {
    init: function (env: FluidMeterEnv) {
      if (!env.targetContainer) throw 'empty or invalid container';

      targetContainer = env.targetContainer;
      fillPercentage = clamp(env.fillPercentage, 0, 100);

      if (env.options) {
        options.drawShadow = env.options.drawShadow === false ? false : true;
        options.size = env.options.size;
        options.drawBubbles = env.options.drawBubbles === false ? false : true;
        options.borderWidth = env.options.borderWidth || options.borderWidth;
        options.foregroundFluidColor = env.options.foregroundFluidColor || options.foregroundFluidColor;
        options.backgroundFluidColor = env.options.backgroundFluidColor || options.backgroundFluidColor;
        options.backgroundColor = env.options.backgroundColor || options.backgroundColor;
        options.foregroundColor = env.options.foregroundColor || options.foregroundColor;

        options.drawText = env.options.drawText === false ? false : true;
        options.drawPercentageSign = env.options.drawPercentageSign === false ? false : true;
        options.fontSize = env.options.fontSize || options.fontSize;
        options.fontFamily = env.options.fontFamily || options.fontFamily;
        options.fontFillStyle = env.options.fontFillStyle || options.fontFillStyle;
        // fluid settings

        if (env.options.foregroundFluidLayer) {
          foregroundFluidLayer.fillStyle = env.options.foregroundFluidLayer.fillStyle || foregroundFluidLayer.fillStyle;
          foregroundFluidLayer.angularSpeed =
            env.options.foregroundFluidLayer.angularSpeed || foregroundFluidLayer.angularSpeed;
          foregroundFluidLayer.maxAmplitude =
            env.options.foregroundFluidLayer.maxAmplitude || foregroundFluidLayer.maxAmplitude;
          foregroundFluidLayer.frequency = env.options.foregroundFluidLayer.frequency || foregroundFluidLayer.frequency;
          foregroundFluidLayer.horizontalSpeed =
            env.options.foregroundFluidLayer.horizontalSpeed || foregroundFluidLayer.horizontalSpeed;
        }

        if (env.options.backgroundFluidLayer) {
          backgroundFluidLayer.fillStyle = env.options.backgroundFluidLayer.fillStyle || backgroundFluidLayer.fillStyle;
          backgroundFluidLayer.angularSpeed =
            env.options.backgroundFluidLayer.angularSpeed || backgroundFluidLayer.angularSpeed;
          backgroundFluidLayer.maxAmplitude =
            env.options.backgroundFluidLayer.maxAmplitude || backgroundFluidLayer.maxAmplitude;
          backgroundFluidLayer.frequency = env.options.backgroundFluidLayer.frequency || backgroundFluidLayer.frequency;
          backgroundFluidLayer.horizontalSpeed =
            env.options.backgroundFluidLayer.horizontalSpeed || backgroundFluidLayer.horizontalSpeed;
        }
      }

      bubblesLayer.init();
      setupCanvas();
      draw();
    },
    setPercentage(percentage: number) {
      fillPercentage = clamp(percentage, 0, 100);
    },
  };
}
