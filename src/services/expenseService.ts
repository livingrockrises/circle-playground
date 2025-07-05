// Expense and debt tracking service
export interface Expense {
  id: string
  title: string
  amount: number
  paidBy: string // username
  paidByAddress: string
  description?: string
  date: Date
  participants: ExpenseParticipant[]
  category: string
  status: 'active' | 'settled'
}

export interface ExpenseParticipant {
  username: string
  address: string
  share: number // amount they owe
  paid: boolean
}

export interface Debt {
  from: string // username who owes
  to: string // username who is owed
  amount: number
  expenses: string[] // expense IDs that contribute to this debt
}

export interface Settlement {
  id: string
  from: string
  to: string
  amount: number
  date: Date
  status: 'pending' | 'completed' | 'failed'
  transactionHash?: string
}

export class ExpenseService {
  private static EXPENSES_KEY = 'payfriends_expenses'
  private static SETTLEMENTS_KEY = 'payfriends_settlements'

  // Get all expenses
  static getExpenses(): Expense[] {
    try {
      const stored = localStorage.getItem(this.EXPENSES_KEY)
      return stored ? JSON.parse(stored).map((expense: any) => ({
        ...expense,
        date: new Date(expense.date)
      })) : []
    } catch {
      return []
    }
  }

  // Save expenses
  static saveExpenses(expenses: Expense[]) {
    try {
      localStorage.setItem(this.EXPENSES_KEY, JSON.stringify(expenses))
    } catch (error) {
      console.error('Failed to save expenses:', error)
    }
  }

  // Add new expense
  static addExpense(expense: Omit<Expense, 'id' | 'date'>): Expense {
    const expenses = this.getExpenses()
    const newExpense: Expense = {
      ...expense,
      id: `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: new Date()
    }
    expenses.push(newExpense)
    this.saveExpenses(expenses)
    return newExpense
  }

  // Update expense
  static updateExpense(expenseId: string, updates: Partial<Expense>): boolean {
    const expenses = this.getExpenses()
    const index = expenses.findIndex(e => e.id === expenseId)
    if (index !== -1) {
      expenses[index] = { ...expenses[index], ...updates }
      this.saveExpenses(expenses)
      return true
    }
    return false
  }

  // Delete expense
  static deleteExpense(expenseId: string): boolean {
    const expenses = this.getExpenses()
    const filtered = expenses.filter(e => e.id !== expenseId)
    if (filtered.length !== expenses.length) {
      this.saveExpenses(filtered)
      return true
    }
    return false
  }

  // Calculate debts between users
  static calculateDebts(): Debt[] {
    const expenses = this.getExpenses()
    const settlements = this.getSettlements()
    const completedSettlements = settlements.filter(s => s.status === 'completed')
    
    // Track net amounts between users
    const netAmounts: Record<string, number> = {}
    
    // First, calculate all debts from expenses (only active expenses)
    expenses.forEach(expense => {
      if (expense.status === 'settled') return
      
      expense.participants.forEach(participant => {
        if (participant.username === expense.paidBy) return // Skip the person who paid
        
        const debtKey = `${participant.username}_${expense.paidBy}`
        netAmounts[debtKey] = (netAmounts[debtKey] || 0) + participant.share
      })
    })
    
    // Then, subtract completed settlements
    completedSettlements.forEach(settlement => {
      const settlementKey = `${settlement.from}_${settlement.to}`
      const reverseKey = `${settlement.to}_${settlement.from}`
      
      if (netAmounts[settlementKey]) {
        netAmounts[settlementKey] -= settlement.amount
        if (netAmounts[settlementKey] <= 0) {
          delete netAmounts[settlementKey]
        }
      } else if (netAmounts[reverseKey]) {
        netAmounts[reverseKey] += settlement.amount
      } else {
        // Create a debt in the opposite direction
        netAmounts[reverseKey] = settlement.amount
      }
    })
    
    // Convert to debt objects
    const debts: Debt[] = []
    Object.entries(netAmounts).forEach(([key, amount]) => {
      if (amount > 0) {
        const [from, to] = key.split('_')
        debts.push({
          from,
          to,
          amount,
          expenses: [] // We'll populate this if needed
        })
      }
    })
    
    return debts
  }

  // Get debts for a specific user
  static getUserDebts(username: string): { owed: Debt[], owedTo: Debt[] } {
    const allDebts = this.calculateDebts()
    return {
      owed: allDebts.filter(debt => debt.from === username),
      owedTo: allDebts.filter(debt => debt.to === username)
    }
  }

  // Get user's net balance (positive = they are owed money, negative = they owe money)
  static getUserBalance(username: string): number {
    const debts = this.getUserDebts(username)
    const owed = debts.owed.reduce((sum, debt) => sum + debt.amount, 0)
    const owedTo = debts.owedTo.reduce((sum, debt) => sum + debt.amount, 0)
    
    // Debug logging
    console.log(`Balance calculation for ${username}:`)
    console.log(`- Owed to you: $${owedTo.toFixed(2)}`)
    console.log(`- You owe: $${owed.toFixed(2)}`)
    console.log(`- Final balance: $${(owedTo - owed).toFixed(2)}`)
    
    // Final balance = what you're owed - what you owe
    return owedTo - owed
  }

  // Debug function to show all settlements
  static debugSettlements(username: string): void {
    const settlements = this.getSettlements()
    console.log(`All settlements for ${username}:`, settlements)
    
    const completedSettlements = settlements.filter(s => s.status === 'completed')
    console.log(`Completed settlements for ${username}:`, completedSettlements)
  }

  // Comprehensive debug function
  static debugAll(username: string): void {
    console.log('=== DEBUG ALL ===')
    
    const expenses = this.getExpenses()
    console.log('All expenses:', expenses)
    
    const activeExpenses = expenses.filter(e => e.status === 'active')
    console.log('Active expenses:', activeExpenses)
    
    const settledExpenses = expenses.filter(e => e.status === 'settled')
    console.log('Settled expenses:', settledExpenses)
    
    const settlements = this.getSettlements()
    console.log('All settlements:', settlements)
    
    const completedSettlements = settlements.filter(s => s.status === 'completed')
    console.log('Completed settlements:', completedSettlements)
    
    const debts = this.calculateDebts()
    console.log('Calculated debts:', debts)
    
    const userDebts = this.getUserDebts(username)
    console.log(`User debts for ${username}:`, userDebts)
    
    const balance = this.getUserBalance(username)
    console.log(`Final balance for ${username}: $${balance.toFixed(2)}`)
    
    console.log('=== END DEBUG ===')
  }

  // Get settlements
  static getSettlements(): Settlement[] {
    try {
      const stored = localStorage.getItem(this.SETTLEMENTS_KEY)
      return stored ? JSON.parse(stored).map((settlement: any) => ({
        ...settlement,
        date: new Date(settlement.date)
      })) : []
    } catch {
      return []
    }
  }

  // Add settlement
  static addSettlement(settlement: Omit<Settlement, 'id' | 'date'>): Settlement {
    const settlements = this.getSettlements()
    const newSettlement: Settlement = {
      ...settlement,
      id: `settlement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: new Date()
    }
    settlements.push(newSettlement)
    try {
      localStorage.setItem(this.SETTLEMENTS_KEY, JSON.stringify(settlements))
    } catch (error) {
      console.error('Failed to save settlement:', error)
    }
    return newSettlement
  }

