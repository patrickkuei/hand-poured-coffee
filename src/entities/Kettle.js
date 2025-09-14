import { COLORS, ACCEL, MAX_RATE, BEST_RATE } from '../constants.js';

export class Kettle {
  constructor() {
    this.spoutX = 0;
    this.spoutY = 0;
    this.isHolding = false;
    this.pourRate = 0; // ml/s
    // fixed spout orientation (radians). For right-side kettle, point left.
    this.spoutAngleRad = Math.PI; // 180° (toward left)
    this.holdTime = 0; // seconds since press
    this.releaseTime = 0; // seconds since release
  }

  reset() {
    this.isHolding = false;
    this.pourRate = 0;
    this.holdTime = 0;
    this.releaseTime = 0;
  }

  // Input: start/stop holding to pour
  setHolding(down) {
    const next = !!down;
    if (next && !this.isHolding) {
      // pressed
      this.holdTime = 0;
    } else if (!next && this.isHolding) {
      // released
      this.releaseTime = 0;
    }
    this.isHolding = next;
  }

  // Integrate pour rate while holding
  update(dt) {
    if (this.isHolding) {
      // piecewise ramp by time held:
      // <1s very slow, <3s medium, <5s medium-high, >=5s normal
      this.holdTime += dt;
      let holdMul;
      if (this.holdTime < 1.0) holdMul = 0.20;
      else if (this.holdTime < 3.0) holdMul = 0.55;
      else if (this.holdTime < 5.0) holdMul = 0.85;
      else holdMul = 1.0;

      // stage-specific cap so medium階段對應最佳速率
      let stageMax;
      if (this.holdTime < 1.0) stageMax = BEST_RATE * 0.5;
      else if (this.holdTime < 3.0) stageMax = BEST_RATE; // medium == best
      else if (this.holdTime < 5.0) stageMax = Math.min(MAX_RATE, BEST_RATE * 1.5);
      else stageMax = MAX_RATE;

      const accel = ACCEL * holdMul;
      if (this.holdTime >= 1.0 && this.holdTime < 3.0) {
        // keep a steady best rate during 1s..3s window
        this.pourRate = BEST_RATE;
      } else {
        this.pourRate = Math.min(stageMax, this.pourRate + accel * dt);
      }
    } else if (this.pourRate > 0) {
      // quick decay when released (no drawing because not holding)
      this.releaseTime += dt;
      const decel = ACCEL * 2.0; // faster than ramp up
      this.pourRate = Math.max(0, this.pourRate - decel * dt);
    }
  }

  isPouring() { return this.isHolding && this.pourRate > 0; }

  // Compute spout position toward a target (e.g., cup center)
  computeSpout(layout, targetX, targetY) {
    const { ketCX, ketCY, rx, ry } = layout;
    const theta = Math.atan2(targetY - ketCY, targetX - ketCX);
    const spoutX = Math.floor(ketCX + rx * Math.cos(theta));
    const spoutY = Math.floor(ketCY + ry * Math.sin(theta));
    return { x: spoutX, y: spoutY, theta };
  }

  // Compute spout at a fixed angle relative to kettle body (no target tracking)
  computeFixedSpout(layout, angleRad = this.spoutAngleRad) {
    const { ketCX, ketCY, rx, ry } = layout;
    const spoutX = Math.floor(ketCX + rx * Math.cos(angleRad));
    const spoutY = Math.floor(ketCY + ry * Math.sin(angleRad));
    return { x: spoutX, y: spoutY, theta: angleRad };
  }

  // layout: { ketCX, ketCY, rx, ry }
  draw(ctx, layout) {
    const { rx, ry } = layout;
    // compute spout position at fixed angle
    const { x: spoutX, y: spoutY, theta } = this.computeFixedSpout(layout);
    this.spoutX = spoutX;
    this.spoutY = spoutY;

    // draw a long gooseneck only (first-person)
    ctx.save();
    const dirX = Math.cos(theta), dirY = Math.sin(theta);
    const nX = -dirY, nY = dirX;
    const neckLen = Math.max(80, Math.floor(Math.min(rx, ry) * 2.6));
    const width = Math.max(4, Math.floor(Math.min(rx, ry) * 0.18));
    const baseX = spoutX - dirX * neckLen;
    const baseY = spoutY - dirY * neckLen;
    const c1x = spoutX - dirX * (neckLen * 0.35) + nX * (neckLen * 0.18);
    const c1y = spoutY - dirY * (neckLen * 0.35) + nY * (neckLen * 0.18);
    const c2x = spoutX - dirX * (neckLen * 0.70) - nX * (neckLen * 0.22);
    const c2y = spoutY - dirY * (neckLen * 0.70) - nY * (neckLen * 0.22);
    ctx.strokeStyle = COLORS.kettle;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.bezierCurveTo(c2x, c2y, c1x, c1y, spoutX, spoutY);
    ctx.stroke();
    ctx.restore();
  }

  getSpout() { return { x: this.spoutX, y: this.spoutY }; }
}
