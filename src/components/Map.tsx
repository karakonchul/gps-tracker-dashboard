import { useEffect, useRef } from 'react';

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
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    // 1) insert <script> only once
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
      script.async = true;
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }

    function initMap() {
      if (!mapRef.current) return;

      // 2) create the map if needed
      if (!markerRef.current) {
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: latitude, lng: longitude },
          zoom: 15,
          disableDefaultUI: true,
        });

        // 3) create the marker with custom icon
        markerRef.current = new window.google.maps.Marker({
          position: { lat: latitude, lng: longitude },
          map,
          icon: {
            url: '/tracker_image.webp',   // must live in public/
            scaledSize: new window.google.maps.Size(48, 48),
            anchor: new window.google.maps.Point(24, 24)
          }
        });
      } else {
        // 4) update existing marker & recenter
        markerRef.current.setPosition({ lat: latitude, lng: longitude });
        (markerRef.current.getMap() as google.maps.Map)?.setCenter({ lat: latitude, lng: longitude });
      }
    }
  }, [latitude, longitude]);

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
