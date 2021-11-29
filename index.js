const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
const supersPipeline = require('./pipelines/superTypes.json');
const subsPipeline = require('./pipelines/subTypes.json');
const port = 3000;
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
const dbName = 'mtg_card_tool';
const collectionName = 'player_cards';
let db = null;
let collection = null;
app.use(express.json());

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    //intercepts OPTIONS method
    if ('OPTIONS' === req.method) {
      //respond with 200
      res.send(200);
    }
    else {
    //move on
      next();
    }
});

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

app.get('/fetch_card/set/:set/number/:number', (req, res) => {
  const set = req.params.set,
    num = req.params.number;
  collection.findOne({set, collector_number:num})
    .then((result) => {
      res.json(result);
    });
});

app.get('/cards/all', (req, res) => {
  collection.find().toArray((err, docs) => {
    res.json(docs);
  });
});
app.get('/options/cardnames', (req, res) => {
  const search = req.query.search;
  const query = {name: {$regex: new RegExp(search, "i")}};
  collection.find(query).toArray((err, docs) => {
    const names = docs.map(item => item.name);
    res.json(names);
  });
});
app.get('/options/supertypes', (req, res) => {
  collection.aggregate(supersPipeline).toArray((err, docs) => {
    res.json(docs[0].set);
  });
});
app.get('/options/subtypes', (req, res) => {
  collection.aggregate(subsPipeline).toArray((err, docs) => {
    res.json(docs[0].set);
  });
});

app.post('/cards/page', (req, res) => {
  const tableOptions = req.body.tableOptions,
    filterOptions = req.body.filterOptions,
    itemsPerPage = tableOptions.itemsPerPage,
    page = tableOptions.page,
    sortBy = tableOptions.sortBy[0],
    sortAsc = !tableOptions.sortDesc[0],
    query = {},
    sort = {};
    if(filterOptions.name) {
      query.name = {$regex: new RegExp(filterOptions.name, "i")};
    }
    if(filterOptions.text) {
      query.oracle_text = {$regex: new RegExp(filterOptions.text, "i")};
    }
    if(sortBy) {
      sort[sortBy] = sortAsc ? 1 : -1;
    }
  collection.find(query).count().then(count => {
    collection
      .find(query)
      .sort(sort)
      .skip(itemsPerPage * (page - 1))
      .limit(itemsPerPage)
      .toArray((err, docs) => {
        res.json({count, docs});
      });
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});