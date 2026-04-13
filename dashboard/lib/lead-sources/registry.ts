import type { LeadSourceProvider, ProviderId } from "./types";
import { googleSheetsProvider } from "./google-sheets";
import { hubspotProvider } from "./hubspot";
import { pipedriveProvider } from "./pipedrive";

const REGISTRY: Partial<Record<ProviderId, LeadSourceProvider>> = {
  google_sheets: googleSheetsProvider,
  hubspot: hubspotProvider,
  pipedrive: pipedriveProvider,
};

export function getProvider(id: ProviderId): LeadSourceProvider {
  const p = REGISTRY[id];
  if (!p) throw new Error(`Provider not yet implemented: ${id}`);
  return p;
}

export function isProviderImplemented(id: ProviderId): boolean {
  return !!REGISTRY[id];
}

export function listProviders(): ProviderId[] {
  return ["google_sheets", "hubspot", "pipedrive"];
}
