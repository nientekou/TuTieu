import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { botConfig } from '../../config/bot.js';

const WORK_COOLDOWN = botConfig.economy?.cooldowns?.work ?? 30 * 60 * 1000;
const MIN_WORK_AMOUNT = botConfig.economy?.workMin ?? 10;
const MAX_WORK_AMOUNT = botConfig.economy?.workMax ?? 100;
const NHANNGAUTHANH_MULTIPLIER = 1.5;
const WORK_JOBS = [
     "thu thập Linh Thảo",
    "hái Linh Quả",
    "khai thác Linh Thạch",
    "câu Linh Ngư",
    "trông coi Linh Điền",
    "chăm sóc Linh Thú",
    "thu hoạch Linh Cốc",
    "tưới nước cho Linh Điền",
    "thu gom Linh Mộc",
    "tìm kiếm Dược Thảo",
    "phân loại Linh Dược",
    "phơi sấy Linh Thảo",
    "thu thập Hoa Linh",
    "tìm Linh Trúc",
    "thu gom quả dại trong núi",
    "tìm nấm trong rừng sâu",
    "thu thập mật Linh Phong",
    "đào lấy Ngọc Thạch",
    "khai thác khoáng vật",
    "thăm dò khoáng mạch",
    "thu hồi Pháp Khí thất lạc",
    "sửa chữa Pháp Khí",
    "vận chuyển Linh Tài",
    "phân loại vật tư",
    "kiểm kê kho vật liệu",
    "sắp xếp kho Linh Tài",
    "trông coi Tàng Khố",
    "đưa vật phẩm đến Phường Thị",
    "áp tải Linh Thạch",
    "áp tải hàng hóa",
    "hộ tống thương đội",
    "hộ tống Đạo Hữu",
    "đưa thư đến Phường Thị",
    "chuyển thư giữa các Sơn Trang",
    "giao vật phẩm cho khách nhân",
    "thu hồi hàng hóa quá hạn",
    "nhận hàng từ thương đội",
    "kiểm tra hàng hóa nhập kho",
    "đưa Linh Dược đến Dược Đường",
    "vận chuyển vật liệu xây dựng",
    "trông coi Sơn Môn",
    "tuần tra quanh sơn môn",
    "tuần tra đường núi",
    "kiểm tra các trạm canh",
    "tuần tra khu vực ngoại vi",
    "giữ gìn trật tự Phường Thị",
    "trông coi Linh Điền",
    "canh giữ Linh Mạch",
    "bảo vệ thương đội",
    "bảo vệ đoàn vận chuyển",
    "canh giữ kho vật tư",
    "trông coi khu vực cấm",
    "kiểm tra cấm chế",
    "gia cố cấm chế",
    "tu sửa trận kỳ",
    "kiểm tra Trận Nhãn",
    "điều tra dị động",
    "điều tra dấu vết Yêu Thú",
    "khảo sát khu vực mới",
    "thăm dò Cổ Quật",
    "thăm dò hang đá",
    "khảo sát Linh Mạch",
    "tìm kiếm di tích cổ",
    "tìm dấu tích tiền nhân",
    "tìm kiếm động phủ bỏ hoang",
    "khảo sát vùng Hoang Sơn",
    "thăm dò vực sâu",
    "khảo sát hải vực",
    "tìm kiếm nguồn Linh Khí",
    "xác định vị trí khoáng mạch",
    "tìm kiếm nơi có dị bảo",
    "kiểm tra khu vực xuất hiện linh quang",
    "tìm hiểu nguồn gốc dị tượng",
    "khảo sát địa hình",
    "vẽ bản đồ đường núi",
    "đánh dấu địa điểm nguy hiểm",
    "truy tìm Yêu Thú",
    "trừ Yêu tại Hoang Sơn",
    "xua đuổi Yêu Thú khỏi thôn làng",
    "dọn sạch hang Yêu Thú",
    "tiêu diệt Yêu Vật quanh Phường Thị",
    "truy dấu Tà Tu",
    "điều tra tung tích Tà Tu",
    "hộ tống người dân rời khỏi vùng nguy hiểm",
    "bảo vệ thôn dân",
    "giải cứu người bị mắc kẹt",
    "tìm người mất tích",
    "tìm kiếm Đạo Hữu mất liên lạc",
    "điều tra vụ mất tích",
    "giải quyết tranh chấp",
    "hòa giải tranh chấp giữa các thương hộ",
    "giúp đỡ phàm nhân giải nạn",
    "xử lý chuyện phiền nhiễu trong Phường Thị",
    "truy tìm kẻ trộm",
    "thu hồi vật bị đánh cắp",
    "điều tra vụ việc khả nghi",
    "tìm kiếm Linh Ngư",
    "câu cá tại Triều Sinh Vạn Tượng",
    "thu thập Hải Linh Thảo",
    "tìm Ngọc dưới đáy biển",
    "thu gom Hải Tảo",
    "khảo sát hải vực",
    "thăm dò vực biển",
    "tìm kiếm vỏ Linh Bối",
    "thu thập Hải Linh Châu",
    "kiểm tra vùng nước dị thường",
    "tìm dấu vết Hải Thú",
    "thu hồi vật phẩm rơi xuống nước",
    "khai thác tại Sơn Tàng Vạn Ngọc",
    "tìm kiếm Linh Thạch",
    "tìm Ngọc Thạch",
    "thu gom Hắc Diệu Thạch",
    "tìm Xích Tinh",
    "tìm Hàn Ngọc",
    "thăm dò cổ mỏ",
    "khảo sát khoáng động",
    "tìm kiếm khoáng mạch mới",
    "thu gom khoáng thạch",
    "kiểm tra mỏ cũ",
    "tìm đường vào cổ quật",
    "chăm sóc Linh Thú",
    "cho Linh Thú ăn",
    "dọn chuồng Linh Thú",
    "tìm thức ăn cho Linh Thú",
    "đưa Linh Thú về chuồng",
    "tìm Linh Thú đi lạc",
    "chăm sóc Linh Cầm",
    "thu thập trứng Linh Cầm",
    "trông coi Linh Thú non",
    "kiểm tra đàn Linh Thú",
    "tu sửa đường núi",
    "dọn đá chắn đường",
    "sửa cầu gỗ",
    "gia cố sơn đạo",
    "dọn cỏ quanh sơn môn",
    "chặt cây chắn lối",
    "dọn dẹp khu vực nghỉ chân",
    "sửa sang đình nghỉ",
    "tu sửa nhà kho",
    "dọn dẹp kho vật tư",
    "sắp xếp Dược Đường",
    "dọn dẹp Tàng Thư Các",
    "chăm sóc sân vườn",
    "trồng Linh Mộc",
    "trồng Linh Hoa",
    "sao chép Đạo Kinh",
    "phân loại điển tịch",
    "sắp xếp thư tịch",
    "tìm lại sách thất lạc",
    "đưa thư tịch đến Tàng Thư Các",
    "bảo quản cổ thư",
    "ghi chép địa đồ",
    "ghi chép Linh Dược",
    "ghi lại đặc tính Linh Thú",
    "kiểm kê cổ tịch",
    "hỗ trợ Dược Đường",
    "thu thập dược liệu",
    "phân loại dược liệu",
    "sắc Linh Dược",
    "vận chuyển dược liệu",
    "đưa thuốc đến thôn dân",
    "tìm vị thuốc thất lạc",
    "thu thập phương thuốc cổ",
    "kiểm kê kho dược",
    "chăm sóc Linh Dược trong vườn",
    "tiếp đón khách nhân",
    "dẫn đường cho Đạo Hữu",
    "tiếp nhận ủy thác",
    "ghi chép ủy thác",
    "trao trả vật phẩm",
    "hướng dẫn tân nhân",
    "đưa khách nhân đến nghỉ trọ",
    "dẫn khách nhân đến Phường Thị",
    "giải đáp việc vặt",
    "tiếp nhận hàng hóa",
    "tìm kiếm người mua",
    "đưa Linh Tài đến chợ",
    "bán Linh Dược",
    "bán khoáng thạch",
    "đưa Linh Ngư đến chợ",
    "kiểm tra giá vật phẩm",
    "thu mua Linh Tài",
    "thu mua dược liệu",
    "tìm nguồn hàng mới",
    "liên hệ thương hộ",
    "thăm dò Bí Cảnh",
    "tìm kiếm cơ duyên",
    "khảo sát di tích",
    "tìm dấu vết cổ tu",
    "tìm kiếm truyền thừa",
    "điều tra động phủ vô chủ",
    "khảo sát Trận Pháp cổ",
    "tìm kiếm Linh Tuyền",
    "tìm nguồn Linh Khí",
    "thăm dò nơi từng có dị bảo xuất thế",
    "đưa tin khẩn",
    "truyền tin giữa các cứ điểm",
    "chuyển lệnh đến Phường Thị",
    "đưa thư mật",
    "mang tin tức về Sơn Môn",
    "tìm người truyền tin",
    "thu hồi thư tín",
    "giao vật cho người được chỉ định",
    "giúp dân làng sửa nhà",
    "dẫn đường qua Hoang Sơn",
    "tìm gia súc thất lạc",
    "tìm vật dụng bị mất",
    "giúp thương hộ vận chuyển hàng",
    "dọn đường sau mưa lớn",
    "sửa lại hàng rào",
    "tìm nguồn nước cho thôn làng",
    "đưa lương thực đến vùng xa",
    "giúp dân làng thu hoạch",
    "thu thập củi Linh Mộc",
    "đốn Linh Trúc",
    "hái quả trong rừng",
    "thu gom lá thuốc",
    "tìm nguồn nước trong núi",
    "dựng trại giữa Hoang Sơn",
    "chuẩn bị vật tư đường xa",
    "tìm nơi nghỉ chân",
    "dọn đường trong rừng",
    "đánh dấu đường về"
];

