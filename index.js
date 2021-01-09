/**
 * Dependencies
 * */

const express = require('express')
const admin = require('firebase-admin')


/**
 * Config - Express
 * */

const app = express()
const port = process.env.PORT || 3000


/**
 * Config - Firebase
 * */

const serviceAccount = require('./serviceAccountKey.json')

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Endpoints
 * */

app.get('/posts', async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*')
    let posts = []

    const snapshot = await db.collection('posts').orderBy('date', 'desc').get();
    snapshot.forEach((doc) => {
        console.log('doc: ', doc);
        posts.push(doc.data());
    });

    res.send(posts)
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
