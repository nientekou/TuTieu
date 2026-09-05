import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { getGuildConfig } from '../../services/config/guildConfig.js';
import { formatDuration } from '../../utils/embeds.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { botConfig } from '../../config/bot.js';

const DAILY_COOLDOWN = 24 * 60 * 60 * 1000;
const DAILY_AMOUNT = botConfig.economy?.dailyAmount ?? 100;
const PREMIUM_BONUS_PERCENTAGE = 0.1;

export default {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Nhận phần thưởng Linh Thạch hôm nay.'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;
            
            const userId = interaction.user.id;
            const guildId = interaction.guildId;
            const now = Date.now();

            logger.debug(`[ECONOMY] Đã bắt đầu nhận thưởng hằng ngày cho ${userId}`, { userId, guildId });

            const userData = await getEconomyData(client, guildId, userId);
            
            if (!userData) {
                throw createError(
                    "Không thể tải dữ liệu Linh Thạch của Đạo Hữu",
                    ErrorTypes.DATABASE,
                    "Không thể tải dữ liệu Linh Thạch của Đạo Hữu. Vui lòng thử lại sau.",
                    { userId, guildId }
                );
            }
            
            const lastDaily = userData.lastDaily || 0;

            if (now < lastDaily + DAILY_COOLDOWN) {
                const timeRemaining = lastDaily + DAILY_COOLDOWN - now;
                throw createError(
                    "Chưa Thể Nhận Thưởng",
                    ErrorTypes.RATE_LIMIT,
                    `Phần thưởng hôm nay đã được nhận. Vui lòng chờ **${formatDuration(timeRemaining)}** rồi nhận lại.`,
                    { timeRemaining, cooldownType: 'daily' }
                );
            }

            const guildConfig = await getGuildConfig(client, guildId);
            const LOANVUBOI_ID = guildConfig.loanvuboiId;

            let earned = DAILY_AMOUNT;
            let bonusMessage = "";
            let hasLoanvuboi = false;

            if (
                LOANVUBOI_ID &&
                interaction.member &&
                interaction.member.roles.cache.has(LOANVUBOI_ID)
            ) {
                const bonusAmount = Math.floor(
                    DAILY_AMOUNT * PREMIUM_BONUS_PERCENTAGE,
                );
                earned += bonusAmount;
                bonusMessage = `\n<:ilvb:1545714174112563240> **Thưởng thêm từ Loan Vũ Bội:** +${bonusAmount.toLocaleString()}<:lt1:1545082415033360495>`;
                hasLoanvuboi = true;
            }

            userData.wallet = (userData.wallet || 0) + earned;
            userData.lastDaily = now;

            await setEconomyData(client, guildId, userId, userData);

            logger.info(`[ECONOMY_TRANSACTION] Đã Nhận Thưởng Hôm Nay`, {
                userId,
                guildId,
                amount: earned,
                newWallet: userData.wallet,
                hasPremium: hasLoanvuboi,
                timestamp: new Date().toISOString()
            });

            const embed = successEmbed(
                "✅ Đã nhận thưởng hằng ngày!",
                `Đạo Hữu đã nhận được **${earned.toLocaleString()}<:lt1:1545082415033360495>**!${bonusMessage}`
            )
                .addFields({
                    name: "<:lt1:1545082415033360495> hiện có:",
                    value: `${userData.wallet.toLocaleString()}<:lt1:1545082415033360495>`,
                    inline: true,
                })
                .setFooter({
                    text: hasLoanvuboi
                        ? `Có thể nhận thưởng lại sau 24 giờ. (Đang sở hữu Loan Vũ Bội)`
                        : `Có thể nhận thưởng lại sau 24 giờ.`,
                });

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'daily' })
};
