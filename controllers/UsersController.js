import dbClient from '../utils/db'
import redisClient from '../utils/redis'
const mongo = require('mongodb')

const { createHash } = require('crypto')

class UsersController {
  static async postNew(request, response) {
    try {
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
      if (await cursor.count() > 0) {
        response.status(400)
        response.json({ error: "Already exists" })
      } else {
        const hash = createHash('sha1')
        hash.update(password)
        const user = await collection.insertOne({ email: email, password: hash.digest('hex') })

        response.status(201)
        response.json({ email: email, id: user.insertedId })
      }
    } catch (err) {
      console.log(err)
    }
  }

  static async getMe(request, response) {
    const token = request.headers['x-token']
    const id = await redisClient.get(`auth_${token}`)
    const o_id = new mongo.ObjectID(id)
    const user = await dbClient.db.collection('users').findOne({"_id": o_id})
    console.log(user)
    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    return response.json({ id: id, email: user.email })
  }
}

module.exports = UsersController
