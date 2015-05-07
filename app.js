var os = require("os");
var fs = require("fs");
var zip = require("adm-zip");
var http = require("http");
var app = require("./mod/server");
var main = require("./mod/main");
var targz = require("tar.gz");
var mandrill = require('mandrill-api/mandrill');
var mandrill_client = new mandrill.Mandrill("bTzP6ZlUlI55jRcyXAolzw");
var port = 1357;

var server_addr = [];
var interfaces = os.networkInterfaces();
for ( var k in interfaces ){
    for( var k2 in interfaces[k]){
        var address = interfaces[k][k2];
        if(address.family === 'IPv4' && !address.internal){
           server_addr.push(address.address);
        }
    }  
}

 server_addr = (server_addr[0] === undefined )? "localhost" : server_addr[0]

/* Simple logging Mechanism */
function log($message) {
    console.log("\n\n" + $message);
}

/* Remove Direcory synchronously */
var rmdir = function(path) {
    
  if( fs.existsSync(path) ) {
      
    fs.readdirSync(path).forEach(function(file,index){
        
      var curPath = path + "/" + file;
        
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
          
        deleteFolderRecursive(curPath);
          
      } else { // delete file
          
        fs.unlinkSync(curPath);
          
      }
        
    });
      
    fs.rmdirSync(path);
      
  }
    
};
/*!
log("Failed to delete the folder "+ path +"\n\nERR:\n" + err );
errMail("The gtel photo upload application failed to delete a folder\n\nPATH:\n"+ path + "\n\nDESCRIPTION:\n"+err, "GTEL UL | FAILED TO REMOVE DIRECTORY" ); 
*/			


/* Email Sending Facility */
function errMail($message, $subject) {

    var subject = ( $subject === "" )? "Critical Error encountered by the GTEL PHOTO APP" : $subject;      
    
    var message = {
        "html": "",
        "text": $message.toString(),
        "subject": subject ,
        "from_email": "errors@bixbyte.cf",
        "from_name": "Bixbyte Apps Error Reporter",
        "to": main.adminmail,
        "headers": {
            "Reply-To": "noreply@bixbyte.cf"
        },
        "important": true,
        "track_opens": true,
    };

    mandrill_client.messages.send({
        "message": message,
        "async": false
    }, function (result) {
        log("EMAIL SENDING RESULT:\n" + JSON.stringify(result));
    }, function (e) {
        log('ERR: EMAIL SENDING REPORT:\n' + e.name + ' - ' + e.message);
        errMail("Failed to send an email. \n\nDetails:\nName:" + e.name + "\nDescription:\n" + e.message);
    });

}

if( main.mode != "development" ){

errMail( "The Gtel photo upload server experienced an error and had to be restarted.\nSome transactions may have been lost in the process.\nPlease go through the application logs to ensure that all went well.\n\nTIMESTAMP:\n"+ Date() + "\n\nMODE:"+ main.mode , "THE GTEL PHOTO UPLOAD SERVER RESTARTED" );

}else{
 
    log("Running procedural server reload");
    
}


/*  The file upload request handler */
app.route("/gtel/api/photo").all(function (req, res) {

    ip = "";
    g_user = "";
    g_album = "";
   
    /* Capture request user's ip */
    ip = (req.ip).replace("::ffff:", "");

    /* Record request */
    log("Photo upload Request from " + ip);
    fs.appendFile("visitors.byt", "," + ip);

    /* Ensure that a user not a robot is accessing the service */
    g_user = req.body.g_user;

    if (typeof (g_user) === "undefined") {
        /* Deny anonymous users access to the system */

        /* Inform admin of emminent security threat */
        errMail(ip + " tried to hack you @ the gtel photo app!\n\n TIMESTAMP: " + Date());

        /* Redirect the potential hacker */
        res.redirect('/');

    } else {


        /* Capture the album name */
        g_album = main.sanitize(req.body.g_album);

        /* Set up the response type */
        res.setHeader('content-type', 'application/json');

        /* Ensure that the requesting users directory exists */
        if (!fs.existsSync("uploads/" + g_user)) {
            /* Create user directory */
            //Consider user authentication
            fs.mkdirSync("uploads/" + g_user, function (err) {
                if (err) {
                    //Warn maintenance of the ground breaking error
                    errMail("The photo album application failed to create a directory for the user {" + g_user + "} \n\n Reason: \n" + err);
                    log("ERR: COULD NOT CREATE THE 'user' DIRECTORY FOR USER '" + g_user + "'\nREASON:\n" + err);
                }
            });
        }

        /* create the upload album directory in the uploads folder */
        if (!fs.existsSync("uploads/" + g_user + "/" + g_album)) {
            fs.mkdirSync("uploads/" + g_user + "/" + g_album, function (err) {
                if (err) {
                    //Warn maintenance of the ground breaking error
                    errMail("The photo album application failed to create an album directory ( " + g_album + " ) for the user {" + g_user + "} \n\n Reason: \n" + err);
                    log("ERR: COULD NOT CREATE THE 'album' { " + g_album + " } DIRECTORY FOR USER '" + g_user + "'\nREASON: " + err);
                }
            })
        }

        procIt(req, res);

    }

});



