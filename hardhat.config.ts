import "solidity-coverage";
import "hardhat-gas-reporter";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-web3";
import "@typechain/hardhat";
import "hardhat-deploy";

import { HardhatUserConfig } from "hardhat/config";

const testDir = process.env.TESTS_DIR ?? "test";

const config: HardhatUserConfig = {
    networks: {
        ethereum: {
            url: "http://localhost:24012/rpc", // truffle-dashboard
            // url: "",
            timeout: 200000,
            companionNetworks: {
                l2: "arbitrum",
            },
        },
        arbitrum: {
            url: "http://localhost:24012/rpc", // truffle-dashboard
            // url: "",
            timeout: 200000,
            companionNetworks: {
                l1: "ethereum",
            },
        },
        sepolia: {
            url: "http://localhost:24012/rpc", // truffle-dashboard
            // url: "",
            timeout: 2000000,
            companionNetworks: {
                l2: "arbitrumSepolia",
            },
        },
        arbitrumSepolia: {
            url: "http://localhost:24012/rpc", // truffle-dashboard
            // url: "",
            timeout: 2000000,
            companionNetworks: {
                l1: "sepolia",
            },
        },
        localhost: {
            url: "http://localhost:24012/rpc", // truffle-dashboard
            timeout: 200000,
        },
    },
    mocha: {
        timeout: 50000,
    },
    solidity: {
        // note: we run optimizer only for dai.sol
        compilers: [
            {
                version: "0.6.11",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ],
        overrides: {
            "contracts/l2/dai.sol": {
                version: "0.6.11",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        },
    },
    paths: {
        deploy: "./scripts/deploy",
        deployments: "./deployments",
    },
    namedAccounts: {
        deployer: 0,
    },
    gasReporter: {
        enabled: process.env.REPORT_GAS === "1",
        currency: "USD",
        gasPrice: 50,
    },
};

export default config;
