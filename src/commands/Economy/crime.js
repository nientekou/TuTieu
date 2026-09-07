import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const PHIVU_COOLDOWN = 60 * 60 * 1000;
const JAIL_TIME = 2 * 60 * 60 * 1000;
const FINE_RATE = 0.2;

const PHIVU_TYPES = [
    { name: "Thuận Thủ Khiên Dương", min: 100, max: 500, risk: 0.3 },
    { name: "Đột Nhập Thương Khố", min: 300, max: 1000, risk: 0.4 },
    { name: "Kiếp Linh Khố", min: 1000, max: 5000, risk: 0.6 },
    { name: "Đoạt Dị Bảo", min: 2000, max: 10000, risk: 0.7 },
    { name: "Xâm Nhập Trận Các", min: 5000, max: 20000, risk: 0.8 },
];

export default {
    data: new SlashCommandBuilder()
        .setName('phivu')
        .setDescription('Thực hiện một phi vụ để kiếm Linh Thạch (rủi ro rất cao)')
        .addStringOption(option =>
            option
                .setName('type')
                .setDescription('Nhận hoặc chọn Phi Vụ mà Đạo Hữu muốn')
                .setRequired(true)
                .addChoices(
                    { name: 'Thuận Thủ Khiên Dương', value: 'thuận-thủ-khiên-dương' },
                    { name: 'Đột Nhập Thương Khố', value: 'đột-nhập-thương-khố' },
                    { name: 'Kiếp Linh Khố', value: 'kiếp-linh-khố' },
                    { name: 'Đoạt Dị Bảo', value: 'đoạt-dị-bảo' },
                    { name: 'Xâm Nhập Trận Các', value: 'xâm-nhập-trận-các' },
                )
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        await InteractionHelper.safeDefer(interaction);
            
            const userId = interaction.user.id;
            const guildId = interaction.guildId;
            const now = Date.now();

            const userData = await getEconomyData(client, guildId, userId);
            const lastPhivu = userData.cooldowns?.phivu || 0;
            const isJailed = userData.jailedUntil && userData.jailedUntil > now;

            if (isJailed) {
                const timeLeft = Math.ceil((userData.jailedUntil - now) / (1000 * 60));
                throw createError(
                    "<:itrom:1545417233935630400> Đang Bị Giam Giữ",
                    ErrorTypes.RATE_LIMIT,
                    `Đạo Hữu đang bị **Tiên Minh Chấp Pháp Ty** giam giữ tại **Lạc Tiên Uyên**. 
                    Còn ${timeLeft} phút mới được thả.`,
                    { jailTimeRemaining: userData.jailedUntil - now }
                );
            }

            if (now < lastPhivu + PHIVU_COOLDOWN) {
                const timeLeft = Math.ceil((lastPhivu + PHIVU_COOLDOWN - now) / (1000 * 60));
                throw createError(
                    "<:itrom:1545417233935630400> Đang Lánh Mặt Sau Phi Vụ",
                    ErrorTypes.RATE_LIMIT,
                    `Phi vụ vừa rồi đã gây động tĩnh quá lớn. Hãy chờ ${timeLeft} phút rồi hẵng hành sự tiếp.`,
                    { remaining: lastPhivu + PHIVU_COOLDOWN - now, cooldownType: 'phivu' }
                );
            }

            const phivuType = interaction.options.getString("type").toLowerCase();
            const phivu = PHIVU_TYPES.find(
                c => c.name.toLowerCase().replace(/\s+/g, '-') === phivuType
            );

            if (!phivu) {
                throw createError(
                    "<:itrom:1545417233935630400> Phi Vụ Không Tồn Tại",
                    ErrorTypes.VALIDATION,
                    "Cái phi vụ này không có thành đâu, hay là thử làm cái khác đi.",
                    { phivuType }
                );
            }

            const isSuccess = Math.random() > phivu.risk;
            const amountEarned = isSuccess
                ? Math.floor(Math.random() * (phivu.max - phivu.min + 1)) + phivu.min
                : 0;

            userData.cooldowns = userData.cooldowns || {};
            userData.cooldowns.phivu = now;

            if (isSuccess) {
                userData.wallet = (userData.wallet || 0) + amountEarned;
                
                await setEconomyData(client, guildId, userId, userData);
                
                const embed = successEmbed(
                    "🗡️ Phi Vụ Thành Công!",
                    `Đạo Hữu đã hoàn thành ${phivu.name}
                     ### <:a1:1546550426063741058> THU HOẠCH
                    ㅤ└**${amountEarned}**<:lt1:1545082415033360495>`
                );
                
                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
            } else {
                // Fine is based on the potential haul of the attempted crime
                const potentialHaul = Math.floor((phivu.min + phivu.max) / 2);
                const fine = Math.min(Math.floor(potentialHaul * FINE_RATE), userData.wallet || 0);
                userData.wallet = Math.max(0, (userData.wallet || 0) - fine);
                userData.jailedUntil = now + JAIL_TIME;
                
                await setEconomyData(client, guildId, userId, userData);
                
                const embed = warningEmbed(
                    "⛓️ Phi Vụ Thất Bại!",
                    `${phivu.name} bất thành! Đạo Hữu đã bị **Chấp Pháp Ty** bắt giữ đem về **Lạc Tiên Uyên**` +
                     `
                     Bồi thường ${fine.toLocaleString()}<:lt1:1545082415033360495> và bị giam trong ${timeLeft}.`
                );
                
                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
            }
    }, { command: 'phivu' })
};
