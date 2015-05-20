//production
var bixdata = {};

bixdata.mode = "development", 

bixdata.adminmail = [{
                        "email": "ianmin2@live.com",
                        "name": "Ian Innocent Mbae",
                        "type": "to"
                     }],
    
bixdata.usermail = [{
                        "email": "ianmin2@live.com",
                        "name": "Ian Innocent Mbae",
                        "type": "to"
                     }/*,{
                        "email": "kituaemil@hotmail.com",
                        "name": "Kitua Emil",
                        "type": "cc"
                     }*/ /*,{
                        "email": "ian.arwa@yahoo.com",
                         "name": "Ian Arwa",
                         "type": "cc"
                     }*/],
    
bixdata.makeResponse = function (response, message, command) {
    return {
        response: response.toUpperCase(),
        data: {
            message: message,
            command: command
        }
    };
},
    
bixdata.sanitize = function (title) {
                        title = title.replace(/'/g, "");
                        //title = escape(title)
                        return title
                    }



module.exports = bixdata;