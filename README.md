# Circle Modular Wallet Demo

A Vite + React + TypeScript application demonstrating Circle Modular Wallet integration with **Chirag's Life** - a Web3 browser-based game.

## Features

- ⚡ **Vite** - Fast build tool and development server
- ⚛️ **React 19** - Latest React with modern features
- 📝 **TypeScript** - Type safety and better developer experience
- 🎨 **Modern CSS** - Clean and responsive design
- 🔧 **ESLint** - Code linting and formatting
- 🌍 **Environment Variables** - Secure configuration management
- 🎮 **Chirag's Life Game** - Web3 browser-based game with USDC payments

## 🎮 Chirag's Life Game

**Chirag's Life** is a Web3 browser-based game where 1-4 players plan Chirag's day around motivations and spend USDC tokens from a daily budget. The game is inspired by the real life of a friend named Chirag.

### 🎯 Game Overview

- **Players**: 1-4 players
- **Duration**: 5 rounds (days)
- **Daily Budget**: 100 USDC per day
- **Time Slots**: 8 slots per day (sleep takes 2 slots)
- **Scoring**: XP, Heart, Flow, and Depth categories

### 🎲 How to Play

#### 1. **Setup & Registration**
- Connect your wallet using Circle's passkey authentication
- Switch to "Game Mode" using the toggle button
- Register as a player with a unique username
- Get your daily budget of 100 USDC

#### 2. **Daily Planning Phase**
- **Select Actions**: Choose from available actions like:
  - 💼 **Work**: Take PM Call (2 slots, 5 USDC), Push Code (3 slots, 8 USDC)
  - ✈️ **Travel**: Travel to Goa (4 slots, 25 USDC), Visa Appointment (2 slots, 15 USDC)
  - 💕 **Social**: Plan Date (1 slot, 10 USDC), Bumble Match (1 slot, 5 USDC)
  - 🍽️ **Food**: Eat at New Place (2 slots, 12 USDC)
  - 😴 **Sleep**: Sleep (2 slots, 0 USDC) - **MANDATORY**

- **Plan Constraints**:
  - Maximum 8 time slots per day
  - Must include sleep (2 slots)
  - Cannot exceed 100 USDC daily budget
  - Some actions require luggage (travel actions)

#### 3. **Shadow Card Phase**
- After planning, a shadow card is revealed
- Cards can alter plans with effects like:
  - "Sudden Flight to Japan" - Adjust travel plans
  - "Baggage Lost" - Luggage actions more expensive
  - "Family Emergency" - Family actions get bonuses
  - "Soul Cleanse Triggered" - Health bonuses, party penalties

#### 4. **Execution Phase**
- Execute your daily plan
- Pay USDC for your actions
- Earn points in four categories:
  - **XP**: Experience points from work and learning
  - **Heart**: Emotional and social fulfillment
  - **Flow**: Energy and productivity levels
  - **Depth**: Personal growth and meaningful experiences

#### 5. **Scoring & Progression**
- Track your stats across all categories
- Complete 5 days to finish the game
- Compare scores with other players
- Try different strategies for optimal scoring

### 🎯 Game Actions

| Action | Time | Cost | XP | Heart | Flow | Depth | Category |
|--------|------|------|----|-------|------|-------|----------|
| Take PM Call | 2 slots | 5 USDC | 3 | 0 | 2 | 0 | Work |
| Push Code | 3 slots | 8 USDC | 4 | 0 | 3 | 1 | Work |
| Travel to Goa | 4 slots | 25 USDC | 5 | 2 | 0 | 3 | Travel |
| Visa Appointment | 2 slots | 15 USDC | 2 | 0 | 1 | 0 | Travel |
| Plan Date | 1 slot | 10 USDC | 2 | 3 | 0 | 1 | Social |
| Bumble Match | 1 slot | 5 USDC | 1 | 2 | 0 | 0 | Social |
| Eat at New Place | 2 slots | 12 USDC | 4 | 1 | 0 | 2 | Food |
| Sleep | 2 slots | 0 USDC | 0 | 0 | 2 | 0 | Sleep |

### 🃏 Shadow Cards

Random events that can affect gameplay:
- **Positive**: Bonus points for certain actions
- **Negative**: Penalties or increased costs
- **Neutral**: Changes that require plan adjustments

