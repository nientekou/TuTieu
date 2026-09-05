import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const MINE_COOLDOWN = 60 * 60 * 1000;
const BASE_MIN_REWARD = 400;
const BASE_MAX_REWARD = 1200;
const CUOCKHAILINH_MULTIPLIER = 1.2;
const BANCOPHU_MULTIPLIER = 2.0;

const MINE_LOCATIONS = [
    "mỏ linh thạch bỏ hoang",
    "hang đá ẩm lạnh",
    "mỏ đá giữa hoang sơn",
    "hang sâu hắc diệu",
    "vực sâu dưới biển",
    "mỏ linh thạch cổ",
    "hang đá sâu trong núi",
    "khe núi đầy khoáng thạch",
    "động đá tối tăm",
    "mỏ quặng bỏ phế",
    "đường hầm khai khoáng cũ",
    "hang ngầm dưới lòng đất",
    "thạch động hoang vắng",
    "mỏ đá trong thâm sơn",
    "khoáng động chưa được khai phá",
    "linh mạch dưới lòng núi",
    "khoáng mạch giữa sơn cốc",
    "mạch đá ẩn trong vách núi",
    "linh quật bị phong kín",
    "cổ quật sâu trong lòng đất",
    "địa quật không dấu chân người",
    "thạch quật giữa hoang địa",
    "u cốc chứa linh khoáng",
    "thâm cốc đầy khoáng thạch",
    "địa huyệt sâu dưới núi",
    "hang hắc diệu thạch",
    "mỏ hắc diệu bỏ hoang",
    "khe đá hắc diệu",
    "huyền thạch động",
    "mỏ xích tinh",
    "động xích ngọc",
    "khe bích ngọc",
    "mỏ hàn ngọc",
    "thạch động tử tinh",
    "khoáng quật linh ngọc",
    "miệng núi lửa cổ",
    "địa phùng đầy hỏa khí",
    "khe nứt địa tâm",
    "hang đá dưới hỏa sơn",
    "mỏ nham thạch đỏ",
    "hỏa quật trong lòng núi",
    "địa huyệt dung nham",
    "khe núi tro tàn",
    "thạch quật hỏa linh",
    "miệng địa hỏa",
    "vực sâu đáy biển",
    "khe núi dưới biển",
    "hang ngầm hải vực",
    "khoáng mạch dưới đáy biển",
    "thâm uyên hải vực",
    "động đá chìm dưới nước",
    "vực đá ngầm",
    "cổ quật dưới biển sâu",
    "hải uyên đầy linh khoáng",
    "địa mạch nơi đáy biển",
    "mỏ linh khoáng giữa rừng sâu",
    "hang đá phủ đầy rêu xanh",
    "khe núi quanh năm mây phủ",
    "cổ mỏ bị núi đá vùi lấp",
    "thạch cốc giữa hoang sơn",
    "u động sâu không thấy đáy",
    "mỏ khoáng bên vách vực",
    "linh quật nằm dưới chân núi",
    "cổ động bị đất đá phong bế",
    "khoáng trường giữa sơn dã",
    "mỏ linh thạch chưa từng có người đặt chân",
    "khoáng mạch vừa mới lộ thiên",
    "cổ linh mạch bị chôn vùi",
    "địa quật phát ra linh quang",
    "thạch động có linh khí tụ lại",
    "mạch khoáng ẩn dưới tầng nham thạch",
    "cổ khoáng trường đã cạn",
    "linh mạch sắp khô kiệt",
    "mỏ quặng nằm giữa vùng đất chết",
    "khoáng động bị bỏ lại từ thời cổ"
];

export default {
    data: new SlashCommandBuilder()
        .setName('mine')
        .setDescription('Đến các mỏ khoáng khai thác Linh Thạch'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;
            
            const userId = interaction.user.id;
            const guildId = interaction.guildId;
            const now = Date.now();

            const userData = await getEconomyData(client, guildId, userId);
            const lastMine = userData.lastMine || 0;
            const hasBancophu = userData.inventory["bancophu"] || 0;
            const hasCuockhailinh = userData.inventory["cuockhailinh"] || 0;

            if (now < lastMine + MINE_COOLDOWN) {
                const remaining = lastMine + MINE_COOLDOWN - now;
                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor(
                    (remaining % (1000 * 60 * 60)) / (1000 * 60),
                );

                throw createError(
                    "Chưa thể tiếp tục khai khoáng",
                    ErrorTypes.RATE_LIMIT,
                    `Tay bạn đào khoáng đến run lên, không thể nhấc nổi nữa. Vui lòng chờ **${hours}h ${minutes}m** để hồi phục thể lực.`,
                    { remaining, cooldownType: 'mine' }
                );
            }

            const baseEarned =
                Math.floor(
                    Math.random() * (BASE_MAX_REWARD - BASE_MIN_REWARD + 1),
                ) + BASE_MIN_REWARD;

            let finalEarned = baseEarned;
            let multiplierMessage = "";

            if (hasBancophu > 0) {
                finalEarned = Math.floor(baseEarned * BANCOPHU_MULTIPLIER);
                multiplierMessage = `\n<:bcp:1545728177169502288> **Thưởng thêm từ Bàn Cổ Phủ: +100%**`;
            } else if (hasCuockhailinh > 0) {
                finalEarned = Math.floor(baseEarned * CUOCKHAILINH_MULTIPLIER);
                multiplierMessage = `\n<:icuoc:1545714179581943868> **Thưởng thêm từ Cuốc Khai Linh: +20%**`;
            }

            const location =
                MINE_LOCATIONS[
                    Math.floor(Math.random() * MINE_LOCATIONS.length)
                ];

            userData.wallet += finalEarned;
userData.lastMine = now;

            await setEconomyData(client, guildId, userId, userData);

            const embed = successEmbed(
                "⛏️ Khai Khoáng Thành Công!",
                `Đạo Hữu đã thăm dò **${location}** và tìm được khoáng thạch trị giá **${finalEarned.toLocaleString()}<:lt1:1545082415033360495>**!${multiplierMessage}`,
            )
                .addFields({
                    name: "Linh Thạch Hiện Có",
                    value: `${userData.wallet.toLocaleString()}<:lt1:1545082415033360495>`,
                    inline: true,
                })
                .setFooter({ text: `Có thể tiếp tục khai khoáng sau 1 giờ.` });

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'mine' })
};
