// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IWETH.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IPancakeRouter01.sol";

contract Sniper is Ownable, ReentrancyGuard {
  address public immutable PANCAKE_ROUTER_ADDRESS = 0x10ED43C718714eb63d5aA57B78B54704E256024E;
  address public immutable WETH = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;

  constructor() Ownable(msg.sender) {}

  function swapEthForExactTokens(
    uint amountEth,
    uint amountOutMin,
    address[] calldata path,
    uint deadline
  ) external payable nonReentrant onlyOwner returns (uint[] memory amounts) {
    require(path[0] == WETH, "Sniper: INVALID_PATH");

    return IPancakeRouter01(PANCAKE_ROUTER_ADDRESS).swapExactETHForTokens{value: amountEth}(
      amountOutMin,
      path,
      address(this), // received by this contract
      deadline
    );
  }

  function addLiquidity(
    address tokenB,
    uint amountEthDesired,
    uint amountBDesired,
    uint deadline
  ) external returns (uint amountA, uint amountB, uint liquidity) {
    IWETH(WETH).deposit{value: amountEthDesired}();

    // Approve router to spend WETH
    IERC20(WETH).approve(PANCAKE_ROUTER_ADDRESS, amountEthDesired);
    
    // Approve router to spend tokenB
    IERC20(tokenB).approve(PANCAKE_ROUTER_ADDRESS, amountBDesired);

    return IPancakeRouter01(PANCAKE_ROUTER_ADDRESS).addLiquidity(
        WETH,
        tokenB,
        amountEthDesired,
        amountBDesired,
        0,
        0,
        address(this), // received by this contract
        deadline
      );
  }

  function swapAndAddLiquidity(
    uint amountEth,
    uint amountOutMin,
    address[] calldata path,
    uint liquidityPercentage,
    uint deadline
  ) external payable nonReentrant onlyOwner returns (uint[] memory amounts, uint liquidity) {
    require(path[0] == WETH, "Sniper: INVALID_PATH");
    require(path.length == 2, "Sniper: SINGLE_HOP_ONLY");
    require(liquidityPercentage > 0 && liquidityPercentage <= 100, "Sniper: INVALID_LIQUIDITY_PERCENTAGE");
    require(msg.value >= amountEth, "Sniper: INSUFFICIENT_ETH");

    address tokenB = path[1];

    // Step 1: Swap ETH for tokens
    uint[] memory swapAmounts = IPancakeRouter01(PANCAKE_ROUTER_ADDRESS).swapExactETHForTokens{value: amountEth}(
      amountOutMin,
      path,
      address(this), // received by this contract
      deadline
    );

    uint tokensReceived = swapAmounts[1];

    // Step 2: Calculate amounts for liquidity based on percentage
    uint ethForLiquidity = (amountEth * liquidityPercentage) / 100;
    uint tokensForLiquidity = (tokensReceived * liquidityPercentage) / 100;

    // Step 3: Add liquidity
    IWETH(WETH).deposit{value: ethForLiquidity}();

    // Approve router to spend WETH
    IERC20(WETH).approve(PANCAKE_ROUTER_ADDRESS, ethForLiquidity);
    
    // Approve router to spend tokenB
    IERC20(tokenB).approve(PANCAKE_ROUTER_ADDRESS, tokensForLiquidity);

    (uint amountA, uint amountB, uint liquidityAmount) = IPancakeRouter01(PANCAKE_ROUTER_ADDRESS).addLiquidity(
      WETH,
      tokenB,
      ethForLiquidity,
      tokensForLiquidity,
      0, // slippage tolerance for amountA
      0, // slippage tolerance for amountB
      address(this), // LP tokens received by this contract
      deadline
    );

    return (swapAmounts, liquidityAmount);
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
