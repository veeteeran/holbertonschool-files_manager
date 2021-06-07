/* eslint-disable */
import express from 'express';
import { getStats, getStatus } from '../controllers/AppController';
import { postNew, getMe } from '../controllers/UsersController';
import { getConnect, getDisconnect } from '../controllers/AuthController';
import { postUpload } from '../controllers/FilesController';

const router = express.Router();

router.get('/stats', getStats);
router.get('/status', getStatus);
router.get('/connect', getConnect);
router.get('/disconnect', getDisconnect);
router.get('/users/me', getMe);
router.use(express.json());
router.post('/users', postNew);
router.post('/files', postUpload);

module.exports = router;
