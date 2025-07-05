// Contract addresses and configuration
export const USDC_CONTRACT_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}` // Base Sepolia testnet
export const USDC_DECIMALS = 6
export const PAYMASTER_V07_ADDRESS = '0x31BE08D380A21fc740883c0BC434FcFc88740b58' as `0x${string}` // Circle Paymaster v0.7
export const MAX_GASLESS_TRANSACTIONS = 2

// Local storage keys
export const USERNAME_MAPPING_KEY = 'payfriends_username_mapping'
export const TRANSACTION_COUNTER_KEY = 'payfriends_transaction_counter'

// Environment variables
export const CLIENT_KEY = import.meta.env.VITE_CLIENT_KEY as string
export const CLIENT_URL = import.meta.env.VITE_CLIENT_URL as string 