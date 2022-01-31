const fetch = require('node-fetch');

const getExchangeRate = async (to, from) => {
  let links = [];

  if (!from && !to){
    links.push(process.env.EXCHANGE_RATE_API + '.min.json');
    links.push(process.env.EXCHANGE_RATE_API + '.json');
  } else {
    links.push(process.env.EXCHANGE_RATE_API + `/${from}/${to}.min.json`);
    links.push(process.env.EXCHANGE_RATE_API + `/${from}/${to}.json`);
  }

  let response;
  for(let link of links) {
    try {
    response = await fetch(link)
    if(response.ok)
      return response
  }catch(e){

    }
  }
  return response
}

module.exports = getExchangeRate;
