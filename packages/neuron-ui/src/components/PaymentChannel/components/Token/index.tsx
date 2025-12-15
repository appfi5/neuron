import Big from "big.js";


type TokenProps = {
  type: null | PerunAPI.Script
  amount: string | bigint
}

const ckbConfig = { type: null, decimal: 8, symbol: "CKB" }
const unkownTokenConfig = { type: null, decimal: 0, symbol: "Unknown" }

export default function Token(props: TokenProps) {
  const { type, amount } = props;
  const tokenConfig = type === null ? ckbConfig : unkownTokenConfig
  const val = (new Big(BigInt(amount).toString()).div(10 ** tokenConfig.decimal)).toString();
  return <span className="token">{val} {tokenConfig.symbol}</span>
}