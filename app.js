var express = require('express');
var path = require('path');



const mongoose = require("mongoose");

const { persons, adds } = require("./models");
const person_data = require("./person.json");
const address_data = require("./addresses.json");
const errorHandler = require("./errorHandler");
const AppError = require("./appError");
var usersRouter = require('./routes/users');

var app = express();




app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.use('/users', usersRouter);




const mongoose = require("mongoose");

const { persons, adds } = require("./models");
const person_data = require("./person.json");
const address_data = require("./addresses.json");
const errorHandler = require("./errorHandler");
const AppError = require("./appError");
var app = express();

var mongoconnect = async () => {

  try {
    await mongoose.connect("mongodb://localhost:27017/local");
    console.log("Connected");
  } catch (e) {
    console.log("error ", e);
  }
};

mongoconnect();

// Create collection of Model
// person.createCollection().then(function (collection) {
//   console.log("Collection is created!");
// });
// address.createCollection().then(function (collection) {
//   console.log("Collection is created!");
// });

// persons.insertMany(person_data);
// addresses.insertMany(address_data);

app.use(json());
app.use("/search", async (req, res) => {
  let to;
  let from;
  let addressIds;
  let zipCodes;
  const status = req.query.status || "@any";

  const today = new Date();
  let formatted_date =
    today.getFullYear() + "-" + today.getMonth() + "-" + today.getDate();
  to = req.query.to || formatted_date;

  from = req.query.from;
  addressIds = req.query.addressIds;
  zipCodes = req.query.zipCodes;

  try {
    if (!from) {
      throw new AppError("from must be present", 400);
    } else if (new Date(from).getTime() <= new Date("1950-01-01").getTime()) {
      throw new AppError("from must be on or after 1950-01-01", 400);
    } else if (new Date(from).getTime() >= new Date(to).getTime()) {
      throw new AppError("to cannot be on or before from", 400);
    }

    if (!(zipCodes || addressIds)) {
      throw new AppError("One of zipCodes or addressIds must be provided", 400);
    }

    addressIds = addressIds ? [...addressIds.split(",")] : [];
    zipCodes = zipCodes ? [...zipCodes.split(",")] : [];

    console.log(formatted_date, to, from);
    // zipCode, addressIds, from and to
    //test
    // addressIds = ["1", "2", "4"];
    // zipCodes = ["121", "122", "144"];
    // from = "2007-01-01";
    // to = "2026-02-01";

    let filter_add_cond = [
      { $gte: ["$$address.from", from] },
      {
        $and: [
          {
            $cond: {
              if: {
                $and: [
                  { $eq: ["$$address.to", null] },
                  { $gte: [to, "$$address.from"] },
                ],
              },
              then: {
                $cond: {
                  if: { $lte: [to, formatted_date] },
                  then: { $lte: ["$$address.to", to] },
                  else: { $ne: ["$$address.to", null] },
                },
              },
              else: {
                $and: [
                  { $lte: ["$$address.to", to] },
                  { $ne: ["$$address.to", null] },
                ],
              },
            },
          },
        ],
      },
      ,
    ];

    if (addressIds.length > 0) {
      filter_add_cond = [
        { $gte: ["$$address.from", from] },
        {
          $and: [
            {
              $cond: {
                if: {
                  $and: [
                    { $eq: ["$$address.to", null] },
                    { $gte: [to, "$$address.from"] },
                  ],
                },
                then: {
                  $cond: {
                    if: { $lte: [to, formatted_date] },
                    then: { $lte: ["$$address.to", to] },
                    else: { $ne: ["$$address.to", null] },
                  },
                },
                else: {
                  $and: [
                    { $lte: ["$$address.to", to] },
                    { $ne: ["$$address.to", null] },
                  ],
                },
              },
            },
          ],
        },
        { $in: ["$$address.addressId", addressIds] },
      ];
    }

    let add_table_match_cond = {
      $match: {
        $expr: {
          $in: ["$addressId", "$$cart.addressId"],
        },
      },
    };

    if (zipCodes.length > 0) {
      add_table_match_cond = {
        $match: {
          zipCode: { $in: zipCodes },

          $expr: {
            $in: ["$addressId", "$$cart.addressId"],
          },
        },
      };
    }

    let data = await persons.aggregate([
      {
        $match: {
          $expr: {
            $switch: {
              branches: [
                {
                  case: { $eq: [status, "@dead"] },
                  then: { $ne: ["$dod", ""] },
                },
                {
                  case: { $eq: [status, "@alive"] },
                  then: { $eq: ["$dod", ""] },
                },
              ],
              default: "Any",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          personId: 1,
          name: 1,
          dob: 1,
          dod: 1,
          addresses: {
            $filter: {
              input: "$addresses",
              as: "address",
              cond: {
                $and: filter_add_cond,
              },
            },
          },
        },
      },

      {
        $lookup: {
          from: "adds",
          let: {
            cart: "$addresses",
          },
          pipeline: [
            add_table_match_cond,
            {
              $replaceRoot: {
                newRoot: {
                  $mergeObjects: [
                    "$$ROOT",
                    {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$$cart",
                            cond: {
                              $and: [
                                { $eq: ["$addressId", "$$this.addressId"] },
                              ],
                            },
                          },
                        },
                        0,
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: "addresses",
        },
      },

      {
        $project: {
          personId: 1,
          firstName: "$name.first",
          lastName: "$name.last",

          age: {
            $dateDiff: {
              startDate: {
                $toDate: "$dob",
              },
              endDate: {
                $cond: {
                  if: {
                    $ne: ["$dod", ""],
                  },
                  then: {
                    $toDate: "$dod",
                  },
                  else: { $toDate: new Date() },
                },
              },
              unit: "year",
            },
          },

          isAlive: { $cond: ["$dod", false, true] },
          addresses: {
            $map: {
              input: "$addresses",

              in: {
                addressId: "$$this.addressId",
                zipCode: "$$this.zipCode",
                street: "$$this.street",
                isCurrent: { $cond: ["$$this.to", false, true] },
                from: "$$this.from",
                to: "$$this.to",
              },
            },
          },
        },
      },
    ]);


    res.json(data);
  } catch (err) {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "ERROR";
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,

      stack: err.stack,
    });

    errorHandler(err, res);
  }
});


const port = 3100;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

module.exports = app;
