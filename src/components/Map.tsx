import { useEffect, useRef } from 'react';

interface MapProps {
  latitude: number;
  longitude: number;
}

export default function Map({ latitude, longitude }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | undefined>(undefined);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!window.google || !window.google.maps) {
      console.error('Google Maps API is not available');
      return;
    }

    if (mapInstance.current) {
      // Update the center if the map already exists
      mapInstance.current.setCenter({ lat: latitude, lng: longitude });
    } else {
      // Create a new map instance
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: latitude, lng: longitude },
        zoom: 15,
        disableDefaultUI: false,
        zoomControl: true,
        gestureHandling: 'auto',
      });
      // Use the custom marker image from the public folder
      new window.google.maps.Marker({
        position: { lat: latitude, lng: longitude },
        map: mapInstance.current,
        animation: window.google.maps.Animation.DROP,
        icon: {
          url: '/tracker_image.png', 
          scaledSize: new window.google.maps.Size(50, 50), // Adjust size as needed
        },
      });
    }
  }, [latitude, longitude]);

  return <div ref={mapRef} className="w-full h-full" />;
}
