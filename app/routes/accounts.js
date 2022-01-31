const { ObjectId } = require('mongodb');
const tokenValidation = require("../../functions/tokenValidation");

module.exports = function (express, db, crypto) {
  const IBAN_LENGTH = 19;
  const accountsRouter = express.Router();

  accountsRouter.use(tokenValidation);

  accountsRouter.route('/').get((req, res) => {
    if (req.decoded.level === 1){
      try {
        db.collection('accounts').find({}).toArray((err, rows) => {
          if (!err) return res.status(200).json({ accounts: rows });

          return res.status(500).json({ message: 'An error occurred' });
        });
      } catch (e) {
        return res.status(500).json({ message: 'An error occurred' });
      }
    } else {
      return res.status(401).json({ message: 'No required permissions' });
    }
  }).post(async (req, res) => {
    try {
      const row = await db.collection('accounts').findOne({ ownerId: req.decoded._id, currency: req.body.currency });

      if (row) {
        return res.status(409).json({ message: `Account holder already has account for ${req.body.currency.toUpperCase()}` });
      }

      let account = {
        ownerId: req.decoded._id,
        accountNumber: `HR${randomNumbers(IBAN_LENGTH)}`,
        currency: req.body.currency,
        balance: 0,
      };

      db.collection('accounts').insertOne(account, (err, data) => {
        if (!err){
          account['_id'] = data.insertedId
          return res.status(200).json({ account: account });
        } 

        return res.status(500).json({ message: 'An error occurred' });
      });
    } catch (e) {
      return res.status(500).json({ message: 'An error occurred' });
    }
  }).put((req, res) => {
    try {
      const account = {
        currency: req.body.currency,
        balance: Number(req.body.balance),
      };

      db.collection('accounts').updateOne(
        { _id: new ObjectId(req.body.id) },
        { $set: account },
        (err, data) => {
          if (!err) return res.status(200).json({ changedRows: data.modifiedCount });
          return res.status(500).json({ message: 'An error occurred' });
        },
      );
    } catch (e) {
      res.status(500).json({ message: 'An error occurred' });
    }
  });

  accountsRouter.route('/:id').delete(async (req, res) => {
    try {
      const row = await db.collection('accounts').findOne({ ownerId: req.decoded._id, _id: new ObjectId(req.params.id) });
      if (req.decoded.level === 1 || row && row.balance === 0) {
        const row = await db.collection('accounts').findOne({ _id: new ObjectId(req.params.id) });

        if (row.balance === 0) {
          db.collection('accounts').deleteOne({
            _id: new ObjectId(req.params.id),
          }, (err, data) => {
            if (!err) return res.status(200).json({ affectedRows: data.deletedCount });

            return res.status(500).json({ message: 'An error occurred' });
          });
        } else {
          return res.status(202).json({ message: 'Account is not empty!' });
        }
      } else {
        return res.status(403).json({ message: 'Illegal action!\nUser has no privileges.\nAction has been reported!' });
      }
    } catch (e) {
      return res.status(500).json({ message: 'An error occurred ' + e });
    }
  });

  accountsRouter.route('/my').get((req, res) => {
      try {
        db.collection('accounts').find({
          ownerId: req.decoded._id,
        }).toArray((err, rows) => {
          if (!err) return res.status(200).json({ accounts: rows, you: req.decoded });

          return res.status(500).json({ message: 'An error occurred ' });
        });
      } catch (e) {
        return res.status(500).json({ message: 'An error occurred ' + e });
      }
  });

  accountsRouter.route('/numbers').get((req, res) => {
      try {
        db.collection('accounts').find({
          ownerId: {$ne: req.decoded._id}
        }).toArray((err, rows) => {

          if (!err && rows){
            for (let row of rows) {
              delete row.balance;
            }
            return res.status(200).json({ accounts: rows });
          }

          return res.status(550).json({ message: 'No other accounts' });
        });
      } catch (e) {
        return res.status(500).json({ message: 'An error occurred' });
      }
  })

  function randomNumbers(len) {
    let string = '';
    for (let i = 0; i < len; i++) {
      string += crypto.randomInt(0, 9);
    }
    return string;
  }

  return accountsRouter;
};
