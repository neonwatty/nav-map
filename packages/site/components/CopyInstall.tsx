'use client';

import { useState } from 'react';
import styles from '../app/page.module.css';

const INSTALL_CMD = 'npm i @neonwatty/nav-map';

export default function CopyInstall() {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable or page not focused
    }
  };

  return (
    <button type="button" className={styles.heroInstall} onClick={handleClick}>
      <span className={styles.prompt}>$</span>
      {INSTALL_CMD}
      <span className={copied ? styles.copyHintCopied : styles.copyHint}>
        {copied ? 'copied!' : 'click to copy'}
      </span>
    </button>
  );
}
