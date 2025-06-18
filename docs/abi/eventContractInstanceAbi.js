export const eventContractInstanceAbi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_platformWallet",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "instance",
        type: "address",
      },
    ],
    name: "CreateInstance",
    type: "event",
  },
  {
    inputs: [],
    name: "IMPLEMENTATION",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ipfsMetadataHash",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_salt",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "_stakeToken",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_engagementDeadline",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_resolutionDeadline",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_creatorFee",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_predictionCount",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "_ipfsMetadataHash",
        type: "string",
      },
    ],
    name: "createInstance",
    outputs: [
      {
        internalType: "address",
        name: "instance",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_salt",
        type: "bytes32",
      },
    ],
    name: "predictInstance",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
]
