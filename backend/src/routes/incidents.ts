import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import pool from '../config/db';
import auth, { AuthRequest } from '../middleware/auth';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.get('/', async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius = 50 } = req.query;
    let query = `SELECT i.*, u.name as reporter_name FROM incidents i 
                 LEFT JOIN users u ON i.user_id = u.id WHERE i.status != 'resolved'`;
    const result = await pool.query(query + ' ORDER BY i.created_at DESC LIMIT 100');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, upload.single('media'), async (req: AuthRequest, res: Response) => {
  const { type, title, description, latitude, longitude, severity } = req.body;
  const media_url = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const result = await pool.query(
      `INSERT INTO incidents (user_id, type, title, description, latitude, longitude, severity, media_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user?.id, type, title, description, latitude, longitude, severity || 'medium', media_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', auth, async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE incidents SET status=$1, updated_at=NOW() WHERE id=$2 AND user_id=$3 RETURNING *',
      [status, req.params.id, req.user?.id]
    );
    if (!result.rows.length) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const incidentResult = await pool.query('SELECT * FROM incidents WHERE id=$1', [req.params.id]);
    if (!incidentResult.rows.length) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }
    const incident = incidentResult.rows[0];

    // Check ownership
    if (incident.user_id !== req.user?.id) {
      res.status(403).json({ error: 'You are not authorized to delete this incident' });
      return;
    }

    // Time lock durations (in minutes) based on severity
    let requiredMinutes = 2; // low
    if (incident.severity === 'medium') requiredMinutes = 5;
    else if (incident.severity === 'high') requiredMinutes = 10;
    else if (incident.severity === 'critical') requiredMinutes = 15;

    const createdTime = new Date(incident.created_at).getTime();
    const elapsedMinutes = (Date.now() - createdTime) / 60000;

    if (elapsedMinutes < requiredMinutes) {
      const remainingSeconds = Math.ceil((requiredMinutes * 60) - ((Date.now() - createdTime) / 1000));
      const remainingMin = Math.floor(remainingSeconds / 60);
      const remainingSec = remainingSeconds % 60;
      
      const timeString = remainingMin > 0 
        ? `${remainingMin}m ${remainingSec}s` 
        : `${remainingSec}s`;

      res.status(400).json({
        error: `This incident cannot be deleted yet. For safety, ${incident.severity} intensity incidents must remain active for at least ${requiredMinutes} minutes. Please wait another ${timeString}.`
      });
      return;
    }

    await pool.query('DELETE FROM incidents WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
