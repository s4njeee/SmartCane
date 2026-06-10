import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AppShell from '../components/AppShell';
import CaneMap from '../components/CaneMap';
import LiveTrackingBanner from '../components/LiveTrackingBanner';
import { TabKey } from '../components/ui/BottomTabBar';
import { useCaneStatus } from '../context/CaneStatusContext';
import { useTheme } from '../context/ThemeContext';

export default function HomeScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { location, selectedCane, isStatusOpen } = useCaneStatus();
  const [mapRef, setMapRef] = useState<any>(null);
  const [bannerExpanded, setBannerExpanded] = useState(true);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');

  useFocusEffect(
    useCallback(() => {
      if (!isStatusOpen) setBannerExpanded(true);
      return () => setBannerExpanded(false);
    }, [isStatusOpen])
  );

  const collapseBanner = () => setBannerExpanded(false);

  const handleTab = (key: TabKey) => {
    if (key === 'home') {
      setBannerExpanded(true);
      if (location && mapRef?.animateCamera) {
        mapRef.animateCamera({
          center: { latitude: location.latitude, longitude: location.longitude },
          zoom: 18,
        });
      }
    } else if (key === 'status') {
      collapseBanner();
    } else {
      collapseBanner();
    }
  };

  if (!location) {
    return (
      <AppShell active="home" onTabPress={handleTab}>
        <View style={[styles.loading, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading SmartCane Map...
          </Text>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell active="home" onTabPress={handleTab}>
      <View style={styles.container}>
        <LiveTrackingBanner
          expanded={bannerExpanded && !isStatusOpen}
          onToggle={() => setBannerExpanded((prev) => !prev)}
          navy={colors.navy}
          success={colors.success}
        />

        <CaneMap
          location={location}
          mapType={mapType}
          onToggleMapType={() => {
            collapseBanner();
            setMapType(mapType === 'standard' ? 'satellite' : 'standard');
          }}
          routePoints={
            selectedCane?.routes.map((r) => ({
              latitude: r.latitude,
              longitude: r.longitude,
            })) ?? []
          }
          onMapRef={setMapRef}
          onMapPress={collapseBanner}
        />
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 15, fontWeight: '500' },
});
