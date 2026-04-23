"use client";

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type EvacuationCenter = {
  Name: string;
  Latitude: number;
  Longitude: number;
};

type EvacuationMapProps = {
  centers: EvacuationCenter[];
};

export default function EvacuationMap({ centers }: EvacuationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Cleanup previous map instance if it exists
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Make sure the map container is available
    if (!mapContainerRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current).setView([10.3157, 123.8854], 12); // Centered on Cebu City
    mapRef.current = map;

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Custom icon for evacuation centers
    const evacuationIcon = L.icon({
      iconUrl: '/evacuation-marker.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });

    // Add markers for each evacuation center
    centers.forEach(center => {
      L.marker([center.Latitude, center.Longitude], { icon: evacuationIcon })
        .bindPopup(`
          <div class="p-2">
            <h3 class="font-bold">${center.Name}</h3>
            <p class="mt-2">Coordinates: ${center.Latitude}, ${center.Longitude}</p>
            <a 
              href="https://www.google.com/maps?q=${center.Latitude},${center.Longitude}"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-500 hover:underline block mt-2"
            >
              View on Google Maps
            </a>
          </div>
        `)
        .addTo(map);
    });

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [centers]);

  return (
    <div ref={mapContainerRef} className="h-[400px] w-full rounded-lg shadow-md" />
  );
} 