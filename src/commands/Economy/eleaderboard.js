import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { getEconomyPrefix } from '../../utils/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName("bxhtaiphu")
        .setDescription("Xem bảng xếp hạng 10 Đạo Hữu có tổng tài sản Linh Thạch cao nhất.")
        .setDMPermission(false),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

            const guildId = interaction.guildId;

            logger.debug(`[ECONOMY] BXH Tài Phú`, { guildId });

            const prefix = getEconomyPrefix(guildId);

            let allKeys = await client.db.list(prefix);

            if (!Array.isArray(allKeys)) {
                allKeys = [];
            }

            if (allKeys.length === 0) {
                throw createError(
                    "Chưa có vị Đạo Hữu nào",
                    ErrorTypes.VALIDATION,
                    "Chưa có vị Đạo Hữu nào xuất hiện."
                );
            }

            let allUserData = [];

            for (const key of allKeys) {
                const userId = key.replace(prefix, "");
                const userData = await client.db.get(key);

                if (userData) {
                    allUserData.push({
                        userId: userId,
                        net_worth: (userData.wallet || 0) + (userData.bank || 0),
                    });
                }
            }

            allUserData.sort((a, b) => b.net_worth - a.net_worth);

            const topUsers = allUserData.slice(0, 10);
            const userRank =
                allUserData.findIndex((u) => u.userId === interaction.user.id) +
                1;
            const rankEmoji = ["<:taiphu1:1546542226937610300>", "<:taiphu2:1546542223053561976>", "<:taiphu3:1546542220784443532>"];
            const leaderboardEntries = [];

            for (let i = 0; i < topUsers.length; i++) {
                const user = topUsers[i];
                const rank = i + 1;
                const emoji = rankEmoji[i] || `**#${rank}**`;

                leaderboardEntries.push(
                    `${emoji} <@${user.userId}> - 🏦 ${user.net_worth.toLocaleString()}`,
                );
            }

            logger.info(`[ECONOMY] Leaderboard generated`, { 
                guildId, 
                userCount: allUserData.length,
                userRank 
            });

            const description = leaderboardEntries.length > 0
                ? leaderboardEntries.join("\n")
                : "Bảng Tài Phú";

            const embed = createEmbed({
                title: `Economy Leaderboard`,
                description,
                footer: `Thứ hạng của Đạo Hữu:  ${userRank > 0 ?`#${userRank}`: "Chưa có thứ hạng"}`,
            });

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'bxhtaiphu' })
};
