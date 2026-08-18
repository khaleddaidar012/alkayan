function isValidHexColor(color) {
  return /^#[0-9A-Fa-f]{6}$/.test(color || '');
}

function hexToRgb(hex) {
  const m = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/.exec(hex || '');
  if (!m) return null;
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16)
  };
}

function readableTextColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#FFFFFF';
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 150 ? '#111827' : '#FFFFFF';
}

module.exports = { isValidHexColor, hexToRgb, readableTextColor };