import { createPublicClient, getContract, parseEther, formatEther, http, encodeFunctionData } from 'viem'
import { baseSepolia } from 'viem/chains'
import { ChiragsLifeGameABI } from '../contracts/ChiragsLifeGameABI'

// Game contract address (will be deployed)
const GAME_CONTRACT_ADDRESS = '0x1ef3eec02Bc3FF073595E706c013687ED366a2eF' // Deployed on Base Sepolia
const USDC_CONTRACT_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' // Base Sepolia testnet
const PAYMASTER_V07_ADDRESS = '0x31BE08D380A21fc740883c0BC434FcFc88740b58' // Circle Paymaster v0.7

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}

// Game action types
export interface GameAction {
  name: string
  timeCost: number
  usdcCost: number
  xpReward: number
  heartReward: number
  flowReward: number
  depthReward: number
  requiresSleep: boolean
  requiresLuggage: boolean
  category: 'work' | 'travel' | 'social' | 'food' | 'sleep'
  description: string
}

// Player stats
export interface PlayerStats {
  xp: number
  heart: number
  flow: number
  depth: number
  currentDay: number
  dailyBudget: number
}

// Daily plan
export interface DailyPlan {
  actions: string[]
  totalTimeUsed: number
  totalUsdcSpent: number
  isExecuted: boolean
}

// Shadow card
export interface ShadowCard {
  name: string
  effect: string
  type: 'positive' | 'negative' | 'neutral'
}

// Game state
export interface GameState {
  currentDay: number
  players: string[]
  shadowCard?: ShadowCard
  phase: 'planning' | 'execution' | 'completed'
}

