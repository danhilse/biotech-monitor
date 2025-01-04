# Biotech Stock Monitoring System

A real-time dashboard application for monitoring and analyzing biotech stocks, providing automated research capabilities with features for tracking market conditions, FDA trials, and company events.

![Demo](assets/demo.gif)

## Features

- Real-time price and volume tracking (20-minute intervals)
- Interactive data visualization with scatter plots
- Automated alert system for market events
- Detailed company insights and metrics
- Volume analysis and comparison
- Insider trading monitoring
- News aggregation
- FDA trial status tracking

## Project Structure

```
├── backend/
│   ├── api/               # FastAPI server implementation
│   ├── data/             # Database and data storage
│   └── scripts/          # Data fetching and processing scripts
└── frontend/
    ├── src/
    │   ├── app/          # Next.js application components
    │   ├── components/   # Reusable UI components
    │   └── lib/         # Core utilities and services
    └── public/          # Static assets and data files
```

## Technical Stack

### Frontend
- React with Next.js framework
- TypeScript for type safety
- Tailwind CSS for styling
- Visx for data visualization
- ShadCN UI Components

### Backend
- Python FastAPI server
- SQLite database
- Various data provider APIs integration

## Setup Instructions

### Prerequisites
- Node.js 16+
- Python 3.8+
- npm or yarn
- Git

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Start the development server:
```bash
npm run dev
```

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up the database:
```bash
python scripts/setup_db.py
```

5. Start the API server:
```bash
python api/server.py
```

## Core Components

### Market Dashboard
- Real-time data fetching and updates
- Interactive scatter plot visualization
- Filtering capabilities
- Stock selection handling

### Detail Views
- Comprehensive stock information
- Price metrics
- Volume analysis
- Company insights
- News feed
- Alert status

### Alert System
- Price-based alerts (5% movements)
- Volume alerts (10%/20% spikes)
- Earnings-related notifications
- FDA and regulatory updates

## Data Flow

1. Data Collection
   - Market data monitoring
   - News & event tracking
   - FDA trial status checks
   - Insider transaction monitoring

2. Processing Pipeline
   - Raw data ingestion
   - Metric calculation
   - Alert generation
   - Visualization processing

3. Storage Requirements
   - Essential data only
   - Rolling calculations
   - Alert state tracking
   - ~1.5KB daily per 10 stocks

## Development Guidelines

### Code Style
- Follow TypeScript best practices
- Use consistent naming conventions
- Document complex logic
- Write unit tests for critical functionality

### Performance Considerations
- Implement debouncing for real-time updates
- Use memoization for expensive calculations
- Optimize re-renders
- Consider data volume in visualizations

## Monitoring and Alerts

### Alert Types
1. Price-Based Alerts
   - 5% daily price movements
   - Approaching all-time highs
   - Daily trend summaries

2. Volume Alerts
   - 10% spike in volume
   - 20% volume increases
   - Comparison to rolling averages

3. Technical Alerts
   - RSI indicators
   - Moving averages
   - Support/resistance levels

## Risk Factors
- API reliability and rate limits
- Alert delivery reliability
- System uptime requirements
- Data accuracy verification
- Budget constraints

## Success Criteria
- Reliable alert delivery (< 5 min delay)
- Accurate market event detection
- Budget compliance
- System stability


## License

This project is licensed under the MIT License - see the LICENSE file for details.