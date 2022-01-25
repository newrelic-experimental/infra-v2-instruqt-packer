const newrelic = require('newrelic');

const mongoClient = require('mongodb').MongoClient;
const mongoObjectID = require('mongodb').ObjectID;
const redis = require('redis');
const bodyParser = require('body-parser');
const express = require('express');

// MongoDB
var db;
var usersCollection;
var ordersCollection;
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

// use REDIS INCR to track anonymous users
app.get('/uniqueid', (req, res) => {
    // get number from Redis
    redisClient.incr('anonymous-counter', (err, r) => {
        if(!err) {
            res.json({
                uuid: 'anonymous-' + r
            });
        } else {
            res.status(500).send(err);
        }
    });
});

// check user exists
app.get('/check/:id', (req, res) => {
    newrelic.addCustomAttribute('user_id', req.params.id);
    if(mongoConnected) {
        usersCollection.findOne({name: req.params.id}).then((user) => {
            if(user) {
                res.send('OK');
            } else {
                res.status(404).send('user not found');
            }
        }).catch((e) => {
            res.send(500).send(e);
        });
    } else {
        res.status(500).send('database not available');
    }
});

// return all users for debugging only
app.get('/users', (req, res) => {
    if(mongoConnected) {
        usersCollection.find().toArray().then((users) => {
            res.json(users);
        }).catch((e) => {
            res.status(500).send(e);
        });
    } else {
        res.status(500).send('database not available');
    }
});

app.post('/login', (req, res) => {
    newrelic.addCustomAttribute('user_id', req.body.name);
    if(req.body.name === undefined || req.body.password === undefined) {
        res.status(400).send('name or passowrd not supplied');
    } else if(mongoConnected) {
        usersCollection.findOne({
            name: req.body.name,
        }).then((user) => {
            if(user) {
                if(user.password == req.body.password) {
                    res.json(user);
                } else {
                    res.status(404).send('incorrect password');
                }
            } else {
                res.status(404).send('name not found');
            }
        }).catch((e) => {
            res.status(500).send(e);
        });
    } else {
        res.status(500).send('database not available');
    }
});

// TODO - validate email address format
app.post('/register', (req, res) => {
    newrelic.addCustomAttribute('user_id', req.body.name);
    if(req.body.name === undefined || req.body.password === undefined || req.body.email === undefined) {
        res.status(400).send('insufficient data');
    } else if(mongoConnected) {
        // check if name already exists
        usersCollection.findOne({name: req.body.name}).then((user) => {
            if(user) {
                res.status(400).send('name already exists');
            } else {
                // create new user
                usersCollection.insertOne({
                    name: req.body.name,
                    password: req.body.password,
                    email: req.body.email
                }).then(() => {
                    res.send('OK');
                }).catch((e) => {
                    res.status(500).send(e);
                });
            }
        }).catch((e) => {
            res.status(500).send(e);
        });
    } else {
        res.status(500).send('database not available');
    }
});

app.post('/order/:id', (req, res) => {
    newrelic.addCustomAttribute('user_id', req.params.id);
    // only for registered users
    if(mongoConnected) {
        usersCollection.findOne({
            name: req.params.id
        }).then((user) => {
            if(user) {
                // found user record
                // get orders
                ordersCollection.findOne({
                    name: req.params.id
                }).then((history) => {
                    if(history) {
                        var list = history.history;
                        list.push(req.body);
                        ordersCollection.updateOne(
                            { name: req.params.id },
                            { $set: { history: list }}
                        ).then((r) => {
                            res.send('OK');
                        }).catch((e) => {
                            res.status(500).send(e);
                        });
                    } else {
                        // no history
                        ordersCollection.insertOne({
                            name: req.params.id,
                            history: [ req.body ]
                        }).then((r) => {
                            res.send('OK');
                        }).catch((e) => {
                            res.status(500).send(e);
                        });
                    }
                }).catch((e) => {
                    res.status(500).send(e);
                });
            } else {
                res.status(404).send('name not found');
            }
        }).catch((e) => {
            res.status(500).send(e);
        });
    } else {
        res.status(500).send('database not available');
    }
});

app.get('/history/:id', (req, res) => {
    newrelic.addCustomAttribute('user_id', req.params.id);
    if(mongoConnected) {
        ordersCollection.findOne({
            name: req.params.id
        }).then((history) => {
            if(history) {
                res.json(history);
            } else {
                res.status(404).send('history not found');
            }
        }).catch((e) => {
            res.status(500).send(e);
        });
    } else {
        res.status(500).send('database not available');
    }
});

// connect to Redis
var redisClient = redis.createClient({
    host: process.env.REDIS_HOST || 'redis'
});

// set up Mongo
function mongoConnect() {
    return new Promise((resolve, reject) => {
        var mongoHOST = process.env.MONGO_HOST || 'mongodb';
        var mongoURL = 'mongodb://' + mongoHOST + ':27017/users';
        mongoClient.connect(mongoURL, (error, _db) => {
            if(error) {
                reject(error);
            } else {
                db = _db;
                usersCollection = db.collection('users');
                ordersCollection = db.collection('orders');
                resolve('connected');
            }
        });
    });
}

function mongoLoop() {
    mongoConnect().then((r) => {
        mongoConnected = true;
    }).catch(() => {
        setTimeout(mongoLoop, 2000);
    });
}

mongoLoop();

// fire it up!
const port = process.env.USER_SERVER_PORT || '8080';
app.listen(port);
