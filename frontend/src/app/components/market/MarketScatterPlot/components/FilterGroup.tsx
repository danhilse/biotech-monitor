import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown } from 'lucide-react';
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

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => onHover(filterType)}
      onMouseLeave={() => onHover(null)}
    >
      <Button
        ref={buttonRef}
        variant={activeFilter === filterType ? "secondary" : "ghost"}
        className="relative pr-8 min-w-[120px]"
        onClick={handleButtonClick}
      >
        <span className="flex-1 text-left">{children}</span>
        {threshold !== undefined && (
          <span className="ml-1 opacity-60 tabular-nums">≥{threshold}%</span>
        )}
      </Button>

      {threshold !== undefined && (
        <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <PopoverTrigger asChild>
            <Button
              ref={dropdownRef}
              variant="ghost"
              size="icon"
              className="h-full absolute right-0 px-2 hover:bg-transparent"
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
              />
              <div className="text-sm text-muted-foreground text-right">
                {threshold}%
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};