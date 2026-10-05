import { createElement, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
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

/** Browser map — iframe + Leaflet. react-native-webview has no web implementation. */
export default function OsmMapView({
  center,
  caneLocation,
  phoneLocation,
  routePoints = [],
  mapType = 'standard',
  onMapPress,
  onCanePress,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
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
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({
        center,
        cane: caneLocation || null,
        phone: phoneLocation || null,
        route: routePoints,
        followCenter,
      }),
      '*',
    );
  }, [center, caneLocation, phoneLocation, routePoints]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) {
        return;
      }
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type === 'cane') {
          onCanePress?.();
          return;
        }
        if (data?.type === 'press') {
          onMapPress?.();
        }
      } catch {
        if (event.data === 'press') onMapPress?.();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onCanePress, onMapPress]);

  return (
    <View style={styles.root}>
      {createElement('iframe', {
        key: mapType,
        ref: iframeRef,
        title: 'Cane map',
        srcDoc: html,
        style: {
          border: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          background: '#E8EEF5',
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
