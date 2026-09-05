import { PermissionsBitField } from 'discord.js';
import { successEmbed } from '../../../utils/embeds.js';
import { getGuildConfig, setGuildConfig } from '../../../services/config/guildConfig.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { logger } from '../../../utils/logger.js';

import { replyUserError, ErrorTypes } from '../../../utils/errorHandler.js';
export default {
    async execute(interaction, config, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: 'Đạo Hữu cần **Quyền Quản Lý** mới có thể cài đặt Premium Role' });
        }

        const role = interaction.options.getRole('role');
        const guildId = interaction.guildId;

        try {
            const currentConfig = await getGuildConfig(client, guildId);
            currentConfig.loanvuboiId = role.id;
            await setGuildConfig(client, guildId, currentConfig);

            return InteractionHelper.safeReply(interaction, {
                embeds: [successEmbed('Cài Đặt Role Cho Premium Role', `**Loan Vũ Bội · Kim Vân** đã được gán vào role ${role.toString()}. Đạo Hữu nào mua **Loan Vũ Bội** sẽ nhận được role đặc biệt này`)],
                ephemeral: true,
            });
        } catch (error) {
            logger.error('shop_config_setrole error:', error);
            return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Không thể lưu thông tin.' });
        }
    },
};
