export type Country = {
  code: string;
  name: string;
};

export const countries: Country[] = [
  { code: "ar", name: "Arjantin" }, { code: "au", name: "Avustralya" }, { code: "at", name: "Avusturya" },
  { code: "az", name: "Azerbaycan" }, { code: "be", name: "Belçika" }, { code: "br", name: "Brezilya" },
  { code: "bg", name: "Bulgaristan" }, { code: "ca", name: "Kanada" }, { code: "cl", name: "Şili" },
  { code: "cn", name: "Çin" }, { code: "co", name: "Kolombiya" }, { code: "hr", name: "Hırvatistan" },
  { code: "cu", name: "Küba" }, { code: "cz", name: "Çekya" }, { code: "dk", name: "Danimarka" },
  { code: "eg", name: "Mısır" }, { code: "fi", name: "Finlandiya" }, { code: "fr", name: "Fransa" },
  { code: "de", name: "Almanya" }, { code: "gr", name: "Yunanistan" }, { code: "hu", name: "Macaristan" },
  { code: "in", name: "Hindistan" }, { code: "id", name: "Endonezya" }, { code: "ir", name: "İran" },
  { code: "iq", name: "Irak" }, { code: "ie", name: "İrlanda" }, { code: "it", name: "İtalya" },
  { code: "jp", name: "Japonya" }, { code: "kz", name: "Kazakistan" }, { code: "ke", name: "Kenya" },
  { code: "mx", name: "Meksika" }, { code: "ma", name: "Fas" }, { code: "nl", name: "Hollanda" },
  { code: "nz", name: "Yeni Zelanda" }, { code: "ng", name: "Nijerya" }, { code: "no", name: "Norveç" },
  { code: "pk", name: "Pakistan" }, { code: "pe", name: "Peru" }, { code: "ph", name: "Filipinler" },
  { code: "pl", name: "Polonya" }, { code: "pt", name: "Portekiz" }, { code: "ro", name: "Romanya" },
  { code: "ru", name: "Rusya" }, { code: "sa", name: "Suudi Arabistan" }, { code: "za", name: "Güney Afrika" },
  { code: "kr", name: "Güney Kore" }, { code: "es", name: "İspanya" }, { code: "se", name: "İsveç" },
  { code: "ch", name: "İsviçre" }, { code: "th", name: "Tayland" }, { code: "tr", name: "Türkiye" },
  { code: "ua", name: "Ukrayna" }, { code: "ae", name: "Birleşik Arap Emirlikleri" }, { code: "gb", name: "Birleşik Krallık" },
  { code: "us", name: "Amerika Birleşik Devletleri" }, { code: "uy", name: "Uruguay" }, { code: "ve", name: "Venezuela" },
  { code: "vn", name: "Vietnam" },
];

export function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

export function createWorldRound(): Country[] {
  return shuffle(countries).slice(0, 10);
}
