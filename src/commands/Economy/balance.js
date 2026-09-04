import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, getMaxBankCapacity } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription("Mở Túi Càn Khôn của bạn hoặc người khác")
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Người bạn cần xem Túi Càn Khôn')
                .setRequired(false)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const userOption = interaction.options.getUser("user");
        const targetUser = userOption || interaction.user;
        const guildId = interaction.guildId;

        logger.info(`[ECONOMY] Mở Túi - userOption: ${userOption?.id || 'null'}, targetUser: ${targetUser.id}, guildId: ${guildId}, isPrefix: ${!!interaction._commandStartTime}`);

        logger.debug(`[ECONOMY] Mở Túi ${targetUser.id}`, { userId: targetUser.id, guildId });

        if (targetUser.bot) {
            throw createError(
                "Đang kiểm tra",
                ErrorTypes.VALIDATION,
                "Bots không có Túi Càn Khôn"
            );
        }

        const userData = await getEconomyData(client, guildId, targetUser.id);

        logger.info(`[ECONOMY] Economy data retrieved - userData:`, userData);

        if (!userData) {
            throw createError(
                "Túi Càn Khôn bị kẹt",
                ErrorTypes.DATABASE,
                "Túi Càn Khôn không thể mở ra, thử lại lần sau vậy",
                { userId: targetUser.id, guildId }
            );
        }

        const maxBank = getMaxBankCapacity(userData);

        const wallet = typeof userData.wallet === 'number' ? userData.wallet : 0;
        const bank = typeof userData.bank === 'number' ? userData.bank : 0;

            const embed = createEmbed({
                title: `Túi Càn Khôn của ${targetUser.username}`,
                description: `Bên trong Túi Càn Khôn của ${targetUser.username}.`,
            })
                .addFields(
                    {
                        name: "<:lt1:1545082415033360495> Linh Thạch",
                        value: `${wallet.toLocaleString()}<:lt1:1545082415033360495>`,
                        inline: true,
                    },
                    {
                        name: "<:tientrang:1545104597901774948> Tiền Trang",
                        value: `${bank.toLocaleString()}<:lt1:1545082415033360495> / ${maxBank.toLocaleString()}<:lt1:1545082415033360495>`,
                        inline: true,
                    },
                    {
                        name: "<:tvp1:1545082419273801859> Tổng cộng",
                        value: `${(wallet + bank).toLocaleString()}<:lt1:1545082415033360495>`,
                        inline: true,
                    }
                )
                .setFooter({
                    text: `Nhìn trộm bởi ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                });

            logger.info(`[ECONOMY] Đã mở Túi`, { userId: targetUser.id, wallet, bank });

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'balance' })
};
