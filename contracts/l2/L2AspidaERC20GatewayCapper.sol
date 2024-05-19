// SPDX-License-Identifier: MIT
pragma solidity ^0.6.11;

import "./L2AspidaERC20Gateway.sol";

interface ICapper {
  function totalCap() external view returns (uint256);
}

contract L2AspidaERC20GatewayCapper is L2AspidaERC20Gateway {
  address public capper;

  event SetCapper(address oldCapper, address newCapper);

  constructor(
    address _l1Counterpart,
    address _l2Router,
    address _l1AspidaERC20,
    address _l2AspidaERC20,
    address _capper
  ) public L2AspidaERC20Gateway(_l1Counterpart, _l2Router, _l1AspidaERC20, _l2AspidaERC20) {
    _setCapper(_capper);
  }

  function initialize(
    address _l1Counterpart,
    address _l2Router,
    address _l1AspidaERC20,
    address _l2AspidaERC20,
    address _capper
  ) public initializer {
    initialize(_l1Counterpart, _l2Router, _l1AspidaERC20, _l2AspidaERC20);
    _setCapper(_capper);
  }

  function _setCapper(address _newCapper) internal {
    address _capper = capper;
    require(_capper != _newCapper && ICapper(_newCapper).totalCap() >= 0, "Invalid capper address");
    capper = _newCapper;
    emit SetCapper(_capper, _newCapper);
  }

  function setCapper(address _capper) external auth {
    _setCapper(_capper);
  }

  function outboundTransfer(
    address l1Token,
    address to,
    uint256 amount,
    uint256, // maxGas
    uint256, // gasPriceBid
    bytes calldata data
  ) public override returns (bytes memory res) {
    require(isOpen == 1, "L2AspidaERC20Gateway/closed");
    require(l1Token == l1AspidaERC20, "L2AspidaERC20Gateway/token-not-AspidaERC20");

    (address from, bytes memory extraData) = parseOutboundData(data);
    require(extraData.length == 0, "L2AspidaERC20Gateway/call-hook-data-not-allowed");

    IAspidaERC20(l2AspidaERC20).burnFrom(from, amount);

    uint256 id = sendTxToL1(
      from,
      l1Counterpart,
      getOutboundCalldata(l1Token, from, to, amount, extraData)
    );

    // we don't need to track exitNums (b/c we have no fast exits) so we always use 0
    emit WithdrawalInitiated(l1Token, from, to, id, 0, amount);

    return abi.encode(id);
  }

  function finalizeInboundTransfer(
    address l1Token,
    address from,
    address to,
    uint256 amount,
    bytes calldata data
  ) external override onlyL1Counterpart(l1Counterpart) {
    require(l1Token == l1AspidaERC20, "L2AspidaERC20Gateway/token-not-AspidaERC20");

    require(
      IAspidaERC20(l2AspidaERC20).totalSupply() + amount <= ICapper(capper).totalCap(),
      "total cap exceeded"
    );
    IAspidaERC20(l2AspidaERC20).mint(to, amount);

    emit DepositFinalized(l1Token, from, to, amount);

    (, bytes memory actualData) = abi.decode(data, (bytes, bytes));
    if (actualData.length > 32) {
      IOperator(to).executeStrategy(actualData);
    }
  }
}