export default {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Nhận nhiệm vụ từ Trấn Hải Các'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;
            
            const userId = interaction.user.id;
            const guildId = interaction.guildId;
            const now = Date.now();

            const userData = await getEconomyData(client, guildId, userId);

            if (!userData) {
                throw createError(
                    "Không thể tải dữ liệu tu hành cho nhiệm vụ",
                    ErrorTypes.DATABASE,
                    "Không thể tải dữ liệu tu hành của Đạo Hữu. Vui lòng thử lại sau.",
                    { userId, guildId }
                );
            }

            logger.debug(`[ECONOMY] Bắt đầu nhận nhiệm vụ cho ${userId}`, { userId, guildId });

            const lastWork = userData.lastWork || 0;
            const inventory = userData.inventory || {};
            const extraWorkShifts = inventory["tranhailenh"] || 0;
            const hasNhanngauthanh = inventory["nhanngauthanh"] || 0;

            let cooldownActive = now < lastWork + WORK_COOLDOWN;
            let usedConsumable = false;

            if (cooldownActive) {
                if (extraWorkShifts > 0) {
                    inventory["tranhailenh"] = (inventory["tranhailenh"] || 0) - 1;
                    usedConsumable = true;
                } else {
                    const remaining = lastWork + WORK_COOLDOWN - now;
                    throw createError(
                        "Chưa Thể Nhận Nhiệm Vụ",
                        ErrorTypes.RATE_LIMIT,
                        `Đạo Hữu vừa hoàn thành một nhiệm vụ! Trấn Hải Các sẽ treo Nhiệm Vụ Lệnh khác sau **${Math.floor(remaining / 3600000)}h ${Math.floor((remaining % 3600000) / 60000)}m** `,
                        { timeRemaining: remaining, cooldownType: 'work' }
                    );
                }
            }

            let earned = Math.floor(Math.random() * (MAX_WORK_AMOUNT - MIN_WORK_AMOUNT + 1)) + MIN_WORK_AMOUNT;
            const job = WORK_JOBS[Math.floor(Math.random() * WORK_JOBS.length)];

            let multiplierMessage = "";
            if (hasNhanngauthanh > 0) {
                earned = Math.floor(earned * NHANNGAUTHANH_MULTIPLIER);
                multiplierMessage = "\n<:nhannt:1545735909067063356> **Thưởng thêm từ Nhẫn Ngẫu Thành:** +50%!";
            }

            userData.wallet = (userData.wallet || 0) + earned;
            userData.lastWork = now;

            await setEconomyData(client, guildId, userId, userData);

            logger.info(`[ECONOMY_TRANSACTION] Nhiệm Vụ Hoàn Thành`, {
                userId,
                guildId,
                amount: earned,
                job,
                usedConsumable,
                hasNhanngauthanh: hasNhanngauthanh > 0,
                newWallet: userData.wallet,
                timestamp: new Date().toISOString()
            });

            const embed = successEmbed(
                "💼 Nhiệm Vụ Hoàn Thành!",
                `Đạo Hữu đã **${job}**, nhận thưởng **${earned.toLocaleString()}<:lt1:1545082415033360495>**!${multiplierMessage}`
            )
                .addFields(
                    {
                        name: "<:lt1:1545082415033360495> Hiện Có:",
                        value: `${userData.wallet.toLocaleString()}<:lt1:1545082415033360495>`,
                        inline: true,
                    },
                    {
                        name: "Nhiệm Vụ Tiếp Theo",
                        value: `<t:${Math.floor((now + WORK_COOLDOWN) / 1000)}:R>`,
                        inline: true,
                    }
                )
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                });

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'work' })
};
