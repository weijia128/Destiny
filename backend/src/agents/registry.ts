/**
 * Agent 注册中心
 * 管理所有 Sub-Agent 的注册、发现和路由
 */

import type { SubAgent, SubAgentInput } from './types.js';
import type { DestinyType } from '../types/index.js';

/**
 * Agent 注册中心
 */
export class AgentRegistry {
  private readonly agents: Map<DestinyType, SubAgent> = new Map();

  /**
   * 注册 Sub-Agent
   */
  register(agent: SubAgent): void {
    this.agents.set(agent.destinyType, agent);
  }

  /**
   * 根据 DestinyType 获取 Agent
   */
  get(destinyType: DestinyType): SubAgent | undefined {
    return this.agents.get(destinyType);
  }

  /**
   * 获取所有已注册 Agent 类型
   */
  getRegisteredTypes(): ReadonlyArray<DestinyType> {
    return Array.from(this.agents.keys());
  }

  /**
   * 找出能处理指定输入的所有 Agent
   */
  findCapable(input: SubAgentInput): ReadonlyArray<SubAgent> {
    return Array.from(this.agents.values()).filter(agent =>
      agent.canHandle(input)
    );
  }

  /**
   * 判断某类型是否已注册
   */
  has(destinyType: DestinyType): boolean {
    return this.agents.has(destinyType);
  }

  /**
   * 获取所有注册的 Agent
   */
  getAll(): ReadonlyArray<SubAgent> {
    return Array.from(this.agents.values());
  }
}

/**
 * 全局注册中心单例
 */
export const agentRegistry = new AgentRegistry();
