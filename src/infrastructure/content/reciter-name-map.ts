/**
 * Latin names, countries and popularity weights keyed by mp3quran reciter id.
 *
 * The upstream API returns Arabic names only, and transliterating them on the
 * fly produces unreadable slugs and unsearchable latin names. The well-known
 * reciters are therefore mapped by hand.
 *
 * Every id below was read back from the live `/api/v3/reciters` response and
 * checked against the Arabic name it actually returns. Do not add an entry by
 * guessing an id: attaching the wrong name to a recitation misattributes a
 * scholar's work, which is the one bug in this file that actually matters.
 * Unmapped ids fall back to a generated transliteration and still work.
 *
 * `popularity` orders the "Top Reciters" and "Popular" carousels until real
 * play-count analytics exist.
 */
export interface ReciterNameEntry {
  latin: string;
  countryCode: string;
  popularity: number;
  avatarUrl?: string;
}

export const RECITER_NAME_MAP: Readonly<Record<number, ReciterNameEntry>> = {
  1: { latin: "Ibrahim Al-Akhdar", countryCode: "SA", popularity: 62 },
  3: { latin: "Ibrahim Al-Asiri", countryCode: "SA", popularity: 52 },
  4: { latin: "Abu Bakr Ash-Shatri", countryCode: "SA", popularity: 89 },
  5: { latin: "Ahmad Al-Ajmi", countryCode: "SA", popularity: 92 },
  6: { latin: "Ahmad Al-Hawashi", countryCode: "SA", popularity: 50 },
  9: { latin: "Ahmad Nu'ayna", countryCode: "EG", popularity: 64 },
  12: { latin: "Idris Abkar", countryCode: "SA", popularity: 88 },
  13: { latin: "Az-Zain Muhammad Ahmad", countryCode: "SD", popularity: 58 },
  17: { latin: "Tawfeeq As-Sayegh", countryCode: "SA", popularity: 74 },
  20: { latin: "Khalid Al-Jalil", countryCode: "SA", popularity: 84 },
  21: { latin: "Khalid Al-Qahtani", countryCode: "SA", popularity: 72 },
  24: { latin: "Khalifa At-Tunaiji", countryCode: "AE", popularity: 66 },
  27: { latin: "Rashid Belaliya", countryCode: "DZ", popularity: 54 },
  30: { latin: "Saad Al-Ghamdi", countryCode: "SA", popularity: 93 },
  31: { latin: "Saud Ash-Shuraim", countryCode: "SA", popularity: 95 },
  36: { latin: "Sayed Ramadan", countryCode: "EG", popularity: 60 },
  42: { latin: "Salih Al-Habdan", countryCode: "SA", popularity: 55 },
  43: { latin: "Salah Al-Budair", countryCode: "SA", popularity: 78 },
  44: { latin: "Salah Al-Hashim", countryCode: "KW", popularity: 61 },
  46: { latin: "Salah Bukhatir", countryCode: "AE", popularity: 79 },
  48: { latin: "Adel Rayyan", countryCode: "EG", popularity: 59 },
  49: { latin: "Abdul Bari Ath-Thubaity", countryCode: "SA", popularity: 76 },
  51: { latin: "Abdul Basit Abdul Samad", countryCode: "EG", popularity: 99 },
  54: { latin: "Abdurrahman As-Sudais", countryCode: "SA", popularity: 98 },
  55: { latin: "Abdul Aziz Al-Ahmad", countryCode: "SA", popularity: 57 },
  56: { latin: "Abdul Aziz Az-Zahrani", countryCode: "SA", popularity: 63 },
  58: { latin: "Abdullah Al-Buaijan", countryCode: "SA", popularity: 65 },
  59: { latin: "Abdullah Al-Matrood", countryCode: "SA", popularity: 73 },
  60: { latin: "Abdullah Basfar", countryCode: "SA", popularity: 81 },
  62: { latin: "Abdullah Awad Al-Juhany", countryCode: "SA", popularity: 91 },
  64: { latin: "Abdurrashid Sufi", countryCode: "DZ", popularity: 70 },
  67: { latin: "Abdul Muhsin Al-Qasim", countryCode: "SA", popularity: 77 },
  71: { latin: "Abdul Wadood Haneef", countryCode: "IN", popularity: 56 },
  74: { latin: "Ali Al-Hudhaify", countryCode: "SA", popularity: 90 },
  76: { latin: "Ali Jaber", countryCode: "SA", popularity: 85 },
  77: { latin: "Ali Hajjaj Al-Suwaisi", countryCode: "EG", popularity: 53 },
  78: { latin: "Imad Zuhair Hafez", countryCode: "SA", popularity: 68 },
  80: { latin: "Omar Al-Qazabri", countryCode: "MA", popularity: 75 },
  81: { latin: "Fares Abbad", countryCode: "YE", popularity: 87 },
  86: { latin: "Nasser Al-Qatami", countryCode: "SA", popularity: 86 },
  89: { latin: "Hani Ar-Rifai", countryCode: "SA", popularity: 83 },
  91: { latin: "Walid An-Naihi", countryCode: "LY", popularity: 51 },
  92: { latin: "Yasser Ad-Dossari", countryCode: "SA", popularity: 94 },
  96: { latin: "Yahya Hawwa", countryCode: "SY", popularity: 58 },
  102: { latin: "Maher Al-Muaiqly", countryCode: "SA", popularity: 96 },
  106: { latin: "Muhammad At-Tablawi", countryCode: "EG", popularity: 80 },
  107: { latin: "Muhammad Al-Luhaidan", countryCode: "SA", popularity: 91 },
  108: { latin: "Muhammad Al-Muhaisny", countryCode: "SA", popularity: 82 },
  109: { latin: "Muhammad Ayyub", countryCode: "SA", popularity: 88 },
  111: { latin: "Muhammad Jibreel", countryCode: "EG", popularity: 79 },
  112: { latin: "Muhammad Siddiq Al-Minshawi", countryCode: "EG", popularity: 97 },
  118: { latin: "Mahmoud Khalil Al-Husary", countryCode: "EG", popularity: 97 },
  121: { latin: "Mahmoud Ali Al-Banna", countryCode: "EG", popularity: 78 },
  123: { latin: "Mishary Rashid Alafasy", countryCode: "KW", popularity: 100 },
  125: { latin: "Mustafa Ismail", countryCode: "EG", popularity: 89 },
  138: { latin: "Noreen Muhammad Siddiq", countryCode: "SD", popularity: 84 },
  152: { latin: "Yasser Salamah", countryCode: "EG", popularity: 60 },
  159: { latin: "Khalid Al-Muhanna", countryCode: "SA", popularity: 67 },
  160: { latin: "Adel Al-Kalbani", countryCode: "SA", popularity: 81 },
  163: { latin: "Hatem Fareed Al-Waer", countryCode: "EG", popularity: 71 },
  178: { latin: "Ibrahim Ad-Dossari", countryCode: "SA", popularity: 64 },
  201: { latin: "Ahmad At-Tarabulsi", countryCode: "LY", popularity: 55 },
  202: { latin: "Abdullah Al-Kandari", countryCode: "KW", popularity: 69 },
  203: { latin: "Ahmad Amer", countryCode: "EG", popularity: 62 },
  208: { latin: "Ad-Dukali Muhammad Al-Alim", countryCode: "LY", popularity: 59 },
  212: { latin: "Tareq Abdul Ghani Daoub", countryCode: "EG", popularity: 66 },
  217: { latin: "Bandar Baleela", countryCode: "SA", popularity: 90 },
  221: { latin: "Raad Muhammad Al-Kurdi", countryCode: "IQ", popularity: 92 },
  225: { latin: "Abdurrahman Al-Ossi", countryCode: "SA", popularity: 89 },
  230: { latin: "Rami Ad-Dueis", countryCode: "SA", popularity: 61 },
  236: { latin: "Abdurrahman Al-Majid", countryCode: "SA", popularity: 63 },
  245: { latin: "Mansour As-Salimi", countryCode: "SA", popularity: 85 },
  248: { latin: "Nasser Al-Usfour", countryCode: "BH", popularity: 57 },
  251: { latin: "Nasser Al-Majid", countryCode: "SA", popularity: 65 },
  254: { latin: "Badr At-Turki", countryCode: "SA", popularity: 68 },
  257: { latin: "Saad Al-Muqrin", countryCode: "SA", popularity: 60 },
  260: { latin: "Omar Ad-Duraiwiz", countryCode: "SA", popularity: 70 },
  278: { latin: "Ahmad Isa Al-Ma'sarawi", countryCode: "EG", popularity: 74 },
  287: { latin: "Abdurrahman Ash-Shahat", countryCode: "EG", popularity: 72 },
  301: { latin: "Faisal Al-Hajri", countryCode: "KW", popularity: 58 },
};
