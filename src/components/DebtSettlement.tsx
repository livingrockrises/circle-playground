import React, { useState } from 'react'
import { ExpenseService } from '../services/expenseService'
import { BatchPaymentService } from '../services/batchPaymentService'
import type { Debt, Settlement } from '../services/expenseService'
import type { BatchPaymentItem } from '../services/batchPaymentService'

interface DebtSettlementProps {
  currentUser: {
    username: string
    walletAddress: string
  }
  onSettlementComplete: (settlement: Settlement) => void
}

// Helper function to generate proper mock addresses
const generateMockAddress = (): string => {
  return `0x${Array.from({length: 40}, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('')}`
}

// Helper function to get or create proper address
const getOrCreateAddress = (username: string): string => {
  try {
    const stored = localStorage.getItem('payfriends_username_mapping')
    const mapping = stored ? JSON.parse(stored) : {}
    
    if (mapping[username.toLowerCase()]) {
      const address = mapping[username.toLowerCase()]
      // Validate address format
      if (address && address.startsWith('0x') && address.length === 42) {
        return address
      }
    }
    
    // Generate new proper address if invalid
    const newAddress = generateMockAddress()
    mapping[username.toLowerCase()] = newAddress
    localStorage.setItem('payfriends_username_mapping', JSON.stringify(mapping))
    return newAddress
  } catch {
    return generateMockAddress()
  }
}

