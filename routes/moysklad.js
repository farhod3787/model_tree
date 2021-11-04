const express = require('express');
const fs = require('fs');
const CronJob = require('cron').CronJob;
const router = express.Router();
var axios = require('axios');

var cron = new CronJob('* * * * *', () => {
  getData(); // this function generated every 3 min
})

let offset = 1;
let limit = 100;

var config = {
  method: 'get',
  url: `https://online.moysklad.ru/api/remap/1.2/entity/assortment?offset=${offset}&limit=${limit}&stockstore=https://online.moysklad.ru/api/remap/1.1/entity/store/33de81bc-8a92-11e3-658d-002590a28eca&groupBy=variant`,
  headers: { 
    'Authorization': 'Basic YWRtaW5Aa29sZXNvdjo0NjNmOTg1YmM4MQ=='
  }
};

async function getData() {
  let array = []; 

  let data = fs.readFileSync('data.json', 'utf8');
  if(data) array = JSON.parse(data);

  axios(config)
  .then(function (res) {
    fs.writeFile('data.json', JSON.stringify(array.concat(res.data.rows)), (err) => {
      if(err) console.log(err);
      console.log('Complate');
      offset = offset + limit;
    })
  })
  .catch(function (error) {
    console.log(error);
  });
}

router.get('/start', async function(request, response) {
  cron.start();
  response.send('Start')
})

router.get('/stop', async function(request, response) {
  cron.start();
   response.send('Stop')
})
 
module.exports = router