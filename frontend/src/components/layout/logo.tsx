"use client";

interface LogoProps {
  collapsed?: boolean;
}

export function Logo({ collapsed = false }: LogoProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Square logo divided diagonally - top orange, bottom white */}
      <div className="relative w-10 h-10 border-2 border-[#ff5603] flex-shrink-0">
        <svg
          viewBox="0 0 40 40"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Top-left triangle - Orange */}
          <polygon points="0,0 40,0 0,40" fill="#ff5603" />
          {/* Bottom-right triangle - White */}
          <polygon points="40,0 40,40 0,40" fill="#ffffff" />
        </svg>
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-[#ff5603] text-sm tracking-wide">
            SALINAS SOLAR
          </span>
          <span className="font-bold text-[#ff5603] text-sm tracking-wide">
            SERVICES
          </span>
        </div>
      )}
    </div>
  );
}
