import express from 'express'
import { getStats, getStatus } from '../controllers/AppController'
import { postNew } from '../controllers/UsersController'

const router = express.Router()

router.get('/stats', getStats)
router.get('/status', getStatus)
router.use(express.json())
router.post('/users', postNew)

module.exports = router
