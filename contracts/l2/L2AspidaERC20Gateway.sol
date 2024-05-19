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

import "./L2CrossDomainEnabled.sol";
import "./L2ITokenGateway.sol";

import "../l1/L1ITokenGateway.sol";

interface IAspidaERC20 {
  function transferFrom(
    address _from,
    address _to,
    uint256 _value
  ) external returns (bool success);

  function minterMint(address usr, uint256 wad) external;

  function minterBurn(uint256 wad) external;

  function mint(address _receiver, uint256 _amount) external;

  function burnFrom(address _account, uint256 _amount) external;

  function totalSupply() external view returns (uint256);
}

interface IOperator {
  function executeStrategy(bytes memory data) external;
}

contract L2AspidaERC20Gateway is Initializable, L2CrossDomainEnabled, L2ITokenGateway {
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
    require(wards[msg.sender] == 1, "L2AspidaERC20Gateway/not-authorized");
    _;
  }

  event Rely(address indexed usr);
  event Deny(address indexed usr);

  address public l1AspidaERC20;
  address public l2AspidaERC20;
  address public l1Counterpart;
  address public l2Router;
  uint256 public isOpen;

  event Closed();

  constructor(
    address _l1Counterpart,
    address _l2Router,
    address _l1AspidaERC20,
    address _l2AspidaERC20
  ) public {
    initialize(_l1Counterpart, _l2Router, _l1AspidaERC20, _l2AspidaERC20);
  }

  function initialize(
    address _l1Counterpart,
    address _l2Router,
    address _l1AspidaERC20,
    address _l2AspidaERC20
  ) public initializer {
    isOpen = 1;
    wards[msg.sender] = 1;
    emit Rely(msg.sender);

    l1AspidaERC20 = _l1AspidaERC20;
    l2AspidaERC20 = _l2AspidaERC20;
    l1Counterpart = _l1Counterpart;
    l2Router = _l2Router;
  }

  function close() external auth {
    isOpen = 0;

    emit Closed();
  }

  function outboundTransfer(
    address l1Token,
    address to,
    uint256 amount,
    bytes calldata data
  ) external returns (bytes memory) {
    return outboundTransfer(l1Token, to, amount, 0, 0, data);
  }

  function outboundTransfer(
    address l1Token,
    address to,
    uint256 amount,
    uint256, // maxGas
    uint256, // gasPriceBid
    bytes calldata data
  ) public virtual override returns (bytes memory res) {
    require(isOpen == 1, "L2AspidaERC20Gateway/closed");
    require(l1Token == l1AspidaERC20, "L2AspidaERC20Gateway/token-not-AspidaERC20");

    (address from, bytes memory extraData) = parseOutboundData(data);
    require(extraData.length == 0, "L2AspidaERC20Gateway/call-hook-data-not-allowed");

    IAspidaERC20(l2AspidaERC20).transferFrom(from, address(this), amount);
    IAspidaERC20(l2AspidaERC20).minterBurn(amount);

    uint256 id = sendTxToL1(
      from,
      l1Counterpart,
      getOutboundCalldata(l1Token, from, to, amount, extraData)
    );

    // we don't need to track exitNums (b/c we have no fast exits) so we always use 0
    emit WithdrawalInitiated(l1Token, from, to, id, 0, amount);

    return abi.encode(id);
  }

  function getOutboundCalldata(
    address token,
    address from,
    address to,
    uint256 amount,
    bytes memory data
  ) public pure returns (bytes memory outboundCalldata) {
    outboundCalldata = abi.encodeWithSelector(
      L1ITokenGateway.finalizeInboundTransfer.selector,
      token,
      from,
      to,
      amount,
      abi.encode(0, data) // we don't need to track exitNums (b/c we have no fast exits) so we always use 0
    );

    return outboundCalldata;
  }

  function finalizeInboundTransfer(
    address l1Token,
    address from,
    address to,
    uint256 amount,
    bytes calldata data
  ) external virtual override onlyL1Counterpart(l1Counterpart) {
    require(l1Token == l1AspidaERC20, "L2AspidaERC20Gateway/token-not-AspidaERC20");

    IAspidaERC20(l2AspidaERC20).minterMint(to, amount);

    emit DepositFinalized(l1Token, from, to, amount);

    (, bytes memory actualData) = abi.decode(data, (bytes, bytes));
    if (actualData.length > 32) {
      IOperator(to).executeStrategy(actualData);
    }
  }

  function calculateL2TokenAddress(address l1Token) external view override returns (address) {
    if (l1Token != l1AspidaERC20) {
      return address(0);
    }

    return l2AspidaERC20;
  }

  function parseOutboundData(bytes memory data)
    internal
    view
    returns (address from, bytes memory extraData)
  {
    if (msg.sender == l2Router) {
      (from, extraData) = abi.decode(data, (address, bytes));
    } else {
      from = msg.sender;
      extraData = data;
    }
  }

  function counterpartGateway() external view override returns (address) {
    return l1Counterpart;
  }
}
