import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const BASE_WIN_CHANCE = 0.4;
const TULINHTHAO_WIN_BONUS = 0.1;
const BUALINHKHUOC_WIN_BONUS = 0.08;
const PAYOUT_MULTIPLIER = 2.0;
const GAMBLE_COOLDOWN = 5 * 60 * 1000;

export default {
    data: new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('Đổ vận bằng Linh Thạch, thử vận may để cầu thêm Linh Thạch')
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Số Linh Thạch dùng để đổ vận')
                .setRequired(true)
                .setMinValue(1)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;
            
            const userId = interaction.user.id;
            const guildId = interaction.guildId;
            const betAmount = interaction.options.getInteger("amount");
            const now = Date.now();

            const userData = await getEconomyData(client, guildId, userId);
            const lastGamble = userData.lastGamble || 0;
            let tulinhthaoCount = userData.inventory["tulinhthao"] || 0;
            let buathienkhuocCount = userData.inventory["buathienkhuoc"] || 0;

            if (now < lastGamble + GAMBLE_COOLDOWN) {
                const remaining = lastGamble + GAMBLE_COOLDOWN - now;
                const minutes = Math.floor(remaining / (1000 * 60));
                const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

                throw createError(
                    "Đổ Vận đang trong thời gian chờ",
                    ErrorTypes.RATE_LIMIT,
                    `Đạo Hữu vừa Đổ Vận xong. Hãy chờ **${minutes}m ${seconds}s** rồi tiếp tục.`,
                    { remaining, cooldownType: 'gamble' }
                );
            }

            if (userData.wallet < betAmount) {
                throw createError(
                    "Không Đủ Linh Thạch",
                    ErrorTypes.VALIDATION,
                    `Đạo Hữu chỉ có ${userData.wallet.toLocaleString()}<:lt1:1545082415033360495> không đủ ${betAmount.toLocaleString()}<:tlt:1545730351693828147>.`,
                    { required: betAmount, current: userData.wallet }
                );
            }

            let winChance = BASE_WIN_CHANCE;
            let tulinhthaoMessage = "";
            let usedTulinhthao = false;
            let usedBuathienkhuoc = false;

            if (tulinhthaoCount > 0) {
                winChance += TULINHTHAO_WIN_BONUS;
                userData.inventory["tulinhthao"] -= 1;
                tulinhthaoMessage = `\n<:tlt:1545730351693828147> **Tụ Linh Thảo đã được kích hoạt:** Cơ hội thắng Đổ Vận được tăng lên!`;
                usedTulinhthao = true;
            }
            
            else if (buathienkhuocCount > 0) {
                winChance += BUATHIENKHUOC_WIN_BONUS;
                userData.inventory["buathienkhuoc"] -= 1;
                tulinhthaoMessage = `\n<:buatk:1545735911675797504> **Bùa Thiên Khước đã được kích hoạt (${buathienkhuocCount - 1} lượt còn lại):** Cơ hội thắng Đổ Vận được tăng lên!`;
                usedBuathienkhuoc = true;
            }

            const win = Math.random() < winChance;
            let cashChange = 0;
            let resultEmbed;

            if (win) {
                const amountWon = Math.floor(betAmount * PAYOUT_MULTIPLIER);
                // Net change: the bet is replaced by the payout (bet was at stake, not pre-deducted)
                cashChange = amountWon - betAmount;

                resultEmbed = successEmbed(
                    "🎉 Thắng Vận!",
                    `Đạo Hữu thắng Đổ Vận! **${betAmount.toLocaleString()}<:tlt:1545730351693828147>** đã thành **${amountWon.toLocaleString()}<:tlt:1545730351693828147>**!${tulinhthaoMessage}`,
                );
            } else {
cashChange = -betAmount;

                resultEmbed = warningEmbed(
                    "💔 Bại Vận...",
                    `Thời vận không đứng về phía Đạo Hữu. Đã mất **${betAmount.toLocaleString()}<:tlt:1545730351693828147>**`,
                );
            }

            userData.wallet = (userData.wallet || 0) + cashChange;
userData.lastGamble = now;

            await setEconomyData(client, guildId, userId, userData);

            const newCash = userData.wallet;

            resultEmbed.addFields({
                name: "<:tlt:1545730351693828147> hiện có:",
                value: `${newCash.toLocaleString()}<:tlt:1545730351693828147>`,
                inline: true,
            });

            if (usedTulinhthao) {
                resultEmbed.setFooter({
                    text: `Đạo Hữu có ${userData.inventory["tulinhthao"]} Tụ Linh Thảo. Tỷ lệ thắng: ${Math.round(winChance * 100)}%.`,
                });
            } else if (usedBuathienkhuoc) {
                resultEmbed.setFooter({
                    text: `Đạo Hữu còn ${userData.inventory["buathienkhuoc"]} lượt dùng Bùa Thiên Khước. Tỷ lệ thắng: ${Math.round(winChance * 100)}%.`,
                });
            } else {
                resultEmbed.setFooter({
                    text: `Có thể Đổ Vận tiếp sau 5 phút. Tỷ lệ thắng cơ bản: ${Math.round(BASE_WIN_CHANCE * 100)}%.`,
                });
            }

            await InteractionHelper.safeEditReply(interaction, { embeds: [resultEmbed] });
    }, { command: 'gamble' })
};
