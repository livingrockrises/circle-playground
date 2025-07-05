import React from 'react'
import type { ShadowCard } from '../services/gameService'

interface ShadowCardRevealProps {
  card: ShadowCard
}

export const ShadowCardReveal: React.FC<ShadowCardRevealProps> = ({ card }) => {
  const getCardEmoji = (type: ShadowCard['type']) => {
    switch (type) {
      case 'positive':
        return '✨'
      case 'negative':
        return '🌚'
      case 'neutral':
        return '🌫️'
      default:
        return '🎴'
    }
  }

  const getCardClass = (type: ShadowCard['type']) => {
    switch (type) {
      case 'positive':
        return 'positive'
      case 'negative':
        return 'negative'
      case 'neutral':
        return 'neutral'
      default:
        return ''
    }
  }

  return (
    <div className={`shadow-card-reveal ${getCardClass(card.type)}`}>
      <div className="card-header">
        <span className="card-emoji">{getCardEmoji(card.type)}</span>
        <h3 className="card-title">Shadow Card: {card.name}</h3>
      </div>
      
      <div className="card-content">
        <p className="card-effect">{card.effect}</p>
        
        <div className="card-type">
          <span className="type-label">Type:</span>
          <span className={`type-value ${card.type}`}>
            {card.type.charAt(0).toUpperCase() + card.type.slice(1)}
          </span>
        </div>
      </div>
      
      <div className="card-footer">
        <p className="card-hint">
          💡 This card affects all players' plans for today!
        </p>
      </div>
    </div>
  )
} 