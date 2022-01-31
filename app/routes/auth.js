module.exports = function (express, db, jwt, secret, bcrypt) {
  const authRouter = express.Router();
  const MIN_PASS_LENGTH = 8;

  authRouter.post('/login', async (req, res) => {
    try {
      console.log(req.body)
      const rows = await db.collection('users').find({
        email: req.body.email,
      }).toArray();

      if (rows.length === 0) return res.status(401).json({ message: "User doesn't exist" });

      const validPass = bcrypt.compareSync(req.body.password, rows[0].password);

      if (rows.length > 0 && validPass) {
        const token = jwt.sign({
          _id: rows[0]._id,
          email: rows[0].email,
          password: rows[0].password,
          level: rows[0].level,
          name: rows[0].name,
          surname: rows[0].surname,
          oib: rows[0].oib
        }, secret, {
          expiresIn: '7d',
        });

        return res.status(200).json({
          token,
          user: { _id: rows[0]._id, email: rows[0].email, name: rows[0].name, surname: rows[0].surname, level: rows[0].level, oib: rows[0].oib},
        });
      }
      return res.status(401).json({ message: 'Wrong password' });
    } catch (e) {
      console.log(e)
      res.status(500).json({ message: `An error occurred!${e}` });
    }
  });

  authRouter.route('/register').post(async (req, res) => {
    try {
      const rows = await db.collection('users').find({
        $or : [
          {'email': req.body.email},
          {'oib': req.body.oib}
        ]}).toArray();

      if (req.body.password.length < MIN_PASS_LENGTH) {
        return res.status(400).json({ message: `Password too short! Minimal password length is ${MIN_PASS_LENGTH}` });
      }

      if (rows.length !== 0) {
        return res.status(400).json({ message: 'User exists!' });
      }

      require('bcrypt-nodejs').hash(req.body.password, null, null, (err, hash) => {
        const user = {
          name: req.body.name,
          surname: req.body.surname,
          oib: req.body.oib,
          email: req.body.email,
          password: hash,
          level: 0,
        };

        db.collection('users').insertOne(user, (error, data) => {
          console.log(data);

          if (!error) return res.status(200).json({ insertId: data.insertedId });

          return res.status(500).json({ message: 'An error occurred' });
        });
      });
    } catch (e) {
      return res.status(500).json({ message: 'An error occurred' });
    }
  });

  return authRouter;
};
