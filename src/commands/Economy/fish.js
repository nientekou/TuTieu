import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const FISH_COOLDOWN = 45 * 60 * 1000; 
const BASE_MIN_REWARD = 300;
const BASE_MAX_REWARD = 900;
const CANTHINHTRIEU_MULTIPLIER = 1.5;

const FISH_TYPES = [
    // Common
    { name: 'Thanh Lân Ngư', emoji: '🐟', rarity: 'common' },
    { name: 'Bạch Vân Ngư', emoji: '🐟', rarity: 'common' },
    { name: 'Ngân Sa Ngư', emoji: '🐟', rarity: 'common' },
    { name: 'Hồng Vĩ Ngư', emoji: '🐟', rarity: 'common' },
    { name: 'Lam Văn Ngư', emoji: '🐟', rarity: 'common' },
    { name: 'Thạch Giáp Giải', emoji: '🦀', rarity: 'common' },
    { name: 'Thanh Xà Hà', emoji: '🦐', rarity: 'common' },
    { name: 'Bích Hải Loa', emoji: '🐚', rarity: 'common' },
    { name: 'Tử Hải Tảo', emoji: '🌿', rarity: 'common' },
    { name: 'Linh Bối', emoji: '🐚', rarity: 'common' },

    // Uncommon
    { name: 'Xích Lân Ngư', emoji: '🐠', rarity: 'uncommon' },
    { name: 'Kim Vĩ Ngư', emoji: '🐠', rarity: 'uncommon' },
    { name: 'Hàn Tuyền Ngư', emoji: '🐟', rarity: 'uncommon' },
    { name: 'Bích Ba Ngư', emoji: '🐟', rarity: 'uncommon' },
    { name: 'Tử Vân Ngư', emoji: '🐟', rarity: 'uncommon' },
    { name: 'Ngân Nguyệt Ngư', emoji: '🐠', rarity: 'uncommon' },
    { name: 'Huyền Giáp Giải', emoji: '🦀', rarity: 'uncommon' },
    { name: 'Kim Tu Hà', emoji: '🦐', rarity: 'uncommon' },
    { name: 'Linh Châu Bối', emoji: '🐚', rarity: 'uncommon' },
    { name: 'Hải Linh Sâm', emoji: '🪸', rarity: 'uncommon' },

    // Rare
    { name: 'Ngọc Lân Ngư', emoji: '🐠', rarity: 'rare' },
    { name: 'Thanh Minh Ngư', emoji: '🐟', rarity: 'rare' },
    { name: 'Lưu Vân Ngư', emoji: '🐟', rarity: 'rare' },
    { name: 'Huyền Băng Ngư', emoji: '🐟', rarity: 'rare' },
    { name: 'Tử Điện Ngư', emoji: '🐠', rarity: 'rare' },
    { name: 'Kim Lân Giải', emoji: '🦀', rarity: 'rare' },
    { name: 'Huyền Tinh Hà', emoji: '🦐', rarity: 'rare' },
    { name: 'Bích Ngọc Bối', emoji: '🐚', rarity: 'rare' },
    { name: 'Hải Nguyệt Châu', emoji: '🦪', rarity: 'rare' },
    { name: 'Cửu Tiết Hải Sâm', emoji: '🪸', rarity: 'rare' },
    { name: 'Mặc Hải Tu', emoji: '🐙', rarity: 'rare' },

    // Epic
    { name: 'Thiên Hà Linh Ngư', emoji: '🐠', rarity: 'epic' },
    { name: 'Cửu Vân Ngư', emoji: '🐟', rarity: 'epic' },
    { name: 'Huyền Lôi Ngư', emoji: '🐠', rarity: 'epic' },
    { name: 'Bích Hải Long Ngư', emoji: '🐉', rarity: 'epic' },
    { name: 'Tử Kim Lân', emoji: '🐟', rarity: 'epic' },
    { name: 'Huyền Giáp Hải Quy', emoji: '🐢', rarity: 'epic' },
    { name: 'Ngân Nguyệt Cự Giải', emoji: '🦀', rarity: 'epic' },
    { name: 'U Minh Hải Tu', emoji: '🐙', rarity: 'epic' },
    { name: 'Xích Viêm Hải Xà', emoji: '🐍', rarity: 'epic' },
    { name: 'Linh Châu Hải Bối', emoji: '🦪', rarity: 'epic' },

    // Legendary
    { name: 'Thái Hư Kình', emoji: '🐋', rarity: 'legendary' },
    { name: 'Cửu Thiên Hải Long', emoji: '🐉', rarity: 'legendary' },
    { name: 'Huyền Minh Cự Ngư', emoji: '🐋', rarity: 'legendary' },
    { name: 'Vạn Tượng Linh Ngư', emoji: '🐠', rarity: 'legendary' },
    { name: 'Thương Hải Kình', emoji: '🐋', rarity: 'legendary' },
    { name: 'Kim Lân Hải Hoàng', emoji: '🐉', rarity: 'legendary' },
    { name: 'Tử Tiêu Lôi Kình', emoji: '🐋', rarity: 'legendary' },
    { name: 'Cửu U Hải Xà', emoji: '🐍', rarity: 'legendary' },
];

