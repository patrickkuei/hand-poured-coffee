import { COLORS } from '../constants.js';

export class Button {
  constructor(label = '') {
    this.label = label;
    this.x = 0; this.y = 0; this.w = 0; this.h = 0;
  }

  setRect(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
  }

  contains(x, y) {
    return x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h;
  }

  draw(ctx, hovered = false) {
    // background
    ctx.fillStyle = hovered ? COLORS.buttonBgHover : COLORS.buttonBg;
    // rounded rect
    const r = 10;
    ctx.beginPath();
    const x = this.x, y = this.y, w = this.w, h = this.h;
    const rr = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
    ctx.fill();

    // label
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 20px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.label, x + w / 2, y + h / 2 + 1);
  }
}

