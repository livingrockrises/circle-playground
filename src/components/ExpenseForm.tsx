import React, { useState, useEffect } from 'react'
import { ExpenseService } from '../services/expenseService'
import type { Expense, ExpenseParticipant } from '../services/expenseService'

interface ExpenseFormProps {
  currentUser: {
    username: string
    walletAddress: string
  }
  onExpenseAdded: (expense: Expense) => void
  onCancel: () => void
}

interface Participant {
  username: string
  address: string
  selected: boolean
  share: number
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  currentUser,
  onExpenseAdded,
  onCancel
}) => {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Food & Dining')
  const [splitType, setSplitType] = useState<'equal' | 'percentage' | 'custom'>('equal')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(false)

  // Get all registered users
  const getUsernameMapping = (): Record<string, string> => {
    try {
      const stored = localStorage.getItem('payfriends_username_mapping')
      const mapping = stored ? JSON.parse(stored) : {}
      
      // Ensure all addresses are properly formatted (42 characters)
      Object.keys(mapping).forEach(username => {
        if (mapping[username] && mapping[username].length !== 42) {
          // Generate proper 42-character address if invalid
          mapping[username] = `0x${Array.from({length: 40}, () => 
            Math.floor(Math.random() * 16).toString(16)
          ).join('')}`
        }
      })
      
      return mapping
    } catch {
      return {}
    }
  }

  useEffect(() => {
    const userMapping = getUsernameMapping()
    const allUsers = Object.entries(userMapping)
      .filter(([username]) => username !== currentUser.username.toLowerCase())
      .map(([username, address]) => ({
        username,
        address,
        selected: false,
        share: 0
      }))

    // Add current user as default participant
    allUsers.unshift({
      username: currentUser.username,
      address: currentUser.walletAddress,
      selected: true,
      share: 0
    })

    setParticipants(allUsers)
  }, [currentUser])

  const handleParticipantToggle = (username: string) => {
    setParticipants(prev => prev.map(p => 
      p.username === username 
        ? { ...p, selected: !p.selected }
        : p
    ))
  }

  const handleShareChange = (username: string, share: number) => {
    setParticipants(prev => prev.map(p => 
      p.username === username 
        ? { ...p, share }
        : p
    ))
  }

  const calculateShares = () => {
    const selectedParticipants = participants.filter(p => p.selected)
    const totalAmount = parseFloat(amount) || 0

    if (splitType === 'equal') {
      const equalShare = totalAmount / selectedParticipants.length
      setParticipants(prev => prev.map(p => 
        p.selected ? { ...p, share: equalShare } : p
      ))
    } else if (splitType === 'percentage') {
      // Keep current shares as percentages
    }
    // For custom, user manually enters amounts
  }

  useEffect(() => {
    if (amount && splitType === 'equal') {
      calculateShares()
    }
  }, [amount, splitType, participants.filter(p => p.selected).length])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title || !amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid title and amount')
      return
    }

    const selectedParticipants = participants.filter(p => p.selected)
    if (selectedParticipants.length === 0) {
      alert('Please select at least one participant')
      return
    }

    const totalShare = selectedParticipants.reduce((sum, p) => sum + p.share, 0)
    const expenseAmount = parseFloat(amount)
    
    if (Math.abs(totalShare - expenseAmount) > 0.01) {
      alert(`Total shares ($${totalShare.toFixed(2)}) must equal expense amount ($${expenseAmount.toFixed(2)})`)
      return
    }

    setLoading(true)

    try {
      const expenseParticipants: ExpenseParticipant[] = selectedParticipants.map(p => ({
        username: p.username,
        address: p.address,
        share: p.share,
        paid: p.username === currentUser.username
      }))

      const newExpense = ExpenseService.addExpense({
        title,
        amount: expenseAmount,
        paidBy: currentUser.username,
        paidByAddress: currentUser.walletAddress,
        description,
        category,
        participants: expenseParticipants,
        status: 'active'
      })

      onExpenseAdded(newExpense)
    } catch (error) {
      console.error('Failed to add expense:', error)
      alert('Failed to add expense. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const selectedParticipants = participants.filter(p => p.selected)
  const totalShare = selectedParticipants.reduce((sum, p) => sum + p.share, 0)
  const expenseAmount = parseFloat(amount) || 0
  const isValid = title && amount && expenseAmount > 0 && selectedParticipants.length > 0

  return (
    <div className="expense-form">
      <div className="form-header">
        <h3>Add New Expense</h3>
        <button onClick={onCancel} className="close-btn">×</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Expense Title *</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Dinner at Restaurant"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="amount">Amount *</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {ExpenseService.getCategories().map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description (optional)</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details about this expense..."
            rows={3}
          />
        </div>

        <div className="form-group">
          <label>Split Type</label>
          <div className="split-options">
            <label>
              <input
                type="radio"
                value="equal"
                checked={splitType === 'equal'}
                onChange={(e) => setSplitType(e.target.value as any)}
              />
              Equal Split
            </label>
            <label>
              <input
                type="radio"
                value="percentage"
                checked={splitType === 'percentage'}
                onChange={(e) => setSplitType(e.target.value as any)}
              />
              Percentage
            </label>
            <label>
              <input
                type="radio"
                value="custom"
                checked={splitType === 'custom'}
                onChange={(e) => setSplitType(e.target.value as any)}
              />
              Custom Amount
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>Participants</label>
          <div className="participants-list">
            {participants.map(participant => (
              <div key={participant.username} className="participant-item">
                <label>
                  <input
                    type="checkbox"
                    checked={participant.selected}
                    onChange={() => handleParticipantToggle(participant.username)}
                  />
                  <span className="participant-name">@{participant.username}</span>
                </label>
                {participant.selected && (
                  <div className="share-input">
                    <span>$</span>
                    <input
                      type="number"
                      value={participant.share.toFixed(2)}
                      onChange={(e) => handleShareChange(participant.username, parseFloat(e.target.value) || 0)}
                      step="0.01"
                      min="0"
                      max={expenseAmount}
                      disabled={splitType === 'equal'}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {selectedParticipants.length > 0 && (
          <div className="split-summary">
            <div className="summary-item">
              <span>Total Amount:</span>
              <span>${expenseAmount.toFixed(2)}</span>
            </div>
            <div className="summary-item">
              <span>Total Split:</span>
              <span className={totalShare === expenseAmount ? 'valid' : 'invalid'}>
                ${totalShare.toFixed(2)}
              </span>
            </div>
            {totalShare !== expenseAmount && (
              <div className="split-error">
                Total split must equal expense amount
              </div>
            )}
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="cancel-btn"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="submit-btn"
            disabled={loading || !isValid || totalShare !== expenseAmount}
          >
            {loading ? 'Adding...' : 'Add Expense'}
          </button>
        </div>
      </form>
    </div>
  )
} 