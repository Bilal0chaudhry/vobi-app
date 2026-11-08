const TENS = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const ONES = {
  zero: 0,
  oh: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

export const normalizeNumbers = (text) => {
  if (!text) return "";
  let out = text.toLowerCase();

  // Compound tens + ones (e.g. "seventy three" -> "73", "twenty-one" -> "21")
  out = out.replace(
    /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[\s-]+(one|two|three|four|five|six|seven|eight|nine)\b/g,
    (_, ten, one) => String(TENS[ten] + ONES[one])
  );

  // Standalone tens
  out = out.replace(
    /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\b/g,
    (match) => String(TENS[match])
  );

  // Teens and single digits (including "oh" when adjacent to digits/number words)
  out = out.replace(
    /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)\b/g,
    (match) => String(ONES[match])
  );

  return out;
};
