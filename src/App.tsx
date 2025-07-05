import React, { useState, useEffect } from 'react'
import './App.css'
import { ComplianceService } from './services/complianceService'
import { ExpenseService } from './services/expenseService'
import { BatchPaymentService } from './services/batchPaymentService'
import { ExpenseForm } from './components/ExpenseForm'
import { DebtSettlement } from './components/DebtSettlement'
import { ExpensesList } from './components/ExpensesList'
import {
  USDC_CONTRACT_ADDRESS,
  USDC_DECIMALS,
  PAYMASTER_V07_ADDRESS,
  MAX_GASLESS_TRANSACTIONS,
  USERNAME_MAPPING_KEY,
  TRANSACTION_COUNTER_KEY,
  CLIENT_KEY,
  CLIENT_URL
} from './constants'
import type { Expense, Settlement } from './services/expenseService'
import type { BatchPaymentItem } from './services/batchPaymentService'

// Circle Modular Wallet SDK imports
import { 
  encodeTransfer,
  toPasskeyTransport,
  toWebAuthnCredential,
  toModularTransport,
  toCircleSmartAccount,
  WebAuthnMode
} from '@circle-fin/modular-wallets-core'
import { createPublicClient } from 'viem'
import { baseSepolia } from 'viem/chains'
import { createBundlerClient, toWebAuthnAccount } from 'viem/account-abstraction'
import { encodePacked, maxUint256, parseErc6492Signature } from 'viem'

