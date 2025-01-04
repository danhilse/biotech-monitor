import React from 'react';
import { cn } from '@/lib/utils';

export type TriStateSwitchValue = 'left' | 'center' | 'right';

interface TriStateSwitchProps {
  value: TriStateSwitchValue;
  onChange: (value: TriStateSwitchValue) => void;
  leftLabel?: string;
  centerLabel?: string;
  rightLabel?: string;
  className?: string;
}

const TriStateSwitch = ({
  value,
  onChange,
  leftLabel = '',
  centerLabel = '',
  rightLabel = '',
  className
}: TriStateSwitchProps) => {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <button
        onClick={() => onChange('left')}
        className={cn(
          "text-xs font-medium transition-colors",
          value === 'left' ? "text-primary" : "text-muted-foreground hover:text-primary"
        )}
      >
        {leftLabel}
      </button>

      <div className="relative h-6 w-12 rounded-full bg-secondary">
        <div
          className={cn(
            "absolute top-1 h-4 w-4 rounded-full bg-primary transition-all duration-200",
            value === 'left' && "left-1",
            value === 'center' && "left-4",
            value === 'right' && "left-7"
          )}
        />
        <button
          onClick={() => onChange('left')}
          className="absolute left-0 h-full w-1/3 cursor-pointer"
          aria-label={leftLabel}
        />
        <button
          onClick={() => onChange('center')}
          className="absolute left-1/3 h-full w-1/3 cursor-pointer"
          aria-label={centerLabel}
        />
        <button
          onClick={() => onChange('right')}
          className="absolute right-0 h-full w-1/3 cursor-pointer"
          aria-label={rightLabel}
        />
      </div>

      <button
        onClick={() => onChange('right')}
        className={cn(
          "text-xs font-medium transition-colors",
          value === 'right' ? "text-primary" : "text-muted-foreground hover:text-primary"
        )}
      >
        {rightLabel}
      </button>
    </div>
  );
};

export default TriStateSwitch;