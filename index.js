/**
 * Dependencies
 * */

  const express = require('express')

/**
 * Config
 * */

  const app = express()
  const port = process.env.PORT || 3000


/**
 * Endpoints
 * */
  app.get('/posts', (req, res) => {
    let posts = [
      {
        caption: 'sdfsdf',
        location: 'fff'
      },
      {
        caption: '234234',
        location: '234'
      },
    ]
    res.send(posts)
  })

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
