import { STATE, powderRadius } from './constants.js';
import { Renderer } from './Renderer.js';
import { Button } from './ui/Button.js';
import { Kettle } from './entities/Kettle.js';
import { Cup } from './entities/Cup.js';

export default class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);

    this.STATE = STATE;
    this.state = STATE.START;
    this.result = null;

    this.kettle = new Kettle();
    this.cup = new Cup(undefined, { targetTolerance: 10, gridN: 3, maxImbalanceCV: 0.35 });

    this.pointer = { x: 0, y: 0, active: false };

    this.elapsedSec = 0;
    this.optimalTimeSec = 150;
    this.timeToleranceSec = 20;

    this.ui = {
      startBtn: new Button('Start'),
      restartBtn: new Button('Restart'),
      settleBtn: new Button('Finish'),
    };

    this._last = performance.now();
    this._raf = null;

    this._bindInput();
    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
    this._onResize();
  }

  _onResize() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    this.renderer.resize(cssW, cssH, dpr);

    const btnW = Math.min(280, Math.floor(cssW * 0.5));
    const btnH = 56;
    this.ui.startBtn.setRect((cssW - btnW) / 2, cssH * 0.6, btnW, btnH);
    this.ui.restartBtn.setRect((cssW - btnW) / 2, cssH * 0.65, btnW, btnH);
    this.ui.settleBtn.setRect((cssW - btnW) / 2, cssH * 0.86, btnW, btnH);
  }

  _bindInput() {
    const c = this.canvas;
    const setHolding = (down) => {
      if (this.state !== STATE.PLAY) return;
      this.kettle.setHolding(!!down);
    };
    const updatePointer = (x, y, active = true) => {
      this.pointer.x = x;
      this.pointer.y = y;
      this.pointer.active = !!active;
    };

    c.addEventListener('mousedown', (e) => {
      const x = e.offsetX, y = e.offsetY;
      updatePointer(x, y, true);
      if (this.state === STATE.START) {
        if (this.ui.startBtn.contains(x, y)) { this.startGame(); return; }
      } else if (this.state === STATE.END) {
        if (this.ui.restartBtn.contains(x, y)) { this.restartGame(); return; }
      } else if (this.state === STATE.PLAY) {
        if (this.ui.settleBtn.contains(x, y)) { this.settleGame(); return; }
      }
      setHolding(true);
    });
    window.addEventListener('mouseup', () => setHolding(false));
    c.addEventListener('mousemove', (e) => { updatePointer(e.offsetX, e.offsetY, true); });
    c.addEventListener('mouseleave', () => updatePointer(this.pointer.x, this.pointer.y, false));

    const touchPos = (e) => {
      const rect = c.getBoundingClientRect();
      const t = e.changedTouches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    };
    c.addEventListener('touchstart', (e) => {
      const pt = touchPos(e);
      updatePointer(pt.x, pt.y, true);
      if (this.state === STATE.START) {
        if (this.ui.startBtn.contains(pt.x, pt.y)) { this.startGame(); return; }
      } else if (this.state === STATE.END) {
        if (this.ui.restartBtn.contains(pt.x, pt.y)) { this.restartGame(); return; }
      } else if (this.state === STATE.PLAY) {
        if (this.ui.settleBtn.contains(pt.x, pt.y)) { this.settleGame(); return; }
      }
      e.preventDefault();
      setHolding(true);
    }, { passive: false });
    window.addEventListener('touchend', () => { setHolding(false); updatePointer(this.pointer.x, this.pointer.y, false); });
    c.addEventListener('touchmove', (e) => { const pt = touchPos(e); updatePointer(pt.x, pt.y, true); }, { passive: true });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.state === STATE.START) { this.startGame(); return; }
        if (this.state === STATE.END) { this.restartGame(); return; }
        setHolding(true);
      } else if (e.code === 'Enter') {
        if (this.state === STATE.PLAY) { e.preventDefault(); this.settleGame(); }
      }
    });
    window.addEventListener('keyup', (e) => { if (e.code === 'Space') { e.preventDefault(); setHolding(false); } });
  }

  startGame() {
    this.state = STATE.PLAY;
    this.result = null;
    this.cup.reset();
    this.kettle.reset();
    this.elapsedSec = 0;
  }

  endGame(win) {
    this.result = win ? 'win' : 'lose';
    this.state = STATE.END;
    this.kettle.setHolding(false);
    this.kettle.pourRate = 0;
  }

  restartGame() {
    this.state = STATE.START;
    this.result = null;
    this.cup.reset();
    this.kettle.reset();
    this.elapsedSec = 0;
  }

  update(dt) {
    if (this.state !== STATE.PLAY) return;
    this.kettle.update(dt);
    if (this.kettle.isPouring()) {
      const canvasEl = this.renderer.canvas;
      const W = canvasEl.clientWidth;
      const H = canvasEl.clientHeight;
      const base = this.renderer.computeLayout(W, H);
      const px = this.pointer?.x ?? base.ketCX;
      const py = this.pointer?.y ?? base.ketCY;
      const dx = px - base.ketCX;
      const dy = py - base.ketCY;
      const layout = {
        ...base,
        ketCX: base.ketCX + (this.pointer?.active ? dx : 0),
        ketCY: base.ketCY + (this.pointer?.active ? dy : 0),
      };
      const sp = this.kettle.computeFixedSpout(layout);
      this.cup.pourAt(sp.x, sp.y, this.kettle.pourRate * dt, layout);
    }
  }

  tick = (now) => {
    const rawDt = Math.max(0, (now - this._last) / 1000);
    if (this.state === STATE.PLAY) this.elapsedSec += rawDt;
    const dt = Math.min(0.05, rawDt);
    this._last = now;
    this.update(dt);
    this.renderer.draw(this);
    this._raf = requestAnimationFrame(this.tick);
  };

  run() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._last = performance.now();
    this._raf = requestAnimationFrame(this.tick);
  }

  settleGame() {
    if (this.state !== STATE.PLAY) return;
    const passTarget = this.cup.isWin();
    const passUniform = this.cup.isUniform();
    const passTime = Math.abs(this.elapsedSec - this.optimalTimeSec) <= this.timeToleranceSec;
    const win = passTarget && passUniform && passTime;
    this.endGame(win);
  }
}

