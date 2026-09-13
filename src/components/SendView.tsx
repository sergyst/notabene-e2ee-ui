import { useEffect, useMemo, useState } from 'react';
import { ApiFailure, api } from '../api';
import type { Channel, PiiMode, SendResponse, VaspInfo } from '../types';
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
  const [to, setTo] = useState('');
  const [mode, setMode] = useState<PiiMode>('branch');
  const [pii, setPii] = useState<Record<string, unknown> | null>(null);
  const [text, setText] = useState('');
  const [textError, setTextError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vasps.length && !from) {
      setFrom(vasps[0].name);
      setTo(vasps[1]?.name ?? vasps[0].name);
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
    api
      .send({ from, to, mode, channel, pii })
      .then((r) => {
        setResult(r);
        onSent();
      })
      .catch((e: ApiFailure) => setError(e.details ? `${e.message}\n\n${e.details}` : e.message))
      .finally(() => setSending(false));
  };

  const sameVasp = from === to;

  return (
    <div className="grid-2">
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
              <span>To</span>
              <select value={to} onChange={(e) => setTo(e.target.value)}>
                {vasps.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
              </select>
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

          {sameVasp && <div className="banner warn">From and To are the same VASP.</div>}

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

          <button className="btn primary" onClick={send} disabled={sending || !pii || !!textError || !from || !to}>
            {sending ? <span className="spin" /> : `Send ${from} → ${to}`}
          </button>
        </div>
      </div>

      <div>
        <div className="panel">
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
                <dt>Encrypted to</dt><dd>{result.recipientKid}</dd>
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
      </div>
    </div>
  );
}
