"use client";

import Image from "next/image";

interface LogoProps {
  collapsed?: boolean;
}

export function Logo({ collapsed = false }: LogoProps) {
  if (collapsed) {
    return (
      <div className="w-10 h-10 relative overflow-hidden flex-shrink-0">
        <Image
          src="/improved-logo.jpg"
          alt="Salinas Solar Services"
          width={200}
          height={200}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[200px] h-auto"
          priority
        />
      </div>
    );
  }

  return (
    <Image
      src="/improved-logo.jpg"
      alt="Salinas Solar Services"
      width={400}
      height={100}
      className="h-14 w-auto"
      priority
    />
  );
}
