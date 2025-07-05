import React from 'react'
import type { GameAction } from '../services/gameService'
import { GameService } from '../services/gameService'

interface GameActionCardProps {
  action: GameAction
  isSelected: boolean
  onSelect: (actionName: string) => void
}

export const GameActionCard: React.FC<GameActionCardProps> = ({ action, isSelected, onSelect }) => {
  const handleClick = () => {
    onSelect(action.name)
  }

  return (
    <div 
      className={`game-action-card ${isSelected ? 'selected' : ''} ${action.category}`}
      onClick={handleClick}
    >
      <div className="action-header">
        <span className="action-emoji">{GameService.getActionEmoji(action.category)}</span>
        <h3 className="action-name">{action.name}</h3>
      </div>
      
      <p className="action-description">{action.description}</p>
      
      <div className="action-costs">
        <div className="cost-item">
          <span className="cost-label">⏰ Time:</span>
          <span className="cost-value">{action.timeCost} slots</span>
        </div>
        <div className="cost-item">
          <span className="cost-label">💰 Cost:</span>
          <span className="cost-value">{GameService.formatUSDC(action.usdcCost)}</span>
        </div>
      </div>
      
      <div className="action-rewards">
        <div className="reward-item">
          <span className="reward-label">💼 XP:</span>
          <span className="reward-value">+{action.xpReward}</span>
        </div>
        <div className="reward-item">
          <span className="reward-label">💕 Heart:</span>
          <span className="reward-value">+{action.heartReward}</span>
        </div>
        <div className="reward-item">
          <span className="reward-label">⚡ Flow:</span>
          <span className="reward-value">+{action.flowReward}</span>
        </div>
        <div className="reward-item">
          <span className="reward-label">🌟 Depth:</span>
          <span className="reward-value">+{action.depthReward}</span>
        </div>
      </div>
      
      {action.requiresLuggage && (
        <div className="action-requirement luggage">
          🧳 Requires luggage
        </div>
      )}
      
      {action.requiresSleep && (
        <div className="action-requirement sleep">
          😴 Mandatory sleep
        </div>
      )}
    </div>
  )
} 