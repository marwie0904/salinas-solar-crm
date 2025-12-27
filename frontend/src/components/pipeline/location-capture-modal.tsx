"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Navigation, AlertCircle, Check } from "lucide-react";
import dynamic from "next/dynamic";

interface LocationData {
  lat: number;
  lng: number;
  address: string;
}

interface LocationCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (location: LocationData) => void;
  initialLocation?: { lat: number; lng: number } | null;
}

// Dynamically import the map component to avoid SSR issues
const LocationMap = dynamic(() => import("./location-map").then((mod) => mod.LocationMap), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

const LocationMapPreview = dynamic(() => import("./location-map").then((mod) => mod.LocationMapPreview), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

export function LocationCaptureModal({
  open,
  onOpenChange,
  onConfirm,
  initialLocation,
}: LocationCaptureModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    initialLocation || null
  );
  const [address, setAddress] = useState<string>("");
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Reverse geocode to get address from coordinates
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsLoadingAddress(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "en",
          },
        }
      );
      const data = await response.json();
      if (data.display_name) {
        setAddress(data.display_name);
      } else {
        setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch (err) {
      console.error("Reverse geocoding failed:", err);
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setIsLoadingAddress(false);
    }
  }, []);

  // Get current location
  const getCurrentLocation = useCallback(() => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        await reverseGeocode(latitude, longitude);
        setIsLoading(false);
      },
      (err) => {
        let errorMessage = "Failed to get location";
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location access in your browser settings.";
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case err.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
        setError(errorMessage);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [reverseGeocode]);

  // Get location when modal opens
  useEffect(() => {
    if (open) {
      setMapReady(false);
      // Small delay to ensure modal is rendered
      const timer = setTimeout(() => {
        setMapReady(true);
        if (initialLocation) {
          setLocation(initialLocation);
          reverseGeocode(initialLocation.lat, initialLocation.lng);
          setIsLoading(false);
        } else {
          getCurrentLocation();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, initialLocation, getCurrentLocation, reverseGeocode]);

  const handleConfirm = () => {
    if (location) {
      onConfirm({
        lat: location.lat,
        lng: location.lng,
        address: address,
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[#ff5603]" />
            Capture Location
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Map Container */}
          <div className="relative h-[350px] rounded-lg overflow-hidden border bg-gray-100">
            {isLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#ff5603] mb-2" />
                <p className="text-sm text-muted-foreground">Getting your location...</p>
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
                <p className="text-sm text-red-600 font-medium mb-4">{error}</p>
                <Button
                  onClick={getCurrentLocation}
                  variant="outline"
                  className="gap-2"
                >
                  <Navigation className="h-4 w-4" />
                  Try Again
                </Button>
              </div>
            ) : location && mapReady ? (
              <LocationMap lat={location.lat} lng={location.lng} />
            ) : null}
          </div>

          {/* Location Info */}
          {location && !error && (
            <div className="space-y-3">
              {/* Coordinates */}
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-[#ff5603] flex-shrink-0" />
                <span className="text-muted-foreground">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </span>
              </div>

              {/* Address */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Address</p>
                {isLoadingAddress ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading address...</span>
                  </div>
                ) : (
                  <p className="text-sm font-medium">{address}</p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={getCurrentLocation}
              disabled={isLoading}
              className="gap-2"
            >
              <Navigation className="h-4 w-4" />
              Refresh Location
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!location || isLoading || isLoadingAddress}
                className="bg-[#ff5603] hover:bg-[#e64d00] gap-2"
              >
                <Check className="h-4 w-4" />
                Confirm Location
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Component for displaying a saved location with a static map preview
interface LocationDisplayProps {
  lat: number;
  lng: number;
  address?: string;
  capturedAt?: number;
  onClear?: () => void;
  className?: string;
}

export function LocationDisplay({
  lat,
  lng,
  address,
  capturedAt,
  onClear,
  className,
}: LocationDisplayProps) {
  const openInMaps = () => {
    // Open in Google Maps (works on both mobile and desktop)
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      "_blank"
    );
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Map Preview */}
      <div className="relative h-[150px] rounded-lg overflow-hidden border bg-gray-100">
        <LocationMapPreview lat={lat} lng={lng} />
      </div>

      {/* Location Info */}
      <div className="space-y-1">
        {address && (
          <p className="text-sm text-muted-foreground line-clamp-2">{address}</p>
        )}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </p>
          {capturedAt && (
            <p className="text-xs text-muted-foreground">
              Captured {new Date(capturedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={openInMaps}
          className="flex-1 gap-2"
        >
          <Navigation className="h-4 w-4" />
          Get Directions
        </Button>
        {onClear && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            className="text-red-600 hover:text-red-700"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
