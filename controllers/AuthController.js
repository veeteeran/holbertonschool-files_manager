import dbClient from '../utils/db'
import redisClient from '../utils/redis'
import { v4 as uuidv4 } from 'uuid'

const { createHash } = require('crypto')

class AuthController {
    static getConnect(req, res) {
        if (!req.headers.authorization || req.headers.authorization.indexOf('Basic ') === -1) {
            return res.status(401).json({ message: 'Missing Auth Header' });
        }
        const credentials = Buffer.from(req.headers.authorization.split(" ")[1], 'base64').toString('ascii')
        const [email, password] = credentials.split(':')
        const hash = createHash('sha1').update(password)
        const user = dbClient.db.collection('users').findOne({email: email, password: hash})
        if (!user) {
            res.status(401)
            res.json({error: "Unauthorized"})
        } else {
            const token = uuidv4()
            const key = `auth_${token}`
            redisClient.set(key, token, 86400)
            res.status(200)
            res.json({ token: token })
        }
    }
}
module.exports = AuthController