export class GameService {
  private static client = createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org'),
  })

  // Available game actions
  static readonly GAME_ACTIONS: Record<string, GameAction> = {
    'Take PM Call': {
      name: 'Take PM Call',
      timeCost: 2,
      usdcCost: 5,
      xpReward: 3,
      heartReward: 0,
      flowReward: 2,
      depthReward: 0,
      requiresSleep: false,
      requiresLuggage: false,
      category: 'work',
      description: 'Important product meeting with stakeholders'
    },
    'Push Code': {
      name: 'Push Code',
      timeCost: 3,
      usdcCost: 8,
      xpReward: 4,
      heartReward: 0,
      flowReward: 3,
      depthReward: 1,
      requiresSleep: false,
      requiresLuggage: false,
      category: 'work',
      description: 'Deep work session to ship features'
    },
    'Travel to Goa': {
      name: 'Travel to Goa',
      timeCost: 4,
      usdcCost: 25,
      xpReward: 5,
      heartReward: 2,
      flowReward: 0,
      depthReward: 3,
      requiresSleep: false,
      requiresLuggage: true,
      category: 'travel',
      description: 'Spontaneous beach getaway for inspiration'
    },
    'Visa Appointment': {
      name: 'Visa Appointment',
      timeCost: 2,
      usdcCost: 15,
      xpReward: 2,
      heartReward: 0,
      flowReward: 1,
      depthReward: 0,
      requiresSleep: false,
      requiresLuggage: false,
      category: 'travel',
      description: 'Prepare for future international travel'
    },
    'Plan Date': {
      name: 'Plan Date',
      timeCost: 1,
      usdcCost: 10,
      xpReward: 2,
      heartReward: 3,
      flowReward: 0,
      depthReward: 1,
      requiresSleep: false,
      requiresLuggage: false,
      category: 'social',
      description: 'Romantic evening planning and preparation'
    },
    'Bumble Match': {
      name: 'Bumble Match',
      timeCost: 1,
      usdcCost: 5,
      xpReward: 1,
      heartReward: 2,
      flowReward: 0,
      depthReward: 0,
      requiresSleep: false,
      requiresLuggage: false,
      category: 'social',
      description: 'Connect with new people online'
    },
    'Eat at New Place': {
      name: 'Eat at New Place',
      timeCost: 2,
      usdcCost: 12,
      xpReward: 4,
      heartReward: 1,
      flowReward: 0,
      depthReward: 2,
      requiresSleep: false,
      requiresLuggage: false,
      category: 'food',
      description: 'Explore local cuisine and culture'
    },
    'Sleep': {
      name: 'Sleep',
      timeCost: 2,
      usdcCost: 0,
      xpReward: 0,
      heartReward: 0,
      flowReward: 2,
      depthReward: 0,
      requiresSleep: true,
      requiresLuggage: false,
      category: 'sleep',
      description: 'Essential rest for tomorrow'
    }
  }

  // Shadow cards
  static readonly SHADOW_CARDS: ShadowCard[] = [
    {
      name: 'Unexpected Meeting',
      effect: 'A last-minute client call. Work actions get +5 XP bonus.',
      type: 'positive'
    },
    {
      name: 'Flight Delayed',
      effect: 'Travel plans disrupted. Travel actions cost +10 USDC.',
      type: 'negative'
    },
    {
      name: 'Good Weather',
      effect: 'Perfect day for outdoor activities. Social actions get +3 heart bonus.',
      type: 'positive'
    },
    {
      name: 'Restaurant Closed',
      effect: 'Favorite place is closed. Food actions cost +5 USDC.',
      type: 'negative'
    },
    {
      name: 'Inspiration Strike',
      effect: 'Creative breakthrough! All actions get +2 depth bonus.',
      type: 'positive'
    },
    {
      name: 'Traffic Jam',
      effect: 'Getting around is difficult. All actions take +1 time slot.',
      type: 'negative'
    },
    {
      name: 'Visa Denied',
      effect: 'Paris visa application rejected. Travel plans must be adjusted.',
      type: 'negative'
    },
    {
      name: 'Serendipitous Encounter',
      effect: 'Unexpected meeting with old friend. Social actions get +1 heart bonus.',
      type: 'positive'
    }
  ]

  // Get game contract instance
  private static getGameContract() {
    return getContract({
      address: GAME_CONTRACT_ADDRESS as `0x${string}`,
      abi: ChiragsLifeGameABI,
      client: this.client,
    })
  }

  // Register player in the game
  static async registerPlayer(username: string, account: any, bundlerClient: any): Promise<boolean> {
    try {
      console.log('Starting player registration for:', username)
      console.log('Account address:', account.address)
      console.log('Game contract address:', GAME_CONTRACT_ADDRESS)
      
      const data = encodeFunctionData({
        abi: ChiragsLifeGameABI,
        functionName: 'registerPlayer',
        args: [username]
      })

      console.log('Encoded function data:', data)

      const userOpHash = await bundlerClient.sendUserOperation({
        account,
        calls: [{
          to: GAME_CONTRACT_ADDRESS as `0x${string}`,
          value: 0n,
          data,
        }],
        paymaster: true,
      })

      console.log('User operation hash:', userOpHash)

      const { receipt } = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
      })

      console.log('Player registered successfully:', receipt.transactionHash)
      return true
    } catch (error) {
      console.error('Failed to register player:', error)
      console.error('Error details:', {
        username,
        accountAddress: account?.address,
        gameContract: GAME_CONTRACT_ADDRESS,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }

  // Get player stats
  static async getPlayerStats(playerAddress: string): Promise<PlayerStats | null> {
    try {
      const contract = this.getGameContract()
      const stats = await contract.read.getPlayerStats([playerAddress as `0x${string}`])
      
      return {
        xp: Number(stats[0]),
        heart: Number(stats[1]),
        flow: Number(stats[2]),
        depth: Number(stats[3]),
        currentDay: Number(stats[4]),
        dailyBudget: 100 // Fixed daily budget
      }
    } catch (error) {
      console.error('Failed to get player stats:', error)
      return null
    }
  }

  // Submit daily plan
  static async submitDailyPlan(actions: string[], account: any, bundlerClient: any): Promise<boolean> {
    try {
      const data = encodeFunctionData({
        abi: ChiragsLifeGameABI,
        functionName: 'submitDailyPlan',
        args: [actions]
      })

      const userOpHash = await bundlerClient.sendUserOperation({
        account,
        calls: [{
          to: GAME_CONTRACT_ADDRESS as `0x${string}`,
          value: 0n,
          data,
        }],
        paymaster: true,
      })

      const { receipt } = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
      })

      console.log('Daily plan submitted:', receipt.transactionHash)
      return true
    } catch (error) {
      console.error('Failed to submit daily plan:', error)
      return false
    }
  }

  // Execute daily plan
  static async executeDailyPlan(account: any, bundlerClient: any): Promise<boolean> {
    try {
      const data = encodeFunctionData({
        abi: ChiragsLifeGameABI,
        functionName: 'executeDailyPlan',
        args: []
      })

      const userOpHash = await bundlerClient.sendUserOperation({
        account,
        calls: [{
          to: GAME_CONTRACT_ADDRESS as `0x${string}`,
          value: 0n,
          data,
        }],
        paymaster: true,
      })

      const { receipt } = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
      })

      console.log('Daily plan executed:', receipt.transactionHash)
      return true
    } catch (error) {
      console.error('Failed to execute daily plan:', error)
      return false
    }
  }

  // Get daily plan for a player
  static async getDailyPlan(playerAddress: string): Promise<DailyPlan | null> {
    try {
      const contract = this.getGameContract()
      const plan = await contract.read.getDailyPlan([playerAddress as `0x${string}`])
      
      return {
        actions: [...plan.actions],
        totalTimeUsed: Number(plan.totalTimeUsed),
        totalUsdcSpent: Number(plan.totalUsdcSpent),
        isExecuted: plan.isExecuted
      }
    } catch (error) {
      console.error('Failed to get daily plan:', error)
      return null
    }
  }

  // Validate daily plan
  static validateDailyPlan(actions: string[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    let totalTime = 0
    let totalUsdc = 0
    let hasSleep = false

    for (const actionName of actions) {
      const action = this.GAME_ACTIONS[actionName]
      if (!action) {
        errors.push(`Invalid action: ${actionName}`)
        continue
      }

      totalTime += action.timeCost
      totalUsdc += action.usdcCost

      if (action.requiresSleep) {
        hasSleep = true
      }
    }

    if (totalTime > 8) {
      errors.push('Plan exceeds 8 time slots')
    }

    if (totalUsdc > 100) {
      errors.push('Plan exceeds daily budget of 100 USDC')
    }

    if (!hasSleep) {
      errors.push('Plan must include sleep')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Get random motivations for the day
  static getRandomMotivations(count: number = 5): GameAction[] {
    const availableActions = Object.values(this.GAME_ACTIONS).filter(action => action.name !== 'Sleep')
    const motivations: GameAction[] = []
    
    // Always include sleep
    motivations.push(this.GAME_ACTIONS['Sleep'])
    
    // Add random actions
    const shuffled = [...availableActions].sort(() => 0.5 - Math.random())
    for (let i = 0; i < count - 1 && i < shuffled.length; i++) {
      motivations.push(shuffled[i])
    }
    
    return motivations
  }

  // Draw a random shadow card
  static drawShadowCard(): ShadowCard {
    const randomIndex = Math.floor(Math.random() * this.SHADOW_CARDS.length)
    return this.SHADOW_CARDS[randomIndex]
  }

  // Calculate plan score
  static calculatePlanScore(actions: string[]): { xp: number; heart: number; flow: number; depth: number } {
    let xp = 0, heart = 0, flow = 0, depth = 0

    for (const actionName of actions) {
      const action = this.GAME_ACTIONS[actionName]
      if (action) {
        xp += action.xpReward
        heart += action.heartReward
        flow += action.flowReward
        depth += action.depthReward
      }
    }

    return { xp, heart, flow, depth }
  }

  // Get actions by category
  static getActionsByCategory(category: GameAction['category']): GameAction[] {
    return Object.values(this.GAME_ACTIONS).filter(action => action.category === category)
  }

  // Format USDC amount
  static formatUSDC(amount: number): string {
    return `$${amount.toFixed(2)}`
  }

  // Get action emoji
  static getActionEmoji(category: GameAction['category']): string {
    const emojis = {
      work: '💼',
      travel: '✈️',
      social: '💕',
      food: '🍽️',
      sleep: '😴'
    }
    return emojis[category] || '🎯'
  }
} 