  // Update settlement status
  static updateSettlement(settlementId: string, updates: Partial<Settlement>): boolean {
    const settlements = this.getSettlements()
    const index = settlements.findIndex(s => s.id === settlementId)
    if (index !== -1) {
      settlements[index] = { ...settlements[index], ...updates }
      try {
        localStorage.setItem(this.SETTLEMENTS_KEY, JSON.stringify(settlements))
      } catch (error) {
        console.error('Failed to update settlement:', error)
      }
      return true
    }
    return false
  }

  // Mark expenses as settled when payment is completed
  static markExpensesAsSettled(expenseIds: string[]): void {
    const expenses = this.getExpenses()
    expenses.forEach(expense => {
      if (expenseIds.includes(expense.id)) {
        expense.status = 'settled'
      }
    })
    this.saveExpenses(expenses)
  }

  // Get expense categories
  static getCategories(): string[] {
    return [
      'Food & Dining',
      'Transportation',
      'Entertainment',
      'Shopping',
      'Bills & Utilities',
      'Travel',
      'Health & Fitness',
      'Education',
      'Gifts',
      'Other'
    ]
  }

  // Get expenses by category
  static getExpensesByCategory(category: string): Expense[] {
    return this.getExpenses().filter(expense => expense.category === category)
  }

  // Get total spent by user
  static getTotalSpentByUser(username: string): number {
    return this.getExpenses()
      .filter(expense => expense.paidBy === username)
      .reduce((sum, expense) => sum + expense.amount, 0)
  }

  // Get total owed by user
  static getTotalOwedByUser(username: string): number {
    const debts = this.getUserDebts(username)
    return debts.owed.reduce((sum, debt) => sum + debt.amount, 0)
  }

  // Get total owed to user
  static getTotalOwedToUser(username: string): number {
    const debts = this.getUserDebts(username)
    return debts.owedTo.reduce((sum, debt) => sum + debt.amount, 0)
  }

  // Test function to verify debt calculation
  static testDebtCalculation(): void {
    console.log('=== TESTING DEBT CALCULATION ===')
    
    // Clear existing data for clean test
    localStorage.removeItem(this.EXPENSES_KEY)
    localStorage.removeItem(this.SETTLEMENTS_KEY)
    
    // Create a simple expense: Alice paid $100, split between Alice and Bob
    const expense = this.addExpense({
      title: 'Test Expense',
      amount: 100,
      paidBy: 'alice',
      paidByAddress: '0x123...',
      description: 'Test',
      participants: [
        { username: 'alice', address: '0x123...', share: 50, paid: true },
        { username: 'bob', address: '0x456...', share: 50, paid: false }
      ],
      category: 'Test',
      status: 'active'
    })
    
    console.log('Created expense:', expense)
    
    // Check debts before settlement
    const debtsBefore = this.calculateDebts()
    console.log('Debts before settlement:', debtsBefore)
    
    // Create a settlement: Bob pays Alice $50
    const settlement = this.addSettlement({
      from: 'bob',
      to: 'alice',
      amount: 50,
      status: 'completed'
    })
    
    console.log('Created settlement:', settlement)
    
    // Check debts after settlement
    const debtsAfter = this.calculateDebts()
    console.log('Debts after settlement:', debtsAfter)
    
    // Check balances
    const aliceBalance = this.getUserBalance('alice')
    const bobBalance = this.getUserBalance('bob')
    console.log('Alice balance:', aliceBalance)
    console.log('Bob balance:', bobBalance)
    
    console.log('=== END TEST ===')
  }
} 