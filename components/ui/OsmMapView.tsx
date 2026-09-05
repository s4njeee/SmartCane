import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

type LatLng = { latitude: number; longitude: number };

type Props = {
  center: LatLng;
  caneLocation?: LatLng | null;
  phoneLocation?: LatLng | null;
  routePoints?: LatLng[];
  mapType?: 'standard' | 'satellite';
  onMapPress?: () => void;
  onCanePress?: () => void;
};

function buildHtml(
  center: LatLng,
  cane: LatLng | null | undefined,
  phone: LatLng | null | undefined,
  route: LatLng[],
  satellite: boolean,
) {
  const tileUrl = satellite
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const attribution = satellite
    ? 'Tiles &copy; Esri'
    : '&copy; OpenStreetMap';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #e8eef5; }
    .cane-hit {
      background: transparent !important;
      border: none !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map', { zoomControl: false, tapTolerance: 25 }).setView([${center.latitude}, ${center.longitude}], 16);
    L.tileLayer(${JSON.stringify(tileUrl)}, {
      maxZoom: 19,
      attribution: ${JSON.stringify(attribution)}
    }).addTo(map);

    let caneMarker = null;
    let caneHit = null;
    let phoneMarker = null;
    let routeLine = null;
    let skipMapClick = false;

    function post(type) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: type }));
      }
    }

    function bindCaneTap(layer) {
      layer.on('click', function (e) {
        if (e && e.originalEvent) {
          L.DomEvent.stopPropagation(e.originalEvent);
          L.DomEvent.preventDefault(e.originalEvent);
        }
        skipMapClick = true;
        post('cane');
        setTimeout(function () { skipMapClick = false; }, 300);
      });
    }

    function setState(payload) {
      const { cane, phone, route, followCenter } = payload;
      if (followCenter && payload.center) {
        map.setView([payload.center.latitude, payload.center.longitude], map.getZoom());
      }
      if (cane) {
        const latlng = [cane.latitude, cane.longitude];
        if (!caneMarker) {
          caneMarker = L.circleMarker(latlng, {
            radius: 12,
            color: '#174EA6',
            weight: 3,
            fillColor: '#1A73E8',
            fillOpacity: 1,
            interactive: true
          }).addTo(map);
          bindCaneTap(caneMarker);
          caneHit = L.circleMarker(latlng, {
            radius: 28,
            color: 'transparent',
            weight: 0,
            fillColor: '#1A73E8',
            fillOpacity: 0.15,
            interactive: true,
            className: 'cane-hit'
          }).addTo(map);
          bindCaneTap(caneHit);
          caneHit.bindTooltip('Tap for directions', {
            permanent: false,
            direction: 'top',
            offset: [0, -10]
          });
        } else {
          caneMarker.setLatLng(latlng);
          caneHit.setLatLng(latlng);
        }
      } else {
        if (caneMarker) { map.removeLayer(caneMarker); caneMarker = null; }
        if (caneHit) { map.removeLayer(caneHit); caneHit = null; }
      }
      if (phone) {
        const platlng = [phone.latitude, phone.longitude];
        if (!phoneMarker) {
          phoneMarker = L.circleMarker(platlng, {
            radius: 8, color: '#fff', weight: 2, fillColor: '#EA4335', fillOpacity: 1,
            interactive: false
          }).addTo(map);
        } else {
          phoneMarker.setLatLng(platlng);
        }
      } else if (phoneMarker) {
        map.removeLayer(phoneMarker);
        phoneMarker = null;
      }
      if (route && route.length > 1) {
        const latlngs = route.map((p) => [p.latitude, p.longitude]);
        if (!routeLine) {
          routeLine = L.polyline(latlngs, { color: '#1A73E8', weight: 5, interactive: false }).addTo(map);
        } else {
          routeLine.setLatLngs(latlngs);
        }
      } else if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
      }
    }

    setState(${JSON.stringify({
      center,
      cane: cane || null,
      phone: phone || null,
      route,
      followCenter: true,
    })});

    map.on('click', function () {
      if (skipMapClick) return;
      post('press');
    });

    document.addEventListener('message', function (e) {
      try { setState(JSON.parse(e.data)); } catch (err) {}
    });
    window.addEventListener('message', function (e) {
      try { setState(JSON.parse(e.data)); } catch (err) {}
    });
  </script>
</body>
</html>`;
}

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
      buildHtml(
        center,
        caneLocation,
        phoneLocation,
        routePoints,
        mapType === 'satellite',
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial HTML only; updates via inject
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
