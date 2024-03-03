// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2021 Dai Foundation
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

pragma solidity ^0.6.11;

import "@openzeppelin/contracts/proxy/Initializable.sol";
import "./L1CrossDomainEnabled.sol";
import "./L1ITokenGateway.sol";
import "../l2/L2ITokenGateway.sol";

interface IAspidaERC20 {
  function transferFrom(
    address _from,
    address _to,
    uint256 _value
  ) external returns (bool success);
}

contract L1AspidaERC20Gateway is Initializable, L1CrossDomainEnabled, L1ITokenGateway {
  // --- Auth ---
  mapping(address => uint256) public wards;

  function rely(address usr) external auth {
    wards[usr] = 1;
    emit Rely(usr);
  }

  function deny(address usr) external auth {
    wards[usr] = 0;
    emit Deny(usr);
  }

  modifier auth() {
    require(wards[msg.sender] == 1, "L1AspidaERC20Gateway/not-authorized");
    _;
  }

  event Rely(address indexed usr);
  event Deny(address indexed usr);

  address public l1AspidaERC20;
  address public l2AspidaERC20;
  address public l1Escrow;
  address public l1Router;
  address public l2Counterpart;
  uint256 public isOpen;

  event Closed();

  constructor(
    address _l2Counterpart,
    address _l1Router,
    address _inbox,
    address _l1AspidaERC20,
    address _l2AspidaERC20,
    address _l1Escrow
  ) public {
    initialize(_l2Counterpart, _l1Router, _inbox, _l1AspidaERC20, _l2AspidaERC20, _l1Escrow);
  }

  function initialize(
    address _l2Counterpart,
    address _l1Router,
    address _inbox,
    address _l1AspidaERC20,
    address _l2AspidaERC20,
    address _l1Escrow
  ) public initializer {
    isOpen = 1;
    wards[msg.sender] = 1;
    emit Rely(msg.sender);

    l1AspidaERC20 = _l1AspidaERC20;
    l2AspidaERC20 = _l2AspidaERC20;
    l1Escrow = _l1Escrow;
    l1Router = _l1Router;
    l2Counterpart = _l2Counterpart;

    __CrossDomainEnabled_init(_inbox);
  }

  function close() external auth {
    isOpen = 0;

    emit Closed();
  }

  function outboundTransfer(
    address l1Token,
    address to,
    uint256 amount,
    uint256 maxGas,
    uint256 gasPriceBid,
    bytes calldata data
  ) external payable override returns (bytes memory) {
    // do not allow initiating new xchain messages if bridge is closed
    require(isOpen == 1, "L1AspidaERC20Gateway/closed");
    require(l1Token == l1AspidaERC20, "L1AspidaERC20Gateway/token-not-AspidaERC20");

    // we use nested scope to avoid stack too deep errors
    address from;
    uint256 seqNum;
    bytes memory extraData;
    {
      uint256 maxSubmissionCost;
      (from, maxSubmissionCost, extraData) = parseOutboundData(data);
      // require(extraData.length == 0, "L1AspidaERC20Gateway/call-hook-data-not-allowed");

      IAspidaERC20(l1Token).transferFrom(from, l1Escrow, amount);

      bytes memory outboundCalldata = getOutboundCalldata(l1Token, from, to, amount, extraData);
      seqNum = sendTxToL2(
        l2Counterpart,
        from,
        maxSubmissionCost,
        maxGas,
        gasPriceBid,
        outboundCalldata
      );
    }

    emit DepositInitiated(l1Token, from, to, seqNum, amount);

    return abi.encode(seqNum);
  }

  function getOutboundCalldata(
    address l1Token,
    address from,
    address to,
    uint256 amount,
    bytes memory data
  ) public pure returns (bytes memory outboundCalldata) {
    bytes memory emptyBytes = "";

    outboundCalldata = abi.encodeWithSelector(
      L2ITokenGateway.finalizeInboundTransfer.selector,
      l1Token,
      from,
      to,
      amount,
      abi.encode(emptyBytes, data)
    );

    return outboundCalldata;
  }

  function finalizeInboundTransfer(
    address l1Token,
    address from,
    address to,
    uint256 amount,
    bytes calldata data
  ) external override onlyL2Counterpart(l2Counterpart) {
    require(l1Token == l1AspidaERC20, "L1AspidaERC20Gateway/token-not-AspidaERC20");
    (uint256 exitNum, ) = abi.decode(data, (uint256, bytes));

    IAspidaERC20(l1Token).transferFrom(l1Escrow, to, amount);

    emit WithdrawalFinalized(l1Token, from, to, exitNum, amount);
  }

  function parseOutboundData(bytes memory data)
    internal
    view
    returns (
      address from,
      uint256 maxSubmissionCost,
      bytes memory extraData
    )
  {
    if (msg.sender == l1Router) {
      // router encoded
      (from, extraData) = abi.decode(data, (address, bytes));
    } else {
      from = msg.sender;
      extraData = data;
    }
    // user encoded
    (maxSubmissionCost, extraData) = abi.decode(extraData, (uint256, bytes));
  }

  function calculateL2TokenAddress(address l1Token) external view override returns (address) {
    if (l1Token != l1AspidaERC20) {
      return address(0);
    }

    return l2AspidaERC20;
  }

  function counterpartGateway() external view override returns (address) {
    return l2Counterpart;
  }
}