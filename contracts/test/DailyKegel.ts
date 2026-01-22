import { expect } from "chai";
import { network } from "hardhat";
import { keccak256, solidityPacked } from "ethers";

const { ethers } = await network.connect();

// 时间操作辅助函数
async function getBlockTimestamp(): Promise<number> {
  const block = await ethers.provider.getBlock("latest");
  return block!.timestamp;
}

async function increaseTime(seconds: number): Promise<void> {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

async function setNextBlockTimestamp(timestamp: number): Promise<void> {
  await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp]);
  await ethers.provider.send("evm_mine", []);
}

describe("DailyKegel", function () {
  const ONE_UU = ethers.parseEther("1");
  const TEN_UU = ethers.parseEther("10");
  const HUNDRED_UU = ethers.parseEther("100");
  const ONE_DAY = 24 * 60 * 60;

  async function deployContracts() {
    const [admin, user1, user2, user3] = await ethers.getSigners();

    // Deploy UUToken
    const uuToken = await ethers.deployContract("UUToken");

    // Get current time and set season times
    const now = await getBlockTimestamp();
    const startTime = now + 60; // Start in 1 minute
    const endTime = now + 30 * ONE_DAY; // End in 30 days

    // Deploy DailyKegel
    const dailyKegel = await ethers.deployContract("DailyKegel", [
      await uuToken.getAddress(),
      startTime,
      endTime,
    ]);

    // Distribute tokens to users
    await uuToken.transfer(user1.address, ethers.parseEther("10000"));
    await uuToken.transfer(user2.address, ethers.parseEther("10000"));
    await uuToken.transfer(user3.address, ethers.parseEther("10000"));

    return { uuToken, dailyKegel, admin, user1, user2, user3, startTime, endTime };
  }

  describe("Deployment", function () {
    it("Should set correct admin", async function () {
      const { dailyKegel, admin } = await deployContracts();
      expect(await dailyKegel.admin()).to.equal(admin.address);
    });

    it("Should set correct start and end times", async function () {
      const { dailyKegel, startTime, endTime } = await deployContracts();
      expect(await dailyKegel.startTime()).to.equal(startTime);
      expect(await dailyKegel.endTime()).to.equal(endTime);
    });

    it("Should have zero total pool initially", async function () {
      const { dailyKegel } = await deployContracts();
      expect(await dailyKegel.totalPool()).to.equal(0n);
    });
  });

  describe("Check-in", function () {
    it("Should not allow check-in before season starts", async function () {
      const { dailyKegel, uuToken, user1 } = await deployContracts();

      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), ONE_UU);

      await expect(
        dailyKegel.connect(user1).checkIn(ONE_UU)
      ).to.be.revertedWith("DailyKegel: season not started");
    });

    it("Should allow check-in during season", async function () {
      const { dailyKegel, uuToken, user1, startTime } = await deployContracts();

      // Move time to after start
      await setNextBlockTimestamp(startTime + 1);

      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), TEN_UU);
      await dailyKegel.connect(user1).checkIn(TEN_UU);

      const userData = await dailyKegel.userData(user1.address);
      expect(userData.checkinCount).to.equal(1n);
      expect(userData.donationTotal).to.equal(TEN_UU);
    });

    it("Should emit CheckIn event", async function () {
      const { dailyKegel, uuToken, user1, startTime } = await deployContracts();

      await setNextBlockTimestamp(startTime + 1);
      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), TEN_UU);

      await expect(dailyKegel.connect(user1).checkIn(TEN_UU))
        .to.emit(dailyKegel, "CheckIn")
        .withArgs(user1.address, TEN_UU, 1n);
    });

    it("Should reject donation less than 1 UU", async function () {
      const { dailyKegel, uuToken, user1, startTime } = await deployContracts();

      await setNextBlockTimestamp(startTime + 1);
      const halfUU = ethers.parseEther("0.5");
      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), halfUU);

      await expect(
        dailyKegel.connect(user1).checkIn(halfUU)
      ).to.be.revertedWith("DailyKegel: donation too small");
    });

    it("Should not allow check-in within 24 hours", async function () {
      const { dailyKegel, uuToken, user1, startTime } = await deployContracts();

      await setNextBlockTimestamp(startTime + 1);
      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), TEN_UU * 2n);

      await dailyKegel.connect(user1).checkIn(TEN_UU);

      // Try to check in again immediately
      await expect(
        dailyKegel.connect(user1).checkIn(TEN_UU)
      ).to.be.revertedWith("DailyKegel: checkin too soon");
    });

    it("Should allow check-in after 24 hours", async function () {
      const { dailyKegel, uuToken, user1, startTime } = await deployContracts();

      await setNextBlockTimestamp(startTime + 1);
      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), TEN_UU * 2n);

      await dailyKegel.connect(user1).checkIn(TEN_UU);

      // Move time forward 24 hours
      await increaseTime(ONE_DAY);

      await dailyKegel.connect(user1).checkIn(TEN_UU);

      const userData = await dailyKegel.userData(user1.address);
      expect(userData.checkinCount).to.equal(2n);
    });

    it("Should update total pool", async function () {
      const { dailyKegel, uuToken, user1, startTime } = await deployContracts();

      await setNextBlockTimestamp(startTime + 1);
      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), TEN_UU);

      await dailyKegel.connect(user1).checkIn(TEN_UU);

      expect(await dailyKegel.totalPool()).to.equal(TEN_UU);
    });
  });

  describe("Leaderboard", function () {
    it("Should update leaderboard on check-in", async function () {
      const { dailyKegel, uuToken, user1, startTime } = await deployContracts();

      await setNextBlockTimestamp(startTime + 1);
      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), TEN_UU);

      await dailyKegel.connect(user1).checkIn(TEN_UU);

      const checkinLeaderboard = await dailyKegel.getCheckinLeaderboard();
      expect(checkinLeaderboard[0].user).to.equal(user1.address);
      expect(checkinLeaderboard[0].value).to.equal(1n);
    });

    it("Should rank users correctly by check-in count", async function () {
      const { dailyKegel, uuToken, user1, user2, startTime } = await deployContracts();

      await setNextBlockTimestamp(startTime + 1);

      // User1 checks in once
      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), TEN_UU);
      await dailyKegel.connect(user1).checkIn(TEN_UU);

      // User2 checks in once
      await uuToken.connect(user2).approve(await dailyKegel.getAddress(), TEN_UU * 3n);
      await dailyKegel.connect(user2).checkIn(TEN_UU);

      // Move time and user2 checks in again
      await increaseTime(ONE_DAY);
      await dailyKegel.connect(user2).checkIn(TEN_UU);

      // Move time and user2 checks in third time
      await increaseTime(ONE_DAY);
      await dailyKegel.connect(user2).checkIn(TEN_UU);

      const checkinLeaderboard = await dailyKegel.getCheckinLeaderboard();
      expect(checkinLeaderboard[0].user).to.equal(user2.address);
      expect(checkinLeaderboard[0].value).to.equal(3n);
      expect(checkinLeaderboard[1].user).to.equal(user1.address);
      expect(checkinLeaderboard[1].value).to.equal(1n);
    });

    it("Should rank users correctly by donation amount", async function () {
      const { dailyKegel, uuToken, user1, user2, startTime } = await deployContracts();

      await setNextBlockTimestamp(startTime + 1);

      // User1 donates 10 UU
      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), TEN_UU);
      await dailyKegel.connect(user1).checkIn(TEN_UU);

      // User2 donates 100 UU
      await uuToken.connect(user2).approve(await dailyKegel.getAddress(), HUNDRED_UU);
      await dailyKegel.connect(user2).checkIn(HUNDRED_UU);

      const donationLeaderboard = await dailyKegel.getDonationLeaderboard();
      expect(donationLeaderboard[0].user).to.equal(user2.address);
      expect(donationLeaderboard[0].value).to.equal(HUNDRED_UU);
      expect(donationLeaderboard[1].user).to.equal(user1.address);
      expect(donationLeaderboard[1].value).to.equal(TEN_UU);
    });
  });

  describe("Admin functions", function () {
    it("Should allow admin to deposit", async function () {
      const { dailyKegel, uuToken, admin } = await deployContracts();

      await uuToken.approve(await dailyKegel.getAddress(), HUNDRED_UU);
      await dailyKegel.adminDeposit(HUNDRED_UU);

      expect(await dailyKegel.totalPool()).to.equal(HUNDRED_UU);
    });

    it("Should emit AdminDeposit event", async function () {
      const { dailyKegel, uuToken, admin } = await deployContracts();

      await uuToken.approve(await dailyKegel.getAddress(), HUNDRED_UU);

      await expect(dailyKegel.adminDeposit(HUNDRED_UU))
        .to.emit(dailyKegel, "AdminDeposit")
        .withArgs(HUNDRED_UU);
    });

    it("Should not allow non-admin to deposit", async function () {
      const { dailyKegel, uuToken, user1 } = await deployContracts();

      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), HUNDRED_UU);

      await expect(
        dailyKegel.connect(user1).adminDeposit(HUNDRED_UU)
      ).to.be.revertedWith("DailyKegel: not admin");
    });

    it("Should allow admin to set merkle root", async function () {
      const { dailyKegel, admin } = await deployContracts();
      const merkleRoot = ethers.keccak256(ethers.toUtf8Bytes("test"));

      await dailyKegel.setMerkleRoot(merkleRoot);

      expect(await dailyKegel.merkleRoot()).to.equal(merkleRoot);
    });

    it("Should allow admin to update end time", async function () {
      const { dailyKegel, admin, endTime } = await deployContracts();
      const newEndTime = endTime + ONE_DAY;

      await dailyKegel.setEndTime(newEndTime);

      expect(await dailyKegel.endTime()).to.equal(newEndTime);
    });

    it("Should not allow setting end time in the past", async function () {
      const { dailyKegel, admin, startTime } = await deployContracts();

      await increaseTime(ONE_DAY);
      const now = await getBlockTimestamp();

      await expect(
        dailyKegel.setEndTime(now - 100)
      ).to.be.revertedWith("DailyKegel: end time must be in future");
    });
  });

  describe("Claim", function () {
    it("Should not allow claim without merkle root", async function () {
      const { dailyKegel, user1 } = await deployContracts();

      await expect(
        dailyKegel.connect(user1).claim(ONE_UU, [])
      ).to.be.revertedWith("DailyKegel: merkle root not set");
    });

    it("Should allow valid claim with merkle proof", async function () {
      const { dailyKegel, uuToken, admin, user1 } = await deployContracts();

      // Admin deposits to pool
      await uuToken.approve(await dailyKegel.getAddress(), HUNDRED_UU);
      await dailyKegel.adminDeposit(HUNDRED_UU);

      // Create a simple merkle tree with one leaf
      const amount = TEN_UU;
      const leaf = keccak256(solidityPacked(["address", "uint256"], [user1.address, amount]));

      // For a single leaf, the leaf itself is the root
      await dailyKegel.setMerkleRoot(leaf);

      // Claim with empty proof (single leaf tree)
      const balanceBefore = await uuToken.balanceOf(user1.address);
      await dailyKegel.connect(user1).claim(amount, []);
      const balanceAfter = await uuToken.balanceOf(user1.address);

      expect(balanceAfter - balanceBefore).to.equal(amount);
    });

    it("Should not allow double claim", async function () {
      const { dailyKegel, uuToken, admin, user1 } = await deployContracts();

      // Setup
      await uuToken.approve(await dailyKegel.getAddress(), HUNDRED_UU);
      await dailyKegel.adminDeposit(HUNDRED_UU);

      const amount = TEN_UU;
      const leaf = keccak256(solidityPacked(["address", "uint256"], [user1.address, amount]));
      await dailyKegel.setMerkleRoot(leaf);

      // First claim
      await dailyKegel.connect(user1).claim(amount, []);

      // Second claim should fail
      await expect(
        dailyKegel.connect(user1).claim(amount, [])
      ).to.be.revertedWith("DailyKegel: already claimed");
    });

    it("Should record claim status", async function () {
      const { dailyKegel, uuToken, admin, user1 } = await deployContracts();

      // Setup
      await uuToken.approve(await dailyKegel.getAddress(), HUNDRED_UU);
      await dailyKegel.adminDeposit(HUNDRED_UU);

      const amount = TEN_UU;
      const leaf = keccak256(solidityPacked(["address", "uint256"], [user1.address, amount]));
      await dailyKegel.setMerkleRoot(leaf);

      expect(await dailyKegel.hasClaimed(user1.address)).to.equal(false);

      await dailyKegel.connect(user1).claim(amount, []);

      expect(await dailyKegel.hasClaimed(user1.address)).to.equal(true);
    });
  });

  describe("View functions", function () {
    it("canCheckIn should return correct status", async function () {
      const { dailyKegel, uuToken, user1, startTime } = await deployContracts();

      // Before season starts
      expect(await dailyKegel.canCheckIn(user1.address)).to.equal(false);

      // After season starts
      await setNextBlockTimestamp(startTime + 1);
      expect(await dailyKegel.canCheckIn(user1.address)).to.equal(true);

      // After check-in
      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), TEN_UU);
      await dailyKegel.connect(user1).checkIn(TEN_UU);
      expect(await dailyKegel.canCheckIn(user1.address)).to.equal(false);

      // After 24 hours
      await increaseTime(ONE_DAY);
      expect(await dailyKegel.canCheckIn(user1.address)).to.equal(true);
    });

    it("nextCheckinTime should return correct time", async function () {
      const { dailyKegel, uuToken, user1, startTime } = await deployContracts();

      await setNextBlockTimestamp(startTime + 1);

      // First check-in
      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), TEN_UU);
      await dailyKegel.connect(user1).checkIn(TEN_UU);

      const userData = await dailyKegel.userData(user1.address);
      const expectedNextTime = userData.lastCheckinTime + BigInt(ONE_DAY);

      expect(await dailyKegel.nextCheckinTime(user1.address)).to.equal(expectedNextTime);
    });
  });
});
