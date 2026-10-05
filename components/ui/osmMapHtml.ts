export type OsmLatLng = { latitude: number; longitude: number };

export function buildOsmMapHtml(
  center: OsmLatLng,
  cane: OsmLatLng | null | undefined,
  phone: OsmLatLng | null | undefined,
  route: OsmLatLng[],
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
    html, body, #map {
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
      background: #e8eef5;
      -webkit-tap-highlight-color: transparent;
      -webkit-touch-callout: none;
      outline: none;
    }
    *, *::before, *::after {
      -webkit-tap-highlight-color: transparent !important;
      outline: none !important;
    }
    .leaflet-container,
    .leaflet-interactive,
    .leaflet-interactive:focus,
    .leaflet-overlay-pane svg,
    .leaflet-overlay-pane path,
    svg,
    svg:focus,
    path,
    path:focus {
      outline: none !important;
      -webkit-tap-highlight-color: transparent !important;
    }
    .cane-hit {
      background: transparent !important;
      border: none !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map', { zoomControl: false, tapTolerance: 25, keyboard: false }).setView([${center.latitude}, ${center.longitude}], 16);
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
      var payload = JSON.stringify({ type: type });
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(payload);
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage(payload, '*');
      }
    }

    function bindCaneTap(layer) {
      layer.on('click', function (e) {
        if (e && e.originalEvent) {
          L.DomEvent.stopPropagation(e.originalEvent);
          L.DomEvent.preventDefault(e.originalEvent);
        }
        const path = e && e.target && e.target._path;
        if (path && path.blur) path.blur();
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
      try {
        var data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data && data.type) return;
        setState(data);
      } catch (err) {}
    });
  </script>
</body>
</html>`;
}
