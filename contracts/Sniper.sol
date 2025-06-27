// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IPancakeRouter01.sol";

contract Sniper is Ownable, ReentrancyGuard {
  address public immutable PANCAKE_ROUTER_ADDRESS = 0x10ED43C718714eb63d5aA57B78B54704E256024E;
  address public immutable WETH = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;

  constructor() Ownable(msg.sender) {}

  function swapEthForExactTokens(
    uint amountOut,
    address[] calldata path,
    address to,
    uint deadline
  ) external payable returns (uint[] memory amounts) {
    require(path[0] == WETH, "Sniper: INVALID_PATH");

    return IPancakeRouter01(PANCAKE_ROUTER_ADDRESS).swapExactETHForTokens{value: msg.value}(
      amountOut,
      path,
      to,
      deadline
    );
  }

  function addLiquidity(
    address tokenA,
    address tokenB,
    uint amountADesired,
    uint amountBDesired,
    uint amountAMin,
    uint amountBMin,
    address to,
    uint deadline
  ) external returns (uint amountA, uint amountB, uint liquidity) {
    return IPancakeRouter01(PANCAKE_ROUTER_ADDRESS).addLiquidity(
        tokenA,
        tokenB,
        amountADesired,
        amountBDesired,
        amountAMin,
        amountBMin,
        to,
        deadline
      );
  }

  /**
   * @dev Swaps ETH for tokens and adds a percentage of swapped tokens back to liquidity
   * @param amountOut Minimum amount of tokens to receive from swap
   * @param path Array of token addresses for the swap path
   * @param liquidityPercent Percentage of swapped tokens to add back to liquidity (0-10000, where 10000 = 100%)
   * @param ethForLiquidity Amount of ETH to use for adding liquidity
   * @param amountAMin Minimum amount of token A for liquidity
   * @param amountBMin Minimum amount of token B for liquidity
   * @param to Address to receive remaining tokens and liquidity LP tokens
   * @param deadline Transaction deadline
   * @return amounts Array of amounts from the swap
   * @return liquidity Amount of LP tokens received
   */
  function swapAndAddLiquidity(
    uint amountOut,
    address[] calldata path,
    uint16 liquidityPercent,
    uint ethForLiquidity,
    uint amountAMin,
    uint amountBMin,
    address to,
    uint deadline
  ) external payable nonReentrant returns (uint[] memory amounts, uint liquidity) {
    require(path[0] == WETH, "Sniper: INVALID_PATH");
    require(path.length >= 2, "Sniper: INVALID_PATH_LENGTH");
    require(liquidityPercent <= 10000, "Sniper: INVALID_PERCENTAGE");
    require(ethForLiquidity <= msg.value, "Sniper: INSUFFICIENT_ETH_FOR_LIQUIDITY");
    require(to != address(0), "Sniper: INVALID_RECIPIENT");
    require(deadline > block.timestamp, "Sniper: EXPIRED_DEADLINE");

    // Step 1: Swap ETH for tokens
    amounts = IPancakeRouter01(PANCAKE_ROUTER_ADDRESS).swapExactETHForTokens{value: msg.value - ethForLiquidity}(
      amountOut,
      path,
      address(this), // Send tokens to this contract first
      deadline
    );

    // Step 2: Calculate and handle liquidity
    if (liquidityPercent > 0) {
      uint tokensForLiquidity = (amounts[amounts.length - 1] * liquidityPercent) / 10000;
      
      if (tokensForLiquidity > 0) {
        // Approve router to spend tokens
        IERC20(path[path.length - 1]).approve(PANCAKE_ROUTER_ADDRESS, tokensForLiquidity);
        
        // Add liquidity
        (,, liquidity) = IPancakeRouter01(PANCAKE_ROUTER_ADDRESS).addLiquidity(
          WETH,
          path[path.length - 1],
          ethForLiquidity,
          tokensForLiquidity,
          amountAMin,
          amountBMin,
          to, // Send LP tokens directly to user
          deadline
        );
        
        // Revoke approval
        IERC20(path[path.length - 1]).approve(PANCAKE_ROUTER_ADDRESS, 0);
        
        // Send remaining tokens to user
        uint tokensToUser = amounts[amounts.length - 1] - tokensForLiquidity;
        if (tokensToUser > 0) {
          IERC20(path[path.length - 1]).transfer(to, tokensToUser);
        }
      } else {
        // Send all tokens to user if no liquidity to add
        IERC20(path[path.length - 1]).transfer(to, amounts[amounts.length - 1]);
      }
    } else {
      // Send all tokens to user if no liquidity percentage
      IERC20(path[path.length - 1]).transfer(to, amounts[amounts.length - 1]);
    }
  }

  // Emergency withdraw
  function emergencyWithdraw(address token, uint amount) external onlyOwner nonReentrant {
    require(token != address(0), "Sniper: INVALID_TOKEN");
    require(amount > 0, "Sniper: INVALID_AMOUNT");
    require(IERC20(token).balanceOf(address(this)) >= amount, "Sniper: INSUFFICIENT_BALANCE");

    if (token == address(0)) {
      payable(msg.sender).transfer(amount);
    } else {
      IERC20(token).transfer(msg.sender, amount);
    }
  }

  // Allow receiving ETH
  receive() external payable {}
}