/* Upload Effects  */
app.route('/done/:user/:album').all(function (req, res) {

     g_user = req.params.user;
     g_album = main.sanitize(req.params.album);
    
    log("PROCESSING REQUEST:\nUser: "+g_user+"\nAlbum: "+g_album);
    /* Make sure that the user and the user's album have been clearly defined */
    if (typeof (g_user) === "undefined" || typeof (g_album) === "undefined") {

        log("ERR: FAILED TO CAPTURE USER OR ALBUM NAME");

    } else {

         /* Zip and Mail the file to the relevant party */
         packageAlbum(g_user, g_album);
        res.redirect("/index.html");
        
    }

});

/* Online album contents viewer */
app.route("/admin/:path").all(function (req, res) {    
    
    //capture the file path and render the appropriate files
    $path = decodeURI(req.params.path);
        
    log("REQUESETED FOR THE ALBUM AT "+ $path );
    
    //serve the file in the path to the requesting client
    
    var myfile = fs.createReadStream("albums/"+$path);
    $path = $path.replace(/ /g, "_");
    myfile.on("open",function(){
        res.setHeader('Content-disposition', 'attachment; filename=' + $path );
        res.setHeader('content-type', 'application/x-gzip');
        try{
            myfile.pipe(res);
        }catch(e){
           log("ERR: FAILED TO STREAM RESULT.\n" + e); 
        }
    });
    myfile.on("error", function(err){
           res.setHeader('content-type', 'text/html');
           res.sendFile( __dirname + "/mod/server/views/nsfe.html"); 
    });
    
});



/* The process handler */
function procIt(req, res ) {

    /* Ensure that there is a file upload request */
    if (typeof (req.files.userPhoto) != undefined) {

        var isMultiple = (typeof (req.files.userPhoto[0]) === "undefined") ? false : true;

        var gtel_upload = req.files.userPhoto;

        /* Ensure that a valid album title is provided */
        if (typeof (g_album) !== "undefined" || typeof (g_album) != "") {

            // /*    
            if (g_album.length < 3) {
                res.send(main.makeResponse("ERROR", "Please Specify an Album title", "albumTitle"));
            }
            // */

        } else {
            res.send(main.makeResponse("ERROR", "Please Specify an Album title", "albumTitle"));
        }

        /* Check for File type adherance and upload the ones that are compatible */

        /* Check all files for compliance */
        if (isMultiple) {

            log("Uploading Multiple Images ("+  gtel_upload.length +")."  );

            for (g_upload in gtel_upload) {

                /* aproove file types */
                if (isValidType(gtel_upload[g_upload].mimetype, gtel_upload[g_upload].path)) {
                    /* Handle File upload */

                    var tmp_path = gtel_upload[g_upload].path;
                    var target_path = "./uploads/" + g_user + "/" + g_album + "/" + gtel_upload[g_upload].originalname;
                    imgUpload(tmp_path, target_path, gtel_upload[g_upload].originalname, res);

                } else {
                   
                    /* Log that an invalid filetype was encountered */
                    log("ERR: UNSUPPORTED FILE TYPE ENCOUNTERED:\n" + gtel_upload[g_upload] + " is of type --> " + gtel_upload[g_upload].mimetype);

                }

            }

            /* Inform the request Initiator that the file was uploaded */
            res.send(main.makeResponse("Success", "File Upload Complete"));

            /* Zip and Mail the file to the relevant party */
           // packageAlbum(g_user, g_album);

            log("Multiple Image Upload Complete.");


            //EO MULTIPLE FILE UPLOAD
        } else {
            /* Single file upload */

            log("Uploading single image.");

            /* aproove file types */
            if (isValidType(gtel_upload.mimetype, gtel_upload.path)) {

                var tmp_path = gtel_upload.path;
                var target_path = "./uploads/" + g_user + "/" + g_album + "/" + gtel_upload.originalname;
                imgUpload(tmp_path, target_path, gtel_upload.originalname, res );
                
            } else {
                
                /* Log that an unsupported file type was encountered */
                log("ERR: UNSUPPORTED FILE TYPE ENCOUNTERED:\n" + gtel_upload + " is of type --> " + gtel_upload.mimetype + "\n\n");

            }

            /* Inform the request Initiator that the file was uploaded */
            res.send(main.makeResponse("Success", "File Upload Complete"));

            /* Zip and Mail the file to the relevant party */
           // packageAlbum(g_user, g_album);

            log("Single Image Upload Complete.");

            //EO SINGLE FILE UPLOAD
        }

    } else {
        res.send(main.makeResponse("error", "Failed to capture file to upload", ""));
        log("ERR: FAILED TO CAPTURE A FILE TO PROCESS.");
    }

}


