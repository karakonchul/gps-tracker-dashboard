// src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import mqtt from 'mqtt';

const Map     = dynamic(() => import('../components/Map'),    { ssr: false });
const UwbPlot = dynamic(() => import('../components/UwbPlot'), { ssr: false });

interface Telemetry {
  device_id: string;
  latitude: number;
  longitude: number;
  alert: boolean;
}

// Haversine formula (km)
function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Home() {
  const [telemetry, setTelemetry] = useState<Telemetry>({
    device_id: 'hristiyana',
    latitude: 0,
    longitude: 0,
    alert: false,
  });
  const [loaded, setLoaded] = useState(false);

  // 1) Fetch last-known location
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/last-location?device_id=hristiyana');
        if (res.ok) {
          const data = await res.json();
          setTelemetry((t) => ({
            ...t,
            latitude:  parseFloat(data.latitude),
            longitude: parseFloat(data.longitude),
          }));
        }
      } catch (err) {
        console.error('Error fetching last-location', err);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // 2) Subscribe to live MQTT updates
  useEffect(() => {
    if (!loaded) return;
    const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt');

    client.on('connect', () => {
      client.subscribe('gps/+/location');
      client.subscribe('gps/+/sos');
    });

    client.on('message', (_topic, msg) => {
      try {
        const d = JSON.parse(msg.toString());
        setTelemetry({
          device_id: d.device_id,
          latitude:
            typeof d.latitude === 'string'
              ? parseFloat(d.latitude)
              : d.latitude,
          longitude:
            typeof d.longitude === 'string'
              ? parseFloat(d.longitude)
              : d.longitude,
          alert: d.alert ?? false,
        });
      } catch {
        console.error('Error parsing MQTT message');
      }
    });

    client.on('error', console.error);
    return () => {
      client.end();
    };
  }, [loaded]);

  // 3) Loading or no-fix sentinel
  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading last known location…
      </div>
    );
  }
  if (telemetry.latitude === 360 && telemetry.longitude === 360) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="text-2xl text-gray-600">
          📡 Device not available
        </span>
      </div>
    );
  }

  // 4) Geofence check (1 km around Sofia center)
  const geofenceCenter = { lat: 42.6977, lng: 23.3219 };
  const inside =
    getDistanceKm(
      telemetry.latitude,
      telemetry.longitude,
      geofenceCenter.lat,
      geofenceCenter.lng
    ) <= 1;

  return (
    <main className="w-full h-screen relative bg-gray-100">
      {/* Full-screen map */}
      <Map
        latitude={telemetry.latitude}
        longitude={telemetry.longitude}
      />

      {/* SOS banner */}
      {telemetry.alert && (
        <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-10 max-w-xs break-words">
          SOS Alert from {telemetry.device_id}!
        </div>
      )}

      {/* Geofence status */}
      {!inside && (
        <div className="absolute top-4 left-4 bg-yellow-500 text-black px-4 py-2 rounded-lg shadow-lg z-10 max-w-xs break-words">
          Device is outside the geofence.
        </div>
      )}

      {/* UWB plot panel */}
      <section className="
          absolute bottom-4 left-1/2 transform -translate-x-1/2
          w-11/12 max-w-3xl bg-white p-4 rounded-lg shadow-lg z-10
          overflow-auto
        ">
        <h2 className="text-lg font-semibold mb-2">
          UWB Positions (Last 50)
        </h2>
        <UwbPlot />
      </section>
    </main>
  );
}
