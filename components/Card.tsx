import React from 'react';
import Link from 'next/link';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e?: React.MouseEvent) => void;
  href?: string;
}

export default function Card({ children, className = '', onClick, href }: CardProps) {
  const baseClasses = 'block rounded-3xl overflow-hidden transition-all duration-200 hover:bg-gray-800 group';
  const interactiveClasses = onClick || href ? 'cursor-pointer' : '';
  
  const classes = `${baseClasses} ${interactiveClasses} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <div className={classes} onClick={onClick}>
      {children}
    </div>
  );
} 