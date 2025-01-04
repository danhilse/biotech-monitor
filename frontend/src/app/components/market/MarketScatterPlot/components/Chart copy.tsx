import { useMemo, useCallback, useRef, useState } from 'react';
import { scaleLinear } from '@visx/scale';
import { Group } from '@visx/group';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { Grid } from '@visx/grid';
import { Circle } from '@visx/shape';
import { localPoint } from '@visx/event';
import { useTooltip } from '@visx/tooltip';
import { Stock, FilterType } from '../../types';
import { getNodeColor, getNodeSize } from '../utils/colorUtils';
import { StockTooltip } from './StockTooltip';

interface ChartProps {
  data: Stock[];
  activeFilter: FilterType | null;
  hoveredFilter: FilterType | null;
  filterStocksFn: (stock: Stock, filter: FilterType) => boolean;
  onStockSelect: (stock: Stock) => void;
  width: number;
  height: number;
}

export const Chart = ({ 
  data, 
  activeFilter,
  hoveredFilter,
  filterStocksFn,
  onStockSelect,
  width,
  height
}: ChartProps) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const margin = { top: 20, right: 20, bottom: 50, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const {
    showTooltip,
    hideTooltip,
    tooltipData,
    tooltipLeft,
    tooltipTop,
  } = useTooltip<Stock>();

  const { xScale, yScale } = useMemo(() => {
    if (!data.length) {
      return {
        xScale: scaleLinear({
          range: [0, innerWidth],
          domain: [-10, 10],
        }),
        yScale: scaleLinear({
          range: [innerHeight, 0],
          domain: [-50, 100],
        }),
      };
    }

    const xValues = data.map(d => d.priceChange);
    const yValues = data.map(d => d.volumeVsAvg);
    
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    
    const xPadding = (xMax - xMin) * 0.1;
    const yPadding = (yMax - yMin) * 0.1;

    return {
      xScale: scaleLinear({
        range: [0, innerWidth],
        domain: [xMin - xPadding, xMax + xPadding],
      }),
      yScale: scaleLinear({
        range: [innerHeight, 0],
        domain: [yMin - yPadding, yMax + yPadding],
      }),
    };
  }, [data, innerWidth, innerHeight]);

  const handleMouseMove = useCallback((event: React.MouseEvent, stock: Stock) => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const svgRect = svg.getBoundingClientRect();
    const point = localPoint(svg, event);
    
    if (!point) return;

    showTooltip({
      tooltipData: stock,
      tooltipLeft: point.x,
      tooltipTop: point.y - svgRect.top,
    });
  }, [showTooltip]);

  const handleClick = useCallback((stock: Stock) => {
    setSelectedSymbol(prev => prev === stock.symbol ? null : stock.symbol);
    onStockSelect(stock);
  }, [onStockSelect]);

  const getNodeOpacity = useCallback((stock: Stock) => {
    if (activeFilter) {
      return filterStocksFn(stock, activeFilter) ? 0.8 : 0;
    }
    if (hoveredFilter) {
      return filterStocksFn(stock, hoveredFilter) ? 0.8 : 0.6;
    }
    return 0.8;
  }, [activeFilter, hoveredFilter, filterStocksFn]);

  return (
    <div className="relative">
      <svg ref={svgRef} width={width} height={height}>
        <Group left={margin.left} top={margin.top}>
          <Grid
            xScale={xScale}
            yScale={yScale}
            width={innerWidth}
            height={innerHeight}
            strokeOpacity={0.1}
            strokeWidth={1}
          />
          <AxisLeft
            scale={yScale}
            label="Volume vs Avg %"
            labelOffset={40}
            stroke="#ccc"
            tickStroke="#ccc"
            numTicks={height > 300 ? 10 : 5}
          />
          <AxisBottom
            top={innerHeight}
            scale={xScale}
            label="Price Change %"
            labelOffset={40}
            stroke="#ccc"
            tickStroke="#ccc"
            numTicks={width > 600 ? 10 : 5}
          />
          {data.map((stock, i) => {
            const nodeColor = getNodeColor(stock.price, stock.fiftyTwoWeekLow, stock.fiftyTwoWeekHigh);
            const isSelected = selectedSymbol === stock.symbol;
            const opacity = getNodeOpacity(stock);
            
            // Only render if the node should be visible
            if (activeFilter && !filterStocksFn(stock, activeFilter)) {
              return null;
            }

            return (
              <g key={`${stock.symbol}-${i}`}
                 onMouseEnter={(e) => {
                   const hoverRing = e.currentTarget.querySelector('.hover-ring');
                   if (hoverRing) {
                     (hoverRing as SVGElement).style.opacity = '0.4';
                   }
                 }}
                 onMouseLeave={(e) => {
                   const hoverRing = e.currentTarget.querySelector('.hover-ring');
                   if (hoverRing) {
                     (hoverRing as SVGElement).style.opacity = '0';
                   }
                 }}
              >
                {/* Hover/Selected Border */}
                <Circle
                  className="hover-ring"
                  cx={xScale(stock.priceChange)}
                  cy={yScale(stock.volumeVsAvg)}
                  r={(getNodeSize(stock.marketCap, width) / 2) + (isSelected ? 2 : 2)}
                  fill="none"
                  stroke={nodeColor}
                  strokeWidth={isSelected ? 4 : 2}
                  opacity={0}
                  style={{ transition: 'opacity 200ms' }}
                />
                {/* Main Circle */}
                <Circle
                  cx={xScale(stock.priceChange)}
                  cy={yScale(stock.volumeVsAvg)}
                  r={getNodeSize(stock.marketCap, width) / 2}
                  fill={nodeColor}
                  opacity={opacity}
                  onMouseMove={(e) => handleMouseMove(e, stock)}
                  onMouseLeave={hideTooltip}
                  onClick={() => handleClick(stock)}
                  style={{ 
                    cursor: 'pointer',
                    transition: 'opacity 200ms'
                  }}
                />
                {/* Selected Border */}
                {isSelected && (
                  <Circle
                    cx={xScale(stock.priceChange)}
                    cy={yScale(stock.volumeVsAvg)}
                    r={(getNodeSize(stock.marketCap, width) / 2) + 4}
                    fill="white"
                    stroke={nodeColor}
                    strokeWidth={4}
                    opacity={opacity ? 0.7 : 0}
                  />
                )}
              </g>
            );
          })}
        </Group>
      </svg>

      {tooltipData && (
        <StockTooltip 
          stock={tooltipData}
          top={tooltipTop}
          left={tooltipLeft}
        />
      )}
    </div>
  );
};