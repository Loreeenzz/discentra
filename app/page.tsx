"use client";

import { useState, useRef, useEffect } from "react";
import { AlertTriangle, Mic, Check, Flame, HeartPulse, Droplets, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import WeatherInfo from "@/components/weather-info";

// Add type definitions for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
    SpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  error: string;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
  item(index: number): SpeechRecognitionResult;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult:
    | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any)
    | null;
  onerror:
    | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any)
    | null;
  onend: (() => void) | null;
}

let input = "";

async function sendSOSMessage() {
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || "",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: 'nvidia/llama-3.1-nemotron-ultra-253b-v1:free',
                messages: [
                    {
                        role: "system",
                        content: "You are a SOS messenger, You specify the details in 160 characters. Your tone must be in a paragraph form and act as the person seeking help. You must be intelligent when the user gives you a single clue. Do not specify your character limit indication.",
                    },
                    {
                      role: "user",
                      content: [
                          {
                              type: "text",
                              text: input,
                          },
                      ],
                  },
              ],
          }),
      })

      const data = await response.json()
        let markdownText = data.choices?.[0]?.message?.content

        // Convert markdown to plain text
        const plainText = markdownText.replace(/<[^>]*>/g, '').replace(/^["']|["']$/g, '') // Remove HTML tags and quotes

        const smsResponse = await fetch('https://api.httpsms.com/v1/messages/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.NEXT_PUBLIC_HTTPSMS_API_KEY || "" // Include this if your API requires authentication
            },
            body: JSON.stringify({
              "content": plainText,
              "encrypted": false,
              "from": process.env.NEXT_PUBLIC_SENDERNO || "",
              "request_id": "153554b5-ae44-44a0-8f4f-7bbac5657ad4",
              "send_at": "2022-06-05T14:26:09.527976+03:00", // Use current time
              "to": process.env.NEXT_PUBLIC_RECEIVERNO || ""
          })
      })

      const smsData = await smsResponse.json()
      console.log(smsData)
  } catch (error) {
      console.error('Error:', error)
  }
}

