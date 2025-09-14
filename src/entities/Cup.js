import { COLORS, ROUND_TO, powderRadius } from '../constants.js';

export class Cup {
  constructor(targetMl, opts = {}) {
    this.targetMl = targetMl ?? 250; // default per-cup target, no global constant
    this.targetTolerance = opts.targetTolerance ?? 0; // ml tolerance (+/-)
    this.gridN = Math.max(2, opts.gridN ?? 8);
    this.maxImbalanceCV = opts.maxImbalanceCV ?? 0.35; // coefficient of variation allowed
    this.volume = 0; // ml (float)
    this._initGrid();
  }

  _initGrid() {
    const n = this.gridN;
    this.grid = new Float32Array(n * n); // ml per cell
    // precompute mask: cell centers inside unit circle
    this.gridMask = new Uint8Array(n * n);
    let inside = 0;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const cx = -1 + (i + 0.5) * (2 / n);
        const cy = -1 + (j + 0.5) * (2 / n);
        const idx = j * n + i;
        if (cx * cx + cy * cy <= 1) { this.gridMask[idx] = 1; inside++; }
      }
    }
    this.gridInsideCount = inside;
  }

  reset() {
    this.volume = 0;
    if (!this.grid || this.grid.length !== this.gridN * this.gridN) this._initGrid();
    else this.grid.fill(0);
  }

  // Add poured volume at a given screen position
  pourAt(x, y, deltaMl, layout) {
    if (deltaMl <= 0) return;
    const { cupCX, cupCY, cupR, ringT } = layout;
    const dx = x - cupCX;
    const dy = y - cupCY;
    const innerR = powderRadius(cupR, ringT);
    // 僅在粉面有效區域內才累加
    if (dx * dx + dy * dy > innerR * innerR) return;
    // 仍以整個杯面座標映射到格子索引（維持現有網格劃分）
    const nx = dx / cupR;
    const ny = dy / cupR;
    const n = this.gridN;
    const i = Math.max(0, Math.min(n - 1, Math.floor((nx + 1) * 0.5 * n)));
    const j = Math.max(0, Math.min(n - 1, Math.floor((ny + 1) * 0.5 * n)));
    const idx = j * n + i;
    this.grid[idx] += deltaMl;
    this.volume += deltaMl;
  }

  // Back-compat: uniform pour without position
  pour(rateMlPerSec, dt) {
    const dv = rateMlPerSec * dt;
    if (dv > 0) this.volume += dv;
  }

  getRoundedVolume(roundTo = ROUND_TO) {
    return Math.round(this.volume / roundTo) * roundTo;
  }

  isWin(toleranceMl = this.targetTolerance, roundTo = ROUND_TO) {
    const v = this.getRoundedVolume(roundTo);
    return Math.abs(v - this.targetMl) <= toleranceMl;
  }

  isOverflow() {
    return this.volume > this.targetMl;
  }

  isUniform(maxCV = this.maxImbalanceCV) {
    const n = this.gridN;
    const g = this.grid;
    const mask = this.gridMask;
    if (!g || !mask) return true;
    if (this.gridInsideCount <= 0) return true;
    // compute mean over inside cells
    let sum = 0;
    for (let idx = 0; idx < g.length; idx++) if (mask[idx]) sum += g[idx];
    const m = sum / this.gridInsideCount;
    if (m <= 0) return false; // no pour at all => not uniform
    // variance
    let ss = 0;
    for (let idx = 0; idx < g.length; idx++) if (mask[idx]) { const d = g[idx] - m; ss += d * d; }
    const varv = ss / this.gridInsideCount;
    const std = Math.sqrt(varv);
    const cv = std / m; // coefficient of variation
    return cv <= maxCV;
  }

  // layout: { cupCX, cupCY, cupR, ringT }
  draw(ctx, layout, volume, targetMl = this.targetMl) {
    const { cupCX, cupCY, cupR, ringT } = layout;

    // body disk
    ctx.save();
    ctx.fillStyle = COLORS.cup;
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.arc(cupCX, cupCY, cupR + ringT * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // rim ring
    ctx.save();
    ctx.lineWidth = ringT;
    ctx.strokeStyle = COLORS.cupRim;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(cupCX, cupCY, cupR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // filter paper ring (just inside the rim)
    ctx.save();
    const filterR = Math.max(6, cupR - ringT * 0.55);
    const filterT = Math.max(4, ringT * 0.8);
    ctx.lineWidth = filterT;
    ctx.strokeStyle = COLORS.filter;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(cupCX, cupCY, filterR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // coffee grounds shading using grid values
    const n = this.gridN;
    const g = this.grid;
    const mask = this.gridMask;
    if (g && mask && n) {
      // compute max for normalization
      let vmax = 0;
      for (let idx = 0; idx < g.length; idx++) if (mask[idx] && g[idx] > vmax) vmax = g[idx];
      const innerR = powderRadius(cupR, ringT);
      ctx.save();
      // clip to inner grounds circle
      ctx.beginPath();
      ctx.arc(cupCX, cupCY, innerR, 0, Math.PI * 2);
      ctx.clip();
      // helper to lerp between two hex colors
      const hexToRgb = (h) => {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
        return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 0, g: 0, b: 0 };
      };
      const rgbL = hexToRgb(COLORS.groundsLight);
      const rgbD = hexToRgb(COLORS.groundsDark);
      const mix = (t) => {
        const r = Math.round(rgbL.r + (rgbD.r - rgbL.r) * t);
        const g2 = Math.round(rgbL.g + (rgbD.g - rgbL.g) * t);
        const b = Math.round(rgbL.b + (rgbD.b - rgbL.b) * t);
        return `rgb(${r},${g2},${b})`;
      };
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const idx = j * n + i;
          if (!mask[idx]) continue;
          const x0 = cupCX + (-1 + i * (2 / n)) * cupR;
          const y0 = cupCY + (-1 + j * (2 / n)) * cupR;
          const x1 = cupCX + (-1 + (i + 1) * (2 / n)) * cupR;
          const y1 = cupCY + (-1 + (j + 1) * (2 / n)) * cupR;
          const v = g[idx] || 0;
          const t = vmax > 0 ? Math.min(1, v / vmax) : 0; // 0..1
          ctx.fillStyle = mix(t);
          ctx.globalAlpha = 0.85;
          ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        }
      }
      ctx.restore();
    }

    // remove circular progress (kept realistic)
  }
}
