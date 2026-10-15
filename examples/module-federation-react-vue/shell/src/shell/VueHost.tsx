import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadVueSub, remoteEntryUrl, type VueSubInstance } from '../remote';

export function VueHost() {
  const element = useRef<HTMLDivElement>(null);
  const instance = useRef<VueSubInstance | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const fullPath = location.pathname + location.search + location.hash;
  const latestPath = useRef(fullPath);
  const latestNavigate = useRef(navigate);
  latestPath.current = fullPath;
  latestNavigate.current = navigate;
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');

  // #region mount-lifecycle
  useEffect(() => {
    let cancelled = false;
    let mounted: VueSubInstance | null = null;
    const target = element.current!;

    async function start() {
      try {
        const remote = await loadVueSub();
        if (cancelled) return;
        mounted = await remote.mountVueSub(target, {
          initialLocation: latestPath.current,
          onNavigate(next) {
            // Only the shell owns browser history; don't accept off-app URLs.
            if (!cancelled && /^\/catalog(?:[/?#]|$)/.test(next) && !next.includes('\\')) {
              latestNavigate.current(next);
            }
          },
        });
        if (cancelled) {
          mounted.unmount();
          return;
        }
        instance.current = mounted;
        await mounted.updateLocation(latestPath.current);
        if (!cancelled) setStatus('ready');
      } catch (error) {
        mounted?.unmount();
        if (!cancelled) {
          instance.current = null;
          setMessage(error instanceof Error ? error.message : 'Unable to load Vue remote');
          setStatus('error');
        }
      }
    }
    void start();
    return () => {
      cancelled = true;
      instance.current = null;
      mounted?.unmount();
    };
  }, []);
  // #endregion mount-lifecycle

  // #region location-bridge
  useEffect(() => {
    void instance.current?.updateLocation(fullPath).catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : 'Unable to sync location');
      setStatus('error');
    });
  }, [fullPath]);
  // #endregion location-bridge

  return (
    <main>
      {status === 'loading' && <p role="status">Loading Vue remote…</p>}
      {status === 'error' && <section role="alert">
        <h2>Catalog is unavailable</h2>
        <p>{message}</p>
        <p>Remote: <code>{remoteEntryUrl}</code></p>
        <button onClick={() => window.location.reload()}>Reload page</button>
      </section>}
      <div ref={element} aria-label="Vue remote container" />
    </main>
  );
}
