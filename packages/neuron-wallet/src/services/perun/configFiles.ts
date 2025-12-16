import path from "path";
import SettingsService from "../settings";
// import { NetworkType } from "../../models/network";


const pathToFile = (...pathes: string[]) => path.join(SettingsService.getInstance().getPeurnDataFolderPath(), ...pathes);

export type ConfigFileOptions = NonNullable<Perun.RunnerStatus['context']>
export default function generateConfigFiles(opt: ConfigFileOptions) {
  const config = genConfig(opt);
  const contractCellDeps = genContractCellDeps();
  const systemScripts = genSystemScripts();
  return { config, contractCellDeps, systemScripts }
}

const genConfig = (opt: ConfigFileOptions) => {
  const network = opt.network; // testnet | mainnet
  return {
    "host": ":4322",
    "ws_url": "localhost:50051",
    "network": network, // testnet | devnet
    "testnet_rpc_node_url": "https://testnet.ckbapp.dev/",
    "devnet_rpc_node_url": "http://localhost:8114",
    "public_key": opt.publicKey.startsWith("0x") ? opt.publicKey.slice(2) : opt.publicKey,
    // todo
    "sudt_owner_lock_arg": "0x4472b33b4e1845ebe82f2ce5f511bbe012f144c5f3d7b539909adffc83ccda61",
    "database": pathToFile(network, "db"),
    "logfile": pathToFile(network, ".logfile")
  }
}


const genContractCellDeps = () => {
  return {
    "cell_recipes": [{
      "name": "pcts",
      "tx_hash": "0x53a626d4da20647af1a616e97c00aa942dc70c130dddc5cccd17f231b75f201d",
      "index": 0,
      "occupied_capacity": 16981300000000,
      "data_hash": "0xbee5391c58d4c1eeb37838ca39837406aa2fd2c7f65a1222210dd609f876faa7",
      "type_id": null
    }, {
      "name": "pcls",
      "tx_hash": "0xd196a37a04320b185fba078691ccca65e7ac8d6dba3936218258274af37afb48",
      "index": 0,
      "occupied_capacity": 4670100000000,
      "data_hash": "0x4d86e1541c0b95fb41b7ad2c1b78a543c72187e0a0bbd60e8e8afb1fb3c46744",
      "type_id": null
    }, {
      "name": "pfls",
      "tx_hash": "0x5a8a6246cda19bc542ee1265de6d5a31a86e9139fb7564af5ae4fbf35c1d93f1",
      "index": 0,
      "occupied_capacity": 3441300000000,
      "data_hash": "0x8c2d2f2f9468cf847823286ac11da09bfaef3e72a8acbac4e457ca4beadedfe4",
      "type_id": null
    }, {
      // todo
      "name": "sudt",
      "tx_hash": "0x8067400013eda32e47ee5bfd98758493e80cc6e0dd369d618bc8870a3b1d1eca",
      "index": 0,
      "occupied_capacity": 2622100000000,
      "data_hash": "0x2a8bdd8f9f9877e3243a5ecc4a6b23799db03ec9bdd46b69153842c5ad75d632",
      "type_id": null
    }],
    "dep_group_recipes": []
  }
}


const genSystemScripts = () => ({
  "dao": {
    "cell_dep": {
      "dep_type": "code",
      "out_point": {
        "index": "0x2",
        "tx_hash": "0x8f8c79eb6671709633fe6a46de93c0fedc9c1b8a6527a18d3983879542635c9f"
      }
    },
    "script_id": {
      "code_hash": "0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e",
      "hash_type": "type"
    }
  },
  "secp256k1_blake160_multisig_all": {
    "cell_dep": {
      "dep_type": "dep_group",
      "out_point": {
        "index": "0x1",
        "tx_hash": "0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37"
      }
    },
    "script_id": {
      "code_hash": "0x5c5069eb0857efc65e1bca0c07df34c31663b3622fd3876c876320fc9634e2a8",
      "hash_type": "type"
    }
  },
  "secp256k1_blake160_sighash_all": {
    "cell_dep": {
      "dep_type": "dep_group",
      "out_point": {
        "index": "0x0",
        "tx_hash": "0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37"
      }
    },
    "script_id": {
      "code_hash": "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
      "hash_type": "type"
    }
  },
  "secp256k1_data": {
    "out_point": {
      "index": "0x3",
      "tx_hash": "0x8f8c79eb6671709633fe6a46de93c0fedc9c1b8a6527a18d3983879542635c9f"
    }
  },
  "type_id": {
    "script_id": {
      "code_hash": "0x00000000000000000000000000000000000000000000000000545950455f4944",
      "hash_type": "type"
    }
  }
}
)

// todo 现在channel-service里锁定了sudt的hashType为data1，导致也不能更换为usdi
// const mapCodehashToCellDeps = {
//   // sudt
//   "0x2a8bdd8f9f9877e3243a5ecc4a6b23799db03ec9bdd46b69153842c5ad75d632": {
//     "name": "sudt",
//     "tx_hash": "0x8067400013eda32e47ee5bfd98758493e80cc6e0dd369d618bc8870a3b1d1eca",
//     "index": 0,
//     "occupied_capacity": 2622100000000,
//     "data_hash": "0x2a8bdd8f9f9877e3243a5ecc4a6b23799db03ec9bdd46b69153842c5ad75d632",
//     "type_id": null
//   },
// }

// const usdiCellDeps = {
//   "name": "sudt",
//   "tx_hash": "0xaec423c2af7fe844b476333190096b10fc5726e6d9ac58a9b71f71ffac204fee",
//   "index": 0,
//   "occupied_capacity": 10804600000000,
//   "data_hash": "0x28a734e118e2f972004f44063a2e795088ca2ed1340dc48ad85ac9d84dcc94d8",
//   "type_id": null
// }