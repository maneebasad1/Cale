import type { FoodItem } from '../types/food';

/** Curated Asian & regional foods — calories per listed serving (USDA FDC where noted). */
export const ASIAN_FOODS: FoodItem[] = [
  // Chinese
  { id: 'cn-1', name: 'Steamed White Rice', calories: 205, servingLabel: '1 cup cooked', region: 'chinese', source: 'local', sourceRef: 'USDA FDC #2512380' },
  { id: 'cn-2', name: 'Fried Rice', calories: 333, servingLabel: '1 cup', region: 'chinese', source: 'local', sourceRef: 'USDA FDC #173944' },
  { id: 'cn-3', name: 'Chow Mein', calories: 395, servingLabel: '1 cup', region: 'chinese', source: 'local', sourceRef: 'USDA FDC #172934' },
  { id: 'cn-4', name: 'Dumplings (Steamed Pork)', calories: 45, servingLabel: '1 piece', region: 'chinese', source: 'local', sourceRef: 'USDA FDC #172185' },
  { id: 'cn-5', name: 'Spring Roll (Fried)', calories: 140, servingLabel: '1 roll', region: 'chinese', source: 'local' },
  { id: 'cn-6', name: 'Kung Pao Chicken', calories: 430, servingLabel: '1 cup', region: 'chinese', source: 'local' },
  { id: 'cn-7', name: 'Sweet and Sour Chicken', calories: 470, servingLabel: '1 cup', region: 'chinese', source: 'local' },
  { id: 'cn-8', name: 'Mapo Tofu', calories: 320, servingLabel: '1 cup', region: 'chinese', source: 'local' },
  { id: 'cn-9', name: 'Char Siu (BBQ Pork)', calories: 290, servingLabel: '100g', region: 'chinese', source: 'local' },
  { id: 'cn-10', name: 'Congee (Rice Porridge)', calories: 120, servingLabel: '1 bowl', region: 'chinese', source: 'local' },
  { id: 'cn-11', name: 'Hot and Sour Soup', calories: 90, servingLabel: '1 cup', region: 'chinese', source: 'local', sourceRef: 'USDA FDC #171580' },
  { id: 'cn-12', name: 'Wonton Soup', calories: 180, servingLabel: '1 bowl', region: 'chinese', source: 'local' },

  // Japanese
  { id: 'jp-1', name: 'Sushi Roll (California)', calories: 255, servingLabel: '6 pieces', region: 'japanese', source: 'local', sourceRef: 'USDA FDC #168034' },
  { id: 'jp-2', name: 'Salmon Nigiri', calories: 50, servingLabel: '1 piece', region: 'japanese', source: 'local' },
  { id: 'jp-3', name: 'Ramen (Tonkotsu)', calories: 550, servingLabel: '1 bowl', region: 'japanese', source: 'local' },
  { id: 'jp-4', name: 'Udon Noodle Soup', calories: 380, servingLabel: '1 bowl', region: 'japanese', source: 'local' },
  { id: 'jp-5', name: 'Chicken Teriyaki', calories: 380, servingLabel: '1 serving', region: 'japanese', source: 'local', sourceRef: 'USDA FDC #171515' },
  { id: 'jp-6', name: 'Tempura (Mixed)', calories: 320, servingLabel: '5 pieces', region: 'japanese', source: 'local' },
  { id: 'jp-7', name: 'Onigiri (Rice Ball)', calories: 180, servingLabel: '1 piece', region: 'japanese', source: 'local' },
  { id: 'jp-8', name: 'Miso Soup', calories: 35, servingLabel: '1 cup', region: 'japanese', source: 'local', sourceRef: 'USDA FDC #172883' },
  { id: 'jp-9', name: 'Edamame', calories: 188, servingLabel: '1 cup shelled', region: 'japanese', source: 'local', sourceRef: 'USDA FDC #168411' },
  { id: 'jp-10', name: 'Gyoza (Pan-fried)', calories: 60, servingLabel: '1 piece', region: 'japanese', source: 'local' },

  // Korean
  { id: 'kr-1', name: 'Bibimbap', calories: 560, servingLabel: '1 bowl', region: 'korean', source: 'local' },
  { id: 'kr-2', name: 'Kimchi Fried Rice', calories: 420, servingLabel: '1 cup', region: 'korean', source: 'local' },
  { id: 'kr-3', name: 'Korean BBQ Beef (Bulgogi)', calories: 310, servingLabel: '100g', region: 'korean', source: 'local' },
  { id: 'kr-4', name: 'Kimchi', calories: 23, servingLabel: '1 cup', region: 'korean', source: 'local', sourceRef: 'USDA FDC #168391' },
  { id: 'kr-5', name: 'Japchae (Glass Noodles)', calories: 350, servingLabel: '1 cup', region: 'korean', source: 'local' },
  { id: 'kr-6', name: 'Tteokbokki', calories: 280, servingLabel: '1 cup', region: 'korean', source: 'local' },
  { id: 'kr-7', name: 'Samgyeopsal (Pork Belly BBQ)', calories: 450, servingLabel: '100g', region: 'korean', source: 'local' },
  { id: 'kr-8', name: 'Kimbap Roll', calories: 330, servingLabel: '1 roll', region: 'korean', source: 'local' },

  // Indian
  { id: 'in-1', name: 'Chicken Biryani', calories: 580, servingLabel: '1 cup', region: 'indian', source: 'local' },
  { id: 'in-2', name: 'Butter Chicken', calories: 490, servingLabel: '1 cup', region: 'indian', source: 'local' },
  { id: 'in-3', name: 'Palak Paneer', calories: 320, servingLabel: '1 cup', region: 'indian', source: 'local' },
  { id: 'in-4', name: 'Dal (Lentil Curry)', calories: 230, servingLabel: '1 cup', region: 'indian', source: 'local', sourceRef: 'USDA FDC #172886' },
  { id: 'in-5', name: 'Chana Masala', calories: 280, servingLabel: '1 cup', region: 'indian', source: 'local' },
  { id: 'in-6', name: 'Naan Bread', calories: 260, servingLabel: '1 piece', region: 'indian', source: 'local', sourceRef: 'USDA FDC #168928' },
  { id: 'in-7', name: 'Roti (Chapati)', calories: 120, servingLabel: '1 piece', region: 'indian', source: 'local' },
  { id: 'in-8', name: 'Samosa', calories: 260, servingLabel: '1 piece', region: 'indian', source: 'local', sourceRef: 'USDA FDC #168033' },
  { id: 'in-9', name: 'Tandoori Chicken', calories: 260, servingLabel: '1 leg', region: 'indian', source: 'local' },
  { id: 'in-10', name: 'Dosa (Plain)', calories: 120, servingLabel: '1 medium', region: 'indian', source: 'local' },
  { id: 'in-11', name: 'Idli', calories: 39, servingLabel: '1 piece', region: 'indian', source: 'local' },
  { id: 'in-12', name: 'Paratha (Plain)', calories: 320, servingLabel: '1 piece', region: 'indian', source: 'local' },

  // Thai
  { id: 'th-1', name: 'Pad Thai', calories: 450, servingLabel: '1 cup', region: 'thai', source: 'local', sourceRef: 'USDA FDC #172933' },
  { id: 'th-2', name: 'Green Curry with Chicken', calories: 430, servingLabel: '1 cup', region: 'thai', source: 'local' },
  { id: 'th-3', name: 'Tom Yum Soup', calories: 120, servingLabel: '1 cup', region: 'thai', source: 'local' },
  { id: 'th-4', name: 'Massaman Curry', calories: 480, servingLabel: '1 cup', region: 'thai', source: 'local' },
  { id: 'th-5', name: 'Thai Basil Chicken', calories: 390, servingLabel: '1 cup', region: 'thai', source: 'local' },
  { id: 'th-6', name: 'Mango Sticky Rice', calories: 340, servingLabel: '1 serving', region: 'thai', source: 'local' },
  { id: 'th-7', name: 'Som Tam (Papaya Salad)', calories: 90, servingLabel: '1 cup', region: 'thai', source: 'local' },
  { id: 'th-8', name: 'Satay Chicken (4 skewers)', calories: 280, servingLabel: '4 skewers', region: 'thai', source: 'local' },

  // Vietnamese
  { id: 'vn-1', name: 'Pho (Beef Noodle Soup)', calories: 430, servingLabel: '1 bowl', region: 'vietnamese', source: 'local' },
  { id: 'vn-2', name: 'Banh Mi Sandwich', calories: 420, servingLabel: '1 sandwich', region: 'vietnamese', source: 'local' },
  { id: 'vn-3', name: 'Goi Cuon (Fresh Spring Roll)', calories: 90, servingLabel: '2 rolls', region: 'vietnamese', source: 'local' },
  { id: 'vn-4', name: 'Bun Cha (Grilled Pork)', calories: 520, servingLabel: '1 serving', region: 'vietnamese', source: 'local' },
  { id: 'vn-5', name: 'Com Tam (Broken Rice Plate)', calories: 580, servingLabel: '1 plate', region: 'vietnamese', source: 'local' },

  // Filipino
  { id: 'ph-1', name: 'Adobo (Chicken)', calories: 350, servingLabel: '1 cup', region: 'filipino', source: 'local' },
  { id: 'ph-2', name: 'Sinigang (Pork)', calories: 280, servingLabel: '1 bowl', region: 'filipino', source: 'local' },
  { id: 'ph-3', name: 'Lumpia (Fried Spring Roll)', calories: 95, servingLabel: '1 piece', region: 'filipino', source: 'local' },
  { id: 'ph-4', name: 'Pancit Canton', calories: 380, servingLabel: '1 cup', region: 'filipino', source: 'local' },
  { id: 'ph-5', name: 'Lechon Kawali', calories: 450, servingLabel: '100g', region: 'filipino', source: 'local' },

  // Middle Eastern / South Asian
  { id: 'me-1', name: 'Hummus', calories: 166, servingLabel: '100g', region: 'middle_eastern', source: 'local', sourceRef: 'USDA FDC #169091' },
  { id: 'me-2', name: 'Falafel', calories: 57, servingLabel: '1 piece', region: 'middle_eastern', source: 'local', sourceRef: 'USDA FDC #168042' },
  { id: 'me-3', name: 'Shawarma Wrap (Chicken)', calories: 550, servingLabel: '1 wrap', region: 'middle_eastern', source: 'local' },
  { id: 'me-4', name: 'Kebab (Seekh, Lamb)', calories: 280, servingLabel: '1 skewer', region: 'middle_eastern', source: 'local' },
  { id: 'me-5', name: 'Biryani (Mutton)', calories: 620, servingLabel: '1 cup', region: 'middle_eastern', source: 'local' },
  { id: 'me-6', name: 'Pita Bread', calories: 165, servingLabel: '1 piece', region: 'middle_eastern', source: 'local', sourceRef: 'USDA FDC #168929' },

  // General / breakfast / snacks
  { id: 'gn-1', name: 'Paratha with Egg', calories: 410, servingLabel: '1 serving', region: 'general', source: 'local' },
  { id: 'gn-2', name: 'Nasi Goreng', calories: 380, servingLabel: '1 cup', region: 'general', source: 'local' },
  { id: 'gn-3', name: 'Roti Canai', calories: 300, servingLabel: '1 piece', region: 'general', source: 'local' },
  { id: 'gn-4', name: 'Mango Lassi', calories: 180, servingLabel: '1 glass', region: 'general', source: 'local' },
  { id: 'gn-5', name: 'Chai (Masala Tea with Milk)', calories: 120, servingLabel: '1 cup', region: 'general', source: 'local' },
  { id: 'gn-6', name: 'Bubble Tea (Milk Tea)', calories: 320, servingLabel: '16 oz', region: 'general', source: 'local' },
];