const CATCH_MESSAGES = [
    "Thả câu xuống làn nước trong veo của Triều Sinh Vạn Tượng...",
    "Mồi câu khẽ chìm xuống mặt nước, chỉ còn chiếc phao lặng lẽ trôi...",
    "Ngồi bên bờ nước, kiên nhẫn chờ đợi một lần cá cắn câu...",
    "Phao câu chậm rãi trôi theo dòng nước...",
    "Mặt nước hôm nay yên ắng đến lạ...",
    "Gió biển khẽ lướt qua, mang theo hơi nước mằn mặn...",
    "Sóng nước lăn tăn dưới ánh mặt trời...",
    "Dây câu buông xuống, chìm dần vào làn nước xanh thẳm...",
    "Ánh nước trong veo, có thể nhìn thấy những bóng cá thoắt ẩn thoắt hiện bên dưới...",
    "Một cơn gió thoảng qua, khiến mặt nước khẽ gợn sóng...",
    "Phao câu nhấp nhô theo từng đợt sóng...",
    "Không gian xung quanh dần trở nên tĩnh lặng...",
    "Chỉ còn tiếng sóng vỗ bên tai trong lúc chờ cá cắn câu...",
    "Dòng nước chậm rãi trôi qua, mang theo dây câu đi xa...",
    "Mồi câu chìm xuống vùng nước sâu, chờ đợi một vị khách ghé qua...",
    
    "Phao câu bỗng khẽ động...",
    "Dây câu hơi rung, dường như có thứ gì vừa chạm vào mồi...",
    "Một lực kéo rất nhẹ truyền từ đầu dây câu...",
    "Mặt nước phía trước bất chợt gợn lên vài vòng sóng...",
    "Có thứ gì đó vừa lướt qua dưới mặt nước...",
    "Bóng đen thoáng qua dưới làn nước...",
    "Một đàn cá nhỏ lướt ngang, nhưng chẳng con nào để ý đến mồi câu...",
    "Mồi câu vừa khẽ động, mặt nước cũng theo đó mà rung lên...",
    "Phao câu chìm xuống trong chớp mắt rồi lại nổi lên...",
    "Dây câu bỗng căng ra đôi chút...",
    "Có vẻ như hôm nay vận khí không tệ...",
    "Một tiếng động nhỏ vang lên từ phía dưới mặt nước...",
    "Dòng nước quanh mồi câu bắt đầu chuyển động...",
    "Phao câu liên tục nhấp nhô, có thứ gì đó đang thử mồi...",
    "Mặt nước vốn phẳng lặng bỗng nổi lên từng vòng sóng...",
    
    "Lực kéo từ dưới nước ngày một rõ rệt...",
    "Dây câu rung mạnh hơn, xem ra đã có thứ mắc câu...",
    "Phao câu đột nhiên chìm xuống!",
    "Một tiếng 'tõm' vang lên khi mặt nước bị phá vỡ...",
    "Thứ gì đó dưới nước đang kéo mạnh dây câu...",
    "Dây câu căng như dây cung, con mồi bên dưới không chịu khuất phục...",
    "Mặt nước cuộn lên, xem ra lần này không phải cá nhỏ...",
    "Một bóng cá lớn vụt qua dưới chân...",
    "Sóng nước bất chợt dâng lên quanh nơi thả câu...",
    "Có thứ gì đó đang giằng lấy mồi câu từ dưới đáy...",
    "Dây câu truyền đến một lực kéo bất ngờ...",
    "Phao câu chìm hẳn xuống mặt nước...",
    "Con mồi bên dưới vùng vẫy dữ dội...",
    "Làn nước rung chuyển, dường như đã câu trúng thứ không tầm thường...",
    "Cần câu cong xuống vì sức nặng từ dưới nước...",
    
    "Nhanh tay thu dây, kéo chiến lợi phẩm lên khỏi mặt nước...",
    "Từ từ thu dây, không để con mồi thoát mất...",
    "Giữ chặt cần câu, từng chút một kéo con mồi lên...",
    "Dây câu được thu lại, mặt nước phía trước bắt đầu nổi bọt...",
    "Một bóng cá dần hiện lên giữa làn nước trong...",
    "Mặt nước bắn tung khi con mồi bị kéo lên...",
    "Sau một hồi giằng co, cuối cùng con mồi cũng chịu nổi lên...",
    "Cần câu rung lên trong tay, xem ra chuyến này có thu hoạch...",
    "Thu dây thật chậm, cảm nhận từng chuyển động của con mồi...",
    "Con mồi vùng vẫy lần cuối trước khi bị kéo khỏi mặt nước...",
    
    "Một luồng linh khí nhàn nhạt theo dòng nước tràn đến...",
    "Linh khí quanh mặt biển dường như đang dao động...",
    "Có một bóng sáng mơ hồ lướt qua dưới đáy nước...",
    "Dưới làn nước sâu, dường như có thứ gì đó đang quan sát...",
    "Một luồng sáng xanh thoáng hiện rồi biến mất dưới mặt nước...",
    "Dòng nước mang theo chút linh lực kỳ lạ...",
    "Mặt biển phản chiếu ánh sáng, nhưng bên dưới lại tối sâu không thấy đáy...",
    "Có tiếng động vọng lên từ vùng nước sâu...",
    "Một bóng dáng kỳ lạ chậm rãi lướt qua dưới dây câu...",
    "Linh khí nơi đây dường như thu hút không ít hải vật...",
    "Dưới đáy nước sâu thẳm, một đôi mắt thoáng hiện rồi biến mất...",
    "Mặt nước đột nhiên tĩnh lặng, như thể cả hải vực đang nín thở...",
    "Một vòng linh quang lan ra từ nơi mồi câu chìm xuống...",
    "Dây câu khẽ rung dù mặt nước hoàn toàn không có gió...",
    "Không biết dưới đáy biển sâu kia đang ẩn giấu thứ gì...",
];

