const express = require('express');
const cors = require('cors');
require('dotenv').config
const bodyParser = require('body-parser')
const jsonParser = bodyParser.json()
const util = require('./utils');

const tj = require("@tmcw/togeojson");
const fs = require("fs");
// node doesn't have xml parsing or a dom. use xmldom
const DOMParser = require("xmldom").DOMParser;

const kml = new DOMParser().parseFromString(fs.readFileSync("asset.kml", "utf8"));

const converted = tj.kml(kml);
// console.log("converted", JSON.stringify(converted))

const mongoose = require('mongoose');
const db = "mongodb+srv://pratik:pratik123@cluster0.jqrj1dw.mongodb.net/restraunt?retryWrites=true&w=majority"


const app = express();
app.use(jsonParser)
app.use(cors())

// const router = express.Router();

const port = process.env.PORT || 8000;
app.listen(port, () => {
    console.log(`App running on port ${port}...`);
});

mongoose.connect(db)
    .then((con) => console.log("database connection successfull"))
    .catch((err) => console.log("error in connection to database", err))

const restrauntSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, 'name is required for a tour'],
        unique: true
    },
    latitude: {
        type: Number,
    },
    longitude: {
        type: Number,
    },
    address: {
        type: String,
    }
}, { collection: 'restraunt' })
const Restraunt = mongoose.model('restraunt', restrauntSchema)

const findRestaurant = (latitude, longitude, restaurantData) => {
    let res = 10000000;
    let nearestRes = {};
    for (let i = 0; i < restaurantData.length; i++) {
        let ans = util.distance(latitude, longitude, restaurantData[i].latitude, restaurantData[i].longitude, "K")

        let prev;
        prev = res;
        res = Math.min(res, ans)

        if (prev !== res) {
            nearestRes = {
                name: restaurantData[i].name,
                address: restaurantData[i].address,
                distance: res
            }
        }
    }
    return nearestRes;
}

function inside(point, vs) {
    // ray-casting algorithm based on
    // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html

    var x = point[0], y = point[1];

    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1];
        var xj = vs[j][0], yj = vs[j][1];

        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
};



const controller = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;

        const polygons = converted.features.filter((polygon) => {
            return polygon.geometry.type === 'Polygon';
        })

        let resultingPolygon;
        let resultingRestaurant;

        for (let i = 0; i < polygons.length; i++) {
            if (inside([longitude, latitude], polygons[i].geometry.coordinates[0])) {
                resultingPolygon = polygons[i]
            }
        }

        const restaurants = converted.features.filter((rest) => {
            return rest.geometry.type === 'Point';
        })

        for (let i = 0; i < restaurants.length; i++) {
            let latitude = restaurants[i].geometry.coordinates[0]
            let longitude = restaurants[i].geometry.coordinates[1]
            if (inside([latitude, longitude], resultingPolygon.geometry.coordinates[0])) {
                resultingRestaurant = restaurants[i]
            }
        }
        res.status(200).json({ status: 200, data: resultingPolygon })
    }
    catch (err) {
        res.status(204).json({ status: 204 })
    }
}

app.post("/", controller)

