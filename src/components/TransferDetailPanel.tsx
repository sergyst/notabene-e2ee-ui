import { useEffect, useState } from 'react';
import { ApiFailure, api } from '../api';
import type { Channel, TransferDetail, TransferSummary } from '../types';
import { Json } from './Json';

/**
 * One transfer with both halves of the story side by side: the ciphertext the
 * platform holds, and the plaintext this VASP can recover from it.
 */
export function TransferDetailPanel({
  summary,
  channel,
  onClose,
}: {
  summary: TransferSummary;
  channel: Channel;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<TransferDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    setDetail(null);
    api
      .transfer(summary.id, summary.vasp, channel)
      .then((d) => live && setDetail(d))
      .catch((e: ApiFailure) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [summary.id, summary.vasp, channel]);

  const header = detail?.jweHeader;

  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <div className="panel-head">
        <h2>Transfer detail</h2>
        <span className="tag vasp">{summary.vasp}</span>
        <code className="dim" style={{ fontSize: 12 }}>{summary.id}</code>
        <span className="spacer" />
        <button className="btn" onClick={onClose}>Close</button>
      </div>

      <div className="panel-body">
        {loading && <div className="empty"><span className="spin" /> Loading and decrypting…</div>}
        {error && <div className="banner error">{error}</div>}

        {detail && !loading && (
          <>
            <dl className="kv" style={{ marginBottom: 16 }}>
              <dt>Direction</dt><dd>{summary.direction ?? '—'}</dd>
              <dt>Status</dt><dd>{summary.status ?? '—'}</dd>
              <dt>Asset</dt><dd>{summary.asset ?? '—'} {summary.amount ?? ''}</dd>
              <dt>Originator</dt><dd>{summary.originator ?? '—'}</dd>
              <dt>Beneficiary</dt><dd>{summary.beneficiary ?? '—'}</dd>
              <dt>Created</dt><dd>{summary.createdAt ?? '—'}</dd>
            </dl>

            {!detail.hasPii && (
              <div className="banner info">
                No IVMS101 on this transfer yet — the counterparty has not presented PII.
              </div>
            )}

            {detail.hasPii && header && (
              <dl className="kv" style={{ marginBottom: 14 }}>
                <dt>JWE</dt>
                <dd>
                  alg={String(header.alg)} · enc={String(header.enc)} · {detail.jweCount} JWE
                  {detail.jweCount === 1 ? '' : 's'}
                </dd>
                <dt>Encrypted to</dt><dd>{String(header.kid ?? '—')}</dd>
                <dt>Bindings</dt>
                <dd>
                  apu {header.apu ? <span className="ok">present</span> : <span className="dim">absent</span>}
                  {'  ·  '}
                  apv {header.apv ? <span className="ok">present</span> : <span className="dim">absent</span>}
                </dd>
              </dl>
            )}

            {detail.hasPii && (
              <div className="grid-2">
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase',
                    letterSpacing: '0.06em', marginBottom: 6 }}>
                    What the platform holds
                  </div>
                  <Json value={detail.encryptedIvms101} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase',
                    letterSpacing: '0.06em', marginBottom: 6 }}>
                    What {summary.vasp} decrypts
                  </div>
                  {detail.decryptError ? (
                    <div className="banner error" style={{ marginBottom: 0 }}>{detail.decryptError}</div>
                  ) : (
                    <Json value={detail.decryptedPii} />
                  )}
                </div>
              </div>
            )}

            {detail.fields.length > 0 && (
              <table style={{ marginTop: 16 }}>
                <thead>
                  <tr><th style={{ width: '60%' }}>Field</th><th>Value</th></tr>
                </thead>
                <tbody>
                  {detail.fields.map((f) => (
                    <tr key={f.path} style={{ cursor: 'default' }}>
                      <td className="mono dim" style={{ fontSize: 11.5 }}>{f.path}</td>
                      <td className="mono">{String(f.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
