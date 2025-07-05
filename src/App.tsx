import React, { useState, useEffect } from 'react'
import './App.css'
import {
  toPasskeyTransport,
  toWebAuthnCredential,
  toModularTransport,
  toCircleSmartAccount,
  encodeTransfer,
  WebAuthnMode,
} from '@circle-fin/modular-wallets-core'
import { createPublicClient, getContract, encodePacked, parseErc6492Signature, maxUint256, getAddress } from 'viem'
import { baseSepolia } from 'viem/chains'
import {
  createBundlerClient,
  toWebAuthnAccount,
} from 'viem/account-abstraction'

// Environment variables
const clientKey = import.meta.env.VITE_CLIENT_KEY as string
const clientUrl = import.meta.env.VITE_CLIENT_URL as string

// Constants
const USDC_CONTRACT_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}` // Base Sepolia testnet
const USDC_DECIMALS = 6
const PAYMASTER_V07_ADDRESS = '0x31BE08D380A21fc740883c0BC434FcFc88740b58' as `0x${string}` // Circle Paymaster v0.7

// Username mapping storage
const USERNAME_MAPPING_KEY = 'payfriends_username_mapping'

// Helper functions for username mapping
const getUsernameMapping = (): Record<string, string> => {
  try {
    const stored = localStorage.getItem(USERNAME_MAPPING_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

const setUsernameMapping = (username: string, address: string) => {
  try {
    const mapping = getUsernameMapping()
    mapping[username.toLowerCase()] = address
    localStorage.setItem(USERNAME_MAPPING_KEY, JSON.stringify(mapping))
  } catch (error) {
    console.error('Failed to save username mapping:', error)
  }
}

const getAddressFromUsername = (username: string): string | null => {
  const mapping = getUsernameMapping()
  return mapping[username.toLowerCase()] || null
}

const isValidAddress = (address: string): boolean => {
  try {
    return address.startsWith('0x') && address.length === 42 && /^[0-9a-fA-F]+$/.test(address.slice(2))
  } catch {
    return false
  }
}

// EIP-2612 Permit ABI
const eip2612Abi = [
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" }
    ],
    name: "permit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "nonces",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "version",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  }
]

interface Payment {
  id: string
  type: 'sent' | 'received'
  amount: string
  recipient: string
  sender: string
  message: string
  timestamp: Date
  status: 'pending' | 'completed' | 'failed'
}

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

// Permit signing function
async function eip2612Permit({
  token,
  chain,
  ownerAddress,
  spenderAddress,
  value,
}: {
  token: any
  chain: any
  ownerAddress: string
  spenderAddress: string
  value: bigint
}) {
  return {
    types: {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "Permit",
    domain: {
      name: await token.read.name(),
      version: await token.read.version(),
      chainId: chain.id,
      verifyingContract: token.address,
    },
    message: {
      owner: ownerAddress,
      spender: spenderAddress,
      value,
      nonce: await token.read.nonces([ownerAddress]),
      deadline: maxUint256,
    },
  }
}

async function signPermit({
  tokenAddress,
  client,
  account,
  spenderAddress,
  permitAmount,
}: {
  tokenAddress: string
  client: any
  account: any
  spenderAddress: string
  permitAmount: bigint
}) {
  const token = getContract({
    client,
    address: tokenAddress as `0x${string}`,
    abi: eip2612Abi,
  })
  
  const permitData = await eip2612Permit({
    token,
    chain: client.chain,
    ownerAddress: account.address,
    spenderAddress,
    value: permitAmount,
  })

  const wrappedPermitSignature = await account.signTypedData(permitData)

  const isValid = await client.verifyTypedData({
    ...permitData,
    address: account.address,
    signature: wrappedPermitSignature,
  })

  if (!isValid) {
    throw new Error(
      `Invalid permit signature for ${account.address}: ${wrappedPermitSignature}`,
    )
  }

  const { signature } = parseErc6492Signature(wrappedPermitSignature)
  return signature
}

function App() {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    user: null,
    smartAccount: null,
    bundlerClient: null,
    balance: '0',
    loading: false,
    error: null,
  })

  const [payments, setPayments] = useState<Payment[]>([])
  const [showSendForm, setShowSendForm] = useState(false)
  const [recipientHandle, setRecipientHandle] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [usePaymaster, setUsePaymaster] = useState(true)
  const [showDebug, setShowDebug] = useState(false)

  // Check if environment variables are set
  useEffect(() => {
    if (!clientKey || clientKey === 'Not set') {
      setWalletState(prev => ({
        ...prev,
        error: 'VITE_CLIENT_KEY environment variable is not set'
      }))
    }
    if (!clientUrl || clientUrl === 'Not set') {
      setWalletState(prev => ({
        ...prev,
        error: 'VITE_CLIENT_URL environment variable is not set'
      }))
    }
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

      // Save username mapping
      setUsernameMapping(walletState.user.username, smartAccount.address)
    } catch (error) {
      console.error('Passkey authentication error:', error)
      setWalletState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      }))
    }
  }

  // Send payment
  const handleSendPayment = async () => {
    if (!walletState.bundlerClient || !recipientHandle || !amount) {
      setWalletState(prev => ({
        ...prev,
        error: 'Please connect wallet and provide recipient handle and amount'
      }))
      return
    }

    setWalletState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Convert amount to wei (USDC has 6 decimals)
      const amountInWei = BigInt(parseFloat(amount) * Math.pow(10, USDC_DECIMALS))

      // Parse recipient - could be a username or direct address
      let recipientAddress: `0x${string}`
      
      if (recipientHandle.startsWith('0x')) {
        // Direct address input
        try {
          // Validate and normalize the address
          recipientAddress = getAddress(recipientHandle) as `0x${string}`
        } catch (error) {
          throw new Error('Invalid address format. Please enter a valid Ethereum address.')
        }
      } else {
        // Username/handle input - look up in local records
        const cleanUsername = recipientHandle.replace('@', '') // Remove @ if present
        const mappedAddress = getAddressFromUsername(cleanUsername)
        
        if (!mappedAddress) {
          throw new Error(`User "${cleanUsername}" not found. Make sure they have registered with PayFriends.`)
        }
        
        recipientAddress = mappedAddress as `0x${string}`
        
        // Validate the address
        if (!isValidAddress(recipientAddress)) {
          throw new Error('Invalid recipient address. Please try again.')
        }
      }

      if (usePaymaster) {
        // Use Circle Paymaster to pay gas with USDC
        await handlePaymasterTransaction(amountInWei, recipientAddress)
      } else {
        // Regular transaction with native gas payment
        await handleRegularTransaction(amountInWei, recipientAddress)
      }

      // Add payment to history
      const newPayment: Payment = {
        id: Date.now().toString(),
        type: 'sent',
        amount,
        recipient: recipientHandle,
        sender: walletState.user?.username || '',
        message,
        timestamp: new Date(),
        status: 'completed',
      }

      setPayments(prev => [newPayment, ...prev])
      setShowSendForm(false)
      setRecipientHandle('')
      setAmount('')
      setMessage('')

      setWalletState(prev => ({
        ...prev,
        loading: false,
        error: null
      }))

    } catch (error) {
      console.error('Transaction error:', error)
      setWalletState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Transaction failed'
      }))
    }
  }

  // Regular transaction (native gas payment)
  const handleRegularTransaction = async (amountInWei: bigint, recipientAddress: string) => {
    const userOpHash = await walletState.bundlerClient.sendUserOperation({
      account: walletState.smartAccount,
      calls: [encodeTransfer(recipientAddress as `0x${string}`, USDC_CONTRACT_ADDRESS, amountInWei)],
      paymaster: true,
    })

    const { receipt } = await walletState.bundlerClient.waitForUserOperationReceipt({
      hash: userOpHash,
    })

    alert(`Payment sent! Hash: ${receipt.transactionHash}`)
  }

  // Paymaster transaction (USDC gas payment)
  const handlePaymasterTransaction = async (amountInWei: bigint, recipientAddress: string) => {
    // Create modular transport for baseSepolia
    const modularTransport = toModularTransport(
      clientUrl + '/baseSepolia',
      clientKey,
    )

    // Create client
    const client = createPublicClient({
      chain: baseSepolia,
      transport: modularTransport,
    })

    // Create paymaster configuration
    const paymaster = {
      async getPaymasterData(parameters: any) {
        const permitAmount = 10000000n // 10 USDC for gas
        const permitSignature = await signPermit({
          tokenAddress: USDC_CONTRACT_ADDRESS,
          account: walletState.smartAccount,
          client,
          spenderAddress: PAYMASTER_V07_ADDRESS,
          permitAmount: permitAmount,
        })

        const paymasterData = encodePacked(
          ["uint8", "address", "uint256", "bytes"],
          [0, USDC_CONTRACT_ADDRESS, permitAmount, permitSignature],
        ) as `0x${string}`

        return {
          paymaster: PAYMASTER_V07_ADDRESS as `0x${string}`,
          paymasterData,
          paymasterVerificationGasLimit: 200000n,
          paymasterPostOpGasLimit: 15000n,
          isFinal: true,
        }
      },
    }

    // Create bundler client with paymaster
    const paymasterBundlerClient = createBundlerClient({
      chain: baseSepolia,
      transport: modularTransport,
      paymaster,
    })

    // Send user operation with paymaster
    const userOpHash = await paymasterBundlerClient.sendUserOperation({
      account: walletState.smartAccount,
      calls: [encodeTransfer(recipientAddress as `0x${string}`, USDC_CONTRACT_ADDRESS, amountInWei)],
    })

    const { receipt } = await paymasterBundlerClient.waitForUserOperationReceipt({
      hash: userOpHash,
    })

    alert(`Payment sent! Hash: ${receipt.transactionHash}`)
  }

  return (
    <div className="pay-app">
      <header className="pay-header">
        <h1>💸 PayFriends</h1>
        <p>Send USDC to friends instantly with passkey security</p>
      </header>

      <main className="pay-main">
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
            <h2>🔐 Welcome to PayFriends</h2>
            <p>Create your account with passkey security</p>
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

        {/* Connected User Section */}
        {walletState.isConnected && walletState.user && (
          <>
            <section className="user-header">
              <div className="user-profile">
                <div className="user-avatar">
                  <img src={walletState.user.avatar} alt={walletState.user.username} />
                </div>
                <div className="user-details">
                  <h2>{walletState.user.username}</h2>
                  <p className="balance">$0.00 USDC</p>
                  <p className="wallet-address">{walletState.user.walletAddress}</p>
                </div>
              </div>
              <button
                onClick={() => setWalletState(prev => ({
                  ...prev,
                  isConnected: false,
                  user: null,
                  smartAccount: null,
                  bundlerClient: null,
                  loading: false,
                  error: null
                }))}
                className="logout-btn"
                title="Sign out"
              >
                <span>🏠</span>
                <span>Home</span>
              </button>
            </section>

            {/* Users List and Send Form */}
            <div className="main-content">
              <section className="users-section">
                <h3>Send to Friends</h3>
                <div className="users-list">
                  {Object.entries(getUsernameMapping()).length === 0 ? (
                    <div className="empty-users">
                      <p>No friends registered yet</p>
                      <p>Share PayFriends with your friends to start sending money!</p>
                    </div>
                  ) : (
                    Object.entries(getUsernameMapping())
                      .filter(([username]) => username !== walletState.user?.username.toLowerCase())
                      .map(([username, address]) => (
                        <div 
                          key={username} 
                          className="user-card"
                          onClick={() => {
                            setRecipientHandle(`@${username}`)
                            setShowSendForm(true)
                          }}
                        >
                          <div className="user-card-avatar">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`} alt={username} />
                          </div>
                          <div className="user-card-info">
                            <h4>@{username}</h4>
                            <p className="user-card-address">{address}</p>
                          </div>
                          <div className="user-card-action">
                            <span>Send →</span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </section>

              {/* Send Form */}
              {showSendForm && (
                <section className="send-form">
                  <div className="form-header">
                    <h3>Send Payment</h3>
                    <button
                      onClick={() => setShowSendForm(false)}
                      className="close-btn"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="recipient">To:</label>
                    <input
                      type="text"
                      id="recipient"
                      value={recipientHandle}
                      onChange={(e) => setRecipientHandle(e.target.value)}
                      placeholder="@username or scan QR code"
                      disabled={walletState.loading}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="amount">Amount:</label>
                    <input
                      type="number"
                      id="amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      disabled={walletState.loading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="message">Message (optional):</label>
                    <input
                      type="text"
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="What's it for?"
                      disabled={walletState.loading}
                    />
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={usePaymaster}
                        onChange={(e) => setUsePaymaster(e.target.checked)}
                        disabled={walletState.loading}
                      />
                      <span>Pay gas with USDC (recommended)</span>
                    </label>
                  </div>
                  
                  <button
                    onClick={handleSendPayment}
                    disabled={walletState.loading || !recipientHandle || !amount}
                    className="send-btn"
                  >
                    {walletState.loading ? 'Sending...' : 'Send Payment'}
                  </button>
                </section>
              )}
            </div>

            {/* Payment History */}
            <section className="payment-history">
              <h3>Activity</h3>
              {payments.length === 0 ? (
                <div className="empty-state">
                  <p>No payments yet</p>
                  <p>Send your first payment to get started!</p>
                </div>
              ) : (
                <div className="payments-list">
                  {payments.map((payment) => (
                    <div key={payment.id} className={`payment-item ${payment.type}`}>
                      <div className="payment-icon">
                        {payment.type === 'sent' ? '💸' : '💰'}
                      </div>
                      <div className="payment-details">
                        <div className="payment-header">
                          <span className="payment-type">
                            {payment.type === 'sent' ? 'Sent' : 'Received'}
                          </span>
                          <span className="payment-amount">
                            ${payment.amount}
                          </span>
                        </div>
                        <div className="payment-info">
                          <span className="payment-user">
                            {payment.type === 'sent' ? payment.recipient : payment.sender}
                          </span>
                          {payment.message && (
                            <span className="payment-message">• {payment.message}</span>
                          )}
                        </div>
                        <div className="payment-time">
                          {payment.timestamp.toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Debug Section */}
            <section className="debug-section">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="debug-toggle"
              >
                {showDebug ? 'Hide' : 'Show'} Debug Info
              </button>
              
              {showDebug && (
                <div className="debug-info">
                  <h4>Registered Users</h4>
                  <div className="user-mappings">
                    {Object.entries(getUsernameMapping()).map(([username, address]) => (
                      <div key={username} className="user-mapping">
                        <span className="username">@{username}</span>
                        <span className="address">{address}</span>
                      </div>
                    ))}
                  </div>
                  {Object.keys(getUsernameMapping()).length === 0 && (
                    <p>No users registered yet</p>
                  )}
                </div>
              )}
            </section>
          </>
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

      <footer className="pay-footer">
        <p>Powered by Circle Modular Wallet SDK</p>
      </footer>
    </div>
  )
}

export default App
