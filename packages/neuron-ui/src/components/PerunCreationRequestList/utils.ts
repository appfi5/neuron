
import { type CKBComponents } from '@ckb-lumos/lumos/rpc'
import { bigIntStringToHex } from 'utils'

export const camelToSnakeReplacer = (s: string) => {
  return s.replace(/([A-Z])/g, '_$1').toLowerCase()
}

export const camelToSnakeCloner = (obj: any, valueModifier: (key: any, value: any) => [any, any]) => {
  return Object.keys(obj).reduce((acc: any, key) => {
    const newKey = camelToSnakeReplacer(key)
    const val = obj[key as keyof CKBComponents.Transaction]
    if (Array.isArray(val)) {
      acc[newKey] = val.map((v: any) => {
        if (typeof v === 'object' && v !== null) {
          return camelToSnakeCloner(v, valueModifier)
        }
        // eslint-disable-next-line @typescript-eslint/no-shadow
        const [_, modVal] = valueModifier('', v)
        return modVal
      })
    } else if (typeof val === 'object' && val !== null) {
      acc[newKey] = camelToSnakeCloner(val, valueModifier)
    } else {
      const [modKey, modVal] = valueModifier(newKey, val)
      acc[modKey] = modVal
    }
    return acc
  }, {})
}


export const getCompatibleTx = (sdkTx: any) => {
  return camelToSnakeCloner(sdkTx, (key: any, value: any) => {
    let newValue = value
    switch (key) {
      case 'dep_type':
        newValue = camelToSnakeReplacer(value)
        break
      case 'since':
        newValue = `0x${value}`
        break
      case 'input_index':
        newValue = `0x${value}`
        break
      case 'index':
        newValue = `0x${value}`
        break
      case 'capacity':
        newValue = bigIntStringToHex(value)
        break
      case 'version':
        newValue = `0x${value}`
        break
      default:
    }
    return [key, newValue]
  })
}
