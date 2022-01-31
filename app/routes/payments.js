const { ObjectId } = require('mongodb');
const tokenValidation = require('../../functions/tokenValidation');

module.exports = function (express, db) {
  const paymentsRouter = express.Router();

  paymentsRouter.use(tokenValidation);

  paymentsRouter.route('/').get((req, res) => {
    try {
      db.collection('payments').find({}).toArray((err, rows) => {
        if (!err) res.status(200).json({ payments: rows });

        else res.status(500).json({message: 'An error occurred '});
      });
    } catch (e) {
      res.status(500).json({ message: 'An error occurred' });
    }
  }).post(async (req, res) => {
    try {
      let row = await db.collection('accounts').findOne({ _id: new ObjectId(req.body.accountId) });

      let payment = {
        ownerId: req.decoded._id,
        accountId: req.body.accountId,
        currency: row.currency,
        amount: Number(Number(req.body.amount).toFixed(2)),
      };

      db.collection('payments').insertOne(payment, (err, data) => {
        if (!err) {
          db.collection('accounts').updateOne(
            { _id: new ObjectId(req.body.accountId) },
            {
              $set: {
                balance: payment.amount + row.balance,
              },
            },
            (error) => {
              if (error) return res.status(500).json({message: 'An error occurred ' + error});
            },
          );
          payment['_id'] = data.insertedId
          return res.status(200).json({ payment: payment });
        } return res.status(500).json({ message: 'An error occurred' });
      });
    } catch (e) {
      res.status(500).json({ message: 'An error occurred' });
    }
  });

  paymentsRouter.route('/my').get(async (req, res) => {
    try {
      console.log(req.decoded._id)
      db.collection('payments').find({
        ownerId: req.decoded._id
      }).toArray((err, rows) => {
        if (!err) res.status(200).json({payments: rows});
        else res.status(500).json({message: 'An error occurred '});
      });
    } catch (e) {
      res.status(500).json({message: 'An error occurred ' + e});
    }
  })

  return paymentsRouter;
};
