require("dotenv").config();
const axios = require("axios");
var express = require("express");
var cors = require("cors");
var Web3 = require("web3");
var app = express();

const ABI_CHARGER_LIST = require("./lib/abi/chargerList.json");
const ABI_CHARGER = require("./lib/abi/charger.json");

let DATA = {};

// Create web3 instance
const web3_ETH = new Web3(
  process.env.RPC_ETH ||
    "https://mainnet.infura.io/v3/7b9dc9ccc7224bea84eb901e556f89ce"
);
const web3_HECO = new Web3(
  process.env.RPC_HECO || "https://http-mainnet.hecochain.com"
);
const web3_BSC = new Web3(
  process.env.RPC_BSC || "https://bsc-dataseed.binance.org/"
);

const web3 = {
  ETH: web3_ETH,
  HECO: web3_HECO,
  BSC: web3_BSC,
};

// Create charger list contract instance
const CONTRACT_CHARGER_LIST = {
  ETH: new web3_ETH.eth.Contract(
    ABI_CHARGER_LIST,
    process.env.ADDRESS_ETH_CHARGER_LIST
  ),
  HECO: new web3_HECO.eth.Contract(
    ABI_CHARGER_LIST,
    process.env.ADDRESS_HECO_CHARGER_LIST
  ),
  BSC: new web3_BSC.eth.Contract(
    ABI_CHARGER_LIST,
    process.env.ADDRESS_BSC_CHARGER_LIST
  ),
};

var CONTRACT_CHARGER = {};

// function info updater
async function looper() {
  //   try {

  // GET block numbers
  DATA["block"] = {
    ETH: await web3_ETH.eth.getBlockNumber(),
    HECO: await web3_HECO.eth.getBlockNumber(),
    BSC: await web3_BSC.eth.getBlockNumber(),
  };

  // GET total supply
  let totalSupply = [];
  for (network in CONTRACT_CHARGER) {
    // console.log(CONTRACT_CHARGER[network]);
    CONTRACT_CHARGER[network].forEach(async (contract) => {
      totalSupply.push(contract.methods.totalSupply().call());
    });
  }
  totalSupply = await Promise.all(totalSupply);

  DATA["total_supply"] = 0;
  totalSupply.map(
    (supply) =>
      (DATA["total_supply"] += Number(web3_ETH.utils.fromWei(supply, "ether")))
  );

  // GET Price data
  const price_ret = await axios.get(
    "https://api.coingecko.com/api/v3/simple/price?ids=recharge&vs_currencies=usd"
  );
  const price = price_ret.data.recharge.usd;

  // GET TVL data
  DATA["TVL"] = DATA["total_supply"] * price;

  //   DATA["total_locked"] = {
  //     ETH: await CONTRACT_CHARGER["ETH"][0].methods.totalSupply().call(),
  //     HECO: await CONTRACT_CHARGER["HECO"][0].methods.totalSupply().call(),
  //     BSC: await CONTRACT_CHARGER["BSC"][0].methods.totalSupply().call(),
  //   };
  //   } catch (e) {
  //     DATA = { looper_error: e };
  //   }
}

async function createChargerInstance() {
  DATA["charger_list"] = {
    ETH: await CONTRACT_CHARGER_LIST["ETH"].methods.get().call(),
    HECO: await CONTRACT_CHARGER_LIST["HECO"].methods.get().call(),
    BSC: await CONTRACT_CHARGER_LIST["BSC"].methods.get().call(),
  };

  for (network in DATA["charger_list"]) {
    const list = DATA["charger_list"][network];
    CONTRACT_CHARGER[network] = [];
    for (var i = 0; i < list.length; i++) {
      //   console.log(list[i]);
      CONTRACT_CHARGER[network].push(
        new web3[network].eth.Contract(ABI_CHARGER, list[i])
      );
    }
  }
  //   console.log(await CONTRACT_CHARGER["ETH"][0].methods.totalSupply().call());
  return;

  // Create Charger contract instance
  //   CONTRACT_CHARGER = {
  //     ETH: new web3_ETH.eth.Contract(ABI_CHARGER),
  //     HECO: new web3_HECO.eth.Contract(
  //       ABI_CHARGER,
  //     ),
  //     BSC: new web3_BSC.eth.Contract(
  //       ABI_CHARGER,
  //     ),
  //   };
}
// function initalialzer
async function init() {
  //   try {
  await createChargerInstance();
  await looper();
  setInterval(looper, 3000);
  //   } catch (e) {
  //     DATA = { init_error: e };
  //   }
}

init();

function get_all(req, res) {
  res.send(DATA);
}

function get_tvl(req, res) {
  res.send({ TVL: DATA["TVL"] });
}

app.use(cors());

app.get("/", get_all);
app.get("/tvl", get_tvl);

app.listen(3000, function () {
  console.log("Example app listening on port 3000!");
});
