import { bytes } from '@ckb-lumos/codec'
import { blockchain } from '@ckb-lumos/base'
import {
  SerializeOffChainParticipant,
  SerializeSEC1EncodedPubKey,
} from '@ckb-connect/perun-wallet-wrapper/dist/ckb/serialization'
import { addressToScript } from './scriptAndAddress'

export const equalNumPaddedHex = (num: bigint) => {
  const hex = num.toString(16)
  const res = hex.length % 2 === 0 ? hex : `0${hex}`
  return `0x${res}`
}

// eslint-disable-next-line @typescript-eslint/no-shadow
export const bigintFromBEBytes = (bytes: Uint8Array): bigint => {
  let result = BigInt(0)

  for (let i = 0; i < bytes.length; i++) {
    // eslint-disable-next-line no-bitwise
    result = (result << BigInt(8)) + BigInt(bytes[i])
  }

  return result
}

export const bigIntStringToHex = (s: string) => {
  return `0x${BigInt(s).toString(16)}`
}

export const getParticipantByAddressAndPubkey = (address: string, pubkey: string) => {
  const sec1bytes = bytes.bytify(pubkey)
  const lockScript = addressToScript(address)

  const serializedPubKey = SerializeSEC1EncodedPubKey(sec1bytes.buffer)
  const serializableScript = {
    code_hash: bytes.bytify(lockScript.codeHash).buffer,
    hash_type: blockchain.HashType.pack(lockScript.hashType),
    args: bytes.bytify(lockScript.args).buffer,
  }

  const buf = SerializeOffChainParticipant({
    payment_script: serializableScript,
    unlock_script: serializableScript,
    pub_key: serializedPubKey,
  })
  return new Uint8Array(buf)
}
