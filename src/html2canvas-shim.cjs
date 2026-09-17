// Shim so that html2pdf.js's `require('html2canvas')` receives a callable
// function while actually using html2canvas-pro (which supports oklch/lab
// and other modern CSS color functions that html2canvas cannot parse).
const mod = require('html2canvas-pro');
const html2canvas = mod.default || mod.html2canvas || mod;
module.exports = html2canvas;
module.exports.default = html2canvas;
