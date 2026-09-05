// economy.js

import { getColor, getEconomyKey as getEconomyStorageKey } from './database.js';
import { BotConfig } from '../config/bot.js';
import { normalizeEconomyData } from './schemas.js';
import { logger } from './logger.js';
import { validateDiscordId, validateNumber } from './validation.js';
import { DEFAULT_ECONOMY_DATA } from './constants.js';
import { createError, ErrorTypes, wrapServiceBoundary } from './errorHandler.js';

const ECONOMY_CONFIG = BotConfig.economy || {};
const BASE_BANK_CAPACITY = ECONOMY_CONFIG.baseBankCapacity || 10000;
const BANK_CAPACITY_PER_LEVEL = ECONOMY_CONFIG.bankCapacityPerLevel || 5000;
const DAILY_AMOUNT = ECONOMY_CONFIG.dailyAmount || 100;
const WORK_MIN = ECONOMY_CONFIG.workMin || 10;
const WORK_MAX = ECONOMY_CONFIG.workMax || 100;
const COOLDOWNS = ECONOMY_CONFIG.cooldowns || {
daily: 24 * 60 * 60 * 1000,
work: 60 * 60 * 1000,
crime: 2 * 60 * 60 * 1000,
rob: 4 * 60 * 60 * 1000,
};

export function getEconomyKey(guildId, userId) {
    const validGuildId = validateDiscordId(guildId, 'guildId');
    const validUserId = validateDiscordId(userId, 'userId');
    
    if (!validGuildId || !validUserId) {
        throw new Error('Invalid guild ID or user ID');
    }
    
    return getEconomyStorageKey(validGuildId, validUserId);
}

export function getMaxBankCapacity(userData) {
    if (!userData) return BASE_BANK_CAPACITY;
    
    const bankLevel = userData.bankLevel || 0;
    let capacity = BASE_BANK_CAPACITY + (bankLevel * BANK_CAPACITY_PER_LEVEL);

    const upgrades = userData.upgrades || {};
    const inventory = userData.inventory || {};

    if (upgrades['linhkho+']) {
        capacity = Math.floor(capacity * 1.5);
    }

    const kheuocs = inventory['kheuoc'] || 0;
    capacity += (kheuocs * 10000);
    
    return capacity;
}

export function formatCurrency(amount) {
    const currencyName = ECONOMY_CONFIG.currency?.name || 'coins';
    return `${amount.toLocaleString()} ${currencyName}`;
}

export async function getEconomyData(client, guildId, userId) {
    try {
        if (!client.db || typeof client.db.get !== 'function') {
            throw new Error('Dữ liệu không tồn tại');
        }

        const key = getEconomyKey(guildId, userId);
        const data = await client.db.get(key, {});
        const defaults = {
            ...DEFAULT_ECONOMY_DATA,
            wallet: ECONOMY_CONFIG.startingBalance ?? DEFAULT_ECONOMY_DATA.wallet,
        };
        
        return normalizeEconomyData(data, defaults);
    } catch (error) {
        logger.error(`Không thể tìm thấy thông tin của ${userId}`, error);
        return normalizeEconomyData({}, DEFAULT_ECONOMY_DATA);
    }
}

export async function setEconomyData(client, guildId, userId, data) {
    try {
        if (!client.db || typeof client.db.set !== 'function') {
            throw new Error('Dữ liệu không tồn tại');
        }

        const key = getEconomyKey(guildId, userId);
        const normalized = normalizeEconomyData(data, DEFAULT_ECONOMY_DATA);
        await client.db.set(key, normalized);
        return true;
    } catch (error) {
        logger.error(`Không thể lưu thông tin của ${userId}`, error);
        return false;
    }
}

export async function updateBalance(client, guildId, userId, options = {}) {
    const data = await getEconomyData(client, guildId, userId);
    
    if (options.wallet !== undefined) {
        data.wallet = Math.max(0, (data.wallet || 0) + options.wallet);
    }
    
    if (options.bank !== undefined) {
        const maxBank = getMaxBankCapacity(data);
        data.bank = Math.min(Math.max(0, (data.bank || 0) + options.bank), maxBank);
    }
    
    if (options.xp !== undefined) {
        data.xp = Math.max(0, (data.xp || 0) + options.xp);
        
        const xpNeeded = Math.floor(5 * Math.pow(data.level || 1, 2) + 50 * (data.level || 1) + 100);
        if (data.xp >= xpNeeded) {
            data.xp -= xpNeeded;
            data.level = (data.level || 1) + 1;
            data.leveledUp = true;
        }
    }
    
    await setEconomyData(client, guildId, userId, data);
    return data;
}

