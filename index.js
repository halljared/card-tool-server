const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
const port = 3000;
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
const dbName = 'mtg_card_tool';
const collectionName = 'oracle_cards';
let db = null;
let collection = null;


async function connect() {
  await client.connect();
  console.log('Connected successfully to database');
  db = client.db(dbName);
  collection = db.collection(collectionName);
}

connect()
  .then(() => {

  })
  .catch((err) => {
    console.error(err);
  });
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/fetch_card/set/:set/number/:number', (req, res) => {
  const set = req.params.set,
    num = req.params.number;
  collection.findOne({set, collector_number:num})
    .then((result) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.json(result);
    });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});