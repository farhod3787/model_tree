const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    name: { type: String },
    parent_id: { type: String },    
    left_id: { type: String },    
    right_id: { type: String }    
});

module.exports = mongoose.model('users', userSchema);