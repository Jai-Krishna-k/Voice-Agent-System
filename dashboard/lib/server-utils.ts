import { RoomServiceClient, SipClient, AgentDispatchClient } from 'livekit-server-sdk';

function getLiveKitClients() {
  const url = process.env.LIVEKIT_URL;
  const key = process.env.LIVEKIT_API_KEY;
  const secret = process.env.LIVEKIT_API_SECRET;
  if (!url || !key || !secret) {
    throw new Error("Missing LiveKit Credentials");
  }
  return {
    roomService: new RoomServiceClient(url, key, secret),
    sipClient: new SipClient(url, key, secret),
    agentDispatchClient: new AgentDispatchClient(url, key, secret),
  };
}

export function getRoomService() { return getLiveKitClients().roomService; }
export function getSipClient() { return getLiveKitClients().sipClient; }
export function getAgentDispatchClient() { return getLiveKitClients().agentDispatchClient; }

// Keep named exports for backwards-compat with existing callers that use them directly.
// These are getters so they resolve at call time, not import time.
export const roomService = new Proxy({} as RoomServiceClient, {
  get: (_, prop) => (getLiveKitClients().roomService as any)[prop],
});
export const sipClient = new Proxy({} as SipClient, {
  get: (_, prop) => (getLiveKitClients().sipClient as any)[prop],
});
export const agentDispatchClient = new Proxy({} as AgentDispatchClient, {
  get: (_, prop) => (getLiveKitClients().agentDispatchClient as any)[prop],
});
