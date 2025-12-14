import { bytesFrom, BytesLike, ccc, ClientPublicMainnet, ClientPublicTestnet, hexFrom, mol, Script } from "@ckb-ccc/core";


const participantMol = mol.table({
  publicKey: mol.Codec.from({
    byteLength: 33,
    encode: (value) => bytesFrom(value),
    decode: (buffer) => hexFrom(buffer),
  }),
  paymentScript: Script,
  unlockScript: Script,
})


const participant = {
  encode: async (publicKey: string, ckbAddr: string) => {
    const addressPrefix = ckbAddr.slice(0, 3);
    const isMainnet = addressPrefix === "ckb";
    const isTestnet = addressPrefix === "ckt";
    if (!isMainnet && !isTestnet) {
      throw new Error(`Invalid address ${ckbAddr}`);
    }
    const Client = isTestnet ? ClientPublicTestnet : ClientPublicMainnet;
    const ckbAddress = await ccc.Address.fromString(ckbAddr, new Client());
    const lockScript = ckbAddress.script;
    return participantMol.encode({
      publicKey,
      paymentScript: lockScript,
      unlockScript: lockScript,
    })
  },
  decode: async (encoded: BytesLike, network: "testnet" | "mainnet") => {
    const value = participantMol.decode(encoded);
    const script = Script.from(value.paymentScript);
    const Client = network === "testnet" ? ClientPublicTestnet : ClientPublicMainnet;
    const address = ccc.Address.fromScript(script, new Client()).toString();
    return {
      publicKey: value.publicKey,
      address: address,
    }
  }
}

export default participant;