export function checkCooldown(userData, action) {
    const cooldownTime = COOLDOWNS[action] || 0;
    const lastUsed = userData[`last${action.charAt(0).toUpperCase() + action.slice(1)}`] || 0;
    const now = Date.now();
    const remaining = Math.max(0, (lastUsed + cooldownTime) - now);
    
    return {
        onCooldown: remaining > 0,
        remaining,
        formatted: formatCooldown(remaining)
    };
}

function formatCooldown(ms) {
    if (ms < 1000) return 'now';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

export function getWorkReward() {
    const amount = Math.floor(Math.random() * (WORK_MAX - WORK_MIN + 1)) + WORK_MIN;
    const jobs = [
        'truy tìm linh dược trong núi',
        'áp tải linh thạch đến phường thị',
        'trừ yêu thú quanh sơn môn',
        'thu thập linh thảo',
        'hộ tống đệ tử xuống núi',
        'điều tra dị động nơi hoang sơn',
        'khai thác linh thạch',
        'đưa thư đến một vị đạo hữu',
        'giúp đỡ phàm nhân giải quyết phiền nhiễu',
        'thu hồi pháp khí thất lạc'
    ];
    
    const job = jobs[Math.floor(Math.random() * jobs.length)];
    
    return {
        amount,
        job,
        message: `Đạo Hữu ${job} và nhận được ${formatCurrency(amount)}!`
    };
}

export function getCrimeOutcome() {
    const outcomes = [
        {
            success: true,
            amount: Math.floor(Math.random() * 200) + 50,
            message: 'Đạo Hữu đã thành công đoạt lấy {amount} Linh Thạch rồi ung dung rời đi!' 
        },
        {
            success: true,
            amount: Math.floor(Math.random() * 100) + 20,
            message: 'Đạo Hữu thừa lúc đối phương sơ ý, thuận tay lấy đi {amount} Linh Thạch!' 
        },
        {
            success: true,
            amount: Math.floor(Math.random() * 150) + 30,
            message: 'Đạo Hữu lặng lẽ phá giải cấm chế, lấy được {amount} Linh Thạch!' 
        },
        {
            success: false,
            fine: Math.floor(Math.random() * 100) + 50,
            message: 'Đạo Hữu hành sự bất cẩn, bị người phát giác và phải bồi thường {fine} Linh Thạch!' 
        },
        {
            success: false,
            fine: Math.floor(Math.random() * 150) + 50,
            message: 'Đạo Hữu vừa ra tay đã bị bắt tại trận, đành giao nộp {fine} Linh Thạch để giải quyết!' 
        },
        {
            success: false,
            fine: 0,
            message: 'Đạo Hữu ra tay bất thành, may mà kịp thời rút lui nên không mất gì.' 
        }
    ];
    
    return outcomes[Math.floor(Math.random() * outcomes.length)];
}

export function getRobOutcome(targetBalance) {
    if (targetBalance <= 0) {
        return {
            success: false,
            amount: 0,
            message: 'Đạo Hữu chẳng tìm thấy Linh Thạch nào trên người đối phương!'
        };
    }
    
const success = Math.random() > 0.4;
    
    if (success) {
        const amount = Math.min(
Math.floor(Math.random() * (targetBalance * 0.3)) + 1,
            targetBalance
        );
        
        return {
            success: true,
            amount,
            message: `Đạo Hữu ra tay thần không biết quỷ không hay, đoạt được {amount} Linh Thạch rồi toàn thân trở lui!`
        };
    } else {
        const fine = Math.floor(Math.random() * 200) + 100;
        
        return {
            success: false,
            amount: 0,
            fine,
            message: `Đạo Hữu bị đối phương phát giác, chẳng những không đoạt được gì mà còn phải bồi thường {fine} Linh Thạch!`
        };
    }
}

export function formatShopItem(item, index) {
    return `**${index + 1}.** ${item.emoji} **${item.name}** - ${formatCurrency(item.price)}\n${item.description}\n`;
}

export const addMoney = wrapServiceBoundary(async function addMoney(client, guildId, userId, amount, type = 'wallet') {
    const validAmount = validateNumber(amount, 'amount');
    if (validAmount === null || validAmount <= 0) {
        throw createError(
            'Số Không Đúng',
            ErrorTypes.VALIDATION,
            'Phải là số dương',
            { guildId, userId, amount, operation: 'addMoney' }
        );
    }

    if (type !== 'wallet' && type !== 'bank') {
        throw createError(
            'Nhập Sai Thông Tin',
            ErrorTypes.VALIDATION,
            'Bắt buộc phải nhập "wallet" hoặc "bank".',
            { guildId, userId, type, operation: 'addMoney' }
        );
    }

    const userData = await getEconomyData(client, guildId, userId);

    if (type === 'bank') {
        const maxBank = getMaxBankCapacity(userData);
        if ((userData.bank || 0) + validAmount > maxBank) {
            throw createError(
                'Thông Bảo Khố Vượt Hạn Mức',
                ErrorTypes.VALIDATION,
                `Thông Bảo Khố đã đạt giới hạn chứa Linh Thạch. Hiện có ${userData.bank || 0}, Max: ${maxBank}.`,
                { guildId, userId, current: userData.bank || 0, max: maxBank, operation: 'addMoney' }
            );
        }
        userData.bank = (userData.bank || 0) + validAmount;
    } else {
        userData.wallet = (userData.wallet || 0) + validAmount;
    }

    await setEconomyData(client, guildId, userId, userData);

    return {
        newBalance: type === 'bank' ? userData.bank : userData.wallet,
        ...(type === 'bank' ? { maxBank: getMaxBankCapacity(userData) } : {}),
    };
}, {
    service: 'economy',
    operation: 'addMoney',
    userMessage: 'Không thể thêm Linh Thạch. Hãy thử lại.',
});

export const removeMoney = wrapServiceBoundary(async function removeMoney(client, guildId, userId, amount, type = 'wallet') {
    const validAmount = validateNumber(amount, 'amount');
    if (validAmount === null || validAmount <= 0) {
        throw createError(
            'Số Không Đúng',
            ErrorTypes.VALIDATION,
            'Bắt buộc phải là số dương',
            { guildId, userId, amount, operation: 'removeMoney' }
        );
    }

    if (type !== 'wallet' && type !== 'bank') {
        throw createError(
            'Nhập Sai Thông Tin',
            ErrorTypes.VALIDATION,
            'Bắt buộc phải nhập "wallet" hoặc "bank".',
            { guildId, userId, type, operation: 'removeMoney' }
        );
    }

    const userData = await getEconomyData(client, guildId, userId);

    if (type === 'bank') {
        if ((userData.bank || 0) < validAmount) {
            throw createError(
                'Không Đủ Số Dư Linh Thạch',
                ErrorTypes.VALIDATION,
                `Số dư trong Thông Bảo Khố không đủ. Hiện có: ${userData.bank || 0}, need ${validAmount}.`,
                { guildId, userId, current: userData.bank || 0, required: validAmount, operation: 'removeMoney' }
            );
        }
        userData.bank = (userData.bank || 0) - validAmount;
    } else {
        if ((userData.wallet || 0) < validAmount) {
            throw createError(
                'Không Đủ Linh Thạch',
                ErrorTypes.VALIDATION,
                `Linh Nang không có đủ Linh Thạch. Hiện có: ${userData.wallet || 0}, need ${validAmount}.`,
                { guildId, userId, current: userData.wallet || 0, required: validAmount, operation: 'removeMoney' }
            );
        }
        userData.wallet = (userData.wallet || 0) - validAmount;
    }

    await setEconomyData(client, guildId, userId, userData);

    return {
        newBalance: type === 'bank' ? userData.bank : userData.wallet,
    };
}, {
    service: 'economy',
    operation: 'removeMoney',
    userMessage: 'Thao tác thất bại, hãy thử lại',
});

export function getShopInventory() {
    return [
        {
            id: 'canthinhtrieu',
            name: 'Cần Thính Triều',
            emoji: '🎣',
            price: 500,
            description: 'Triều Sinh Vạn Tượng đã mở. Triều dâng sinh vạn tượng. Sao còn chần chờ chưa vác cần đến đó kiếm một ít cơ duyên? Mang theo Cần Thính Triều, người câu không chỉ nhìn phao mà nghe con nước, thuận theo thủy thế.',
            type: 'tool'
        },
        {
            id: 'cungliepthu',
            name: 'Cung Liệp Thú',
            emoji: '<:cunglt:1545746554483384340>',
            price: 1000,
            description: 'Dùng để săn thú, thu lấy thịt và da.',
            type: 'tool'
        },
        {
            id: 'nhanngauthanh',
            name: 'Nhẫn Ngẫu Thành',
            emoji: '<:nhannt:1545735909067063356>',
            price: 2000,
            description: 'Nhẫn đem lại những cuộc gặp và kết quả ngoài dự liệu, tăng thêm linh thạch khi làm Nhiệm Vụ',
            type: 'tool',
            workMultiplier: 1.5
        },
        {
            id: 'khengan',
            name: 'Khế Ngân',
            emoji: '<:kheuoc:1545739667368972338>',
            price: 5000,
            description: 'Gia tăng 50,000 giới hạn Linh Thạch mà Đạo Hữu có thể ký gửi vào Thông Bảo Trang',
            type: 'upgrade',
            effect: 'bank_capacity',
            value: 50000
        },
        {
            id: 'phieuvan',
            name: 'Phiếu Kỳ Vận',
            emoji: '<:phieuvan:1545745617823993976>',
            price: 100,
            description: 'Một tấm phiếu lĩnh vận, thử xem hôm nay Đạo Hữu có được thiên ý chiếu cố.',
            type: 'consumable',
            use: 'gamble'
        }
    ];
}
