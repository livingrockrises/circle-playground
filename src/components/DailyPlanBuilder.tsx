import React from 'react'
import { GameService } from '../services/gameService'

interface DailyPlanBuilderProps {
  selectedActions: string[]
  onClear: () => void
  onSubmit: () => void
}

export const DailyPlanBuilder: React.FC<DailyPlanBuilderProps> = ({ selectedActions, onClear, onSubmit }) => {
  const validation = GameService.validateDailyPlan(selectedActions)
  const totalTime = selectedActions.reduce((sum, actionName) => {
    const action = GameService.GAME_ACTIONS[actionName]
    return sum + (action?.timeCost || 0)
  }, 0)
  
  const totalCost = selectedActions.reduce((sum, actionName) => {
    const action = GameService.GAME_ACTIONS[actionName]
    return sum + (action?.usdcCost || 0)
  }, 0)

  const hasSleep = selectedActions.some(actionName => 
    GameService.GAME_ACTIONS[actionName]?.requiresSleep
  )

  return (
    <div className="daily-plan-builder">
      <h3>📝 Your Daily Plan</h3>
      
      {selectedActions.length === 0 ? (
        <div className="empty-plan">
          <p>No actions selected yet. Choose actions from above to build your plan.</p>
        </div>
      ) : (
        <>
          <div className="plan-summary">
            <div className="plan-stats">
              <div className="stat-item">
                <span className="stat-label">⏰ Time Used:</span>
                <span className={`stat-value ${totalTime > 8 ? 'error' : ''}`}>
                  {totalTime}/8 slots
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">💰 Total Cost:</span>
                <span className={`stat-value ${totalCost > 100 ? 'error' : ''}`}>
                  {GameService.formatUSDC(totalCost)}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">😴 Sleep:</span>
                <span className={`stat-value ${hasSleep ? 'success' : 'error'}`}>
                  {hasSleep ? '✓ Included' : '✗ Missing'}
                </span>
              </div>
            </div>
            
            <div className="selected-actions">
              <h4>Selected Actions:</h4>
              <div className="action-list">
                {selectedActions.map((actionName, index) => {
                  const action = GameService.GAME_ACTIONS[actionName]
                  return (
                    <div key={index} className="selected-action">
                      <span className="action-emoji">
                        {GameService.getActionEmoji(action?.category || 'work')}
                      </span>
                      <span className="action-name">{actionName}</span>
                      <span className="action-time">({action?.timeCost} slots)</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          
          {!validation.isValid && (
            <div className="validation-errors">
              <h4>⚠️ Plan Issues:</h4>
              <ul>
                {validation.errors.map((error, index) => (
                  <li key={index} className="error-item">{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="plan-actions">
            <button onClick={onClear} className="clear-btn">
              Clear Plan
            </button>
            <button 
              onClick={onSubmit} 
              disabled={!validation.isValid}
              className="submit-btn"
            >
              Submit Plan
            </button>
          </div>
        </>
      )}
    </div>
  )
} 