/** Regions / cities shown in location picker (stored on `customers.region` / `city`). */
export type UzbekistanRegion = {
  readonly name: string;
  readonly cities: readonly string[];
};

export const UZBEKISTAN_REGIONS: readonly UzbekistanRegion[] = [
  {
    name: 'Toshkent',
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
    name: 'Samarqand',
    cities: ['Samarqand shahri', 'Urgut', "Kattaqo'rg'on", 'Jomboy', 'Nurobod', "Bulung'ur", 'Payariq'],
  },
  {
    name: 'Buxoro',
    cities: ['Buxoro shahri', "G'ijduvon", 'Kogon', 'Romiton', 'Shofirkon', 'Vobkent', 'Zarafshon shahri'],
  },
  {
    name: 'Andijon',
    cities: ['Andijon shahri', 'Xojaobod', 'Asaka', 'Shahrixon', 'Marhamat', "Oltinko'l", 'Buloqboshi'],
  },
  {
    name: "Farg'ona",
    cities: ["Farg'ona shahri", "Qo'qon", "Marg'ilon", 'Rishtan', "Ozbekiston shahri", 'Quvasoy', 'Beshariq'],
  },
  {
    name: 'Xorazm',
    cities: ['Urganch shahri', 'Xiva shahri', 'Gurlan', 'Shovot', 'Hazorasp', "Qoshko'pir", 'Yangiariq'],
  },
  {
    name: 'Namangan',
    cities: ['Namangan shahri', 'Chortoq', 'Chust', 'Kosonsoy', 'Pop', "To'raqo'rg'on", 'Norin'],
  },
];
