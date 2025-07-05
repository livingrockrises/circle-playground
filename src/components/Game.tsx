import React, { useState, useEffect } from 'react'
import { GameService } from '../services/gameService'
import type { GameAction, PlayerStats as GamePlayerStats, DailyPlan, ShadowCard } from '../services/gameService'
import { GameActionCard } from './GameActionCard'
import { DailyPlanBuilder } from './DailyPlanBuilder'
import { PlayerStats } from './PlayerStats'
import { ShadowCardReveal } from './ShadowCardReveal'

interface GameProps {
  walletState: any
  onBackToPayments: () => void
}

export const Game: React.FC<GameProps> = ({ walletState, onBackToPayments }) => {
  const [gamePhase, setGamePhase] = useState<'planning' | 'execution' | 'completed'>('planning')
  const [currentMotivations, setCurrentMotivations] = useState<GameAction[]>([])
  const [selectedActions, setSelectedActions] = useState<string[]>([])
  const [playerStats, setPlayerStats] = useState<GamePlayerStats | null>(null)
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null)
  const [shadowCard, setShadowCard] = useState<ShadowCard | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize game when component mounts
  useEffect(() => {
    if (walletState.user?.walletAddress) {
      initializeGame()
    }
  }, [walletState.user?.walletAddress])

  const initializeGame = async () => {
    setLoading(true)
    setError(null)

    try {
      // Always try to register the player first
      if (!walletState.smartAccount || !walletState.bundlerClient) {
        setError('Wallet not connected')
        return
      }
      
      console.log('Registering player:', walletState.user.username)
      const registered = await GameService.registerPlayer(walletState.user.username, walletState.smartAccount, walletState.bundlerClient)
      if (!registered) {
        setError('Failed to register player')
        return
      }
      
      console.log('Player registered successfully')

      // Wait a moment for the transaction to be processed
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Get player stats
      const updatedStats = await GameService.getPlayerStats(walletState.user.walletAddress)
      setPlayerStats(updatedStats)

      // Get current daily plan
      const plan = await GameService.getDailyPlan(walletState.user.walletAddress)
      setDailyPlan(plan)

      // Generate new motivations for the day
      const motivations = GameService.getRandomMotivations(6)
      setCurrentMotivations(motivations)

      // Draw shadow card
      const card = GameService.drawShadowCard()
      setShadowCard(card)

      setGamePhase('planning')
    } catch (err) {
      setError('Failed to initialize game')
      console.error('Game initialization error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleActionSelect = (actionName: string) => {
    setSelectedActions(prev => {
      const isSelected = prev.includes(actionName)
      if (isSelected) {
        return prev.filter(name => name !== actionName)
      } else {
        return [...prev, actionName]
      }
    })
  }

  const handleSubmitPlan = async () => {
    if (!walletState.smartAccount || !walletState.bundlerClient) {
      setError('Wallet not connected')
      return
    }

    const validation = GameService.validateDailyPlan(selectedActions)
    if (!validation.isValid) {
      setError(validation.errors.join(', '))
      return
    }

    setLoading(true)
    setError(null)

    try {
      const success = await GameService.submitDailyPlan(selectedActions, walletState.smartAccount, walletState.bundlerClient)
      if (success) {
        setGamePhase('execution')
        // Update daily plan
        const plan = await GameService.getDailyPlan(walletState.user.walletAddress)
        setDailyPlan(plan)
      } else {
        setError('Failed to submit plan')
      }
    } catch (err) {
      setError('Failed to submit plan')
      console.error('Plan submission error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExecutePlan = async () => {
    if (!walletState.smartAccount || !walletState.bundlerClient) {
      setError('Wallet not connected')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const success = await GameService.executeDailyPlan(walletState.smartAccount, walletState.bundlerClient)
      if (success) {
        setGamePhase('completed')
        // Refresh player stats
        const stats = await GameService.getPlayerStats(walletState.user.walletAddress)
        setPlayerStats(stats)
      } else {
        setError('Failed to execute plan')
      }
    } catch (err) {
      setError('Failed to execute plan')
      console.error('Plan execution error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleNewDay = () => {
    setSelectedActions([])
    setDailyPlan(null)
    setShadowCard(null)
    initializeGame()
  }

  if (loading) {
    return (
      <div className="game-loading">
        <div className="loading-spinner">🎮</div>
        <p>Loading Chirag's Life...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="game-error">
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={initializeGame} className="retry-btn">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="game-container">
      <header className="game-header">
        <button onClick={onBackToPayments} className="back-btn">
          ← Back to Payments
        </button>
        <h1>🎮 Chirag's Life</h1>
        <p>Plan Chirag's day and earn points!</p>
      </header>

      <div className="game-content">
        {/* Player Stats */}
        {playerStats && (
          <PlayerStats stats={playerStats} />
        )}

        {/* Shadow Card */}
        {shadowCard && gamePhase === 'planning' && (
          <ShadowCardReveal card={shadowCard} />
        )}

        {/* Game Phase Content */}
        {gamePhase === 'planning' && (
          <div className="planning-phase">
            <h2>📋 Plan Your Day</h2>
            <p>Choose actions to fill 8 time slots. Don't forget to include sleep!</p>
            
            <div className="motivations-grid">
              {currentMotivations.map((action) => (
                <GameActionCard
                  key={action.name}
                  action={action}
                  isSelected={selectedActions.includes(action.name)}
                  onSelect={handleActionSelect}
                />
              ))}
            </div>

            <DailyPlanBuilder
              selectedActions={selectedActions}
              onClear={() => setSelectedActions([])}
              onSubmit={handleSubmitPlan}
            />
          </div>
        )}

        {gamePhase === 'execution' && (
          <div className="execution-phase">
            <h2>⚡ Execute Your Plan</h2>
            <p>Ready to live Chirag's day?</p>
            
            {dailyPlan && (
              <div className="plan-summary">
                <h3>Your Plan:</h3>
                <div className="plan-actions">
                  {dailyPlan.actions.map((action, index) => (
                    <div key={index} className="plan-action">
                      {GameService.getActionEmoji(GameService.GAME_ACTIONS[action]?.category || 'work')} {action}
                    </div>
                  ))}
                </div>
                <div className="plan-costs">
                  <p>Time: {dailyPlan.totalTimeUsed}/8 slots</p>
                  <p>Cost: {GameService.formatUSDC(dailyPlan.totalUsdcSpent)}</p>
                </div>
              </div>
            )}

            <button onClick={handleExecutePlan} className="execute-btn">
              Execute Plan
            </button>
          </div>
        )}

        {gamePhase === 'completed' && (
          <div className="completed-phase">
            <h2>🎉 Day Complete!</h2>
            <p>Chirag lived another day. Here's what happened:</p>
            
            {dailyPlan && (
              <div className="results">
                <h3>Results:</h3>
                <div className="score-breakdown">
                  {(() => {
                    const score = GameService.calculatePlanScore(dailyPlan.actions)
                    return (
                      <>
                        <div className="score-item">💼 XP: +{score.xp}</div>
                        <div className="score-item">💕 Heart: +{score.heart}</div>
                        <div className="score-item">⚡ Flow: +{score.flow}</div>
                        <div className="score-item">🌟 Depth: +{score.depth}</div>
                      </>
                    )
                  })()}
                </div>
              </div>
            )}

            <button onClick={handleNewDay} className="new-day-btn">
              Start New Day
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 