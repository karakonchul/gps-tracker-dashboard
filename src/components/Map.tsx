// src/app/components/Map.tsx
import { useEffect, useRef, useMemo } from 'react';

declare global {
  interface Window {
    google: typeof google;
  }
}

interface MapProps {
  latitude: number;
  longitude: number;
}

export default function Map({ latitude, longitude }: MapProps) {
  // ── 1) Hooks must always run in the same order ──
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerRef  = useRef<google.maps.Marker | null>(null);
  const circleRef  = useRef<google.maps.Circle  | null>(null);

  // Geofence center + radius
  const geofenceCenter = useMemo(() => ({ lat: 42.6977, lng: 23.3219 }), []);
  const geofenceRadiusMeters = 1000; // 1 km

  useEffect(() => {
    function initMap() {
      if (!mapRef.current) return;

      if (!mapInstance.current) {
        // First mount: create map, marker, circle
        mapInstance.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: latitude, lng: longitude },
          zoom: 15,
          disableDefaultUI: true,
        });

        markerRef.current = new window.google.maps.Marker({
          position: { lat: latitude, lng: longitude },
          map: mapInstance.current,
          icon: {
            url: '/tracker_image.png',
            scaledSize: new window.google.maps.Size(48, 48),
            anchor: new window.google.maps.Point(24, 24),
          },
        });

        circleRef.current = new window.google.maps.Circle({
          strokeColor: '#FF0000',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#FF0000',
          fillOpacity: 0.1,
          map: mapInstance.current,
          center: geofenceCenter,
          radius: geofenceRadiusMeters,
        });
      } else {
        // Updates: move marker + recenter
        markerRef.current!.setPosition({ lat: latitude, lng: longitude });
        mapInstance.current!.setCenter({ lat: latitude, lng: longitude });
      }
    }

    // Load Google Maps script once
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
      script.async = true;
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }
  }, [latitude, longitude, geofenceCenter, geofenceRadiusMeters]);

  // ── 2) Now it’s safe to do an early return ──
  if (latitude === 360 && longitude === 360) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="text-2xl text-gray-600">📡 Device not available</span>
      </div>
    );
  }

  // ── 3) And finally, the real map render ──
  return (
    <div
      ref={mapRef}
      style={{
        width: '100vw',
        height: '100vh',
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    />
  );
}
