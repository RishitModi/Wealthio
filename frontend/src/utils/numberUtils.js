/**
 * Format a number with commas for display
 * E.g., 1000000 -> "10,00,000" (Indian numbering system)
 *
 * Indian system: X,XX,XXX,XX,XXX
 * - First 3 digits from right: ones
 * - Next 2 digits: thousands
 * - Next 2 digits: lakhs
 * - Remaining: crores
 */
export const formatNumberWithCommas = (value) => {
  if (!value) return "";

  // Remove any existing commas and non-digit characters except decimal point
  const cleaned = String(value).replace(/,/g, "").trim();

  if (!cleaned || cleaned === "0") return "0";

  // Split into integer and decimal parts
  const [intPart, decPart] = cleaned.split(".");

  // Format integer part with commas (Indian style)
  if (intPart.length <= 3) {
    // No need for commas if 3 digits or less
    return decPart ? intPart + "." + decPart : intPart;
  }

  // Build from right to left with Indian formatting
  let formatted = "";
  let count = 0;

  for (let i = intPart.length - 1; i >= 0; i--) {
    // Add comma positions:
    // - After position 2 (after 3rd digit from right)
    // - Then every 2 positions after that
    if (count > 0 && (count === 3 || (count > 3 && (count - 3) % 2 === 0))) {
      formatted = "," + formatted;
    }
    formatted = intPart[i] + formatted;
    count++;
  }

  // Add decimal part if it exists
  return decPart ? formatted + "." + decPart : formatted;
};

/**
 * Extract numeric value from formatted string with commas
 * E.g., "10,00,000" -> 1000000
 */
export const getNumericValue = (formattedValue) => {
  if (!formattedValue) return "";
  return formattedValue.replace(/,/g, "");
};

/**
 * Format number with Lakh/Crore labels for clarity
 * E.g., 1500000 -> "15 Lakhs" or 150000000 -> "15 Crores"
 */
export const formatWithIndianLabels = (value) => {
  if (!value) return "";

  const num = Number(String(value).replace(/,/g, ""));

  if (isNaN(num) || num === 0) return "0";
  if (num < 0) return "-" + formatWithIndianLabels(-num);

  const formatLabel = (divisor, label) => {
    const divided = num / divisor;
    let result = divided % 1 === 0 ? Math.floor(divided) : divided.toFixed(2);
    // Remove trailing zeros after decimal point
    result = String(result).replace(/\.?0+$/, "");
    return result + " " + label + (Number(result) !== 1 ? "s" : "");
  };

  // Crores (10,000,000+)
  if (num >= 10000000) {
    return formatLabel(10000000, "Crore");
  }

  // Lakhs (100,000+)
  if (num >= 100000) {
    return formatLabel(100000, "Lakh");
  }

  // Thousands (1,000+)
  if (num >= 1000) {
    return formatLabel(1000, "Thousand");
  }

  // Less than 1000
  return num % 1 === 0 ? String(Math.floor(num)) : num.toFixed(2);
};

/**
 * Convert a number to words (Indian English)
 * E.g., 1000000 -> "Ten Lakh"
 * Follows Indian numbering system: Lakh (100,000), Crore (10,000,000)
 */
export const numberToWords = (num) => {
  if (!num || isNaN(num)) return "";

  num = Number(num);

  if (num === 0) return "Zero";
  if (num < 0) return "Minus " + numberToWords(-num);

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convertBelow100 = (n) => {
    if (n === 0) return "";
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    const tensDigit = Math.floor(n / 10);
    const onesDigit = n % 10;
    return tens[tensDigit] + (onesDigit > 0 ? " " + ones[onesDigit] : "");
  };

  const convertBelow1000 = (n) => {
    if (n === 0) return "";
    if (n < 100) return convertBelow100(n);
    const hundreds = Math.floor(n / 100);
    return ones[hundreds] + " Hundred" + (n % 100 > 0 ? " " + convertBelow100(n % 100) : "");
  };

  // Indian numbering system groups:
  // 0-999: ones
  // 1000-99,999: thousands (2 digits)
  // 1,00,000-99,99,999: lakhs (2 digits)
  // 1,00,00,000+: crores (unlimited)

  let result = "";

  // Crores (10,000,000+)
  if (num >= 10000000) {
    const crores = Math.floor(num / 10000000);
    result += convertBelow1000(crores) + " Crore";
    num = num % 10000000;
    if (num > 0) result += " ";
  }

  // Lakhs (100,000+)
  if (num >= 100000) {
    const lakhs = Math.floor(num / 100000);
    result += convertBelow100(lakhs) + " Lakh";
    num = num % 100000;
    if (num > 0) result += " ";
  }

  // Thousands (1,000+)
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    result += convertBelow100(thousands) + " Thousand";
    num = num % 1000;
    if (num > 0) result += " ";
  }

  // Ones (1-999)
  if (num > 0) {
    result += convertBelow1000(num);
  }

  return result.trim();
};

