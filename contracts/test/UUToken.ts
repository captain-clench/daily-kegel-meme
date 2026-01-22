import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("UUToken", function () {
  async function deployUUToken() {
    const [owner, user1, user2] = await ethers.getSigners();
    const uuToken = await ethers.deployContract("UUToken");
    return { uuToken, owner, user1, user2 };
  }

  describe("Deployment", function () {
    it("Should have correct name and symbol", async function () {
      const { uuToken } = await deployUUToken();
      expect(await uuToken.name()).to.equal("UU Token");
      expect(await uuToken.symbol()).to.equal("UU");
    });

    it("Should have correct decimals", async function () {
      const { uuToken } = await deployUUToken();
      expect(await uuToken.decimals()).to.equal(18n);
    });

    it("Should have total supply of 1 billion", async function () {
      const { uuToken } = await deployUUToken();
      const expectedSupply = 1_000_000_000n * 10n ** 18n;
      expect(await uuToken.totalSupply()).to.equal(expectedSupply);
    });

    it("Should assign total supply to deployer", async function () {
      const { uuToken, owner } = await deployUUToken();
      const totalSupply = await uuToken.totalSupply();
      expect(await uuToken.balanceOf(owner.address)).to.equal(totalSupply);
    });
  });

  describe("Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      const { uuToken, owner, user1 } = await deployUUToken();
      const amount = ethers.parseEther("100");

      await uuToken.transfer(user1.address, amount);
      expect(await uuToken.balanceOf(user1.address)).to.equal(amount);
    });

    it("Should emit Transfer event", async function () {
      const { uuToken, owner, user1 } = await deployUUToken();
      const amount = ethers.parseEther("100");

      await expect(uuToken.transfer(user1.address, amount))
        .to.emit(uuToken, "Transfer")
        .withArgs(owner.address, user1.address, amount);
    });

    it("Should fail if sender has insufficient balance", async function () {
      const { uuToken, user1, user2 } = await deployUUToken();
      const amount = ethers.parseEther("100");

      await expect(
        uuToken.connect(user1).transfer(user2.address, amount)
      ).to.be.revertedWith("UUToken: insufficient balance");
    });
  });

  describe("Allowances", function () {
    it("Should approve and allow transferFrom", async function () {
      const { uuToken, owner, user1, user2 } = await deployUUToken();
      const amount = ethers.parseEther("100");

      await uuToken.approve(user1.address, amount);
      expect(await uuToken.allowance(owner.address, user1.address)).to.equal(amount);

      await uuToken.connect(user1).transferFrom(owner.address, user2.address, amount);
      expect(await uuToken.balanceOf(user2.address)).to.equal(amount);
    });

    it("Should fail transferFrom with insufficient allowance", async function () {
      const { uuToken, owner, user1, user2 } = await deployUUToken();
      const amount = ethers.parseEther("100");

      await expect(
        uuToken.connect(user1).transferFrom(owner.address, user2.address, amount)
      ).to.be.revertedWith("UUToken: insufficient allowance");
    });
  });
});
