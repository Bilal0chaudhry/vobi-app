const wordToNumber = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
};

export const normalizeNumbers = (text) => {
  if (!text) return '';
  return text.toLowerCase().replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine)\b/g, (match) => {
    return wordToNumber[match];
  });
};
