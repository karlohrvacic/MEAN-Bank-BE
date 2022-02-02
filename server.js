const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const path = require('path');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcrypt-nodejs');
const mongo = require('mongodb').MongoClient;
const config = require('./config');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const init = async () => {
  try {
    const database = await mongo.connect(config.pool);
    initServer(database.db(), database);
  } catch (e) {
    console.error('Problem connecting to database ', e);
  }
};

let initServer = (database, client) => {

  app.use(express.static(`${__dirname}/public/app`));

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'DELETE, POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, Authorization, X-Requested-With, Content-Type, Accept, x-access-token');
    next();
  });

  app.use(morgan('dev'));

  const authRouter = require('./app/routes/auth')(express, database, jwt, config.secret, bcrypt);
  app.use('/api/v1/auth', authRouter);

  const userRouter = require('./app/routes/users')(express, database);
  app.use('/api/v1/users', userRouter);

  const accountRouter = require('./app/routes/accounts')(express, database, crypto);
  app.use('/api/v1/accounts', accountRouter);

  const meRouter = require('./app/routes/me')(express);
  app.use('/api/v1/me', meRouter);

  const paymentRouter = require('./app/routes/payments')(express, database);
  app.use('/api/v1/payments', paymentRouter);

  const payoutRouter = require('./app/routes/payouts')(express, database);
  app.use('/api/v1/payouts', payoutRouter);

  const transactionRouter = require('./app/routes/transactions')(express, database, client);
  app.use('/api/v1/transactions', transactionRouter);

  const currenciesRouter = require('./app/routes/currencies')(express);
  app.use('/api/v1/currencies', currenciesRouter);

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '/public/app/views/index.html'));
  });

  app.listen(config.port);

  console.log(`Running on port ${config.port}`);
};

init();
