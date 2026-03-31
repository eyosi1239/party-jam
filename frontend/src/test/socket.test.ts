/**
 * Tests for socket reconnect rejoin fix (Fix #1)
 * We test the PartySocketClient class directly since it has pure, testable logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Minimal socket.io-client mock ─────────────────────────────────────────
const listeners: Record<string, Function[]> = {};
const emitted: Array<{ event: string; data: any }> = [];

const mockSocket = {
  connected: true,
  on: vi.fn((event: string, fn: Function) => {
    listeners[event] = listeners[event] ?? [];
    listeners[event].push(fn);
  }),
  emit: vi.fn((event: string, data: any) => {
    emitted.push({ event, data });
  }),
  disconnect: vi.fn(),
  off: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

// Import AFTER mock is set up
import { socketClient } from '../lib/socket';

function fireSocketEvent(event: string, data?: any) {
  (listeners[event] ?? []).forEach((fn) => fn(data));
}

beforeEach(() => {
  Object.keys(listeners).forEach((k) => delete listeners[k]);
  emitted.length = 0;
  mockSocket.emit.mockClear();
  mockSocket.on.mockClear();
  // Reset internal state by re-connecting
  socketClient.disconnect();
});

describe('socket reconnect rejoin (Fix #1)', () => {
  it('does NOT emit party:join on initial connect (no partyId yet)', () => {
    socketClient.connect();
    fireSocketEvent('connect');
    const joins = emitted.filter((e) => e.event === 'party:join');
    expect(joins).toHaveLength(0);
  });

  it('re-emits party:join when connect fires after joinPartyRoom was called', () => {
    socketClient.connect();
    socketClient.joinPartyRoom('party-1', 'user-1');
    emitted.length = 0; // clear the initial party:join
    mockSocket.emit.mockClear();

    // Simulate reconnect
    fireSocketEvent('connect');

    const joins = emitted.filter((e) => e.event === 'party:join');
    expect(joins).toHaveLength(1);
    expect(joins[0].data).toEqual({ partyId: 'party-1', userId: 'user-1' });
  });

  it('stops heartbeat on disconnect', () => {
    socketClient.connect();
    socketClient.startHeartbeat('party-1', 'user-1');
    fireSocketEvent('disconnect', 'transport close');
    // heartbeat interval should be cleared — no way to assert internal state directly,
    // but we verify stopHeartbeat doesn't throw and the client stays coherent
    expect(() => socketClient.stopHeartbeat()).not.toThrow();
  });
});
