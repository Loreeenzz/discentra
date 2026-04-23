"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Send, Mic, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { fetchWeatherApi } from 'openmeteo';
import dynamic from 'next/dynamic';

type Message = {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
};

type EvacuationCenter = {
  Name: string;
  Latitude: number;
  Longitude: number;
};

type EvacuationCenterData = {
  EvacuationCenters: EvacuationCenter[];
};

type WeatherData = {
  current: {
    time: Date;
    temperature2m: number;
  };
  daily: {
    time: Date[];
    temperature2mMean: Float32Array;
  };
};

type Typhoon = {
  Name: string;
  Category: string;
  Latitude: number;
  Longitude: number;
  WindSpeedKPH: number;
  ETA: string;
};

const EvacuationMap = dynamic(() => import('./evacuation-map'), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full rounded-lg bg-gray-100 animate-pulse" />
});

const TyphoonMap = dynamic(() => import('./typhoon-map'), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full rounded-lg bg-gray-100 animate-pulse" />
});

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
  prototype: SpeechRecognition;
}

declare global {
  var SpeechRecognition: SpeechRecognitionStatic | undefined;
  var webkitSpeechRecognition: SpeechRecognitionStatic | undefined;
}

function sanitizeHtml(html: string): string {
  const sanitizedHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["div", "h2", "h3", "p", "ul", "li", "a", "strong", "span"],
    ALLOWED_ATTR: ["class", "href", "target", "rel", "style"],
    ADD_ATTR: ['target'],
    ADD_TAGS: ['div'],
  });
  return sanitizedHtml;
}

