/** Global design-system classes (applied across screens). */

export const DS_FONT_ONEST = "font-['Onest',sans-serif]";

/** Soft press + subtle desktop hover for cards, rows, and primary actions. */
export const DS_TACTILE =
  'cursor-pointer transition-all duration-300 ease-out active:scale-[0.97] sm:hover:scale-[1.02]';

export const DS_INPUT =
  `${DS_FONT_ONEST} bg-[#F2F2F2] border-none rounded-[13px] min-h-[39px] px-[12px] py-[10px] text-[#A1A1A1] text-[16px] font-normal outline-none focus:ring-0 w-full`;

/** Search fields only — distinct from plain form inputs. */
export const DS_SEARCH_INPUT =
  `${DS_FONT_ONEST} bg-[#EBEBEB] border-none rounded-[13px] min-h-[39px] px-[12px] py-[10px] text-[#A1A1A1] text-[16px] font-normal outline-none focus:ring-0 w-full`;

export const DS_BTN_PRIMARY =
  `${DS_FONT_ONEST} ${DS_TACTILE} bg-[#E54B4B] border-none rounded-[13px] min-h-[39px] px-[12px] flex items-center justify-center text-[#FFFFFF] text-[16px] font-medium w-full`;

/** Primary CTA in a horizontal row (fills with `flex-1`). */
export const DS_BTN_PRIMARY_ROW = DS_BTN_PRIMARY.replace(/\s*w-full\b/, '').trim();

export const DS_TEXT_MAIN = `${DS_FONT_ONEST} text-[16px] font-semibold text-[#1A1A1A]`;

export const DS_TEXT_SECONDARY = `${DS_FONT_ONEST} text-[14px] font-medium text-[#565656]`;