export const DebtSettlement: React.FC<DebtSettlementProps> = ({
  currentUser,
  onSettlementComplete
}) => {
  const [selectedDebts, setSelectedDebts] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const userDebts = ExpenseService.getUserDebts(currentUser.username)
  const userBalance = ExpenseService.getUserBalance(currentUser.username)

  const handleDebtToggle = (debtKey: string) => {
    const newSelected = new Set(selectedDebts)
    if (newSelected.has(debtKey)) {
      newSelected.delete(debtKey)
    } else {
      newSelected.add(debtKey)
    }
    setSelectedDebts(newSelected)
  }

  const handleSelectAllOwed = () => {
    const owedDebts = userDebts.owed.map(debt => `${debt.from}_${debt.to}`)
    setSelectedDebts(new Set(owedDebts))
  }

  const handleClearSelection = () => {
    setSelectedDebts(new Set())
  }

  const getSelectedDebts = (): Debt[] => {
    return userDebts.owed.filter(debt => 
      selectedDebts.has(`${debt.from}_${debt.to}`)
    )
  }

  const getTotalSelectedAmount = (): number => {
    return getSelectedDebts().reduce((sum, debt) => sum + debt.amount, 0)
  }

  const handleSettleDebts = async () => {
    const selectedDebtsList = getSelectedDebts()
    if (selectedDebtsList.length === 0) {
      alert('Please select debts to settle')
      return
    }

    setLoading(true)

    try {
      // Group debts by recipient
      const debtGroups: Record<string, { amount: number; debts: Debt[] }> = {}
      
      selectedDebtsList.forEach(debt => {
        if (!debtGroups[debt.to]) {
          debtGroups[debt.to] = { amount: 0, debts: [] }
        }
        debtGroups[debt.to].amount += debt.amount
        debtGroups[debt.to].debts.push(debt)
      })

      // Create batch payment items
      const batchItems: BatchPaymentItem[] = Object.entries(debtGroups).map(([username, group]) => {
        const address = getOrCreateAddress(username)
        
        return {
          to: username,
          toAddress: address,
          amount: group.amount,
          debtIds: group.debts.map(d => `${d.from}_${d.to}`)
        }
      })

      // Validate batch payment
      const validation = BatchPaymentService.validateBatchPayment(batchItems)
      if (!validation.valid) {
        alert(`Invalid batch payment: ${validation.error}`)
        return
      }

      // Create settlement records
      const settlements: Settlement[] = []
      selectedDebtsList.forEach(debt => {
        const settlement = ExpenseService.addSettlement({
          from: currentUser.username,
          to: debt.to,
          amount: debt.amount,
          status: 'pending'
        })
        settlements.push(settlement)
      })

      // Create batch payment record
      const batchPayment = BatchPaymentService.addBatchPayment({
        from: currentUser.username,
        fromAddress: currentUser.walletAddress,
        payments: batchItems,
        totalAmount: getTotalSelectedAmount(),
        status: 'pending'
      })

      // Return the batch payment for processing
      onSettlementComplete({
        id: batchPayment.id,
        from: currentUser.username,
        to: 'Multiple Users',
        amount: getTotalSelectedAmount(),
        date: new Date(),
        status: 'pending'
      })

      // Clear selection
      setSelectedDebts(new Set())

    } catch (error) {
      console.error('Failed to settle debts:', error)
      alert('Failed to settle debts. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="debt-settlement">
      <div className="settlement-header">
        <h3>Debt Settlement</h3>
        <div className="balance-info">
          <span className="balance-label">Your Balance:</span>
          <span className={`balance-amount ${userBalance >= 0 ? 'positive' : 'negative'}`}>
            {userBalance >= 0 ? '+' : ''}${userBalance.toFixed(2)}
          </span>
        </div>
      </div>

      {userBalance < 0 && (
        <div className="balance-warning">
          <span>⚠️ You owe ${Math.abs(userBalance).toFixed(2)}</span>
        </div>
      )}

      {userBalance > 0 && (
        <div className="balance-positive">
          <span>💰 You are owed ${userBalance.toFixed(2)}</span>
        </div>
      )}

      <div className="debt-sections">
        {/* Debts you owe */}
        {userDebts.owed.length > 0 && (
          <div className="debt-section">
            <div className="section-header">
              <h4>You Owe</h4>
              <button 
                onClick={handleSelectAllOwed}
                className="select-all-btn"
                disabled={loading}
              >
                Select All
              </button>
            </div>
            <div className="debts-list">
              {userDebts.owed.map(debt => {
                const debtKey = `${debt.from}_${debt.to}`
                const isSelected = selectedDebts.has(debtKey)
                
                return (
                  <div key={debtKey} className={`debt-item ${isSelected ? 'selected' : ''}`}>
                    <label>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleDebtToggle(debtKey)}
                        disabled={loading}
                      />
                      <div className="debt-info">
                        <span className="debt-user">@{debt.to}</span>
                        <span className="debt-amount">${debt.amount.toFixed(2)}</span>
                      </div>
                    </label>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Debts owed to you */}
        {userDebts.owedTo.length > 0 && (
          <div className="debt-section">
            <div className="section-header">
              <h4>Owed to You</h4>
            </div>
            <div className="debts-list">
              {userDebts.owedTo.map(debt => (
                <div key={`${debt.from}_${debt.to}`} className="debt-item owed-to">
                  <div className="debt-info">
                    <span className="debt-user">@{debt.from}</span>
                    <span className="debt-amount">${debt.amount.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {userDebts.owed.length === 0 && userDebts.owedTo.length === 0 && (
          <div className="no-debts">
            <p>No debts to settle! 🎉</p>
            <p>Add some expenses to start tracking debts.</p>
          </div>
        )}
      </div>

      {selectedDebts.size > 0 && (
        <div className="settlement-summary">
          <div className="summary-header">
            <h4>Settlement Summary</h4>
            <button 
              onClick={handleClearSelection}
              className="clear-btn"
              disabled={loading}
            >
              Clear
            </button>
          </div>
          <div className="summary-details">
            <div className="summary-item">
              <span>Selected Debts:</span>
              <span>{selectedDebts.size}</span>
            </div>
            <div className="summary-item">
              <span>Total Amount:</span>
              <span>${getTotalSelectedAmount().toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={handleSettleDebts}
            className="settle-btn"
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Settle Selected Debts'}
          </button>
        </div>
      )}
    </div>
  )
} 