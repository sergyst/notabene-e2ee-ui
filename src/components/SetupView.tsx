import { useState } from 'react';
import { ApiFailure, api } from '../api';
import type { DemoReport, PiiMode, VaspInfo } from '../types';
import { Json } from './Json';

/**
 * The two things worth checking when something is not working: are the keys
 * published, and does the crypto round-trip at all.
 */
export function SetupView({ vasps }: { vasps: VaspInfo[] }) {
  const [report, setReport] = useState<DemoReport | null>(null);
  const [mode, setMode] = useState<PiiMode>('branch');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = (m: PiiMode) => {
    setMode(m);
    setRunning(true);
    setError(null);
    api.demo(m).then(setReport).catch((e: ApiFailure) => setError(e.message)).finally(() => setRunning(false));
  };

  return (
    <>
      <div className="panel">
        <div className="panel-head"><h2>VASP keys</h2></div>
        <div className="panel-body">
          <div className="banner info">
            Notabene resolves <code>#pii</code> first. Until your key is in the DID document, the
            platform hands counterparties <em>its</em> key and can read the PII. Sandbox DID documents
            are published by Notabene — send them the entry below.
          </div>
          {vasps.map((v) => (
            <div key={v.name} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span className="tag vasp">{v.name}</span>
                <code style={{ fontSize: 12 }}>{v.did}</code>
                <span className={v.credentialsConfigured ? 'ok' : 'warn'} style={{ fontSize: 12 }}>
                  {v.credentialsConfigured ? 'credentials configured' : 'no credentials'}
                </span>
              </div>
              <dl className="kv" style={{ marginBottom: 10 }}>
                <dt>Key id</dt><dd>{v.kid}</dd>
                <dt>Public key</dt><dd style={{ fontSize: 11 }}>{v.publicKeyHex}</dd>
                <dt>Private key</dt><dd className="dim">{v.keyFile} — never leaves this machine</dd>
              </dl>
              <Json value={v.didDocEntry} />
            </div>
          ))}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel-head">
          <h2>Encryption self-test</h2>
          <span className="spacer" />
          <div className="seg">
            <button aria-pressed={mode === 'branch'} onClick={() => run('branch')}>branch</button>
            <button aria-pressed={mode === 'field'} onClick={() => run('field')}>field</button>
          </div>
          <button className="btn" onClick={() => run(mode)} disabled={running}>
            {running ? <span className="spin" /> : 'Run'}
          </button>
        </div>
        <div className="panel-body">
          {!report && !error && (
            <div className="empty">
              Runs the full round trip on the server with throwaway keys: encrypt, verify a third
              party cannot read it, decrypt, compare. No credentials, no network.
            </div>
          )}
          {error && <div className="banner error">{error}</div>}

          {report && (
            <>
              <div className={`banner ${report.piiMatches ? 'ok' : 'error'}`}>
                {report.piiMatches
                  ? `Decrypted PII is identical to what was sent — ${report.encryptedParts.length} JWE(s), ${report.mode} mode.`
                  : `${report.mismatches} field(s) differ.`}
              </div>
              {report.thirdPartyDecryptionError && (
                <div className="banner info">
                  A third party decrypting with its own key fails:{' '}
                  <code>{report.thirdPartyDecryptionError}</code>
                </div>
              )}
              <table>
                <thead><tr><th style={{ width: '55%' }}>Field</th><th>Sent</th><th>Received</th></tr></thead>
                <tbody>
                  {report.comparison.map((c) => (
                    <tr key={c.path} style={{ cursor: 'default' }}>
                      <td className="mono dim" style={{ fontSize: 11.5 }}>
                        <span className={c.match ? 'ok' : 'danger'}>{c.match ? '=' : '✗'}</span> {c.path}
                      </td>
                      <td className="mono">{String(c.sent)}</td>
                      <td className="mono">{String(c.received)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </>
  );
}
