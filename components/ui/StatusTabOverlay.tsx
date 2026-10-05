import React from 'react';
import { StyleSheet, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import BottomTabBar, { type TabKey } from './BottomTabBar';
import { ui } from '../../utils/ui';

type Props = {
  visible: boolean;
  originTab: TabKey;
  openStatus: (fromTab: TabKey) => void;
  closeStatus: () => void;
};

function tabFromPath(pathname: string): TabKey {
  if (pathname.includes('messages')) return 'messages';
  if (
    pathname.includes('profile') ||
    pathname.includes('changepassword')
  ) {
    return 'profile';
  }
  return 'home';
}

/** Tab bar drawn above Status so Home / Alerts / Profile stay tappable. */
export default function StatusTabOverlay({
  visible,
  originTab,
  openStatus,
  closeStatus,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

  if (!visible) return null;

  const routeTab = tabFromPath(pathname);

  const onPress = (key: TabKey) => {
    if (key === 'status') {
      openStatus(originTab || routeTab);
      return;
    }

    closeStatus();

    if (key === 'home') {
      router.navigate('/home');
      return;
    }
    if (key === 'messages') {
      router.push('/messages');
      return;
    }
    if (key === 'profile') {
      router.push('/profile');
    }
  };

  return (
    <View pointerEvents="box-none" {...ui('tab-overlay', styles.wrap)}>
      <BottomTabBar active="status" onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 400,
    elevation: 24,
  },
});
