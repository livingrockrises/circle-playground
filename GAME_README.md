# 🎮 Chirag's Life - Web3 Game

A fun, lighthearted Web3 game where players control Chirag's destiny and plan his daily adventures using USDC transactions.

## 🎯 Game Concept

**Chirag's Life** is based on the real-life adventures of Chirag, a free-spirited remote worker who lives day-to-day, travels spontaneously, and believes in increasing the depth of experience through action.

### Core Mechanics

- **Daily Planning**: Players plan Chirag's day using 8 time slots
- **USDC Transactions**: Each action costs USDC and earns points
- **Multiple Stats**: Track XP, Heart, Flow, and Depth points
- **Shadow Cards**: Random events that affect all players' plans
- **Gasless First**: First 2 transactions are gasless, then USDC gas required

## 🎲 How to Play

### 1. **Planning Phase**
- Each day, you get random motivations (actions) to choose from
- Plan Chirag's day by selecting actions that fit within:
  - **8 time slots** (6-9, 9-12, 12-15, 15-18, 18-21, 21-24, 24-3, 3-6)
  - **100 USDC daily budget**
  - **Must include sleep** (2 time slots)

### 2. **Action Types**

#### 💼 Work Actions
- **Take PM Call** (2 slots, $5 USDC) → +3 XP, +2 Flow
- **Push Code** (3 slots, $8 USDC) → +4 XP, +3 Flow, +1 Depth

#### ✈️ Travel Actions
- **Travel to Goa** (4 slots, $25 USDC) → +5 XP, +2 Heart, +3 Depth
- **Visa Appointment** (2 slots, $15 USDC) → +2 XP, +1 Flow

#### 💕 Social Actions
- **Plan Date** (1 slot, $10 USDC) → +2 XP, +3 Heart, +1 Depth
- **Bumble Match** (1 slot, $5 USDC) → +1 XP, +2 Heart

#### 🍽️ Food Actions
- **Eat at New Place** (2 slots, $12 USDC) → +4 XP, +1 Heart, +2 Depth

#### 😴 Sleep (Mandatory)
- **Sleep** (2 slots, $0 USDC) → +2 Flow

### 3. **Shadow Cards**
At the end of planning, a shadow card is revealed that affects all players:
- **Sudden Flight to Japan** - Travel plans must adjust
- **Baggage Lost** - Luggage actions more expensive
- **Family Emergency** - Family actions get bonuses
- **Soul Cleanse Triggered** - Health actions get bonuses
- **Techno Aftershock** - Work actions cost +1 time
- **Visa Denied** - Travel plans must adjust
- **Serendipitous Encounter** - Social actions get +1 Heart

### 4. **Scoring System**
- **💼 XP (Experience Points)**: Personal growth and skills
- **💕 Heart**: Human connection and relationships
- **⚡ Flow**: Productivity and work efficiency
- **🌟 Depth**: Life experience and cultural richness

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Circle API credentials
- Base Sepolia testnet USDC

### Installation

1. **Clone and install dependencies**
```bash
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Add your Circle API credentials
VITE_CLIENT_KEY=your_circle_client_key
VITE_CLIENT_URL=your_circle_client_url
VITE_CIRCLE_API_KEY=your_circle_api_key
```

3. **Deploy the game contract**
```bash
# Install Hardhat if not already installed
npm install --save-dev hardhat

# Deploy the contract
npx hardhat run deploy-game.js --network baseSepolia
```

4. **Update contract address**
Update `GAME_CONTRACT_ADDRESS` in `src/services/gameService.ts` with the deployed contract address.

5. **Start the development server**
```bash
npm run dev
```

## 🎮 Game Flow

### 1. **Authentication**
- Register/login with passkey
- Connect your Circle modular wallet

### 2. **Game Mode Toggle**
- Click the "🎮 Game" button to switch to game mode
- Toggle back to "💸 Payments" for regular USDC transfers

### 3. **Daily Planning**
- View your current stats (XP, Heart, Flow, Depth)
- See the shadow card for the day
- Select actions from available motivations
- Build your daily plan within constraints
- Submit plan to blockchain

### 4. **Execution**
- Review your submitted plan
- Execute the plan (spends USDC, earns points)
- See results and score breakdown

### 5. **New Day**
- Start a new day with fresh motivations
- Continue building your Chirag's life story

## 💰 Transaction Types

### Gasless Transactions (First 2)
- Free gas for first 2 game actions
- Uses Circle's gasless infrastructure
- Perfect for new players

### USDC Gas Transactions (After 2)
- Pay gas fees with USDC
- Uses Circle Paymaster
- More expensive but unlimited

## 🔧 Technical Architecture

### Smart Contract (`ChiragsLifeGame.sol`)
- **Player Registration**: Register with username
- **Daily Plans**: Submit and execute daily plans
- **USDC Integration**: Handle USDC payments for actions
- **Scoring**: Track XP, Heart, Flow, Depth points
- **Events**: Emit events for game state changes

### Frontend Components
- **Game.tsx**: Main game interface
- **GameActionCard.tsx**: Individual action cards
- **DailyPlanBuilder.tsx**: Plan building interface
- **PlayerStats.tsx**: Stats display
- **ShadowCardReveal.tsx**: Shadow card display

### Services
- **GameService**: Game logic and contract interactions
- **ComplianceService**: Address screening (inherited from payments)

## 🎨 UI/UX Features

### Modern Design
- Gradient backgrounds with glassmorphism effects
- Smooth animations and transitions
- Responsive design for mobile and desktop
- Intuitive card-based interface

### Game Elements
- **Action Cards**: Color-coded by category with emojis
- **Stats Display**: Visual representation of player progress
- **Shadow Cards**: Themed cards with different effects
- **Plan Builder**: Real-time validation and feedback

## 🔒 Security Features

### Compliance Screening
- All transactions screened against sanctions
- Automatic blocking of flagged addresses
- Real-time compliance checks

### Wallet Security
- Passkey authentication
- Circle modular wallet integration
- Secure USDC transactions

## 🚀 Future Enhancements

### Planned Features
- **Multiplayer Mode**: Play with friends
- **Leaderboards**: Compare scores across players
- **Achievement System**: Unlock achievements for milestones
- **Depth Actions**: Sub-actions that increase depth points
- **Seasonal Events**: Special events with unique rewards
- **NFT Integration**: Mint achievements as NFTs

### Technical Improvements
- **Optimistic Updates**: Instant UI feedback
- **Off-chain State**: Better performance for game state
- **Mobile App**: Native mobile experience
- **Cross-chain**: Support for multiple networks

## 🎯 Game Philosophy

**Chirag's Life** embodies the philosophy of living life to the fullest through:
- **Spontaneity**: Random motivations and shadow cards
- **Balance**: Managing time, money, and relationships
- **Depth**: Seeking meaningful experiences over shallow ones
- **Connection**: Building relationships and community
- **Growth**: Continuous learning and personal development

The game teaches players to make thoughtful decisions while embracing the unpredictable nature of life, just like Chirag does in real life.

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for:
- Bug reports
- Feature requests
- Code contributions
- Game balance suggestions

## 📄 License

MIT License - see LICENSE file for details.

---

**🎮 Ready to live Chirag's life? Start planning your day!** 