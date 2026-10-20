import { useState } from 'react';
import symbolUrl from '../assets/logo-symbol.svg';
import primaryUrl from '../assets/logo-primary.svg';
import darkUrl from '../assets/logo-primary-dark.svg';
import monochromeUrl from '../assets/logo-monochrome.svg';

type LogoVariant = 'symbol' | 'primary' | 'dark' | 'monochrome' | 'wordmark';

// Imported through Vite so the SVGs are emitted as hashed assets under
// /assets/ in production. Hard-coded "/src/assets/..." URLs only exist in
// dev and 404/serve index.html on the deployed site.
const MARKS: Record<string, string> = {
  symbol: symbolUrl,
  primary: primaryUrl,
  dark: darkUrl,
  monochrome: monochromeUrl,
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
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      role="img"
      aria-label="ZERA — Your New Era of Learning"
    >
      {!failed ? (
        <div className="relative h-full w-[1.5em] shrink-0">
          <img
            src={src}
            alt=""
            aria-hidden="true"
            className="block h-full w-full"
            onError={() => setFailed(true)}
          />
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="grid h-[1.5em] w-[1.5em] shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-[0.9em] font-black text-white"
        >
          Z
        </div>
      )}
      {showWordmark && (
        <span className="font-display text-lg font-bold tracking-tight text-fg">
          ZERA
        </span>
      )}
    </div>
  );
}