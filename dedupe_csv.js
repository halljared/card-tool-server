const fs = require('fs');
const parse = require('csv-parse').parse;
const stringify = require('csv-stringify').stringify;

const processFile = async () => {
  const recordsByKey = {};
  const parser = fs
    .createReadStream(`./master.csv`)
    .pipe(parse({
    columns: true
    }));
  for await (const record of parser) {
    const set = record["Set Code"],
      num = record["Card Number"],
      printing = record["Printing"],
      lang = record["Language"],
      key = `${set}-${num}-${printing}-${lang}`,
      actual = recordsByKey[key];
    if(actual) {
      const current = parseInt(actual["Quantity"]),
        additional = parseInt(record["Quantity"]);
      actual["Quantity"] = current + additional;
    } else {
      recordsByKey[key] = record;
    }
  }
  const records = [];
  for(let key of Object.keys(recordsByKey)) {
    records.push(recordsByKey[key]);
  }
  stringify(records, {header: true}, (err, data) => {
    fs.writeFileSync('deduped.csv', data);
  });
};

processFile();

