import { SlashCommandBuilder } from 'discord.js';
import { successEmbed, warningEmbed, buildUserErrorEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { BotConfig } from '../../config/bot.js';

const ROB_COOLDOWN = BotConfig.economy?.cooldowns?.rob ?? 4 * 60 * 60 * 1000;
const BASE_ROB_SUCCESS_CHANCE = BotConfig.economy?.robSuccessRate ?? 0.4;
const ROB_PERCENTAGE = 0.15;
const FINE_PERCENTAGE = 0.1;

export default {
    data: new SlashCommandBuilder()
        .setName('rob')
        .setDescription('Phục kích Đạo Hữu khác để đoạt Linh Thạch. Thành bại đều do thời vận')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Người mang Linh Thạch mà Đạo Hữu muốn nhắm tới.')
                .setRequired(true)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;
            
            const robberId = interaction.user.id;
            const victimUser = interaction.options.getUser("user");
            const guildId = interaction.guildId;
            const now = Date.now();

            if (robberId === victimUser.id) {
                throw createError(
                    "<:itrom:1545417233935630400> Không Thể Đoạt Tài Bản Thân",
                    ErrorTypes.VALIDATION,
                    "Đạo Hữu không thể đoạt Linh Thạch của chính mình.",
                    { robberId, victimId: victimUser.id }
                );
            }
            
            if (victimUser.bot) {
                throw createError(
                    "<:itrom:1545417233935630400> Không Thể Đoạt Tài Bot",
                    ErrorTypes.VALIDATION,
                    "Bot không mang theo Linh Thạch để Đạo Hữu đoạt lấy.",
                    { victimId: victimUser.id, isBot: true }
                );
            }

            const robberData = await getEconomyData(client, guildId, robberId);
            const victimData = await getEconomyData(client, guildId, victimUser.id);
            
            if (!robberData || !victimData) {
                throw createError(
                    "<:itrom:1545417233935630400> Không Thể Đoạt",
                    ErrorTypes.DATABASE,
                    "Tạm thời không thể đoạt tài. Vui lòng thử lại sau.",
                    { robberId: !!robberData, victimId: !!victimData, guildId }
                );
            }
            
            const lastRob = robberData.lastRob || 0;

            if (now < lastRob + ROB_COOLDOWN) {
                const remaining = lastRob + ROB_COOLDOWN - now;
                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

                throw createError(
                    "<:itrom:1545417233935630400> Đang Lánh Mặt Sau Khi Đoạt Tài",
                    ErrorTypes.RATE_LIMIT,
                    `Đạo Hữu vừa gây chuyện, tạm thời nên ẩn mình một thời gian. Hãy chờ **${hours}h ${minutes}m** rồi mới có thể Đoạt Tài lần nữa.`,
                    { remaining, hours, minutes, cooldownType: 'rob' }
                );
            }

            if (victimData.wallet < 500) {
                throw createError(
                    "<:itrom:1545417233935630400> Nghèoooo",
                    ErrorTypes.VALIDATION,
                    `${victimUser.username} quá nghèo. Đạo Hữu chỉ có thể Đoạt Tài khi đối phương mang theo ít nhất **500**<:lt1:1545082415033360495> trong Linh Nang.`,
                    { victimWallet: victimData.wallet, required: 500 }
                );
            }

            const hasSafe = victimData.inventory["cachdoatcam"] || 0;

            if (hasSafe > 0) {
                robberData.lastRob = now;
                await setEconomyData(client, guildId, robberId, robberData);

                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        warningEmbed(
                            '<:itrom:1545417233935630400> Cách Đoạt Cấm đã đánh văng bạn!',
                            `${victimUser.username} đã thi triển **Cách Đoạt Cấm** lên Linh Nang. Đạo Hữu không đoạt được <:lt1:1545082415033360495> nào và kịp thời rút lui.`
                        )
                    ],
                });
            }

            const isSuccessful = Math.random() < BASE_ROB_SUCCESS_CHANCE;
            let resultEmbed;

            if (isSuccessful) {
                const amountStolen = Math.floor(victimData.wallet * ROB_PERCENTAGE);

                robberData.wallet = (robberData.wallet || 0) + amountStolen;
                victimData.wallet = (victimData.wallet || 0) - amountStolen;

                resultEmbed = successEmbed(
                    '<:itrom:1545417233935630400> Đoạt Tài Thành Công',
                    `Đạo Hữu đã thành công đoạt lấy **${amountStolen.toLocaleString()}<:lt1:1545082415033360495>** từ ${victimUser.username}!`
                );
            } else {
                const fineAmount = Math.floor((robberData.wallet || 0) * FINE_PERCENTAGE);

                if ((robberData.wallet || 0) < fineAmount) {
                    robberData.wallet = 0;
                } else {
                    robberData.wallet = (robberData.wallet || 0) - fineAmount;
                }

                resultEmbed = buildUserErrorEmbed(
                    '<:itrom:1545417233935630400> Đoạt Tài Thất Bại',
                    `Đạo Hữu ra tay bất thành, bị đối phương phát giác và phải bồi thường**${fineAmount.toLocaleString()}<:lt1:1545082415033360495>**`,
                    { titleOverride: 'Đoạt Tài Thất Bại' }
                );
            }

            robberData.lastRob = now;

            await setEconomyData(client, guildId, robberId, robberData);
            await setEconomyData(client, guildId, victimUser.id, victimData);

            resultEmbed
                .addFields(
                    {
                        name: `<:lt1:1545082415033360495> hiện có: (${interaction.user.username})`,
                        value: `${robberData.wallet.toLocaleString()}<:lt1:1545082415033360495>`,
                        inline: true,
                    },
                    {
                        name: `<:lt1:1545082415033360495> hiện có: (${victimUser.username})`,
                        value: `${victimData.wallet.toLocaleString()}<:lt1:1545082415033360495>`,
                        inline: true,
                    },
                )
                .setFooter({ text: `Sau ${Math.ceil(ROB_COOLDOWN / (60 * 60 * 1000))} có thế tiếp tục hành sự.` });

            await InteractionHelper.safeEditReply(interaction, { embeds: [resultEmbed] });
    }, { command: 'rob' })
};
