import type { Attestation, Channel, DemoReport, PiiMode, RecipientKey, RegisterResponse, RegistrationStatus, SendResponse, TransferDetail, TransferSummary, VaspInfo } from './types';

/** Vite proxies /api to the Spring server, so this is same-origin in dev. */
const BASE = import.meta.env.VITE_API_BASE ?? '';

export class ApiFailure extends Error {
  constructor(message: string, readonly status: number, readonly details?: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiFailure('Cannot reach the server. Is it running on :8080?', 0);
  }

  const text = await response.text();
  const body = text && text.trim().startsWith('{') || text.trim().startsWith('[') ? JSON.parse(text) : text;

  if (!response.ok) {
    const message = typeof body === 'object' && body && 'message' in body
      ? String((body as { message: unknown }).message)
      : `${response.status} ${response.statusText}`;
    const details = typeof body === 'object' && body && 'details' in body
      ? String((body as { details: unknown }).details)
      : undefined;
    throw new ApiFailure(message, response.status, details);
  }
  return body as T;
}

export const api = {
  vasps: () => request<VaspInfo[]>('/api/vasps'),

  transfers: (params: { vasps?: string[]; channel: Channel; limit?: number }) => {
    const query = new URLSearchParams();
    params.vasps?.forEach((v) => query.append('vasp', v));
    query.set('channel', params.channel);
    query.set('limit', String(params.limit ?? 25));
    return request<TransferSummary[]>(`/api/transfers?${query}`);
  },

  transfer: (id: string, vasp: string, channel: Channel) =>
    request<TransferDetail>(`/api/transfers/${encodeURIComponent(id)}?vasp=${vasp}&channel=${channel}`),

  send: (body: {
    from: string;
    beneficiaryAddress: string;
    network: string;
    mode: PiiMode;
    channel: Channel;
    pii?: Record<string, unknown>;
    recipientKey?: RecipientKey;
  }) => request<SendResponse>('/api/send', { method: 'POST', body: JSON.stringify(body) }),

  demo: (mode: PiiMode) => request<DemoReport>(`/api/demo?mode=${mode}`),

  registrationStatus: (vasp: string, address: string, network: string) =>
    request<RegistrationStatus>(`/api/registration-status?${new URLSearchParams({ vasp, address, network })}`),

  registerInitiate: (vasp: string, address: string, network: string) =>
    request<Attestation>(`/api/register/initiate?${new URLSearchParams({ vasp, address, network })}`),

  registerComplete: (body: {
    vasp: string;
    address: string;
    network: string;
    proof: { type: string; attestation: string; signature: string };
  }) => request<RegisterResponse>('/api/register/complete', { method: 'POST', body: JSON.stringify(body) }),

  samplePii: () => request<Record<string, unknown>>('/api/samplePii'),
};
