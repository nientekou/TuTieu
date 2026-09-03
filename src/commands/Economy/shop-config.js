import { SlashCommandBuilder } from 'discord.js';
import shopConfigSetrole from './modules/shop_config_setrole.js';

export default {
    slashOnly: true,
    data: new SlashCommandBuilder()
        .setName('shop-config')
        .setDescription('Thiết lập Nhất Phẩm Các. (Cần có quyền Quản Lý)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setrole')
                .setDescription('Thiết lập role khi vật phẩm từ Premium Role được mua')
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('Role bạn muốn cho Premium Role')
                        .setRequired(true),
                ),
        ),

    async execute(interaction, config, client) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setrole') {
            return shopConfigSetrole.execute(interaction, config, client);
        }
    },
};
