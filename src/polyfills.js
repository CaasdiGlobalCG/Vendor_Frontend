// src/polyfills.js
if (typeof globalThis === 'undefined' && typeof window !== 'undefined') {
  window.globalThis = window;
}
if (typeof globalThis.global === 'undefined') {
  globalThis.global = globalThis;
}
if (typeof globalThis.fetch === 'undefined' && typeof window !== 'undefined') {
  globalThis.fetch = window.fetch;
}
if (typeof globalThis.Request === 'undefined' && typeof window !== 'undefined') {
  globalThis.Request = window.Request;
}
if (typeof globalThis.Response === 'undefined' && typeof window !== 'undefined') {
  globalThis.Response = window.Response;
}
if (typeof globalThis.ReadableStream === 'undefined' && typeof window !== 'undefined') {
  globalThis.ReadableStream = window.ReadableStream;
}
if (typeof globalThis.TextEncoder === 'undefined' && typeof window !== 'undefined') {
  globalThis.TextEncoder = window.TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined' && typeof window !== 'undefined') {
  globalThis.TextDecoder = window.TextDecoder;
}
