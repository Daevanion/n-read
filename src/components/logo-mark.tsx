import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={cn("size-8 shrink-0", className)}
    >
      <rect
        x="1.25"
        y="1.25"
        width="61.5"
        height="61.5"
        rx="15"
        fill="#1C1612"
        stroke="#F6EBDD"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      <path
        d="M18 21c7-9 16-11 28-6"
        stroke="#E25A44"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M14 28h18M14 40h13M14 52h18M14 28v24"
        stroke="#F6EBDD"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M36 28v24M50 28v24M36 30l14 20"
        stroke="#E25A44"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
