const { ObjectId } = require('mongodb');
const getExchangeRate = require('../../functions/getExchangeRate');
const tokenValidation = require('../../functions/tokenValidation');

module.exports = function (express, db, client) {
  const transactionRouter = express.Router();

  transactionRouter.use(tokenValidation);

  transactionRouter.route('/').get((req, res) => {
    try {
      db.collection('transactions').find({}).toArray((err, rows) => {
        if (!err) return res.status(200).json({ transactions: rows });

        return res.status(500).json({ message: 'An error occurred' });
      });
    } catch (e) {
      return res.status(500).json({ message: 'An error occurred' });
    }
  }).post(async (req, res) => {
    try {
      const acc1 = await db.collection('accounts').findOne({ _id: new ObjectId(req.body.receiverAccountId) });
      const acc2 = await db.collection('accounts').findOne({ _id: new ObjectId(req.body.senderAccountId) });
      const receiverInfo = await db.collection('users').findOne({ _id: new ObjectId(acc1.ownerId) });

      let exchangeRate = 1;

      if (acc1.currency !== acc2.currency) {
        exchangeRate = await getExchangeRate(acc1.currency, acc2.currency)
          .then((result) => result.json())
          .then((result) => result[acc1.currency]);
      }

      req.body.amount = Number(req.body.amount.toFixed(2));

      const transactions = {
        receiverAccountId: req.body.receiverAccountId,
        senderAccountId: req.body.senderAccountId,
        receiverId: new ObjectId(receiverInfo._id).toString(),
        senderId: req.decoded._id,
        currency: acc1.currency,
        amount: Number((Number(req.body.amount) * Number(exchangeRate)).toFixed(2)),
        timestamp: Date.now(),
      };

      await transfer(transactions.senderAccountId, transactions.receiverAccountId, transactions.amount, transactions);

      async function transfer(from, to, amount, transaction) {
        if (amount === 0) {
          return res.status(400).json({ message: `You can't transfer 0 ${transaction.currency.toUpperCase()}` });
        }
        const session = client.startSession();
        session.startTransaction();
          const opts = { session, returnOriginal: false };
          const A = await db.collection('accounts').findOneAndUpdate({ _id: new ObjectId(from) }, { $inc: { balance: -req.body.amount } }, opts)
            .then((result) => result.value);

          if (A.balance < Number(req.body.amount)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Insufficient funds' });
          }
          await db.collection('accounts').findOneAndUpdate({ _id: new ObjectId(to) }, { $inc: { balance: amount } }, opts).then((result) => result.value);

          await session.commitTransaction();
          session.endSession();
          db.collection('transactions').insertOne(transactions, (err, data) => {
            if (!err) {
              transactions._id = data.insertedId;
              return res.status(200).json({ transaction: transactions });
            } return res.status(500).json({ message: 'An error occurred' });
          });
      }
    } catch (e) {
      return res.status(500).json({ message: `An error occurred ${e}` });
    }
  });

  transactionRouter.route('/my').get(async (req, res) => {
    try {
      db.collection('transactions').find({
        $or: [
          { receiverId: req.decoded._id },
          { senderId: req.decoded._id },
        ],
      }).toArray((err, rows) => {
        if (!err) res.status(200).json({ transactions: rows });
        else res.status(500).json({ message: 'An error occurred ' });
      });
    } catch (e) {
      res.status(500).json({ message: 'An error occurred ' });
    }
  });

  return transactionRouter;
};
