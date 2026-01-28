// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./UUToken.sol";

/**
 * @title DailyKegel
 * @dev 公益打卡合约 - 激励每日凯格尔运动
 *
 * 功能：
 * - 每日打卡（冷却时间可配置）
 * - 捐赠收集（最低 1 UU）
 * - 排行榜维护（打卡次数、捐赠数量、Combo 各前50名）
 * - Combo 机制（连续打卡记录）
 */
contract DailyKegel {
    // ============ 常量 ============
    uint256 public constant MIN_DONATION = 1 * 10 ** 18; // 1 UU
    uint256 public constant LEADERBOARD_SIZE = 50;

    // ============ 状态变量 ============
    address public admin;
    UUToken public uuToken;

    uint256 public startTime;
    uint256 public cooldown = 24 hours; // 默认冷却时间 24 小时

    uint256 public totalPool; // 累计捐赠总额

    // 用户数据
    struct UserData {
        uint256 checkinCount;       // 总打卡次数
        uint256 donationTotal;      // 总捐赠量
        uint256 lastCheckinTime;    // 上次打卡时间
        uint256 currentCombo;       // 当前 combo 次数
        uint256 comboStartBlock;    // 当前 combo 起始块高（身份标识）
    }
    mapping(address => UserData) public userData;

    // 排行榜
    struct LeaderboardEntry {
        address user;
        uint256 value;
    }
    LeaderboardEntry[LEADERBOARD_SIZE] public checkinLeaderboard;  // 打卡排行榜
    LeaderboardEntry[LEADERBOARD_SIZE] public donationLeaderboard; // 捐赠排行榜

    // Combo 排行榜（世界纪录榜）
    struct ComboEntry {
        address user;
        uint256 startBlock;   // combo 起始块高，作为唯一标识
        uint256 comboCount;
    }
    ComboEntry[LEADERBOARD_SIZE] public comboLeaderboard;

    // ============ 事件 ============
    event CheckIn(
        address indexed user,
        uint256 donation,
        uint256 checkinCount,
        uint256 combo,
        uint256 comboStartBlock
    );
    event ComboEnded(
        address indexed user,
        uint256 startBlock,
        uint256 comboCount,
        uint256 endTime
    );
    event StartTimeUpdated(uint256 newStartTime);
    event CooldownUpdated(uint256 newCooldown);

    // ============ 修饰符 ============
    modifier onlyAdmin() {
        require(msg.sender == admin, "DailyKegel: not admin");
        _;
    }

    modifier afterStart() {
        require(block.timestamp >= startTime, "DailyKegel: not started yet");
        _;
    }

    // ============ 构造函数 ============
    constructor(
        address _uuToken,
        uint256 _startTime,
        uint256 _cooldown
    ) {
        require(_cooldown > 0, "DailyKegel: cooldown must be positive");
        admin = msg.sender;
        uuToken = UUToken(_uuToken);
        startTime = _startTime;
        cooldown = _cooldown;
    }

    // ============ 用户功能 ============

    /**
     * @dev 打卡
     * @param donation 捐赠数量（必须 >= 1 UU）
     */
    function checkIn(uint256 donation) external afterStart {
        require(donation >= MIN_DONATION, "DailyKegel: donation too small");

        UserData storage user = userData[msg.sender];
        require(
            user.lastCheckinTime == 0 ||
            block.timestamp >= user.lastCheckinTime + cooldown,
            "DailyKegel: checkin too soon"
        );

        // 转移代币到合约
        require(
            uuToken.transferFrom(msg.sender, address(this), donation),
            "DailyKegel: transfer failed"
        );

        // 更新 combo
        if (user.lastCheckinTime == 0) {
            // 首次打卡，开始新 combo
            user.currentCombo = 1;
            user.comboStartBlock = block.number;
        } else if (block.timestamp <= user.lastCheckinTime + 2 * cooldown) {
            // 在 2 倍冷却时间内，combo 延续
            user.currentCombo += 1;
        } else {
            // 超过 2 倍冷却时间，combo 断裂
            // 先记录旧 combo 的结束
            emit ComboEnded(
                msg.sender,
                user.comboStartBlock,
                user.currentCombo,
                user.lastCheckinTime + 2 * cooldown  // combo 实际断裂的时间点
            );
            // 开始新 combo
            user.currentCombo = 1;
            user.comboStartBlock = block.number;
        }

        // 更新用户数据
        user.checkinCount += 1;
        user.donationTotal += donation;
        user.lastCheckinTime = block.timestamp;

        // 更新奖池
        totalPool += donation;

        // 更新排行榜
        _updateLeaderboard(checkinLeaderboard, msg.sender, user.checkinCount);
        _updateLeaderboard(donationLeaderboard, msg.sender, user.donationTotal);
        _updateComboLeaderboard(msg.sender, user.comboStartBlock, user.currentCombo);

        emit CheckIn(msg.sender, donation, user.checkinCount, user.currentCombo, user.comboStartBlock);
    }

    // ============ 管理员功能 ============

    /**
     * @dev 设置开始时间
     * @param _startTime 新的开始时间（不能早于当前时间）
     */
    function setStartTime(uint256 _startTime) external onlyAdmin {
        require(_startTime >= block.timestamp, "DailyKegel: start time cannot be in the past");
        startTime = _startTime;
        emit StartTimeUpdated(_startTime);
    }

    /**
     * @dev 设置冷却时间
     * @param _cooldown 新的冷却时间
     */
    function setCooldown(uint256 _cooldown) external onlyAdmin {
        require(_cooldown > 0, "DailyKegel: cooldown must be positive");
        cooldown = _cooldown;
        emit CooldownUpdated(_cooldown);
    }

    // ============ 查询功能 ============

    /**
     * @dev 获取用户是否可以打卡
     */
    function canCheckIn(address user) external view returns (bool) {
        if (block.timestamp < startTime) {
            return false;
        }
        UserData storage data = userData[user];
        return data.lastCheckinTime == 0 ||
               block.timestamp >= data.lastCheckinTime + cooldown;
    }

    /**
     * @dev 获取用户下次可打卡时间
     */
    function nextCheckinTime(address user) external view returns (uint256) {
        UserData storage data = userData[user];
        if (data.lastCheckinTime == 0) {
            return startTime > block.timestamp ? startTime : block.timestamp;
        }
        return data.lastCheckinTime + cooldown;
    }

    /**
     * @dev 获取用户 combo 截止时间（超过此时间 combo 断裂）
     */
    function comboDeadline(address user) external view returns (uint256) {
        UserData storage data = userData[user];
        if (data.lastCheckinTime == 0) {
            return 0;
        }
        return data.lastCheckinTime + 2 * cooldown;
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

    /**
     * @dev 获取 Combo 排行榜
     */
    function getComboLeaderboard() external view returns (ComboEntry[LEADERBOARD_SIZE] memory) {
        return comboLeaderboard;
    }

    // ============ 内部函数 ============

    /**
     * @dev 更新排行榜（打卡/捐赠）
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
     * @dev 更新 Combo 排行榜
     * 排序规则：comboCount 降序 > startBlock 升序 > 地址升序
     */
    function _updateComboLeaderboard(
        address user,
        uint256 startBlock,
        uint256 comboCount
    ) internal {
        // 找到 (user, startBlock) 当前位置（如果存在）
        int256 currentIndex = -1;
        for (uint256 i = 0; i < LEADERBOARD_SIZE; i++) {
            if (comboLeaderboard[i].user == user &&
                comboLeaderboard[i].startBlock == startBlock) {
                currentIndex = int256(i);
                break;
            }
        }

        // 找到新值应该插入的位置
        uint256 targetIndex = LEADERBOARD_SIZE;
        for (uint256 i = 0; i < LEADERBOARD_SIZE; i++) {
            ComboEntry storage entry = comboLeaderboard[i];
            // 比较：comboCount 降序 > startBlock 升序 > 地址升序
            if (comboCount > entry.comboCount) {
                targetIndex = i;
                break;
            } else if (comboCount == entry.comboCount) {
                if (startBlock < entry.startBlock) {
                    targetIndex = i;
                    break;
                } else if (startBlock == entry.startBlock && uint160(user) < uint160(entry.user)) {
                    targetIndex = i;
                    break;
                }
            }
        }

        // 如果新位置不在榜内且条目也不在榜内，直接返回
        if (targetIndex == LEADERBOARD_SIZE && currentIndex == -1) {
            return;
        }

        // 如果条目已在榜内
        if (currentIndex >= 0) {
            uint256 ci = uint256(currentIndex);

            // 如果目标位置比当前位置更好或相同
            if (targetIndex <= ci) {
                // 将 targetIndex 到 currentIndex-1 的元素后移
                for (uint256 i = ci; i > targetIndex; i--) {
                    comboLeaderboard[i] = comboLeaderboard[i - 1];
                }
                comboLeaderboard[targetIndex] = ComboEntry(user, startBlock, comboCount);
            } else {
                // 位置不变，只更新值
                comboLeaderboard[ci].comboCount = comboCount;
            }
        } else {
            // 条目不在榜内，插入新条目
            if (targetIndex < LEADERBOARD_SIZE) {
                // 将 targetIndex 到末尾的元素后移（最后一个被挤出）
                for (uint256 i = LEADERBOARD_SIZE - 1; i > targetIndex; i--) {
                    comboLeaderboard[i] = comboLeaderboard[i - 1];
                }
                comboLeaderboard[targetIndex] = ComboEntry(user, startBlock, comboCount);
            }
        }
    }
}