/* mimetype validator */
function isValidType(mimeType, path) {
    if (mimeType === "image/jpeg" || mimeType === "image/png" || mimeType === "image/gif" || mimeType === "image/x-ms-bmp") {
        return true;
    }
    //fs.unlink( path );
    console.log(typeof (path));
    return false;
}

/* Actual file uploader */

function imgUpload(tmp_path, target_path, filename, res) {
    /* Move the file to the target path */

    fs.rename(tmp_path, target_path, function (err) {
        if (err) {

            
            //throw err;
            log("ERR: FAILED TO MOVE THE TEMPORARY FILE { " + tmp_path + " } TO THE DESIRED PATH { " + target_path + " }.\nDETAILS:\n" + err);
            /* Inform admin of file rename/move error */
            errMail("ERR: FAILED TO MOVE THE TEMPORARY FILE { " + tmp_path + " } TO THE DESIRED PATH { " + target_path + " }.\nDETAILS:\n" + err);

        } else {

            /* Delete the temporary file */
            fs.unlink(tmp_path, function () {
                if (err) {

                    /* Inform admin of file unlink error */
                    errMail("FAILED TO REMOVE THE TEMPORARY FILE { " + tmp_path + " }.\nDETAILS:\n" + err);
                    /* Throw an error */
                    log("ERR: FAILED TO REMOVE THE TEMPORARY FILE { " + tmp_path + " }.\nDETAILS:\n" + err);
                } 

            });

        }
    });

}


/* Package the folder and send a notification to the relevant parties informing them of the new addition */
function packageAlbum(g_user, g_album) {

    //make sure that the user's defined album exists
    fs.exists('./uploads/' + g_user + "/" + g_album, function (exists) {

        if (exists) {

            fs.readdir('./uploads/' + g_user + "/" + g_album, function (err, files) {
                if (!err) {

                    /* Create an identifier file for the admin with a list of the files */
                    fs.writeFileSync('./uploads/' + g_user + "/" + g_album + "/info.txt", "{ 'username': '" + g_user + "', 'album': '" + g_album + "', 'files': '" + files + "'  } ");
                   
                    /* Place the files in an archive */
                    var compress = new targz().compress('./uploads/' + g_user + "/" + g_album + "/", './albums/' + g_user + "_" + g_album + ".tar.gz", function (err) {
                        if (!err) {

                            /* Delete the parent directory from which the archive was made */
                            rmdir('./uploads/' + g_user + "/" + g_album + "/");
                                                        
                            sendMail(g_user, g_album); //\n\n Remember to uncomment email sender
                            log("Successfully packaged the album '"+g_album+"'. ");
                            
                            
                        } else {
                            errMail("FAILED TO FETCH PROFILE DIRECTORY FOR {"+g_user+"}.\nDETAILS:\n"  + err + "@ packageAlbum 1");
                            log( "ERR: FAILED TO FETCH PROFILE DIRECTORY FOR {"+g_user+"}.\nDETAILS:\n"  + err);
                        }
                    });

                } else {
                    errMail("FAILED TO FETCH PROFILE DIRECTORY FOR {"+g_user+"}.\nDETAILS:\n"  + err + "@ packageAlbum 2");
                    log( "ERR: FAILED TO FETCH PROFILE DIRECTORY FOR {"+g_user+"}.\nDETAILS:\n"  + err);
                }
            });

            /* Send the user back home */
        } else {

            log("ERR: ILLEGAL CALL TO THE METHOD 'packageAlbum'");
            
        }

    });

}



