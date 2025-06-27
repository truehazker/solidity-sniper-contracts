# Solidity Sniper Contracts

A collection of smart contracts for automated trading and liquidity management on PancakeSwap.

## Features

- **Swap ETH for Tokens**: Direct ETH to token swaps via PancakeSwap
- **Add Liquidity**: Add liquidity to token pairs
- **Swap and Add Liquidity**: Combined function to swap ETH for tokens and add a percentage back to liquidity
- **Emergency Withdrawal**: Owner-only function to withdraw stuck tokens

## Contracts

### Sniper.sol

The main contract that provides trading and liquidity management functionality.

#### Functions

##### `swapEthForExactTokens`
Swaps ETH for a minimum amount of tokens.

```solidity
function swapEthForExactTokens(
    uint amountOut,
    address[] calldata path,
    address to,
    uint deadline
) external payable returns (uint[] memory amounts)
```

##### `addLiquidity`
Adds liquidity to a token pair.

```solidity
function addLiquidity(
    address tokenA,
    address tokenB,
    uint amountADesired,
    uint amountBDesired,
    uint amountAMin,
    uint amountBMin,
    address to,
    uint deadline
) external returns (uint amountA, uint amountB, uint liquidity)
```

##### `swapAndAddLiquidity` ⭐ NEW
Swaps ETH for tokens and adds a percentage of those tokens back to liquidity in a single transaction.

```solidity
function swapAndAddLiquidity(
    uint amountOut,
    address[] calldata path,
    uint16 liquidityPercent,
    uint ethForLiquidity,
    uint amountAMin,
    uint amountBMin,
    address to,
    uint deadline
) external payable nonReentrant returns (uint[] memory amounts, uint liquidity)
```

**Parameters:**
- `amountOut`: Minimum amount of tokens to receive from swap
- `path`: Array of token addresses for the swap path (must start with WETH)
- `liquidityPercent`: Percentage of swapped tokens to add back to liquidity (0-10000, where 10000 = 100%)
- `ethForLiquidity`: Amount of ETH to use for adding liquidity
- `amountAMin`: Minimum amount of ETH for liquidity
- `amountBMin`: Minimum amount of tokens for liquidity
- `to`: Address to receive remaining tokens and liquidity LP tokens
- `deadline`: Transaction deadline timestamp

**Returns:**
- `amounts`: Array of amounts from the swap
- `liquidity`: Amount of LP tokens received

**Usage Examples:**

1. **Swap only (0% liquidity):**
```solidity
// Swap 0.1 ETH for BUSD, no liquidity added
sniper.swapAndAddLiquidity(
    100e18,           // amountOut: 100 BUSD minimum
    [WETH, BUSD],     // path: WETH -> BUSD
    0,                // liquidityPercent: 0%
    0,                // ethForLiquidity: 0 ETH
    0,                // amountAMin: 0
    0,                // amountBMin: 0
    userAddress,      // to: user address
    deadline,         // deadline
    { value: 0.1e18 } // msg.value: 0.1 ETH
);
```

2. **50% liquidity:**
```solidity
// Swap 0.05 ETH for BUSD, use 0.05 ETH + 50% of received tokens for liquidity
sniper.swapAndAddLiquidity(
    100e18,           // amountOut: 100 BUSD minimum
    [WETH, BUSD],     // path: WETH -> BUSD
    5000,             // liquidityPercent: 50%
    0.05e18,          // ethForLiquidity: 0.05 ETH
    0.04e18,          // amountAMin: 0.04 ETH minimum
    45e18,            // amountBMin: 45 BUSD minimum
    userAddress,      // to: user address
    deadline,         // deadline
    { value: 0.1e18 } // msg.value: 0.1 ETH total
);
```

3. **100% liquidity:**
```solidity
// Swap 0.05 ETH for BUSD, use 0.05 ETH + 100% of received tokens for liquidity
sniper.swapAndAddLiquidity(
    100e18,           // amountOut: 100 BUSD minimum
    [WETH, BUSD],     // path: WETH -> BUSD
    10000,            // liquidityPercent: 100%
    0.05e18,          // ethForLiquidity: 0.05 ETH
    0.04e18,          // amountAMin: 0.04 ETH minimum
    45e18,            // amountBMin: 45 BUSD minimum
    userAddress,      // to: user address
    deadline,         // deadline
    { value: 0.1e18 } // msg.value: 0.1 ETH total
);
```

##### `emergencyWithdraw`
Owner-only function to withdraw stuck tokens or ETH.

```solidity
function emergencyWithdraw(address token, uint amount) external onlyOwner nonReentrant
```

## How It Works

### swapAndAddLiquidity Function Flow

1. **Validation**: Checks path validity, percentage range, ETH amounts, and deadline
2. **Swap**: Swaps `msg.value - ethForLiquidity` ETH for tokens via PancakeSwap
3. **Calculate**: Determines how many tokens to use for liquidity based on `liquidityPercent`
4. **Add Liquidity**: If percentage > 0, adds liquidity using `ethForLiquidity` ETH and calculated tokens
5. **Transfer**: Sends remaining tokens to the user

### Key Features

- **Flexible Percentage**: Choose any percentage from 0% to 100% for liquidity
- **Gas Efficient**: Single transaction for both swap and liquidity addition
- **Safe**: Includes reentrancy protection and comprehensive validation
- **User-Friendly**: Tokens are automatically approved and managed by the contract

## Deployment

The contract is configured for BSC (Binance Smart Chain) with PancakeSwap V2 router.

### Addresses
- **PancakeSwap Router**: `0x10ED43C718714eb63d5aA57B78B54704E256024E`
- **WETH (WBNB)**: `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c`

## Testing

Run the test suite:

```bash
npm test
```

The tests cover:
- Parameter validation
- Percentage calculations
- ETH distribution
- Error conditions
- Access control

## Security

- Uses OpenZeppelin's `Ownable` and `ReentrancyGuard` for security
- Comprehensive input validation
- Automatic token approval management
- Emergency withdrawal functionality for stuck tokens

## License

UNLICENSED
