import React, { useState, useEffect } from 'react'
import './App.css'
import './game.css'
import {
  toPasskeyTransport,
  toWebAuthnCredential,
  toModularTransport,
  toCircleSmartAccount,
  WebAuthnMode,
} from '@circle-fin/modular-wallets-core'
import { createPublicClient, getContract, encodePacked, parseErc6492Signature, maxUint256, getAddress } from 'viem'
import { baseSepolia } from 'viem/chains'
import {
  createBundlerClient,
  toWebAuthnAccount,
} from 'viem/account-abstraction'
import { ComplianceService } from './services/complianceService'
import { Game } from './components/Game'

// Environment variables
const clientKey = import.meta.env.VITE_CLIENT_KEY as string
const clientUrl = import.meta.env.VITE_CLIENT_URL as string

// Debug logging
console.log('Environment variables:', {
  clientKey: clientKey ? 'SET' : 'NOT SET',
  clientUrl: clientUrl ? 'SET' : 'NOT SET'
})

interface User {
  username: string
  handle: string
  walletAddress: string
  avatar: string
}

interface WalletState {
  isConnected: boolean
  user: User | null
  smartAccount: any
  bundlerClient: any
  balance: string
  loading: boolean
  error: string | null
}

function App() {
  console.log('App component rendering...')
  
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    user: null,
    smartAccount: null,
    bundlerClient: null,
    balance: '0',
    loading: false,
    error: null,
  })

  // Check if environment variables are set
  useEffect(() => {
    console.log('Checking environment variables...')
    if (!clientKey || clientKey === 'Not set') {
      console.error('VITE_CLIENT_KEY not set')
      setWalletState(prev => ({
        ...prev,
        error: 'VITE_CLIENT_KEY environment variable is not set'
      }))
    }
    if (!clientUrl || clientUrl === 'Not set') {
      console.error('VITE_CLIENT_URL not set')
      setWalletState(prev => ({
        ...prev,
        error: 'VITE_CLIENT_URL environment variable is not set'
      }))
    }
    console.log('Environment check complete')
  }, [clientKey, clientUrl])

  // Register or login with passkey
  const handlePasskeyAuth = async (mode: 'register' | 'login') => {
    if (!walletState.user?.username) {
      setWalletState(prev => ({
        ...prev,
        error: 'Please enter a username'
      }))
      return
    }

    setWalletState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // 1. Create passkey transport
      const passkeyTransport = toPasskeyTransport(clientUrl, clientKey)
      
      // 2. Register or login with passkey
      const credential = await toWebAuthnCredential({
        transport: passkeyTransport,
        mode: mode === 'register' ? WebAuthnMode.Register : WebAuthnMode.Login,
        username: walletState.user.username,
      })

      // 3. Create modular transport for baseSepolia
      const modularTransport = toModularTransport(
        clientUrl + '/baseSepolia',
        clientKey,
      )

      // 4. Create client
      const client = createPublicClient({
        chain: baseSepolia,
        transport: modularTransport,
      })

      // 5. Create WebAuthn account
      const owner = toWebAuthnAccount({ credential })

      // 6. Create Circle smart account
      const smartAccount = await toCircleSmartAccount({
        client,
        owner,
      })

      // 7. Create bundler client
      const bundlerClient = createBundlerClient({
        chain: baseSepolia,
        transport: modularTransport,
      })

      // Create user object
      const user: User = {
        username: walletState.user.username,
        handle: `@${walletState.user.username}`,
        walletAddress: smartAccount.address,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${walletState.user.username}`,
      }

      setWalletState(prev => ({
        ...prev,
        user,
        smartAccount,
        bundlerClient,
        isConnected: true,
        loading: false,
        error: null,
      }))
    } catch (error) {
      console.error('Passkey authentication error:', error)
      setWalletState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      }))
    }
  }

  return (
    <div className="game-app">
      <header className="game-app-header">
        <h1>🎮 Chirag's Life</h1>
        <p>Plan Chirag's day and earn points with USDC!</p>
      </header>

      <main className="game-app-main">
        {/* Environment Variables Check */}
        {(!clientKey || clientKey === 'Not set' || !clientUrl || clientUrl === 'Not set') && (
          <div className="error-section">
            <h2>Configuration Required</h2>
            <p>Please set the following environment variables in your <code>.env</code> file:</p>
            <ul>
              <li><code>VITE_CLIENT_KEY</code>: Your Circle API client key</li>
              <li><code>VITE_CLIENT_URL</code>: Your Circle API endpoint URL</li>
            </ul>
          </div>
        )}

        {/* Authentication Section */}
        {!walletState.isConnected && (
          <section className="auth-section">
            <h2>🔐 Welcome to Chirag's Life</h2>
            <p>Create your account to start playing</p>
            <div className="auth-form">
              <div className="form-group">
                <label htmlFor="username">Choose your username:</label>
                <input
                  type="text"
                  id="username"
                  value={walletState.user?.username || ''}
                  onChange={(e) => setWalletState(prev => ({ 
                    ...prev, 
                    user: { 
                      username: e.target.value, 
                      handle: `@${e.target.value}`, 
                      walletAddress: '', 
                      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${e.target.value}` 
                    } 
                  }))}
                  placeholder="Enter your username"
                  disabled={walletState.loading}
                />
              </div>
              
              <div className="auth-buttons">
                <button
                  onClick={() => handlePasskeyAuth('register')}
                  disabled={walletState.loading || !walletState.user?.username}
                  className="auth-btn register"
                >
                  {walletState.loading ? 'Creating...' : 'Create Account'}
                </button>
                
                <button
                  onClick={() => handlePasskeyAuth('login')}
                  disabled={walletState.loading || !walletState.user?.username}
                  className="auth-btn login"
                >
                  {walletState.loading ? 'Connecting...' : 'Sign In'}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Game Section */}
        {walletState.isConnected && walletState.user && (
          <Game 
            walletState={walletState}
            onBackToPayments={() => setWalletState(prev => ({
              ...prev,
              isConnected: false,
              user: null,
              smartAccount: null,
              bundlerClient: null,
              loading: false,
              error: null
            }))}
          />
        )}

        {/* Error Display */}
        {walletState.error && (
          <div className="error-message">
            <h3>Error</h3>
            <p>{walletState.error}</p>
          </div>
        )}

        {/* Loading Indicator */}
        {walletState.loading && (
          <div className="loading">
            <p>Processing...</p>
          </div>
        )}
      </main>

      <footer className="game-app-footer">
        <p>Powered by Circle Modular Wallet SDK</p>
      </footer>
    </div>
  )
}

export default App
