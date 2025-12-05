export interface AddressEncoder {
  (address: Uint8Array | string): Uint8Array;
}

export function channelIdToString(id: Uint8Array): string {
  // Convert Uint8Array to hex string
  const hexString: string = Array.from(id)
  .map(byte => ('0' + byte.toString(16)).slice(-2))
  .join('');
  return "0x" + hexString;
}

export function channelIdFromString(id: string): Uint8Array {
  if (id.startsWith('0x')) {
    id = id.slice(2);
  }
  const uint8Array = new Uint8Array(id.length / 2);
  for (let i = 0; i < id.length; i += 2) {
    const byte = id.slice(i, i + 2);
    uint8Array[i / 2] = parseInt(byte, 16);
  }

  return uint8Array;
}