### 💰 USDC Integration

- **Real USDC Payments**: All game actions cost actual USDC
- **Circle Modular Wallets**: Secure wallet integration with passkey auth
- **Gasless Transactions**: First 2 transactions are gasless
- **Daily Budget**: 100 USDC reset each day

### 🏆 Winning Strategy

- **Balance**: Don't focus on just one category
- **Efficiency**: Maximize points per time slot
- **Adaptation**: Adjust plans based on shadow cards
- **Risk Management**: Don't spend all USDC on expensive actions

## Prerequisites

- Node.js (version 18 or higher)
- npm or yarn
- Circle API credentials
- Base Sepolia testnet USDC (for game testing)

## Getting Started

### 1. Clone and Install

```bash
# Navigate to the project directory
cd circle-modular-wallet

# Install dependencies
npm install
```

### 2. Configure Environment Variables

Create or update the `.env` file in the root directory:

```env
VITE_CLIENT_KEY=YOUR-CLIENT-KEY
VITE_CLIENT_URL=YOUR-CLIENT-URL
```

Replace the placeholder values with your actual Circle API credentials:
- `YOUR-CLIENT-KEY`: Your Circle API client key
- `YOUR-CLIENT-URL`: Your Circle API endpoint URL

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 4. Play the Game

1. **Connect Wallet**: Use Circle's passkey authentication
2. **Switch to Game Mode**: Use the toggle button
3. **Register**: Create your player account
4. **Plan Your Day**: Select actions within constraints
5. **Execute Plan**: Pay USDC and earn points
6. **Repeat**: Play for 5 days to complete the game

### 5. Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
circle-modular-wallet/
├── src/
│   ├── App.tsx              # Main application component
│   ├── App.css              # Application styles
│   ├── main.tsx             # Application entry point
│   ├── index.css            # Global styles
│   ├── game.css             # Game-specific styles
│   ├── components/
│   │   ├── Game.tsx         # Main game component
│   │   ├── ActionCard.tsx   # Game action cards
│   │   ├── DailyPlanBuilder.tsx # Daily plan interface
│   │   ├── PlayerStats.tsx  # Player statistics display
│   │   └── ShadowCard.tsx   # Shadow card reveal
│   ├── services/
│   │   ├── gameService.ts   # Game logic and contract interaction
│   │   └── complianceService.ts # Circle compliance screening
│   ├── contracts/
│   │   └── ChiragsLifeGameABI.ts # Smart contract ABI
│   └── vite-env.d.ts        # Vite environment types
├── contracts/
│   └── GameContract.sol     # Smart contract source
├── public/                  # Static assets
├── .env                     # Environment variables
├── package.json             # Dependencies and scripts
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
└── README.md               # This file
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Circle Modular Wallet Integration

This project includes the Circle Modular Wallet SDK (`@circle-fin/modular-wallets-core`) for building wallet functionality.

### Key Features

- **Environment Variable Support**: Secure configuration management
- **TypeScript Support**: Full type safety for Circle API integration
- **Modern React**: Uses React 19 with latest features
- **Hot Module Replacement**: Fast development with instant updates
- **Game Integration**: Seamless USDC payments for game actions

### Next Steps

1. **Configure Circle API**: Update the `.env` file with your actual Circle API credentials
2. **Import SDK**: Use the Circle Modular Wallet SDK in your components
3. **Build Features**: Implement wallet creation, transaction signing, and other wallet functionality
4. **Add Authentication**: Integrate user authentication and wallet management
5. **Deploy**: Build and deploy your application

## Development

The application uses Vite for fast development and building. The development server includes:

- Hot Module Replacement (HMR)
- Fast refresh for React components
- TypeScript compilation
- ESLint integration

## Environment Variables

The application uses Vite's environment variable system. Variables prefixed with `VITE_` are exposed to the client-side code.

### Available Variables

- `VITE_CLIENT_KEY`: Circle API client key
- `VITE_CLIENT_URL`: Circle API endpoint URL

### Adding New Variables

To add new environment variables:

1. Add them to the `.env` file with the `VITE_` prefix
2. Access them in your code using `import.meta.env.VITE_VARIABLE_NAME`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the ISC License.
