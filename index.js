/**
 * Dependencies
 * */

const express = require('express')
const admin = require('firebase-admin')
let inspect = require('util').inspect;
let Busboy = require('busboy');

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

    let fields = {}
    let busboy = new Busboy({ headers: req.headers })

    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
        console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype)
        file.on('data', function(data) {
            console.log('File [' + fieldname + '] got ' + data.length + ' bytes')
        })
        file.on('end', function() {
            console.log('File [' + fieldname + '] Finished')
        })
    })

    busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
        console.log('Field [' + fieldname + ']: value: ' + inspect(val))
        fields[fieldname] = val
    })

    busboy.on('finish', function() {
        db.collection('posts').doc(fields.id).set({
            id: fields.id,
            cation: fields.caption,
            location: fields.location,
            date: parseInt(fields.date, 10),
            imageUrl: 'https://firebasestorage.googleapis.com/v0/b/instagram-clone-f7360.appspot.com/o/Golden%20Gate%20Bridge.jpg?alt=media&token=f51c9a97-4c45-4db7-8c8a-2e6ad48189b5'
        });
        res.send('Done parsing form')
    })

    req.pipe(busboy);
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
