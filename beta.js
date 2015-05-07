var fs = require("fs");
var main = require("./mod/main");
var app = require("./mod/server");


var zip = require("adm-zip");
var targz = require("tar.gz");
var email = require("node-mandrill")("bTzP6ZlUlI55jRcyXAolzw");

var mandrill = require('mandrill-api/mandrill');
var mandrill_client = new mandrill.Mandrill("bTzP6ZlUlI55jRcyXAolzw");

app.route('/done/:user/:album').all(function (req, res) {

    g_user = req.params.user;
    g_album = req.params.album;

    /* Make sure that the user and the user's album have been clearly defined */
    if (typeof (g_user) === "undefined" || typeof (g_album) === "undefined") {

        res.redirect("/");

    } else {

        //make sure that the user's defined album exists
        fs.exists('./uploads/' + g_user + "/" + g_album, function (exists) {

            if (exists) {

                fs.readdir('./uploads/' + g_user + "/" + g_album, function (err, files) {
                    if (!err) {
                        var compress = new targz().compress('./uploads/' + g_user + "/" + g_album + "/", './uploads/' + g_user + "/" + g_album + ".tar.gz", function (err) {
                            if (!err) {

                                res.send(main.makeResponse("success", "File Successfully submitted for processing", true));
                                var f = fs.readFileSync('./uploads/' + g_user + "/" + g_album + ".tar.gz");
                                f = f.toString('base64');
                                
                                /* Email the zipped file to the administrator for processing 
                                email('/messages/send', {
                                    message: {
                                        to: [ {email: "ianmin2@live.com", name: "Ian Innocent" }],
                                        from_email: 'noreply@bixbyte.cf',
                                        subject: g_user+"\'s Album " + g_album,
                                        text: "You have a new album print request."
                                    }, 
                                    attachments:[{
                                        "type" : "application/x-gzip",
                                        "name" : g_user+"_"+g_album,
                                        "content": f
                                    }]
                                }, function( err, resp ){
                                    if(err){
                                        console.log(JSON.stringify(err) );
                                    }else{
                                        console.log("\n\n" + JSON.stringify(resp) + "\n\n" );   
                                    }
                                });
                                */
                              
                                var message = {
                                        "html": "<p>The User"+ g_user +" requested the printing of the album <b>"+ g_album +"</b>. </p>",
                                        "text": "The User"+ g_user +" requested the printing of the album '"+ g_album +"'.",
                                        "subject": "Album print request",
                                        "from_email": "albums@bixbyte.cf",
                                        "from_name": "Bixbyte Photo Album Notifier",
                                        "to": [{
                                                "email": "ianmin2@live.com",
                                                "name": "Ian Innocent Mbae",
                                                "type": "to"
                                            }],
                                        "headers": {
                                            "Reply-To": "info@bixbyte.cf"
                                        },
                                        "important": true,
                                        "track_opens": true,
                                        "attachments": [{
                                               "type" : "application/x-gzip",
                                               "name" : g_user+"_"+g_album+".tar.gz",
                                               "content": f
                                        }]
                                    };
                                
                                var async = false;
                                var ip_pool = "Main Pool";
                                var send_at = "example send_at";
                                
                                mandrill_client.messages.send({"message": message, "async": async, "ip_pool": ip_pool }, function(result) {
                                    console.log(result);
                                }, function(e) {
                                    // Mandrill returns the error as an object with name and message keys
                                    console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
                                    // A mandrill error occurred: Unknown_Subaccount - No subaccount exists with the id 'customer-123'
                                });
                                
                                


                                
                            } else {
                                res.send(main.makeResponse("error", "Failed to locate the user profile for" + g_user, false));
                                console.log(err);
                            }
                        });

                    } else {
                        res.send(main.makeResponse("error", "Failed to locate the user profile for" + g_user, false));
                        console.log(err);
                    }
                });

            /* Send the user back home */
            } else {
                
                res.redirect("/");
            }

        });



    }


});




app.listen(3000, function (err) {
    if (err) {
        console.log(err);
    } else {
        console.log("App running on port " + 3000);
    }
});