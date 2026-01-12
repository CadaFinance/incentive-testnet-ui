// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ZugTokenStakingV4
 * @dev Institutional-Grade Multi-Position Token (ERC20) Staking
 * Features: RBAC, Pausability, High-Fidelity Events, Tri-State Accounting.
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

// --- SECURITY & REENTRANCY ---

abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

// --- ACCESS CONTROL (INSTITUTIONAL STANDARD) ---

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
}

abstract contract AccessControl is Context {
    struct RoleData {
        mapping(address => bool) members;
        bytes32 adminRole;
    }

    mapping(bytes32 => RoleData) private _roles;

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    modifier onlyRole(bytes32 role) {
        _checkRole(role);
        _;
    }

    function hasRole(bytes32 role, address account) public view virtual returns (bool) {
        return _roles[role].members[account];
    }

    function _checkRole(bytes32 role) internal view virtual {
        if (!hasRole(role, _msgSender())) {
            revert("AccessControl: missing role");
        }
    }

    function _setupRole(bytes32 role, address account) internal virtual {
        if (!hasRole(role, account)) {
            _roles[role].members[account] = true;
            emit RoleGranted(role, account, _msgSender());
        }
    }

    function grantRole(bytes32 role, address account) public virtual onlyRole(DEFAULT_ADMIN_ROLE) {
        _setupRole(role, account);
    }

    function revokeRole(bytes32 role, address account) public virtual onlyRole(DEFAULT_ADMIN_ROLE) {
        if (hasRole(role, account)) {
            _roles[role].members[account] = false;
            emit RoleRevoked(role, account, _msgSender());
        }
    }
}

// --- PAUSABLE (EMERGENCY PROTOCOL) ---

