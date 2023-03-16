const mongoose = require("mongoose");

const Person = {
  personId: String,
  gender: String,
  dob: String, // YYYY-MM-DD
  dod: String, // YYYY-MM-DD
  name: {
    first: String,
    middle: String,
    last: String,
  },
  addresses: [
    {
      from: String, // YYYY-MM-DD
      to: String, // YYYY-MM-DD, will be empty for current address
      addressId: String,
    },
  ],
};

const Address = {
  addressId: String,
  zipCode: String,
  street: String,
};

const PersonSchema = new mongoose.Schema(Person);

const AddressSchema = new mongoose.Schema(Address);

// Creating model objects
const persons = mongoose.model("persons", PersonSchema);
const adds = mongoose.model("adds", AddressSchema);

// Exporting our model objects
module.exports = {
  persons,
  adds,
};
