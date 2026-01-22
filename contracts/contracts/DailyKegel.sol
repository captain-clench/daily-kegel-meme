// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./UUToken.sol";

/**
 * @title DailyKegel
 * @dev DailyKegel 赛季合约 - S1
 *
 * 功能：
 * - 每日打卡（24小时间隔）
 * - 捐赠收集（最低 1 UU）
 * - 排行榜维护（打卡次数、捐赠数量各前50名）
 * - 管理员注资
 * - Merkle Tree 奖励分配
 */
contract DailyKegel {
    // ============ 常量 ============
    uint256 public constant CHECKIN_INTERVAL = 24 hours;
    uint256 public constant MIN_DONATION = 1 * 10 ** 18; // 1 UU
    uint256 public constant LEADERBOARD_SIZE = 50;

    // ============ 状态变量 ============
    address public admin;
    UUToken public uuToken;

    uint256 public immutable startTime;
    uint256 public endTime;

    uint256 public totalPool; // 奖池总额
    bytes32 public merkleRoot; // Merkle root for claims

    // 用户数据
    struct UserData {
        uint256 checkinCount;    // 打卡次数
        uint256 donationTotal;   // 捐赠总量
        uint256 lastCheckinTime; // 上次打卡时间
    }
    mapping(address => UserData) public userData;

    // Claim 记录
    mapping(address => bool) public hasClaimed;

    // 排行榜
    struct LeaderboardEntry {
        address user;
        uint256 value;
    }
    LeaderboardEntry[LEADERBOARD_SIZE] public checkinLeaderboard;  // 打卡排行榜
    LeaderboardEntry[LEADERBOARD_SIZE] public donationLeaderboard; // 捐赠排行榜

    // ============ 事件 ============
    event CheckIn(address indexed user, uint256 donation, uint256 checkinCount);
    event AdminDeposit(uint256 amount);
    event MerkleRootSet(bytes32 merkleRoot);
    event Claimed(address indexed user, uint256 amount);
    event EndTimeUpdated(uint256 newEndTime);

    // ============ 修饰符 ============
    modifier onlyAdmin() {
        require(msg.sender == admin, "DailyKegel: not admin");
        _;
    }

    modifier seasonActive() {
        require(block.timestamp >= startTime, "DailyKegel: season not started");
        require(block.timestamp < endTime, "DailyKegel: season ended");
        _;
    }

    // ============ 构造函数 ============
    constructor(
        address _uuToken,
        uint256 _startTime,
        uint256 _endTime
    ) {
        require(_startTime < _endTime, "DailyKegel: invalid time range");

        admin = msg.sender;
        uuToken = UUToken(_uuToken);
        startTime = _startTime;
        endTime = _endTime;
    }

    // ============ 用户功能 ============

    /**
     * @dev 打卡
     * @param donation 捐赠数量（必须 >= 1 UU）
     */
    function checkIn(uint256 donation) external seasonActive {
        require(donation >= MIN_DONATION, "DailyKegel: donation too small");

        UserData storage user = userData[msg.sender];
        require(
            user.lastCheckinTime == 0 ||
            block.timestamp >= user.lastCheckinTime + CHECKIN_INTERVAL,
            "DailyKegel: checkin too soon"
        );

        // 转移代币到合约
        require(
            uuToken.transferFrom(msg.sender, address(this), donation),
            "DailyKegel: transfer failed"
        );

        // 更新用户数据
        user.checkinCount += 1;
        user.donationTotal += donation;
        user.lastCheckinTime = block.timestamp;

        // 更新奖池
        totalPool += donation;

        // 更新排行榜
        _updateLeaderboard(checkinLeaderboard, msg.sender, user.checkinCount);
        _updateLeaderboard(donationLeaderboard, msg.sender, user.donationTotal);

        emit CheckIn(msg.sender, donation, user.checkinCount);
    }

    /**
     * @dev 领取奖励
     * @param amount 领取数量
     * @param merkleProof Merkle proof
     */
    function claim(uint256 amount, bytes32[] calldata merkleProof) external {
        require(merkleRoot != bytes32(0), "DailyKegel: merkle root not set");
        require(!hasClaimed[msg.sender], "DailyKegel: already claimed");

        // 验证 Merkle proof
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));
        require(_verifyMerkleProof(merkleProof, merkleRoot, leaf), "DailyKegel: invalid proof");

        hasClaimed[msg.sender] = true;

        require(uuToken.transfer(msg.sender, amount), "DailyKegel: transfer failed");

        emit Claimed(msg.sender, amount);
    }

    // ============ 管理员功能 ============

    /**
     * @dev 管理员向奖池注资
     * @param amount 注资数量
     */
    function adminDeposit(uint256 amount) external onlyAdmin {
        require(
            uuToken.transferFrom(msg.sender, address(this), amount),
            "DailyKegel: transfer failed"
        );
        totalPool += amount;
        emit AdminDeposit(amount);
    }

    /**
     * @dev 设置 Merkle root
     * @param _merkleRoot 新的 Merkle root
     */
    function setMerkleRoot(bytes32 _merkleRoot) external onlyAdmin {
        merkleRoot = _merkleRoot;
        emit MerkleRootSet(_merkleRoot);
    }

    /**
     * @dev 调整结束时间
     * @param _endTime 新的结束时间
     */
    function setEndTime(uint256 _endTime) external onlyAdmin {
        require(_endTime > block.timestamp, "DailyKegel: end time must be in future");
        endTime = _endTime;
        emit EndTimeUpdated(_endTime);
    }

    // ============ 查询功能 ============

    /**
     * @dev 获取用户是否可以打卡
     */
    function canCheckIn(address user) external view returns (bool) {
        if (block.timestamp < startTime || block.timestamp >= endTime) {
            return false;
        }
        UserData storage data = userData[user];
        return data.lastCheckinTime == 0 ||
               block.timestamp >= data.lastCheckinTime + CHECKIN_INTERVAL;
    }

    /**
     * @dev 获取用户下次可打卡时间
     */
    function nextCheckinTime(address user) external view returns (uint256) {
        UserData storage data = userData[user];
        if (data.lastCheckinTime == 0) {
            return startTime > block.timestamp ? startTime : block.timestamp;
        }
        return data.lastCheckinTime + CHECKIN_INTERVAL;
    }

    /**
     * @dev 获取打卡排行榜
     */
    function getCheckinLeaderboard() external view returns (LeaderboardEntry[LEADERBOARD_SIZE] memory) {
        return checkinLeaderboard;
    }

    /**
     * @dev 获取捐赠排行榜
     */
    function getDonationLeaderboard() external view returns (LeaderboardEntry[LEADERBOARD_SIZE] memory) {
        return donationLeaderboard;
    }

    // ============ 内部函数 ============

    /**
     * @dev 更新排行榜
     * 同分时按地址排序
     */
    function _updateLeaderboard(
        LeaderboardEntry[LEADERBOARD_SIZE] storage leaderboard,
        address user,
        uint256 newValue
    ) internal {
        // 找到用户当前位置（如果存在）
        int256 currentIndex = -1;
        for (uint256 i = 0; i < LEADERBOARD_SIZE; i++) {
            if (leaderboard[i].user == user) {
                currentIndex = int256(i);
                break;
            }
        }

        // 找到新值应该插入的位置
        uint256 targetIndex = LEADERBOARD_SIZE;
        for (uint256 i = 0; i < LEADERBOARD_SIZE; i++) {
            // 比较：先比值，值相同则比地址
            if (newValue > leaderboard[i].value ||
                (newValue == leaderboard[i].value && uint160(user) < uint160(leaderboard[i].user))) {
                targetIndex = i;
                break;
            }
        }

        // 如果新位置不在榜内且用户也不在榜内，直接返回
        if (targetIndex == LEADERBOARD_SIZE && currentIndex == -1) {
            return;
        }

        // 如果用户已在榜内
        if (currentIndex >= 0) {
            uint256 ci = uint256(currentIndex);

            // 如果目标位置比当前位置更好或相同
            if (targetIndex <= ci) {
                // 将 targetIndex 到 currentIndex-1 的元素后移
                for (uint256 i = ci; i > targetIndex; i--) {
                    leaderboard[i] = leaderboard[i - 1];
                }
                leaderboard[targetIndex] = LeaderboardEntry(user, newValue);
            } else {
                // 位置不变，只更新值
                leaderboard[ci].value = newValue;
            }
        } else {
            // 用户不在榜内，插入新条目
            if (targetIndex < LEADERBOARD_SIZE) {
                // 将 targetIndex 到末尾的元素后移（最后一个被挤出）
                for (uint256 i = LEADERBOARD_SIZE - 1; i > targetIndex; i--) {
                    leaderboard[i] = leaderboard[i - 1];
                }
                leaderboard[targetIndex] = LeaderboardEntry(user, newValue);
            }
        }
    }

    /**
     * @dev 验证 Merkle proof
     */
    function _verifyMerkleProof(
        bytes32[] calldata proof,
        bytes32 root,
        bytes32 leaf
    ) internal pure returns (bool) {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];

            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        return computedHash == root;
    }
}
