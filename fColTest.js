myFiles = new FileCollection('myFiles', {
    resumable: true, // Enable built-in resumable.js upload support
    http: []
        // http: [
        //   { method: 'get',
        //     path: '/:md5',  // this will be at route "/gridfs/myFiles/:md5"
        //     lookup: function (params, query) {  // uses express style url params
        //       return { md5: params.md5 };       // a query mapping url to myFiles
        //     }
        //   }
        // ]
});

if (Meteor.isClient) {

    // When a file is added via drag and drop
    myFiles.resumable.on('fileAdded', function(file) {

        console.log("fileAdded", file);

        // Create a new file in the file collection to upload
        myFiles.insert({
                _id: file.uniqueIdentifier, // This is the ID resumable will use
                filename: file.fileName,
                contentType: file.file.type
            },
            function(err, _id) { // Callback to .insert
                if (err) {
                    return console.error("File creation failed!", err);
                }
                // Once the file exists on the server, start uploading
                myFiles.resumable.upload();
            }
        );
    });

    // This autorun keeps a cookie up-to-date with the Meteor Auth token
    // of the logged-in user. This is needed so that the read/write allow
    // rules on the server can verify the userId of each HTTP request.
    Deps.autorun(function() {
        // Sending userId prevents a race condition
        Meteor.subscribe('myData');
        // $.cookie() assumes use of "jquery-cookie" Atmosphere package.
        // You can use any other cookie package you may prefer...
        //$.cookie('X-Auth-Token', Accounts._storedLoginToken());
    });

    Template.hello.helpers({

    });

    Template.hello.events({
        'click button': function() {
            if ( /*/Simulator/.test(navigator.platform)*/ true) { //TODO: using a predefined image now, switch to Meteor.Camera later
                //use fake image
                console.log("faking image...");
                var data = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABsSFBcUERsXFhceHBsgKEIrKCUlKFE6PTBCYFVlZF9VXVtqeJmBanGQc1tdhbWGkJ6jq62rZ4C8ybqmx5moq6T/2wBDARweHigjKE4rK06kbl1upKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKT/wAARCAA8AFADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwChAm4bvU5q0kRGT2rPiEsf3G4q0lzJsKsvXvikBYtIcqWI5Y1YEYpttPHsCnIIqwoUglSCTTEVoocuWxU3lD0qZEABpwAI4oGUnt97/pTWtSPunFaBi2kD0FIUoAxriNwu1uh71C1swXIbBrVnj3uB71FLHSAz4xVlBxVeOrKUwJEUDtVuF1UjI/Gqy1ItAGlEsUn3ZMH0NSra4YcjHtWYpqzDM69GNAFiRCGJIxk1CwOT6VaSckfMAaR2hJyVwaAKDJ859h+tQSrwatzDBLIwIPOKpTSgAhgRQBmx1YSq8dWUoAlWpVqNaeKAJFqVDioQaeDQBaWTAprvmoQ1BNADHNVJhuzVlzVaSkBRjNWUNVIzVhDQBZU08GoFNPBNMCcGnA1CCacCaAJd1BaowTQSaQAxqvIakY1BIaAP/9k=";
                var myBlob = dataURItoBlob(data);
                myBlob.name = "image.jpeg";
                myFiles.resumable.addFile(myBlob); // My file collection name is Media
            } else {
                MeteorCamera.getPicture({}, function(err, data) {
                    if (err) {
                        console.log("err", err);
                    } else {
                        console.log("success", data);
                        //var myBlob = dataURItoBlob(canvas.toDataURL("image/jpeg"));
                        var myBlob = dataURItoBlob(data);
                        myBlob.name = "image.jpeg";
                        myFiles.resumable.addFile(myBlob); // My file collection name is Media
                    }
                })
            }
        }
    });
}

if (Meteor.isServer) {

    // Only publish files owned by this userId, and ignore
    // file chunks being used by Resumable.js for current uploads
    Meteor.publish('myData',
        function() {
            return myFiles.find({});
        }
    );

    // Allow rules for security. Should look familiar!
    // Without these, no file writes would be allowed
    myFiles.allow({
        // The creator of a file owns it. UserId may be null.
        insert: function(userId, file) {
            // Assign the proper owner when a file is created
            file.metadata = file.metadata || {};
            file.metadata.owner = userId;
            return true;
        },
        // Only owners can remove a file
        remove: function(userId, file) {
            // Only owners can delete
            return (userId === file.metadata.owner);
        },
        // Only owners can retrieve a file via HTTP GET
        read: function(userId, file) {
            return (userId === file.metadata.owner);
        },
        // This rule secures the HTTP REST interfaces' PUT/POST
        // Necessary to support Resumable.js
        write: function(userId, file, fields) {
            // Only owners can upload file data
            return (userId === file.metadata.owner);
        }
    });
}

function dataURItoBlob(dataURI) {
    var byteString = atob(dataURI.split(',')[1]);
    var mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], {
        type: mimeString
    });
}