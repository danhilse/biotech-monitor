import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { scaleLinear } from '@visx/scale';
import { Group } from '@visx/group';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { Grid } from '@visx/grid';
import { localPoint } from '@visx/event';
import { useTooltip } from '@visx/tooltip';
import { voronoi, VoronoiPolygon } from '@visx/voronoi';
import { Stock, FilterType } from '../../types';
import { getNodeColor, getNodeSize } from '../utils/colorUtils';
import { StockTooltip } from './StockTooltip';

interface ChartProps {
  data: Stock[];
  activeFilter: FilterType | null;
  hoveredFilter: FilterType | null;
  filterStocksFn: (stock: Stock, filter: FilterType) => boolean;
  onStockSelect: (stock: Stock | null) => void;
  width: number;
  height: number;
  outlierMode: 'all' | 'remove' | 'only';
  xDomain?: [number, number]; // Optional manual x-axis domain
}

export const Chart = ({
  data,
  activeFilter,
  hoveredFilter,
  filterStocksFn,
  onStockSelect,
  width,
  height,
  xDomain: manualXDomain,
}: ChartProps) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; scale: number } | null>(null);
  const [xOffset, setXOffset] = useState(0);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const margin = { top: 20, right: 20, bottom: 50, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    showTooltip,
    hideTooltip,
  } = useTooltip<Stock>();

    // Add this at the start of the Chart component
  console.log('Chart received data:', data.length, 'items');
  console.log('First few items:', data.slice(0, 3));

  const { xScale, yScale, voronoiLayout, filteredData, neighborMap } = useMemo(() => {
    const processedData = data.map(stock => ({
      ...stock,
      volumeVsAvg: stock.volumeMetrics?.volumeVsAvg ?? 0,
      stableKey: `${stock.symbol}-${stock.priceChange}-${stock.volumeMetrics?.volumeVsAvg ?? 0}`
    }));

    const xValues = processedData.map(d => d.priceChange);
    const yValues = processedData.map(d => d.volumeMetrics?.volumeVsAvg ?? 0);
    
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    
    const xPadding = (xMax - xMin) * 0.1;
    const yPadding = (yMax - yMin) * 0.1;

    // Use manual domain if provided, otherwise calculate from data
    const dataDomain = [xMin - xPadding, xMax + xPadding] as [number, number];
    const effectiveXDomain = manualXDomain || dataDomain;

    // Apply panning offset to the domain
    const domainWidth = effectiveXDomain[1] - effectiveXDomain[0];
    const panningDomain = [
      effectiveXDomain[0] + (xOffset * domainWidth),
      effectiveXDomain[1] + (xOffset * domainWidth)
    ];

    const xScale = scaleLinear({
      range: [0, innerWidth],
      domain: panningDomain,
    });

    const yScale = scaleLinear({
      range: [innerHeight, 0],
      domain: [yMin - yPadding, yMax + yPadding],
    });

    // Add these logs in the useMemo where scales are calculated
    console.log('xValues:', xValues);
    console.log('Domain calculation:', {
      xMin,
      xMax,
      dataDomain,
      effectiveXDomain,
      panningDomain
    });
    console.log('Filtered data length:', filteredData.length);

    const visibleData = processedData.filter(stock => 
      !activeFilter || filterStocksFn(stock, activeFilter)
    );

    const voronoiLayout = voronoi<Stock>({
      x: (d: Stock) => xScale(d.priceChange),
      y: (d: Stock) => yScale(d.volumeMetrics?.volumeVsAvg ?? 0),
      width: innerWidth,
      height: innerHeight,
    })(visibleData);

    const neighborMap = new Map<string, Set<string>>();
    voronoiLayout.links().forEach(link => {
      if (!link.source || !link.target) return;
      
      const sourceSymbol = (link.source as Stock).symbol;
      const targetSymbol = (link.target as Stock).symbol;
      
      if (!neighborMap.has(sourceSymbol)) {
        neighborMap.set(sourceSymbol, new Set());
      }
      if (!neighborMap.has(targetSymbol)) {
        neighborMap.set(targetSymbol, new Set());
      }
      
      neighborMap.get(sourceSymbol)?.add(targetSymbol);
      neighborMap.get(targetSymbol)?.add(sourceSymbol);
    });

    return {
      xScale,
      yScale,
      voronoiLayout,
      filteredData: visibleData,
      neighborMap,
      dataDomain,
    };
  }, [data, innerWidth, innerHeight, activeFilter, filterStocksFn, manualXDomain, xOffset]);

  const handleVoronoiMouseMove = useCallback((event: React.MouseEvent, stock: Stock) => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const point = localPoint(svg, event);
    
    if (!point) return;

    setHoveredSymbol(stock.symbol);
    showTooltip({
      tooltipData: stock,
      tooltipLeft: point.x,
      tooltipTop: point.y,
    });
  }, [showTooltip]);

  const handleVoronoiMouseLeave = useCallback(() => {
    setHoveredSymbol(null);
    hideTooltip();
  }, [hideTooltip]);

  const handleClick = useCallback((event: React.MouseEvent, stock: Stock) => {
    // Prevent the click from propagating to parent elements
    event.stopPropagation();
    
    const isCurrentlySelected = selectedSymbol === stock.symbol;
    setSelectedSymbol(isCurrentlySelected ? null : stock.symbol);
    onStockSelect(isCurrentlySelected ? null : stock);
  }, [selectedSymbol, onStockSelect]);

    // Handle mouse events for panning
    const handleMouseDown = useCallback((event: React.MouseEvent) => {
      if (event.shiftKey) {
        setIsPanning(true);
        setPanStart({ x: event.clientX, scale: xOffset });
        event.preventDefault();
      }
    }, [xOffset]);
  
    const handleMouseMove = useCallback((event: React.MouseEvent | MouseEvent) => {
      if (isPanning && panStart) {
        const dx = (event.clientX - panStart.x) / innerWidth;
        setXOffset(panStart.scale - dx);
        event.preventDefault();
      }
    }, [isPanning, panStart, innerWidth]);
  
  
    const handleMouseUp = useCallback(() => {
      setIsPanning(false);
      setPanStart(null);
    }, []);
  
    // Add and remove global mouse event listeners
    useEffect(() => {
      if (isPanning) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
      }
    }, [isPanning, handleMouseMove, handleMouseUp]);

  const getNodeOpacity = useCallback((stock: Stock) => {
    if (activeFilter) {
      return filterStocksFn(stock, activeFilter) ? 0.8 : 0;
    }
    if (hoveredFilter) {
      return filterStocksFn(stock, hoveredFilter) ? 0.8 : 0.4;
    }
    return 0.8;
  }, [activeFilter, hoveredFilter, filterStocksFn]);

  const isNeighbor = useCallback((symbol: string) => {
    if (!hoveredSymbol) return false;
    return neighborMap.get(hoveredSymbol)?.has(symbol) || false;
  }, [hoveredSymbol, neighborMap]);

  return (
    <div className="relative">
      <svg 
        ref={svgRef} 
        width={width} 
        height={height}
        onMouseDown={handleMouseDown}
        style={{ cursor: isPanning ? 'grabbing' : 'default' }}
      >
        <defs>
          {filteredData.map((stock) => {
            const nodeColor = getNodeColor(stock.price, stock.fiftyTwoWeekLow, stock.fiftyTwoWeekHigh);
            return (
              <linearGradient
                key={`gradient-${stock.stableKey}`}
                id={`voronoi-gradient-${stock.symbol}`}
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1="0"
                x2={innerWidth}
                y2={innerHeight}
              >
                <stop offset="0%" stopColor={nodeColor} stopOpacity={0.20} />
                <stop offset="50%" stopColor={nodeColor} stopOpacity={0.16} />
                <stop offset="100%" stopColor={nodeColor} stopOpacity={0.12} />
              </linearGradient>
            );
          })}
        </defs>
        
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
            label="Volume vs Average %"
            labelOffset={40}
            stroke="#ccc"
            tickStroke="#ccc"
            numTicks={height > 300 ? 10 : 5}
          />
          <AxisBottom
            top={innerHeight}
            scale={xScale}
            label="Price Change %"
            labelOffset={20}
            stroke="#ccc"
            tickStroke="#ccc"
            numTicks={width > 600 ? 10 : 5}
            tickFormat={(value) => `${value}%`}
          />

          {/* Stock circles */}
          {filteredData.map((stock) => {
            const nodeColor = getNodeColor(stock.price, stock.fiftyTwoWeekLow, stock.fiftyTwoWeekHigh);
            const isSelected = selectedSymbol === stock.symbol;
            const isHovered = hoveredSymbol === stock.symbol;
            const opacity = getNodeOpacity(stock);

            return (
              <g key={stock.stableKey}>
                {isSelected && (
                  <circle
                    cx={xScale(stock.priceChange)}
                    cy={yScale(stock.volumeMetrics?.volumeVsAvg ?? 0)}
                    r={(getNodeSize(stock.marketCap, width) / 2) + 4}
                    fill="white"
                    stroke={nodeColor}
                    strokeWidth={4}
                    opacity={opacity ? 0.7 : 0}
                    style={{
                      transition: 'cx 500ms cubic-bezier(0.4, 0, 0.2, 1), cy 500ms cubic-bezier(0.4, 0, 0.2, 1), r 300ms ease-out, opacity 300ms ease-out'
                    }}
                  />
                )}
                <circle
                  cx={xScale(stock.priceChange)}
                  cy={yScale(stock.volumeMetrics?.volumeVsAvg ?? 0)}
                  r={getNodeSize(stock.marketCap, width) / 2}
                  fill={nodeColor}
                  opacity={opacity}
                  style={{
                    transition: 'cx 500ms cubic-bezier(0.4, 0, 0.2, 1), cy 500ms cubic-bezier(0.4, 0, 0.2, 1), r 300ms ease-out, opacity 300ms ease-out'
                  }}
                />
                <circle
                  className="hover-ring"
                  cx={xScale(stock.priceChange)}
                  cy={yScale(stock.volumeMetrics?.volumeVsAvg ?? 0)}
                  r={(getNodeSize(stock.marketCap, width) / 2) + (isSelected ? 2 : 2)}
                  fill="none"
                  stroke={nodeColor}
                  strokeWidth={isSelected ? 4 : 2}
                  opacity={isHovered ? 0.4 : 0}
                  style={{
                    transition: 'cx 500ms cubic-bezier(0.4, 0, 0.2, 1), cy 500ms cubic-bezier(0.4, 0, 0.2, 1), r 300ms ease-out, opacity 300ms ease-out'
                  }}
                />
              </g>
            );
          })}

          {/* Voronoi overlay */}
          {voronoiLayout && filteredData.map((stock, i) => {
            const polygon = voronoiLayout.polygons()[i];
            if (!polygon) return null;
            
            const nodeColor = getNodeColor(stock.price, stock.fiftyTwoWeekLow, stock.fiftyTwoWeekHigh);
            const isHovered = hoveredSymbol === stock.symbol;
            const isSelected = selectedSymbol === stock.symbol;
            const isNeighborCell = isNeighbor(stock.symbol);
            
            return (
              <VoronoiPolygon
                key={`voronoi-${stock.stableKey}`}
                polygon={polygon}
                fill={`url(#voronoi-gradient-${stock.symbol})`}
                fillOpacity={isSelected ? .75 : isHovered ? 0.44 : 0.0}
                stroke={isHovered || isNeighborCell ? nodeColor : "rgba(0, 0, 0, 0.1)"}
                strokeWidth={1}
                strokeOpacity={0.3}
                onMouseMove={(e) => handleVoronoiMouseMove(e, stock)}
                onMouseLeave={handleVoronoiMouseLeave}
                onClick={(e) => handleClick(e, stock)}
                style={{ 
                  cursor: 'pointer',
                  transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              />
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