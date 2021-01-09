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
 * Endpoints - get posts
 * */

app.get('/posts', async (request, response) => {
    response.set('Access-Control-Allow-Origin', '*')
    let posts = []

    const snapshot = await db.collection('posts').orderBy('date', 'desc').get();
    snapshot.forEach((doc) => {
        posts.push(doc.data());
    });
    response.send(posts)
})

/**
 * Endpoints - create post
 * */

app.get('/createPosts', async (request, response) => {
    response.set('Access-Control-Allow-Origin', '*')
    response.send('createPosts')
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
