export const ChiragsLifeGameABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_usdcToken",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "action",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "usdcSpent",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "xpGained",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "heartGained",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "flowGained",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "depthGained",
        "type": "uint256"
      }
    ],
    "name": "ActionExecuted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string[]",
        "name": "actions",
        "type": "string[]"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalTime",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalUsdc",
        "type": "uint256"
      }
    ],
    "name": "DailyPlanSubmitted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newDay",
        "type": "uint256"
      }
    ],
    "name": "GameDayAdvanced",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "username",
        "type": "string"
      }
    ],
    "name": "PlayerRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "cardName",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "effect",
        "type": "string"
      }
    ],
    "name": "ShadowCardRevealed",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "DAILY_BUDGET",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_TIME_SLOTS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "SLEEP_TIME_COST",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "advanceGameDay",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "getDailyPlan",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string[]",
            "name": "actions",
            "type": "string[]"
          },
          {
            "internalType": "uint256",
            "name": "totalTimeUsed",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalUsdcSpent",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isExecuted",
            "type": "bool"
          }
        ],
        "internalType": "struct ChiragsLifeGame.DailyPlan",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "actionName",
        "type": "string"
      }
    ],
    "name": "getGameAction",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "timeCost",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "usdcCost",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "xpReward",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "heartReward",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "flowReward",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "depthReward",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "requiresSleep",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "requiresLuggage",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "getPlayerStats",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "xp",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "heart",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "flow",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "depth",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "currentDay",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "players",
    "outputs": [
      {
        "internalType": "string",
        "name": "username",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "xp",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "heart",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "flow",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "depth",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "dailyBudget",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "currentDay",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isActive",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "username",
        "type": "string"
      }
    ],
    "name": "registerPlayer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "cardName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "effect",
        "type": "string"
      }
    ],
    "name": "revealShadowCard",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string[]",
        "name": "actions",
        "type": "string[]"
      }
    ],
    "name": "submitDailyPlan",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "usdcToken",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdrawUSDC",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "executeDailyPlan",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const 