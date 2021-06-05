import express from 'express'
import { getStats, getStatus } from '../controllers/AppController'
import { postNew } from '../controllers/UsersController'
import { getConnect } from '../controllers/AuthController'

const router = express.Router()

router.get('/stats', getStats)
router.get('/status', getStatus)
router.get('/connect', getConnect)
// router.get('/disconnect', getDisconnect)
// router.get('/users/me', getMe)
router.use(express.json())
router.post('/users', postNew)

module.exports = router
