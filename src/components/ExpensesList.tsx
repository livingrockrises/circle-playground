import React, { useState, useEffect } from 'react'
import { ExpenseService } from '../services/expenseService'
import type { Expense } from '../services/expenseService'

interface ExpensesListProps {
  currentUser: {
    username: string
  }
  onExpenseClick?: (expense: Expense) => void
}

export const ExpensesList: React.FC<ExpensesListProps> = ({
  currentUser,
  onExpenseClick
}) => {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filter, setFilter] = useState<'all' | 'my-expenses' | 'involved'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'title'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadExpenses()
  }, [currentUser.username])

  const loadExpenses = () => {
    const allExpenses = ExpenseService.getExpenses()
    setExpenses(allExpenses)
  }

  const getFilteredExpenses = (): Expense[] => {
    let filtered = expenses

    // Filter by user involvement
    if (filter === 'my-expenses') {
      filtered = filtered.filter(expense => expense.paidBy === currentUser.username)
    } else if (filter === 'involved') {
      filtered = filtered.filter(expense => 
        expense.paidBy === currentUser.username || 
        expense.participants.some(p => p.username === currentUser.username)
      )
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(expense => expense.category === categoryFilter)
    }

    // Sort expenses
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(b.date).getTime() - new Date(a.date).getTime()
          break
        case 'amount':
          comparison = b.amount - a.amount
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
      }

      return sortOrder === 'asc' ? -comparison : comparison
    })

    return filtered
  }

  const getUserShare = (expense: Expense): number => {
    const participant = expense.participants.find(p => p.username === currentUser.username)
    return participant?.share || 0
  }

  const getUserStatus = (expense: Expense): string => {
    if (expense.paidBy === currentUser.username) {
      return 'Paid'
    }
    const participant = expense.participants.find(p => p.username === currentUser.username)
    return participant?.paid ? 'Settled' : 'Owed'
  }

  const getStatusColor = (expense: Expense): string => {
    if (expense.status === 'settled') return 'settled'
    if (expense.paidBy === currentUser.username) return 'paid'
    const participant = expense.participants.find(p => p.username === currentUser.username)
    return participant?.paid ? 'settled' : 'owed'
  }

  const handleExpenseClick = (expense: Expense) => {
    if (onExpenseClick) {
      onExpenseClick(expense)
    }
  }

  const filteredExpenses = getFilteredExpenses()

  return (
    <div className="expenses-list">
      <div className="list-header">
        <h3>Expenses</h3>
        <button onClick={loadExpenses} className="refresh-btn">🔄</button>
      </div>

      <div className="filters">
        <div className="filter-group">
          <label>Filter:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
            <option value="all">All Expenses</option>
            <option value="my-expenses">My Expenses</option>
            <option value="involved">Involved</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Category:</label>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {ExpenseService.getCategories().map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
            <option value="date">Date</option>
            <option value="amount">Amount</option>
            <option value="title">Title</option>
          </select>
        </div>

        <button 
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="sort-order-btn"
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      <div className="expenses-container">
        {filteredExpenses.length === 0 ? (
          <div className="empty-expenses">
            <p>No expenses found</p>
            <p>Add your first expense to get started!</p>
          </div>
        ) : (
          <div className="expenses-grid">
            {filteredExpenses.map(expense => (
              <div 
                key={expense.id} 
                className={`expense-card ${getStatusColor(expense)}`}
                onClick={() => handleExpenseClick(expense)}
              >
                <div className="expense-header">
                  <h4 className="expense-title">{expense.title}</h4>
                  <span className={`expense-status ${getStatusColor(expense)}`}>
                    {getUserStatus(expense)}
                  </span>
                </div>

                <div className="expense-details">
                  <div className="expense-amount">
                    <span className="amount-label">Total:</span>
                    <span className="amount-value">${expense.amount.toFixed(2)}</span>
                  </div>

                  {getUserShare(expense) > 0 && (
                    <div className="user-share">
                      <span className="share-label">Your share:</span>
                      <span className="share-value">${getUserShare(expense).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="expense-meta">
                    <span className="expense-category">{expense.category}</span>
                    <span className="expense-date">
                      {new Date(expense.date).toLocaleDateString()}
                    </span>
                  </div>

                  {expense.description && (
                    <div className="expense-description">
                      {expense.description}
                    </div>
                  )}

                  <div className="expense-participants">
                    <span className="participants-label">Participants:</span>
                    <div className="participants-list">
                      {expense.participants.map(participant => (
                        <span 
                          key={participant.username} 
                          className={`participant ${participant.username === currentUser.username ? 'current-user' : ''}`}
                        >
                          @{participant.username} (${participant.share.toFixed(2)})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="expenses-summary">
        <div className="summary-item">
          <span>Total Expenses:</span>
          <span>{filteredExpenses.length}</span>
        </div>
        <div className="summary-item">
          <span>Total Amount:</span>
          <span>${filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0).toFixed(2)}</span>
        </div>
        <div className="summary-item">
          <span>Your Total Spent:</span>
          <span>${ExpenseService.getTotalSpentByUser(currentUser.username).toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
} 