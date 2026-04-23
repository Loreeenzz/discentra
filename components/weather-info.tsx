
import { useState, useEffect } from "react";
import { Thermometer, MapPin, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fetchWeatherApi } from 'openmeteo';

interface Forecast {
  date: string;
  temp: string;
}

export default function WeatherInfo() {
  const [temperature, setTemperature] = useState<number | null>(null);
  const [location, setLocation] = useState<string>("Loading...");
  const [error, setError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<Forecast[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Declare `dailyForecasts` at the beginning of the useEffect hook
  let dailyForecasts: Forecast[] = [];

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            
            // Fetch location name using reverse geocoding
            const locationResponse = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const locationData = await locationResponse.json();
            setLocation(locationData.display_name.split(",")[0] + ", " + locationData.display_name.split(",")[1]);

            // Fetch current weather data
            const params = {
              "latitude": latitude,
              "longitude": longitude,
              "current": "temperature_2m",
              "daily": "temperature_2m_mean"
            };
            const url = "https://api.open-meteo.com/v1/forecast";
            const responses = await fetchWeatherApi(url, params);
            
            // Process first location. Add a for-loop for multiple locations or weather models
            const response = responses[0];
            
            // Attributes for timezone and location
            const utcOffsetSeconds = response.utcOffsetSeconds();
            const timezone = response.timezone();
            const timezoneAbbreviation = response.timezoneAbbreviation();
            
            const current = response.current()!;
            const daily = response.daily()!;
            
            // Note: The order of weather variables in the URL query and the indices below need to match!
            const weatherData = {
              current: {
                time: new Date((Number(current.time()) + utcOffsetSeconds) * 1000),
                temperature2m: current.variables(0)!.value(),
              },
              daily: {
                time: [...Array((Number(daily.timeEnd()) - Number(daily.time())) / daily.interval())].map(
                  (_, i) => new Date((Number(daily.time()) + i * daily.interval() + utcOffsetSeconds) * 1000)
                ),
                temperature2mMean: daily.variables(0)!.valuesArray(),
              },
            };

            setTemperature(Math.round(weatherData.current.temperature2m));

            // `weatherData` now contains a simple structure with arrays for datetime and weather data
            if (weatherData.daily.temperature2mMean) {
              const today = new Date();
              const dailyTimes = Array.from({ length: 7 }, (_, i) => {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                return date;
              });

              dailyTimes.forEach((date, i) => {
                console.log(`Date: ${date.toLocaleDateString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })}`);

                const temperatureMean = weatherData.daily.temperature2mMean && weatherData.daily.temperature2mMean[i] !== null && weatherData.daily.temperature2mMean[i] !== undefined ? weatherData.daily.temperature2mMean[i].toFixed(1) : 'N/A';

                dailyForecasts = weatherData.daily.time.map((date: Date, index: number) => {
                  const dateString = date.toLocaleDateString('en-US', { weekday: 'short' });
                  return {
                    date: dateString,
                    temp: temperatureMean,
                  };
                });

                //Create an array to store dailyforecasts and use the index to setForecast
                console.log(dailyForecasts);


                console.log(`Date: ${date}, Average Temperature: ${temperatureMean}°C`);
              });
            } else {
              console.warn('No temperature data available for daily forecast.');
            }

            setForecast(dailyForecasts);
          } catch (err) {
            setError("Failed to fetch weather data");
            console.error("Error fetching weather data:", err);
          }
        },
        (error) => {
          setError("Location access denied");
          console.error("Error getting location:", error);
        }
      );
    } else {
      setError("Geolocation is not supported");
    }
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Card className="w-full max-w-sm cursor-pointer hover:bg-accent/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-red-500" />
                <span className="font-medium">{location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Thermometer className="h-5 w-5 text-blue-500" />
                {temperature !== null ? (
                  <span className="font-medium">{temperature}°C</span>
                ) : (
                  <span className="text-muted-foreground">--</span>
                )}
              </div>
            </div>
            {error && (
              <p className="text-xs text-red-500 mt-2">{error}</p>
            )}
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2 pr-8">
            <Calendar className="h-5 w-5 text-blue-500" />
            Weekly Forecast for {location}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {forecast.map((day) => (
            <div key={day.date} className="flex items-center justify-between p-2 rounded-lg bg-accent/50">
              <div className="flex items-center gap-2">
                <span className="font-medium">{day.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{day.temp}°C</span>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
} 