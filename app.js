var express = require('express');
var path = require('path');
const mongoose = require("mongoose");
const {json}=require("express")
const { persons, adds } = require("./models");
const person_data = require("./person.json");
const address_data = require("./addresses.json");
const AppError = require("./appError");


var app = express();




app.use(express.json());
app.use(express.urlencoded({ extended: false }));



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
persons.createCollection().then(function (collection) {
  console.log("Collection is created!");
});
adds.createCollection().then(function (collection) {
  console.log("Collection is created!");
});

persons.insertMany(person_data);
adds.insertMany(address_data);

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
    

    let data;
    if (addressIds.length > 0) {
      data = await persons.aggregate([
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
                  $and: [
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
                  ],
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
              {
                $match: {
                  $expr: {
                    $in: ["$addressId", "$$cart.addressId"],
                  },
                },
              },
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

            isAlive: { $cond: [{ $ne: ["$dod", ""] }, false, true] },
            addresses: {
              $map: {
                input: "$addresses",

                in: {
                  addressId: "$$this.addressId",
                  zipCode: "$$this.zipCode",
                  street: "$$this.street",
                  isCurrent: { $cond: ["$$this.to", false, true] },
                },
              },
            },
          },
        },
      ]);
    } else {
      data = await adds.aggregate([
        {
          $match: {
            zipCode: { $in: zipCodes },
          },
        },
        {
          $lookup: {
            from: "persons",
            let: { add: "$addressId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$$add", "$addresses.addressId"],
                  },
                },
              },
            ],
            as: "temp",
          },
        },
        { $unwind: "$temp" },

        {
          $match: {
            $expr: {
              $switch: {
                branches: [
                  {
                    case: { $eq: [status, "@dead"] },
                    then: { $ne: ["$temp.dod", ""] },
                  },
                  {
                    case: { $eq: [status, "@alive"] },
                    then: { $eq: ["$temp.dod", ""] },
                  },
                ],
                default: "Any",
              },
            },
          },
        },
        {
          $project: {
            personId: "$temp.personId",
            firstName: "$temp.name.first",
            lastName: "$temp.name.last",
            zipCode: 1,
            street: 1,

            age: {
              $dateDiff: {
                startDate: {
                  $toDate: "$temp.dob",
                },
                endDate: {
                  $cond: {
                    if: {
                      $ne: ["$temp.dod", ""],
                    },
                    then: {
                      $toDate: "$temp.dod",
                    },
                    else: { $toDate: new Date() },
                  },
                },
                unit: "year",
              },
            },
            isAlive: { $cond: [{ $ne: ["$temp.dod", ""] }, false, true] },

            addresses: {
              $filter: {
                input: "$temp.addresses",
                as: "addresses",
                cond: {
                  $and: [
                    { $eq: ["$$address.addressId", "$addressId"] },
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
                  ],
                },
                as: "address",
              },
            },
          },
        },

        {
          $project: {
            _id: 0,
            personId: 1,
            firstName: 1,
            lastName: 1,
            age: 1,
            isAlive: 1,

            addresses: {
              $map: {
                input: "$addresses",

                in: {
                  addressId: "$$this.addressId",
                  zipCode: "$zipCode",
                  street: "$street",
                  isCurrent: { $cond: ["$$this.to", false, true] },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: {
              personId: "$personId",
              firstName: "$firstName",
              lastName: "$lastName",
              age: "$age",
              isAlive: "$isAlive",
            },
            addresses: { $push: { $arrayElemAt: ["$addresses", 0] } },
          },
        },
        {
          $project: {
            _id: 0,
            addresses: 1,
            personId: "$_id.personId",
            firstName: "$_id.firstName",
            lastName: "$_id.lastName",
            age: "$_id.age",
            isAlive: "$_id.isAlive",
          },
        },
      ]);
    }


    res.json(data);
  } catch (err) {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "ERROR";
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,

      stack: err.stack,
    });

  }
});


const port = 3100;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

module.exports = app;
