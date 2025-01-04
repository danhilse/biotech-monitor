# Biotech Stock Monitoring System

A real-time interactive dashboard for monitoring biotech stock performance, featuring advanced data visualization and detailed company analysis tools.

![Demo](assets/demo.gif)

## Features

- Interactive scatter plot visualization of price changes vs volume metrics
- Real-time price and volume tracking with 5-minute refresh intervals
- Detailed company insights with market metrics
- Volume analysis with historical comparisons
- Insider trading activity monitoring
- News aggregation with sentiment analysis
- Technical alerts and monitoring system

## Project Structure

```
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   └── components/
│   │   │       └── market/              # Core market components
│   │   │           ├── MarketDashboard.tsx
│   │   │           ├── MarketDetailView.tsx
│   │   │           ├── MarketScatterPlot/
│   │   │           └── VolumeChart.tsx
│   │   ├── components/
│   │   │   └── ui/                     # Reusable UI components
│   │   └── lib/
│   │       ├── services/               # Data services
│   │       └── hooks/                  # Custom React hooks
│   └── public/
│       └── data/                       # Static data files
```

## Technical Stack

### Frontend
- React 18+ with Next.js framework
- TypeScript for type safety
- Tailwind CSS with custom configuration
- Visx for data visualization
- ShadCN UI Components
- Lucide React icons

### Data Visualization
- Interactive scatter plot with Voronoi overlay for improved interaction
- Dynamic color coding based on stock performance
- Responsive design with automatic scaling
- Real-time data updates
- Custom tooltips with detailed metrics

## Core Components

### MarketDashboard
The main container component that orchestrates the application:
- Real-time data fetching and updates (5-minute intervals)
- View management and state handling
- Error handling and loading states
- Responsive layout management

### MarketDetailView
Comprehensive stock details panel featuring:
- Price and volume metrics
- Trading range analysis
- Market cap information
- News feed with publisher information
- Insider trading activity
- Volume analysis with historical comparison
- Technical alerts and monitoring

### Market Visualization
Advanced scatter plot visualization with:
- Interactive data points
- Voronoi-based interaction
- Dynamic color coding
- Custom tooltips
- Responsive scaling
- Grid system
- Axis management

## Data Types

```typescript
interface Stock {
  symbol: string
  price: number
  priceChange: number
  volume: number
  marketCap: number
  volumeMetrics: {
    volumeChange: number
    volumeVsAvg: number
  }
  alerts: number
  // ... additional metrics
}
```

## Alert System

The dashboard includes a comprehensive alert system monitoring:

### Price Alerts
- Significant price movements (>5%)
- Proximity to 52-week highs/lows
- Daily trend analysis

### Volume Alerts
- Volume spikes (>20% increase)
- Abnormal trading volume
- Comparison to 90-day average

## Setup Instructions

### Prerequisites
- Node.js 16+
- npm or yarn
- Git

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
```

2. Install dependencies:
```bash
cd frontend
npm install
```

3. Start the development server:
```bash
npm run dev
```

## Development Guidelines

### Component Structure
- Maintain separation of concerns
- Use TypeScript for type safety
- Follow the established component hierarchy
- Implement error boundaries

### Performance Optimization
- Use React.memo for expensive renders
- Implement debouncing for real-time updates
- Optimize SVG rendering
- Use proper memoization techniques

### Styling
The project uses a customized Tailwind configuration with:
- Custom color schemes
- Responsive design utilities
- Animation classes
- Chart-specific styling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.