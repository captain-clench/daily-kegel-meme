export const DailyKegelABI = [
  // Read functions
  {
    inputs: [],
    name: "startTime",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "cooldown",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalPool",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "userData",
    outputs: [
      { name: "checkinCount", type: "uint256" },
      { name: "donationTotal", type: "uint256" },
      { name: "lastCheckinTime", type: "uint256" },
      { name: "currentCombo", type: "uint256" },
      { name: "comboStartBlock", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "canCheckIn",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "nextCheckinTime",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "comboDeadline",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getCheckinLeaderboard",
    outputs: [
      {
        components: [
          { name: "user", type: "address" },
          { name: "value", type: "uint256" },
        ],
        type: "tuple[50]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getDonationLeaderboard",
    outputs: [
      {
        components: [
          { name: "user", type: "address" },
          { name: "value", type: "uint256" },
        ],
        type: "tuple[50]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getComboLeaderboard",
    outputs: [
      {
        components: [
          { name: "user", type: "address" },
          { name: "startBlock", type: "uint256" },
          { name: "comboCount", type: "uint256" },
        ],
        type: "tuple[50]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  // Write functions
  {
    inputs: [{ name: "donation", type: "uint256" }],
    name: "checkIn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "donation", type: "uint256" },
      { indexed: false, name: "checkinCount", type: "uint256" },
      { indexed: false, name: "combo", type: "uint256" },
      { indexed: false, name: "comboStartBlock", type: "uint256" },
    ],
    name: "CheckIn",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "startBlock", type: "uint256" },
      { indexed: false, name: "comboCount", type: "uint256" },
      { indexed: false, name: "endTime", type: "uint256" },
    ],
    name: "ComboEnded",
    type: "event",
  },
] as const;
