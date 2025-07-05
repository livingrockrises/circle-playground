# Circle Modular Wallet Demo

A Vite + React + TypeScript application demonstrating Circle Modular Wallet integration.

## Features

- ⚡ **Vite** - Fast build tool and development server
- ⚛️ **React 19** - Latest React with modern features
- 📝 **TypeScript** - Type safety and better developer experience
- 🎨 **Modern CSS** - Clean and responsive design
- 🔧 **ESLint** - Code linting and formatting
- 🌍 **Environment Variables** - Secure configuration management

## Prerequisites

- Node.js (version 18 or higher)
- npm or yarn

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

### 4. Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
circle-modular-wallet/
├── src/
│   ├── App.tsx          # Main application component
│   ├── App.css          # Application styles
│   ├── main.tsx         # Application entry point
│   ├── index.css        # Global styles
│   └── vite-env.d.ts    # Vite environment types
├── public/              # Static assets
├── .env                 # Environment variables
├── package.json         # Dependencies and scripts
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── README.md           # This file
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
