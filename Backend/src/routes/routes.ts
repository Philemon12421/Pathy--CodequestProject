import express, { Request, Response } from 'express';
import pool from '../config/db';
import auth, { AuthRequest } from '../middleware/auth';

const router = express.Router();

router.get('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM saved_routes WHERE user_id=$1 ORDER BY is_favorite DESC, created_at DESC',
      [req.user?.id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req: AuthRequest, res: Response) => {
  const { name, origin_name, destination_name, origin_lat, origin_lng, destination_lat, destination_lng, route_data } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO saved_routes (user_id, name, origin_name, destination_name, origin_lat, origin_lng, destination_lat, destination_lng, route_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user?.id, name, origin_name, destination_name, origin_lat, origin_lng, destination_lat, destination_lng, JSON.stringify(route_data)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/favorite', auth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'UPDATE saved_routes SET is_favorite = NOT is_favorite WHERE id=$1 AND user_id=$2 RETURNING *',
      [req.params.id, req.user?.id]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query('DELETE FROM saved_routes WHERE id=$1 AND user_id=$2', [req.params.id, req.user?.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
