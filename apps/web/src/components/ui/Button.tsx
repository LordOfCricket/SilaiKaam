import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary';

type ButtonAsLink = {
  href: string;
  variant?: Variant;
  showArrow?: boolean;
} & AnchorHTMLAttributes<HTMLAnchorElement>;

type ButtonAsButton = {
  href?: undefined;
  variant?: Variant;
  showArrow?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

type ButtonProps = ButtonAsLink | ButtonAsButton;

export function Button({ variant = 'primary', showArrow, className, ...props }: ButtonProps) {
  const classes = `${styles.button} ${styles[variant]} ${className ?? ''}`.trim();
  const arrow = showArrow ? (
    <span aria-hidden="true" className={styles.arrow}>
      →
    </span>
  ) : null;

  if ('href' in props && props.href) {
    const { href, ...anchorProps } = props;
    return (
      <Link href={href} className={classes} {...anchorProps}>
        {props.children}
        {arrow}
      </Link>
    );
  }

  const buttonProps = props as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button className={classes} {...buttonProps}>
      {buttonProps.children}
      {arrow}
    </button>
  );
}
