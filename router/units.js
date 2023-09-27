const os = require('os');
const express = require('express')
const cors = require('cors');

const unitsSchema = require("../models/Units");

function bytesToGB(bytes) {
    const GB = bytes / Math.pow(1024, 3);
    return GB.toFixed(2); // Redondeamos a 2 decimales
}

function secondsToDays(seconds) {
    const days = seconds / (60 * 60 * 24);
    return days;
  }

function serverInfo() {
    const osName = os.platform();
    const osVersion = os.release();
    const osArch = os.arch();
    const totalMemory = bytesToGB(os.totalmem());
    const freeMemory = bytesToGB(os.freemem());
    const cpuInfo = os.cpus();
    const numCores = cpuInfo.length.toString();
    const average = os.loadavg();
    const uptime = secondsToDays(os.uptime()).toFixed(1);
     const dataServer = {
        osName: osName,
        osVersion: osVersion,
        osArch: osArch,
        totalMemory: totalMemory,
        freeMemory: freeMemory,
        numCores: numCores,
        average: average,
        uptime: uptime,
     }

     return dataServer;
}

const router = express.Router();
router.use(cors());

router.get('/server', (req, res) => {
    try {
        console.log('Info Server');
        res.json(serverInfo());
        return serverInfo();
    } catch (error) {
        console.log(error);
    }
});

router.get('/unit', (req, res) => {
    unitsSchema.find()
        .then((data) => res.json(data))
        .catch((error) => res.json({ message: error }))
})


module.exports = router;