import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppShell from '../components/ui/AppShell';
import CaneMap from '../components/ui/CaneMap';
import LiveTrackingBanner from '../components/ui/LiveTrackingBanner';
import { TabKey } from '../components/ui/BottomTabBar';
import { useCaneStatus } from '../context/CaneStatusContext';
import { useNavigation } from '../context/NavigationContext';
import { useTheme } from '../context/ThemeContext';
import { platformDesign } from '../constants/platformDesign';
import { looksLikeCoordinates } from '../utils/geoPlace';
import { mapBannerTop, tabBarClearance } from '../utils/layoutInsets';

export default function HomeScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const {
    location,
    phoneLocation,
    selectedCane,
    isStatusOpen,
    caneAddress,
  } = useCaneStatus();
  const [mapRef, setMapRef] = useState<any>(null);
  const [bannerExpanded, setBannerExpanded] = useState(false);
  const [isHomeFocused, setIsHomeFocused] = useState(true);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const { followDirection, isNavigating } = useNavigation();
  const insets = useSafeAreaInsets();

  const caneLocation = location
    ? { latitude: location.latitude, longitude: location.longitude }
    : null;
  const hasMapTarget = Boolean(caneLocation || phoneLocation);
  const showStatusBanner =
    isHomeFocused && !isStatusOpen && !followDirection && !isNavigating;
  const routeAddress = selectedCane?.routes[0]?.address;
  const placeLabel =
    caneAddress ||
    (routeAddress && !looksLikeCoordinates(routeAddress) ? routeAddress : '');

  useFocusEffect(
    useCallback(() => {
      setIsHomeFocused(true);
      return () => {
        setIsHomeFocused(false);
        setBannerExpanded(false);
      };
    }, [])
  );

  const collapseBanner = () => setBannerExpanded(false);

  const handleTab = (key: TabKey) => {
    if (key === 'home') {
      setBannerExpanded(false);
      const points = [caneLocation, phoneLocation].filter(Boolean);
      if (points.length >= 2 && mapRef?.fitToCoordinates) {
        mapRef.fitToCoordinates(points, {
          edgePadding: {
            top: mapBannerTop(insets) + 100,
            right: 60,
            bottom: tabBarClearance(insets, 40),
            left: 60,
          },
          animated: true,
        });
      } else if (caneLocation && mapRef?.animateCamera) {
        mapRef.animateCamera({
          center: caneLocation,
          zoom: 18,
        });
      }
    } else {
      collapseBanner();
    }
  };

  if (!hasMapTarget) {
    return (
      <AppShell active="home" onTabPress={handleTab}>
        <View style={[styles.loading, { backgroundColor: colors.background }]}>
          {showStatusBanner && (
            <View
              pointerEvents="box-none"
              collapsable={false}
              style={styles.bannerHost}
            >
              <LiveTrackingBanner
                expanded={bannerExpanded}
                onToggle={() => setBannerExpanded((prev) => !prev)}
                caneName={selectedCane?.username}
                deviceOnline={Boolean(selectedCane?.connected)}
                battery={selectedCane?.battery}
                address={placeLabel}
              />
            </View>
          )}
          <View style={[styles.loadingIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="navigate" size={28} color={colors.primary} />
          </View>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 16 }} />
          <Text style={[styles.loadingTitle, { color: colors.text }]}>
            {selectedCane ? 'Finding your cane' : 'Set up tracking'}
          </Text>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {selectedCane
              ? 'Waiting for GPS fix from the cane…'
              : 'Add a cane in Status, or enable phone location'}
          </Text>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell active="home" onTabPress={handleTab}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <CaneMap
          caneLocation={caneLocation}
          phoneLocation={phoneLocation}
          mapType={mapType}
          caneName={selectedCane?.username}
          onToggleMapType={() => {
            collapseBanner();
            setMapType(mapType === 'standard' ? 'satellite' : 'standard');
          }}
          onMapRef={setMapRef}
          onMapPress={collapseBanner}
        />

        {showStatusBanner && (
          <View
            pointerEvents="box-none"
            collapsable={false}
            style={[
              styles.bannerHost,
              platformDesign.id === 'android' && styles.bannerHostAndroid,
            ]}
          >
            <LiveTrackingBanner
              expanded={bannerExpanded}
              onToggle={() => setBannerExpanded((prev) => !prev)}
              caneName={selectedCane?.username}
              deviceOnline={Boolean(selectedCane?.connected)}
              battery={selectedCane?.battery}
              address={placeLabel}
            />
          </View>
        )}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bannerHost: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
  },
  bannerHostAndroid: {
    elevation: 8,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
});
