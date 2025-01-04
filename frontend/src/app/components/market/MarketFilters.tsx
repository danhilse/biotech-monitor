import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { Stock, FilterType } from './types';
import { filterGroups } from './utils';

interface Props {
  data: Stock[];
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

interface FilterCardProps {
  title: string;
  count: number;
  type: FilterType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  color: string;
  isActive: boolean;
  onClick: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const FilterCard = ({ title, count, type, icon: Icon, color, isActive, onClick }: FilterCardProps) => (
  <div 
    className={`p-4 bg-gray-50 rounded-lg transition-all duration-200 cursor-pointer
      ${isActive ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-md'}`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-gray-600">{title}</span>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
    <p className={`text-2xl font-bold ${color}`}>{count}</p>
  </div>
);

export const MarketFilters = ({ data, activeFilter, onFilterChange }: Props) => {
  return (
    <Card className="bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-800">Market Summary</CardTitle>
          {activeFilter && (
            <button
              onClick={() => onFilterChange(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear Filter
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <FilterCard
            title="Gainers"
            count={data.filter(filterGroups.gainers).length}
            type="gainers"
            icon={TrendingUp}
            color="text-green-500"
            isActive={activeFilter === 'gainers'}
            onClick={() => onFilterChange(activeFilter === 'gainers' ? null : 'gainers')}
          />
          <FilterCard
            title="Decliners"
            count={data.filter(filterGroups.decliners).length}
            type="decliners"
            icon={TrendingDown}
            color="text-red-500"
            isActive={activeFilter === 'decliners'}
            onClick={() => onFilterChange(activeFilter === 'decliners' ? null : 'decliners')}
          />
          <FilterCard
            title="High Volume"
            count={data.filter(filterGroups.highVolume).length}
            type="highVolume"
            icon={AlertTriangle}
            color="text-yellow-500"
            isActive={activeFilter === 'highVolume'}
            onClick={() => onFilterChange(activeFilter === 'highVolume' ? null : 'highVolume')}
          />
        </div>
      </CardContent>
    </Card>
  );
};