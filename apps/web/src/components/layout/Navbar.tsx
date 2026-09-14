'use client';

import { useEffect, useState } from 'react';
import { primaryNavLinks } from '@/features/homepage/data/navigation';
import { Button } from '@/components/ui/Button';
import { MobileMenu } from './MobileMenu';
import styles from './Navbar.module.css';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}>
        <a href="#top" className={styles.logo}>
          SilaiKaam
        </a>

        <nav className={styles.links} aria-label="Primary">
          {primaryNavLinks.map((link) => (
            <a key={link.href} href={link.href} className={styles.link}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          <Button href="#get-fit" variant="secondary" className={styles.cta}>
            Get My Fit
          </Button>
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
          >
            <span />
          </button>
        </div>
      </header>

      {menuOpen && <MobileMenu links={primaryNavLinks} onClose={() => setMenuOpen(false)} />}
    </>
  );
}
