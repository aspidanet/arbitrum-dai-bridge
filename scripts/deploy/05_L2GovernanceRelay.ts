import { deployments, companionNetworks, getNamedAccounts, getChainId, ethers } from "hardhat";
import { deployProxy } from "../utils/utils";
import { network, deployInfo } from "../config/config";

module.exports = async ({ deployments, getChainId }) => {
    const chainId = await getChainId();

    const deployData = deployInfo[network[chainId]];
    if (deployData.hasOwnProperty("layer2")) {
        console.log("L2GovernanceRelay is not deployed in layer 1");
        return;
    }

    const l1DeploymentsAll = await companionNetworks["l1"].deployments.all();

    const l1GovernanceRelayImpl = l1DeploymentsAll.L1GovernanceRelayImpl.address;

    for (let [tokenName, token] of Object.entries(deployData.tokens)) {
        console.log(`deploy ${tokenName} L2GovernanceRelay\n`);
        const name = `${tokenName}L2GovernanceRelay`;
        const constructorArgs = [
            l1GovernanceRelayImpl, // l1GovernanceRelay
        ];
        console.log(`constructor args :`);
        console.log(constructorArgs);

        const l1GovernanceRelay = l1DeploymentsAll[`${tokenName}L1GovernanceRelay`].address;
        console.log(`${tokenName}L1GovernanceRelay: ${l1GovernanceRelay}\n`);

        const args = [l1GovernanceRelay];
        console.log(`proxy args :`);
        console.log(args);
        await deployProxy(name, "L2GovernanceRelay", constructorArgs, "initialize(address)", args, false);
    }
};
module.exports.tags = ["L2GovernanceRelay"];
