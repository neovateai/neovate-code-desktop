import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors',
  {
    defaultVariants: {
      variant: 'default',
    },
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive:
          'bg-destructive/10 text-destructive border border-destructive/30 dark:bg-destructive/20 dark:text-destructive dark:border-destructive/40',
        outline: 'border border-input bg-background text-foreground',
        success:
          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        warning:
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        muted: 'bg-muted text-muted-foreground',
      },
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant }), className)}
      data-slot="badge"
      {...props}
    />
  );
}

export { Badge, badgeVariants };
