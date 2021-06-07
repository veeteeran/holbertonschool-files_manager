import dbClient from '../utils/db'
import redisClient from '../utils/redis'
import { v4 as uuidv4 } from 'uuid'
import { existsSync, mkdirSync } from 'fs'
import { writeFile } from 'fs/promises';

class FilesController {
  static async postUpload(request, response) {
    const {
      name,
      type,
      parentId,
      isPublic,
      data } = request.body

    if (!name) return response.status(400).json({ error: 'Missing name' })

    if (!type) return response.status(400).json({ error: 'Missing type' })

    if (!data && type !== 'folder') return response.status(400).json({ error: 'Missing data' })

    if (parentId) {
      const o_id = new mongo.ObjectID(parentId)
      const file = await dbClient.collection('files').findOne({ "_id": o_id })

      if (!file) return response.status(400).json({ error: 'Parent not found' })

      if (file && file.type !== 'folder') return response.status(400).json({ error: 'Parent is not a folder' })
    } else {
      parentId = 0
    }

    let newFile
    if (type === 'folder') {
      const token = request.headers['x-token']
      const id = await redisClient.get(`auth_${token}`)
      newFile = await dbClient.collection('files').insertOne({
        userId: id,
        name,
        type,
        isPublic,
        parentId
      })
    } else {
      const path = process.env.FOLDER_PATH || '/tmp/files_manager'
      if (!existsSync(path)) mkdirSync(path)

      const uuid = uuidv4()
      const localPath = `${path}/${uuid}`
      const inputData = Buffer.from(data, 'base64').toString()

      await writeFile(localPath, inputData)

      const token = request.headers['x-token']
      const id = await redisClient.get(`auth_${token}`)
      newFile = await dbClient.collection('files').insertOne({
        userId: id,
        name,
        type,
        isPublic,
        parentId,
        localPath
      })
    }
    return response.status(201).json(newFile)
  }
}