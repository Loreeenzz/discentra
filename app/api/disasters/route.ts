import { NextResponse } from "next/server";
import axios from "axios";

// Types for our disaster data
interface DisasterData {
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

async function fetchPAGASAWeatherData() {
  try {
    // Using PAGASA's public API (you'll need to register for an API key)
    const response = await axios.get(
      `https://api.pagasa.dost.gov.ph/api/weather/bulletin`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.PAGASA_API_KEY}`
        }
      }
    );
    
    return response.data.map((bulletin: any) => ({
      id: `weather-${bulletin.id}`,
      name: bulletin.title,
      type: "Weather",
      status: "Active",
      date: new Date().toISOString(),
      countries: ["Philippines"],
      description: bulletin.description,
      coordinates: {
        lat: bulletin.latitude || 14.5995, // Manila coordinates as fallback
        lng: bulletin.longitude || 120.9842
      },
      source: "PAGASA"
    }));
  } catch (error) {
    console.error("Error fetching PAGASA data:", error);
    return [];
  }
}

async function fetchPHIVOLCSData() {
  try {
    // Using PHIVOLCS's public API (you'll need to register for an API key)
    const response = await axios.get(
      `https://earthquake.phivolcs.dost.gov.ph/api/earthquake/latest`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.PHIVOLCS_API_KEY}`
        }
      }
    );

    return response.data.map((event: any) => ({
      id: `earthquake-${event.id}`,
      name: `M${event.magnitude} Earthquake - ${event.location}`,
      type: "Earthquake",
      status: "Monitoring",
      date: event.datetime,
      countries: ["Philippines"],
      description: `Magnitude ${event.magnitude} earthquake detected at depth ${event.depth}km. ${event.description}`,
      coordinates: {
        lat: event.latitude,
        lng: event.longitude
      },
      source: "PHIVOLCS"
    }));
  } catch (error) {
    console.error("Error fetching PHIVOLCS data:", error);
    return [];
  }
}

async function fetchVolcanoData() {
  try {
    // Using PHIVOLCS's volcano monitoring API
    const response = await axios.get(
      `https://volcano.phivolcs.dost.gov.ph/api/bulletin/latest`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.PHIVOLCS_API_KEY}`
        }
      }
    );

    return response.data.map((volcano: any) => ({
      id: `volcano-${volcano.id}`,
      name: `${volcano.name} Volcano Activity`,
      type: "Volcanic Activity",
      status: "Ongoing",
      date: volcano.datetime,
      countries: ["Philippines"],
      description: volcano.description,
      coordinates: {
        lat: volcano.latitude,
        lng: volcano.longitude
      },
      source: "PHIVOLCS",
      alertLevel: volcano.alertLevel
    }));
  } catch (error) {
    console.error("Error fetching volcano data:", error);
    return [];
  }
}

// Fallback data in case APIs are unavailable
const FALLBACK_DISASTERS = [
  {
    id: "taal-volcano-2024",
    name: "Taal Volcano Activity",
    type: "Volcanic Activity",
    status: "Ongoing",
    date: new Date().toISOString(),
    countries: ["Philippines"],
    description: "Alert Level 2 maintained over Taal Volcano with increased seismic activity and volcanic gas emissions.",
    coordinates: {
      lat: 14.0024,
      lng: 120.9977
    },
    source: "PHIVOLCS",
    alertLevel: "2"
  }
];

export async function GET() {
  try {
    // Fetch data from all sources concurrently
    const [weatherData, earthquakeData, volcanoData] = await Promise.all([
      fetchPAGASAWeatherData(),
      fetchPHIVOLCSData(),
      fetchVolcanoData()
    ]);

    // Combine all disaster data
    const allDisasters = [...weatherData, ...earthquakeData, ...volcanoData];

    // If no data is available, use fallback data
    const disasters = allDisasters.length > 0 ? allDisasters : FALLBACK_DISASTERS;

    // Sort by date (most recent first)
    disasters.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      data: disasters,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error in disasters API route:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch disaster data",
        data: FALLBACK_DISASTERS // Return fallback data on error
      },
      { status: 500 }
    );
  }
}
