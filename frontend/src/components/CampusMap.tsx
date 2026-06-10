import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import { CAMPUS_CENTER } from '../data/campusLocations';
import type { DriverProfile } from '../types';

const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const destIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const driverIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40] });
    } else if (points.length === 1) {
      map.setView(points[0], 16);
    }
  }, [points, map]);
  return null;
}

interface CampusMapProps {
  pickup?: { lat: number; lng: number; label?: string };
  destination?: { lat: number; lng: number; label?: string };
  drivers?: DriverProfile[];
  height?: string;
}

export default function CampusMap({ pickup, destination, drivers = [], height = '400px' }: CampusMapProps) {
  const points: [number, number][] = [];
  if (pickup) points.push([pickup.lat, pickup.lng]);
  if (destination) points.push([destination.lat, destination.lng]);
  drivers.forEach((d) => {
    if (d.currentLat && d.currentLng) points.push([d.currentLat, d.currentLng]);
  });

  return (
    <div style={{ height }} className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <MapContainer center={CAMPUS_CENTER} zoom={15} scrollWheelZoom className="h-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.length > 0 && <FitBounds points={points} />}
        {pickup && (
          <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
            <Popup>{pickup.label || 'Pickup'}</Popup>
          </Marker>
        )}
        {destination && (
          <Marker position={[destination.lat, destination.lng]} icon={destIcon}>
            <Popup>{destination.label || 'Destination'}</Popup>
          </Marker>
        )}
        {pickup && destination && (
          <Polyline
            positions={[
              [pickup.lat, pickup.lng],
              [destination.lat, destination.lng],
            ]}
            color="#0d9488"
            weight={3}
            dashArray="8 8"
          />
        )}
        {drivers.map((d) =>
          d.currentLat && d.currentLng ? (
            <Marker key={d.id} position={[d.currentLat, d.currentLng]} icon={driverIcon}>
              <Popup>
                <strong>{d.user?.name}</strong>
                <br />
                {d.vehicleType} — {d.vehicleNumber}
                <br />
                Rating: {d.averageRating.toFixed(1)} ⭐
              </Popup>
            </Marker>
          ) : null
        )}
      </MapContainer>
    </div>
  );
}
