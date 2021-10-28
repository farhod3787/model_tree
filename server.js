const express = require('express');
const mongoose = require('mongoose');

const userRouter = require('./routes/user');

const config = require('./config');

const cors = require("cors");
const app = express();

app.use(cors());

mongoose.connect(config.database).then( () => {
    console.log('Connected to database')
})
.catch( () =>{
    console.log('Error in connected database')
 });

 app.use(express.urlencoded({ extended: true }));
 app.use(express.json());

app.use('/api/user', userRouter);

app.listen(config.port);

