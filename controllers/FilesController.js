/* eslint-disable */
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const mongo = require('mongodb');

class FilesController {
  static async postUpload(request, response) {
    const token = request.headers['x-token'];
    const id = await redisClient.get(`auth_${token}`);

    if (!id) return response.status(401).json({ error: 'Unauthorized' });

    const {
      name,
      type,
      data,
    } = request.body;
    let { parentId = 0, isPublic = false } = request.body;

    if (!name) return response.status(400).json({ error: 'Missing name' });

    if (!type) return response.status(400).json({ error: 'Missing type' });

    if (!data && type !== 'folder') return response.status(400).json({ error: 'Missing data' });

    if (parentId !== 0) {
      parentId = new mongo.ObjectID(parentId);
      const file = await dbClient.db.collection('files').findOne({ _id: parentId });

      if (!file) return response.status(400).json({ error: 'Parent not found' });

      if (file && file.type !== 'folder') return response.status(400).json({ error: 'Parent is not a folder' });
    }

    let newFile;
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

  static async getShow(request, response) {
    const token = request.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) return response.status(401).json({ error: 'Unauthorized' });

    const { id } = request.params;
    const objectId = new mongo.ObjectID(id);
    const file = await dbClient.db.collection('files').findOne({
      _id: objectId,
    });

    if (!file) return response.status(404).json({ error: 'Not found' });

    if (file.type === 'folder' && (userId !== file.userId)) return response.status(404).json({ error: 'Not found' });

    const doc = {
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    };
    return response.status(200).json(doc);
  }

  static async getIndex(request, response) {
    const token = request.header['x-token'];
    const user = await redisClient.get(`auth_${token}`);

    if (!user) return response.status(401).json({ error: 'Unauthorized' });

    const { parentId = 0, page = 0 } = request.query;
    const objectId = new mongo.ObjectID(parentId);

    const files = await dbClient.db.collection('files').find({
      parentId: objectId,
    }) || [];
    const pages = await dbClient.db.collection('files').aggregate([
      { $match: { parentId: objectId } },
      { $skip: page * 20 },
      { $limit: 20 }
    ]);
    if (parentId) return files;
    if (page) return pages;
  }
}

module.exports = FilesController;
