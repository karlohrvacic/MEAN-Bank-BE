const tokenValidation = require("../../functions/tokenValidation");
const getExchangeRate = require("../../functions/getExchangeRate");

module.exports = function (express) {
  const currenciesRouter = express.Router();

  currenciesRouter.use(tokenValidation);

  currenciesRouter.route('/').get((req, res) => {
    try {
      getExchangeRate().then(result => {
        return result.json()
      }).then(result => {
        return res.status(200).json({currencies: result})
      });
    } catch (e) {
      return res.status(500).json({ message: 'An error occurred' });
    }
  })

  return currenciesRouter;
}
