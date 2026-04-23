"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { 
  AlertTriangle, 
  Info, 
  RefreshCw, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  CloudRain,
  Mountain,
  Waves
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Dynamically import the map component to avoid SSR issues
const Map = dynamic(() => import("@/components/map"), { ssr: false });

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

const ITEMS_PER_PAGE = 5;

// Icon mapping for different disaster types
const DisasterIcon = ({ type }: { type: string }) => {
  switch (type.toLowerCase()) {
    case 'weather':
    case 'typhoon':
      return <CloudRain className="h-5 w-5 text-blue-500" />;
    case 'volcanic activity':
      return <Mountain className="h-5 w-5 text-red-500" />;
    case 'earthquake':
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    case 'flood':
      return <Waves className="h-5 w-5 text-blue-500" />;
    default:
      return <AlertCircle className="h-5 w-5 text-red-500" />;
  }
};

// Status color mapping
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'bg-red-500';
    case 'monitoring':
      return 'bg-yellow-500';
    case 'ongoing':
      return 'bg-orange-500';
    case 'response':
      return 'bg-blue-500';
    default:
      return 'bg-gray-500';
  }
};

export default function DisastersPage() {
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDisaster, setSelectedDisaster] = useState<Disaster | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate pagination
  const totalPages = Math.ceil(disasters.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentDisasters = disasters.slice(startIndex, endIndex);

  const fetchDisasters = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/disasters");
      const data = await response.json();

      console.log("API Response:", data);

      if (data.success) {
        // Validate the data structure
        const validatedDisasters = data.data.map((disaster: any) => {
          console.log("Processing disaster:", disaster);

          // Ensure all required fields are present and properly formatted
          return {
            id: String(disaster.id || "unknown"),
            name: String(disaster.name || "Unknown Disaster"),
            type: String(disaster.type || "Unknown"),
            status: String(disaster.status || "Ongoing"),
            date: String(disaster.date || new Date().toISOString()),
            countries: Array.isArray(disaster.countries)
              ? disaster.countries.map((c: any) =>
                  String(c || "Unknown Country")
                )
              : ["Unknown Location"],
            description: String(
              disaster.description || "No description available"
            ),
            coordinates: {
              lat: Number(disaster.coordinates?.lat) || 0,
              lng: Number(disaster.coordinates?.lng) || 0,
            },
            source: String(disaster.source || "Unknown Source"),
            alertLevel: disaster.alertLevel,
          };
        });

        console.log("Validated disasters:", validatedDisasters);
        setDisasters(validatedDisasters);
        setLastUpdated(new Date().toLocaleTimeString());
        setError(null);
        setRetryCount(0);
      } else {
        throw new Error(data.error || "Failed to fetch disaster data");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error fetching disaster data";
      setError(errorMessage);
      console.error("Error fetching disasters:", err);

      // Auto-retry up to 3 times
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
          fetchDisasters();
        }, 5000); // Retry after 5 seconds
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchDisasters();

    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchDisasters, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (loading && disasters.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-6">
          <div className="relative w-24 h-24 mx-auto">
            <AlertTriangle className="w-24 h-24 text-red-500/20" />
            <AlertTriangle className="absolute inset-0 w-24 h-24 text-red-500 animate-pulse" />
          </div>
          <div className="space-y-3">
            <p className="text-xl font-medium text-foreground animate-pulse">
              Loading disaster data...
            </p>
            <p className="text-sm text-muted-foreground">
              Fetching updates from PAGASA and PHIVOLCS
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error && disasters.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center max-w-md space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 flex items-center justify-center">
              <AlertCircle className="h-12 w-12 text-red-500 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-red-500">Error Loading Data</h2>
            <p className="text-muted-foreground">{error}</p>
            {retryCount < 3 && (
              <p className="text-sm text-muted-foreground">
                Retrying in {5 - retryCount} seconds... (Attempt {retryCount + 1}/3)
              </p>
            )}
            <Button
              variant="destructive"
              onClick={fetchDisasters}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Philippines Disasters</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time disaster monitoring from PAGASA and PHIVOLCS
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdated}
            </p>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchDisasters}
            disabled={loading}
            className={loading ? "animate-spin" : ""}
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-1" />
          <div>
            <p className="text-red-500 font-medium">Error: {error}</p>
            <p className="text-sm text-muted-foreground">
              Showing last known data. The map will update when the connection
              is restored.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Map Section */}
        <div className="lg:col-span-2 relative">
          <div className="sticky top-20 z-10">
            <div className="h-[600px] sm:h-[700px] lg:h-[600px] rounded-lg overflow-hidden shadow-lg border">
              <Map 
                disasters={disasters} 
                onDisasterSelect={setSelectedDisaster}
                defaultCenter={{ lat: 12.8797, lng: 121.7740 }}
                defaultZoom={6}
              />
            </div>
          </div>
        </div>

        {/* Disaster List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Recent Disasters</h2>
          <div className="space-y-4 overflow-y-auto h-[600px] sm:h-[700px] lg:h-[800px] pr-2">
            {currentDisasters.map((disaster) => (
              <Card
                key={disaster.id}
                className={`cursor-pointer transition-all ${
                  selectedDisaster?.id === disaster.id
                    ? "border-red-500"
                    : "hover:border-red-300"
                }`}
                onClick={() => setSelectedDisaster(disaster)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <DisasterIcon type={disaster.type} />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold">{disaster.name}</h3>
                        <Badge variant="outline" className={getStatusColor(disaster.status)}>
                          {disaster.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {disaster.type} • {disaster.countries.join(", ")}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {new Date(disaster.date).toLocaleDateString()} • {disaster.source}
                        </p>
                        {disaster.alertLevel && (
                          <Badge variant="secondary">
                            Alert Level {disaster.alertLevel}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Selected Disaster Details */}
      {selectedDisaster && (
        <div className="fixed bottom-4 right-4 w-full max-w-md bg-background rounded-lg shadow-lg p-4 z-20 border">
          <div className="flex items-start gap-3">
            <DisasterIcon type={selectedDisaster.type} />
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{selectedDisaster.name}</h3>
                <Badge variant="outline" className={getStatusColor(selectedDisaster.status)}>
                  {selectedDisaster.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Source: {selectedDisaster.source}
                {selectedDisaster.alertLevel && ` • Alert Level ${selectedDisaster.alertLevel}`}
              </p>
              <p className="text-sm mt-2">{selectedDisaster.description}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Last updated: {new Date(selectedDisaster.date).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
