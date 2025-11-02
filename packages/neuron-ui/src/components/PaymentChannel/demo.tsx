import { useTranslation } from "react-i18next"
import { PerunRequest as PerunRequestSubject } from 'services/subjects'
import { useState as useGlobalState } from 'states'
import { channelIdToString, channelIdFromString } from '@ckb-connect/perun-wallet-wrapper/dist/translator'
import * as wire from '@ckb-connect/perun-wallet-wrapper/dist/wire'
import { getParticipantByAddressAndPubkey, isSuccessResponse } from "utils"
import { perunServiceAction } from "services/remote"
import { useEffect } from "react"

const accountFrom = {
  address: "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqvujnwcyyexhcsddzu74yks6ytchq26y0svu4675",
  pubKey: "0x02372431f7ce5e18e100e56d6d8e74145ec00ad59878887a353aca8ca52e64119c",
  payload: {
    type: null,
    amout: 100,
  }
}

const accountTo = {
  address: "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqd4a33y7unx66rqh03vwngh3e4t0x6yrhcd9sfns",
  pubKey: "0x02a5b7bb6196db5edcd38c55de70ae61d4bc52cd8b1195cfa6278ca43c11a35ab3",
  payload: {
    type: null,
    amout: 100,
  }
}


export default function PaymentChannelDemo() {
  const { wallet } = useGlobalState()
  const [t, _] = useTranslation()

  useEffect(() => {
    const { unsubscribe } = PerunRequestSubject.subscribe(requests => {
      console.log("[Perun] on request subscribe", { requests })
    })
    return unsubscribe;
  }, [])

  useEffect(() => { 
    getChannels()
      .then(channels => {
        console.log("[Perun] channles", channels)
      })
  }, [])



  return (
    <>
      ????
      <div style={{ marginBlock: 8, height: 2, width: "100%", backgroundColor: "#333" }}></div>
    </>
  );
}



async function getChannels() {
  const requester = getParticipantByAddressAndPubkey(accountFrom.address, accountFrom.pubKey);
  const actionRes = await perunServiceAction({
    type: 'get',
    payload: {
      requester,
    },
  })
  if (!isSuccessResponse(actionRes) || !actionRes?.result) {
    console.log("get channles failed:", actionRes)
    return
  }
  console.log("get channles success:", actionRes.result)

  return actionRes.result.channels
}
// todo restore channel
// todo update channel
// todo close channel
// todo sign tx