/* The bare mailer function */
function mail( g_user, g_album ){
    /* Email the zipped file to the administrator for processing */
    var mypath = encodeURI("http://"+server_addr+":"+port+"/admin/"+g_user+"_"+g_album+".tar.gz");
   
    var message = {
        "html" :  '<table style="background:white; color:white; margin: 0 auto; height:400px;" width="70%" ><tr style="background:black; color: white; max-height:100px !important;"><td align="center"><img src="http://'+server_addr+':'+ port +'/logo.png" style="left:0px;  "><h1 style="color:white;"> Bixbyte </h1> </td></tr><tr style="background:black; min-height: 300px; color: white; text-align: justified;"><td style=" padding: 10px;"><p>The User <b>' + g_user + '</b> requested the printing of the album <b>' + g_album + '</b>. </p > <br><br> <div style="padding:3px; border-radius:4px; background: teal; text-align: center;">  <a style=" color:#2135ed; text-decoration:none;" href="'+ mypath + '">Download ' + g_user+'_'+g_album+'.tar.gz </a> </div> </td></tr><tr style="background:black; text: white; max-height:100px;"><td align="center">P.O BOX 49599 - 00100, Nairobi Kenya</td></tr></table>',
        "text": "The User " + g_user + " requested the printing of the album '" + g_album + "' \n\nYou can download it at " + mypath,
        "subject": g_user + "_" + g_album + " album print request",
        "from_email": "albums@bixbyte.cf",
        "from_name": "Bixbyte Photo Album Notifier",
        "to": main.usermail,
        "headers": {
            "Reply-To": "info@bixbyte.cf"
        },
        "important": true,
        "track_opens": true
        /*,
        "attachments": [{
        "type": "application/x-gzip",
        "name": g_user + "_" + g_album + ".tar.gz",
        "content": f
                                    }]
                                    */
    };

    var async = false;
    var ip_pool = "Main Pool";
    var send_at = "example send_at";

    mandrill_client.messages.send({
        "message": message,
        "async": async
    }, function (result) {
        log("EMAIL SENDING RESULT:\n" + JSON.stringify(result));
    }, function (e) {
        log('ERR: ERROR EMAIL SENDING ERROR:\n' + e.name + ' - ' + e.message);
        errMail("Failed to send an email. \n\nDetails:\nName:" + e.name + "\nDescription:\n" + e.message);
    });
}



/* The email sender function */
function sendMail(g_user, g_album) {
    
    log("Initiating SendMail request");

    /* Email the zipped file to the administrator for processing */
    mail(g_user,g_album);

}


/* The asynchronous email sender function */
function isendMail(g_user, g_album) {

    fs.exists('./uploads/' + g_user + "/" + g_album + ".tar.gz", function (exists) {
        
        log("Initiating iSendMail request");
        /* Email the files for safe keeping */
        if (exists) {
           
             /* Email the zipped file to the administrator for processing */
            mail(g_user,g_album);

        } else {
            /* Notify the administrator of the failed album zipping attempt */
            errMail("Failed to tar.gz the album " + g_album + " for the user " + g_user + ".\nDetails:\n" + err);
        }

    });

}

/* Ensure that the uploads directory exists */
if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads", function (err) {
        if (err) {
            //Consider warning admin of catastrophic error
            errMail("Gtel Photo upload server Failed to create the uploads directory on startup.\n\n Reason: \n" + err);
            log("ERR: COULD NOT CREATE THE DIRECTORY 'uploads'\nREASON:\n" + err);
        }
    });
}

/* Ensure that the albums directory exists */
if (!fs.existsSync("albums")) {
    fs.mkdirSync("albums", function (err) {
        if (err) {
            //Consider warning admin of catastrophic error
            errMail("Gtel Photo upload server Failed to create the albums directory on startup.\n\n Reason: \n" + err);
            log("ERR: COULD NOT CREATE THE DIRECTORY 'albums'\nREASON:\n" + err);
        }
    });
}

/* Start the socket on the specified port */
app.listen(port, function () {
    log("Application running on http://" + server_addr +":"+ port);
}); 