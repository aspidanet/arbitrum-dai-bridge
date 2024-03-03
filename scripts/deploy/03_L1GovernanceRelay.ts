import { deployments, companionNetworks, getNamedAccounts, getChainId, ethers } from "hardhat";
// import { providers, Signer, Wallet } from 'ethers'
import { deployProxy } from "../utils/utils";
import { network, deployInfo } from "../config/config";

module.exports = async ({ deployments, getChainId }) => {
    const chainId = await getChainId();

    const deployData = deployInfo[network[chainId]];
    if (deployData.hasOwnProperty("layer1")) {
        console.log("L1GovernanceRelay is not deployed in layer 2");
        return;
    }

    const l2DeploymentsAll = await companionNetworks["l2"].deployments.all();
    const l2provider = new ethers.providers.JsonRpcProvider(deployData.layer2.rpc);

    let l2DeployerNonce = await l2provider.getTransactionCount(deployData.layer2.deployer);
    // let l2DeployerNonce = 5;

    let l2GovernanceRelayImpl;
    if (l2DeploymentsAll.hasOwnProperty("L2GovernanceRelayImpl")) {
        l2GovernanceRelayImpl = l2DeploymentsAll.L2GovernanceRelayImpl.address;
    } else {
        l2DeployerNonce += 1;
        console.log(`\nlayer 2 deploy L2GovernanceRelayImpl nonce: ${l2DeployerNonce}`);
        l2GovernanceRelayImpl = ethers.utils.getContractAddress({
            from: deployData.layer2.deployer,
            nonce: l2DeployerNonce,
        });
    }
    console.log(`L2GovernanceRelayImpl: ${l2GovernanceRelayImpl}\n`);

    const L1GatewayRouter = await ethers.getContractAt("IL1GatewayRouter", deployData.l1Router);
    const inbox = await L1GatewayRouter.inbox();
    for (let [tokenName, token] of Object.entries(deployData.tokens)) {
        console.log(`deploy ${tokenName} L1GovernanceRelay\n`);
        const name = `${tokenName}L1GovernanceRelay`;
        const constructorArgs = [
            inbox, // inbox
            l2GovernanceRelayImpl, // L2GovernanceRelay
        ];
        console.log(`constructor args :`);
        console.log(constructorArgs);

        l2DeployerNonce += 1;
        const l2GovernanceRelay = ethers.utils.getContractAddress({
            from: deployData.layer2.deployer,
            nonce: l2DeployerNonce,
        });
        console.log(`\nlayer 2 deploy ${tokenName}L2GovernanceRelay nonce: ${l2DeployerNonce}`);
        console.log(`${tokenName}L2GovernanceRelay: ${l2GovernanceRelay}\n`);
        const args = [inbox, l2GovernanceRelay];
        console.log(`proxy args :`);
        console.log(args);
        await deployProxy(name, "L1GovernanceRelay", constructorArgs, "initialize(address,address)", args, false);
    }
};
module.exports.tags = ["L1GovernanceRelay"];
