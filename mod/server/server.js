var bodyParser  = require("body-parser");
var express     = require("express");
var multer      = require("multer");
var app         = express();


/* The server resource directory */
app.use(express.static( __dirname + '/views/'));



/* Express body parser middleware */
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json() );

/* multer middleware */
app.use( multer({
}));


/* The root path handler */
app.route("/").all( function( req, res ){
    
    res.setHeader('content-type', 'text/html');
    res.render( __dirname + "index.html");

});

module.exports = app;
