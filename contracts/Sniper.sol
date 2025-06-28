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
