const { ObjectId } = require('mongodb');
const getExchangeRate = require('../../functions/getExchangeRate');
const tokenValidation = require('../../functions/tokenValidation');

module.exports = function (express, db) {
  const payoutsRouter = express.Router();

  payoutsRouter.use(tokenValidation);

  payoutsRouter.route('/').get((req, res) => {
    try {
      db.collection('payouts').find({}).toArray((err, rows) => {
        if (!err) return res.status(200).json({ payouts: rows });

        return res.status(500).json({ message: 'An error occurred' });
      });
    } catch (e) {
      return res.status(500).json({ message: 'An error occurred' });
    }
  }).post(async (req, res) => {
    try {
      let row = null;
      let isSameCurrency = true;
      try {
        row = await db.collection('accounts').findOne({ _id: new ObjectId(req.body.accountId) });
        if (row.currency !== req.body.currency) isSameCurrency = !isSameCurrency;
      } catch (e) {
        return res.status(400).json({ message: 'Error' });
      }

      let exchangeRate = 1;

      if (!isSameCurrency) {
        exchangeRate = await getExchangeRate(row.currency, req.body.currency)
          .then((result) => result.json())
          .then((result) => result[row.currency]);
      }

      if (Number(row.balance) < Number(req.body.balance) * Number(exchangeRate)) {
        return res.status(400).json({ message: `Not enough balance for transaction, total with exchange rate is ${Number(req.body.balance) * Number(exchangeRate)}` });
      }
      const payout = {
        ownerId: req.decoded._id,
        accountId: req.body.accountId,
        currency: req.body.currency,
        amount: Number(req.body.amount) * Number(exchangeRate),
        timestamp: Date.now(),
      };
      if (row.balance - payout.amount >= 0) {
        db.collection('payouts').insertOne(payout, (err, data) => {
          if (!err) {
            db.collection('accounts').updateOne(
              { _id: new ObjectId(req.body.accountId) },
              {
                $set: {
                  balance: Number((Number(row.balance) - Number(payout.amount)).toFixed(2)),
                },
              },
              (error) => {
                if (error) return res.status(500).json({ message: `An error occurred ${error}` });
              },
            );
            payout._id = data.insertedId;

            return res.status(200).json({ payout });
          } return res.status(500).json({ message: 'An error occurred ' });
        });
      } else {
        return res.status(400).json({ message: 'Low balance' });
      }
    } catch (e) {
      return res.status(500).json({ message: `An error occurred ${e}` });
    }
  });

  payoutsRouter.route('/my').get(async (req, res) => {
    try {
      db.collection('payouts').find({
        ownerId: req.decoded._id,
      }).toArray((err, rows) => {
        if (!err) res.status(200).json({ payouts: rows });
        else res.status(500).json({ message: 'An error occurred ' });
      });
    } catch (e) {
      res.status(500).json({ message: 'An error occurred ' });
    }
  });
  return payoutsRouter;
};