function cleanJsonString(input: string): string {
  // Remove any tags or prefixes
  let cleaned = input.replace(/<\|.*?\|>/g, '').trim();
  // Normalize quotes
  cleaned = cleaned.replace(/['"]/g, '"');
  // Fix any double quotes within the JSON
  cleaned = cleaned.replace(/"([^"]*)":/g, '"$1":');
  return cleaned;
}

function formatEvacuationCenters(jsonData: string): string {
  try {
    const cleaned = cleanJsonString(jsonData);
    const data = JSON.parse(cleaned) as EvacuationCenterData;
    if (data.EvacuationCenters && Array.isArray(data.EvacuationCenters)) {
      return `
        <div class="flex flex-col gap-4">
          <h2 class="text-xl font-bold">🏢 Available Evacuation Centers in Cebu</h2>
          <div class="w-full h-[400px]">
            <div id="map-container"></div>
          </div>
          ${data.EvacuationCenters.map((center: EvacuationCenter, index: number) => `
            <div class="p-4 bg-card border rounded-lg shadow-sm">
              <h3 class="text-lg font-semibold">${index + 1}. ${center.Name}</h3>
              <div class="mt-3">
                <p class="mb-2">
                  <span class="mr-1">📍</span>
                  <strong>Location Details</strong>
                </p>
                <ul class="ml-5 space-y-1 list-disc">
                  <li>Coordinates: ${center.Latitude}, ${center.Longitude}</li>
                  <li>
                    <a 
                      href="https://www.google.com/maps?q=${center.Latitude},${center.Longitude}" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      class="text-blue-500 hover:underline"
                    >
                      View on Google Maps
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }
    return jsonData;
  } catch (e) {
    console.error('Error formatting evacuation centers:', e);
    return jsonData;
  }
}

async function fetchWeatherData(): Promise<WeatherData | null> {
  try {
    const params = {
      "latitude": 10.3333,
      "longitude": 123.75,
      "daily": "temperature_2m_mean",
      "current": "temperature_2m"
    };
    const url = "https://api.open-meteo.com/v1/forecast";
    const responses = await fetchWeatherApi(url, params);

    const response = responses[0];
    const utcOffsetSeconds = response.utcOffsetSeconds();
    const current = response.current();
    const daily = response.daily();

    if (!current || !daily) return null;

    return {
      current: {
        time: new Date((Number(current.time()) + utcOffsetSeconds) * 1000),
        temperature2m: current.variables(0)?.value() ?? 0,
      },
      daily: {
        time: [...Array((Number(daily.timeEnd()) - Number(daily.time())) / daily.interval())].map(
          (_, i) => new Date((Number(daily.time()) + i * daily.interval() + utcOffsetSeconds) * 1000)
        ),
        temperature2mMean: daily.variables(0)?.valuesArray() ?? new Float32Array(),
      },
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
}

export default function ChatInterface() {
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm your AI Disaster Assistant. How can I help you today?",
      sender: "ai",
      timestamp: new Date(),
    },
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const loadWeatherData = async () => {
      const data = await fetchWeatherData();
      setWeatherData(data);
    };
    loadWeatherData();
  }, []);

  useEffect(() => {
    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

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
              content: "You are an AI assistant that helps with disaster-related queries. When asked about typhoons, ALWAYS respond with a JSON array in this exact format: [{'Name': string, 'Category': string, 'Latitude': number, 'Longitude': number, 'WindSpeedKPH': number, 'ETA': string}]. Do not include any additional text or formatting. For evacuation centers, return: {'EvacuationCenters': [{'Name': string, 'Latitude': number, 'Longitude': number}]}. For earthquakes, provide clear safety instructions in plain text. For all other queries, respond conversationally.",
            },
            {
              role: "user",
              content: input,
            },
          ],
        }),
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "Server is busy, please try again later.";

      // Create the AI message with the raw content
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: content,
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    } catch (error) {
      console.error("Error:", error);
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setInput('');
      recognitionRef.current.start();
    }
    setIsRecording(!isRecording);
  };

  const renderMessage = (message: Message) => {
    if (message.sender === "ai") {
      try {
        // Try to parse the content as JSON
        const data = JSON.parse(cleanJsonString(message.content));
        
        // Check if it's evacuation center data
        if (data.EvacuationCenters && Array.isArray(data.EvacuationCenters)) {
          return (
            <div className="space-y-4 w-full">
              <h2 className="text-xl font-bold">🏢 Available Evacuation Center</h2>
              <EvacuationMap centers={data.EvacuationCenters} />
              <div className="space-y-4">
                {data.EvacuationCenters.map((center: EvacuationCenter, index: number) => (
                  <div key={index} className="p-4 bg-card border rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold">{index + 1}. {center.Name}</h3>
                    <div className="mt-3">
                      <p className="mb-2">
                        <span className="mr-1">📍</span>
                        <strong>Location Details</strong>
                      </p>
                      <ul className="ml-5 space-y-1 list-disc">
                        <li>Coordinates: {center.Latitude}, {center.Longitude}</li>
                        <li>
                          <a 
                            href={`https://www.google.com/maps?q=${center.Latitude},${center.Longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            View on Google Maps
                          </a>
                        </li>
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="font-semibold mb-2">
                  <span className="mr-1">ℹ️</span> Important Notes:
                </p>
                <ul className="ml-5 space-y-1 list-disc">
                  <li>Please bring essential items (food, water, medicines)</li>
                  <li>Follow evacuation officials' instructions</li>
                  <li>Keep emergency contact numbers handy</li>
                  <li>Stay updated with local announcements</li>
                </ul>
              </div>
            </div>
          );
        }

        // Check if it's typhoon data
        if (Array.isArray(data) && data.length > 0 && data[0].Name && data[0].Category) {
          return (
            <div className="space-y-4 w-full">
              <h2 className="text-xl font-bold">🌀 Active Typhoons</h2>
              <TyphoonMap typhoons={data} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.map((typhoon: Typhoon, index: number) => (
                  <div key={index} className="p-4 bg-card border rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold">{typhoon.Name}</h3>
                    <div className="mt-3 space-y-2">
                      <p><strong>Category:</strong> {typhoon.Category}</p>
                      <p><strong>Wind Speed:</strong> {typhoon.WindSpeedKPH} km/h</p>
                      <p><strong>ETA:</strong> {typhoon.ETA}</p>
                      <p><strong>Location:</strong> {typhoon.Latitude}, {typhoon.Longitude}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                <p className="font-semibold mb-2">
                  <span className="mr-1">⚠️</span> Safety Reminders:
                </p>
                <ul className="ml-5 space-y-1 list-disc">
                  <li>Stay updated with official weather bulletins</li>
                  <li>Prepare emergency supplies and important documents</li>
                  <li>Secure loose objects around your property</li>
                  <li>Know your nearest evacuation center</li>
                  <li>Follow evacuation orders if issued</li>
                </ul>
              </div>
            </div>
          );
        }
        
        // If it's not a special data type, render as regular message
        return <p className="text-sm whitespace-pre-wrap">{message.content}</p>;
      } catch (e) {
        // If it's not valid JSON, render as regular message
        return <p className="text-sm whitespace-pre-wrap">{message.content}</p>;
      }
    }
    // User messages
    return <p className="text-sm">{message.content}</p>;
  };

  return (
    <Card className="w-full max-w-[1000px] overflow-hidden border-2">
      <CardContent className="p-0">
        <div className="flex flex-col h-[600px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`
                    flex gap-3 max-w-[90%]
                  ${message.sender === "user" ? "flex-row-reverse" : "flex-row"}
                `}
                >
                  <Avatar
                    className={
                      message.sender === "ai"
                        ? "bg-blue-100 dark:bg-blue-900"
                        : "bg-gray-100 dark:bg-gray-800"
                    }
                  >
                    <AvatarFallback>
                      {message.sender === "ai" ? (
                        <Bot className="h-5 w-5 text-blue-500" />
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className={`
                    rounded-lg p-3
                      ${message.sender === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}
                    `}
                  >
                    {renderMessage(message)}
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-[90%]">
                  <Avatar className="bg-blue-100 dark:bg-blue-900">
                    <AvatarFallback>
                      <Bot className="h-5 w-5 text-blue-500" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="rounded-lg p-3 bg-muted">
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></span>
                      <span
                        className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></span>
                      <span
                        className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-3">
            <div className="relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about disaster preparedness or emergency response..."
                className="min-h-[80px] pr-24 resize-none"
              />
              <div className="absolute bottom-2 right-2 flex gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className={`${isRecording ? "text-red-500 animate-pulse" : ""}`}
                  onClick={toggleRecording}
                  aria-label="Record voice input"
                >
                  <Mic className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  aria-label="Send message"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Try asking: "What should I do during an earthquake?" or "How to prepare for a hurricane?"
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}