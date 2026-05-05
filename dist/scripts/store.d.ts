/**
 * Injected script for discovering Pinia or Vuex stores and their actions/state representations
 */
export declare function discoverStores(): {
    type: string;
    id: string;
    actions: string[];
    stateKeys: string[];
}[];
