// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.11;

interface IL1GatewayRouter {
  function inbox() external view returns (address);
}