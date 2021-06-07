import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const mongo = require('mongodb');

const { createHash } = require('crypto');

class UsersController {
  static async postNew(request, response) {
    try {
      const { email, password } = request.body;

      if (!email) {
        response.status(400);
        return response.json({ error: 'Missing email' });
      }

      if (!password) {
        response.status(400);
        return response.json({ error: 'Missing password' });
      }

      const collection = dbClient.db.collection('users');
      const cursor = collection.find({ email });
      if (await cursor.count() > 0) {
        response.status(400);
        return response.json({ error: 'Already exist' });
      }
      const hash = createHash('sha1');
      hash.update(password);
      const user = await collection.insertOne({ email, password: hash.digest('hex') });

      response.status(201);
      return response.json({ email, id: user.insertedId });
    } catch (err) {
      console.log(err);
    }
    return null;
  }

  static async getMe(request, response) {
    const token = request.headers['x-token'];
    const id = await redisClient.get(`auth_${token}`);
    const objectId = new mongo.ObjectID(id);
    const user = await dbClient.db.collection('users').findOne({ _id: objectId });

    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    return response.json({ id, email: user.email });
  }
}

module.exports = UsersController;
