import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { buildOsmMapHtml, type OsmLatLng } from './osmMapHtml';

type Props = {
  center: OsmLatLng;
  caneLocation?: OsmLatLng | null;
  phoneLocation?: OsmLatLng | null;
  routePoints?: OsmLatLng[];
  mapType?: 'standard' | 'satellite';
  onMapPress?: () => void;
  onCanePress?: () => void;
};

/**
 * OpenStreetMap / Leaflet WebView map for Expo Go (Android + iOS).
 */
export default function OsmMapView({
  center,
  caneLocation,
  phoneLocation,
  routePoints = [],
  mapType = 'standard',
  onMapPress,
  onCanePress,
}: Props) {
  const webRef = useRef<WebView>(null);
  const didFollow = useRef(false);
  const html = useMemo(
    () =>
      buildOsmMapHtml(
        center,
        caneLocation,
        phoneLocation,
        routePoints,
        mapType === 'satellite',
      ),
    [mapType],
  );

  useEffect(() => {
    const followCenter = !didFollow.current;
    if (caneLocation || phoneLocation) didFollow.current = true;
    const payload = JSON.stringify({
      center,
      cane: caneLocation || null,
      phone: phoneLocation || null,
      route: routePoints,
      followCenter,
    });
    webRef.current?.injectJavaScript(`setState(${payload}); true;`);
  }, [center, caneLocation, phoneLocation, routePoints]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === 'cane') {
        onCanePress?.();
        return;
      }
      if (data?.type === 'press') {
        onMapPress?.();
      }
    } catch {
      if (event.nativeEvent.data === 'press') onMapPress?.();
    }
  };

  return (
    <View style={styles.root}>
      <WebView
        ref={webRef}
        key={mapType}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.map}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        setSupportMultipleWindows={false}
        // Needed so marker taps reach the WebView on Android
        nestedScrollEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  map: { flex: 1, backgroundColor: '#E8EEF5' },
});
