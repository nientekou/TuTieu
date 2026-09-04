import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createEmbed, errorEmbed, warningEmbed } from '../../utils/embeds.js';
import { getConfirmationButtons } from '../../utils/components.js';
import { logger } from '../../utils/logger.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    slashOnly: true,
    data: new SlashCommandBuilder()
        .setName('wipedata')
        .setDescription('Xóa mọi dấu ấn của bạn (không thể hoàn tác)'),

    async execute(interaction, guildConfig, client) {
        const warningMessage = 
            `⚠️ **LỆNH NÀY KHÔNG THỂ HOÀN TÁC!** ⚠️\n\n` +
            `Dùng lệnh này sẽ vĩnh viễn xóa toàn bộ dấu ấn của Đạo hHữu khỏi server này, bao gồm:\n` +
            `• <:lt1:1545082415033360495> Linh Thạch (Túi Càn Khôn & Linh Khố)\n` +
            `• <:vdl:1545397492831494144> Tu Vi và Đạo Hạnh\n` +
            `• <:tvp1:1545082419273801859> Toàn bộ vật phẩm trong Túi\n` +
            `• <:tvp2:1545082417012932639> Vật phẩm mua từ Nhất Phẩm Các\n` +
            `• 🎂 Sinh thần Bát Tự\n` +
            `• <:tin2:1545087233135214702> Ghi chép trên Thiên Cơ\n` +
            `• <:tin1:1545087235227918346> Mọi dữ liệu cá nhân khác\n\n` +
            `**Nhân quả một khi đã định sẽ không thể nghịch chuyển. Đạo Hữu đã suy xét kỹ chưa?**`;

        const embed = warningEmbed('Xóa Mọi Dấu Ấn', warningMessage);

        const confirmButtons = getConfirmationButtons('wipedata');

        await InteractionHelper.safeReply(interaction, {
            embeds: [embed],
            components: [confirmButtons],
            flags: MessageFlags.Ephemeral
        });

        logger.info(`Wipedata command executed - confirmation prompt shown`, {
            userId: interaction.user.id,
            guildId: interaction.guildId
        });
    }
};
