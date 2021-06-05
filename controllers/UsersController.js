import dbClient from '../utils/db'
const { createHash } = require('crypto')

class UsersController {
  static async postNew(request, response) {
    const { email, password } = request.body

    if (!email) {
      response.status(400)
      response.json({ error: "Missing email" })
    }

    if (!password) {
      response.status(400)
      response.json({ error: "Missing password" })
    }

    const collection = dbClient.db.collection('users')
    const cursor = collection.find({ email: email })
    if ((await cursor.count()) > 0) {
      response.status(400)
      response.json({ error: "Already exists" })
    } else {
      const hash = createHash('sha1')
      hash.update(password)
      const user = await collection.insertOne({ email: email, password: hash.digest('hex') })

      response.status(201)
      response.json({email: email, id: user.insertedId})
    }
  }
}

module.exports = UsersController
