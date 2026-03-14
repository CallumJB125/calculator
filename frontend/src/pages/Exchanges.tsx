import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Exchange } from '../types';
import { timeAgo } from '../utils/format';

export default function Exchanges() {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [form, setForm] = useState({ apiKey: '', apiSecret: '' });
  const [activeForm, setActiveForm] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.exchanges.list().then(data => {
      setExchanges(data);
      setLoading(false);
    });
  }, []);

  const handleConnect = async (exchangeId: string) => {
    if (!form.apiKey || !form.apiSecret) {
      setError('Both API Key and API Secret are required');
      return;
    }
    setConnecting(exchangeId);
    setError(null);
    try {
      const res = await api.exchanges.connect(exchangeId, form.apiKey, form.apiSecret);
      setExchanges(prev => prev.map(e => e.id === exchangeId ? res.exchange : e));
      setActiveForm(null);
      setForm({ apiKey: '', apiSecret: '' });
    } catch (e) {
      setError('Failed to connect. Please check your API credentials.');
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (exchangeId: string) => {
    try {
      await api.exchanges.disconnect(exchangeId);
      setExchanges(prev => prev.map(e =>
        e.id === exchangeId ? { ...e, connected: false, apiKey: undefined, lastSync: undefined } : e
      ));
    } catch {
      setError('Failed to disconnect exchange');
    }
  };

  const handleSync = async (exchangeId: string) => {
    setSyncing(exchangeId);
    try {
      const res = await api.exchanges.sync(exchangeId);
      setExchanges(prev => prev.map(e =>
        e.id === exchangeId ? { ...e, lastSync: res.lastSync } : e
      ));
    } catch {
      setError('Sync failed');
    } finally {
      setSyncing(null);
    }
  };

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>;

  const connected = exchanges.filter(e => e.connected);
  const available = exchanges.filter(e => !e.connected);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Exchange Connections</h1>
        <p className="text-gray-400 mt-1">Connect your crypto exchanges to import trades and positions</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Connected exchanges */}
      {connected.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Connected ({connected.length})
          </h2>
          <div className="space-y-3">
            {connected.map(ex => (
              <div key={ex.id} className="card flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-200">
                    {ex.logo}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{ex.name}</p>
                      <span className="badge-green">Connected</span>
                    </div>
                    {ex.apiKey && <p className="text-xs text-gray-500 mt-0.5">Key: {ex.apiKey}</p>}
                    {ex.lastSync && <p className="text-xs text-gray-500">Last sync: {timeAgo(ex.lastSync)}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSync(ex.id)}
                    disabled={syncing === ex.id}
                    className="btn-secondary text-xs"
                  >
                    {syncing === ex.id ? 'Syncing...' : 'Sync'}
                  </button>
                  <button
                    onClick={() => handleDisconnect(ex.id)}
                    className="btn-danger text-xs"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Available exchanges */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Available to Connect ({available.length})
        </h2>
        <div className="space-y-3">
          {available.map(ex => (
            <div key={ex.id} className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-500">
                    {ex.logo}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{ex.name}</p>
                    <p className="text-xs text-gray-500">Not connected</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveForm(activeForm === ex.id ? null : ex.id)}
                  className="btn-primary text-xs"
                >
                  {activeForm === ex.id ? 'Cancel' : 'Connect'}
                </button>
              </div>

              {activeForm === ex.id && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <p className="text-sm text-gray-400 mb-3">
                    Enter your {ex.name} API credentials. Ensure your API key has read-only access.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">API Key</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Paste your API key..."
                        value={form.apiKey}
                        onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">API Secret</label>
                      <input
                        type="password"
                        className="input"
                        placeholder="Paste your API secret..."
                        value={form.apiSecret}
                        onChange={e => setForm(f => ({ ...f, apiSecret: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleConnect(ex.id)}
                        disabled={connecting === ex.id}
                        className="btn-primary"
                      >
                        {connecting === ex.id ? 'Connecting...' : 'Connect'}
                      </button>
                      <p className="text-xs text-gray-600">
                        Your credentials are stored locally and never shared.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
