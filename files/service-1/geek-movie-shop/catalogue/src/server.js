const newrelic = require('newrelic');

const mongoClient = require('mongodb').MongoClient;
const mongoObjectID = require('mongodb').ObjectID;
const bodyParser = require('body-parser');
const express = require('express');

// MongoDB
var db;
var collection;
var mongoConnected = false;

const app = express();

app.use((req, res, next) => {
    res.set('Timing-Allow-Origin', '*');
    res.set('Access-Control-Allow-Origin', '*');
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/health', (req, res) => {
    var stat = {
        app: 'OK',
        mongo: mongoConnected
    };
    res.json(stat);
});

// all products
app.get('/products', (req, res) => {
    if(mongoConnected) {
        collection.find({}).toArray().then((products) => {
            res.json(products);
        }).catch((e) => {
            res.status(500).send(e);
        });
    } else {
        res.status(500).send('database not avaiable');
    }
});

// product by SKU
app.get('/product/:sku', (req, res) => {
    newrelic.addCustomAttribute('sku', req.params.sku);
    if(mongoConnected) {
        collection.findOne({sku: req.params.sku}).then((product) => {
            if(product) {
                res.json(product);
            } else {
                res.status(404).send('SKU not found');
            }
        }).catch((e) => {
            res.status(500).send(e);
        });
    } else {
        res.status(500).send('database not available');
    }
});

// products in a category
app.get('/products/:cat', (req, res) => {
    newrelic.addCustomAttribute('category', req.params.cat);
    if(mongoConnected) {
        collection.find({ categories: req.params.cat }).sort({ name: 1 }).toArray().then((products) => {
            if(products) {
                res.json(products);
            } else {
                res.status(404).send('No products for ' + req.params.cat);
            }
        }).catch((e) => {
            res.status(500).send(e);
        });
    } else {
        res.status(500).send('database not avaiable');
    }
});

// all categories
app.get('/categories', (req, res) => {
    if(mongoConnected) {
        collection.distinct('categories').then((categories) => {
            res.json(categories);
        }).catch((e) => {
            res.status(500).send(e);
        });
    } else {
        res.status(500).send('database not available');
    }
});

// search name and description
app.get('/search/:text', (req, res) => {
    newrelic.addCustomAttribute('searchText', req.params.text);
    if(mongoConnected) {
        collection.find({ '$text': { '$search': req.params.text }}).toArray().then((hits) => {
            res.json(hits);
        }).catch((e) => {
            res.status(500).send(e);
        });
    } else {
        res.status(500).send('database not available');
    }
});

// set up Mongo
function mongoConnect() {
    return new Promise((resolve, reject) => {
        var mongoHOST = process.env.MONGO_HOST || 'mongodb';
        var mongoURL = 'mongodb://' + mongoHOST + ':27017/catalogue';
        mongoClient.connect(mongoURL, (error, _db) => {
            if(error) {
                reject(error);
            } else {
                db = _db;
                collection = db.collection('products');
                resolve('connected');
            }
        });
    });
}
// "mongodb://localhost:27017/exampleDb"
// mongodb connection retry loop
function mongoLoop() {
    mongoConnect().then((r) => {
        mongoConnected = true;
    }).catch(() => {
    });
}

mongoLoop();

// fire it up!
const port = process.env.CATALOGUE_SERVER_PORT || '8080';
app.listen(port);
