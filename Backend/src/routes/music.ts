import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import pool from '../config/db';
import auth, { AuthRequest } from '../middleware/auth';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, `music-${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

router.get('/tracks', auth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM music_tracks WHERE user_id=$1 ORDER BY created_at DESC',
      [req.user?.id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tracks', auth, upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]), async (req: AuthRequest, res: Response) => {
  const { title, artist, album, duration } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const file_url = files?.audio ? `/uploads/${files.audio[0].filename}` : null;
  const cover_url = files?.cover ? `/uploads/${files.cover[0].filename}` : null;

  if (!file_url) {
    res.status(400).json({ error: 'Audio file required' });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO music_tracks (user_id, title, artist, album, duration, file_url, cover_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user?.id, title || 'Unknown', artist || 'Unknown', album, duration, file_url, cover_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/tracks/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query('DELETE FROM music_tracks WHERE id=$1 AND user_id=$2', [req.params.id, req.user?.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/playlists', auth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT p.*, COUNT(pt.track_id) as track_count 
       FROM playlists p 
       LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id 
       WHERE p.user_id=$1 GROUP BY p.id ORDER BY p.created_at DESC`,
      [req.user?.id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/playlists', auth, async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO playlists (user_id, name) VALUES ($1,$2) RETURNING *',
      [req.user?.id, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/playlists/:id/tracks', auth, async (req: AuthRequest, res: Response) => {
  const { track_id, position } = req.body;
  try {
    await pool.query(
      'INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [req.params.id, track_id, position || 0]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/playlists/:id/tracks', auth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT mt.* FROM music_tracks mt 
       JOIN playlist_tracks pt ON mt.id = pt.track_id 
       WHERE pt.playlist_id=$1 ORDER BY pt.position ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
