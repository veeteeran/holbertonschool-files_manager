import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import mime from 'mime-types';
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
      isPublic = false,
    } = request.body;
    let { parentId = 0 } = request.body;

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

    if (userId !== file.userId.toString()) return response.status(404).json({ error: 'Not found' });

    const doc = {
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    };
    return response.json(doc);
  }

  static async getIndex(request, response) {
    const token = request.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) return response.status(401).json({ error: 'Unauthorized' });

    const { parentId, page = 0 } = request.query;

    let pages;

    if (parentId) {
      const objectId = new mongo.ObjectID(parentId);
      pages = await dbClient.db.collection('files').aggregate([
        { $match: { parentId: objectId } },
        { $skip: page * 20 },
        { $limit: 20 },
      ]).toArray();
    } else {
      const objectId = new mongo.ObjectID(userId);
      pages = await dbClient.db.collection('files').aggregate([
        { $match: { userId: objectId } },
        { $skip: page * 20 },
        { $limit: 20 },
      ]).toArray();
    }

    const arr = pages.map((page) => ({
      id: page._id,
      userId: page.userId,
      name: page.name,
      type: page.type,
      isPublic: page.isPublic,
      parentId: page.parentId,
    }));

    return response.json(arr);
  }

  static async putPublish(request, response) {
    const token = request.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) return response.status(401).json({ error: 'Unauthorized' });

    const { id } = request.params;
    const objectId = new mongo.ObjectID(id);
    const file = await dbClient.db.collection('files').findOne({
      _id: objectId,
    });

    if (!file) return response.status(404).json({ error: 'Not found' });
    if (userId !== file.userId.toString()) return response.status(404).json({ error: 'Not found' });

    file.isPublic = true;

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

  static async putUnpublish(request, response) {
    const token = request.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) return response.status(401).json({ error: 'Unauthorized' });

    const { id } = request.params;
    const objectId = new mongo.ObjectID(id);
    const file = await dbClient.db.collection('files').findOne({
      _id: objectId,
    });

    if (!file) return response.status(404).json({ error: 'Not found' });
    if (userId !== file.userId.toString()) return response.status(404).json({ error: 'Not found' });

    file.isPublic = false;

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

  static async getFile(request, response) {
    const token = request.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    const { id } = request.params;
    const objectId = new mongo.ObjectID(id);
    const file = await dbClient.db.collection('files').findOne({
      _id: objectId,
    });

    if (!file) return response.status(404).json({ error: 'Not found' });
    if (!file.isPublic && (!userId || userId !== file.userId.toString())) return response.status(404).json({ error: 'Not found' });
    if (file.type === 'folder') return response.status(400).json({ error: "A folder doesn't have content" });
    if (!fs.existsSync(file.localPath)) return response.status(404).json({ error: 'Not found' });

    const mimeType = mime.lookup(file.name);

    response.setHeader('content-type', mimeType);
    const data = fs.readFileSync(file.localPath, 'utf-8');

    return response.send(data);
  }
}

module.exports = FilesController;
