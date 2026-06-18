import express, { Request, Response } from 'express';
import pool from '../config/db';
import auth, { AuthRequest } from '../middleware/auth';

const router = express.Router();

const AD_PRICE_GHS = 50;
const AD_DURATION_DAYS = 30;

const NEARBY_QUERY = `
  SELECT id, business_name, description, latitude, longitude, radius_km, image_url, website_url,
    (6371 * acos(
      cos(radians($1)) * cos(radians(latitude)) *
      cos(radians(longitude) - radians($2)) +
      sin(radians($1)) * sin(radians(latitude))
    )) AS distance_km
  FROM ads
  WHERE payment_status='paid' AND active=true AND (expires_at IS NULL OR expires_at > NOW())
  HAVING (6371 * acos(
      cos(radians($1)) * cos(radians(latitude)) *
      cos(radians(longitude) - radians($2)) +
      sin(radians($1)) * sin(radians(latitude))
  )) <= radius_km
  ORDER BY distance_km ASC
`;

router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, business_name, description, latitude, longitude, radius_km, image_url, website_url
       FROM ads WHERE payment_status='paid' AND active=true AND (expires_at IS NULL OR expires_at > NOW())`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/nearby', auth, async (req: Request, res: Response) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    res.status(400).json({ error: 'lat and lng required' });
    return;
  }

  try {
    const result = await pool.query(NEARBY_QUERY, [parseFloat(lat as string), parseFloat(lng as string)]);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/mine', auth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM ads WHERE user_id=$1 ORDER BY created_at DESC',
      [req.user?.id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req: AuthRequest, res: Response) => {
  const { business_name, description, latitude, longitude, radius_km, website_url } = req.body;
  if (!business_name?.trim()) {
    res.status(400).json({ error: 'Business name is required' });
    return;
  }
  if (!latitude || !longitude) {
    res.status(400).json({ error: 'Location is required' });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO ads (user_id, business_name, description, latitude, longitude, radius_km, website_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user?.id, business_name, description, latitude, longitude, radius_km || 2, website_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/checkout', auth, async (req: AuthRequest, res: Response) => {
  try {
    const adResult = await pool.query(
      'SELECT * FROM ads WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user?.id]
    );
    if (!adResult.rows.length) {
      res.status(404).json({ error: 'Ad not found' });
      return;
    }

    const intentId = `pi_ghs50_${Date.now()}`;
    await pool.query(
      'UPDATE ads SET stripe_payment_intent_id=$1 WHERE id=$2',
      [intentId, req.params.id]
    );

    res.json({
      ad_id: req.params.id,
      amount_ghs: AD_PRICE_GHS,
      amount_display: `GHS ${AD_PRICE_GHS}.00`,
      duration_days: AD_DURATION_DAYS,
      payment_intent_id: intentId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/activate', auth, async (req: AuthRequest, res: Response) => {
  try {
    const expires = new Date();
    expires.setDate(expires.getDate() + AD_DURATION_DAYS);

    const result = await pool.query(
      `UPDATE ads SET payment_status='paid', active=true, expires_at=$1 WHERE id=$2 AND user_id=$3 RETURNING *`,
      [expires, req.params.id, req.user?.id]
    );
    if (!result.rows.length) {
      res.status(404).json({ error: 'Ad not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query('DELETE FROM ads WHERE id=$1 AND user_id=$2', [req.params.id, req.user?.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
