/**
 * Dependencies
 * */

const express = require('express')
const admin = require('firebase-admin')
let inspect = require('util').inspect;
let Busboy = require('busboy');
let path = require('path')
let os = require('os')
let fs = require('fs')
let UUID = require('uuid-v4')
const cors = require('cors');
let webpush = require('web-push')

/**
 * Config - env var
 * */

require('dotenv').config()

/**
 * Config - Express
 * */

const app = express()
const port = process.env.PORT || 3000
const host = process.env.PORT ? process.env.HOST_PROD : process.env.HOST_DEV

app.use(cors({ origin: host }));

/**
 * Config - Firebase
 * */

const serviceAccount = require('./config')

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIRBASE_STORAGE
});

const db = admin.firestore();
let bucket = admin.storage().bucket();


/**
 * Config - web-push
 **/

// VAPID keys should only be generated only once.
const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY
}

webpush.setVapidDetails(
  'mailto:test@test.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

/**
 * Endpoints - get posts
 * */

app.get('/posts', async (req, res) => {
    let posts = []

    const snapshot = await db.collection('posts').orderBy('date', 'desc').get();
    snapshot.forEach((doc) => {
        posts.push(doc.data());
    });
    res.send(posts)
})

/**
 * Endpoints - create post
 * */

app.post('/createPost', async (req, res) => {
    let uuid = UUID()
    let fields = {}
    let fileData = {}
    let busboy = new Busboy({ headers: req.headers })

    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
        console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype)
        let filepath = path.join(os.tmpdir(), filename)
        file.pipe(fs.createWriteStream(filepath))
        fileData = { filepath, mimetype }
    })

    busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
        console.log('Field [' + fieldname + ']: value: ' + inspect(val))
        fields[fieldname] = val
    })

    busboy.on('finish', function() {
        bucket.upload(
          fileData.filepath,
          {
              uploadType: 'media',
              metadata: {
                  contentType: fileData.mimetype,
                  metadata: {
                      firebaseStorageDownloadTokens: uuid
                  }
              }
          },
          (err, uploadedFile) => {
              if (!err) {
                  createDocument(uploadedFile)
              }
          }
        )

        function createDocument(uploadedFile) {
            db.collection('posts').doc(fields.id).set({
                id: fields.id,
                caption: fields.caption,
                location: fields.location,
                date: parseInt(fields.date, 10),
                imageUrl: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${uploadedFile.name}?alt=media&token=${uuid}`
            })
              .then(response => {
                  res.send('Post added: ' + fields.id)
                  sendPushNotification()
              })
              .catch(err => {
                  res.send('Unable to add post. Error: ' + err)
              });
        }

        function sendPushNotification() {
            // This is the same output of calling JSON.stringify on a PushSubscription

            db.collection('subscriptions').get()
              .then((snapshot) => {
                  snapshot.forEach((doc) => {
                      const subscription = doc.data()
                      const { endpoint } = subscription
                      const { auth, p256dh } = subscription.keys

                      const pushSubscription = {
                          endpoint,
                          keys: {
                              auth,
                              p256dh
                          }
                      }
                      console.log('pushSubscription: ', pushSubscription)
                      const pushContent = {
                          title: 'New Quasagram post',
                          body: 'A new post has been added! Check it out!',
                          openUrl: '/#/'
                      }
                      webpush.sendNotification(pushSubscription, JSON.stringify(pushContent))
                        .then((success) => {
                            console.log('Sent push successfully: ', success);
                        })
                        .catch((err) => {
                            console.log('Unable to sent push successfully:', err);
                        });
                  })
              })
        }
    })

    /**
     * Endpoints - create subscription
     * */

    app.post('/createSubscription', (req,res) => {
        db.collection('subscriptions').add(req.query)
          .then((docRef) => {
              console.log('docRef ', docRef)
              res.send({
                message: 'Subscription added!',
                postData: req.query
              })
        })
    })

    req.pipe(busboy);
})

app.listen(port)
