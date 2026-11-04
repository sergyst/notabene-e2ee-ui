import { useEffect, useMemo, useState } from 'react';
import { ApiFailure, api } from '../api';
import type { Channel, KeySource, PiiMode, RecipientKey, SendResponse, VaspInfo } from '../types';
import { QUICK_FIELDS, getAt, setAt } from '../pii';
import { ChannelPicker } from './VaspPicker';
import { Json } from './Json';

/** Compose a Travel Rule message, edit the PII, and send it to the other VASP. */
export function SendView({
  vasps,
  channel,
  onChannelChange,
  onSent,
}: {
  vasps: VaspInfo[];
  channel: Channel;
  onChannelChange: (c: Channel) => void;
  onSent: () => void;
}) {
  const [from, setFrom] = useState('');
  const [beneficiaryAddress, setBeneficiaryAddress] = useState('');
  const [network, setNetwork] = useState('ethereum');
  const [mode, setMode] = useState<PiiMode>('branch');
  const [pii, setPii] = useState<Record<string, unknown> | null>(null);
  const [text, setText] = useState('');
  const [textError, setTextError] = useState<string | null>(null);
  const [keySource, setKeySource] = useState<KeySource>('notabene');
  const [explicitKid, setExplicitKid] = useState('');
  const [explicitHex, setExplicitHex] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vasps.length && !from) {
      setFrom(vasps[0].name);
    }
  }, [vasps, from]);

  const loadSample = () => {
    api.samplePii().then((p) => {
      setPii(p);
      setText(JSON.stringify(p, null, 2));
      setTextError(null);
    });
  };
  useEffect(loadSample, []);

  // The textarea is authoritative; the form edits write back through it.
  const onText = (next: string) => {
    setText(next);
    try {
      setPii(JSON.parse(next));
      setTextError(null);
    } catch (e) {
      setTextError((e as Error).message);
    }
  };

  const onField = (path: string, value: string) => {
    if (!pii) return;
    const next = setAt(pii, path, value);
    setPii(next);
    setText(JSON.stringify(next, null, 2));
    setTextError(null);
  };

  const groups = useMemo(() => {
    const byGroup = new Map<string, typeof QUICK_FIELDS>();
    QUICK_FIELDS.forEach((f) => byGroup.set(f.group, [...(byGroup.get(f.group) ?? []), f]));
    return [...byGroup.entries()];
  }, []);

  const send = () => {
    if (!pii || textError) return;
    setSending(true);
    setError(null);
    setResult(null);
    const recipientKey: RecipientKey | undefined =
      keySource === 'notabene'
        ? undefined
        : keySource === 'local'
          ? { source: 'local' }
          : { source: 'explicit', kid: explicitKid || undefined, publicKeyHex: explicitHex };

    api
      .send({ from, beneficiaryAddress: beneficiaryAddress.trim(), network: network.trim(), mode, channel, pii, recipientKey })
      .then((r) => {
        setResult(r);
        onSent();
      })
      .catch((e: ApiFailure) => setError(e.details ? `${e.message}\n\n${e.details}` : e.message))
      .finally(() => setSending(false));
  };

  return (
    <>
      <div className="grid-2 send-grid">
      <div className="panel">
        <div className="panel-head">
          <h2>Compose</h2>
          <span className="spacer" />
          <ChannelPicker value={channel} onChange={onChannelChange} />
        </div>
        <div className="panel-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="field">
              <span>From</span>
              <select value={from} onChange={(e) => setFrom(e.target.value)}>
                {vasps.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Beneficiary address — Notabene finds its owner</span>
              <input type="text" value={beneficiaryAddress} spellCheck={false}
                placeholder="0x…"
                onChange={(e) => setBeneficiaryAddress(e.target.value)} />
            </label>
            <label className="field">
              <span>Network</span>
              <input type="text" list="send-networks" value={network}
                placeholder="ethereum, or eip155:42161"
                onChange={(e) => setNetwork(e.target.value)} />
              <datalist id="send-networks">
                <option value="ethereum" /><option value="polygon" /><option value="bitcoin" />
              </datalist>
            </label>
          </div>

          <label className="field">
            <span>Encryption mode</span>
            <div className="seg">
              <button aria-pressed={mode === 'branch'} onClick={() => setMode('branch')}
                title="One JWE for ivms101.originator and one for ivms101.beneficiary">
                branch
              </button>
              <button aria-pressed={mode === 'field'} onClick={() => setMode('field')}
                title="One JWE per IVMS101 leaf value">
                field
              </button>
            </div>
          </label>

          <label className="field">
            <span>Encrypt to</span>
            <div className="seg">
              <button aria-pressed={keySource === 'notabene'} onClick={() => setKeySource('notabene')}
                title="Ask Notabene for the counterparty's published key">
                Notabene lookup
              </button>
              <button aria-pressed={keySource === 'local'} onClick={() => setKeySource('local')}
                title="This server's key for the VASP that owns the address">
                This server's key for the owner
              </button>
              <button aria-pressed={keySource === 'explicit'} onClick={() => setKeySource('explicit')}
                title="Paste a public key">
                Paste key
              </button>
            </div>
          </label>

          {keySource === 'explicit' && (
            <>
              <label className="field">
                <span>Recipient key id (apv is bound to this)</span>
                <input type="text" value={explicitKid} spellCheck={false}
                  placeholder="did:web:…#pii"
                  onChange={(e) => setExplicitKid(e.target.value)} />
              </label>
              <label className="field">
                <span>Recipient public key (hex, compressed or uncompressed P-256)</span>
                <input type="text" value={explicitHex} spellCheck={false}
                  placeholder="02…"
                  onChange={(e) => setExplicitHex(e.target.value)} />
              </label>
            </>
          )}

          {keySource === 'local' && (
            <div className="banner info">
              Encrypting to this server's key for whichever configured VASP owns the address. Only this
              server can read it back, since it holds the private half — use it when the counterparty's
              DID does not resolve. The owner must be one of the VASPs configured here.
            </div>
          )}

          {channel === 'notabene' && mode === 'branch' && (
            <div className="banner warn">
              Notabene rejects branch mode: it validates that <code>ivms101.originator</code> is an
              object, and <code>skipValidation</code> does not bypass that. Use <strong>field</strong>
              {' '}for live sends; branch works on the local channel.
            </div>
          )}

          {groups.map(([group, fields]) => (
            <div key={group} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase',
                letterSpacing: '0.06em', marginBottom: 8 }}>{group}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {fields.map((f) => (
                  <label className="field" key={f.path} style={{ marginBottom: 0 }}>
                    <span>{f.label}</span>
                    <input
                      type="text"
                      value={String(getAt(pii, f.path) ?? '')}
                      onChange={(e) => onField(f.path, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}

          <button className="btn primary" onClick={send} disabled={sending || !pii || !!textError || !from || !beneficiaryAddress.trim() || !network.trim() || (keySource === 'explicit' && !explicitHex.trim())}>
            {sending ? <span className="spin" /> : `Send from ${from}`}
          </button>
        </div>
      </div>

      <div className="panel fill">
          <div className="panel-head">
            <h2>IVMS101 payload</h2>
            <span className="spacer" />
            {textError && <span className="danger" style={{ fontSize: 12 }}>invalid JSON</span>}
            <button className="btn" onClick={loadSample}>Reset</button>
          </div>
          <div className="panel-body">
            <textarea
              className={textError ? 'invalid' : ''}
              rows={20}
              value={text}
              onChange={(e) => onText(e.target.value)}
              spellCheck={false}
            />
            {textError && <div className="banner error" style={{ marginTop: 10, marginBottom: 0 }}>{textError}</div>}
          </div>
      </div>
      </div>

      {error && (
          <div className="panel" style={{ marginTop: 16 }}>
            <div className="panel-head"><h2>Send failed</h2></div>
            <div className="panel-body">
              <div className="banner error" style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{error}</div>
              {error.includes('NO_ENCRYPTION_KEYS') && (
                <div className="banner info" style={{ marginTop: 12, marginBottom: 0 }}>
                  The counterparty has no encryption key in its DID document yet. Publish your
                  <code> #pii </code> key (see the Setup tab), or switch the channel to
                  <strong> Local </strong> to exercise the same encryption without Notabene.
                </div>
              )}
            </div>
          </div>
        )}

      {result && (
          <div className="panel" style={{ marginTop: 16 }}>
            <div className="panel-head">
              <h2>Sent</h2>
              <span className="tag neutral">{result.channel}</span>
              <span className="spacer" />
              <span className="ok" style={{ fontSize: 12 }}>
                {result.jweCount} JWE{result.jweCount === 1 ? '' : 's'} · {result.mode}
              </span>
            </div>
            <div className="panel-body">
              <dl className="kv" style={{ marginBottom: 12 }}>
                <dt>Transfer</dt><dd>{result.transferId}</dd>
                <dt>Beneficiary VASP</dt><dd>{result.to ?? result.beneficiaryDid} ({result.beneficiaryDid})</dd>
                <dt>Encrypted to</dt><dd>{result.recipientKid}</dd>
                <dt>Key source</dt><dd>{result.recipientKeySource}</dd>
                <dt>Parts</dt><dd>{result.encryptedPaths.join(', ')}</dd>
              </dl>
              {result.warning && <div className="banner warn">{result.warning}</div>}
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase',
                letterSpacing: '0.06em', marginBottom: 6 }}>
                What went over the wire
              </div>
              <Json value={{ ivms101: result.encryptedIvms101 }} />
            </div>
          </div>
        )}
    </>
  );
}
