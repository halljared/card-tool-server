const { MongoClient } = require('mongodb');
const fs = require('fs');
const parse = require('csv-parse').parse;
const stringify = require('csv-stringify').stringify;
const dev_uri = `mongodb://localhost:27017`;
const client = new MongoClient(dev_uri);
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
    .createReadStream(`./notfound.csv`)
    .pipe(parse({
    columns: true
    }));
  for await (const record of parser) {
    const name = record['Simple Name'];
    await oracleCollection.find({ name }).toArray()
      .then((result) => {
        if(result) {
          const condensed = result.map((item) => {
            return {
              name: item.name,
              set: item.set_name,
              setCode: item.set,
              collector_number: item.collector_number,
              uri: item.scryfall_uri
            }
          });
          console.log(condensed);
        } else {
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
    return processFile();
  })
  .catch((err) => {
    console.error(err);
  })
  .finally(() => {
    client.close();
  });
