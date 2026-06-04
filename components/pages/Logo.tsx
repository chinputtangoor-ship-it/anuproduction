import React from "react";

export const Logo = ({ className = "w-10 h-10" }: { className?: string }) => {
  return (
    <svg
      className={`${className} transition-all duration-300 hover:drop-shadow-[0_0_15px_rgba(167,139,250,0.55)]`}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="The Quantum Core"
    >
      <defs>
        <linearGradient id="anuGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7c5cff" />
          <stop offset="55%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#c4b5fd" />
        </linearGradient>
      </defs>
      {/* สามเหลี่ยมด้านเท่า (s≈76) — fillet r=8 เท่ากันทั้ง 3 มุม */}
      <path
        d="M 56.93 26.03 L 81.07 67.79 Q 88 79.82 74.14 79.82 L 25.86 79.82 Q 12 79.82 18.93 67.79 L 43.07 26.03 Q 50 14 56.93 26.03 Z"
        stroke="url(#anuGradient)"
        strokeWidth="6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="50" cy="57.5" r="9" fill="url(#anuGradient)" />
      <path
        d="M50 30 V47"
        stroke="url(#anuGradient)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
};
