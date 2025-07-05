import axios from 'axios'

// Environment variables - use the same key as the working test
const clientKey = import.meta.env.VITE_CLIENT_KEY as string
const apiKey = import.meta.env.VITE_CIRCLE_API_KEY as string // This should match the .env file
const circleApiKey = import.meta.env.CIRCLE_API_KEY as string // Try this as fallback
const complianceCheckEnabled = import.meta.env.VITE_COMPLIANCE_CHECK === 'true'

function generateUUIDv4() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for Node or older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface ComplianceResponse {
  result: 'APPROVED' | 'DENIED' | 'REVIEW'
  decision?: {
    ruleName: string
    actions: string[]
    reasons: Array<{
      source: string
      sourceValue: string
      riskScore: string
      riskCategories: string[]
      type: string
    }>
    screeningDate: string
  }
  address: string
  chain: string
}

interface ComplianceResult {
  isAllowed: boolean
  result: 'APPROVED' | 'DENIED' | 'REVIEW' | 'SKIPPED'
  ruleName?: string
  actions?: string[]
  riskCategories?: string[]
  error?: string
}

export class ComplianceService {
  private static generateIdempotencyKey(): string {
    return generateUUIDv4();
  }

  static async screenAddress(address: string, chain: string = 'BASE-SEPOLIA'): Promise<ComplianceResult> {
    // Check if compliance screening is enabled
    if (!complianceCheckEnabled) {
      console.log('🔒 Compliance screening disabled - skipping check')
      return {
        isAllowed: true,
        result: 'SKIPPED',
      }
    }

    try {
      console.log(`🔍 Screening address: ${address} on chain: ${chain}`)

      // Use the API key for compliance screening - try multiple sources
      const screeningApiKey = apiKey || circleApiKey || clientKey
      
      if (!screeningApiKey) {
        console.error('❌ No API key available for compliance screening')
        return {
          isAllowed: false,
          result: 'DENIED',
          error: 'Compliance API key not configured.',
        }
      }

      console.log('🔑 Using API key for screening:', screeningApiKey ? 'Set' : 'Not set')
      console.log('🔑 API key source:', apiKey ? 'VITE_CIRCLE_API_KEY' : circleApiKey ? 'CIRCLE_API_KEY' : 'VITE_CLIENT_KEY')

      const options = {
        method: 'POST',
        url: 'https://api.circle.com/v1/w3s/compliance/screening/addresses',
        headers: {
          Authorization: `Bearer ${screeningApiKey}`,
          'Content-Type': 'application/json',
        },
        data: {
          idempotencyKey: this.generateIdempotencyKey(),
          address: address,
          chain: chain,
        },
      }

      const response = await axios.request<ComplianceResponse>(options)
      const data = response.data

      console.log(`📋 Screening result for ${address}:`, data.result)

      if (data.result === 'DENIED') {
        const ruleName = data.decision?.ruleName || 'Unknown Rule'
        const actions = data.decision?.actions || []
        const riskCategories = data.decision?.reasons?.[0]?.riskCategories || []

        console.log('❌ Screening result: DENIED by Rule:', ruleName)
        console.log('🚫 Actions:', actions)
        console.log('⚠️ Risk Categories:', riskCategories)

        if (actions.includes('DENY')) {
          console.log('🚫 Recommended action: DENY — block transactions on wallet')
        }
        if (actions.includes('REVIEW')) {
          console.log('🔍 Recommended action: REVIEW — flag wallet for manual review')
        }
        if (actions.includes('FREEZE_WALLET')) {
          console.log('🧊 Recommended action: FREEZE_WALLET — freeze wallet activity')
        }

        return {
          isAllowed: false,
          result: 'DENIED',
          ruleName,
          actions,
          riskCategories,
        }
      }

      if (data.result === 'REVIEW') {
        console.log('⚠️ Screening result: REVIEW — manual review recommended')
        return {
          isAllowed: false,
          result: 'REVIEW',
          ruleName: data.decision?.ruleName,
          actions: data.decision?.actions,
          riskCategories: data.decision?.reasons?.[0]?.riskCategories,
        }
      }

      console.log('✅ Screening result: APPROVED')
      return {
        isAllowed: true,
        result: 'APPROVED',
      }
    } catch (error) {
      console.error('❌ Compliance screening error:', error)
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return {
            isAllowed: false,
            result: 'DENIED',
            error: 'Compliance API authentication failed. Please check your API key.',
          }
        }
        if (error.response?.status === 400) {
          return {
            isAllowed: false,
            result: 'DENIED',
            error: 'Invalid address format or unsupported chain.',
          }
        }
      }

      return {
        isAllowed: false,
        result: 'DENIED',
        error: 'Compliance screening failed. Please try again.',
      }
    }
  }

  static getComplianceErrorMessage(result: ComplianceResult): string {
    if (result.error) {
      return result.error
    }

    if (result.result === 'DENIED') {
      const ruleName = result.ruleName || 'Compliance Rule'
      const categories = result.riskCategories?.join(', ') || 'sanctions'
      return `Transaction blocked by ${ruleName}. Address flagged for ${categories}.`
    }

    if (result.result === 'REVIEW') {
      return 'Transaction requires manual review. Please contact support.'
    }

    if (result.result === 'SKIPPED') {
      return 'Compliance screening is disabled.'
    }

    return 'Compliance check failed. Please try again.'
  }

  static isComplianceEnabled(): boolean {
    return complianceCheckEnabled
  }
} 