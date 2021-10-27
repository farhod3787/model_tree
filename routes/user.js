const express = require('express');
const User = require('../models/user');

const router = express.Router();

router.post('/', async function(request, response, next) {
  let body = request.body;
  
  let user = {
    name: body.name,
    parent_id: null
  };

  if (body.parent_id) {
    try {
      let parent_user = await User.findById(body.parent_id);

      if(parent_user.left_id && parent_user.right_id) {
          response.status(400).send({
            message: 'Parent already busy',
            status: 400
          });
      }

      user.parent_id = body.parent_id;
      
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
  let id = request.params.id;
  var res_array = [];

  async function getChild(id) {
    let user = await User.findById(id);
    res_array.push(user);

    if(user.left_id) {
      await getChild(user.left_id);
    }
    if(user.right_id) {
      await getChild(user.right_id)
    }
  }

  await getChild(id);

  response.send(res_array);
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
