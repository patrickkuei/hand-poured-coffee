(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  // Layout & colors
  const COLORS = {
    bg: "#111417",
    text: "#E8E8E8",
    accent: "#7FD1B9", // pour bar
    accent2: "#F6BD60", // target marker
    kettle: "#3C6E71",
    kettleDetail: "#5A8E90",
    cup: "#284B63",
    cupRim: "#3A6B80",
    water: "#6EC5E9",
    table: "#172027",
    buttonBg: "#23303A",
    buttonBgHover: "#2C3D49",
    fail: "#E76F51",
    good: "#84A59D",
  };

  // Game constants
  const TARGET_ML = 250; // 指定水量
  const BASE_RATE = 25; // ml/s when press starts
  const ACCEL = 120; // ml/s^2 while holding
  const MAX_RATE = 350; // cap
  const ROUND_TO = 1; // display rounding in ml

  // State machine
  const STATE = { START: "start", PLAY: "play", END: "end" };
  let gameState = STATE.START;
  let result = null; // 'win' | 'lose' | null

  // Pour variables
  let volume = 0; // ml (float)
  let pourRate = 0; // ml/s
  let isHolding = false;

  // Button rects (updated on resize)
  const ui = {
    startBtn: { x: 0, y: 0, w: 0, h: 0 },
    restartBtn: { x: 0, y: 0, w: 0, h: 0 },
  };

  // Responsive canvas (with DPR)
  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Layout buttons centered
    const btnW = Math.min(280, Math.floor(cssW * 0.5));
    const btnH = 56;
    ui.startBtn = { x: (cssW - btnW) / 2, y: cssH * 0.6, w: btnW, h: btnH };
    ui.restartBtn = { x: (cssW - btnW) / 2, y: cssH * 0.65, w: btnW, h: btnH };
  };
  window.addEventListener("resize", resize);
  resize();

  // Input handling (mouse / touch / keyboard)
  const setHolding = (down) => {
    if (gameState !== STATE.PLAY) return;
    isHolding = !!down;
    if (!isHolding) {
      pourRate = 0; // reset when released
    }
  };

  // Mouse
  canvas.addEventListener("mousedown", (e) => {
    if (gameState === STATE.START) {
      if (hit(ui.startBtn, e.offsetX, e.offsetY)) startGame();
      return;
    }
    if (gameState === STATE.END) {
      if (hit(ui.restartBtn, e.offsetX, e.offsetY)) restartGame();
      return;
    }
    setHolding(true);
  });
  window.addEventListener("mouseup", () => setHolding(false));

  // Touch
  canvas.addEventListener(
    "touchstart",
    (e) => {
      const pt = touchPos(e);
      if (gameState === STATE.START) {
        if (hit(ui.startBtn, pt.x, pt.y)) startGame();
        return;
      }
      if (gameState === STATE.END) {
        if (hit(ui.restartBtn, pt.x, pt.y)) restartGame();
        return;
      }
      e.preventDefault();
      setHolding(true);
    },
    { passive: false }
  );
  window.addEventListener("touchend", () => setHolding(false));

  // Keyboard (Space)
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (gameState === STATE.START) {
        startGame();
        return;
      }
      if (gameState === STATE.END) {
        restartGame();
        return;
      }
      setHolding(true);
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      setHolding(false);
    }
  });

  function touchPos(e) {
    const rect = canvas.getBoundingClientRect();
    const t = e.changedTouches[0];
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }

  function hit(r, x, y) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  function startGame() {
    gameState = STATE.PLAY;
    result = null;
    volume = 0;
    pourRate = 0;
    isHolding = false;
  }

  function endGame(win) {
    result = win ? "win" : "lose";
    gameState = STATE.END;
    isHolding = false;
    pourRate = 0;
  }

  function restartGame() {
    gameState = STATE.START;
    result = null;
    volume = 0;
    pourRate = 0;
    isHolding = false;
  }

  // Drawing helpers
  function roundRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function button(rect, label, hovered) {
    ctx.fillStyle = hovered ? COLORS.buttonBgHover : COLORS.buttonBg;
    roundRect(rect.x, rect.y, rect.w, rect.h, 10);
    ctx.fill();
    ctx.fillStyle = COLORS.text;
    ctx.font = "bold 20px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  }

  // Main loop
  let last = performance.now();
  function tick(now) {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); // clamp dt
    last = now;

    update(dt);
    draw();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function update(dt) {
    if (gameState !== STATE.PLAY) return;

    // Accelerate while holding
    if (isHolding) {
      pourRate = Math.min(MAX_RATE, pourRate + ACCEL * dt);
    }

    // Add volume
    if (isHolding && pourRate > 0) {
      volume += pourRate * dt;
    }

    // Check result (round to whole ml for fairness)
    const vRounded = Math.round(volume / ROUND_TO) * ROUND_TO;
    if (vRounded === TARGET_ML) {
      endGame(true);
      return;
    }
    if (volume > TARGET_ML) {
      endGame(false);
      return;
    }
  }

  function draw() {
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;

    // Clear
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    // Title / header
    ctx.fillStyle = COLORS.text;
    ctx.font = "600 22px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("手沖咖啡", 20, 16);

    // Progress bar
    drawProgress(W, H);

    // Stage visuals (kettle, cup, and pouring)
    drawStage(W, H);

    // HUD text
    drawHUD(W, H);

    // Screen overlays
    if (gameState === STATE.START) drawStart(W, H);
    else if (gameState === STATE.END) drawEnd(W, H);
  }

  function drawProgress(W, H) {
    const barMargin = 20;
    const barW = W - barMargin * 2;
    const barH = 14;
    const x = barMargin;
    const y = 54;
    const pct = Math.min(1, volume / TARGET_ML);

    // Track
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#e8e8e8";
    roundRect(x, y, barW, barH, 6);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Fill
    ctx.fillStyle = COLORS.accent;
    roundRect(x, y, barW * pct, barH, 6);
    ctx.fill();

    // Target marker
    ctx.fillStyle = COLORS.accent2;
    const tx = x + barW * (TARGET_ML / TARGET_ML);
    ctx.fillRect(tx - 2, y - 3, 4, barH + 6);

    // Labels
    ctx.fillStyle = COLORS.text;
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("0 ml", x, y + barH + 14);
    ctx.textAlign = "right";
    ctx.fillText(TARGET_ML + " ml", x + barW, y + barH + 14);
  }

  function drawStage(W, H) {
    // Top-down composition with z-indexes:
    // Table (z0) -> Cup (z20) -> Pour (z40) -> Kettle (z50)

    // Table (z0)
    const tableMargin = Math.floor(Math.min(W, H) * 0.08);
    const tableX = tableMargin;
    const tableY = Math.floor(H * 0.32);
    const tableW = W - tableMargin * 2;
    const tableH = Math.floor(H * 0.56);
    ctx.fillStyle = COLORS.table;
    roundRect(tableX, tableY, tableW, tableH, 18);
    ctx.fill();

    // Cup (z20) as a ring gauge in top view
    const cupCX = Math.floor(W * 0.5);
    const cupCY = Math.floor(tableY + tableH * 0.62);
    const cupR = Math.floor(Math.min(W, H) * 0.13);
    const ringT = Math.max(10, Math.floor(cupR * 0.18));

    // Cup body (filled disk under the ring)
    ctx.save();
    ctx.fillStyle = COLORS.cup;
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.arc(cupCX, cupCY, cupR + ringT * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Cup track
    ctx.save();
    ctx.lineWidth = ringT;
    ctx.strokeStyle = COLORS.cupRim;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(cupCX, cupCY, cupR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Water fill as arc proportion of target (0..TARGET_ML)
    const waterFrac = Math.min(1, volume / TARGET_ML);
    if (waterFrac > 0) {
      ctx.save();
      ctx.lineWidth = ringT;
      ctx.strokeStyle = COLORS.water;
      ctx.lineCap = "round";
      const startAng = -Math.PI / 2; // top
      const endAng = startAng + waterFrac * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cupCX, cupCY, cupR, startAng, endAng, false);
      ctx.stroke();
      ctx.restore();
    }

    // Water surface disk inside cup for clear visibility (area ~ volume)
    if (waterFrac > 0) {
      const innerMax = Math.max(6, cupR - ringT * 0.9);
      const rFill = innerMax * Math.sqrt(Math.min(1, waterFrac));
      ctx.save();
      ctx.fillStyle = COLORS.water;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(cupCX, cupCY, rFill, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Pour stream (z40) drawn before kettle so kettle appears on top near spout
    // Kettle geometry first to find spout
    const ketW = Math.min(240, Math.floor(W * 0.38));
    const ketH = Math.min(120, Math.floor(H * 0.18));
    const ketCX = Math.floor(W * 0.5);
    const ketCY = Math.max(
      Math.floor(H * 0.16),
      Math.floor(tableY - ketH * 0.35)
    ); // above the table
    const rx = Math.floor(ketW / 2);
    const ry = Math.floor(ketH / 2);

    // Spout aims toward cup center along the ellipse normal direction
    const theta = Math.atan2(cupCY - ketCY, cupCX - ketCX);
    const spoutX = Math.floor(ketCX + rx * Math.cos(theta));
    const spoutY = Math.floor(ketCY + ry * Math.sin(theta));

    if (isHolding && gameState === STATE.PLAY) {
      ctx.strokeStyle = COLORS.water;
      ctx.lineWidth = Math.max(2, Math.min(8, 2 + pourRate / 80));
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(spoutX, spoutY);
      ctx.lineTo(cupCX, cupCY);
      ctx.stroke();
    }

    // Kettle (z50) on top
    // Body ellipse
    ctx.save();
    ctx.fillStyle = COLORS.kettle;
    ctx.beginPath();
    ctx.ellipse(ketCX, ketCY, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lid
    ctx.fillStyle = COLORS.kettleDetail;
    ctx.globalAlpha = 0.9;
    const lidR = Math.max(6, Math.floor(Math.min(rx, ry) * 0.18));
    ctx.beginPath();
    ctx.arc(ketCX, ketCY, lidR, 0, Math.PI * 2);
    ctx.fill();

    // Spout shape (small triangle toward cup)
    const spLen = Math.max(10, Math.floor(Math.min(rx, ry) * 0.25));
    const spWid = Math.max(6, Math.floor(Math.min(rx, ry) * 0.16));
    const dirX = Math.cos(theta),
      dirY = Math.sin(theta);
    const nX = -dirY,
      nY = dirX; // normal
    const tipX = spoutX + Math.floor(dirX * spLen);
    const tipY = spoutY + Math.floor(dirY * spLen);
    ctx.beginPath();
    ctx.moveTo(spoutX + nX * spWid * 0.5, spoutY + nY * spWid * 0.5);
    ctx.lineTo(spoutX - nX * spWid * 0.5, spoutY - nY * spWid * 0.5);
    ctx.lineTo(tipX, tipY);
    ctx.closePath();
    ctx.fill();

    // Handle on right side
    const handleW = Math.max(8, Math.floor(rx * 0.18));
    const handleH = Math.max(24, Math.floor(ry * 1.1));
    const handleX = ketCX + rx + 6;
    const handleY = ketCY - handleH / 2;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(handleX, handleY, handleW, handleH);
    ctx.restore();
  }

  function drawHUD(W, H) {
    // Volume readout centered
    ctx.fillStyle = COLORS.text;
    ctx.font = "600 44px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const vRounded = Math.round(volume / ROUND_TO) * ROUND_TO;
    ctx.fillText(`${vRounded} ml`, W / 2, H * 0.28);

    // Rate (small)
    ctx.globalAlpha = 0.8;
    ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(`速度 ${Math.round(pourRate)} ml/s`, W / 2, H * 0.28 + 22);
    ctx.globalAlpha = 1;
  }

  function drawStart(W, H) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = COLORS.text;
    ctx.font = "700 40px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("手沖時間", W / 2, H * 0.32);

    ctx.globalAlpha = 0.9;
    ctx.font = "16px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("按住滑鼠左鍵或空白鍵倒水", W / 2, H * 0.38);
    ctx.fillText("倒到 250 ml，超過就失敗", W / 2, H * 0.42);
    ctx.globalAlpha = 1;

    // Start button
    const hover = false; // simple, no hover tracking here
    button(ui.startBtn, "Start", hover);

    // Hint
    ctx.globalAlpha = 0.7;
    ctx.font = "13px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("也可按空白鍵開始", W / 2, ui.startBtn.y + ui.startBtn.h + 24);
    ctx.globalAlpha = 1;
  }

  function drawEnd(W, H) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 44px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillStyle = result === "win" ? COLORS.good : COLORS.fail;
    ctx.fillText(result === "win" ? "完成！" : "失敗！", W / 2, H * 0.32);

    ctx.fillStyle = COLORS.text;
    ctx.globalAlpha = 0.9;
    ctx.font = "16px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("按 Restart 重玩，或按空白鍵", W / 2, H * 0.38);
    ctx.globalAlpha = 1;

    button(ui.restartBtn, "Restart", false);
  }
})();
