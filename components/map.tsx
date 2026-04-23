"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Disaster {
  id: string;
  name: string;
  type: string;
  status: string;
  date: string;
  countries: string[];
  description: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  source: string;
  alertLevel?: string;
}

interface MapProps {
  disasters: Disaster[];
  onDisasterSelect: (disaster: Disaster) => void;
  defaultCenter?: {
    lat: number;
    lng: number;
  };
  defaultZoom?: number;
}

// Create custom icons for different disaster types
const createDisasterIcon = (type: string) => {
  const getColor = () => {
    switch (type.toLowerCase()) {
      case 'weather':
      case 'typhoon':
        return '#3b82f6'; // blue-500
      case 'volcanic activity':
        return '#ef4444'; // red-500
      case 'earthquake':
        return '#f97316'; // orange-500
      case 'flood':
        return '#3b82f6'; // blue-500
      default:
        return '#ef4444'; // red-500
    }
  };

  return L.divIcon({
    className: "disaster-marker",
    html: `
      <div class="w-6 h-6 bg-[${getColor()}] rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 border-white">
        !
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

export default function Map({ disasters, onDisasterSelect, defaultCenter, defaultZoom }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize the map
    map.current = L.map(mapContainer.current, {
      center: defaultCenter ? [defaultCenter.lat, defaultCenter.lng] : [12.8797, 121.7740], // Philippines center
      zoom: defaultZoom || 6,
      zoomControl: false,
    });

    // Add the OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map.current);

    // Add zoom control
    L.control
      .zoom({
        position: "topright",
      })
      .addTo(map.current);

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [defaultCenter, defaultZoom]);

  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    // Add markers for each disaster
    disasters.forEach((disaster) => {
      const marker = L.marker(
        [disaster.coordinates.lat, disaster.coordinates.lng],
        { icon: createDisasterIcon(disaster.type) }
      );

      marker.on("click", () => onDisasterSelect(disaster));

      // Add popup
      marker.bindPopup(`
        <div class="p-2">
          <h3 class="font-bold">${disaster.name}</h3>
          <p class="text-sm text-gray-600">${disaster.type}</p>
          ${disaster.alertLevel ? `<p class="text-sm text-red-500">Alert Level: ${disaster.alertLevel}</p>` : ''}
          <p class="text-xs text-gray-500 mt-1">Source: ${disaster.source}</p>
        </div>
      `);

      marker.addTo(map.current!);
      markers.current.push(marker);
    });
  }, [disasters, onDisasterSelect]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-full"
      style={{ position: "relative" }}
    />
  );
}
