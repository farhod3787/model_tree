const express = require('express');
const User = require('../models/user');
const CronJob = require('cron').CronJob;
const axios = require('axios');

const router = express.Router();

let array = []; 
let block_users = [];
let dummy = 0;

var job = new CronJob('*/2 * * * *', () => {
  reGenerate(); // this function generated every 2 min
})

async function getChild(id) {
  let user = await User.findById(id);
  if (!user.blocked) {
    array.push(user);
  }

    if (user.left_id) {
      array = await getChild(user.left_id);
    }
    if (user.right_id) {  
      array = await getChild(user.right_id);
    }

  return array;
}

async function blockUsers(id) {
  let block_user = await User.findById(id);

  if(block_user.blocked) {
    block_users.push(block_user);
  }

  if(block_user.left_id) {
    block_users = await blockUsers(block_user.left_id);
  }
  if(block_user.right_id) {
    block_users = await blockUsers(block_user.right_id);
  }

  return block_users;
}

async function reGenerate() {

  let user = await User.find().skip(dummy).limit(100);
  console.log(user.length, dummy);
  dummy = dummy + 100;

  if(user.length <= 100) {

    for(let i = 0; i < user.length; i++) {
      let lefts = [];
      let rights = [];

      if (user[i].left_id) {
        lefts = await getChild(user[i].left_id);
        array = [];
      }
      if (user[i].right_id) {
        rights = await getChild(user[i].right_id);
        array = [];
      }

      user[i].left = lefts.length;
      user[i].right = rights.length;
      
      try {
        await User.findByIdAndUpdate(user[i]._id, { $set: user[i] });
      } catch (error) {
        response.send({
          message: 'Error in regenerate function',
          user_name: user[i].name
        })
      }
    }
  } else {
    dummy = 0;
  }
}

async function fillData() {
  let parentId = null;
  let hand = true;
  for (let i = 1; i <= 1000; i++) {
    let new_user = {
      name: 'Fill_' + i,
      parentId: parentId
    }

    if (new_user.parentId) {
        let parent_user = await User.findById(new_user.parentId);
        try {
          const new_account = await new User(new_user).save();
          
          if(!parent_user.right_id && !parent_user.left_id) {
            parent_user.left_id = new_account._id
          } else if(parent_user.left_id && !parent_user.right_id) {
            parent_user.right_id = new_account._id
          } 
          try {
            await User.findByIdAndUpdate(parent_user._id, 
              {
                $set: {
                  left_id: parent_user.left_id, 
                  right_id: parent_user.right_id 
                }
              });

              if(!hand) {
                parentId = new_account._id;
              }
              hand = !hand;
          } catch (error) {
  
            response.status(400).send(error)
          }
          
        } catch (error) {
  
          response.status(400).send(error)
        } 
    } else {      
        try {
          const first_user = await new User(new_user).save();
          parentId = first_user._id;

        } catch (error) {
          response.status(400).send(error)        
        }
    }  
  }
}

router.get('/fillData', async function(request, response) {
  try {
    await fillData();

    response.send('Fill');
  } catch(error) {
    response.send(error);
  }
})

router.get('/regenerateStart', async function(request, response) {
  job.start();
  response.send('Regenate function started')
})

router.get('/regenerateStop', async function(request, response) {
  job.stop();
  response.send('Regenate function stop')
})

router.get('/moysklad', async function(request, response) {
  var config = {
    method: 'get',
    url: 'https://online.moysklad.ru/api/remap/1.2/entity/assortment?offset=1&limit=100&stockstore=https://online.moysklad.ru/api/remap/1.1/entity/store/33de81bc-8a92-11e3-658d-002590a28eca&groupBy=variant',
    headers: { 
      'Authorization': 'Basic YWRtaW5Aa29sZXNvdjo0NjNmOTg1YmM4MQ=='
    }
  };
  
  axios(config)
  .then(function (res) {
    console.log(res.data);
  })
  .catch(function (error) {
    response.send(error);
  });
})

router.post('/', async function(request, response, next) {
  let body = request.body;
  
  let user = {
    name: body.name,
    parentId: null
  };

  if (body.parentId) {
    try {
      let parent_user = await User.findById(body.parentId);

      if(parent_user.left_id && parent_user.right_id) {
          response.status(400).send({
            message: 'Parent already busy',
            status: 400
          });
      }

      user.parentId = body.parentId;
      
      try {
        const new_user = await new User(user).save();
        
        if(!parent_user.right_id && !parent_user.left_id) {
          parent_user.left_id = new_user._id
        } else if(parent_user.left_id && !parent_user.right_id) {
          parent_user.right_id = new_user._id
        } 

        try {
          await User.findByIdAndUpdate(parent_user._id, 
            {
              $set: {
                left_id: parent_user.left_id, 
                right_id: parent_user.right_id 
              }
            });

            response.status(200).send('New User saved')
        } catch (error) {

          response.status(400).send(error)
        }
      } catch (error) {

        response.status(400).send(error)
      }
    } catch (error) {

      response.status(400).send({
        message: 'Parent not found',
        status: 400
      })
    }
  } else {      
      try {
        await new User(user).save();
        
        response.status(200).send('New User saved')
      } catch (error) {
        response.status(400).send(error)        
      }
  } 
})

router.get('/', async function (request, response) {
  const users = await User.find();

  response.send(users);
})

router.get('/change/:id', async function(request, response) {
  let user = await User.findById(request.params.id);

  user.blocked = !user.blocked;

  try {
    console.log(user);
    await User.findByIdAndUpdate(request.params.id, { $set: user });

    response.send({ status: user.blocked ? 'block' : 'unblock', message : 'Status changed' });
  } catch (error) {
    response.send(error);
  }
})

router.get('/:id', async function (request, response) {
  let id = request.params.id;

  try {
    const user = await User.findById(id);
  
    response.send(user);
  } catch (error) {

    response.send('User not found');
  }
})


router.get('/child/:id', async function(request, response) { 
  let left_users = [];
  let right_users = [];
  let current_user = [];
  let users = [];
  let block_accounts = [];
  let left = 0;
  let right = 0;
  let left_block = 0;
  let right_block = 0;
  
  let left_blocks = [];
  let right_blocks = [];

  let user = await User.findById(request.params.id);
  if(!user.blocked) {
    current_user.push(user);
  
    if(user.left_id) {
      left_users = await getChild(user.left_id);
      array = [];
      left_blocks = await blockUsers(user.left_id);
      block_users = [];
    }
    if (user.right_id) {
      right_users = await getChild(user.right_id);
      array = [];
      right_blocks = await blockUsers(user.right_id);
      block_users = [];
    }

    left = left_users.length;
    right = right_users.length;
    left_block = left_blocks.length;
    right_block = right_blocks.length; 

    users.push(...current_user, ...left_users, ...right_users);
    block_accounts = left_blocks.concat(right_blocks);

    response.send({ users, block_accounts, left, right, left_block, right_block });
  } else {
    response.status(400).send('User blocked');
  }
})

router.delete('/:id', async function(request, response) {
  try {
    await User.findByIdAndDelete(request.params.id);

    response.send('Data deleted');
  } catch (error) {
    response.send(error);
  }
})

module.exports = router