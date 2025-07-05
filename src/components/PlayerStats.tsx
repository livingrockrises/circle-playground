import React from 'react'
import type { PlayerStats as GamePlayerStats } from '../services/gameService'

interface PlayerStatsProps {
  stats: GamePlayerStats
}

export const PlayerStats: React.FC<PlayerStatsProps> = ({ stats }) => {
  return (
    <div className="player-stats">
      <h3>📊 Your Stats</h3>
      
      <div className="stats-grid">
        <div className="stat-card xp">
          <div className="stat-icon">💼</div>
          <div className="stat-content">
            <div className="stat-label">XP</div>
            <div className="stat-value">{stats.xp}</div>
            <div className="stat-description">Experience Points</div>
          </div>
        </div>
        
        <div className="stat-card heart">
          <div className="stat-icon">💕</div>
          <div className="stat-content">
            <div className="stat-label">Heart</div>
            <div className="stat-value">{stats.heart}</div>
            <div className="stat-description">Human Connection</div>
          </div>
        </div>
        
        <div className="stat-card flow">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <div className="stat-label">Flow</div>
            <div className="stat-value">{stats.flow}</div>
            <div className="stat-description">Productivity</div>
          </div>
        </div>
        
        <div className="stat-card depth">
          <div className="stat-icon">🌟</div>
          <div className="stat-content">
            <div className="stat-label">Depth</div>
            <div className="stat-value">{stats.depth}</div>
            <div className="stat-description">Life Experience</div>
          </div>
        </div>
      </div>
      
      <div className="game-progress">
        <div className="progress-item">
          <span className="progress-label">Current Day:</span>
          <span className="progress-value">{stats.currentDay}</span>
        </div>
        <div className="progress-item">
          <span className="progress-label">Daily Budget:</span>
          <span className="progress-value">{stats.dailyBudget} USDC</span>
        </div>
      </div>
    </div>
  )
} 