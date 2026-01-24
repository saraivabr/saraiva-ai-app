import { useMemo } from 'react';
import { useNetInfo } from '@react-native-community/netinfo';

export const useConnectivity = () => {
  const netInfo = useNetInfo();

  const isOnline = useMemo(() => {
    if (netInfo.isConnected === false) return false;
    if (netInfo.isInternetReachable === false) return false;
    return true;
  }, [netInfo.isConnected, netInfo.isInternetReachable]);

  return {
    isOnline,
    netInfo,
  };
};