abstract contract Pausable is AccessControl {
    bool private _paused;

    event Paused(address account);
    event Unpaused(address account);

    constructor() {
        _paused = false;
    }

    modifier whenNotPaused() {
        require(!_paused, "Pausable: paused");
        _;
    }

    modifier whenPaused() {
        require(_paused, "Pausable: not paused");
        _;
    }

    function paused() public view virtual returns (bool) {
        return _paused;
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _paused = true;
        emit Paused(_msgSender());
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}

// --- MAIN CONTRACT ---

contract ZugTokenStakingV4 is Pausable, ReentrancyGuard {
    
    struct Deposit {
        uint256 amount;             
        uint256 weightedAmount;     
        uint256 rewardDebt;         
        uint256 lockEndTime;        
        uint256 unbondingEnd;       
        uint8 tierId;               
        bool isWithdrawn;
        uint256 totalClaimed;
        uint256 totalCompounded;
        bool useAutoCompound;
        uint256 lastAutoCompound;
    }

    struct LockTier {
        uint256 multiplier; 
        uint256 duration;
        uint256 minAPY;      // Basis points (500 = 5%)
        uint256 maxAPY;      // Basis points (5000 = 50%)
    }

    // --- STATE VARIABLES ---

    IERC20 public stakingToken;
    uint256 public rewardRate;          
    uint256 public lastUpdateTime;      
    uint256 public accRewardPerShare;   
    uint256 public totalWeightedStake;  
    
    mapping(uint8 => LockTier) public distinctTiers;
    uint256 public constant UNBONDING_PERIOD = 120; // 2 minutes for testing
    uint256 public constant PRECISION = 1e12;
    uint256 public constant BASIS_POINTS = 10000; // 100% = 10000
    uint256 public constant SECONDS_PER_YEAR = 31536000;

    mapping(address => Deposit[]) public userDeposits;
    mapping(address => uint256) public userAccumulatedRewards;

    // --- EVENTS ---
    event Staked(address indexed user, uint256 depositId, uint256 amount, uint8 tierId, bool autoCompound);
    event UnstakeRequested(address indexed user, uint256 depositId, uint256 principal, uint256 harvestedYield);
    event Withdrawn(address indexed user, uint256 depositId, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    event Compounded(address indexed user, uint256 depositId, uint256 addedAmount);
    event RewardRateUpdated(uint256 oldRate, uint256 newRate);

    constructor(address _token, uint256 _initialRewardRate) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(GOVERNOR_ROLE, msg.sender);
        _setupRole(PAUSER_ROLE, msg.sender);
        _setupRole(KEEPER_ROLE, msg.sender);

        stakingToken = IERC20(_token);
        rewardRate = _initialRewardRate; 
        
        // Tier config: multiplier, duration, minAPY (bps), maxAPY (bps)
        distinctTiers[0] = LockTier(100, 0, 500, 5000);           // Flexible: 5%-50%
        distinctTiers[1] = LockTier(120, 30 days, 1200, 10000);   // Gold: 12%-100%
        distinctTiers[2] = LockTier(150, 90 days, 2000, 20000);   // Platinum: 20%-200%
    }
    
    // --- VIEWS ---

    function getUserDeposits(address _user) external view returns (Deposit[] memory) {
        return userDeposits[_user];
    }
    
    function pendingReward(address _user, uint256 _depositIndex) public view returns (uint256) {
        if (_depositIndex >= userDeposits[_user].length) return 0;
        Deposit storage dep = userDeposits[_user][_depositIndex];
        if (dep.isWithdrawn || dep.unbondingEnd > 0) return 0;

        uint256 _accRewardPerShare = accRewardPerShare;
        uint256 _totalWeighted = totalWeightedStake;

        if (block.timestamp > lastUpdateTime && _totalWeighted != 0) {
            uint256 timeElapsed = block.timestamp - lastUpdateTime;
            uint256 zugsReward = timeElapsed * rewardRate;
            _accRewardPerShare += (zugsReward * PRECISION) / _totalWeighted;
        }

        return ((dep.weightedAmount * _accRewardPerShare) / PRECISION) - dep.rewardDebt;
    }

    function totalPendingReward(address _user) external view returns (uint256) {
        uint256 total = userAccumulatedRewards[_user];
        for (uint256 i = 0; i < userDeposits[_user].length; i++) {
            total += pendingReward(_user, i);
        }
        return total;
    }

    /// @notice Returns the effective APY for a tier (clamped between min and max)
    function getEffectiveAPY(uint8 _tierId) public view returns (uint256) {
        LockTier memory tier = distinctTiers[_tierId];
        
        if (totalWeightedStake == 0) {
            return tier.maxAPY; // Max APY when pool is empty
        }
        
        // Calculate: (annualReward / totalStake) * multiplier * 10000
        uint256 annualReward = rewardRate * SECONDS_PER_YEAR;
        uint256 rawAPY = (annualReward * tier.multiplier * BASIS_POINTS) / (totalWeightedStake * 100);
        
        // Clamp between min and max
        if (rawAPY < tier.minAPY) return tier.minAPY;
        if (rawAPY > tier.maxAPY) return tier.maxAPY;
        return rawAPY;
    }

    // --- CORE LOGIC ---

    function updatePool() public whenNotPaused {
        if (block.timestamp <= lastUpdateTime) return;
        
        if (totalWeightedStake == 0) {
            lastUpdateTime = block.timestamp;
            return;
        }

        uint256 timeElapsed = block.timestamp - lastUpdateTime;
        uint256 zugsReward = timeElapsed * rewardRate;
        
        accRewardPerShare += (zugsReward * PRECISION) / totalWeightedStake;
        lastUpdateTime = block.timestamp;
    }
    
    function stake(uint256 _amount, uint8 _tierId, bool _autoCompound) external nonReentrant whenNotPaused {
        require(_amount >= 1 ether, "Min stake 1 token");
        require(_tierId <= 2, "Invalid Tier");

        // Transfer Tokens
        bool success = stakingToken.transferFrom(msg.sender, address(this), _amount);
        require(success, "Transfer failed");

        updatePool();

        LockTier memory tier = distinctTiers[_tierId];
        uint256 weight = (_amount * tier.multiplier) / 100;
        
        totalWeightedStake += weight;

        Deposit memory newDeposit = Deposit({
            amount: _amount,
            weightedAmount: weight,
            rewardDebt: (weight * accRewardPerShare) / PRECISION,
            lockEndTime: block.timestamp + tier.duration,
            unbondingEnd: 0,
            tierId: _tierId,
            isWithdrawn: false,
            totalClaimed: 0,
            totalCompounded: 0,
            useAutoCompound: _autoCompound,
            lastAutoCompound: block.timestamp
        });

        userDeposits[msg.sender].push(newDeposit);
        emit Staked(msg.sender, userDeposits[msg.sender].length - 1, _amount, _tierId, _autoCompound);
    }

    function _claim(uint256 _index) internal returns (uint256) {
        Deposit storage dep = userDeposits[msg.sender][_index];
        if (dep.isWithdrawn || dep.unbondingEnd > 0) return 0;

        uint256 pending = ((dep.weightedAmount * accRewardPerShare) / PRECISION) - dep.rewardDebt;
        if (pending > 0) {
            dep.rewardDebt = (dep.weightedAmount * accRewardPerShare) / PRECISION;
            return pending;
        }
        return 0;
    }

    function claim(uint256 _index) external nonReentrant whenNotPaused {
        updatePool();
        uint256 reward = _claim(_index);
        require(reward > 0, "No rewards");
        
        userDeposits[msg.sender][_index].totalClaimed += reward;

        bool success = stakingToken.transfer(msg.sender, reward);
        require(success, "Transfer failed");

        emit RewardClaimed(msg.sender, reward);
    }

    function claimAll() external nonReentrant whenNotPaused {
        updatePool();
        uint256 totalReward = userAccumulatedRewards[msg.sender];
        userAccumulatedRewards[msg.sender] = 0;

        for (uint256 i = 0; i < userDeposits[msg.sender].length; i++) {
            uint256 reward = _claim(i);
            if (reward > 0) {
                totalReward += reward;
                userDeposits[msg.sender][i].totalClaimed += reward;
            }
        }

        require(totalReward > 0, "No rewards to claim");
        bool success = stakingToken.transfer(msg.sender, totalReward);
        require(success, "Transfer failed");

        emit RewardClaimed(msg.sender, totalReward);
    }

    function compound(uint256 _index) public nonReentrant whenNotPaused {
        updatePool();
        uint256 reward = _claim(_index);
        require(reward > 0, "No rewards");

        Deposit storage dep = userDeposits[msg.sender][_index];
        dep.amount += reward;
        dep.totalCompounded += reward;
        
        LockTier memory tier = distinctTiers[dep.tierId];
        dep.weightedAmount = (dep.amount * tier.multiplier) / 100;
        dep.rewardDebt = (dep.weightedAmount * accRewardPerShare) / PRECISION;
        
        totalWeightedStake += (reward * tier.multiplier) / 100;

        emit Compounded(msg.sender, _index, reward);
    }

    function toggleAutoCompound(uint256 _index) external {
        userDeposits[msg.sender][_index].useAutoCompound = !userDeposits[msg.sender][_index].useAutoCompound;
    }

    function automatedCompound(address _user, uint256 _index) external nonReentrant whenNotPaused onlyRole(KEEPER_ROLE) {
        updatePool();
        
        Deposit storage dep = userDeposits[_user][_index];
        require(!dep.isWithdrawn, "Withdrawn");
        require(dep.unbondingEnd == 0, "Unbonding");
        require(dep.useAutoCompound, "Auto-compound disabled");

        // Internal claim logic for the target user
        uint256 pending = ((dep.weightedAmount * accRewardPerShare) / PRECISION) - dep.rewardDebt;
        require(pending > 0, "No rewards");

        dep.rewardDebt = (dep.weightedAmount * accRewardPerShare) / PRECISION;
        dep.totalCompounded += pending;
        dep.amount += pending;

        LockTier memory tier = distinctTiers[dep.tierId];
        dep.weightedAmount = (dep.amount * tier.multiplier) / 100;
        dep.rewardDebt = (dep.weightedAmount * accRewardPerShare) / PRECISION;

        totalWeightedStake += (pending * tier.multiplier) / 100;

        emit Compounded(_user, _index, pending);
    }

    function requestUnstake(uint256 _index) external nonReentrant whenNotPaused {
        updatePool();
        Deposit storage dep = userDeposits[msg.sender][_index];
        require(!dep.isWithdrawn, "Already withdrawn");
        require(dep.unbondingEnd == 0, "Already unbonding");
        require(block.timestamp >= dep.lockEndTime, "Locked");

        uint256 harvested = _claim(_index);
        userAccumulatedRewards[msg.sender] += harvested;

        totalWeightedStake -= dep.weightedAmount;
        dep.weightedAmount = 0;
        dep.rewardDebt = 0;

        dep.unbondingEnd = block.timestamp + UNBONDING_PERIOD;

        emit UnstakeRequested(msg.sender, _index, dep.amount, harvested);
    }

    function withdraw(uint256 _index) external nonReentrant {
        Deposit storage dep = userDeposits[msg.sender][_index];
        require(dep.unbondingEnd > 0, "Not unbonding");
        require(block.timestamp >= dep.unbondingEnd, "Cooldown active");
        require(!dep.isWithdrawn, "Already withdrawn");

        uint256 principal = dep.amount;
        uint256 rewardBonus = userAccumulatedRewards[msg.sender];
        uint256 totalAmt = principal + rewardBonus;

        dep.amount = 0;
        dep.isWithdrawn = true;
        userAccumulatedRewards[msg.sender] = 0;
        
        bool success = stakingToken.transfer(msg.sender, totalAmt);
        require(success, "Transfer failed");

        emit Withdrawn(msg.sender, _index, totalAmt);
    }

    // --- ADMINISTRATIVE ---

    function setRewardRate(uint256 _rate) external onlyRole(GOVERNOR_ROLE) {
        updatePool();
        uint256 oldRate = rewardRate;
        rewardRate = _rate;
        emit RewardRateUpdated(oldRate, _rate);
    }

    function setTierAPY(uint8 _tierId, uint256 _minAPY, uint256 _maxAPY) external onlyRole(GOVERNOR_ROLE) {
        require(_tierId <= 2, "Invalid tier");
        require(_minAPY <= _maxAPY, "Min > Max");
        distinctTiers[_tierId].minAPY = _minAPY;
        distinctTiers[_tierId].maxAPY = _maxAPY;
    }

    function emergencyWithdraw(uint256 _index) external nonReentrant whenPaused {
        Deposit storage dep = userDeposits[msg.sender][_index];
        require(!dep.isWithdrawn, "Withdrawn");
        
        uint256 amt = dep.amount;
        dep.amount = 0;
        dep.isWithdrawn = true;
        totalWeightedStake -= dep.weightedAmount;

        bool success = stakingToken.transfer(msg.sender, amt);
        require(success, "Failed");
    }
}
