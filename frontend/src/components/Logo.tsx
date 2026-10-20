type LogoVariant = 'symbol' | 'primary' | 'dark' | 'monochrome' | 'wordmark';

const MARKS: Record<string, string> = {
  symbol: '/src/assets/logo-symbol.svg',
  primary: '/src/assets/logo-primary.svg',
  dark: '/src/assets/logo-primary-dark.svg',
  monochrome: '/src/assets/logo-monochrome.svg',
};

export function Logo({
  variant = 'symbol',
  className = 'h-8',
  showWordmark = false,
}: {
  variant?: LogoVariant;
  className?: string;
  showWordmark?: boolean;
}) {
  const src = MARKS[variant] ?? MARKS.symbol;
  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      role="img"
      aria-label="ZERA — Your New Era of Learning"
    >
      <div className="relative h-full w-[1.5em] shrink-0">
        <img src={src} alt="" aria-hidden="true" className="block h-full w-full" />
      </div>
      {showWordmark && (
        <span className="font-display text-lg font-bold tracking-tight text-fg">
          ZERA
        </span>
      )}
    </div>
  );
}