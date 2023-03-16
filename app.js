var express = require('express');
var path = require('path');



var usersRouter = require('./routes/users');

var app = express();




app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.use('/users', usersRouter);



module.exports = app;
