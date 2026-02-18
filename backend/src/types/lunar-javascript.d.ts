/**
 * lunar-javascript 类型声明
 * https://github.com/6tail/lunar-javascript
 */
declare module 'lunar-javascript' {
  export class Solar {
    static fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): Solar;
    static fromYmd(year: number, month: number, day: number): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getHour(): number;
    getLunar(): Lunar;
    toString(): string;
  }

  export class Lunar {
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getEightChar(): EightChar;
    toString(): string;
  }

  export class EightChar {
    getYearGan(): string;
    getYearZhi(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getTimeGan(): string;
    getTimeZhi(): string;
    getYun(gender: number): Yun;
  }

  export class Yun {
    getStartSolar(): Solar | null;
    getLiuNian(): LiuNian[];
    getDaYun(): DaYun[];
  }

  export class DaYun {
    getGanZhi(): string;
    getStartAge(): number;
    getEndAge(): number;
    getStartSolar(): Solar | null;
  }

  export class LiuNian {
    getYear(): number;
    getGan(): string;
    getZhi(): string;
  }

  export class LunarYear {
    static fromYear(year: number): LunarYear;
    getYear(): number;
  }

  export class HolidayUtil {
    static getHoliday(year: number, month: number, day: number): unknown;
  }

  export const LunarUtil: {
    readonly JIA_ZI: string[];
    readonly HE_ZHI_6: string[];
    readonly CHONG: string[];
  };
}
