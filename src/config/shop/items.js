export const shopItems = [
    {
        id: 'tranhailenh',
        name: 'Trấn Hải Lệnh <:ithl:1545714181997863012>',
        price: 5000,
        description: 'Có thể dùng Lệnh bài này để nhận thêm nhiệm vụ từ Trấn Hải Các. `/nhiemvu`',
        type: 'consumable',
        maxQuantity: 5,
cooldown: 86400000,
        effect: {
            type: 'command_boost',
            command: 'work',
            uses: 1
        }
    },
    {
        id: 'linhkho+',
        name: 'Linh Khố + <:tvp1:1545082419273801859>',
        price: 15000,
        description: 'Mở rộng dung lượng Linh Khố, cho phép tích trữ thêm Linh Thạch.',
        type: 'upgrade',
        maxLevel: 5,
        effect: {
            type: 'bank_capacity',
            multiplier: 1.5
        }
    },
    {
        id: 'bancophu',
        name: 'Bàn Cổ Phủ <:bcp:1545728177169502288>',
        price: 50000,
        description: 'Gia tăng sản lượng Linh Thạch thu được từ /mine.',
        type: 'tool',
        durability: 100,
        effect: {
            type: 'mining_yield',
            multiplier: 2.0
        }
    },
    {
        id: 'loanvuboi',
        name: 'Loan Vũ Bội <:ilvb:1545714174112563240>',
        price: 15000,
        description: 'Cổ bội được luyện từ một chiếc linh vũ của Thần Loan Điểu. Chỉ người có duyên mới được Nhất Phẩm Các ban cho, mở lối tiến vào Kim Vân Đài.',
        type: 'role',
roleId: null,
        effect: {
            type: 'daily_bonus',
            multiplier: 1.1
        }
    },
    {
        id: 'tulinhthao',
        name: 'Tụ Linh Thảo <:tlt:1545730351693828147>',
        price: 10000,
        description: 'Gia tăng cơ duyên nhận được phần thưởng cao hơn khi sử dụng /gamble một lần.',
        type: 'consumable',
        maxQuantity: 10,
        effect: {
            type: 'gamble_boost',
            multiplier: 1.5,
            uses: 1
        }
    },
    {
        id: 'canthinhtrieu',
        name: '🎣 Fishing Rod',
        price: 5000,
        description: 'Triều Sinh Vạn Tượng đã mở. Triều dâng sinh vạn tượng. Sao còn chần chờ chưa vác cần đến đó kiếm một ít cơ duyên? Mang theo Cần Thính Triều, người câu không chỉ nhìn phao mà nghe con nước, thuận theo thủy thế.',
        type: 'tool',
        durability: 100,
        effect: {
            type: 'fishing_yield',
            multiplier: 1.0
        }
    },
    {
        id: 'cuockhailinh',
        name: 'Cuốc Khai Linh <:icuoc:1545714179581943868>',
        price: 7500,
        description: 'Sơn Tàng Vạn Ngọc đã mở. Núi giấu chứa muôn ngọc. Mau mang cuốc tới mà đào Linh Thạch thôi!',
        type: 'tool',
        durability: 100,
        effect: {
            type: 'mining_yield',
            multiplier: 1.2
        }
    },
    {
        id: 'nhanngauthanh',
        name: 'Nhẫn Ngẫu Thành <:nhannt:1545735909067063356>',
        price: 15000,
        description: 'Nhẫn đem lại những cuộc gặp và kết quả ngoài dự liệu, tăng thêm linh thạch khi làm Nhiệm Vụ',
        type: 'tool',
        durability: 200,
        effect: {
            type: 'work_yield',
            multiplier: 1.5
        }
    },
    {
        id: 'buathienkhuoc',
        name: 'Bùa Thiên Khước <:buatk:1545735911675797504>',
        price: 10000,
        description: 'Gia tăng cơ duyên khi /gamble. Có thể sử dụng 3 lần.',
        type: 'consumable',
        maxQuantity: 10,
        effect: {
            type: 'gamble_boost',
            multiplier: 1.3,
            uses: 3
        }
    },
    {
        id: 'kheuoc',
        name: 'Khế Ước Thông Bảo Trang <:kheuoc:1545739667368972338>',
        price: 25000,
        description: 'Gia tăng giới hạn Linh Thạch mà Đạo Hữu có thể ký gửi vào Thông Bảo Trang. Có thể thỉnh nhiều lần.',
        type: 'tool',
        durability: null,
        effect: {
            type: 'bank_capacity',
            increase: 10000
        }
    },
    {
        id: 'cachdoatcam',
        name: 'Cách Đoạt Cấm <:camche:1545741664159662181>',
        price: 50000000,
        description: 'Cấm chế bảo hộ Linh Nang, ngăn người khác cướp đoạt Linh Thạch của Đạo Hữu.',
        type: 'tool',
        durability: null,
        effect: {
            type: 'robbery_protection',
            protection: true
        }
    }
];

export function getItemById(itemId) {
    return shopItems.find(item => item.id === itemId);
}

export function getItemsByType(type) {
    return shopItems.filter(item => item.type === type);
}

export function getItemPrice(itemId) {
    const item = getItemById(itemId);
    return item ? item.price : 0;
}

export function validatePurchase(itemId, userData) {
    const item = getItemById(itemId);
    if (!item) {
        return { valid: false, reason: 'Không tìm thấy vật phẩm' };
    }

    const inventory = userData.inventory || {};
    const upgrades = userData.upgrades || {};

    if (item.type === 'consumable' && item.maxQuantity) {
        const currentQuantity = inventory[itemId] || 0;
        if (currentQuantity >= item.maxQuantity) {
            return { 
                valid: false, 
                reason: `Đạo Hữu chỉ có thể sở hữu ${item.maxQuantity} ${item.name}s` 
            };
        }
    }

    if (item.type === 'upgrade' && item.maxLevel) {
        
        if (upgrades[itemId]) {
            return { 
                valid: false, 
                reason: `Đạo Hữu đã có ${item.name}` 
            };
        }
    }

    if (item.type === 'tool') {
        
        const currentQuantity = inventory[itemId] || 0;
        if (itemId !== 'kheuoc' && currentQuantity > 0) {
            return { 
                valid: false, 
                reason: `Đạo Hữu đã có ${item.name}` 
            };
        }
    }

    if (item.type === 'role' && item.roleId) {
        if (userData.roles?.includes(item.roleId)) {
            return { 
                valid: false, 
                reason: `Đạo Hữu đã sở hữu ${item.name}` 
            };
        }
    }

    return { valid: true };
}
