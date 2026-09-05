import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const CRIME_COOLDOWN = 60 * 60 * 1000;
const JAIL_TIME = 2 * 60 * 60 * 1000;
const FINE_RATE = 0.2;

const CRIME_TYPES = [
    { name: "Thuận Thủ Khiên Dương", min: 100, max: 500, risk: 0.30 },
    { name: "Đột Nhập Thương Khố", min: 300, max: 1000, risk: 0.40 },
    { name: "Kiếp Linh Khố", min: 1000, max: 5000, risk: 0.60 },
    { name: "Đoạt Dị Bảo", min: 2000, max: 10000, risk: 0.70 },
    { name: "Xâm Nhập Trận Các", min: 5000, max: 20000, risk: 0.80 },
];

export default {
    data: new SlashCommandBuilder()
        .setName('crime')
        .setDescription('Thực hiện một phi vụ để kiếm Linh Thạch (rủi ro rất cao)')
        .addStringOption(option =>
            option
                .setName('type')
                .setDescription('Chọn phi vụ muốn thực hiện')
                .setRequired(true)
                .addChoices(
                { name: 'Thuận Thủ Khiên Dương', value: 'thuan-thu' },
                { name: 'Đột Nhập Thương Khố', value: 'dot-nhap-thuong-kho' },
                { name: 'Kiếp Linh Khố', value: 'kiep-linh-kho' },
                { name: 'Đoạt Dị Bảo', value: 'doat-di-bao' },
                { name: 'Xâm Nhập Trận Các', value: 'xam-nhap-tran-cac' },
                )
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        await InteractionHelper.safeDefer(interaction);
            
            const userId = interaction.user.id;
            const guildId = interaction.guildId;
            const now = Date.now();

            const userData = await getEconomyData(client, guildId, userId);
            const lastCrime = userData.cooldowns?.crime || 0;
            const isJailed = userData.jailedUntil && userData.jailedUntil > now;

            if (isJailed) {
                const timeLeft = Math.ceil((userData.jailedUntil - now) / (1000 * 60));
                throw createError(
                    "<:itrom:1545417233935630400> Đang Bị Giam Giữ",
                    ErrorTypes.RATE_LIMIT,
                    `Đạo Hữu đang bị **Tiên Minh Chấp Pháp Ty** giam giữ tại **Lạc Tiên Uyên**. Còn ${timeLeft} mới được thả.`,
                    { jailTimeRemaining: userData.jailedUntil - now }
                );
            }

            if (now < lastCrime + CRIME_COOLDOWN) {
                const timeLeft = Math.ceil((lastCrime + CRIME_COOLDOWN - now) / (1000 * 60));
                throw createError(
                    "<:itrom:1545417233935630400> Đang Lánh Mặt Sau Phi Vụ",
                    ErrorTypes.RATE_LIMIT,
                    `Phi vụ vừa rồi đã gây động tĩnh quá lớn. Hãy chờ ${timeLeft} rồi hẵng hành sự tiếp.`,
                    { remaining: lastCrime + CRIME_COOLDOWN - now, cooldownType: 'crime' }
                );
            }

            const crimeType = interaction.options.getString("type").toLowerCase();
            const crime = CRIME_TYPES.find(
                c => c.name.toLowerCase().replace(/\s+/g, '-') === crimeType
            );

            if (!crime) {
                throw createError(
                    "<:itrom:1545417233935630400> Phi Vụ Không Tồn Tại",
                    ErrorTypes.VALIDATION,
                    "Hãy chọn một phi vụ hợp lệ trên Bảng Huyền Thưởng.",
                    { crimeType }
                );
            }

            const isSuccess = Math.random() > crime.risk;
            const amountEarned = isSuccess
                ? Math.floor(Math.random() * (crime.max - crime.min + 1)) + crime.min
                : 0;

            userData.cooldowns = userData.cooldowns || {};
            userData.cooldowns.crime = now;

            if (isSuccess) {
                userData.wallet = (userData.wallet || 0) + amountEarned;
                
                await setEconomyData(client, guildId, userId, userData);
                
                const embed = successEmbed(
                    "🗡️ Phi Vụ Thành Công!",
                    `Đạo Hữu đã hoàn thành ${crime.name} và thu được **${amountEarned}**<:lt1:1545082415033360495>`
                );
                
                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
            } else {
                // Fine is based on the potential haul of the attempted crime
                const potentialHaul = Math.floor((crime.min + crime.max) / 2);
                const fine = Math.min(Math.floor(potentialHaul * FINE_RATE), userData.wallet || 0);
                userData.wallet = Math.max(0, (userData.wallet || 0) - fine);
                userData.jailedUntil = now + JAIL_TIME;
                
                await setEconomyData(client, guildId, userId, userData);
                
                const embed = warningEmbed(
                    "⛓️ Phi Vụ Thất Bại!",
                    `${crime.name} bất thành! Đao Hữu đã bị **Chấp Pháp Ty** bắt giữ đem về **Lạc Tiên Uyên**` +
                    `Bồi thường ${fine.toLocaleString()}<:lt1:1545082415033360495> và bị giam trong 1 canh giờ.`
                );
                
                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
            }
    }, { command: 'crime' })
};
