import { deployments, getNamedAccounts, getChainId, ethers } from "hardhat";

import { sendTransaction } from "./utils/utils";

import { network, deployInfo } from "./config/config";

async function main() {
    const chainId = await getChainId();

    const deployData = deployInfo[network[chainId]];
    if (deployData.hasOwnProperty("layer2")) {
        console.log("Do not set up layer 1 network");
        return;
    }

    const deploymentsAll = await deployments.all();
    const deployer = (await getNamedAccounts()).deployer;
    const owner = deployData.owner;

    for (let [tokenName, token] of Object.entries(deployData.tokens)) {
        const L2AspidaERC20Gateway = await ethers.getContractAt(
            "L2AspidaERC20Gateway",
            deploymentsAll[`${tokenName}L2AspidaERC20Gateway`].address,
        );

        if ((await L2AspidaERC20Gateway.wards(owner)).toString() == "0") {
            console.log(`${tokenName} L2AspidaERC20Gateway rely auth: ${owner}\n`);
            await sendTransaction(
                L2AspidaERC20Gateway,
                "rely",
                [owner],
                (await L2AspidaERC20Gateway.wards(deployer)).toString() == "1",
            );
        }
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
