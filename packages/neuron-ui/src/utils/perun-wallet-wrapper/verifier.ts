import { PerunError } from "./error";
import { OpenChannelRequest } from "./perun-wallet";
import { Allocation, Balances } from "./wire";

const TEMP_CHANNEL_ID_LENGTH = 32; // 32-byte array

export interface ValidOpenChannelRequest {
  // The participant opening the channel.
  participant: Uint8Array;
  // Peers requested to participate in the channel.
  peers: Uint8Array[];
  // Id of this channel proposal, can be used to match the request.
  proposalId: Uint8Array;
  // Duration of the challenge phase in seconds.
  challengeDuration: number;
  // Nonce share of the participant.
  nonceShare: Uint8Array;
  // The initial balance distribution of the channel.
  initBals: ValidAllocation;
  // Possibly differing balance distribution from the initBals one. E.g. the
  // request might contain the following initBals:
  //
  //  initBals = [CKBytes: [100, 100], SUDT: [50, 50]]
  //
  // initBals[0] identifies CKBytes, initBals[1] identifies SUDT.
  // initBals[0][0] is the balance of CKBytes for the participant identified by
  // the first index.
  // initBals[0][1] is the balance of CKBytes for the participant identified by
  // the second index.
  //
  // The fundingAgreement can specify that the first participant is paying to
  // cover the balances of the second participant. E.g.:
  //
  //  fundingAgreement = [CKBytes: [200, 0], SUDT: [100, 0]]
  //
  // So the first participant is paying 200 CKBytes and 100 SUDT to also cover
  // the balances of the second participant.
  fundingAgreement: Balances;
  // The temporary channel ID used to identify the peer in the first SignMsg request
  tempChannelId: Uint8Array;
}

export interface ValidAllocation {
  assets: Uint8Array[];
  balances: Balances;
}

function verifyAllocation(allocation: Allocation): ValidAllocation {
  const numOfAssets = allocation.assets.length;

  if (allocation.locked.length != 0) {
    throw new PerunError("open", "Locked assets are not supported");
  }

  const bals = allocation.balances;
  if (!bals) {
    throw new PerunError("open", "Missing balances");
  }

  if (bals.balances.length != numOfAssets) {
    throw new PerunError(
      "open",
      `Mismatching number of assets and balances: Got ${numOfAssets} assets but only ${bals.balances.length} assets defined in balance field`,
    );
  }

  bals.balances.forEach((bal, i) => {
    if (bal.balance.length != 2) {
      throw new PerunError(
        "open",
        `Only two party channels are supported, but more than two balances are defined for asset ${i} in InitBalances`,
      );
    }
  });

  return {
    assets: allocation.assets,
    balances: bals,
  };
}

export function bigintFromLEBytes(bytes: Uint8Array): bigint {
  let result = BigInt(0);
  let shift = BigInt(0);

  for (let i = 0; i < bytes.length; i++) {
    result += BigInt(bytes[i]) << shift;
    // Shift by 8 bits.
    shift += BigInt(8);
  }

  return result;
}

function verifyAgreement(
  initBals: ValidAllocation,
  agreement?: Balances,
): Balances {
  if (!agreement) {
    // If no agreement is specified, the initBals are used as agreement.
    return initBals.balances;
  }

  const numOfAssets = initBals.assets.length;
  const initBalsBalances = initBals.balances;

  if (agreement.balances.length != numOfAssets) {
    throw new PerunError(
      "open",
      `Mismatching number of assets and balances: Got ${numOfAssets} assets but only ${agreement.balances.length} assets defined in agreement balance field`,
    );
  }

  agreement.balances.forEach((bal, i) => {
    if (bal.balance.length != 2) {
      throw new PerunError(
        "open",
        `Only two party channels are supported, but more than two balances are defined for asset ${i} in FundingAgreement`,
      );
    }

    const reducer = (prev: bigint, next: Uint8Array) => {
      return prev + bigintFromLEBytes(next);
    };

    const sumInitBals = initBalsBalances.balances[i].balance.reduce(
      reducer,
      BigInt(0),
    );

    const sumAgreement = bal.balance.reduce(reducer, BigInt(0));

    if (sumInitBals !== sumAgreement) {
      throw new PerunError(
        "open",
        `Mismatching balances for asset ${i}: Sum of initBals is ${sumInitBals}, but sum of agreement is ${sumAgreement}`,
      );
    }
  });

  return agreement;
}

function verifyTempChannelID(
  data: Uint8Array
): Uint8Array {
  if (data.length !== TEMP_CHANNEL_ID_LENGTH) {
     throw new PerunError("open", `Invalid tempChannelId length: expected ${TEMP_CHANNEL_ID_LENGTH}, got ${data.length}`);
  }
  return data;
}

export function verifyOpenChannelRequest(
  req: OpenChannelRequest,
): ValidOpenChannelRequest {
  const prop = req.proposal;

  if (!prop) {
    throw new PerunError("open", "Missing proposal");
  }

  if (prop.peers.length != 2) {
    throw new PerunError("open", "Only two party channels are supported");
  }

  const baseProp = prop.baseChannelProposal;
  if (!baseProp) {
    throw new PerunError("open", "Missing baseChannelProposal");
  }

  if (!baseProp.initBals) {
    throw new PerunError("open", "Missing initBals");
  }

  if (!baseProp.initBals.balances) {
    throw new PerunError("open", "Missing balance distribution in initBals");
  }

  if (baseProp.initBals.balances.balances[0].balance.length != 2) {
    throw new PerunError("open", "Only two party channels are supported");
  }

  if (!baseProp.initData) {
    throw new PerunError("open", "Missing TempChannelID in baseChannelProposal");
  }
  
  const validInitBals = verifyAllocation(baseProp.initBals);

  return {
    participant: prop.participant,
    peers: prop.peers,
    proposalId: baseProp.proposalId,
    challengeDuration: baseProp.challengeDuration,
    nonceShare: baseProp.nonceShare,
    initBals: validInitBals,
    fundingAgreement: verifyAgreement(validInitBals, baseProp.fundingAgreement),
    tempChannelId: verifyTempChannelID(baseProp.initData),
  };
}

export interface ValidSignMessageRequest<T> {
  pubkey: Uint8Array;
  data: Uint8Array;
  tempChannelID: Uint8Array;
  decoded: T;
}
