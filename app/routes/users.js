const { ObjectId } = require('mongodb');
const tokenValidation = require('../../functions/tokenValidation');

module.exports = function (express, db) {
  const apiRouter = express.Router();
  const MIN_PASS_LENGTH = 8;

  apiRouter.use(tokenValidation);

  apiRouter.route('/').get((req, res) => {
    if (req.decoded.level === 1) {
      try {
        db.collection('users').find({
          level: { $ne: 1 },
        }).toArray((err, rows) => {
          if (!err) return res.status(200).json({ users: rows });

          return res.status(500).json({ message: 'An error occurred' });
        });
      } catch (e) {
        return res.status(500).json({ message: 'An error occurred' });
      }
    } else {
      return res.status(401).json({ message: 'No required permissions' });
    }
  }).post(async (req, res) => {
    if (req.decoded.level > req.body.level) {
      try {
        const rows = await db.collection('users').find({
          email: req.body.email,
        }).toArray();

        if (req.body.password.length < MIN_PASS_LENGTH) {
          return res.status(400).json({ message: `Password too short! Minimal password length is ${MIN_PASS_LENGTH}` });
        }

        if (rows.length !== 0) {
          return res.status(400).json({ message: 'User already exists!' });
        }

        require('bcrypt-nodejs').hash(req.body.password, null, null, (err, hash) => {
          const user = {
            name: req.body.name,
            surname: req.body.surname,
            oib: req.body.oib,
            email: req.body.email,
            password: hash,
            level: req.body.level,
          };

          db.collection('users').insertOne(user, (error, data) => {
            if (!error) return res.status(200).json({ insertId: data.insertedId });

            return res.status(500).json({ message: 'An error occurred' });
          });
        });
      } catch (e) {
        return res.status(500).json({ message: 'An error occurred' });
      }
    } else {
      return res.status(403).json({ message: 'No required permissions' });
    }
  }).put((req, res) => {
    try {
      const user = {
        name: req.body.name,
        surname: req.body.surname,
        email: req.body.email,
        level: req.body.level,
      };

      db.collection('users').updateOne(
        { _id: new ObjectId(req.decoded._id) },
        { $set: user },
        (error) => {
          if (!error) return res.status(200).json({ user });
          return res.status(500).json({ message: 'An error occurred' });
        },
      );
    } catch (e) {
      return res.status(500).json({ message: 'An error occurred' });
    }
  });

  apiRouter.route('/:id').delete((req, res) => {
    try {
      db.collection('users').deleteOne({
        _id: new ObjectId(req.params.id),
      }, (err, data) => {
        if (!err) res.status(200).json({ affectedRows: data.deletedCount });

        else res.status(500).json({ message: 'An error occurred' });
      });
    } catch (e) {
      res.status(500).json({ message: 'An error occurred' });
    }
  });

  return apiRouter;
};
