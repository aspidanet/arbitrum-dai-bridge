import { expect } from 'chai'
import { ethers } from 'hardhat'

import { AuthableContract } from './AuthableContract'
import { getRandomAddress } from './helpers'

/**
 * Gets all active wards of a given contract. Turns out that it's not so trivial since events might be quite misleading.
 */
export async function getActiveWards(authContract: AuthableContract): Promise<string[]> {
  const relyEvents = await authContract.queryFilter(authContract.filters.Rely())

  const relies = relyEvents.map((r) => r.args.usr)

  const statusOfRelies = await Promise.all(relies.map(async (usr) => ({ usr, active: await authContract.wards(usr) })))

  const activeRelies = statusOfRelies.filter((s) => s.active.toNumber() === 1).map((s) => s.usr)

  return activeRelies
}

export function testAuth(
  name: string,
  getDeployArgs: () => Promise<any[]>,
  authedMethods: Array<(contract: any) => Promise<any>>,
  strictErrorMsgs: boolean = true,
) {
  const expectedErrorMsg = strictErrorMsgs ? `${name}/not-authorized` : `/not-authorized`

  describe('auth', () => {
    async function deploy() {
      const [deployer] = await ethers.getSigners()

      const contractFactory = await ethers.getContractFactory(name)
      const deployTxReq = contractFactory.getDeployTransaction(...(await getDeployArgs()))
      const deployTx = await deployer.sendTransaction(deployTxReq)
      const deployReceipt = await deployTx.wait()
      const contract = (await ethers.getContractAt(name, deployReceipt.contractAddress)) as AuthableContract

      return { deployer, contract, deployTx }
    }

    it('makes initially the deployer the only ward', async () => {
      const { deployer, contract, deployTx } = await deploy()

      expect(await getActiveWards(contract)).to.be.deep.eq([deployer.address])
      await expect(deployTx).to.emit(contract, 'Rely').withArgs(deployer.address)
    })

    it('relies on new addresses', async () => {
      const { deployer, contract } = await deploy()
      const randomAddress = await getRandomAddress()

      const relyTx = await contract.rely(randomAddress)

      expect((await getActiveWards(contract)).sort()).to.be.deep.eq([deployer.address, randomAddress].sort())
      await expect(relyTx).to.emit(contract, 'Rely').withArgs(randomAddress)
    })

    it('denies old addresses', async () => {
      const { deployer, contract } = await deploy()
      const randomAddress = await getRandomAddress()

      await contract.rely(randomAddress)
      const denyTx = await contract.deny(deployer.address)

      expect((await getActiveWards(contract)).sort()).to.be.deep.eq([randomAddress].sort())
      await expect(denyTx).to.emit(contract, 'Deny').withArgs(deployer.address)
    })

    it('only a ward can change permissions', async () => {
      const { contract } = await deploy()
      const [_, unauthorized] = await ethers.getSigners()
      const randomAddress = await getRandomAddress()

      await expect(contract.connect(unauthorized).rely(randomAddress)).to.be.revertedWith(expectedErrorMsg)
      await expect(contract.connect(unauthorized).deny(randomAddress)).to.be.revertedWith(expectedErrorMsg)
    })

    it('only a ward can run authed methods', async () => {
      const { contract } = await deploy()
      const [_, unauthorized] = await ethers.getSigners()

      const contractWithUnauthorizedSigner = contract.connect(unauthorized)

      for (const authedMethod of authedMethods) {
        await expect(authedMethod(contractWithUnauthorizedSigner)).to.be.revertedWith(expectedErrorMsg)
      }
    })
  })
}