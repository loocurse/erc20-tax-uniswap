const { expect } = require("chai");
const { abi } = require("@uniswap/v2-periphery/build/IUniswapV2Router02.json");

const uniswapRouterAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

describe("ERC20 with tax (uniswap)", function () {
  let contract;
  let owner;
  let otherAccount;
  let uniswapRouter;
  let path;
  const lpTokenAmount = hre.ethers.parseUnits("12033000", 9);
  const lpEthAmount = hre.ethers.parseEther("1");
  let timestamp;
  before(async () => {
    [owner, otherAccount] = await hre.ethers.getSigners();
    contract = await hre.ethers.deployContract();
    uniswapRouter = new hre.ethers.Contract(uniswapRouterAddress, abi, owner);
    path = [await uniswapRouter.WETH(), await contract.getAddress()];
    timestamp = (await ethers.provider.getBlock()).timestamp;
  });

  describe("Deployment", function () {
    it("should deploy", async function () {
      expect(contract.address).to.be.not.null;
    });
  });

  describe("Providing liquidity", async () => {
    it("should successfully create an LP", async () => {
      await contract.approve(await uniswapRouter.getAddress(), lpTokenAmount);
      await uniswapRouter.addLiquidityETH(
        await contract.getAddress(),
        lpTokenAmount,
        0,
        0,
        owner.address,
        timestamp + 100000,
        { value: lpEthAmount }
      );
    });
  });

  describe("Transfer taxes", async () => {
    it("should not tax transfers before flag is on", async () => {
      const currentBalance = await contract.balanceOf(owner.address);

      await uniswapRouter
        .connect(otherAccount)
        .swapExactETHForTokensSupportingFeeOnTransferTokens(
          0,
          path,
          otherAccount.address,
          timestamp + 10000,
          {
            value: hre.ethers.parseEther("0.01"),
          }
        );

      const postBalance = await contract.balanceOf(owner.address);

      expect(currentBalance).to.be.equal(postBalance);
    });
    it("should tax transfers after flag is turned on", async () => {
      await contract.setIsTransferTaxActive(true);
      await contract.setTaxes(150, 200);
      const currentBalance = await contract.balanceOf(owner.address);

      await uniswapRouter
        .connect(otherAccount)
        .swapExactETHForTokensSupportingFeeOnTransferTokens(
          0,
          path,
          otherAccount.address,
          timestamp + 10000,
          {
            value: hre.ethers.parseEther("0.01"),
          }
        );

      const postBalance = await contract.balanceOf(owner.address);

      expect(currentBalance).to.be.lessThan(postBalance);
    });
  });

  describe("Transaction rules", async () => {
    it("prevents transactions more than limit", async () => {
      await expect(
        uniswapRouter
          .connect(otherAccount)
          .swapExactETHForTokensSupportingFeeOnTransferTokens(
            0,
            path,
            otherAccount.address,
            timestamp + 10000,
            {
              value: hre.ethers.parseEther("0.01"),
            }
          )
      ).to.be.reverted;
    });
    it("prevents transactions if wallet owns too many tokens", async () => {
      // set percentage to low
      await contract.setTransactionLimits(1000, 10);
      await expect(
        uniswapRouter
          .connect(otherAccount)
          .swapExactETHForTokensSupportingFeeOnTransferTokens(
            0,
            path,
            otherAccount.address,
            timestamp + 10000,
            {
              value: hre.ethers.parseEther("0.01"),
            }
          )
      ).to.be.reverted;
    });
    it("should not affect owner", async () => {
      await uniswapRouter
        .connect(otherAccount)
        .swapExactETHForTokensSupportingFeeOnTransferTokens(
          0,
          path,
          otherAccount.address,
          timestamp + 10000,
          {
            value: hre.ethers.parseEther("0.01"),
          }
        );
    });
  });
});
