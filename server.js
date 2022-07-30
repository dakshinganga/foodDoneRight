const express = require("express");
const cors = require("cors");
require("dotenv").config;
const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();
const util = require("./utils");

const mongoose = require("mongoose");
const db =
	"mongodb+srv://pratik:pratik123@cluster0.jqrj1dw.mongodb.net/restraunt?retryWrites=true&w=majority";

const app = express();
app.use(jsonParser);
app.use(cors());

// const router = express.Router();

const port = process.env.PORT || 8000;
app.listen(port, () => {
	console.log(`App running on port ${port}...`);
});

mongoose
	.connect(db)
	.then((con) => console.log("database connection successfull"))
	.catch((err) => console.log("error in connection to database", err));

const restrauntSchema = mongoose.Schema(
	{
		name: {
			type: String,
			required: [true, "name is required for a tour"],
			unique: true,
		},
		latitude: {
			type: Number,
		},
		longitude: {
			type: Number,
		},
		address: {
			type: String,
		},
	},
	{ collection: "restraunt" }
);
const Restraunt = mongoose.model("restraunt", restrauntSchema);

const findRestaurant = (latitude, longitude, restaurantData) => {
	let res = 10000000;
	let nearestRes = {};
	for (let i = 0; i < restaurantData.length; i++) {
		let ans = util.distance(
			latitude,
			longitude,
			restaurantData[i].latitude,
			restaurantData[i].longitude,
			"K"
		);

		let prev;
		prev = res;
		res = Math.min(res, ans);

		if (prev !== res) {
			nearestRes = {
				name: restaurantData[i].name,
				address: restaurantData[i].address,
				distance: res,
			};
		}
	}
	return nearestRes;
};

const controller = async (req, res) => {
	const { latitude, longitude } = req.body;
	const restaurantData = await Restraunt.find();
	// console.log(restaurantData)

	const distances = restaurantData.map((i) => {
		return util.distance(latitude, longitude, i.latitude, i.longitude);
	});
	console.log("min", Math.min(...distances));
	// console.log(distances);

	let nearestRes = findRestaurant(latitude, longitude, restaurantData);

	// console.log(nearestRes);
	res.status(200).json({ data: nearestRes });
};

app.post("/", controller);
