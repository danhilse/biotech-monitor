// relative path: /market/MarketScatterPlot/utils/colorUtils.ts
export const getNodeColor = (current: number, low: number, high: number) => {
    // Calculate where the current price is in the range (0 to 1)
    const range = high - low;
    if (range === 0) return '#dc2626'; // red-600 for stocks with no range
    
    const position = (current - low) / range;
    
    // If in bottom half, interpolate between red and yellow
    if (position <= 0.5) {
      const redToYellow = [
        Math.round(220 - (position * 2 * (220 - 234))), // R: 220 to 234
        Math.round(38 + (position * 2 * (179 - 38))),   // G: 38 to 179
        Math.round(38 + (position * 2 * (8 - 38)))      // B: 38 to 8
      ];
      return `rgb(${redToYellow.join(',')})`;
    }
    
    // If in top half, interpolate between yellow and green
    const yellowToGreen = [
      Math.round(234 - ((position - 0.5) * 2 * (234 - 22))),  // R: 234 to 22
      Math.round(179 - ((position - 0.5) * 2 * (179 - 163))), // G: 179 to 163
      Math.round(8 + ((position - 0.5) * 2 * (33 - 8)))       // B: 8 to 33
    ];
    return `rgb(${yellowToGreen.join(',')})`;
  };
  
  export const getNodeSize = (marketCap: number, width: number) => {
    if (!marketCap) return 8 * (width / 1000);
    const minSize = 5 * (width / 1000);
    const maxSize = 25 * (width / 1000);
    const logMarketCap = Math.log10(marketCap);
    const size = (logMarketCap - 6) * 4 * (width / 1000);
    return Math.max(minSize, Math.min(maxSize, size));
  };