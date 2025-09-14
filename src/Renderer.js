import { COLORS, ROUND_TO, SHOW_GRID_OVERLAY, SHOW_POUR_ZONE_OVERLAY, SHOW_RATE } from './constants.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._dpr = 1;
  }

  resize(cssW, cssH, dpr) {
    this._dpr = dpr || 1;
    this.canvas.width = Math.floor(cssW * this._dpr);
    this.canvas.height = Math.floor(cssH * this._dpr);
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
  }

  computeLayout(W, H) {
    const S = Math.min(W, H);
    const cupR = Math.floor(S * 0.30);
    const ringT = Math.max(10, Math.floor(cupR * 0.18));
    const cupCX = Math.floor(W * 0.50);
    const cupCY = Math.floor(H * 0.50);

    const ketW = Math.floor(S * 0.44);
    const ketH = Math.floor(S * 0.26);
    const rx = Math.floor(ketW / 2);
    const ry = Math.floor(ketH / 2);
    const ketCX = Math.floor(W * 0.70);
    const ketCY = Math.floor(H * 0.46);

    return { cupCX, cupCY, cupR, ringT, ketCX, ketCY, rx, ry };
  }

  draw(game) {
    const ctx = this.ctx;
    const W = this.canvas.clientWidth;
    const H = this.canvas.clientHeight;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    // header（hidden）
    ctx.save();
    ctx.globalAlpha = 0;
    ctx.fillStyle = COLORS.text;
    ctx.font = '600 22px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillText('Hand Pour', 20, 16);
    ctx.restore();

    const layout = this.computeLayout(W, H);

    // pointer-driven offset; jitter disabled when grid overlay is shown
    const S = Math.min(W, H);
    const px = game.pointer?.x ?? layout.ketCX;
    const py = game.pointer?.y ?? layout.ketCY;
    const dx = px - layout.ketCX;
    const dy = py - layout.ketCY;

    const t = performance.now() / 1000;
    const tremAmpX = S * 0.005;
    const tremAmpY = S * 0.004;
    const jitterOn = !SHOW_GRID_OVERLAY;
    const jx = jitterOn ? tremAmpX * (Math.sin(t * 5.7 + 0.3) + 0.5 * Math.sin(t * 9.1 + 1.2)) : 0;
    const jy = jitterOn ? tremAmpY * (Math.sin(t * 6.3 + 0.8) + 0.5 * Math.sin(t * 10.4 + 2.1)) : 0;

    const ketCX = layout.ketCX + (game.pointer?.active ? dx : 0) + jx;
    const ketCY = layout.ketCY + (game.pointer?.active ? dy : 0) + jy;
    const layoutK = { ...layout, ketCX, ketCY };

    // cup
    game.cup.draw(ctx, layoutK, game.cup.volume, game.cup.targetMl);

    // kettle
    game.kettle.draw(ctx, layoutK);

    // no water line; pouring handled in Game.update via Cup.pourAt

    // overlays
    if (SHOW_POUR_ZONE_OVERLAY) this.drawPourZone(game, layout, dx, dy);
    if (SHOW_GRID_OVERLAY) this.drawCupGrid(game, layoutK);

    // HUD
    this.drawHUDSimple(game.cup.volume, game.kettle.pourRate);
    // timer (top-right)
    {
      const tsec = Math.max(0, Math.floor(game.elapsedSec || 0));
      const mm = Math.floor(tsec / 60);
      const ss = tsec % 60;
      const timeText = `${mm}:${ss.toString().padStart(2, '0')}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.font = '600 18px system-ui, -apple-system, Segoe UI, Roboto, Arial';
      ctx.fillStyle = COLORS.text;
      ctx.fillText(timeText, W - 18, 16);
    }
    if (game.state === game.STATE.PLAY) game.ui.settleBtn && game.ui.settleBtn.draw(ctx, false);

    if (game.state === game.STATE.START) this.drawStart(game);
    else if (game.state === game.STATE.END) this.drawEnd(game);
  }

  drawPourZone(game, layout, dx, dy) {
    const ctx = this.ctx;
    const cupCX = layout.cupCX;
    const cupCY = layout.cupCY;
    const cupR = layout.cupR;
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = COLORS.accent;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(cupCX, cupCY, cupR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = COLORS.accent;
    ctx.beginPath(); ctx.arc(cupCX, cupCY, cupR, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  drawCupGrid(game, layout) {
    const ctx = this.ctx;
    const cupCX = layout.cupCX;
    const cupCY = layout.cupCY;
    const cupR = layout.cupR;
    const n = game.cup.gridN;
    const g = game.cup.grid;
    const mask = game.cup.gridMask;
    if (!n || !g || !mask) return;

    const cell = (2 * cupR) / n;
    const fontPx = Math.max(8, Math.min(18, Math.floor(cell * 0.45)));
    ctx.save();
    ctx.beginPath(); ctx.arc(cupCX, cupCY, cupR, 0, Math.PI * 2); ctx.clip();
    ctx.strokeStyle = COLORS.accent;
    ctx.globalAlpha = 0.6;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const idx = j * n + i;
        if (!mask[idx]) continue;
        const x0 = cupCX + (-1 + i * (2 / n)) * cupR;
        const y0 = cupCY + (-1 + j * (2 / n)) * cupR;
        const x1 = cupCX + (-1 + (i + 1) * (2 / n)) * cupR;
        const y1 = cupCY + (-1 + (j + 1) * (2 / n)) * cupR;
        ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
      }
    }

    ctx.fillStyle = COLORS.text;
    ctx.font = `${fontPx}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.85;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const idx = j * n + i;
        if (!mask[idx]) continue;
        const cx = cupCX + (-1 + (i + 0.5) * (2 / n)) * cupR;
        const cy = cupCY + (-1 + (j + 0.5) * (2 / n)) * cupR;
        const v = g[idx] || 0;
        const label = v >= 10 ? Math.round(v).toString() : v.toFixed(1);
        ctx.fillText(label, cx, cy);
      }
    }
    ctx.restore();
  }

  drawStart(game) {
    const ctx = this.ctx;
    const W = this.canvas.clientWidth;
    const H = this.canvas.clientHeight;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.text;
    ctx.font = '700 40px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillText('開始', W / 2, H * 0.32);
    ctx.globalAlpha = 0.9; ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillText('滑鼠左鍵或空白鍵倒水', W / 2, H * 0.38);
    ctx.globalAlpha = 1;
    game.ui.startBtn.draw(ctx, false);
  }

  drawHUDSimple(volume, pourRate) {
    const ctx = this.ctx;
    const W = this.canvas.clientWidth;
    const H = this.canvas.clientHeight;
    ctx.fillStyle = COLORS.text;
    ctx.font = '600 44px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const vRounded = Math.round(volume / ROUND_TO) * ROUND_TO;
    // move higher to avoid cup overlap
    ctx.fillText(`${vRounded} ml`, W / 2, H * 0.20);
    if (SHOW_RATE) {
      ctx.globalAlpha = 0.8;
      ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto, Arial';
      ctx.fillText(`速率 ${Math.round(pourRate)} ml/s`, W / 2, H * 0.20 + 22);
      ctx.globalAlpha = 1;
    }
  }

  drawEnd(game) {
    const ctx = this.ctx;
    const W = this.canvas.clientWidth;
    const H = this.canvas.clientHeight;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 44px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillStyle = game.result === 'win' ? COLORS.good : COLORS.fail;
    ctx.fillText(game.result === 'win' ? '完成' : '失敗', W / 2, H * 0.32);
    ctx.fillStyle = COLORS.text;
    ctx.globalAlpha = 0.9;
    ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillText('按 Restart 重新開始，或空白鍵', W / 2, H * 0.38);
    ctx.globalAlpha = 1;
    game.ui.restartBtn.draw(ctx, false);
  }

  roundRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
}
