const { MongoClient } = require('mongodb');
const fs = require('fs');
const parse = require('csv-parse').parse;
const stringify = require('csv-stringify').stringify;
const prod = process.env.APP_ENV == "prod";
const unmatched = process.env.UNMATCHED == "true";
const db_host = prod && process.env.MONGODB_HOSTNAME || "localhost";
const dev_uri = `mongodb://${db_host}:27017`;
let db_uri = `mongodb://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${db_host}:27017/${process.env.MONGODB_DATABASE}`;
db_uri = prod ? db_uri : dev_uri;
const client = new MongoClient(db_uri);
const dbName = 'mtg_card_tool';
const oracleCards = 'oracle_cards';
const playerCards = 'player_cards';
const notFound = [];
let db = null;
let oracleCollection = null;
let playerCollection = null;

const onlyUnique = (val, i, self) => {
  return self.indexOf(val) === i;
};

const processFile = async () => {
  const parser = fs
    .createReadStream(`./fixed.csv`)
    .pipe(parse({
    columns: true
    }));
  for await (const record of parser) {
    const set = record['Set Code'].toLowerCase(),
      num = record['Card Number'];
    await oracleCollection.findOne({set, collector_number:num})
      .then((result) => {
        if(result && !unmatched) {
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
        } else if(!result) {
          console.log(record);
          notFound.push(record);
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
    return processFile();
  })
  .then(() => {
    return new Promise((resolve, reject) => {
      stringify(notFound, {header: true}, (err, data) => {
        fs.writeFileSync('notfound.csv', data);
        resolve();
      });
    })
  })
  .catch((err) => {
    console.error(err);
  })
  .finally(() => {
    client.close();
  });
