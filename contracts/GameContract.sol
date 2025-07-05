// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Counters.sol";

contract ChiragsLifeGame is Ownable {
    using Counters for Counters.Counter;

    IERC20 public usdcToken;
    
    // Game state
    struct Player {
        string username;
        uint256 xp;
        uint256 heart;
        uint256 flow;
        uint256 depth;
        uint256 dailyBudget;
        uint256 currentDay;
        bool isActive;
    }
    
    struct GameAction {
        string name;
        uint256 timeCost;
        uint256 usdcCost;
        uint256 xpReward;
        uint256 heartReward;
        uint256 flowReward;
        uint256 depthReward;
        bool requiresSleep;
        bool requiresLuggage;
    }
    
    struct DailyPlan {
        string[] actions;
        uint256 totalTimeUsed;
        uint256 totalUsdcSpent;
        bool isExecuted;
    }
    
    // State variables
    mapping(address => Player) public players;
    mapping(address => DailyPlan) public dailyPlans;
    mapping(string => GameAction) public gameActions;
    
    Counters.Counter private _playerCount;
    Counters.Counter private _gameDay;
    
    uint256 public constant DAILY_BUDGET = 100 * 10**6; // 100 USDC
    uint256 public constant MAX_TIME_SLOTS = 8;
    uint256 public constant SLEEP_TIME_COST = 2;
    
    // Events
    event PlayerRegistered(address indexed player, string username);
    event ActionExecuted(address indexed player, string action, uint256 usdcSpent, uint256 xpGained, uint256 heartGained, uint256 flowGained, uint256 depthGained);
    event DailyPlanSubmitted(address indexed player, string[] actions, uint256 totalTime, uint256 totalUsdc);
    event GameDayAdvanced(uint256 newDay);
    event ShadowCardRevealed(string cardName, string effect);
    
    constructor(address _usdcToken) Ownable(msg.sender) {
        usdcToken = IERC20(_usdcToken);
        _initializeGameActions();
    }
    
    function _initializeGameActions() internal {
        // Work actions
        gameActions["Take PM Call"] = GameAction({
            name: "Take PM Call",
            timeCost: 2,
            usdcCost: 5 * 10**6, // 5 USDC
            xpReward: 3,
            heartReward: 0,
            flowReward: 2,
            depthReward: 0,
            requiresSleep: false,
            requiresLuggage: false
        });
        
        gameActions["Push Code"] = GameAction({
            name: "Push Code",
            timeCost: 3,
            usdcCost: 8 * 10**6, // 8 USDC
            xpReward: 4,
            heartReward: 0,
            flowReward: 3,
            depthReward: 1,
            requiresSleep: false,
            requiresLuggage: false
        });
        
        // Travel actions
        gameActions["Travel to Goa"] = GameAction({
            name: "Travel to Goa",
            timeCost: 4,
            usdcCost: 25 * 10**6, // 25 USDC
            xpReward: 5,
            heartReward: 2,
            flowReward: 0,
            depthReward: 3,
            requiresSleep: false,
            requiresLuggage: true
        });
        
        gameActions["Visa Appointment"] = GameAction({
            name: "Visa Appointment",
            timeCost: 2,
            usdcCost: 15 * 10**6, // 15 USDC
            xpReward: 2,
            heartReward: 0,
            flowReward: 1,
            depthReward: 0,
            requiresSleep: false,
            requiresLuggage: false
        });
        
        // Social actions
        gameActions["Plan Date"] = GameAction({
            name: "Plan Date",
            timeCost: 1,
            usdcCost: 10 * 10**6, // 10 USDC
            xpReward: 2,
            heartReward: 3,
            flowReward: 0,
            depthReward: 1,
            requiresSleep: false,
            requiresLuggage: false
        });
        
        gameActions["Bumble Match"] = GameAction({
            name: "Bumble Match",
            timeCost: 1,
            usdcCost: 5 * 10**6, // 5 USDC
            xpReward: 1,
            heartReward: 2,
            flowReward: 0,
            depthReward: 0,
            requiresSleep: false,
            requiresLuggage: false
        });
        
        // Food actions
        gameActions["Eat at New Place"] = GameAction({
            name: "Eat at New Place",
            timeCost: 2,
            usdcCost: 12 * 10**6, // 12 USDC
            xpReward: 4,
            heartReward: 1,
            flowReward: 0,
            depthReward: 2,
            requiresSleep: false,
            requiresLuggage: false
        });
        
        // Mandatory sleep
        gameActions["Sleep"] = GameAction({
            name: "Sleep",
            timeCost: 2,
            usdcCost: 0,
            xpReward: 0,
            heartReward: 0,
            flowReward: 2,
            depthReward: 0,
            requiresSleep: true,
            requiresLuggage: false
        });
    }
    
    function registerPlayer(string memory username) external {
        require(!players[msg.sender].isActive, "Player already registered");
        require(bytes(username).length > 0, "Username cannot be empty");
        
        players[msg.sender] = Player({
            username: username,
            xp: 0,
            heart: 0,
            flow: 0,
            depth: 0,
            dailyBudget: DAILY_BUDGET,
            currentDay: 1,
            isActive: true
        });
        
        _playerCount.increment();
        emit PlayerRegistered(msg.sender, username);
    }
    
    function submitDailyPlan(string[] memory actions) external {
        require(players[msg.sender].isActive, "Player not registered");
        require(!dailyPlans[msg.sender].isExecuted, "Daily plan already executed");
        
        uint256 totalTime = 0;
        uint256 totalUsdc = 0;
        bool hasSleep = false;
        
        for (uint i = 0; i < actions.length; i++) {
            GameAction memory action = gameActions[actions[i]];
            require(action.timeCost > 0, "Invalid action");
            
            totalTime += action.timeCost;
            totalUsdc += action.usdcCost;
            
            if (action.requiresSleep) {
                hasSleep = true;
            }
        }
        
        require(totalTime <= MAX_TIME_SLOTS, "Exceeds time limit");
        require(hasSleep, "Must include sleep");
        require(totalUsdc <= players[msg.sender].dailyBudget, "Exceeds daily budget");
        
        dailyPlans[msg.sender] = DailyPlan({
            actions: actions,
            totalTimeUsed: totalTime,
            totalUsdcSpent: totalUsdc,
            isExecuted: false
        });
        
        emit DailyPlanSubmitted(msg.sender, actions, totalTime, totalUsdc);
    }
    
    function executeDailyPlan() external {
        require(players[msg.sender].isActive, "Player not registered");
        require(dailyPlans[msg.sender].actions.length > 0, "No daily plan submitted");
        require(!dailyPlans[msg.sender].isExecuted, "Daily plan already executed");
        
        DailyPlan storage plan = dailyPlans[msg.sender];
        Player storage player = players[msg.sender];
        
        // Transfer USDC for the plan
        require(usdcToken.transferFrom(msg.sender, address(this), plan.totalUsdcSpent), "USDC transfer failed");
        
        // Execute each action
        for (uint i = 0; i < plan.actions.length; i++) {
            GameAction memory action = gameActions[plan.actions[i]];
            
            player.xp += action.xpReward;
            player.heart += action.heartReward;
            player.flow += action.flowReward;
            player.depth += action.depthReward;
            
            emit ActionExecuted(
                msg.sender,
                action.name,
                action.usdcCost,
                action.xpReward,
                action.heartReward,
                action.flowReward,
                action.depthReward
            );
        }
        
        plan.isExecuted = true;
        player.currentDay++;
        player.dailyBudget = DAILY_BUDGET; // Reset daily budget
    }
    
    function getPlayerStats(address player) external view returns (uint256 xp, uint256 heart, uint256 flow, uint256 depth, uint256 currentDay) {
        Player memory p = players[player];
        return (p.xp, p.heart, p.flow, p.depth, p.currentDay);
    }
    
    function getGameAction(string memory actionName) external view returns (
        uint256 timeCost,
        uint256 usdcCost,
        uint256 xpReward,
        uint256 heartReward,
        uint256 flowReward,
        uint256 depthReward,
        bool requiresSleep,
        bool requiresLuggage
    ) {
        GameAction memory action = gameActions[actionName];
        return (
            action.timeCost,
            action.usdcCost,
            action.xpReward,
            action.heartReward,
            action.flowReward,
            action.depthReward,
            action.requiresSleep,
            action.requiresLuggage
        );
    }
    
    function getDailyPlan(address player) external view returns (string[] memory actions, uint256 totalTime, uint256 totalUsdc, bool isExecuted) {
        DailyPlan memory plan = dailyPlans[player];
        return (plan.actions, plan.totalTimeUsed, plan.totalUsdcSpent, plan.isExecuted);
    }
    
    // Admin functions
    function advanceGameDay() external onlyOwner {
        _gameDay.increment();
        emit GameDayAdvanced(_gameDay.current());
    }
    
    function revealShadowCard(string memory cardName, string memory effect) external onlyOwner {
        emit ShadowCardRevealed(cardName, effect);
    }
    
    function withdrawUSDC() external onlyOwner {
        uint256 balance = usdcToken.balanceOf(address(this));
        require(balance > 0, "No USDC to withdraw");
        require(usdcToken.transfer(owner(), balance), "USDC transfer failed");
    }
} 