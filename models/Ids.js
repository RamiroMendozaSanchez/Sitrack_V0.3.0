const mongoose = require('mongoose')

const idSchema = mongoose.Schema(
    {
        name: String,
        ids: [Number]
    }
);

module.exports = mongoose.model('Id',idSchema)