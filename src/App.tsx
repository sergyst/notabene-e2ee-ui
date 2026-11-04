import { useCallback, useEffect, useState } from 'react';
import { ApiFailure, api } from './api';
import type { Channel, VaspInfo } from './types';
import { TransfersView } from './components/TransfersView';
import { SendView } from './components/SendView';
import { RegisterView } from './components/RegisterView';
import { SetupView } from './components/SetupView';

type Tab = 'transfers' | 'send' | 'register' | 'setup';

export default function App() {
  const [vasps, setVasps] = useState<VaspInfo[]>([]);
  const [tab, setTab] = useState<Tab>('transfers');
  const [channel, setChannel] = useState<Channel>('local');
  const [connected, setConnected] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    api
      .vasps()
      .then((v) => {
        setVasps(v);
        setConnected(true);
        setError(null);
      })
      .catch((e: ApiFailure) => {
        setConnected(false);
        setError(e.message);
      });
  }, []);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  return (
    <div className="app">
      <header className="masthead">
        <div>
          <h1>Travel Rule · end-to-end encryption console</h1>
          <div className="sub">
            {connected === null && 'connecting…'}
            {connected === false && <><span className="dot down" />server unreachable</>}
            {connected && (
              <>
                <span className="dot up" />
                {vasps.length} VASP{vasps.length === 1 ? '' : 's'} · {vasps.map((v) => v.name).join(', ')}
              </>
            )}
          </div>
        </div>
        <span className="spacer" />
        <nav className="tabs">
          <button aria-selected={tab === 'transfers'} onClick={() => setTab('transfers')}>Transfers</button>
          <button aria-selected={tab === 'send'} onClick={() => setTab('send')}>Send</button>
          <button aria-selected={tab === 'register'} onClick={() => setTab('register')}>Register</button>
          <button aria-selected={tab === 'setup'} onClick={() => setTab('setup')}>Setup</button>
        </nav>
      </header>

      {error && (
        <div className="banner error">
          {error} — start it with <code>./mvnw spring-boot:run</code> in the notabene-e2ee project.
        </div>
      )}

      {connected && tab === 'transfers' && (
        <TransfersView vasps={vasps} channel={channel} onChannelChange={setChannel} reloadKey={reloadKey} />
      )}
      {connected && tab === 'send' && (
        <SendView
          vasps={vasps}
          channel={channel}
          onChannelChange={setChannel}
          onSent={() => {
            refresh();
            setTab('transfers');
          }}
        />
      )}
      {connected && tab === 'register' && <RegisterView vasps={vasps} />}
      {connected && tab === 'setup' && <SetupView vasps={vasps} />}
    </div>
  );
}
