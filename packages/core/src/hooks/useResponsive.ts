import { useState, useEffect } from 'react';

const NARROW_BREAKPOINT = 768;

export function useResponsive() {
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < NARROW_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return { isNarrow };
}
