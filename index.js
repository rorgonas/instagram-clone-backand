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

/**
 * Config - env var
 * */

require('dotenv').config()

/**
 * Config - Express
 * */

const app = express()
const port = process.env.PORT || 3000


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
 * Endpoints - get posts
 * */

app.get('/posts', async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*')
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
    res.set('Access-Control-Allow-Origin', '*')

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
              })
              .catch(err => {
                  res.send('Unable to add post. Error: ' + err)
              });
        }
    })

    req.pipe(busboy);
})

app.listen(port)
