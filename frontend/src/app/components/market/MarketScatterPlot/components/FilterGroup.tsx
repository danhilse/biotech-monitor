import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FilterType } from '../../types';

interface FilterGroupProps {
  label: string;
  filterType: FilterType;
  activeFilter: FilterType | null;
  onHover: (filter: FilterType | null) => void;
  onSelect: (filter: FilterType) => void;
  threshold?: number;
  onThresholdChange?: (value: number) => void;
  sliderConfig?: {
    min: number;
    max: number;
    step: number;
  };
  children: React.ReactNode;
}

export const FilterGroup = ({
  label,
  filterType,
  activeFilter,
  onHover,
  onSelect,
  threshold,
  onThresholdChange,
  sliderConfig = { min: 1, max: 50, step: 1 },
  children
}: FilterGroupProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLButtonElement>(null);

  const handleButtonClick = (event: React.MouseEvent) => {
    if (!dropdownRef.current?.contains(event.target as Node)) {
      onSelect(filterType);
    }
  };

  const handleDropdownClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleSliderChange = (value: number[]) => {
    if (onThresholdChange) {
      onThresholdChange(value[0]);
    }
  };

  const isActive = activeFilter === filterType;

  const getButtonClass = () => {
    const baseClasses = "relative pr-8 min-w-[120px] transition-all duration-200";
    
    if (isActive) {
      return cn(
        baseClasses,
        "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
        "dark:hover:bg-primary/90 dark:hover:text-primary-foreground"
      );
    }
    
    return cn(
      baseClasses,
      isHovered ? "bg-gray-100/70 dark:bg-gray-800/70" : "",
      "hover:bg-gray-100/70 dark:hover:bg-gray-800/70"
    );
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => {
        setIsHovered(true);
        onHover(filterType);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onHover(null);
      }}
    >
      <Button
        ref={buttonRef}
        variant={isActive ? "default" : "ghost"}
        className={getButtonClass()}
        onClick={handleButtonClick}
      >
        <span className={cn(
          "flex-1 text-left transition-all",
          isActive && "font-semibold"
        )}>
          {children}
        </span>
        {threshold !== undefined && (
          <span className={cn(
            "ml-1 tabular-nums transition-opacity",
            isActive ? "opacity-90" : "opacity-60"
          )}>
            ≥{threshold}%
          </span>
        )}
      </Button>

      {threshold !== undefined && (
        <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <PopoverTrigger asChild>
            <Button
              ref={dropdownRef}
              variant="ghost"
              size="icon"
              className={cn(
                "h-full absolute right-0 px-2 transition-opacity",
                isActive 
                  ? "text-primary-foreground hover:opacity-50" 
                  : "hover:opacity-50",
                !isActive && isHovered && "text-muted-foreground"
              )}
              onClick={handleDropdownClick}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4">
            <div className="space-y-4">
              <h4 className="font-medium">{label} Threshold</h4>
              <Slider
                defaultValue={[threshold]}
                max={sliderConfig.max}
                min={sliderConfig.min}
                step={sliderConfig.step}
                onValueChange={handleSliderChange}
                className="py-4"
              />
              <div className="text-sm text-muted-foreground text-right tabular-nums">
                {threshold}%
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};