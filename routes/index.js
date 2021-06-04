import express from 'express'
import { getStats, getStatus } from '../controllers/AppController'

const router = express.Router()

router.get('/stats', getStats)
router.get('/status', getStatus)

module.exports = router
