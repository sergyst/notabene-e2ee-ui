export type Channel = 'notabene' | 'local';
export type PiiMode = 'branch' | 'field';

export interface VaspInfo {
  name: string;
  did: string;
  kid: string;
  publicKeyHex: string;
  credentialsConfigured: boolean;
  keyFile: string;
  didDocEntry: Record<string, unknown>;
  didDocEntryHexVariant: Record<string, unknown>;
  publishHint: string;
}

export interface TransferSummary {
  id: string;
  vasp: string;
  vaspDid: string;
  channel: Channel;
  direction: string | null;
  status: string | null;
  asset: string | null;
  amount: string | null;
  createdAt: string | null;
  originator: string | null;
  beneficiary: string | null;
  counterparty: string | null;
  ref: string | null;
  raw: Record<string, unknown>;
}

export interface TransferDetail {
  summary: TransferSummary;
  hasPii: boolean;
  encryptedIvms101: unknown;
  decryptedPii: unknown;
  decryptError: string | null;
  jweCount: number;
  jweHeader: Record<string, unknown> | null;
  fields: { path: string; value: unknown }[];
}

export type KeySource = 'notabene' | 'local' | 'explicit';

export interface RecipientKey {
  source: KeySource;
  kid?: string;
  publicKeyHex?: string;
}

export interface SendResponse {
  transferId: string;
  from: string;
  to: string;
  recipientKid: string;
  recipientKeySource: KeySource;
  mode: PiiMode;
  channel: Channel;
  jweCount: number;
  encryptedPaths: string[];
  encryptedIvms101: unknown;
  notabeneResponse: Record<string, unknown>;
  warning: string | null;
}

export interface DemoReport {
  mode: PiiMode;
  recipientKid: string;
  recipientPublicKeyHex: string;
  plaintextPii: Record<string, unknown>;
  encryptedParts: { path: string; jwePreview: string }[];
  jweHeader: Record<string, unknown>;
  wirePayload: Record<string, unknown>;
  thirdPartyDecryptionError: string | null;
  decryptedPii: unknown;
  comparison: { path: string; sent: unknown; received: unknown; match: boolean }[];
  piiMatches: boolean;
  mismatches: number;
  otherMode: { mode: string; roundTrips: boolean; originatorShape: string };
}

export interface ApiError {
  timestamp: string;
  error: string;
  message: string;
  details?: string;
}

export interface Attestation {
  message: string;
  caip10: string;
  owner: string;
  network: string;
  suggestedType: string;
  howToSign: string;
}

export interface RegistrationStatus {
  registered: boolean;
  address: string;
  network: string;
  caip10: string;
  asset: string;
  confidence: string;
  vasp: {
    did: string;
    name: string | null;
    jurisdiction: string | null;
    configuredName: string | null;
    custodianDid: string | null;
    custodianName: string | null;
  } | null;
}

export interface RegisterResponse {
  vasp: string;
  owner: string;
  caip10: string;
  notabeneResponse: Record<string, unknown>;
  status: RegistrationStatus;
}
