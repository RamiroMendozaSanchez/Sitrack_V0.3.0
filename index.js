const mongoose = require('mongoose')
const axios = require("axios");
const fs = require("fs").promises;
require('dotenv').config();
const os = require('os');
const express = require('express')

const IdSchema = require("./models/Ids");
const unitsSchema = require("./models/Units");
const unitRoutes = require('./router/units')

const api = express();
const port = process.env.PORT || 9000

api.use(express.json());
api.use('/',unitRoutes);

async function getSid() {
    const token = process.env.TOKEN_WIALON;
    const baseURL = process.env.BASE_URL_WIALON;
    console.log('getSid:{');
    console.log(token);
    console.log(baseURL);
    try {
        const response = await axios.get(
            `${baseURL}?svc=token/login&params={ "token":"${token}"}`
        );
        
        var sid = response.data.eid;
        console.log(sid,'}');
        return sid
    } catch (error) {
    }
}

async function readGroups(callback) {
    try {
        const data = await fs.readFile('./nameGroups.json', 'utf8');
        const grupos = JSON.parse(data);
        return grupos;
    } catch (error) {
        console.error('Error al leer o analizar el archivo JSON:', error);
        throw error;
    }
}

async function getId() {
    const baseURL = process.env.BASE_URL_WIALON;
    var listIds = [];
    var sid = await getSid();
    console.log('getId:{ ',baseURL);
    try {
        const gruposObtenidos = await readGroups();
        grupos = gruposObtenidos
    } catch (error) {
        console.error('Error en la función principal:')
    }

    for (const grupo of grupos) {
        try {
            const response = await axios.get(`${baseURL}?svc=core/search_items&params=
            {"spec":{"itemsType":"avl_unit_group","propName":"sys_name","propValueMask":"${grupo.name}*","sortType":"sys_name","propType":"property"},
            "force":1,"flags":1,"from":0,"to":0}&sid=${sid}`);
            const items = response.data.items;
            for (const item of items) {
                 const ids = item.u
                 const name= item.nm
                 const arrayDataIds = {
                    name:name,
                    ids:ids
                 }
                 listIds.push(arrayDataIds)
            }
        } catch (error) {
            
        }
    }
    console.log(listIds,'}');
    return listIds;
}

async function saveId(){
    try {
        const idsService = await getId();

        for (const grupId of idsService) {
            const newGroupId = new IdSchema(grupId);
            await newGroupId.save();
        }
        console.log("Objetos insertados correctamente");
    } catch (error) {
        console.error('Error al insertar objeto JSON: ', error);
    }
}

async function idsDBsave() {
    try {
        const count = await IdSchema.countDocuments();
        if (count > 0) {
            const deleteResult = await IdSchema.deleteMany();
            console.log('Documentos eliminados:', deleteResult.deletedCount);
        }
        await saveId();
    } catch (error) {
        console.error('Error al contar documentos:', error);
    }
    
}

async function getIdsBD() {
    try {
        const data = await IdSchema.find();
        console.log('Ids desde BD', data);
        return data 
    } catch (error) {
        console.error(error);
        throw error; // Puedes propagar el error si lo deseas
    }
}

