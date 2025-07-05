# PayFriends - Splitwise-like Expense Tracking & Settlement App

A comprehensive expense tracking and debt settlement application built with React, TypeScript, and Circle's Modular Wallet SDK. PayFriends allows users to track shared expenses, manage debts, and settle payments using gasless transactions and USDC payments.

## 🚀 Features

### Core Functionality
- **User Authentication**: Secure passkey-based authentication using Circle's Modular Wallet SDK
- **Expense Tracking**: Add and manage shared expenses with multiple participants
- **Debt Management**: Automatic calculation and tracking of debts between users
- **Batch Payments**: Settle multiple debts in a single transaction
- **Gasless Transactions**: First 2 payments are free, then USDC gas payments required

### Expense Management
- **Flexible Splitting**: Equal split, percentage-based, or custom amounts
- **Categories**: Organize expenses by category (Food, Transportation, Entertainment, etc.)
- **Participant Management**: Add/remove participants and set individual shares
- **Real-time Updates**: Live debt calculations and balance tracking

### Payment System
- **Gasless Payments**: First 2 payments are completely free
- **USDC Gas Payments**: After 2 payments, gas fees paid in USDC using Circle Paymaster
- **Batch Transactions**: Settle multiple debts to different users in one transaction
- **Compliance Screening**: All transactions screened against sanctions blocklist

### User Interface
- **Three Main Views**:
  - 💸 **Payments**: Send direct payments to friends
  - 📊 **Expenses**: Track and manage shared expenses
  - 💰 **Debts**: View and settle outstanding debts
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Balance**: See your current debt/credit status

## 🏗️ Architecture

### Services
- **ExpenseService**: Handles expense creation, debt calculations, and settlement tracking
- **BatchPaymentService**: Manages batch payment creation and validation
- **ComplianceService**: Screens addresses against sanctions blocklist

### Components
- **ExpenseForm**: Add new expenses with participant management
- **ExpensesList**: Display and filter expenses with sorting options
- **DebtSettlement**: View debts and settle them in batches

### Data Storage
- **Local Storage**: All data stored locally in browser
- **Username Mapping**: Maps usernames to wallet addresses
- **Payment Counter**: Tracks gasless payment usage

## 🛠️ Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Circle API credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd circle-modular-wallet
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   VITE_CLIENT_KEY=your_circle_client_key
   VITE_CLIENT_URL=your_circle_client_url
   VITE_CIRCLE_API_KEY=your_circle_api_key
   VITE_COMPLIANCE_CHECK=true
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## 📱 Usage

### Getting Started
1. **Create Account**: Enter a username and create your account with passkey authentication
2. **Add Friends**: Share the app with friends so they can register
3. **Add Expenses**: Start tracking shared expenses with your friends

### Adding Expenses
1. Navigate to the **Expenses** tab
2. Click **"+ Add Expense"**
3. Fill in expense details:
   - Title and amount
   - Category selection
   - Description (optional)
   - Select participants
   - Choose split type (Equal, Percentage, Custom)
4. Review the split summary
5. Click **"Add Expense"**

### Managing Debts
1. Navigate to the **Debts** tab
2. View your current balance and outstanding debts
3. Select debts you want to settle
4. Click **"Settle Selected Debts"** to process batch payment

### Making Payments
1. Navigate to the **Payments** tab
2. Select a friend from the list
3. Enter amount and optional message
4. Send payment (gasless for first 2, then USDC gas)

## 🔧 Technical Details

### Payment Flow
1. **Gasless Phase**: First 2 payments use native gas (free)
2. **USDC Gas Phase**: Subsequent payments use USDC for gas via Circle Paymaster
3. **Compliance Check**: All recipient addresses screened before transaction
4. **Batch Processing**: Multiple payments combined into single user operation

### Debt Calculation
- **Net Balance**: Total owed to you minus total you owe
- **Automatic Tracking**: Debts calculated from expense participants
- **Settlement**: Mark expenses as settled when payments complete

### Security Features
- **Passkey Authentication**: Secure biometric/device-based authentication
- **Compliance Screening**: Real-time sanctions blocklist checking
- **Address Validation**: All addresses validated before processing
- **Transaction Signing**: Secure transaction signing with user's private key

## 🎨 UI/UX Features

### Responsive Design
- Mobile-first approach
- Adaptive layouts for different screen sizes
- Touch-friendly interface elements

### Visual Feedback
- Color-coded expense status (Paid, Owed, Settled)
- Balance indicators (positive/negative)
- Loading states and progress indicators
- Success/error notifications

### Accessibility
- Keyboard navigation support
- Screen reader compatibility
- High contrast color schemes
- Clear visual hierarchy

## 🔄 State Management

### Local Storage Keys
- `payfriends_username_mapping`: Maps usernames to wallet addresses
- `payfriends_payment_counter`: Tracks gasless payment usage
- `payfriends_expenses`: Stores all expense data
- `payfriends_settlements`: Stores settlement records
- `payfriends_batch_payments`: Stores batch payment data

### Data Flow
1. **User Registration**: Username mapped to wallet address
2. **Expense Creation**: Stored with participants and shares
3. **Debt Calculation**: Real-time calculation from expenses
4. **Payment Processing**: Updates payment counters and settlement status

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
```bash
npm install -g vercel
vercel --prod
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the Circle documentation
- Review the compliance service configuration

## 🔮 Future Enhancements

- **Multi-currency Support**: Support for different tokens
- **Group Management**: Create expense groups for different contexts
- **Recurring Expenses**: Set up recurring expense tracking
- **Export Features**: Export expense reports and debt summaries
- **Mobile App**: Native mobile application
- **Web3 Integration**: Direct blockchain integration for advanced users
