import { ElementSize } from '../fluid-level-background-card';

export interface Bubble {
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
  levelOffset: number;
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
  setDrawBubbles(draw: boolean);
  setColor(foreggroundColor: string, backgroundColor: string);
  setBackGroundColor(backgroundColor: string);
  resizeCanvas(newSize: ElementSize);
  stop();
  start();
};
