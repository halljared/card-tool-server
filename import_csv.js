const { MongoClient } = require('mongodb');
const fs = require('fs');
const parse = require('csv-parse').parse;
const prod = process.env.APP_ENV == "prod";
const db_host = prod && process.env.MONGODB_HOSTNAME || "localhost";
const db_uri = `mongodb://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${db_host}:27017/${process.env.MONGODB_DATABASE}`;
const client = new MongoClient(db_uri);
const dbName = 'mtg_card_tool';
const oracleCards = 'oracle_cards';
const playerCards = 'player_cards';
let db = null;
let oracleCollection = null;
let playerCollection = null;

const onlyUnique = (val, i, self) => {
  return self.indexOf(val) === i;
};

const processFile = async () => {
  const parser = fs
    .createReadStream(`./deduped.csv`)
    .pipe(parse({
    columns: true
    }));
  for await (const record of parser) {
    const set = record['Set Code'].toLowerCase(),
      num = record['Card Number'];
    oracleCollection.findOne({set, collector_number:num})
      .then(async (result) => {
        if(result) {
          const prices = result.prices;
          let types = result.type_line;
          const props = [
            "name",
            "mana_cost",
            "cmc",
            "oracle_text",
            "colors",
            "color_identity",
            "keywords",
            "set",
            "set_name",
            "collector_number",
            "rarity"
          ];
          let merged = {};
          for(let prop of props) {
            merged[prop] = result[prop];
          }
          let added = {
            quantity: record["Quantity"],
            printing: record["Printing"],
            language: record["Language"]
          };
          merged = Object.assign(merged, added);
          let price = merged.printing == "Foil" ? prices.usd_foil : prices.usd;
          const multiTypes = types.split('//');
          let superTypes = [];
          let subTypes = [];
          for (let type of multiTypes) {
            type = type.trim();
            let supers = [];
            let subs = [];
            if (type.indexOf("—") > 0) {
              supers = type.split("—")[0];
            } else {
              supers = type;
            }
            supers = supers.split(" ").filter((split) => {
              return split.length > 0 && split != " ";
            });

            if (type.indexOf("—") > 0) {
              subs = type.split("—")[1];
            } else {
              subs = " ";
            }
            subs = subs.split(" ").filter((split) => {
              return split.length > 0 && split != " ";
            });
            superTypes = superTypes.concat(supers);
            subTypes = subTypes.concat(subs);
          }
          merged["superTypes"] = superTypes.filter(onlyUnique);
          merged["subTypes"] = subTypes.filter(onlyUnique);
          merged["price"] = parseFloat(price);
          console.log(merged);
          playerCollection.insertOne(merged);
        } else {
          // TODO: fix these broken imports
          // console.log(record);
        }
      });
  }
};

async function connect() {
  await client.connect();
  console.log('Connected successfully to database');
  db = client.db(dbName);
  oracleCollection = db.collection(oracleCards);
  playerCollection = db.collection(playerCards);
}

connect()
  .then(() => {
    processFile();
  })
  .catch((err) => {
    console.error(err);
  });
