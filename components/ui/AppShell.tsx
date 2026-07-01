import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import BottomTabBar, { TabKey } from './BottomTabBar';
import { useCaneStatus } from '../../context/CaneStatusContext';

type Props = {
  active: TabKey;
  children: React.ReactNode;
  onTabPress?: (key: TabKey) => void;
};

export default function AppShell({ active, children, onTabPress }: Props) {
  const router = useRouter();
  const { isStatusOpen, openStatus, closeStatus } = useCaneStatus();

  const highlightedTab: TabKey = isStatusOpen ? 'status' : active;

  const handleTab = useCallback(
    (key: TabKey) => {
      if (key === 'status') {
        openStatus(active);
        onTabPress?.(key);
        return;
      }

      if (isStatusOpen) {
        closeStatus();
      }

      if (key === active) {
        onTabPress?.(key);
        if (key === 'home') router.replace('/home');
        return;
      }

      onTabPress?.(key);

      if (key === 'home') {
        router.replace('/home');
      } else if (key === 'messages') {
        router.push('/messages');
      } else if (key === 'profile') {
        router.push('/profile');
      }
    },
    [active, closeStatus, isStatusOpen, onTabPress, openStatus, router]
  );

  return (
    <View style={styles.shell}>
      {children}
      <BottomTabBar active={highlightedTab} onPress={handleTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
});