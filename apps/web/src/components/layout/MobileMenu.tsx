'use client';

import { useEffect, useRef } from 'react';
import type { NavLink } from '@/features/homepage/types';
import { Button } from '@/components/ui/Button';
import styles from './MobileMenu.module.css';

interface MobileMenuProps {
  links: NavLink[];
  onClose: () => void;
}

export function MobileMenu({ links, onClose }: MobileMenuProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Site navigation">
      <div className={styles.header}>
        <span className={styles.logo}>SilaiKaam</span>
        <button
          ref={closeButtonRef}
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>

      <nav className={styles.links} aria-label="Primary">
        {links.map((link) => (
          <a key={link.href} href={link.href} className={styles.link} onClick={onClose}>
            {link.label}
          </a>
        ))}
      </nav>

      <Button href="#get-fit" variant="primary" className={styles.cta} onClick={onClose}>
        Get My Fit
      </Button>
    </div>
  );
}
