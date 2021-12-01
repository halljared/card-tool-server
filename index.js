const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
require('util').inspect.defaultOptions.depth = null;
const supersPipeline = require('./pipelines/superTypes.json');
const subsPipeline = require('./pipelines/subTypes.json');
const setNamesPipeline = require('./pipelines/setNames.json');
const keywordsPipeline = require('./pipelines/keywords.json');
const port = 3000;
const prod = process.env.APP_ENV == "prod";
const db_host = prod && process.env.MONGODB_HOSTNAME || "localhost";
const db_uri = `mongodb://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${db_host}:27017/${process.env.MONGODB_DATABASE}`;
const client = new MongoClient(db_uri);
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
  console.log(`Connecting to mongodb at ${db_uri}`);
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
app.get('/options/setnames', (req, res) => {
  collection.aggregate(setNamesPipeline).toArray((err, docs) => {
    res.json(docs[0].sets);
  });
});
app.get('/options/keywords', (req, res) => {
  collection.aggregate(keywordsPipeline).toArray((err, docs) => {
    res.json(docs[0].keywords);
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
    setNames = filterOptions.setNames,
    superTypes = filterOptions.superTypes,
    subTypes = filterOptions.subTypes,
    keywords = filterOptions.keywords,
    colors = filterOptions.colors,
    $and = [],
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
  if(setNames && setNames.length > 0) {
    $and.push({"set_name":{$in: setNames}});
  }
  if(superTypes && superTypes.length > 0) {
    $and.push({"superTypes":{$in: superTypes}});
  }
  if(subTypes && subTypes.length > 0) {
    $and.push({"subTypes":{$in: subTypes}});
  }
  if(keywords && keywords.length > 0) {
    $and.push({"keywords":{$in: keywords}});
  }
  if(colors && colors.length > 0) {
    const exprs = [];
    for(let color of colors) {
      exprs.push({color_identity: color});
    }
    $and.push({$and:exprs});
  }
  if($and.length > 0) {
    query["$and"] = $and;
  }
  // if(superTypes && superTypes.length > 0) {
  //   query["set_name"] = {$in: setNames};
  // }
  console.debug(query);
    
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