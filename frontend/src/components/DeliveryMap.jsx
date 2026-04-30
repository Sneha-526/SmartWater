import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons
const createIcon = (emoji, size = 32) => L.divIcon({
  html: `<div style="font-size:${size}px;text-shadow:0 2px 8px rgba(0,0,0,0.5);filter:drop-shadow(0 0 4px rgba(0,210,255,0.4))">${emoji}</div>`,
  className: '',
  iconSize: [size, size],
  iconAnchor: [size / 2, size],
  popupAnchor: [0, -size],
});

const customerIcon = createIcon('📍', 34);
const vendorIcon = createIcon('🏪', 34);
const deliveryIcon = createIcon('🚚', 36);

// Fit map bounds to route
const FitBounds = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds?.length >= 2) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [bounds, map]);
  return null;
};

// Fly to position
const FlyTo = ({ position, zoom = 15 }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, zoom, { duration: 1 });
  }, [position, map, zoom]);
  return null;
};

// Map click handler
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Fetch route from OSRM (free, no key needed)
async function fetchRoute(from, to) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.[0]) {
      const route = data.routes[0];
      const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      return {
        coords,
        distance: (route.distance / 1000).toFixed(1),
        duration: Math.round(route.duration / 60),
      };
    }
  } catch (err) {
    console.warn('[Map] OSRM route fetch failed:', err);
  }
  return null;
}

const DeliveryMap = ({
  position,
  vendorPosition,
  onMapClick,
  height = 300,
  popupText = 'Delivery Location',
  readonly = false,
  showRoute = false,
  orderStatus,
}) => {
  const [route, setRoute] = useState(null);
  const defaultCenter = position?.lat
    ? [position.lat, position.lng]
    : [28.5355, 77.3910]; // Default: Noida, UP

  // Fetch route when both positions available
  useEffect(() => {
    if (showRoute && position?.lat && vendorPosition?.lat) {
      fetchRoute(vendorPosition, position).then(setRoute);
    }
  }, [showRoute, position?.lat, position?.lng, vendorPosition?.lat, vendorPosition?.lng]);

  const movingIcon = orderStatus === 'on_the_way' ? deliveryIcon : vendorIcon;
  const bounds = position?.lat && vendorPosition?.lat
    ? [[position.lat, position.lng], [vendorPosition.lat, vendorPosition.lng]]
    : null;

  return (
    <div className="map-container" style={{ height, position: 'relative' }}>
      <MapContainer
        center={defaultCenter}
        zoom={position?.lat ? 15 : 5}
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; CartoDB'
        />
        {!readonly && onMapClick && <MapClickHandler onMapClick={onMapClick} />}
        {position?.lat && !bounds && <FlyTo position={[position.lat, position.lng]} />}
        {bounds && <FitBounds bounds={bounds} />}

        {/* Customer marker */}
        {position?.lat && (
          <Marker position={[position.lat, position.lng]} icon={customerIcon}>
            <Popup>{popupText}</Popup>
          </Marker>
        )}

        {/* Vendor / delivery marker */}
        {vendorPosition?.lat && (
          <Marker position={[vendorPosition.lat, vendorPosition.lng]} icon={movingIcon}>
            <Popup>{orderStatus === 'on_the_way' ? '🚚 Vendor is on the way!' : '🏪 Vendor Location'}</Popup>
          </Marker>
        )}

        {/* Route polyline */}
        {route?.coords && (
          <Polyline
            positions={route.coords}
            pathOptions={{
              color: '#00d2ff',
              weight: 4,
              opacity: 0.8,
              dashArray: orderStatus === 'on_the_way' ? '10, 10' : null,
            }}
          />
        )}
      </MapContainer>

      {/* Glass overlay with distance/ETA */}
      {route && (
        <div className="map-overlay-glass">
          <div className="map-stat">
            <span className="map-stat-value">{route.distance} km</span>
            <span className="map-stat-label">Distance</span>
          </div>
          <div className="map-divider" />
          <div className="map-stat">
            <span className="map-stat-value">{route.duration} min</span>
            <span className="map-stat-label">ETA</span>
          </div>
          <div className="map-divider" />
          <a
            href={`https://www.google.com/maps/dir/${vendorPosition.lat},${vendorPosition.lng}/${position.lat},${position.lng}`}
            target="_blank"
            rel="noreferrer"
            className="btn-directions"
          >
            🧭 Directions
          </a>
        </div>
      )}
    </div>
  );
};

export { fetchRoute };
export default DeliveryMap;
