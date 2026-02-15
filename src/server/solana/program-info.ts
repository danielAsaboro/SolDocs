import { PublicKey } from '@solana/web3.js';
import { SolanaClient } from './client';

export interface ProgramInfo {
  programId: string;
  executable: boolean;
  owner: string;
  dataLength: number;
}

export async function fetchProgramInfo(client: SolanaClient, programId: string): Promise<ProgramInfo | null> {
  try {
    const pubkey = new PublicKey(programId);
    const accountInfo = await client.withRetry(() =>
      client.connection.getAccountInfo(pubkey)
    );

    if (!accountInfo) {
      console.log(`[ProgramInfo] Account not found: ${programId}`);
      return null;
    }

    return {
      programId,
      executable: accountInfo.executable,
      owner: accountInfo.owner.toBase58(),
      dataLength: accountInfo.data.length,
    };
  } catch (error) {
    console.log(`[ProgramInfo] Error fetching ${programId}: ${(error as Error).message}`);
    return null;
  }
}

export function isValidProgramId(programId: string): boolean {
  try {
    new PublicKey(programId);
    return true;
  } catch {
    return false;
  }
}
