require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");

const { rinkeby, mnemonic } = require('./secrets.json');

module.exports = {
  solidity: {
    version: "0.8.0",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    rinkeby: {
      url: rinkeby.rpc,
      accounts: { mnemonic }
    }
  },
  gasReporter: {
    excludeContracts: ["DAI.sol", "ERC20.sol"]
  }
};