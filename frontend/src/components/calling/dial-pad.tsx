"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Phone, Delete } from "lucide-react";

interface DialPadProps {
  onCall?: (phoneNumber: string) => void;
}

export function DialPad({ onCall }: DialPadProps) {
  const [phoneNumber, setPhoneNumber] = useState("+63");

  const dialButtons = [
    { digit: "1", letters: "" },
    { digit: "2", letters: "ABC" },
    { digit: "3", letters: "DEF" },
    { digit: "4", letters: "GHI" },
    { digit: "5", letters: "JKL" },
    { digit: "6", letters: "MNO" },
    { digit: "7", letters: "PQRS" },
    { digit: "8", letters: "TUV" },
    { digit: "9", letters: "WXYZ" },
    { digit: "*", letters: "" },
    { digit: "0", letters: "+" },
    { digit: "#", letters: "" },
  ];

  const handleDigitPress = (digit: string) => {
    setPhoneNumber((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setPhoneNumber((prev) => (prev.length > 3 ? prev.slice(0, -1) : "+63"));
  };

  const handleCall = () => {
    if (phoneNumber && onCall) {
      onCall(phoneNumber);
    }
  };

  const formatPhoneNumber = (number: string) => {
    // Handle Philippine format: +63 XXX XXX XXXX
    if (number.startsWith("+63")) {
      const rest = number.slice(3);
      if (rest.length === 0) return "+63";
      if (rest.length <= 3) return `+63 ${rest}`;
      if (rest.length <= 6) return `+63 ${rest.slice(0, 3)} ${rest.slice(3)}`;
      return `+63 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6, 10)}`;
    }
    return number;
  };

  return (
    <div className="w-64">
      {/* Phone Number Display */}
      <div className="relative mb-4">
        <div className="h-12 flex items-center justify-center bg-muted/50 rounded-lg px-3">
          <span className="text-xl font-medium tracking-wide">
            {formatPhoneNumber(phoneNumber)}
          </span>
        </div>
        {phoneNumber.length > 3 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleBackspace}
          >
            <Delete className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Dial Pad Grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {dialButtons.map(({ digit, letters }) => (
          <Button
            key={digit}
            variant="outline"
            className="h-14 flex flex-col items-center justify-center gap-0.5 hover:bg-muted/80 transition-colors"
            onClick={() => handleDigitPress(digit)}
          >
            <span className="text-lg font-semibold">{digit}</span>
            {letters && (
              <span className="text-[10px] text-muted-foreground tracking-widest">
                {letters}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Call Button */}
      <Button
        className="w-full h-12 bg-[#ff5603] hover:bg-[#ff5603]/90 text-white"
        onClick={handleCall}
        disabled={phoneNumber.length <= 3}
      >
        <Phone className="h-5 w-5 mr-2" />
        Call
      </Button>
    </div>
  );
}
