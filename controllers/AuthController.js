import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const { createHash } = require('crypto');

class AuthController {
  static async getConnect(req, res) {
    if (!req.headers.authorization || req.headers.authorization.indexOf('Basic ') === -1) {
      return res.status(401).json({ message: 'Missing Auth Header' });
    }
    const credentials = Buffer.from(req.headers.authorization.split(' ')[1], 'base64').toString('ascii');
    const [email, password] = credentials.split(':');
    const hash = createHash('sha1').update(password).digest('hex');
    const user = await dbClient.db.collection('users').findOne({ email, password: hash });

    if (!user) {
      res.status(401);
      res.json({ error: 'Unauthorized' });
    } else {
      const token = uuidv4();
      const key = `auth_${token}`;
      await redisClient.set(key, user._id.toString(), 86400);
      res.status(200);
      return res.json({ token });
    }
    return null;
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    const user = redisClient.get(`auth_${token}`);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await redisClient.del(`auth_${token}`);
    res.status(204);
    return res.end();
  }
}
module.exports = AuthController;
