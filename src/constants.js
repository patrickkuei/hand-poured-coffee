export const COLORS = {
  bg: '#111417',
  text: '#E8E8E8',
  accent: '#7FD1B9',
  accent2: '#F6BD60',
  kettle: '#3C6E71',
  kettleDetail: '#5A8E90',
  cup: '#284B63',
  cupRim: '#3A6B80',
  water: '#6EC5E9',
  table: '#172027',
  buttonBg: '#23303A',
  buttonBgHover: '#2C3D49',
  fail: '#E76F51',
  good: '#84A59D',
  filter: '#EDE5CF',
  groundsLight: '#6B4E2E',
  groundsDark: '#3E2A14',
};

export const TARGET_ML = 250; // 指定水量
export const BASE_RATE = 1.2; // ml/s baseline (not used by default)
export const BEST_RATE = 1.6; // ml/s recommended controlled pour rate
export const ACCEL = 0.6; // ml/s^2 while holding (slower)
export const MAX_RATE = BEST_RATE * 5; // cap (ml/s)

// 顯示四捨五入單位（ml）
export const ROUND_TO = 1;

// Debug/overlay toggles
export const SHOW_RATE = false;             // 顯示流速小字
export const SHOW_GRID_OVERLAY = false;     // 顯示網格輪廓與數值
export const SHOW_POUR_ZONE_OVERLAY = false;// 顯示杯子圓形判定圈

// 粉面半徑（以杯半徑扣掉一段外環作為粉面有效區域）
export const POWDER_INSET = 1.3;
export const powderRadius = (cupR, ringT) => Math.max(4, Math.floor(cupR - ringT * POWDER_INSET));

export const STATE = { START: 'start', PLAY: 'play', END: 'end' };