export default {
    data: new SlashCommandBuilder()
        .setName('fish')
        .setDescription('Câu cá, bắt Linh Ngư và kiếm Linh Thạch'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;
            
            const userId = interaction.user.id;
            const guildId = interaction.guildId;
            const now = Date.now();

            const userData = await getEconomyData(client, guildId, userId);
            const lastFish = userData.lastFish || 0;
            const hasCanthinhtrieu = userData.inventory["canthinhtrieu"] || 0;

            if (now < lastFish + FISH_COOLDOWN) {
                const remaining = lastFish + FISH_COOLDOWN - now;
                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor(
                    (remaining % (1000 * 60 * 60)) / (1000 * 60),
                );

                throw createError(
                    "Chưa Thể Thả Câu",
                    ErrorTypes.RATE_LIMIT,
                    `Khúc nước này vừa bị đánh bắt quá nhiều, đàn cá đã tản đi. Hãy quay lại sau **${hours}h ${minutes}m**`,
                    { remaining, cooldownType: 'fish' }
                );
            }

            const rand = Math.random();
            let fishCaught;
            
            if (rand < 0.5) {
                
                fishCaught = FISH_TYPES.filter(f => f.rarity === 'common')[Math.floor(Math.random() * 3)];
            } else if (rand < 0.75) {
                
                fishCaught = FISH_TYPES.filter(f => f.rarity === 'uncommon')[Math.floor(Math.random() * 2)];
            } else if (rand < 0.9) {
                
                fishCaught = FISH_TYPES.filter(f => f.rarity === 'rare')[Math.floor(Math.random() * 2)];
            } else if (rand < 0.98) {
                
                fishCaught = FISH_TYPES.find(f => f.rarity === 'epic');
            } else {
                
                fishCaught = FISH_TYPES.find(f => f.rarity === 'legendary');
            }

            const baseEarned = Math.floor(
                Math.random() * (BASE_MAX_REWARD - BASE_MIN_REWARD + 1)
            ) + BASE_MIN_REWARD;

            let finalEarned = baseEarned;
            let multiplierMessage = "";

            if (hasCanthinhtrieu > 0) {
                finalEarned = Math.floor(baseEarned * CANTHINHTRIEU_MULTIPLIER);
                multiplierMessage = `\n🎣 **Thưởng thêm từ Cần Thính Triều: +50%**`;
            }

            const catchMessage = CATCH_MESSAGES[Math.floor(Math.random() * CATCH_MESSAGES.length)];

            userData.wallet += finalEarned;
            userData.lastFish = now;

            await setEconomyData(client, guildId, userId, userData);

            const rarityColors = {
                common: '#95A5A6',
                uncommon: '#2ECC71',
                rare: '#3498DB',
                epic: '#9B59B6',
                legendary: '#F1C40F'
            };

            const embed = createEmbed({
                title: '🎣 Câu Cá Thành Công!',
                description: `${catchMessage}\n\nĐạo Hữu đã câu được **${fishCaught.emoji} ${fishCaught.name}**! Thu hoạch được **${finalEarned.toLocaleString()}<:lt1:1545082415033360495>**!${multiplierMessage}`,
                color: rarityColors[fishCaught.rarity]
            })
                .addFields(
                    {
                        name: "<:lt1:1545082415033360495> hiện có:",
                        value: `${userData.wallet.toLocaleString()}<:lt1:1545082415033360495>`,
                        inline: true,
                    },
                    {
                        name: "Phẩm Cấp",
                        value: fishCaught.rarity.charAt(0).toUpperCase() + fishCaught.rarity.slice(1),
                        inline: true,
                    }
                )
                .setFooter({ text: `Sau 45 phút có thể tiếp tục thả câu.` });

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'fish' })
};
