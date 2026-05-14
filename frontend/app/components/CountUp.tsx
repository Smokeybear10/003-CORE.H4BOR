interface CountUpProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  format?: boolean;
  className?: string;
}

export default function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  format = true,
  className = "",
}: CountUpProps) {
  const v = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
  const [intPart, decPart] = v.split(".");
  const intStr = format ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : intPart;
  const text = decPart ? `${intStr}.${decPart}` : intStr;

  return (
    <span className={`tabular-nums ${className}`.trim()}>
      {prefix}
      {text}
      {suffix}
    </span>
  );
}
