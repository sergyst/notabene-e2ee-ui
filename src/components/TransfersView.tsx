import { useCallback, useEffect, useState } from 'react';
import { ApiFailure, api } from '../api';
import type { Channel, TransferSummary, VaspInfo } from '../types';
import { ChannelPicker, VaspPicker } from './VaspPicker';
import { TransferDetailPanel } from './TransferDetailPanel';

export function TransfersView({
  vasps,
  channel,
  onChannelChange,
  reloadKey,
}: {
  vasps: VaspInfo[];
  channel: Channel;
  onChannelChange: (c: Channel) => void;
  reloadKey: number;
}) {
  const [selectedVasp, setSelectedVasp] = useState<string | null>(null);
  const [rows, setRows] = useState<TransferSummary[]>([]);
  const [selected, setSelected] = useState<TransferSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .transfers({ vasps: selectedVasp ? [selectedVasp] : undefined, channel, limit: 25 })
      .then(setRows)
      .catch((e: ApiFailure) => {
        setError(e.message);
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [selectedVasp, channel]);

  useEffect(() => {
    load();
    setSelected(null);
  }, [load, reloadKey]);

  const showVaspColumn = selectedVasp === null;

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <h2>Transfers</h2>
          <VaspPicker vasps={vasps} selected={selectedVasp} onSelect={setSelectedVasp} />
          <span className="spacer" />
          <ChannelPicker value={channel} onChange={onChannelChange} />
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? <span className="spin" /> : 'Refresh'}
          </button>
        </div>

        {error && <div style={{ padding: 16 }}><div className="banner error" style={{ marginBottom: 0 }}>{error}</div></div>}

        {!error && rows.length === 0 && !loading && (
          <div className="empty">
            No transfers{selectedVasp ? ` for ${selectedVasp}` : ''} on the {channel} channel.
            {channel === 'local' && <div style={{ marginTop: 8 }}>Send one from the Send tab.</div>}
          </div>
        )}

        {rows.length > 0 && (
          <table>
            <thead>
              <tr>
                {showVaspColumn && <th>VASP</th>}
                <th>Direction</th>
                <th>Status</th>
                <th>Asset</th>
                <th>Amount</th>
                <th>Counterparty</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr
                  key={`${t.vasp}:${t.id}`}
                  aria-selected={selected?.id === t.id && selected?.vasp === t.vasp}
                  onClick={() => setSelected(selected?.id === t.id && selected?.vasp === t.vasp ? null : t)}
                >
                  {showVaspColumn && <td><span className="tag vasp">{t.vasp}</span></td>}
                  <td>
                    <span className={`tag ${t.direction === 'INCOMING' ? 'in' : 'out'}`}>
                      {t.direction ?? '—'}
                    </span>
                  </td>
                  <td className="muted">{t.status ?? '—'}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{t.asset ?? '—'}</td>
                  <td className="mono">{t.amount ?? '—'}</td>
                  <td className="muted" style={{ maxWidth: 240, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.counterparty ?? '—'}
                  </td>
                  <td className="dim" style={{ fontSize: 12 }}>{t.createdAt?.slice(0, 19).replace('T', ' ') ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <TransferDetailPanel summary={selected} channel={channel} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
