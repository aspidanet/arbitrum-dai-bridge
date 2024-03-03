import { deployments, companionNetworks, getNamedAccounts, getChainId, ethers } from "hardhat";
import { deployProxy } from "../utils/utils";
import { network, deployInfo } from "../config/config";

module.exports = async ({ deployments, getChainId }) => {
    const chainId = await getChainId();

    const deployData = deployInfo[network[chainId]];
    if (deployData.hasOwnProperty("layer2")) {
        console.log("L2AspidaERC20Gateway is not deployed in layer 1");
        return;
    }

    const l1DeploymentsAll = await companionNetworks["l1"].deployments.all();
    const l1deployData = deployInfo[deployData.layer1.network];

    const l1AspidaERC20GatewayImpl = l1DeploymentsAll.L1AspidaERC20GatewayImpl.address;

    for (let [tokenName, token] of Object.entries(deployData.tokens)) {
        console.log(`deploy ${tokenName} L2AspidaERC20Gateway\n`);
        const name = `${tokenName}L2AspidaERC20Gateway`;
        const constructorArgs = [
            l1AspidaERC20GatewayImpl, // l1Counterpart(L1AspidaERC20Gateway)
            deployData.l2Router, // l2Router
            l1deployData.tokens[tokenName], // l1AspidaERC20
            token, // l2AspidaERC20
        ];
        console.log(`constructor args :`);
        console.log(constructorArgs);

        const l1AspidaERC20Gateway = l1DeploymentsAll[`${tokenName}L1AspidaERC20Gateway`].address;
        console.log(`${tokenName}L1AspidaERC20Gateway: ${l1AspidaERC20Gateway}\n`);

        const args = [l1AspidaERC20Gateway, deployData.l2Router, l1deployData.tokens[tokenName], token];
        console.log(`proxy args :`);
        console.log(args);
        await deployProxy(
            name,
            "L2AspidaERC20Gateway",
            constructorArgs,
            "initialize(address,address,address,address)",
            args,
            false,
        );
    }
};
module.exports.tags = ["L2AspidaERC20Gateway"];