async function getUnits() {
    var listUnits = [];
    const baseURL = process.env.BASE_URL_WIALON;
    console.log(baseURL);
    var sid = await getSid();
    var obj = await getIdsBD();
    for (const idsArray of obj) {
        //console.log(idsArray.name);
        var ids = idsArray.ids
        for (const id of ids) {
            try {
                const response = await axios.get(
                    ` ${baseURL}?svc=core/search_item&params={"id":"${id}","flags":4611686018427387903}&sid=${sid}`
                )
                var datos = response.data
                var name = datos.item.nm;
                var imei = datos.item.uid;
                var utc = datos.item.pos.t;
                var timeUTC = returnTimeUTC(utc);
                var latitud = datos.item.pos.y;
                var longitud = datos.item.pos.x;
                var angle = datos.item.pos.c;
                var satellite = datos.item.pos.sc;
                var velocidad = datos.item.pos.s;
                var battery_voltage = "";
                var gps_valid = "";
                var bv =
                    "s_asgn1" in datos.item.lmsg.p
                        ? (battery_voltage = datos.item.lmsg.p.s_asgn1)
                        : "pwr_ext" in datos.item.lmsg.p
                            ? (battery_voltage = datos.item.lmsg.p.pwr_ext)
                            : (battery_voltage = "0");
                var gpsV =
                    "s_asgn4" in datos.item.lmsg.p
                        ? (gps_valid = datos.item.lmsg.p.s_asgn4)
                        : "valid" in datos.item.lmsg.p
                            ? (gps_valid = datos.item.lmsg.p.valid)
                            : "gps_valid" in datos.item.lmsg.p
                                ? (gps_valid = datos.item.lmsg.p.gps_valid)
                                : (gps_valid = "V");
                const gps_validity = "A";

                const dataSitrack = {
                    id:id.toString(),
                    imei_no: imei.toString(),
                    name : name.toString(),
                    time: timeUTC.toString(),
                    lattitude: latitud.toString(),
                    longitude: longitud.toString(),
                    angle: angle.toString(),
                    satellite: satellite.toString(),
                    speed: velocidad.toString(),
                    battery_voltage: battery_voltage.toString(),
                    gps_validity: gps_validity.toString(),
                  };
                  listUnits.push(dataSitrack)

            } catch (error) {
                console.error(error);
            }
        }
    }
    console.log('Units wialon',listUnits);
    return listUnits;
}

function returnTimeUTC(utc) {
    var timeObj = new Date(utc * 1000);
    var time = timeObj.toISOString().replace(/[TZ]/g, "");
    var fechaString = time.substring(0, 10);
    var horaString = time.substring(10);
    var fecha = new Date(fechaString);

    var timeUTC = `${fechaString} ${horaString}`;
    return timeUTC;
}

async function sendInfoSitrack() {
    const apiSitrack = process.env.API_SITRACK_URL;
    var units = await getUnits();
    const results = [];
    await Promise.all(
        units.map(async (unit) => {
            const dataSitrack = {
                imei_no: unit.imei_no,
                lattitude: unit.lattitude,
                longitude: unit.longitude,
                speed: unit.speed,
                angle: unit.angle,
                satellite: unit.satellite,
                time: unit.time,
                battery_voltage: unit.battery_voltage,
                gps_validity: unit.gps_validity,
            };
            try {
                const response = await axios.post(apiSitrack, dataSitrack);
                unit.id = unit.id;
                unit.server = response.data.status;
                results.push(unit);
            } catch (error) {
                console.error("Error al hacer la solicitud:", error.message);
                results.push(unit);
            }
        })
    );
    console.log('SendInfoSitrack: ',results);
    return results;

}

async function saveUnit(){
    try {
        const unitsShipped = await sendInfoSitrack();

        for (const unit of unitsShipped) {
            const newUnit = new unitsSchema(unit);
            await newUnit.save();
        }
        console.log("Objetos insertados correctamente",unitsShipped);
    } catch (error) {
        console.error('Error al insertar objeto JSON: ', error);
    }
}

async function unitsDBsave() {
    try {
        const count = await unitsSchema.countDocuments();
        if (count > 0) {
            const deleteResult = await unitsSchema.deleteMany();
            console.log('Documentos eliminados:', deleteResult.deletedCount);
        }
        await saveUnit();
    } catch (error) {
        console.error('Error al contar documentos:', error);
    }
    
}

async function app() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB Local");
        await unitsDBsave()
    
    } catch (error) {
        console.error(error);
    }
}

app()

// Programar la ejecución de app cada minuto (60,000 milisegundos)
const interval = 60000; // 60 segundos (1 minuto)

setInterval(async () => {
    console.log('Ejecutando app de nuevo...');
    await app();
}, interval);

api.listen(port, () => console.log('server listening on port', port));