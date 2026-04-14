export function BreathingDot({
  color = "#F59E0B",
  size = 6,
  className = "",
}: {
  color?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <span
        className="absolute inset-0 rounded-full animate-breathe"
        style={{ background: color, boxShadow: `0 0 8px ${color}80` }}
      />
    </span>
  );
}
