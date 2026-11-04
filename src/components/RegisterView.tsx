import { useState } from 'react';
import { ApiFailure, api } from '../api';
import type { Attestation, RegisterResponse, RegistrationStatus, VaspInfo } from '../types';
import { Json } from './Json';

const NETWORKS = ['ethereum', 'polygon', 'bitcoin'];

interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

function injectedWallet(): EthereumProvider | undefined {
  return (window as unknown as { ethereum?: EthereumProvider }).ethereum;
}

/**
 * Registering an address is always two steps with a signed proof: initiate
 * returns the exact message to sign, complete submits the signature. The
 * server never holds the address's private key, so signing happens here
 * (an injected wallet) or anywhere else the key lives.
 */
export function RegisterView({ vasps }: { vasps: VaspInfo[] }) {
  const [vasp, setVasp] = useState(vasps[0]?.name ?? '');
  const [network, setNetwork] = useState('ethereum');
  const [address, setAddress] = useState('');
  const [attestation, setAttestation] = useState<Attestation | null>(null);
  const [signature, setSignature] = useState('');
  const [status, setStatus] = useState<RegistrationStatus | null>(null);
  const [result, setResult] = useState<RegisterResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready = vasp !== '' && address.trim() !== '' && network.trim() !== '';

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiFailure ? e.message : e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  // Editing the inputs invalidates a message that was built for the old ones.
  const edit = (apply: () => void) => {
    apply();
    setAttestation(null);
    setSignature('');
    setResult(null);
  };

  const check = () =>
    run('check', async () => setStatus(await api.registrationStatus(vasp, address.trim(), network.trim())));

  const initiate = () =>
    run('initiate', async () => {
      setResult(null);
      setSignature('');
      setAttestation(await api.registerInitiate(vasp, address.trim(), network.trim()));
    });

  const signWithWallet = () =>
    run('sign', async () => {
      const wallet = injectedWallet();
      if (!wallet || !attestation) throw new Error('No browser wallet found. Sign the message elsewhere and paste the signature.');
      const signature = await wallet.request({
        method: 'personal_sign',
        params: [attestation.message, address.trim()],
      });
      setSignature(String(signature));
    });

  const complete = () =>
    run('complete', async () => {
      if (!attestation) return;
      const done = await api.registerComplete({
        vasp,
        address: address.trim(),
        network: network.trim(),
        proof: { type: attestation.suggestedType, attestation: attestation.message, signature: signature.trim() },
      });
      setResult(done);
      setStatus(done.status);
    });

  return (
    <div className="grid-2">
      <div className="panel">
        <div className="panel-head"><h2>Register an address</h2></div>
        <div className="panel-body">
          <label className="field">
            <span>VASP that owns the address</span>
            <select value={vasp} onChange={(e) => edit(() => setVasp(e.target.value))}>
              {vasps.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Network</span>
            <input
              type="text"
              list="networks"
              value={network}
              onChange={(e) => edit(() => setNetwork(e.target.value))}
              placeholder="ethereum, or a CAIP-2 id such as eip155:42161"
            />
            <datalist id="networks">{NETWORKS.map((n) => <option key={n} value={n} />)}</datalist>
          </label>
          <label className="field">
            <span>Address</span>
            <input
              type="text"
              value={address}
              onChange={(e) => edit(() => setAddress(e.target.value))}
              placeholder="0x…"
              spellCheck={false}
            />
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={check} disabled={!ready || busy !== null}>
              {busy === 'check' ? <span className="spin" /> : 'Check status'}
            </button>
            <button className="btn primary" onClick={initiate} disabled={!ready || busy !== null}>
              {busy === 'initiate' ? <span className="spin" /> : '1 · Get message to sign'}
            </button>
          </div>

          {error && <div className="banner error" style={{ marginTop: 14 }}>{error}</div>}

          {attestation && (
            <>
              <label className="field" style={{ marginTop: 18 }}>
                <span>Message — sign exactly this ({attestation.suggestedType}). It carries a timestamp, so do not edit it.</span>
                <textarea readOnly rows={8} value={attestation.message} />
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button className="btn" onClick={() => navigator.clipboard.writeText(attestation.message)}>Copy message</button>
                {injectedWallet() && (
                  <button className="btn" onClick={signWithWallet} disabled={busy !== null}>
                    {busy === 'sign' ? <span className="spin" /> : 'Sign with browser wallet'}
                  </button>
                )}
              </div>
              <label className="field">
                <span>Signature</span>
                <textarea
                  rows={3}
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="0x…"
                  spellCheck={false}
                />
              </label>
              <button
                className="btn primary"
                onClick={complete}
                disabled={signature.trim() === '' || busy !== null}
              >
                {busy === 'complete' ? <span className="spin" /> : '2 · Register with proof'}
              </button>
              <div className="dim" style={{ fontSize: 12, marginTop: 10 }}>
                The server does not verify the signature — Notabene does, and rejects a wrong one.
              </div>
            </>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h2>Status</h2></div>
        <div className="panel-body">
          {!status && <div className="empty">Check an address, or register one, to see who owns it.</div>}
          {status && (
            <>
              <div className={`banner ${status.registered ? 'ok' : 'info'}`}>
                {status.registered
                  ? `Registered to ${status.vasp?.configuredName ?? status.vasp?.name ?? status.vasp?.did} (${status.confidence})`
                  : 'Not registered — nobody owns this address yet.'}
              </div>
              <dl className="kv" style={{ marginBottom: 12 }}>
                <dt>Queried as</dt><dd>{status.caip10}</dd>
                <dt>Network</dt><dd>{status.network}</dd>
                {status.vasp && <><dt>Owner DID</dt><dd>{status.vasp.did}</dd></>}
                {status.vasp?.jurisdiction && <><dt>Jurisdiction</dt><dd>{status.vasp.jurisdiction}</dd></>}
              </dl>
            </>
          )}
          {result && (
            <>
              <div className="dim" style={{ fontSize: 12, margin: '14px 0 6px' }}>Notabene's response</div>
              <Json value={result.notabeneResponse} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
