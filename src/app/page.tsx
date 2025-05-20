'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import mqtt from 'mqtt';

const Map = dynamic(() => import('../components/Map'), { ssr: false });

interface Telemetry {
  device_id: string;
  latitude: number;
  longitude: number;
  alert: boolean;
}

export default function Home() {
  const [telemetry, setTelemetry] = useState<Telemetry>({
    device_id: '',
    latitude: 0,
    longitude: 0,
    alert: false,
  });

  useEffect(() => {
    console.log('Connecting to MQTT over WebSockets…');
    const client = mqtt.connect('ws://broker.hivemq.com:8000/mqtt');

    client.on('connect', () => {
      console.log('MQTT WS connected');
      client.subscribe('gps/+/location', (err) => {
        if (err) console.error('subscribe location error:', err);
        else console.log('subscribed to gps/+/location');
      });
      client.subscribe('gps/+/sos', (err) => {
        if (err) console.error('subscribe sos error:', err);
        else console.log('subscribed to gps/+/sos');
      });
    });

    client.on('message', (topic, message) => {
      console.log('incoming MQTT', topic, message.toString());
      try {
        const data = JSON.parse(message.toString()) as {
          device_id: string;
          latitude: number | string;
          longitude: number | string;
          alert?: boolean;
        };

        setTelemetry((prev) => ({
          device_id: data.device_id,
          latitude:
            typeof data.latitude === 'string'
              ? parseFloat(data.latitude)
              : data.latitude,
          longitude:
            typeof data.longitude === 'string'
              ? parseFloat(data.longitude)
              : data.longitude,
          alert: data.alert ?? prev.alert,
        }));
      } catch (err) {
        console.error('Error parsing MQTT message', err);
      }
    });

    client.on('error', (err) => {
      console.error('MQTT error:', err);
    });

    return () => {
      console.log('Disconnecting MQTT client');
      client.end();
    };
  }, []);

  return (
    <main className="w-full h-screen relative bg-gray-100">
      <Map latitude={telemetry.latitude} longitude={telemetry.longitude} />

      {telemetry.alert && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-10">
          SOS Alert from {telemetry.device_id}!
        </div>
      )}
    </main>
  );
}
    