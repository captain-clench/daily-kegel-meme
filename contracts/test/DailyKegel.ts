import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

// 时间操作辅助函数
async function getBlockTimestamp(): Promise<number> {
  const block = await ethers.provider.getBlock("latest");
  return block!.timestamp;
}

async function getBlockNumber(): Promise<number> {
  const block = await ethers.provider.getBlock("latest");
  return block!.number;
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
  const ONE_MINUTE = 60;

  async function deployContracts() {
    const [admin, user1, user2, user3] = await ethers.getSigners();

    // Deploy UUToken
    const uuToken = await ethers.deployContract("UUToken");

    // Get current time and set start time
    const now = await getBlockTimestamp();
    const startTime = now + 60; // Start in 1 minute

    // Deploy DailyKegel
    const dailyKegel = await ethers.deployContract("DailyKegel", [
      await uuToken.getAddress(),
      startTime,
    ]);

    // Distribute tokens to users
    await uuToken.transfer(user1.address, ethers.parseEther("10000"));
    await uuToken.transfer(user2.address, ethers.parseEther("10000"));
    await uuToken.transfer(user3.address, ethers.parseEther("10000"));

    return { uuToken, dailyKegel, admin, user1, user2, user3, startTime };
  }

  describe("Deployment", function () {
    it("Should set correct admin", async function () {
      const { dailyKegel, admin } = await deployContracts();
      expect(await dailyKegel.admin()).to.equal(admin.address);
    });

    it("Should set correct start time", async function () {
      const { dailyKegel, startTime } = await deployContracts();
      expect(await dailyKegel.startTime()).to.equal(startTime);
    });

    it("Should have default cooldown of 24 hours", async function () {
      const { dailyKegel } = await deployContracts();
      expect(await dailyKegel.cooldown()).to.equal(ONE_DAY);
    });

    it("Should have zero total pool initially", async function () {
      const { dailyKegel } = await deployContracts();
      expect(await dailyKegel.totalPool()).to.equal(0n);
    });
  });

  describe("Check-in", function () {
    it("Should not allow check-in before start time", async function () {
      const { dailyKegel, uuToken, user1 } = await deployContracts();

      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), ONE_UU);

      await expect(
        dailyKegel.connect(user1).checkIn(ONE_UU)
      ).to.be.revertedWith("DailyKegel: not started yet");
    });

    it("Should allow check-in after start time", async function () {
      const { dailyKegel, uuToken, user1, startTime } = await deployContracts();

      // Move time to after start
      await setNextBlockTimestamp(startTime + 1);

      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), TEN_UU);
      await dailyKegel.connect(user1).checkIn(TEN_UU);

      const userData = await dailyKegel.userData(user1.address);
      expect(userData.checkinCount).to.equal(1n);
      expect(userData.donationTotal).to.equal(TEN_UU);
    });

    it("Should emit CheckIn event with combo", async function () {
      const { dailyKegel, uuToken, user1, startTime } = await deployContracts();

      await setNextBlockTimestamp(startTime + 1);
      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), TEN_UU);

      // We can't predict exact block number, so just check the event is emitted
      await expect(dailyKegel.connect(user1).checkIn(TEN_UU))
        .to.emit(dailyKegel, "CheckIn");
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

    it("Should not allow check-in within cooldown period", async function () {
      const { dailyKegel, uuToken, user1, startTime } = await deployContracts();

      await setNextBlockTimestamp(startTime + 1);
      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), TEN_UU * 2n);

      await dailyKegel.connect(user1).checkIn(TEN_UU);

      // Try to check in again immediately
      await expect(
        dailyKegel.connect(user1).checkIn(TEN_UU)
      ).to.be.revertedWith("DailyKegel: checkin too soon");
    });

    it("Should allow check-in after cooldown period", async function () {
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

  describe("Combo mechanism", function () {
    it("Should start combo at 1 on first check-in", async function () {
      const { dailyKegel, uuToken, user1, startTime } = await deployContracts();

      await setNextBlockTimestamp(startTime + 1);
      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), TEN_UU);
      await dailyKegel.connect(user1).checkIn(TEN_UU);

      const userData = await dailyKegel.userData(user1.address);
      expect(userData.currentCombo).to.equal(1n);
      expect(userData.comboStartBlock).to.be.gt(0n);
    });

    it("Should continue combo when check-in within 2x cooldown", async function () {
      const { dailyKegel, uuToken, user1, startTime } = await deployContracts();

      await setNextBlockTimestamp(startTime + 1);
      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), TEN_UU * 3n);

      // First check-in
      await dailyKegel.connect(user1).checkIn(TEN_UU);
      const firstComboBlock = (await dailyKegel.userData(user1.address)).comboStartBlock;

      // Wait 1 day (just past cooldown, within 2x cooldown)
      await increaseTime(ONE_DAY);
      await dailyKegel.connect(user1).checkIn(TEN_UU);

      let userData = await dailyKegel.userData(user1.address);
      expect(userData.currentCombo).to.equal(2n);
      expect(userData.comboStartBlock).to.equal(firstComboBlock); // Same combo

      // Wait another day
      await increaseTime(ONE_DAY);
      await dailyKegel.connect(user1).checkIn(TEN_UU);

      userData = await dailyKegel.userData(user1.address);
      expect(userData.currentCombo).to.equal(3n);
      expect(userData.comboStartBlock).to.equal(firstComboBlock); // Still same combo
    });

    it("Should break combo when check-in after 2x cooldown", async function () {
      const { dailyKegel, uuToken, user1, startTime } = await deployContracts();

      await setNextBlockTimestamp(startTime + 1);
      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), TEN_UU * 2n);

      // First check-in
      await dailyKegel.connect(user1).checkIn(TEN_UU);
      const firstComboBlock = (await dailyKegel.userData(user1.address)).comboStartBlock;

      // Wait more than 2 days (2x cooldown)
      await increaseTime(ONE_DAY * 2 + 1);
      await dailyKegel.connect(user1).checkIn(TEN_UU);

      const userData = await dailyKegel.userData(user1.address);
      expect(userData.currentCombo).to.equal(1n); // Combo reset
      expect(userData.comboStartBlock).to.not.equal(firstComboBlock); // New combo started
    });

    it("Should emit ComboEnded event when combo breaks", async function () {
      const { dailyKegel, uuToken, user1, admin, startTime } = await deployContracts();

      // Use short cooldown for faster testing
      await dailyKegel.connect(admin).setCooldown(ONE_MINUTE);

      await setNextBlockTimestamp(startTime + 1);
      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), TEN_UU * 5n);

      // Build a combo of 3
      await dailyKegel.connect(user1).checkIn(TEN_UU);
      const comboStartBlock = (await dailyKegel.userData(user1.address)).comboStartBlock;

      await increaseTime(ONE_MINUTE);
      await dailyKegel.connect(user1).checkIn(TEN_UU);

      await increaseTime(ONE_MINUTE);
      await dailyKegel.connect(user1).checkIn(TEN_UU);

      // Record the last checkin time before breaking
      const lastCheckinTime = (await dailyKegel.userData(user1.address)).lastCheckinTime;
      const expectedEndTime = lastCheckinTime + BigInt(ONE_MINUTE * 2); // 2x cooldown

      // Break combo (wait more than 2x cooldown)
      await increaseTime(ONE_MINUTE * 3);

      // This check-in should emit ComboEnded for the previous combo
      await expect(dailyKegel.connect(user1).checkIn(TEN_UU))
        .to.emit(dailyKegel, "ComboEnded")
        .withArgs(user1.address, comboStartBlock, 3n, expectedEndTime);
    });

    it("Should work with custom cooldown", async function () {
      const { dailyKegel, uuToken, user1, admin, startTime } = await deployContracts();

      // Set cooldown to 1 minute
      await dailyKegel.connect(admin).setCooldown(ONE_MINUTE);

      await setNextBlockTimestamp(startTime + 1);
      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), TEN_UU * 3n);

      // First check-in
      await dailyKegel.connect(user1).checkIn(TEN_UU);

      // Wait 1 minute (cooldown passed)
      await increaseTime(ONE_MINUTE);
      await dailyKegel.connect(user1).checkIn(TEN_UU);

      let userData = await dailyKegel.userData(user1.address);
      expect(userData.currentCombo).to.equal(2n); // Combo continues

      // Wait 3 minutes (more than 2x cooldown)
      await increaseTime(ONE_MINUTE * 3);
      await dailyKegel.connect(user1).checkIn(TEN_UU);

      userData = await dailyKegel.userData(user1.address);
      expect(userData.currentCombo).to.equal(1n); // Combo reset
    });
  });

  describe("Combo leaderboard", function () {
    it("Should add entry to combo leaderboard", async function () {
      const { dailyKegel, uuToken, user1, startTime } = await deployContracts();

      await setNextBlockTimestamp(startTime + 1);
      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), TEN_UU);
      await dailyKegel.connect(user1).checkIn(TEN_UU);

      const comboLeaderboard = await dailyKegel.getComboLeaderboard();
      expect(comboLeaderboard[0].user).to.equal(user1.address);
      expect(comboLeaderboard[0].comboCount).to.equal(1n);
    });

    it("Should update combo entry when combo continues", async function () {
      const { dailyKegel, uuToken, user1, startTime } = await deployContracts();

      await setNextBlockTimestamp(startTime + 1);
      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), TEN_UU * 3n);

      await dailyKegel.connect(user1).checkIn(TEN_UU);
      const startBlock = (await dailyKegel.userData(user1.address)).comboStartBlock;

      await increaseTime(ONE_DAY);
      await dailyKegel.connect(user1).checkIn(TEN_UU);

      await increaseTime(ONE_DAY);
      await dailyKegel.connect(user1).checkIn(TEN_UU);

      const comboLeaderboard = await dailyKegel.getComboLeaderboard();
      expect(comboLeaderboard[0].user).to.equal(user1.address);
      expect(comboLeaderboard[0].startBlock).to.equal(startBlock);
      expect(comboLeaderboard[0].comboCount).to.equal(3n);
    });

    it("Should allow same user to have multiple entries (world records)", async function () {
      const { dailyKegel, uuToken, user1, admin, startTime } = await deployContracts();

      // Use short cooldown for faster testing
      await dailyKegel.connect(admin).setCooldown(ONE_MINUTE);

      await setNextBlockTimestamp(startTime + 1);
      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), TEN_UU * 10n);

      // First combo: 3 check-ins
      await dailyKegel.connect(user1).checkIn(TEN_UU);
      const firstComboBlock = (await dailyKegel.userData(user1.address)).comboStartBlock;

      await increaseTime(ONE_MINUTE);
      await dailyKegel.connect(user1).checkIn(TEN_UU);

      await increaseTime(ONE_MINUTE);
      await dailyKegel.connect(user1).checkIn(TEN_UU);

      // Break combo (wait more than 2x cooldown)
      await increaseTime(ONE_MINUTE * 3);

      // Second combo: 2 check-ins
      await dailyKegel.connect(user1).checkIn(TEN_UU);
      const secondComboBlock = (await dailyKegel.userData(user1.address)).comboStartBlock;

      await increaseTime(ONE_MINUTE);
      await dailyKegel.connect(user1).checkIn(TEN_UU);

      const comboLeaderboard = await dailyKegel.getComboLeaderboard();

      // First entry: combo of 3
      expect(comboLeaderboard[0].user).to.equal(user1.address);
      expect(comboLeaderboard[0].startBlock).to.equal(firstComboBlock);
      expect(comboLeaderboard[0].comboCount).to.equal(3n);

      // Second entry: combo of 2
      expect(comboLeaderboard[1].user).to.equal(user1.address);
      expect(comboLeaderboard[1].startBlock).to.equal(secondComboBlock);
      expect(comboLeaderboard[1].comboCount).to.equal(2n);
    });

    it("Should rank combos correctly when user beats own record", async function () {
      const { dailyKegel, uuToken, user1, admin, startTime } = await deployContracts();

      await dailyKegel.connect(admin).setCooldown(ONE_MINUTE);

      await setNextBlockTimestamp(startTime + 1);
      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), TEN_UU * 10n);

      // First combo: 2 check-ins
      await dailyKegel.connect(user1).checkIn(TEN_UU);
      const firstComboBlock = (await dailyKegel.userData(user1.address)).comboStartBlock;

      await increaseTime(ONE_MINUTE);
      await dailyKegel.connect(user1).checkIn(TEN_UU);

      // Break combo
      await increaseTime(ONE_MINUTE * 3);

      // Second combo: 3 check-ins (beats first record)
      await dailyKegel.connect(user1).checkIn(TEN_UU);
      const secondComboBlock = (await dailyKegel.userData(user1.address)).comboStartBlock;

      await increaseTime(ONE_MINUTE);
      await dailyKegel.connect(user1).checkIn(TEN_UU);

      await increaseTime(ONE_MINUTE);
      await dailyKegel.connect(user1).checkIn(TEN_UU);

      const comboLeaderboard = await dailyKegel.getComboLeaderboard();

      // New record (3) should be first
      expect(comboLeaderboard[0].startBlock).to.equal(secondComboBlock);
      expect(comboLeaderboard[0].comboCount).to.equal(3n);

      // Old record (2) should be second
      expect(comboLeaderboard[1].startBlock).to.equal(firstComboBlock);
      expect(comboLeaderboard[1].comboCount).to.equal(2n);
    });

    it("Should rank by startBlock when combo count is equal", async function () {
      const { dailyKegel, uuToken, user1, user2, admin, startTime } = await deployContracts();

      await dailyKegel.connect(admin).setCooldown(ONE_MINUTE);

      await setNextBlockTimestamp(startTime + 1);
      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), TEN_UU * 5n);
      await uuToken.connect(user2).approve(await dailyKegel.getAddress(), TEN_UU * 5n);

      // User1 starts first combo
      await dailyKegel.connect(user1).checkIn(TEN_UU);
      const user1Block = (await dailyKegel.userData(user1.address)).comboStartBlock;

      // User2 starts combo later
      await increaseTime(ONE_MINUTE);
      await dailyKegel.connect(user2).checkIn(TEN_UU);
      const user2Block = (await dailyKegel.userData(user2.address)).comboStartBlock;

      const comboLeaderboard = await dailyKegel.getComboLeaderboard();

      // User1 started first, should be ranked higher when combo counts are equal
      expect(comboLeaderboard[0].user).to.equal(user1.address);
      expect(comboLeaderboard[0].startBlock).to.equal(user1Block);
      expect(comboLeaderboard[1].user).to.equal(user2.address);
      expect(comboLeaderboard[1].startBlock).to.equal(user2Block);
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
    it("Should allow admin to set cooldown", async function () {
      const { dailyKegel, admin } = await deployContracts();

      await dailyKegel.connect(admin).setCooldown(ONE_MINUTE);
      expect(await dailyKegel.cooldown()).to.equal(ONE_MINUTE);
    });

    it("Should emit CooldownUpdated event", async function () {
      const { dailyKegel, admin } = await deployContracts();

      await expect(dailyKegel.connect(admin).setCooldown(ONE_MINUTE))
        .to.emit(dailyKegel, "CooldownUpdated")
        .withArgs(ONE_MINUTE);
    });

    it("Should not allow non-admin to set cooldown", async function () {
      const { dailyKegel, user1 } = await deployContracts();

      await expect(
        dailyKegel.connect(user1).setCooldown(ONE_MINUTE)
      ).to.be.revertedWith("DailyKegel: not admin");
    });

    it("Should not allow zero cooldown", async function () {
      const { dailyKegel, admin } = await deployContracts();

      await expect(
        dailyKegel.connect(admin).setCooldown(0)
      ).to.be.revertedWith("DailyKegel: cooldown must be positive");
    });

    it("Should allow admin to set start time", async function () {
      const { dailyKegel, admin, startTime } = await deployContracts();
      const newStartTime = startTime + ONE_DAY;

      await dailyKegel.connect(admin).setStartTime(newStartTime);
      expect(await dailyKegel.startTime()).to.equal(newStartTime);
    });

    it("Should emit StartTimeUpdated event", async function () {
      const { dailyKegel, admin, startTime } = await deployContracts();
      const newStartTime = startTime + ONE_DAY;

      await expect(dailyKegel.connect(admin).setStartTime(newStartTime))
        .to.emit(dailyKegel, "StartTimeUpdated")
        .withArgs(newStartTime);
    });

    it("Should not allow non-admin to set start time", async function () {
      const { dailyKegel, user1, startTime } = await deployContracts();

      await expect(
        dailyKegel.connect(user1).setStartTime(startTime + ONE_DAY)
      ).to.be.revertedWith("DailyKegel: not admin");
    });

    it("Should not allow setting start time in the past", async function () {
      const { dailyKegel, admin } = await deployContracts();

      const now = await getBlockTimestamp();

      await expect(
        dailyKegel.connect(admin).setStartTime(now - 100)
      ).to.be.revertedWith("DailyKegel: start time cannot be in the past");
    });
  });

  describe("View functions", function () {
    it("canCheckIn should return correct status", async function () {
      const { dailyKegel, uuToken, user1, startTime } = await deployContracts();

      // Before start time
      expect(await dailyKegel.canCheckIn(user1.address)).to.equal(false);

      // After start time
      await setNextBlockTimestamp(startTime + 1);
      expect(await dailyKegel.canCheckIn(user1.address)).to.equal(true);

      // After check-in
      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), TEN_UU);
      await dailyKegel.connect(user1).checkIn(TEN_UU);
      expect(await dailyKegel.canCheckIn(user1.address)).to.equal(false);

      // After cooldown
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

    it("comboDeadline should return correct time", async function () {
      const { dailyKegel, uuToken, user1, startTime } = await deployContracts();

      // Before any check-in
      expect(await dailyKegel.comboDeadline(user1.address)).to.equal(0n);

      await setNextBlockTimestamp(startTime + 1);
      await uuToken.connect(user1).approve(await dailyKegel.getAddress(), TEN_UU);
      await dailyKegel.connect(user1).checkIn(TEN_UU);

      const userData = await dailyKegel.userData(user1.address);
      const expectedDeadline = userData.lastCheckinTime + BigInt(ONE_DAY * 2);

      expect(await dailyKegel.comboDeadline(user1.address)).to.equal(expectedDeadline);
    });
  });
});
