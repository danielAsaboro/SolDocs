import { PublicKey } from '@solana/web3.js';
import pako from 'pako';
import { SolanaClient } from './client';
import { AnchorIdl, getIdlName } from '../types';

export async function fetchIdl(client: SolanaClient, programId: string): Promise<AnchorIdl | null> {
  const programPubkey = new PublicKey(programId);

  // Derive the IDL PDA: seeds = ["anchor:idl", programId], program = programId
  const [idlAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from('anchor:idl'), programPubkey.toBuffer()],
    programPubkey
  );

  console.log(`[IDL] Fetching IDL account at ${idlAddress.toBase58()} for program ${programId}`);

  const accountInfo = await client.withRetry(() =>
    client.connection.getAccountInfo(idlAddress)
  );

  if (!accountInfo || !accountInfo.data) {
    console.log(`[IDL] No IDL account found for ${programId}`);
    return null;
  }

  const data = accountInfo.data;
  console.log(`[IDL] Account data length: ${data.length} bytes`);

  // Try new Anchor format first: 8-byte discriminator + 32-byte authority + 4-byte data length
  let idl = tryParseIdl(data, 44, 'new');

  // Fallback to old format: 8-byte discriminator + 4-byte data length
  if (!idl) {
    idl = tryParseIdl(data, 12, 'old');
  }

  // Fallback: try 8-byte offset (just discriminator)
  if (!idl) {
    idl = tryParseIdl(data, 8, 'minimal');
  }

  if (!idl) {
    console.log(`[IDL] Failed to parse IDL for ${programId}`);
    return null;
  }

  console.log(`[IDL] Successfully parsed IDL for "${getIdlName(idl)}" with ${idl.instructions?.length || 0} instructions`);
  return idl;
}

function tryParseIdl(data: Buffer, headerOffset: number, format: string): AnchorIdl | null {
  try {
    if (data.length <= headerOffset + 4) return null;

    // Read 4-byte little-endian length at offset
    const dataLen = data.readUInt32LE(headerOffset);

    // Sanity check the length
    if (dataLen <= 0 || dataLen > data.length - headerOffset - 4 || dataLen > 10_000_000) {
      return null;
    }

    const compressedData = data.slice(headerOffset + 4, headerOffset + 4 + dataLen);

    // Try to inflate (decompress) the data
    const inflated = pako.inflate(compressedData);
    const jsonStr = new TextDecoder().decode(inflated);
    const idl = JSON.parse(jsonStr) as AnchorIdl;

    // Validate it looks like an IDL
    if (idl && idl.instructions && Array.isArray(idl.instructions)) {
      console.log(`[IDL] Parsed using ${format} format (offset=${headerOffset})`);
      return idl;
    }
    return null;
  } catch {
    return null;
  }
}
