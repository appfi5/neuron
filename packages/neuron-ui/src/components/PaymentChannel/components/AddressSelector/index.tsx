
import { useTranslation } from "react-i18next"
import styles from "./AddressSelector.module.scss"
import TextField from 'widgets/TextField'
import { useCallback, useEffect, useState } from "react"
import Arrow from 'widgets/Icons/Arrow.svg?react'
import { useState as useGlobalState } from 'states'
import Button from 'widgets/Button'
import Balance from 'widgets/Balance'
import { isSuccessResponse, shannonToCKBFormatter } from "utils"
import { getCurrentWalletAccountExtendedPubKey } from "services/remote"

type AddressSelectorProps = {
  value: string
  onChange: (address: string, publicKey: string) => void
}

export default function AddressSelector(props: AddressSelectorProps) {
  const { value: defaultAddress, onChange } = props
  const [t] = useTranslation()
  const {
    wallet,
  } = useGlobalState()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [address, setAddress] = useState(defaultAddress)
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => {
      const {
        dataset: { field },
        value,
      } = e.target
      switch (field) {
        // case 'message': {
        //   setMessage(value)
        //   break
        // }
        // case 'signature': {
        //   setSignature(value)
        //   break
        // }
        case 'address': {
          setAddress(value)
          break
        }
        default: {
          // ignore
        }
      }
    },
    [setAddress] // setMessage, setSignature, 
  )

  useEffect(() => {
    if (address) {
      const addrObj = wallet.addresses.find(item => item.address === address)
      if (addrObj) {
        getCurrentWalletAccountExtendedPubKey({ type: addrObj.type, index: addrObj.index }).then(res => {
          if (isSuccessResponse(res)) {
            onChange(address, res.result)
          }
        })
      }
    }

  }, [address, wallet.addresses])

  return (
    <div className={styles.selectAddress}>
      <div className={styles.dropdown}>
        <div className={styles.content}>
          <TextField
            label={t('perun.channel-participant-address')}
            placeholder={t('perun.choose-address')}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            data-field="address"
            value={address}
            onChange={handleInputChange}
            rows={address ? 2 : 1}
            suffix={
              <div className={styles.arrow} data-active={isDropdownOpen}>
                <Arrow />
              </div>
            }
            width="100%"
          // error={addressError}
          />
        </div>
        {isDropdownOpen && wallet?.addresses ? (
          <div className={styles.selects}>
            {wallet.addresses.map(addr => (
              <Button
                type="text"
                key={addr.address}
                className={styles.selectItem}
                onClick={() => {
                  setIsDropdownOpen(false)
                  setAddress(addr.address)
                }}
              >
                <div className={styles.wrap}>
                  <div className={styles.title}>
                    {`${addr.address.slice(0, 16)}...${addr.address.slice(-16)} `}
                    (<Balance balance={shannonToCKBFormatter(addr.balance)} />)
                  </div>
                  <div className={styles.type} data-type={addr.type}>
                    {addr.type === 1 ? t('addresses.change-address') : t('addresses.receiving-address')}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}