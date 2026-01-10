/**
 * API 兼容性服务
 * 确保旧版 API 请求格式能正常工作
 */

import type { DestinyType, SubCategory, BirthInfo, ChatMessage, ChatRequest, AnalysisRequest } from '../types/index.js';

/**
 * 兼容性服务类
 */
export class CompatibilityService {
  /**
   * 检测并转换请求格式
   * 支持旧版（ChatRequest）和新版（AnalysisRequest）
   *
   * @param reqBody - 请求体
   * @returns 标准化的 AnalysisRequest
   */
  static normalizeRequest(reqBody: any): AnalysisRequest {
    // 检测是否为旧版请求（有 category 但没有 destinyType）
    if (reqBody.category && !reqBody.destinyType) {
      console.log('⚠️  Detected legacy request format, converting to new format...');

      return {
        destinyType: 'ziwei',  // 旧版默认为紫微斗数
        subCategory: reqBody.category,
        birthInfo: reqBody.birthInfo || {
          year: 0,
          month: 0,
          day: 0,
          hour: 0,
          gender: 'male',
          isLunar: false
        },
        chartData: reqBody.chart || '',
        userMessage: reqBody.prompt || '',
        history: reqBody.history || [],
      };
    }

    // 新版请求直接返回
    return reqBody as AnalysisRequest;
  }

  /**
   * 检测请求是否为旧版格式
   */
  static isLegacyRequest(reqBody: any): boolean {
    return !!(reqBody.category && !reqBody.destinyType);
  }

  /**
   * 获取默认的 birthInfo
   */
  static getDefaultBirthInfo(): BirthInfo {
    return {
      year: 0,
      month: 0,
      day: 0,
      hour: 0,
      gender: 'male',
      isLunar: false,
    };
  }

  /**
   * 验证请求参数
   */
  static validateRequest(req: AnalysisRequest): { valid: boolean; error?: string } {
    if (!req.destinyType) {
      return { valid: false, error: 'Missing required field: destinyType' };
    }

    if (!req.subCategory) {
      return { valid: false, error: 'Missing required field: subCategory' };
    }

    if (!req.chartData) {
      return { valid: false, error: 'Missing required field: chartData' };
    }

    if (!req.userMessage) {
      return { valid: false, error: 'Missing required field: userMessage' };
    }

    return { valid: true };
  }

  /**
   * 记录请求信息（用于调试）
   */
  static logRequest(req: AnalysisRequest): void {
    console.log(`📥 Request Info:`);
    console.log(`   Destiny Type: ${req.destinyType}`);
    console.log(`   Sub Category: ${req.subCategory}`);
    console.log(`   Chart Data Length: ${req.chartData?.length || 0} chars`);
    console.log(`   User Message Length: ${req.userMessage?.length || 0} chars`);
    console.log(`   History: ${req.history?.length || 0} messages`);
  }
}
