const tokenValidation = require('../../functions/tokenValidation');

module.exports = function (express) {
  const meRouter = express.Router();

  meRouter.use(tokenValidation);

  meRouter.get('/', (req, res) => {
    try {
      return res.status(200).json({ user: req.decoded });
    } catch (e) {
      return res.status(500).json({ message: 'An error occurred' });
    }
  });
  return meRouter;
};
