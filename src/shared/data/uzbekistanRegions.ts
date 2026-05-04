/** Regions / cities shown in location picker (stored on `customers.region` / `city`). */
export type UzbekistanRegion = {
  readonly name: string;
  readonly cities: readonly string[];
};

export const UZBEKISTAN_REGIONS: readonly UzbekistanRegion[] = [
  {
    name: 'Тошкент',
    cities: [
      'Toshkent shahri',
      'Chirchiq',
      'Olmaliq',
      'Angren',
      'Bekobod',
      "Yangiyo'l",
      'Ohangaron',
      'Parkent',
      'Pskent',
    ],
  },
  {
    name: 'Самарканд',
    cities: ['Samarqand shahri', 'Urgut', "Kattaqo'rg'on", 'Jomboy', 'Nurobod', "Bulung'ur", 'Payariq'],
  },
  {
    name: 'Бухара',
    cities: ['Buxoro shahri', "G'ijduvon", 'Kogon', 'Romiton', 'Shofirkon', 'Vobkent', 'Zarafshon shahri'],
  },
  {
    name: 'Андижон',
    cities: ['Andijon shahri', 'Xojaobod', 'Asaka', 'Shahrixon', 'Marhamat', "Oltinko'l", 'Buloqboshi'],
  },
  {
    name: "Фарғона",
    cities: ["Farg'ona shahri", "Qo'qon", "Marg'ilon", 'Rishtan', "Ozbekiston shahri", 'Quvasoy', 'Beshariq'],
  },
  {
    name: 'Хоразм',
    cities: ['Urganch shahri', 'Xiva shahri', 'Gurlan', 'Shovot', 'Hazorasp', "Qoshko'pir", 'Yangiariq'],
  },
  {
    name: 'Наманган',
    cities: ['Namangan shahri', 'Chortoq', 'Chust', 'Kosonsoy', 'Pop', "To'raqo'rg'on", 'Norin'],
  },
];
