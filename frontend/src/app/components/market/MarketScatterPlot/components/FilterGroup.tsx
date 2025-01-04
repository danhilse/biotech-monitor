// relative path: /market/MarketScatterPlot/components/FilterGroup.tsx
import { ReactNode } from 'react';
import { FilterType } from '../../types';

interface FilterGroupProps {
  children: ReactNode;
  label: string;
  filterType: FilterType;
  activeFilter: FilterType | null;
  onHover: (filter: FilterType | null) => void;
  onSelect: (filter: FilterType) => void;
}

export const FilterGroup = ({
  children,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  label,
  filterType,
  activeFilter,
  onHover,
  onSelect,
}: FilterGroupProps) => {
  const isActive = activeFilter === filterType;

  return (
    <div
      className={`px-4 py-2 rounded-md cursor-pointer ${
        isActive ? 'bg-blue-100' : 'hover:bg-gray-100'
      }`}
      onMouseEnter={() => onHover(filterType)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(filterType)}
    >
      {children}
    </div>
  );
};