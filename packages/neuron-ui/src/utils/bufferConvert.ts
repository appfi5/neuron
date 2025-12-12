



export const hexToUint8Array = (hex: string): Uint8Array => {
  // remove 0x
  hex = hex.startsWith('0x') ? hex.slice(2) : hex
  return new Uint8Array(hex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16))?? [])
}