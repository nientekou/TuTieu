import {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from "discord.js";
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { createEmbed } from "../../utils/embeds.js";
import {
    createSelectMenu,
} from "../../utils/components.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATEGORY_SELECT_ID = "help-category-select";
const ALL_COMMANDS_ID = "help-all-commands";
const BUG_REPORT_BUTTON_ID = "help-bug-report";
const HELP_MENU_TIMEOUT_MS = 5 * 60 * 1000;

const CATEGORY_ICONS = {
    Core: "ℹ️",
    Moderation: "🛡️",
    Economy: ":tvp1:",
    Music: "🎵",
    Fun: "🎮",
    Leveling: "📊",
    Utility: "🔧",
    Ticket: ":tk1:",
    Welcome: "👋",
    Giveaway: ":qua:",
    Counter: "🔢",
    Tools: ":setup:",
    Search: "🔍",
    "Reaction Roles": "🎭",
    Community: "👥",
    Birthday: "🎂",
    "Join To Create": "🔌",
    Verification: "✅",
};

function formatCategoryName(rawCategory) {
    return rawCategory
        .replace(/_/g, '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function createInitialHelpMenu(client) {
    const commandsPath = path.join(__dirname, "../../commands");
    const categoryDirs = (
        await fs.readdir(commandsPath, { withFileTypes: true })
    )
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .sort();

    const options = [
        {
            label: "📋 Toàn bộ lệnh",
            description: "Xem danh sách tổng hợp các lệnh đã có",
            value: ALL_COMMANDS_ID,
        },
        ...categoryDirs.map((category) => {
            const categoryName = formatCategoryName(category);
            const icon = CATEGORY_ICONS[categoryName] || "🔍";
            return {
                label: `${icon} ${categoryName}`,
                description: `Xem lệnh theo ${categoryName} `,
                value: category,
            };
        }),
    ];

    const botName = client?.user?.username || "Bot";
    const embed = createEmbed({
        title: `📖 ${botName} Help`,
        description: 'Cài đặt cho server của đạo hữu, chọn lệnh cần kích hoạt, xem các lệnh bên dưới.',
        color: 'primary',
        thumbnail: client.user?.displayAvatarURL?.({ size: 1024 }),
        fields: [
            {
                name: '🚀 Bắt đầu',
                value: [
                    '**1. Cài đặt** — Dùng `/configwizard` để tạo tiền tố, chế độ mod, và bảng',
                    '**2. Kích hoạt hệ thống** — Dùng `/commands dashboard` để bật tắt lệnh.',                    '**3. Danh sách** — Dùng danh sách bên dưới để xem lệnh và tệp lệnh.',
                ].join('\n'),
                inline: false,
            },
            {
                name: 'ℹ️ Cách hoạt động',
                value: [
                    '• Bảng điều khiển giúp quản lý lệnh trực quan hơn ',
                    '• Cài đặt được lưu cho từng server',
                    '• Lệnh / và prefix đều sử dụng được khi kích hoạt',
                ].join('\n'),
                inline: false,
            },
            {
                name: '\u200B',
                value: `-# ${botName} `,
                inline: false,
            },
        ],
    });

    embed.setFooter({ 
        text: "Tử Tiêu with ❤️" 
    });
    embed.setTimestamp();

    const bugReportButton = new ButtonBuilder()
        .setCustomId(BUG_REPORT_BUTTON_ID)
        .setLabel("Báo lỗi")
        .setStyle(ButtonStyle.Danger);

    const supportButton = new ButtonBuilder()
        .setLabel("Kênh hỗ trợ")
        .setURL("https://discord.gg/zTPdWHMwTE")
        .setStyle(ButtonStyle.Link);

    const selectRow = createSelectMenu(
        CATEGORY_SELECT_ID,
        "Chọn để xem lệnh",
        options,
    );

    const buttonRow = new ActionRowBuilder().addComponents([
        bugReportButton,
        supportButton,
    ]);

    return {
        embeds: [embed],
        components: [buttonRow, selectRow],
    };
}

export default {
    slashOnly: true,
    data: new SlashCommandBuilder()
        .setName("Hỗ Trợ")
        .setDescription("Hiển thị menu trợ giúp với tất cả các lệnh khả dụng."),

    async execute(interaction, guildConfig, client) {
        
        const { MessageFlags } = await import('discord.js');
        await InteractionHelper.safeDefer(interaction);
        
        const { embeds, components } = await createInitialHelpMenu(client);

        await InteractionHelper.safeEditReply(interaction, {
            embeds,
            components,
        });

        setTimeout(async () => {
            try {
                if (!InteractionHelper.isInteractionValid(interaction)) {
                    return;
                }

                const closedEmbed = createEmbed({
                    title: "Menu hỗ trợ đã đóng",
                    description: "Menu hỗ trợ đã đóng lại, dùng lệnh /help lần nữa để mở",
                    color: "secondary",
                });

                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [closedEmbed],
                    components: [],
                });
            } catch (error) {
                logger.debug('Đóng menu Hỗ Trợ thất bại (phiên tương tác có thể đã hết hạn):', error?.message);
            }
        }, HELP_MENU_TIMEOUT_MS);
    },
};
