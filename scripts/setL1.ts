import { deployments, getNamedAccounts, getChainId, ethers } from "hardhat";

import { sendTransaction } from "./utils/utils";

import { network, deployInfo } from "./config/config";

async function main() {
    const chainId = await getChainId();

    const deployData = deployInfo[network[chainId]];
    if (deployData.hasOwnProperty("layer1")) {
        console.log("Do not set up layer 2 network");
        return;
    }

    const deploymentsAll = await deployments.all();
    const deployer = (await getNamedAccounts()).deployer;
    const owner = deployData.owner;

    for (let [tokenName, token] of Object.entries(deployData.tokens)) {
        const L1AspidaERC20Gateway = await ethers.getContractAt(
            "L1AspidaERC20Gateway",
            deploymentsAll[`${tokenName}L1AspidaERC20Gateway`].address,
        );
        const L1Escrow = await ethers.getContractAt("L1Escrow", deploymentsAll[`${tokenName}L1Escrow`].address);
        const Token = await ethers.getContractAt("IAspidaMinterERC20", token);

        if ((await L1AspidaERC20Gateway.wards(owner)).toString() == "0") {
            console.log(`${tokenName} L1AspidaERC20Gateway rely auth: ${owner}\n`);
            await sendTransaction(
                L1AspidaERC20Gateway,
                "rely",
                [owner],
                (await L1AspidaERC20Gateway.wards(deployer)).toString() == "1",
            );
        }

        if ((await L1Escrow.wards(owner)).toString() == "0") {
            console.log(`${tokenName} L1Escrow rely auth: ${owner}\n`);
            await sendTransaction(L1Escrow, "rely", [owner], (await L1Escrow.wards(deployer)).toString() == "1");
        }

        if ((await Token.allowance(L1Escrow.address, L1AspidaERC20Gateway.address)).toString() == "0") {
            console.log(`${tokenName} L1Escrow approve L1AspidaERC20Gateway(${L1AspidaERC20Gateway.address})\n`);
            await sendTransaction(
                L1Escrow,
                "approve",
                [Token.address, L1AspidaERC20Gateway.address, ethers.constants.MaxUint256],
                (await L1Escrow.wards(deployer)).toString() == "1",
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
