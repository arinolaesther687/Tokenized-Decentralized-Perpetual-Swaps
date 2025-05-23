import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity VM environment
const mockClarity = {
  tx: {
    sender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    sponsoredBy: null,
  },
  contracts: {
    'asset-verification': {
      functions: {
        'add-asset': vi.fn(),
        'update-asset': vi.fn(),
        'deactivate-asset': vi.fn(),
        'activate-asset': vi.fn(),
        'is-asset-active': vi.fn(),
        'get-asset-details': vi.fn(),
        'transfer-admin': vi.fn(),
      },
      variables: {
        admin: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      },
      maps: {
        'verified-assets': new Map(),
      },
      constants: {
        'ERR-NOT-AUTHORIZED': 100,
        'ERR-ASSET-EXISTS': 101,
        'ERR-ASSET-NOT-FOUND': 102,
      },
    },
  },
};

// Helper to simulate contract calls
function callContract(contractName, functionName, args) {
  const contract = mockClarity.contracts[contractName];
  const fn = contract.functions[functionName];
  return fn(mockClarity, ...args);
}

describe('Asset Verification Contract', () => {
  beforeEach(() => {
    // Reset mocks and state
    vi.resetAllMocks();
    mockClarity.contracts['asset-verification'].maps['verified-assets'].clear();
    
    // Setup mock implementations
    mockClarity.contracts['asset-verification'].functions['add-asset'].mockImplementation(
        (vm, assetSymbol, priceFeed, decimals) => {
          const map = vm.contracts['asset-verification'].maps['verified-assets'];
          if (map.has(assetSymbol)) {
            return { type: 'err', value: vm.contracts['asset-verification'].constants['ERR-ASSET-EXISTS'] };
          }
          map.set(assetSymbol, {
            'price-feed': priceFeed,
            decimals,
            active: true,
          });
          return { type: 'ok', value: true };
        }
    );
    
    mockClarity.contracts['asset-verification'].functions['is-asset-active'].mockImplementation(
        (vm, assetSymbol) => {
          const map = vm.contracts['asset-verification'].maps['verified-assets'];
          const asset = map.get(assetSymbol);
          return asset ? asset.active : false;
        }
    );
    
    mockClarity.contracts['asset-verification'].functions['get-asset-details'].mockImplementation(
        (vm, assetSymbol) => {
          const map = vm.contracts['asset-verification'].maps['verified-assets'];
          return map.get(assetSymbol) || null;
        }
    );
  });
  
  it('should add a new asset', () => {
    const result = callContract(
        'asset-verification',
        'add-asset',
        ['BTC', 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc-price-feed', 8]
    );
    
    expect(result).toEqual({ type: 'ok', value: true });
    expect(mockClarity.contracts['asset-verification'].maps['verified-assets'].has('BTC')).toBe(true);
    
    const asset = mockClarity.contracts['asset-verification'].maps['verified-assets'].get('BTC');
    expect(asset).toEqual({
      'price-feed': 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc-price-feed',
      decimals: 8,
      active: true,
    });
  });
  
  it('should not add an asset that already exists', () => {
    // First add succeeds
    callContract(
        'asset-verification',
        'add-asset',
        ['BTC', 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc-price-feed', 8]
    );
    
    // Second add fails
    const result = callContract(
        'asset-verification',
        'add-asset',
        ['BTC', 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc-price-feed-2', 8]
    );
    
    expect(result).toEqual({
      type: 'err',
      value: mockClarity.contracts['asset-verification'].constants['ERR-ASSET-EXISTS']
    });
  });
  
  it('should check if an asset is active', () => {
    // Add an asset
    callContract(
        'asset-verification',
        'add-asset',
        ['BTC', 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc-price-feed', 8]
    );
    
    // Check if active
    const result = callContract('asset-verification', 'is-asset-active', ['BTC']);
    expect(result).toBe(true);
    
    // Check non-existent asset
    const nonExistentResult = callContract('asset-verification', 'is-asset-active', ['ETH']);
    expect(nonExistentResult).toBe(false);
  });
  
  it('should get asset details', () => {
    // Add an asset
    callContract(
        'asset-verification',
        'add-asset',
        ['BTC', 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc-price-feed', 8]
    );
    
    // Get details
    const result = callContract('asset-verification', 'get-asset-details', ['BTC']);
    expect(result).toEqual({
      'price-feed': 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc-price-feed',
      decimals: 8,
      active: true,
    });
    
    // Get details for non-existent asset
    const nonExistentResult = callContract('asset-verification', 'get-asset-details', ['ETH']);
    expect(nonExistentResult).toBeNull();
  });
});
