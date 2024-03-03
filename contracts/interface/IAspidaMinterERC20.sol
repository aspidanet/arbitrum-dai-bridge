// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.11;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IAspidaMinterERC20 is IERC20 {
  function _setMinterCap(address _minter, uint256 _mintCap) external;
  function mintCap(address _minter) external view returns (uint256);
  function mintAmount(address _minter) external view returns (uint256);
}
