import { ReactNode, HTMLAttributes } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-lg border border-border bg-card text-card-foreground shadow-sm', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className, ...props }: CardProps) {
  return <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props}>{children}</div>
}

export function CardTitle({ children, className, ...props }: CardProps) {
  return <h3 className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props}>{children}</h3>
}

export function CardDescription({ children, className, ...props }: CardProps) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props}>{children}</p>
}

export function CardContent({ children, className, ...props }: CardProps) {
  return <div className={cn('p-6 pt-0', className)} {...props}>{children}</div>
}

export function CardFooter({ children, className, ...props }: CardProps) {
  return <div className={cn('flex items-center p-6 pt-0', className)} {...props}>{children}</div>
}