// USDC contract ABI for permit functions
const USDC_ABI = [
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "nonces",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "version",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const

// EIP-2612 permit implementation (adapted from Circle docs)
async function eip2612Permit({
  token,
  chain,
  ownerAddress,
  spenderAddress,
  value,
}: {
  token: any
  chain: any
  ownerAddress: `0x${string}`
  spenderAddress: `0x${string}`
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

// Sign permit function (simplified to match working payments code)
async function signPermit({
  tokenAddress,
  client,
  account,
  spenderAddress,
  permitAmount,
}: {
  tokenAddress: `0x${string}`
  client: any
  account: any
  spenderAddress: `0x${string}`
  permitAmount: bigint
}) {
  try {
    // Create token contract instance
    const token = {
      address: tokenAddress,
      abi: USDC_ABI,
      read: {
        name: async () => "USD Coin",
        version: async () => "2",
        nonces: async (args: [`0x${string}`]) => {
          try {
            return await client.readContract({
              address: tokenAddress,
              abi: USDC_ABI,
              functionName: 'nonces',
              args,
            })
          } catch (error) {
            console.warn('⚠️ Could not read nonce, using 0:', error)
            return 0n
          }
        }
      }
    }

    const permitData = await eip2612Permit({
      token,
      chain: baseSepolia,
      ownerAddress: account.address,
      spenderAddress,
      value: permitAmount,
    })

    console.log('🔐 Signing permit for USDC gas payment...')
    console.log('Permit data:', permitData)
    
    const wrappedPermitSignature = await account.signTypedData(permitData)
    const { signature } = parseErc6492Signature(wrappedPermitSignature)
    
    console.log('✅ Permit signature created:', signature)
    return signature
  } catch (error) {
    console.error('❌ Permit signing failed:', error)
    throw error
  }
}

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

// Transaction counter functions (unified for payments and settlements)
const getTransactionCounter = (username: string): number => {
  try {
    const stored = localStorage.getItem(TRANSACTION_COUNTER_KEY)
    const counters = stored ? JSON.parse(stored) : {}
    return counters[username.toLowerCase()] || 0
  } catch {
    return 0
  }
}

const incrementTransactionCounter = (username: string) => {
  try {
    const stored = localStorage.getItem(TRANSACTION_COUNTER_KEY)
    const counters = stored ? JSON.parse(stored) : {}
    counters[username.toLowerCase()] = (counters[username.toLowerCase()] || 0) + 1
    localStorage.setItem(TRANSACTION_COUNTER_KEY, JSON.stringify(counters))
  } catch (error) {
    console.error('Failed to save transaction counter:', error)
  }
}

const canUseGaslessTransaction = (username: string): boolean => {
  const transactionCount = getTransactionCounter(username)
  return transactionCount < MAX_GASLESS_TRANSACTIONS
}

// Function to fetch USDC balance
const fetchUSDCBalance = async (accountAddress: string): Promise<string> => {
  try {
    // Create modular transport for baseSepolia
    const modularTransport = toModularTransport(
      CLIENT_URL + '/baseSepolia',
      CLIENT_KEY,
    )

    // Create client
    const client = createPublicClient({
      chain: baseSepolia,
      transport: modularTransport,
    })

    // Read USDC balance
    const balance = await client.readContract({
      address: USDC_CONTRACT_ADDRESS,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [accountAddress as `0x${string}`],
    })

    // Convert from wei to USDC (6 decimals)
    const balanceInUSDC = Number(balance) / Math.pow(10, USDC_DECIMALS)
    return balanceInUSDC.toFixed(2)
  } catch (error) {
    console.error('Failed to fetch USDC balance:', error)
    return '0.00'
  }
}

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

function App() {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    user: null,
    smartAccount: null,
    bundlerClient: null,
    balance: '0',
    loading: false,
    error: null
  })

  const [recipientHandle, setRecipientHandle] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [showSendForm, setShowSendForm] = useState(false)
  const [payments, setPayments] = useState<Payment[]>([])
  const [showDebug, setShowDebug] = useState(false)

  // New state for Splitwise functionality
  const [currentView, setCurrentView] = useState<'payments' | 'expenses' | 'debts'>('payments')
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [refreshKey, setRefreshKey] = useState(0) // Add refresh key for debt settlement

  const handlePasskeyAuth = async (mode: 'register' | 'login') => {
    if (!walletState.user?.username) {
      setWalletState(prev => ({ ...prev, error: 'Please enter a username first' }))
      return
    }

    if (!CLIENT_KEY || CLIENT_KEY === 'Not set' || !CLIENT_URL || CLIENT_URL === 'Not set') {
      setWalletState(prev => ({ 
        ...prev, 
        error: 'Circle SDK not configured. Please set VITE_CLIENT_KEY and VITE_CLIENT_URL in .env file.' 
      }))
      return
    }

    setWalletState(prev => ({ ...prev, loading: true, error: null }))

    try {
      console.log(`🔐 Starting ${mode} with Circle SDK...`)
      console.log('Client Key:', CLIENT_KEY ? 'Set' : 'Not set')
      console.log('Client URL:', CLIENT_URL)

      // 1. Create Passkey Transport
      const passkeyTransport = toPasskeyTransport(CLIENT_URL, CLIENT_KEY)
      
      // 2. Create WebAuthn Credential
      const credential = await toWebAuthnCredential({
        transport: passkeyTransport,
        mode: mode === 'register' ? WebAuthnMode.Register : WebAuthnMode.Login,
        username: walletState.user.username
      })

      console.log('✅ Passkey authentication successful')

      // 3. Create Modular Transport for Base Sepolia
      const modularTransport = toModularTransport(
        CLIENT_URL + '/baseSepolia',
        CLIENT_KEY,
      )

      // 4. Create Public Client
      const client = createPublicClient({
        chain: baseSepolia,
        transport: modularTransport,
      })

      // 5. Create Circle Smart Account
      const smartAccount = await toCircleSmartAccount({
        client,
        owner: toWebAuthnAccount({
          credential,
        }),
      })

      // 6. Create Bundler Client
      const bundlerClient = createBundlerClient({
        account: smartAccount,
        chain: baseSepolia,
        transport: modularTransport,
      })

      // Save username mapping
      setUsernameMapping(walletState.user.username, smartAccount.address)

      // Fetch USDC balance
      const balance = await fetchUSDCBalance(smartAccount.address)

      setWalletState(prev => ({
        ...prev,
        isConnected: true,
        smartAccount: smartAccount,
        bundlerClient: bundlerClient,
        balance: balance,
        loading: false,
        user: {
          ...prev.user!,
          walletAddress: smartAccount.address
        }
      }))

      console.log(`✅ ${mode} successful - Address: ${smartAccount.address} - Balance: $${balance} USDC`)
    } catch (error) {
      console.error('Authentication failed:', error)
      setWalletState(prev => ({ 
        ...prev, 
        loading: false, 
        error: `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }))
    }
  }

  const handleSendPayment = async () => {
    if (!walletState.user || !walletState.smartAccount || !walletState.bundlerClient) {
      setWalletState(prev => ({ ...prev, error: 'Wallet not connected' }))
      return
    }

    if (!recipientHandle || !amount) {
      setWalletState(prev => ({ ...prev, error: 'Please enter recipient and amount' }))
      return
    }

    const recipientAddress = getAddressFromUsername(recipientHandle.replace('@', ''))
    if (!recipientAddress) {
      setWalletState(prev => ({ ...prev, error: 'Recipient not found. Please use a registered username.' }))
      return
    }

    const amountInWei = BigInt(Math.round(parseFloat(amount) * 1000000)) // USDC has 6 decimals
    if (amountInWei <= 0) {
      setWalletState(prev => ({ ...prev, error: 'Amount must be greater than 0' }))
      return
    }

    setWalletState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Check compliance
      const complianceEnabled = ComplianceService.isComplianceEnabled()
      if (complianceEnabled) {
        const complianceResult = await ComplianceService.screenAddress(recipientAddress)
        if (!complianceResult.isAllowed) {
          setWalletState(prev => ({ 
            ...prev, 
            loading: false, 
            error: `Transaction blocked: ${ComplianceService.getComplianceErrorMessage(complianceResult)}` 
          }))
          return
        }
      }

      // Check if user can use gasless payment
      const canUseGasless = canUseGaslessTransaction(walletState.user.username)
      const transactionCount = getTransactionCounter(walletState.user.username)
      
      // Automatically choose payment method based on transaction count
      const shouldUsePaymaster = !canUseGasless
      
      console.log(`Transaction #${transactionCount + 1} for ${walletState.user.username}: ${shouldUsePaymaster ? 'USDC gas' : 'Gasless'}`)

      if (shouldUsePaymaster) {
        // Use Circle Paymaster to pay gas with USDC
        await handlePaymasterTransaction(amountInWei, recipientAddress)
      } else {
        // Regular transaction with native gas payment (gasless)
        await handleRegularTransaction(amountInWei, recipientAddress)
      }

      // Increment transaction counter after successful transaction
      incrementTransactionCounter(walletState.user.username)

      // Refresh balance after transaction
      const newBalance = await fetchUSDCBalance(walletState.user.walletAddress)
      setWalletState(prev => ({ ...prev, balance: newBalance }))

      // Add to payments history
      const newPayment: Payment = {
        id: `payment_${Date.now()}`,
        type: 'sent',
        amount,
        recipient: recipientHandle,
        sender: walletState.user.username,
        message,
        timestamp: new Date(),
        status: 'completed'
      }
      setPayments(prev => [newPayment, ...prev])

      // Reset form
      setRecipientHandle('')
      setAmount('')
      setMessage('')
      setShowSendForm(false)

      alert(`Payment sent! Amount: $${amount}`)

    } catch (error) {
      console.error('Payment failed:', error)
      setWalletState(prev => ({
        ...prev,
        loading: false,
        error: `Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }))
    } finally {
      setWalletState(prev => ({ ...prev, loading: false }))
    }
  }

  // Regular transaction (native gas payment - gasless)
  const handleRegularTransaction = async (amountInWei: bigint, recipientAddress: string) => {
    const userOpHash = await walletState.bundlerClient.sendUserOperation({
      account: walletState.smartAccount,
      calls: [encodeTransfer(recipientAddress as `0x${string}`, USDC_CONTRACT_ADDRESS, amountInWei)],
      paymaster: true,
    })

    const { receipt } = await walletState.bundlerClient.waitForUserOperationReceipt({
      hash: userOpHash,
    })

    console.log('✅ Gasless transaction successful:', receipt.transactionHash)
  }

  // Paymaster transaction (USDC gas payment)
  const handlePaymasterTransaction = async (amountInWei: bigint, recipientAddress: string) => {
    // Create modular transport for baseSepolia
    const modularTransport = toModularTransport(
      CLIENT_URL + '/baseSepolia',
      CLIENT_KEY,
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
        console.log(`🔐 Single payment, permit amount: ${permitAmount} (${Number(permitAmount) / 1000000} USDC)`)
        
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

    const userOpHash = await walletState.bundlerClient.sendUserOperation({
      account: walletState.smartAccount,
      calls: [encodeTransfer(recipientAddress as `0x${string}`, USDC_CONTRACT_ADDRESS, amountInWei)],
      paymaster,
    })

    const { receipt } = await walletState.bundlerClient.waitForUserOperationReceipt({
      hash: userOpHash,
    })

    console.log('✅ USDC paymaster transaction successful:', receipt.transactionHash)
  }

  // New functions for Splitwise functionality
  const handleExpenseAdded = (expense: Expense) => {
    setShowExpenseForm(false)
    // Refresh expenses list if needed
  }

  const handleSettlementComplete = async (settlement: Settlement) => {
    if (!walletState.user || !walletState.smartAccount || !walletState.bundlerClient) {
      setWalletState(prev => ({ ...prev, error: 'Wallet not connected' }))
      return
    }

    setWalletState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Get the batch payment that was created
      const batchPayments = BatchPaymentService.getBatchPayments()
      const batchPayment = batchPayments.find(bp => bp.id === settlement.id)
      
      if (!batchPayment) {
        throw new Error('Batch payment not found')
      }

      // Check if user can use gasless transaction
      const canUseGasless = canUseGaslessTransaction(walletState.user.username)
      const transactionCount = getTransactionCounter(walletState.user.username)
      
      // Automatically choose payment method based on transaction count
      const shouldUsePaymaster = !canUseGasless
      
      console.log(`Settlement #${transactionCount + 1} for ${walletState.user.username}: ${shouldUsePaymaster ? 'USDC gas' : 'Gasless'}`)
      
      // Create calls for all payments in the batch
      const calls = batchPayment.payments.map(payment => 
        encodeTransfer(payment.toAddress as `0x${string}`, USDC_CONTRACT_ADDRESS, BigInt(Math.round(payment.amount * 1000000)))
      )

      console.log(`🔄 Batch settlement: ${calls.length} payments, total amount: $${settlement.amount.toFixed(2)}`)
      batchPayment.payments.forEach((payment, index) => {
        console.log(`  Payment ${index + 1}: $${payment.amount.toFixed(2)} to @${payment.to}`)
      })

      let receipt: any

      if (shouldUsePaymaster) {
        // Use Circle Paymaster to pay gas with USDC
        receipt = await handleBatchPaymasterTransaction(calls)
      } else {
        // Regular transaction with native gas payment (gasless)
        receipt = await handleBatchRegularTransaction(calls)
      }

      // Increment transaction counter after successful transaction
      incrementTransactionCounter(walletState.user.username)

      // Refresh balance after transaction
      const newBalance = await fetchUSDCBalance(walletState.user.walletAddress)
      setWalletState(prev => ({ ...prev, balance: newBalance }))

      // Update batch payment status
      BatchPaymentService.updateBatchPayment(batchPayment.id, {
        status: 'completed',
        transactionHash: receipt.transactionHash
      })

      // Update settlement status to completed for both payer and payee
      const settlements = ExpenseService.getSettlements()
      settlements.forEach(settlement => {
        // Update settlements where you are the payer
        if (settlement.from === walletState.user?.username && settlement.status === 'pending') {
          ExpenseService.updateSettlement(settlement.id, {
            status: 'completed',
            transactionHash: receipt.transactionHash
          })
        }
        // Also update settlements where you are the payee (someone paid you)
        else if (settlement.to === walletState.user?.username && settlement.status === 'pending') {
          ExpenseService.updateSettlement(settlement.id, {
            status: 'completed',
            transactionHash: receipt.transactionHash
          })
        }
      })

      // Debug: Log the state after settlement
      console.log('=== AFTER SETTLEMENT DEBUG ===')
      if (walletState.user?.username) {
        ExpenseService.debugAll(walletState.user.username)
      }

      // Mark expenses as settled
      const expenseIds = batchPayment.payments.flatMap(payment => payment.debtIds)
      ExpenseService.markExpensesAsSettled(expenseIds)

      // Force refresh of debt settlement component
      setRefreshKey(prev => prev + 1)

      alert(`Settlement completed! Total amount: $${settlement.amount.toFixed(2)}`)

    } catch (error) {
      console.error('Settlement failed:', error)
      setWalletState(prev => ({ 
        ...prev, 
        loading: false, 
        error: `Settlement failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }))
    } finally {
      setWalletState(prev => ({ ...prev, loading: false }))
    }
  }

  // Regular batch transaction (native gas payment - gasless)
  const handleBatchRegularTransaction = async (calls: any[]) => {
    const userOpHash = await walletState.bundlerClient.sendUserOperation({
      account: walletState.smartAccount,
      calls,
      paymaster: true,
    })

    const { receipt } = await walletState.bundlerClient.waitForUserOperationReceipt({
      hash: userOpHash,
    })

    console.log('✅ Gasless batch transaction successful:', receipt.transactionHash)
    return receipt
  }

  // Paymaster batch transaction (USDC gas payment)
  const handleBatchPaymasterTransaction = async (calls: any[]) => {
    // Create modular transport for baseSepolia
    const modularTransport = toModularTransport(
      CLIENT_URL + '/baseSepolia',
      CLIENT_KEY,
    )

    // Create client
    const client = createPublicClient({
      chain: baseSepolia,
      transport: modularTransport,
    })

    // Create paymaster configuration
    const paymaster = {
      async getPaymasterData(parameters: any) {
        // Use higher permit amount for batch transactions
        // Base amount: 10 USDC, plus 2 USDC per additional call
        const baseAmount = 10000000n // 10 USDC
        const perCallAmount = 2000000n // 2 USDC per additional call
        const permitAmount = baseAmount + (BigInt(calls.length - 1) * perCallAmount)
        
        console.log(`🔐 Batch transaction with ${calls.length} calls, permit amount: ${permitAmount} (${Number(permitAmount) / 1000000} USDC)`)
        
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

    const userOpHash = await walletState.bundlerClient.sendUserOperation({
      account: walletState.smartAccount,
      calls,
      paymaster,
    })

    const { receipt } = await walletState.bundlerClient.waitForUserOperationReceipt({
      hash: userOpHash,
    })

    console.log('✅ USDC paymaster batch transaction successful:', receipt.transactionHash)
    return receipt
  }

  const handleExpenseClick = (expense: Expense) => {
    setSelectedExpense(expense)
  }

  // Function to refresh balance manually
  const handleRefreshBalance = async () => {
    if (!walletState.user?.walletAddress) return
    
    setWalletState(prev => ({ ...prev, loading: true }))
    try {
      const newBalance = await fetchUSDCBalance(walletState.user.walletAddress)
      setWalletState(prev => ({ ...prev, balance: newBalance, loading: false }))
    } catch (error) {
      console.error('Failed to refresh balance:', error)
      setWalletState(prev => ({ ...prev, loading: false }))
    }
  }

  // Function to refresh debt settlement
  const handleRefreshDebts = () => {
    setRefreshKey(prev => prev + 1)
  }

  // Function to clear all local data
  const handleClearAllData = () => {
    if (confirm('Are you sure you want to clear all local data? This will remove all expenses, settlements, and user mappings.')) {
      localStorage.clear()
      alert('All local data cleared! Please refresh the page.')
      window.location.reload()
    }
  }

  return (
    <div className="pay-app">
      <header className="pay-header">
        <h1>🌍 Eurotrip Splitwise</h1>
        <p>Split expenses and settle debts with friends instantly</p>
      </header>

      <main className="pay-main">
        {/* Environment Variables Check */}
        {(!CLIENT_KEY || CLIENT_KEY === 'Not set' || !CLIENT_URL || CLIENT_URL === 'Not set') && (
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
            <h2>🔐 Welcome to Wise Frens</h2>
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
                  <div className="balance-container">
                    <p className="balance">
                      {walletState.loading ? 'Loading...' : `$${walletState.balance} USDC`}
                    </p>
                    <button
                      onClick={handleRefreshBalance}
                      className="refresh-balance-btn"
                      title="Refresh balance"
                      disabled={walletState.loading}
                    >
                      🔄
                    </button>
                  </div>
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
                <span>🚪</span>
                <span>Logout</span>
              </button>
            </section>

            {/* Navigation Tabs */}
            <div className="nav-tabs">
              <button
                className={`nav-tab ${currentView === 'payments' ? 'active' : ''}`}
                onClick={() => setCurrentView('payments')}
              >
                💸 Payments
              </button>
              <button
                className={`nav-tab ${currentView === 'expenses' ? 'active' : ''}`}
                onClick={() => setCurrentView('expenses')}
              >
                📊 Expenses
              </button>
              <button
                className={`nav-tab ${currentView === 'debts' ? 'active' : ''}`}
                onClick={() => setCurrentView('debts')}
              >
                💰 Debts
              </button>
            </div>

            {/* Payments View */}
            {currentView === 'payments' && (
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
                    
                    {/* Payment Status Indicator */}
                    {walletState.user && (
                      <div className="payment-status">
                        {(() => {
                          const transactionCount = getTransactionCounter(walletState.user.username)
                          const canUseGasless = canUseGaslessTransaction(walletState.user.username)
                          const remainingGasless = MAX_GASLESS_TRANSACTIONS - transactionCount
                          const complianceEnabled = ComplianceService.isComplianceEnabled()
                          
                          return (
                            <div className={`status-indicator ${canUseGasless ? 'gasless' : 'usdc-gas'}`}>
                              {canUseGasless ? (
                                <div>
                                  <span className="status-icon">🎁</span>
                                  <span className="status-text">
                                    Gasless transaction available! ({remainingGasless} free transactions left)
                                    {!complianceEnabled && <span className="compliance-disabled"> • Compliance disabled</span>}
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <span className="status-icon">💳</span>
                                  <span className="status-text">
                                    USDC gas payment required (used {transactionCount} free transactions)
                                    {!complianceEnabled && <span className="compliance-disabled"> • Compliance disabled</span>}
                                  </span>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    )}
                    
                    {/* Compliance Status Indicator */}
                    {walletState.loading && (
                      <div className="compliance-status">
                        <div className="status-indicator compliance-checking">
                          <span className="status-icon">🔍</span>
                          <span className="status-text">
                            Checking compliance and security...
                          </span>
                        </div>
                      </div>
                    )}
                    
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
            )}

            {/* Expenses View */}
            {currentView === 'expenses' && (
              <div className="expenses-view">
                <div className="expenses-header">
                  <h3>Expense Tracking</h3>
                  <button
                    onClick={() => setShowExpenseForm(true)}
                    className="add-expense-btn"
                  >
                    + Add Expense
                  </button>
                </div>

                {showExpenseForm && (
                  <ExpenseForm
                    currentUser={{
                      username: walletState.user.username,
                      walletAddress: walletState.user.walletAddress
                    }}
                    onExpenseAdded={handleExpenseAdded}
                    onCancel={() => setShowExpenseForm(false)}
                  />
                )}

                <ExpensesList
                  currentUser={{ username: walletState.user.username }}
                  onExpenseClick={handleExpenseClick}
                />
              </div>
            )}

            {/* Debts View */}
            {currentView === 'debts' && (
              <div className="debts-view">
                <div className="settlement-header">
                  <h3>Debt Settlement</h3>
                  <div className="header-actions">
                    <button
                      onClick={() => {
                        if (walletState.user?.username) {
                          ExpenseService.debugAll(walletState.user.username)
                        }
                      }}
                      className="debug-btn"
                      title="Debug all data"
                    >
                      🐛
                    </button>
                    <button
                      onClick={handleRefreshDebts}
                      className="refresh-btn"
                      title="Refresh debts"
                    >
                      🔄
                    </button>
                  </div>
                </div>
                <DebtSettlement
                  key={refreshKey}
                  currentUser={{
                    username: walletState.user.username,
                    walletAddress: walletState.user.walletAddress
                  }}
                  onSettlementComplete={handleSettlementComplete}
                />
              </div>
            )}

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
                    {Object.entries(getUsernameMapping()).map(([username, address]) => {
                      const transactionCount = getTransactionCounter(username)
                      const canUseGasless = canUseGaslessTransaction(username)
                      return (
                        <div key={username} className="user-mapping">
                          <span className="username">@{username}</span>
                          <span className="address">{address}</span>
                          <span className="payment-count">
                            Transactions: {transactionCount} ({canUseGasless ? 'Gasless available' : 'USDC gas required'})
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  {Object.keys(getUsernameMapping()).length === 0 && (
                    <p>No users registered yet</p>
                  )}
                  
                  <h4>Transaction Rules</h4>
                  <div className="payment-rules">
                    <p>• First {MAX_GASLESS_TRANSACTIONS} transactions (payments & settlements): <strong>Gasless</strong> (free)</p>
                    <p>• After {MAX_GASLESS_TRANSACTIONS} transactions: <strong>USDC gas</strong> required</p>
                  </div>
                  
                  <h4>Compliance & Security</h4>
                  <div className="compliance-info">
                    <p>• <strong>Circle Compliance Screening</strong> - All recipient addresses are checked against sanctions blocklist</p>
                    <p>• <strong>Automatic Blocking</strong> - Transactions to flagged addresses are automatically blocked</p>
                    <p>• <strong>Real-time Screening</strong> - Every transaction is screened before processing</p>
                    <p>• <strong>Status</strong>: {ComplianceService.isComplianceEnabled() ? '🟢 Enabled' : '🔴 Disabled'}</p>
                  </div>
                  
                  <h4>Eurotrip Splitwise Features</h4>
                  <div className="compliance-info">
                    <p>• <strong>Expense Tracking</strong> - Split expenses with friends and track who owes what</p>
                    <p>• <strong>Debt Settlement</strong> - Settle multiple debts in one transaction</p>
                    <p>• <strong>Gasless Payments</strong> - First {MAX_GASLESS_TRANSACTIONS} transactions are free</p>
                    <p>• <strong>Real-time Balance</strong> - See your actual USDC balance from the blockchain</p>
                  </div>
                  
                  <h4>Debug Tools</h4>
                  <div className="debug-tools">
                    <button
                      onClick={() => {
                        if (walletState.user?.username) {
                          ExpenseService.debugAll(walletState.user.username)
                        }
                      }}
                      className="debug-btn"
                    >
                      Debug Current User
                    </button>
                    <button
                      onClick={() => ExpenseService.testDebtCalculation()}
                      className="debug-btn"
                    >
                      Test Debt Calculation
                    </button>
                    <button
                      onClick={handleClearAllData}
                      className="debug-btn"
                      style={{ background: '#dc3545' }}
                    >
                      Clear All Data
                    </button>
                  </div>
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
        <p>Powered by Circle Modular Wallet SDK • Eurotrip Splitwise</p>
      </footer>
    </div>
  )
}

export default App


