const mongoose = require('mongoose')

const unitsSchema = mongoose.Schema(
    {
        id: String,
        imei_no: String,
        name: String,
        time: String,
        lattitude: String,
        longitude: String,
        angle: String,
        satellite: String,
        speed: String, 
        battery_voltage: String,
        gps_validity: String,
        server: String
    }
);

module.exports = mongoose.model('units', unitsSchema)