import { deployProxy } from "../utils/utils";
import { network, deployInfo } from "../config/config";

module.exports = async ({ getChainId }) => {
    const chainId = await getChainId();

    const deployData = deployInfo[network[chainId]];
    if (deployData.hasOwnProperty("layer1")) {
        console.log("L1Escrow is not deployed in layer 2");
        return;
    }
    const tokenNames = Object.keys(deployData.tokens);
    for (let index = 0; index < tokenNames.length; index++) {
        const name = `${tokenNames[index]}L1Escrow`;
        await deployProxy(name, "L1Escrow", [], "initialize()", [], false);
    }
};
module.exports.tags = ["L1Escrow"];
