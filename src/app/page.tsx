'use client';

import { useEffect, useState } from 'react';
import Map from '../components/Map';

interface LocationData {
  device_id: string;
  latitude: string;
  longitude: string;
  timestamp: string;
}

export default function Home() {
  const [location, setLocation] = useState<LocationData | null>(null);

  useEffect(() => {
    fetch('/api/last-location')
      .then((res) => res.json())
      .then((data) => {
        console.log('Fetched location data:', data);
        setLocation(data);
      })
      .catch((err) => console.error('Error fetching location:', err));
  }, []);

  if (!location) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
        <p>Loading location...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <Map
        latitude={parseFloat(location.latitude)}
        longitude={parseFloat(location.longitude)}
      />
    </div>
  );
}
