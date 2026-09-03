import { SlashCommandBuilder } from 'discord.js';
import { successEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { botConfig } from '../../config/bot.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const COOLDOWN = 30 * 60 * 1000;
const MIN_WIN = Number(botConfig?.economy?.begMin) || 50;
const MAX_WIN = Number(botConfig?.economy?.begMax) || 200;
const SUCCESS_CHANCE = 0.7;

export default {
    data: new SlashCommandBuilder()
        .setName('beg')
        .setDescription('Cầu cho thiện nam tín nữ bố thí cho vài đồng cắc lẻ'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;
            
            const userId = interaction.user.id;
            const guildId = interaction.guildId;

            let userData = await getEconomyData(client, guildId, userId);
            
            if (!userData) {
                throw createError(
                    "Hành Trang bị kẹt",
                    ErrorTypes.DATABASE,
                    "Hành Trang của bạn không thể mở ra được, hãy mở lại sau",
                    { userId, guildId }
                );
            }

            const lastBeg = userData.lastBeg || 0;
            const remainingTime = lastBeg + COOLDOWN - Date.now();

            if (remainingTime > 0) {
                const minutes = Math.floor(remainingTime / 60000);
                const seconds = Math.floor((remainingTime % 60000) / 1000);

                let timeMessage =
                    minutes > 0 ? `${minutes} minute(s)` : `${seconds} second(s)`;

                throw createError(
                    "Bạn đã ăn xin quá nhiều rồi",
                    ErrorTypes.RATE_LIMIT,
                    `Không ai thèm hữu duyên cho bạn vài đồng, hãy chờ thêm **${timeMessage}**.`,
                    { remainingTime, minutes, seconds, cooldownType: 'beg' }
                );
            }

            const success = Math.random() < SUCCESS_CHANCE;

            let replyEmbed;
            let newCash = userData.wallet;

            if (success) {
                const amountWon =
                    Math.floor(Math.random() * (MAX_WIN - MIN_WIN + 1)) + MIN_WIN;

                newCash += amountWon;

                const successMessages = [
                    `Một vị Đạo Hữu nào đó đã ném **<:lt1:1545082415033360495>${amountWon.toLocaleString()}** vào cái bát mẻ của bạn`,
                    `Ai mà hớ hênh quá! Bạn la lên rồi lủm túi tiền có chứa **<:lt1:1545082415033360495>${amountWon.toLocaleString()}** rồi chạy mất.`,
                    `Có người thấy bạn thật đáng thương nên cho bạn **<:lt1:1545082415033360495>${amountWon.toLocaleString()}**!`,
                    `Bạn tìm thấy **<:lt1:1545082415033360495>${amountWon.toLocaleString()}** dưới ghế quán trà bên lề đường.`,
                ];

                replyEmbed = successEmbed(
                    'Ăn xin thành công',
                    successMessages[
                        Math.floor(Math.random() * successMessages.length)
                    ]
                );
            } else {
                const failMessages = [
                    "Quan binh truy sát, bạn bị đá văng",
                    "Có tiếng la vang vọng, 'Không làm mà đòi có ăn, thì chỉ có...', bạn không kịp nghe những từ cuối",
                    "Con sóc nhỏ ngậm linh thạch mà bạn cố gắng cả ngày đi mất",
                    "Bạn thử đặt chén mẻ ra, nhưng quá ngại để mở lời",
                ];

                replyEmbed = warningEmbed(
                    'Không đủ Linh Thạch',
                    failMessages[Math.floor(Math.random() * failMessages.length)]
                );
            }

            userData.wallet = newCash;
userData.lastBeg = Date.now();

            await setEconomyData(client, guildId, userId, userData);

            await InteractionHelper.safeEditReply(interaction, { embeds: [replyEmbed] });
    }, { command: 'beg' })
};
