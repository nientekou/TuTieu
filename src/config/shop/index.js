import { shopItems, getItemById, getItemsByType, getItemPrice, validatePurchase } from './items.js';
import { botConfig } from '../bot.js';

const { currency } = botConfig.economy;

export const shopConfig = {
    name: 'Nhất Phẩm Các',
    currency: currency.name,
    currencyName: currency.name,
    currencyNamePlural: currency.namePlural || `${currency.name}s`,
    currencySymbol: currency.symbol || '<:lt1:1545082415033360495>',
    
    categories: [
        {
            id: 'vattu',
            name: 'Vật Tư',
            description: 'Các vật phẩm, vật tư tiêu hao.',
            icon: '<:dan:1545087228815081472>',
            itemTypes: ['vattu']
        },
        {
            id: 'dotpha',
            name: 'Đột Phá',
            description: 'Vật phẩm giúp nâng cao tu vi và năng lực một cách vĩnh viễn.',
            icon: '<:idp:1545419934186610699>',
            itemTypes: ['dotpha']
        },
        {
            id: 'phapkhi',
            name: 'Pháp Khí',
            description: 'Pháp khí hỗ trợ Đạo Hữu thu thập tài nguyên hiệu quả hơn.',
            icon: '<:ipk:1545417239908450314>',
            itemTypes: ['phapkhi']
        },
        {
            id: 'thanphan',
            name: 'Thân Phận',
            description: 'Thân phận đặc biệt dựa theo đạo ấn đã khắc vào linh thức.',
            icon: '<:irole:1545420488300298340>',
            itemTypes: ['role']
        }
    ],
    
    transaction: {
cooldown: 1000,
maxSoluong: 10,
confirmTimeout: 30000,
        
        refundPolicy: {
            enabled: true,
window: 300000,
fee: 0.1
        }
    },
    
    ui: {
        itemsPerPage: 5,
        showOutOfStock: true,
        showOwnedItems: true,
        showAffordability: true,
        
        colors: {
primary: '#5865F2',
success: '#43B581',
error: '#F04747',
warning: '#FAA61A',
info: '#00B0F4',
            
            rarity: {
common: '#99AAB5',
uncommon: '#2ECC71',
rare: '#3498DB',
epic: '#9B59B6',
legendary: '#F1C40F',
mythic: '#E74C3C'
            }
        },
        
        emojis: {
            currency: '<:lt1:1545082415033360495>',
            soluong: '✖️',
            price: '<:lt1:1545082415033360495>',
            owned: '✅',
            outOfStock: '❌',
            
            types: {
                vattu: '<:dan:1545087228815081472>',
                dotpha: '<:idp:1545419934186610699>',
                phapkhi: '<:ipk:1545417239908450314>',
                thanphan: '<:irole:1545420488300298340>'
            }
        }
    },
    
    events: {
        restock: {
            enabled: true,
interval: 86400000,
announcementChannel: null,
            message: '<:inpc:1545419936502124616> **Nhất Phẩm Các tái xuất!** Vật phẩm mới đã được bày bán!'
        },
        
        sales: {
            enabled: true,
            schedule: [
                {
day: 0,
discount: 0.2,
                    message: '🔥 **Tuần Lễ Vàng** Giảm 20% cho mọi vật phẩm!'
                },
            ]
        }
    }
};

export {
    shopItems,
    getItemById,
    getItemsByType,
    getItemPrice,
    validatePurchase
};

export function getCurrentPrice(itemId, { soluong = 1, userData = null } = {}) {
    const basePrice = getItemPrice(itemId) * soluong;
    
    let discount = 0;
    
    const now = new Date();
    if (shopConfig.events.sales.enabled) {
        const today = now.getDay();
        const sale = shopConfig.events.sales.schedule.find(s => s.day === today);
        if (sale) {
            discount += sale.discount;
        }
    }
    
    if (userData) {
        if (userData.roles?.includes('premium')) {
            discount += 0.1;
        }
        
        if (soluong >= 10) {
discount += 0.1;
        }
    }
    
    discount = Math.max(0, Math.min(1, discount));
    
    return Math.floor(basePrice * (1 - discount));
}

export function getCategoryForItem(itemType) {
    return shopConfig.categories.find(cat => 
        cat.itemTypes.includes(itemType)
    ) || {
        id: 'khác',
        name: 'Khác',
        description: 'Các vật phẩm khác',
        icon: '📦'
    };
}

export function getItemsInCategory(categoryId) {
    const category = shopConfig.categories.find(cat => cat.id === categoryId);
    if (!category) return [];
    
    return shopItems.filter(item => 
        category.itemTypes.includes(item.type)
    );
}
