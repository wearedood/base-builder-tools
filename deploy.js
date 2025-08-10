#!/usr/bin/env node

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

/**
 * Base Builder Analytics Tool
 * Tracks and analyzes builder activity on Base network
 */

class BaseBuilderAnalytics {
  constructor(rpcUrl = 'https://mainnet.base.org') {
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.builderData = new Map();
  }

  async trackBuilder(address, passkey) {
    console.log(`Tracking builder: ${address}`);
    
    const builderInfo = {
      address,
      passkey,
      transactions: await this.getTransactionCount(address),
      balance: await this.getBalance(address),
      contracts: await this.getDeployedContracts(address),
      lastActivity: await this.getLastActivity(address),
      score: 0
    };

    builderInfo.score = this.calculateBuilderScore(builderInfo);
    this.builderData.set(address, builderInfo);
    
    return builderInfo;
  }

  async getTransactionCount(address) {
    try {
      return await this.provider.getTransactionCount(address);
    } catch (error) {
      console.error(`Error getting transaction count for ${address}:`, error);
      return 0;
    }
  }

  async getBalance(address) {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error(`Error getting balance for ${address}:`, error);
      return '0';
    }
  }

  async getDeployedContracts(address) {
    // This would require indexing service or event logs
    // For now, return mock data
    return [];
  }

  async getLastActivity(address) {
    try {
      const latestBlock = await this.provider.getBlockNumber();
      // Check recent blocks for activity
      for (let i = 0; i < 100; i++) {
        const block = await this.provider.getBlock(latestBlock - i);
        if (block.transactions.length > 0) {
          // Check if any transaction involves this address
          for (const txHash of block.transactions) {
            const tx = await this.provider.getTransaction(txHash);
            if (tx.from === address || tx.to === address) {
              return block.timestamp;
            }
          }
        }
      }
      return null;
    } catch (error) {
      console.error(`Error getting last activity for ${address}:`, error);
      return null;
    }
  }

  calculateBuilderScore(builderInfo) {
    let score = 0;
    
    // Transaction activity (1 point per transaction)
    score += builderInfo.transactions;
    
    // Balance score (1 point per 0.1 ETH)
    score += Math.floor(parseFloat(builderInfo.balance) * 10);
    
    // Contract deployment bonus (50 points per contract)
    score += builderInfo.contracts.length * 50;
    
    // Recent activity bonus
    if (builderInfo.lastActivity) {
      const daysSinceActivity = (Date.now() / 1000 - builderInfo.lastActivity) / 86400;
      if (daysSinceActivity < 1) score += 100;
      else if (daysSinceActivity < 7) score += 50;
      else if (daysSinceActivity < 30) score += 25;
    }
    
    return score;
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalBuilders: this.builderData.size,
      builders: Array.from(this.builderData.values()),
      topBuilders: this.getTopBuilders(10),
      averageScore: this.getAverageScore(),
      networkStats: await this.getNetworkStats()
    };

    return report;
  }

  getTopBuilders(limit = 10) {
    return Array.from(this.builderData.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  getAverageScore() {
    if (this.builderData.size === 0) return 0;
    const totalScore = Array.from(this.builderData.values())
      .reduce((sum, builder) => sum + builder.score, 0);
    return totalScore / this.builderData.size;
  }

  async getNetworkStats() {
    try {
      const latestBlock = await this.provider.getBlockNumber();
      const block = await this.provider.getBlock(latestBlock);
      
      return {
        latestBlock,
        blockTime: block.timestamp,
        gasPrice: await this.provider.getGasPrice(),
        networkId: (await this.provider.getNetwork()).chainId
      };
    } catch (error) {
      console.error('Error getting network stats:', error);
      return {};
    }
  }

  saveReport(report, filename = 'builder-report.json') {
    const reportPath = path.join(process.cwd(), filename);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Report saved to ${reportPath}`);
  }
}

// CLI Usage
if (require.main === module) {
  const analytics = new BaseBuilderAnalytics();
  
  // Example: Track the provided builder
  const builderAddress = '0x4EfE0d3958BEC89Fbef4cab0b07F63Ab49BC0e91';
  const builderPasskey = '0xcde6b9bcf9dfcbfe65f3fd9b26614efc2705f4eb147e95c6b49d030f2837f6e0';
  
  analytics.trackBuilder(builderAddress, builderPasskey)
    .then(async (builderInfo) => {
      console.log('Builder Info:', builderInfo);
      
      const report = await analytics.generateReport();
      analytics.saveReport(report);
      
      console.log('Analysis complete!');
    })
    .catch(console.error);
}

module.exports = BaseBuilderAnalytics;analytics.js
