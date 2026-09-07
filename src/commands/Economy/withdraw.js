import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData, getMaxBankCapacity } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
        .setName('ruttien')
        .setDescription('Rút Linh Thạch từ Thương Bảo Khố về Linh Nang.')
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Số Linh Thạch muốn rút.')
                .setRequired(true)
                .setMinValue(1)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        await InteractionHelper.safeDefer(interaction);
            
            const userId = interaction.user.id;
            const guildId = interaction.guildId;
            const amountInput = interaction.options.getInteger("amount");

            const userData = await getEconomyData(client, guildId, userId);
            
            if (!userData) {
                throw createError(
                    "Thương Bảo Khố quá đông đúc",
                    ErrorTypes.DATABASE,
                    "Thương Bảo Khố người người nườm nượp, hay là đợi chút nữa.",
                    { userId, guildId }
                );
            }

            let ruttienAmount = amountInput;

            if (ruttienAmount <= 0) {
                throw createError(
                    "Số lượng rút không hợp lệ.",
                    ErrorTypes.VALIDATION,
                    "Đạo Hữu chỉ có thể rút số Linh Thạch lớn hơn 0.",
                    { amount: ruttienAmount, userId }
                );
            }

            if (ruttienAmount > userData.bank) {
                ruttienAmount = userData.bank;
            }

            if (ruttienAmount === 0) {
                throw createError(
                    "Thương Bảo Khố trống",
                    ErrorTypes.VALIDATION,
                    "Thương Bảo Khố của Đạo Hữu không còn Linh Thạch để rút.",
                    { userId, bankBalance: userData.bank }
                );
            }

            userData.wallet += ruttienAmount;
            userData.bank -= ruttienAmount;

            await setEconomyData(client, guildId, userId, userData);

            const embed = successEmbed(
                '### <:tientrang:1545104597901774948> Rút Linh Thạch Thành Công',
                `Đạo Hữu đã rút thành công **${ruttienAmount.toLocaleString()}<:lt1:1545082415033360495>** từ Thương Bảo Khố.`
            )
                .addFields(
                    {
                        name: "<:tvp1:1545082419273801859> Linh Nang",
                        value: `${userData.wallet.toLocaleString()}<:lt1:1545082415033360495>`,
                        inline: true,
                    },
                    {
                        name: "<:tientrang:1545104597901774948> Thương Bảo Khố",
                        value: `${userData.bank.toLocaleString()}<:lt1:1545082415033360495>`,
                        inline: true,
                    },
                );

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'ruttien' })
};
