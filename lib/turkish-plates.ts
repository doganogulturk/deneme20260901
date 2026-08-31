export type Province = {
  city: string;
  plate: number;
};

export const provinces: Province[] = [
  { city: "Adana", plate: 1 }, { city: "Adıyaman", plate: 2 }, { city: "Afyonkarahisar", plate: 3 },
  { city: "Ağrı", plate: 4 }, { city: "Amasya", plate: 5 }, { city: "Ankara", plate: 6 },
  { city: "Antalya", plate: 7 }, { city: "Artvin", plate: 8 }, { city: "Aydın", plate: 9 },
  { city: "Balıkesir", plate: 10 }, { city: "Bilecik", plate: 11 }, { city: "Bingöl", plate: 12 },
  { city: "Bitlis", plate: 13 }, { city: "Bolu", plate: 14 }, { city: "Burdur", plate: 15 },
  { city: "Bursa", plate: 16 }, { city: "Çanakkale", plate: 17 }, { city: "Çankırı", plate: 18 },
  { city: "Çorum", plate: 19 }, { city: "Denizli", plate: 20 }, { city: "Diyarbakır", plate: 21 },
  { city: "Edirne", plate: 22 }, { city: "Elazığ", plate: 23 }, { city: "Erzincan", plate: 24 },
  { city: "Erzurum", plate: 25 }, { city: "Eskişehir", plate: 26 }, { city: "Gaziantep", plate: 27 },
  { city: "Giresun", plate: 28 }, { city: "Gümüşhane", plate: 29 }, { city: "Hakkâri", plate: 30 },
  { city: "Hatay", plate: 31 }, { city: "Isparta", plate: 32 }, { city: "Mersin", plate: 33 },
  { city: "İstanbul", plate: 34 }, { city: "İzmir", plate: 35 }, { city: "Kars", plate: 36 },
  { city: "Kastamonu", plate: 37 }, { city: "Kayseri", plate: 38 }, { city: "Kırklareli", plate: 39 },
  { city: "Kırşehir", plate: 40 }, { city: "Kocaeli", plate: 41 }, { city: "Konya", plate: 42 },
  { city: "Kütahya", plate: 43 }, { city: "Malatya", plate: 44 }, { city: "Manisa", plate: 45 },
  { city: "Kahramanmaraş", plate: 46 }, { city: "Mardin", plate: 47 }, { city: "Muğla", plate: 48 },
  { city: "Muş", plate: 49 }, { city: "Nevşehir", plate: 50 }, { city: "Niğde", plate: 51 },
  { city: "Ordu", plate: 52 }, { city: "Rize", plate: 53 }, { city: "Sakarya", plate: 54 },
  { city: "Samsun", plate: 55 }, { city: "Siirt", plate: 56 }, { city: "Sinop", plate: 57 },
  { city: "Sivas", plate: 58 }, { city: "Tekirdağ", plate: 59 }, { city: "Tokat", plate: 60 },
  { city: "Trabzon", plate: 61 }, { city: "Tunceli", plate: 62 }, { city: "Şanlıurfa", plate: 63 },
  { city: "Uşak", plate: 64 }, { city: "Van", plate: 65 }, { city: "Yozgat", plate: 66 },
  { city: "Zonguldak", plate: 67 }, { city: "Aksaray", plate: 68 }, { city: "Bayburt", plate: 69 },
  { city: "Karaman", plate: 70 }, { city: "Kırıkkale", plate: 71 }, { city: "Batman", plate: 72 },
  { city: "Şırnak", plate: 73 }, { city: "Bartın", plate: 74 }, { city: "Ardahan", plate: 75 },
  { city: "Iğdır", plate: 76 }, { city: "Yalova", plate: 77 }, { city: "Karabük", plate: 78 },
  { city: "Kilis", plate: 79 }, { city: "Osmaniye", plate: 80 }, { city: "Düzce", plate: 81 },
];

export function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

export function createRound(): Province[] {
  return shuffle(provinces).slice(0, 10);
}

export function choicesFor(province: Province): number[] {
  const alternatives = shuffle(provinces.filter((item) => item.plate !== province.plate))
    .slice(0, 3)
    .map((item) => item.plate);

  return shuffle([province.plate, ...alternatives]);
}
