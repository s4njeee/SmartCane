import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

/** True when the phone has Wi‑Fi or mobile data. */
export function useOnlineStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let mounted = true;

    const apply = (state: Network.NetworkState) => {
      if (!mounted) return;
      const connected = state.isConnected !== false;
      const reachable = state.isInternetReachable;
      setOnline(connected && reachable !== false);
    };

    void Network.getNetworkStateAsync().then(apply).catch(() => undefined);
    const sub = Network.addNetworkStateListener(apply);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return online;
}
