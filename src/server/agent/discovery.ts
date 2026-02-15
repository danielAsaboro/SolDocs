import { Store } from '../store';
import { AnchorIdl } from '../types';

import driftIdl from '../seed-idls/drift.json';
import phoenixIdl from '../seed-idls/phoenix_v1.json';
import whirlpoolIdl from '../seed-idls/whirlpool.json';
import meteoraIdl from '../seed-idls/meteora_dlmm.json';
import openbookIdl from '../seed-idls/openbook_v2.json';
import tokenMetadataIdl from '../seed-idls/token_metadata.json';
import splStakePoolIdl from '../seed-idls/spl_stake_pool.json';

const SEED_IDL_MAP: Record<string, unknown> = {
  'drift.json': driftIdl,
  'phoenix_v1.json': phoenixIdl,
  'whirlpool.json': whirlpoolIdl,
  'meteora_dlmm.json': meteoraIdl,
  'openbook_v2.json': openbookIdl,
  'token_metadata.json': tokenMetadataIdl,
  'spl_stake_pool.json': splStakePoolIdl,
};

// Well-known Solana programs with bundled IDLs
// These ship with the project so the demo works immediately
export const SEED_PROGRAMS: { programId: string; label: string; idlFile: string }[] = [
  { programId: 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', label: 'Drift Protocol v2', idlFile: 'drift.json' },
  { programId: 'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY', label: 'Phoenix DEX', idlFile: 'phoenix_v1.json' },
  { programId: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', label: 'Orca Whirlpools', idlFile: 'whirlpool.json' },
  { programId: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo', label: 'Meteora DLMM', idlFile: 'meteora_dlmm.json' },
  { programId: 'opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EQMQvR', label: 'OpenBook v2', idlFile: 'openbook_v2.json' },
  { programId: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s', label: 'Metaplex Token Metadata', idlFile: 'token_metadata.json' },
  { programId: 'SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy', label: 'SPL Stake Pool', idlFile: 'spl_stake_pool.json' },
];

export function seedQueueIfEmpty(store: Store): number {
  const queue = store.getQueue();
  const programs = store.getProgramIndex();

  // Only seed if both queue and programs index are empty
  if (queue.length > 0 || programs.length > 0) {
    return 0;
  }

  console.log('[Discovery] Seeding queue with well-known Solana programs...');
  let seeded = 0;

  for (const program of SEED_PROGRAMS) {
    const idlData = SEED_IDL_MAP[program.idlFile];
    if (!idlData) {
      console.log(`[Discovery]   Skipping ${program.label}: IDL not bundled`);
      continue;
    }

    try {
      const idl = idlData as AnchorIdl;
      if (!idl.instructions || !Array.isArray(idl.instructions)) {
        console.log(`[Discovery]   Skipping ${program.label}: Invalid IDL format`);
        continue;
      }

      // Pre-load the IDL into the cache so the agent doesn't need to fetch from chain
      store.saveIdlCache(program.programId, idl);
      store.addToQueue(program.programId);
      console.log(`[Discovery]   Added ${program.label} (${program.programId}) - ${idl.instructions.length} instructions`);
      seeded++;
    } catch (err) {
      console.log(`[Discovery]   Failed to load ${program.label}: ${(err as Error).message}`);
    }
  }

  return seeded;
}

export function checkForUpgrades(store: Store): string[] {
  const programs = store.getProgramIndex().filter(p => p.status === 'documented');
  return programs.map(p => p.programId);
}
