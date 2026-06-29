// Rising-bubble field shared by the realistic renderers. Bubbles spawn in the lower part of
// the fluid, rise, and fade as they approach the surface — same idea as the classic meter.

interface Bubble {
  x: number;
  y: number;
  r: number;
  vy: number; // px/s rise speed
}

export interface BubbleField {
  resize(width: number, height: number): void;
  step(dt: number, top: number, bottom: number): void;
  draw(ctx: CanvasRenderingContext2D, top: number, bottom: number): void;
}

export function createBubbles(amount = 10): BubbleField {
  const bubbles: Bubble[] = [];
  let width = 300;

  function spawn(b: Bubble, bottom: number): void {
    b.x = Math.random() * width;
    b.y = bottom - Math.random() * 6;
    b.r = 1 + Math.random() * 2;
    b.vy = 15 + Math.random() * 20;
  }

  return {
    resize(w: number): void {
      width = w;
    },
    step(dt: number, top: number, bottom: number): void {
      while (bubbles.length < amount) {
        const b = { x: 0, y: 0, r: 0, vy: 0 };
        spawn(b, bottom);
        b.y = top + Math.random() * (bottom - top); // first spread through the column
        bubbles.push(b);
      }
      for (const b of bubbles) {
        b.y -= b.vy * dt;
        if (b.y <= top + 4) spawn(b, bottom);
      }
    },
    draw(ctx: CanvasRenderingContext2D, top: number, bottom: number): void {
      const span = Math.max(1, bottom - top);
      for (const b of bubbles) {
        if (b.y < top || b.y > bottom) continue;
        const opacity = 0.5 * ((b.y - top) / span); // faint near the surface, clearer deep
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255,255,255,${opacity.toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.arc(b.x, b.y, b.r, 0, 2 * Math.PI);
        ctx.stroke();
      }
    },
  };
}
