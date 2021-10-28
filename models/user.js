const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    name: { type: String },
    parentId: { type: String },    
    left_id: { type: String },    
    right_id: { type: String },
    left: { type: Number },
    right: { type: Number }    
});

module.exports = mongoose.model('users', userSchema);