import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { successEmbed, buildUserErrorEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData, getMaxBankCapacity } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('deposit')
        .setDescription('Gửi Linh Thạch từ Linh Nang vào Thương Bảo Khố.')
        .addStringOption(option =>
            option
                .setName('amount')
                .setDescription('Số Linh Thạch muốn gửi hoặc nhập "all" để gửi toàn bộ.')
                .setRequired(true)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;
        
        const userId = interaction.user.id;
            const guildId = interaction.guildId;
            const amountInput = interaction.options.getString("amount");

            const userData = await getEconomyData(client, guildId, userId);
            
            if (!userData) {
                throw createError(
                    "Không thể bước vào Thương Bảo Khố",
                    ErrorTypes.DATABASE,
                    "Thương Bảo Khố đông người tấp nập. Hay là quay lại sau.",
                    { userId, guildId }
                );
            }
            
            const maxBank = getMaxBankCapacity(userData);
            let depositAmount;

            if (amountInput.toLowerCase() === "all") {
                depositAmount = userData.wallet;
            } else {
                depositAmount = parseInt(amountInput);

                if (isNaN(depositAmount) || depositAmount <= 0) {
                    throw createError(
                        "Số lượng gửi không hợp lệ",
                        ErrorTypes.VALIDATION,
                        `Hãy nhập một số hợp lệ hoặc **all** để gửi toàn bộ Linh Thạch. Đạo Hữu đã nhập: \`${amountInput}\``,
                        { amountInput, userId }
                    );
                }
            }

            if (depositAmount === 0) {
                throw createError(
                    "Linh Nang Trống",
                    ErrorTypes.VALIDATION,
                    "Linh Nang của Đạo Hữu không có Linh Thạch để gửi vào Thương Bảo Khố.",
                    { userId, walletBalance: userData.wallet }
                );
            }

            if (depositAmount > userData.wallet) {
                depositAmount = userData.wallet;
                await interaction.followUp({
                    embeds: [
                        buildUserErrorEmbed(
                            'validation',
                            `Đạo Hữu không mang đủ số Linh Thạch đó. Tự động gửi toàn bộ **${depositAmount.toLocaleString()}**<:lt1:1545082415033360495>`
                        )
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            const availableSpace = maxBank - userData.bank;

            if (availableSpace <= 0) {
                throw createError(
                    "Thương Bảo Khố đã đầy",
                    ErrorTypes.VALIDATION,
                    `Thương Bảo Khố đã đạt hạn mức chứa (${maxBank.toLocaleString()}<:lt1:1545082415033360495>). Hãy sử dụng **Khế Ngân** để mở rộng hạn mức.`,
                    { maxBank, currentBank: userData.bank, userId }
                );
            }

            if (depositAmount > availableSpace) {
                const originalDepositAmount = depositAmount;
                depositAmount = availableSpace;

                if (amountInput.toLowerCase() !== "all") {
                    await interaction.followUp({
                        embeds: [
                            buildUserErrorEmbed(
                                'validation',
                                `Thương Bảo Khố chỉ còn đủ chỗ cho **${depositAmount.toLocaleString()}<:lt1:1545082415033360495>** (Giới hạn: ${maxBank.toLocaleString()}<:lt1:1545082415033360495>). Phần còn lại vẫn được giữ trong Linh Nang.`
                            )
                        ],
                        flags: MessageFlags.Ephemeral,
                    });
                }
            }

            if (depositAmount === 0) {
                throw createError(
                    "Không thể gửi Linh Thạch",
                    ErrorTypes.VALIDATION,
                    "Thương Bảo Khố không còn chỗ trống hoặc số Linh Thạch muốn gửi không hợp lệ.",
                    { depositAmount, availableSpace, walletBalance: userData.wallet }
                );
            }

            userData.wallet -= depositAmount;
            userData.bank += depositAmount;

            await setEconomyData(client, guildId, userId, userData);

            const embed = successEmbed(
                '<:tientrang:1545104597901774948> Gửi Vào Thương Bảo Khố Thành Công',
                `Đạo Hữu đã gửi thành công **${depositAmount.toLocaleString()}**<:lt1:1545082415033360495> vào Thương Bảo Khố`
            )
                .addFields(
                    {
                        name: "<:lt1:1545082415033360495> Hiện Có:",
                        value: `${userData.wallet.toLocaleString()}<:lt1:1545082415033360495>`,
                        inline: true,
                    },
                    {
                        name: "<:tientrang:1545104597901774948> Hiện Có:",
                        value: `${userData.bank.toLocaleString()}<:lt1:1545082415033360495> / ${maxBank.toLocaleString()}<:lt1:1545082415033360495>`,
                        inline: true,
                    },
                );

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'deposit' })
};
