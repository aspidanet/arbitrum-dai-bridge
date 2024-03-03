export const network = {
    1: "ethereum",
    42161: "arbitrum",
    11155111: "sepolia",
    421614: "arbitrumSepolia",
};

export const deployInfo = {
    ethereum: {
        owner: "",
        layer2: {
            network: "arbitrum",
            rpc: "",
            deployer: "",
        },
        l1Router: "0x72Ce9c846789fdB6fC1f34aC4AD25Dd9ef7031ef",
        // l1inbox: "0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f",
        tokens: {
            // aETH: "0xFC87753Df5Ef5C368b5FBA8D4C5043b77e8C5b39",
            saETH: "0xF1617882A71467534D14EEe865922de1395c9E89",
        },
    },
    arbitrum: {
        owner: "",
        layer1: {
            network: "ethereum",
            rpc: "",
        },
        l2Router: "0x5288c571Fd7aD117beA99bF60FE0846C4E84F933",
        tokens: {
            // aETH: "",
            saETH: "",
        },
    },
    sepolia: {
        owner: "",
        layer2: {
            network: "arbitrumSepolia",
            rpc: "https://arbitrum-sepolia.blockpi.network/v1/rpc/public",
            deployer: "",
        },
        l1Router: "0xcE18836b233C83325Cc8848CA4487e94C6288264",
        tokens: {
            aETH: "",
            // saETH: "",
        },
    },
    arbitrumSepolia: {
        owner: "",
        layer1: {
            network: "sepolia",
            rpc: "",
        },
        l2Router: "",
        tokens: {
            aETH: "",
            // saETH: "",
        },
    },
};
