import { deployments, companionNetworks, getNamedAccounts, getChainId, ethers } from "hardhat";
import { deployProxy } from "../utils/utils";
import { network, deployInfo } from "../config/config";

module.exports = async ({ deployments, getChainId }) => {
    const chainId = await getChainId();

    const deployData = deployInfo[network[chainId]];
    if (deployData.hasOwnProperty("layer1")) {
        console.log("L1AspidaERC20Gateway is not deployed in layer 2");
        return;
    }

    const deploymentsAll = await deployments.all();

    const l2DeploymentsAll = await companionNetworks["l2"].deployments.all();
    const l2provider = new ethers.providers.JsonRpcProvider(deployData.layer2.rpc);
    const l2deployData = deployInfo[deployData.layer2.network];

    let l2DeployerNonce = await l2provider.getTransactionCount(deployData.layer2.deployer);
    console.log(l2DeployerNonce);
    // let l2DeployerNonce = 3;

    let l2AspidaERC20GatewayImpl;
    if (l2DeploymentsAll.hasOwnProperty("L2AspidaERC20GatewayImpl")) {
        l2AspidaERC20GatewayImpl = l2DeploymentsAll.L2AspidaERC20GatewayImpl.address;
    } else {
        l2DeployerNonce += 1;
        console.log(`\nlayer 2 deploy L2AspidaERC20GatewayImpl nonce: ${l2DeployerNonce}`);
        l2AspidaERC20GatewayImpl = ethers.utils.getContractAddress({
            from: deployData.layer2.deployer,
            nonce: l2DeployerNonce,
        });
    }
    console.log(`L2AspidaERC20GatewayImpl: ${l2AspidaERC20GatewayImpl}\n`);

    const L1GatewayRouter = await ethers.getContractAt("IL1GatewayRouter", deployData.l1Router);
    const inbox = await L1GatewayRouter.inbox();
    for (let [tokenName, token] of Object.entries(deployData.tokens)) {
        console.log(`deploy ${tokenName} L1AspidaERC20Gateway\n`);
        const name = `${tokenName}L1AspidaERC20Gateway`;
        const constructorArgs = [
            l2AspidaERC20GatewayImpl, // l2Counterpart(L2AspidaERC20Gateway)
            deployData.l1Router, // l1Router
            inbox, // inbox
            token, // l1AspidaERC20
            l2deployData.tokens[tokenName], // l2AspidaERC20
            deploymentsAll.L1EscrowImpl.address, //l1Escrow
        ];
        console.log(`constructor args :`);
        console.log(constructorArgs);
        console.log(`\n`);

        let l2name = `${tokenName}L2AspidaERC20Gateway`;
        let l2AspidaERC20Gateway;
        if (l2DeploymentsAll.hasOwnProperty(l2name)) {
            l2AspidaERC20Gateway = l2DeploymentsAll[l2name].address;
        } else {
            // l2DeployerNonce += 1;
            console.log(`layer 2 deploy ${l2name} nonce: ${l2DeployerNonce}`);

            l2AspidaERC20Gateway = ethers.utils.getContractAddress({
                from: deployData.layer2.deployer,
                nonce: l2DeployerNonce,
            });
        }
        console.log(`${l2name}: ${l2AspidaERC20Gateway}\n`);
        const args = [
            l2AspidaERC20Gateway,
            deployData.l1Router,
            inbox,
            token,
            l2deployData.tokens[tokenName],
            deploymentsAll[`${tokenName}L1Escrow`].address,
        ];
        console.log(`proxy args :`);
        console.log(args);
        await deployProxy(
            name,
            "L1AspidaERC20Gateway",
            constructorArgs,
            "initialize(address,address,address,address,address,address)",
            args,
            false,
        );
    }
};
module.exports.tags = ["L1AspidaERC20Gateway"];
