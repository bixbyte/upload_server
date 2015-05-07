var fs = require("fs");
/*Ip list sanitize*/
var find = "::ffff:";
var replacement = new RegExp(find,"g");
var str = fs.readFileSync("visitors.byt").toString().replace( replacement,"");
fs.writeFileSync("visitors.byt",str);