export default function EmergencySOSPage() {
  // SOS Button state
  const [isPressed, setIsPressed] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Emergency Form states
  const [isRecording, setIsRecording] = useState(false);
  const [description, setDescription] = useState("");
  const [emergencyType, setEmergencyType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [location, setLocation] = useState("");

  // Add state for speech recognition support
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);

  // Check if form is filled
  const isFormFilled = emergencyType && description.trim().length > 0;

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
          } catch (error) {
            console.error('Error fetching location:', error);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  // Load audio when component mounts
  useEffect(() => {
    const audio = new Audio("/audio/sos.mp3");
    audio.preload = "auto";

    audio.oncanplaythrough = () => {
      setAudioLoaded(true);
    };

    audio.onerror = (e) => {
      console.error("Error loading audio:", e);
      setAudioLoaded(false);
    };

    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    // Check if speech recognition is supported
    const isSupported =
      typeof window !== "undefined" &&
      ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

    setIsSpeechSupported(isSupported);

    if (isSupported) {
      const SpeechRecognition =
        window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0])
          .map((result) => result.transcript)
          .join("");
        setDescription(transcript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleSOSPress = () => {
    if (!isFormFilled) {
      return;
    }

    if (!audioLoaded) {
      console.warn("Audio not loaded yet");
      return;
    }

    setIsPressed(true);
    setIsSubmitting(true);

    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((error) => {
          console.error("Error playing audio:", error);
        });
      }
    } catch (error) {
      console.error("Error handling audio:", error);
    }

    setTimeout(() => {
      setIsPressed(false);
      setIsSubmitting(false);
      input = `Emergency Type: ${emergencyType}, Description: ${description}, Estimated Location: ${location}`;
      sendSOSMessage();
      setIsSubmitted(true);

      setTimeout(() => {
        setIsSubmitted(false);
        setDescription("");
        setEmergencyType("");
      }, 3000);
    }, 1500);
  };

  const toggleRecording = () => {
    if (!isSpeechSupported) {
      alert(
        "Speech recognition is not supported in your browser. Please use a modern browser like Chrome or Edge."
      );
      return;
    }

    if (!recognitionRef.current) {
      console.error("Speech recognition not initialized");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        setIsListening(false);
      }
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 flex flex-col items-center">
      <h1 className="text-3xl font-bold text-center mb-8">Emergency SOS</h1>
      <p className="text-muted-foreground text-center mb-8 max-w-xl">
        Press the SOS button below to report an emergency. Your location will be
        automatically shared with emergency services.
      </p>

      {/* Weather Info */}
      <div className="mb-8 w-full max-w-sm">
        <WeatherInfo />
      </div>

      {/* SOS Button */}
      <div className="relative mb-12">
        <div
          className={`
          absolute inset-0 rounded-full 
          bg-red-500/30 dark:bg-red-600/30
          ${isPressed ? "animate-ping" : ""}
          transition-all duration-300
        `}
        />
        <button
          onClick={handleSOSPress}
          disabled={!isFormFilled || isSubmitting || isSubmitted}
          className={`
            relative z-10
            flex items-center justify-center
            w-48 h-48 md:w-64 md:h-64
            rounded-full
            text-white font-bold text-2xl md:text-3xl
            transition-all duration-300
            shadow-lg
            ${
              isPressed
                ? "bg-red-700 dark:bg-red-800 scale-95 shadow-inner"
                : isFormFilled && !isSubmitting && !isSubmitted
                ? "bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 hover:scale-105"
                : "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
            }
            focus:outline-none focus:ring-4 focus:ring-red-500/50 dark:focus:ring-red-600/50
          `}
          aria-label="Emergency SOS Button"
        >
          <div className="flex flex-col items-center gap-2">
            {isSubmitting ? (
              <div className="h-12 w-12 md:h-16 md:w-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
            ) : isSubmitted ? (
              <Check className="h-12 w-12 md:h-16 md:w-16" />
            ) : (
              <AlertTriangle className="h-12 w-12 md:h-16 md:w-16" />
            )}
            <span>
              {isSubmitting
                ? "Submitting..."
                : isSubmitted
                ? "Submitted!"
                : "SOS"}
            </span>
          </div>
        </button>
      </div>

      {/* Emergency Form */}
      <div className="w-full max-w-md">
        <Card className="w-full">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="space-y-3">
                <label htmlFor="emergency-type" className="text-sm font-medium block mb-2">
                  Emergency Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Button
                    variant={emergencyType === "accident" ? "default" : "outline"}
                    onClick={() => setEmergencyType("accident")}
                    disabled={isSubmitting || isSubmitted}
                    className="flex items-center gap-2"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Accident
                  </Button>
                  <Button
                    variant={emergencyType === "fire" ? "default" : "outline"}
                    onClick={() => setEmergencyType("fire")}
                    disabled={isSubmitting || isSubmitted}
                    className="flex items-center gap-2"
                  >
                    <Flame className="h-4 w-4" />
                    Fire
                  </Button>
                  <Button
                    variant={emergencyType === "medical" ? "default" : "outline"}
                    onClick={() => setEmergencyType("medical")}
                    disabled={isSubmitting || isSubmitted}
                    className="flex items-center gap-2"
                  >
                    <HeartPulse className="h-4 w-4" />
                    Medical
                  </Button>
                  <Button
                    variant={emergencyType === "flood" ? "default" : "outline"}
                    onClick={() => setEmergencyType("flood")}
                    disabled={isSubmitting || isSubmitted}
                    className="flex items-center gap-2"
                  >
                    <Droplets className="h-4 w-4" />
                    Flood
                  </Button>
                  <Button
                    variant={emergencyType === "earthquake" ? "default" : "outline"}
                    onClick={() => setEmergencyType("earthquake")}
                    disabled={isSubmitting || isSubmitted}
                    className="flex items-center gap-2"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Earthquake
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium block mb-2">
                  Describe the Emergency
                </label>
                <div className="relative">
                  <Textarea
                    id="description"
                    placeholder="Please provide details about the emergency..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[120px] pr-12"
                    disabled={isSubmitting || isSubmitted}
                  />
                  {isSpeechSupported ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className={`absolute bottom-2 right-2 ${
                        isListening ? "text-red-500 animate-pulse" : ""
                      }`}
                      onClick={toggleRecording}
                      disabled={isSubmitting || isSubmitted}
                      aria-label="Record voice input"
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                  ) : (
                    <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                      Voice input not supported
                    </div>
                  )}
                </div>
                {isListening && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Listening... Speak now
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
