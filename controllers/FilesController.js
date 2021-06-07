import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const mongo = require('mongodb');

class FilesController {
  static async postUpload(request, response) {
    const {
      name,
      type,
      data,
    } = request.body;
    let { parentId, isPublic = false } = request.body;

    if (!name) return response.status(400).json({ error: 'Missing name' });

    if (!type) return response.status(400).json({ error: 'Missing type' });

    if (!data && type !== 'folder') return response.status(400).json({ error: 'Missing data' });

    if (parentId) {
      const objectId = new mongo.ObjectID(parentId);
      const file = await dbClient.db.collection('files').findOne({ _id: objectId });

      if (!file) return response.status(400).json({ error: 'Parent not found' });

      if (file && file.type !== 'folder') return response.status(400).json({ error: 'Parent is not a folder' });
    } else {
      parentId = 0;
    }

    let newFile;
    const token = request.headers['x-token'];
    const id = await redisClient.get(`auth_${token}`);
    if (!id) return response.status(401).json({ error: 'Unauthorized' });
    if (parentId !== 0) parentId = new mongo.ObjectID(parentId);
    if (type === 'folder') {
      newFile = await dbClient.db.collection('files').insertOne({
        userId: new mongo.ObjectID(id),
        name,
        type,
        isPublic,
        parentId,
      });
    } else {
      const path = process.env.FOLDER_PATH || '/tmp/files_manager';
      if (!fs.existsSync(path)) fs.mkdirSync(path);

      const uuid = uuidv4();
      const localPath = `${path}/${uuid}`;
      const inputData = Buffer.from(data, 'base64').toString();

      await fs.promises.writeFile(localPath, inputData);

      newFile = await dbClient.db.collection('files').insertOne({
        userId: new mongo.ObjectID(id),
        name,
        type,
        isPublic,
        parentId,
        localPath,
      });
    }
    return response.status(201).json({
      id: newFile.insertedId, userId: id, name, type, isPublic, parentId,
    });
  }
}

module.exports = FilesController;
