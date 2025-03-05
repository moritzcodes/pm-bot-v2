"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SwitchProps extends React.HTMLAttributes<HTMLDivElement> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}

export const Switch = React.forwardRef<HTMLDivElement, SwitchProps>(
  ({ className, checked, defaultChecked = false, onCheckedChange, disabled, id, ...props }, ref) => {
    const [isChecked, setIsChecked] = React.useState(defaultChecked);
    
    // Use checked prop if provided (controlled component)
    const isControlled = checked !== undefined;
    const currentChecked = isControlled ? checked : isChecked;
    
    const handleClick = () => {
      if (disabled) return;
      
      if (!isControlled) {
        setIsChecked(!currentChecked);
      }
      
      onCheckedChange?.(!currentChecked);
    };
    
    return (
      <div
        role="switch"
        aria-checked={currentChecked}
        aria-disabled={disabled}
        id={id}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
          currentChecked ? 'bg-blue-600' : 'bg-gray-200',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        {...props}
        ref={ref}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform',
            currentChecked ? 'translate-x-5' : 'translate-x-0.5'
          )}
          aria-hidden="true"
        />
      </div>
    );
  }
);

Switch.displayName = "Switch";
