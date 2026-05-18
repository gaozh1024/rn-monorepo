import type { ButtonHTMLAttributes } from 'react';

export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'warning' | 'success';
}) {
  return <button className={`btn btn-${variant} ${className}`} {...props} />;
}
