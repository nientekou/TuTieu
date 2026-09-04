import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const SLUT_COOLDOWN = 45 * 60 * 1000;

const SLUT_ACTIVITIES = [
    { name: "Bày Quán Bói Mệnh", min: 120, max: 450, risk: 0.2 },
    { name: "Họa Phù Trấn Trạch", min: 220, max: 700, risk: 0.25 },
    { name: "Luyện Đan Thuê", min: 320, max: 900, risk: 0.3 },
    { name: "Hộ Tống Linh Vật", min: 550, max: 1400, risk: 0.35 },
    { name: "Thăm Dò Bí Cảnh", min: 850, max: 2200, risk: 0.4 },
];

const POSITIVE_OUTCOMES = [
    "Đạo Hữu gặp đại cơ duyên, thu được không ít Linh Thạch.",
    "Một vị tiền bối hào phóng ban thưởng hậu hĩnh.",
    "Chuyến hành đạo thuận buồm xuôi gió, thu hoạch vượt mong đợi.",
    "Tình cờ khai mở một linh mạch, nhận được khoản Linh Thạch lớn.",
];

const FINE_OUTCOMES = [
    "Tuần tra của Tiên Minh phát hiện vi phạm, Đạo Hữu bị phạt Linh Thạch.",
    "Phạm phải môn quy của địa phương, đành nộp một khoản phạt.",
    "Chạm phải cấm chế trong bí cảnh, phải dùng Linh Thạch hóa giải.",
];

const ROBBED_OUTCOMES = [
    "Bị tà tu lừa mất một phần Linh Thạch.",
    "Giữa đường gặp cướp tu chân, Linh Thạch bị cướp đi không ít.",
    "Tin nhầm thương nhân giả mạo, tổn thất một khoản Linh Thạch.",
];

const LOSS_OUTCOMES = [
    "Luyện đan thất bại, dược liệu cháy sạch, lỗ vốn.",
    "Bày trận tiêu hao quá nhiều tài nguyên mà không thu được gì.",
    "TChuyến hành đạo thất bại, hao tổn Linh Thạch mà không có thu hoạch.",
];

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function resolveOutcome(activity, wallet) {
    const successChance = Math.max(0.35, 0.55 - activity.risk * 0.2);
    const fineChance = 0.22;
    const robbedChance = 0.2;
    const roll = Math.random();

    if (roll < successChance) {
        const amount = randomInt(activity.min, activity.max);
        return {
            type: 'payout',
            delta: amount,
            message: randomChoice(POSITIVE_OUTCOMES),
            title: `${activity.name} - Payout`
        };
    }

    const remainingAfterSuccess = roll - successChance;

    if (remainingAfterSuccess < fineChance) {
        const maxFine = Math.min(wallet, Math.max(150, Math.floor(activity.max * 0.4)));
        const minFine = Math.min(maxFine, Math.max(50, Math.floor(activity.min * 0.2)));
        const amount = maxFine > 0 ? randomInt(minFine, maxFine) : 0;
        return {
            type: 'fine',
            delta: -amount,
            message: randomChoice(FINE_OUTCOMES),
            title: `${activity.name} - Fined`
        };
    }

    if (remainingAfterSuccess < fineChance + robbedChance) {
        const maxRobbed = Math.min(wallet, Math.max(200, Math.floor(wallet * 0.35)));
        const minRobbed = Math.min(maxRobbed, Math.max(75, Math.floor(wallet * 0.1)));
        const amount = maxRobbed > 0 ? randomInt(minRobbed, maxRobbed) : 0;
        return {
            type: 'robbed',
            delta: -amount,
            message: randomChoice(ROBBED_OUTCOMES),
            title: `${activity.name} - Robbed`
        };
    }

    const maxLoss = Math.min(wallet, Math.max(100, Math.floor(activity.max * 0.3)));
    const minLoss = Math.min(maxLoss, Math.max(40, Math.floor(activity.min * 0.15)));
    const amount = maxLoss > 0 ? randomInt(minLoss, maxLoss) : 0;
    return {
        type: 'loss',
        delta: -amount,
        message: randomChoice(LOSS_OUTCOMES),
        title: `${activity.name} - Loss`
    };
}

export default {
    data: new SlashCommandBuilder()
        .setName('slut')
        .setDescription('Take a risky provocative job for random payout or loss'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

            const userId = interaction.user.id;
            const guildId = interaction.guildId;
            const now = Date.now();

            logger.debug(`[ECONOMY] Slut command started for ${userId}`, { userId, guildId });

            const userData = await getEconomyData(client, guildId, userId);

            if (!userData) {
                throw createError(
                    "Failed to load economy data for slut command",
                    ErrorTypes.DATABASE,
                    "Failed to load your economy data. Please try again later.",
                    { userId, guildId }
                );
            }

            const lastSlut = userData.lastSlut || 0;

            if (now - lastSlut < SLUT_COOLDOWN) {
                const remainingTime = lastSlut + SLUT_COOLDOWN - now;
                throw createError(
                    "Slut cooldown active",
                    ErrorTypes.RATE_LIMIT,
                    `You need to wait before you can work again! Try again in **${Math.ceil(remainingTime / 60000)}** minutes.`,
                    { timeRemaining: remainingTime, cooldownType: 'slut' }
                );
            }

            const activity = randomChoice(SLUT_ACTIVITIES);

            const outcome = resolveOutcome(activity, userData.wallet || 0);

            userData.lastSlut = now;
            userData.totalSluts = (userData.totalSluts || 0) + 1;
            userData.totalSlutEarnings = (userData.totalSlutEarnings || 0) + Math.max(0, outcome.delta);
            userData.totalSlutLosses = (userData.totalSlutLosses || 0) + Math.max(0, -outcome.delta);

            if (outcome.type !== 'payout') {
                userData.failedSluts = (userData.failedSluts || 0) + 1;
            }

            userData.wallet = Math.max(0, (userData.wallet || 0) + outcome.delta);

            await setEconomyData(client, guildId, userId, userData);

            logger.info(`[ECONOMY_TRANSACTION] Slut activity resolved`, {
                userId,
                guildId,
                activity: activity.name,
                outcomeType: outcome.type,
                amountDelta: outcome.delta,
                newWallet: userData.wallet,
                timestamp: new Date().toISOString()
            });

            const amountLabel = `${outcome.delta >= 0 ? '+' : '-'}$${Math.abs(outcome.delta).toLocaleString()}`;
            const summaryLines = [
                `${outcome.message}`,
                `<a:qua2:1545398106986774528> **Linh Thạch Thu Hoạch:** ${amountLabel}`,
                `<:tvp1:1545082419273801859> **Linh Thạch Hiện Có:** $${userData.wallet.toLocaleString()}`,
                `<:vdl:1545397492831494144> **Số Lần Hành Đạo:** ${userData.totalSluts}`,
                `<:lt1:1545082415033360495> **Tổng Linh Thạch Thu Được** $${(userData.totalSlutEarnings || 0).toLocaleString()}`,
                `🧾 **Tổng Linh Thạch Hao Tổn:** $${(userData.totalSlutLosses || 0).toLocaleString()}`
            ];

            const embed = createEmbed({
                title: outcome.title,
                description: summaryLines.join('\n'),
                color: outcome.delta >= 0 ? 'success' : 'error',
                timestamp: true
            });

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'slut' })
};
