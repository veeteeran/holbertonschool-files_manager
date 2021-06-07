import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AppController {
  static getStatus(request, response) {
    if (dbClient.isAlive() && redisClient.isAlive()) {
      response.status(200);
      response.json({ redis: redisClient.isAlive(), db: dbClient.isAlive() });
    } else {
      response.status(500);
      response.send('One of the servers is not connected');
    }
  }

  static async getStats(request, response) {
    const users = await dbClient.nbUsers();
    const files = await dbClient.nbFiles();

    response.status(200);
    response.json({ users, files });
  }
}

module.exports = AppController;
