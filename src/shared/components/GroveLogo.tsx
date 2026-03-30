export function GroveLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#2d9e6e"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22V8" />
      <path d="M5 12H2a10 10 0 0020 0h-3" />
      <path d="M8 5l4-3 4 3" />
      <circle cx="12" cy="8" r="2" />
    </svg>
  );
}
