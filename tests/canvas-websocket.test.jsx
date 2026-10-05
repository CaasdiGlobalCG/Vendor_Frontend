/**
 * useCanvasWebSocket — mocked-WebSocket suite (T4: mocked live services).
 *
 * Exercises the real hook lifecycle with a fake WebSocket: debounced connect,
 * URL/identity params, connection state, remote-op delivery, emit helpers,
 * reconnect backoff, and clean teardown.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import useCanvasWebSocket from '../src/hooks/useCanvasWebSocket.js';

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.sent = [];
    this.closeCalls = [];
    MockWebSocket.instances.push(this);
  }

  send(data) {
    this.sent.push(data);
  }

  close(code, reason) {
    this.closeCalls.push([code, reason]);
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose({ code: code ?? 1000, reason: reason || '' });
  }

  // ── test helpers (server side) ──
  _open() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) this.onopen();
  }

  _message(payload) {
    if (this.onmessage) {
      this.onmessage({ data: typeof payload === 'string' ? payload : JSON.stringify(payload) });
    }
  }

  _serverClose(code) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose({ code, reason: '' });
  }
}

const renderCanvasHook = (workspaceId = 'ws-1', user = { userId: 'u-9', name: 'Sanjay', role: 'vendor' }) =>
  renderHook(() => useCanvasWebSocket(workspaceId, user, { enabled: true }));

const connectNow = () => {
  act(() => {
    vi.advanceTimersByTime(500); // hook debounces the initial connect by 500ms
  });
  return MockWebSocket.instances[MockWebSocket.instances.length - 1];
};

describe('useCanvasWebSocket (mocked WebSocket)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('connects after the debounce with workspace + identity params in the URL', () => {
    renderCanvasHook('ws-42', { userId: 'u-1', name: 'Sam', role: 'pm' });
    expect(MockWebSocket.instances).toHaveLength(0); // nothing before the debounce fires
    const ws = connectNow();
    expect(ws.url).toContain('/api/workspace/ws/ws-42');
    expect(ws.url).toContain('userId=u-1');
    expect(ws.url).toContain('userRole=pm');
  });

  it('tracks connection state: open → connected, clean close (1000) → disconnected with no reconnect', () => {
    const { result } = renderCanvasHook();
    const ws = connectNow();

    act(() => ws._open());
    expect(result.current.isConnected).toBe(true);

    act(() => ws._serverClose(1000));
    expect(result.current.isConnected).toBe(false);

    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(MockWebSocket.instances).toHaveLength(1); // intentional close must not reconnect
  });

  it('delivers remote canvas operations to the registered callback', () => {
    const { result } = renderCanvasHook();
    const ws = connectNow();
    act(() => ws._open());

    const received = [];
    act(() => result.current.setOnRemoteOperation((op) => received.push(op)));
    act(() => ws._message({ type: 'NODE_MOVE', nodeId: 'n-1', position: { x: 1, y: 2 } }));
    act(() => ws._message({ type: 'NODE_ADD', node: { id: 'n-2' } }));

    expect(received).toHaveLength(2);
    expect(received[0]).toMatchObject({ type: 'NODE_MOVE', nodeId: 'n-1' });
  });

  it('survives malformed messages without crashing', () => {
    const { result } = renderCanvasHook();
    const ws = connectNow();
    act(() => ws._open());
    act(() => result.current.setOnRemoteOperation(() => {}));
    expect(() => act(() => ws._message('{not-json'))).not.toThrow();
  });

  it('emit helpers are no-ops until the socket is open, then send the right envelopes', () => {
    const { result } = renderCanvasHook();
    const ws = connectNow();

    act(() => result.current.emitOperation({ type: 'NODE_ADD', node: { id: 'n-1' } }));
    expect(ws.sent).toHaveLength(0); // not open yet

    act(() => ws._open());
    act(() => result.current.emitOperation({ type: 'NODE_ADD', node: { id: 'n-1' } }));
    act(() => result.current.emitCursor(10, 20));
    act(() => result.current.initSnapshot({ nodes: [{ id: 'n-1' }], edges: [], zoomLevel: 120 }));
    act(() => result.current.requestFullState('t-1', 'st-1'));

    const parsed = ws.sent.map((s) => JSON.parse(s));
    expect(parsed[0]).toMatchObject({ type: 'NODE_ADD' });
    expect(parsed[1]).toMatchObject({ type: 'CURSOR_MOVE', x: 10, y: 20 });
    expect(parsed[2]).toMatchObject({ type: 'INIT_SNAPSHOT', zoomLevel: 120 });
    expect(parsed[3]).toMatchObject({ type: 'REQUEST_FULL_STATE', taskId: 't-1', subtaskId: 'st-1' });
  });

  it('reconnects with backoff after an abnormal close (1001)', () => {
    renderCanvasHook();
    const ws = connectNow();
    act(() => ws._open());

    act(() => ws._serverClose(1001));
    // First backoff: 1000ms * 2^0
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(MockWebSocket.instances).toHaveLength(2);
  });

  it('closes the socket cleanly on unmount', () => {
    const { unmount } = renderCanvasHook();
    const ws = connectNow();
    act(() => ws._open());

    unmount();
    expect(ws.closeCalls.some(([code]) => code === 1000)).toBe(true);
  });
});
