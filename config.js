require('dotenv').config();

module.exports = {

  port: process.env.PORT || 8081,
  pool: `mongodb+srv://${process.env.USERNAME}:${process.env.PASSWORD}@${process.env.HOST}/${process.env.COLLECTION_NAME}`,
  secret: process.env.SECRET,

};
