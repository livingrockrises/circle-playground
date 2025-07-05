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
import { createPublicClient, getContract, encodePacked, parseErc6492Signature, maxUint256 } from 'viem'
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

interface WalletState {
  isConnected: boolean
  username: string
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
    username: '',
    smartAccount: null,
    bundlerClient: null,
    balance: '0',
    loading: false,
    error: null,
  })

  const [recipientAddress, setRecipientAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [usePaymaster, setUsePaymaster] = useState(false)

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
    if (!walletState.username) {
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
        username: walletState.username,
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

      setWalletState(prev => ({
        ...prev,
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

  // Send transaction with or without paymaster
  const handleSendTransaction = async () => {
    if (!walletState.bundlerClient || !recipientAddress || !amount) {
      setWalletState(prev => ({
        ...prev,
        error: 'Please connect wallet and provide recipient address and amount'
      }))
      return
    }

    setWalletState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Convert amount to wei (USDC has 6 decimals)
      const amountInWei = BigInt(parseFloat(amount) * Math.pow(10, USDC_DECIMALS))

      if (usePaymaster) {
        // Use Circle Paymaster to pay gas with USDC
        await handlePaymasterTransaction(amountInWei)
      } else {
        // Regular transaction with native gas payment
        await handleRegularTransaction(amountInWei)
      }

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
  const handleRegularTransaction = async (amountInWei: bigint) => {
    const userOpHash = await walletState.bundlerClient.sendUserOperation({
      account: walletState.smartAccount,
      calls: [encodeTransfer(recipientAddress as `0x${string}`, USDC_CONTRACT_ADDRESS, amountInWei)],
      paymaster: true,
    })

    const { receipt } = await walletState.bundlerClient.waitForUserOperationReceipt({
      hash: userOpHash,
    })

    alert(`Transaction successful! Hash: ${receipt.transactionHash}`)
  }

  // Paymaster transaction (USDC gas payment)
  const handlePaymasterTransaction = async (amountInWei: bigint) => {
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

    alert(`Paymaster transaction successful! Hash: ${receipt.transactionHash}`)
  }

  return (
    <div className="wallet-app">
      <header className="wallet-header">
        <h1>🦾 Circle Smart Wallet</h1>
        <p>Passkey-based smart wallet with USDC payments and gasless option</p>
      </header>

      <main className="wallet-main">
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
            <h2>🔐 Connect Your Smart Wallet</h2>
            <div className="auth-form">
              <div className="form-group">
                <label htmlFor="username">Username:</label>
                <input
                  type="text"
                  id="username"
                  value={walletState.username}
                  onChange={(e) => setWalletState(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter your username"
                  disabled={walletState.loading}
                />
              </div>
              
              <div className="auth-buttons">
                <button
                  onClick={() => handlePasskeyAuth('register')}
                  disabled={walletState.loading || !walletState.username}
                  className="auth-btn register"
                >
                  {walletState.loading ? 'Creating...' : 'Create New Wallet'}
                </button>
                
                <button
                  onClick={() => handlePasskeyAuth('login')}
                  disabled={walletState.loading || !walletState.username}
                  className="auth-btn login"
                >
                  {walletState.loading ? 'Connecting...' : 'Connect Existing Wallet'}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Connected Wallet Section */}
        {walletState.isConnected && (
          <>
            <section className="wallet-info">
              <h2>✅ Wallet Connected</h2>
              <div className="wallet-details">
                <p><strong>Username:</strong> {walletState.username}</p>
                <p><strong>Wallet Address:</strong> {walletState.smartAccount?.address || 'Loading...'}</p>
              </div>
            </section>
            
            <section className="transaction-section">
              <h2>💸 Send USDC</h2>
              <div className="transaction-form">
                <div className="form-group">
                  <label htmlFor="recipient">Recipient Address:</label>
                  <input
                    type="text"
                    id="recipient"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder="0x..."
                    disabled={walletState.loading}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="amount">Amount (USDC):</label>
                  <input
                    type="number"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.000001"
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
                    <span>Pay gas with USDC (Circle Paymaster)</span>
                  </label>
                  <small className="paymaster-info">
                    When enabled, gas fees will be paid in USDC instead of native tokens
                  </small>
                </div>
                
                <button
                  onClick={handleSendTransaction}
                  disabled={walletState.loading || !recipientAddress || !amount}
                  className={`send-btn ${usePaymaster ? 'paymaster' : ''}`}
                >
                  {walletState.loading ? 'Sending...' : `Send Transaction ${usePaymaster ? '(USDC Gas)' : ''}`}
                </button>
              </div>
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

      <footer className="wallet-footer">
        <p>Powered by Circle Modular Wallet SDK</p>
      </footer>
    </div>
  )
}

export default App
