import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { shopItems } from '../../config/shop/items.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { getGuildConfig } from '../../services/config/guildConfig.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const SHOP_ITEMS = shopItems;

export default {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Mua vật phẩm từ Nhất Phẩm Các')
        .addStringOption(option =>
            option
                .setName('item_id')
                .setDescription('ID của vật phẩm cần mua')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('soluong')
                .setDescription('Số lượng (Mặc định: 1)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(10)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

            const userId = interaction.user.id;
            const guildId = interaction.guildId;
            const itemId = interaction.options.getString("item_id").toLowerCase();
            const soluong = interaction.options.getInteger("soluong") || 1;

            const item = SHOP_ITEMS.find(i => i.id === itemId);

            if (!item) {
                throw createError(
                    `Vật phẩm ${itemId} không thể tìm thấy trong Nhất Phẩm Các`,
                    ErrorTypes.VALIDATION,
                    `ID vật phẩm \`${itemId}\` không có trong Nhất Phẩm Các.`,
                    { itemId }
                );
            }

            if (soluong < 1) {
                throw createError(
                    "Số Lượng Không Đúng",
                    ErrorTypes.VALIDATION,
                    "Chỉ được mua từ 1 kiện pháp khí trở lên.",
                    { soluong }
                );
            }

            const totalCost = item.price * soluong;

            const guildConfig = await getGuildConfig(client, guildId);
            const PREMIUM_ROLE_ID = guildConfig.premiumRoleId;

            const userData = await getEconomyData(client, guildId, userId);

            if (userData.wallet < totalCost) {
                throw createError(
                    "Linh Thạch Không Đủ",
                    ErrorTypes.VALIDATION,
                    `Đạo hữu cần có **${totalCost.toLocaleString()}<:lt1:1545082415033360495>** để mua ${soluong}x **${item.name}**, nhưng Đạo Hữu chỉ có **${userData.wallet.toLocaleString()}<:lt1:1545082415033360495>** trong người.`,
                    { required: totalCost, current: userData.wallet, itemId, soluong }
                );
            }

            if (item.type === "role" && itemId === "premium_role") {
                if (!PREMIUM_ROLE_ID) {
                    throw createError(
                        "Loan Vũ Bội**",
                        ErrorTypes.CONFIGURATION,
                        "Đạo Hữu đã có tư cách bước lên Kim Vân Đài của Nhất Phẩm Các.",
                        { itemId }
                    );
                }
                if (interaction.member.roles.cache.has(PREMIUM_ROLE_ID)) {
                    throw createError(
                        "Đã Sở Hữu Đạo Ấn Thân Phận Này",
                        ErrorTypes.VALIDATION,
                        `Đạo Hữu đã sở hữu Đạo Ấn Thân Phận **${item.name}**`,
                        { itemId, roleId: PREMIUM_ROLE_ID }
                    );
                }
                if (soluong > 1) {
                    throw createError(
                        "Một Đạo Ấn Duy Nhất",
                        ErrorTypes.VALIDATION,
                        `Đạo Hữu đã sở hữu Đạo Ấn **${item.name}** rồi`,
                        { itemId, soluong }
                    );
                }
            }

            userData.wallet -= totalCost;

            let successDescription = `Đạo Hữu đã thành công mua ${soluong}x **${item.name}** với **${totalCost.toLocaleString()}<:lt1:1545082415033360495>**!`;

            if (item.type === "role" && itemId === "premium_role") {
                const member = interaction.member;

                const role = interaction.guild.roles.cache.get(PREMIUM_ROLE_ID);

                if (!role) {
                    throw createError(
                        "Không Thấy Đạo Ấn",
                        ErrorTypes.CONFIGURATION,
                        "Nhất Phẩm Các đã ngừng nhận người lên Thiên Các",
                        { roleId: PREMIUM_ROLE_ID }
                    );
                }

                try {
                    await member.roles.add(
                        role,
                        `Nhận Đạo Ấn: ${item.name}`,
                    );
                    successDescription += `\n\n**👑 Đạo Ấn ${role.toString()} đã được trao cho Đạo Hữu**`;
                } catch (roleError) {
                    userData.wallet += totalCost;
                    await setEconomyData(client, guildId, userId, userData);
                    throw createError(
                        "Nhận Thất Bại",
                        ErrorTypes.DISCORD_API,
                        "Đã khấu trừ Linh Thạch, nhưng ban phong thất bại. Linh Thạch đã hoàn trả về Linh Khố.",
                        { roleId: PREMIUM_ROLE_ID, originalError: roleError.message }
                    );
                }
            } else if (item.type === "upgrade") {
                userData.upgrades[itemId] = true;
                successDescription += `\n\n**✨ Đạo Ấn đã khắc thành, thân phận chính thức sinh hiệu!**`;
            } else if (item.type === "consumable" || item.type === "tool") {
                userData.inventory[itemId] =
                    (userData.inventory[itemId] || 0) + soluong;
                if (item.type === "tool") {
                    successDescription += `\n\n**${item.name} đã được thu vào Túi Càn Khôn của Đạo Hữu!**`;
                }
            }

            await setEconomyData(client, guildId, userId, userData);

            const embed = successEmbed(
                "<:tvp2:1545082417012932639> Thỉnh Bảo Thành Công",
                successDescription,
            ).addFields({
                name: "Linh Khố",
                value: `${userData.wallet.toLocaleString()}<:lt1:1545082415033360495>`,
                inline: true,
            });

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }, { command: 'buy' })
};
