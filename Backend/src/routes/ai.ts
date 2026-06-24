import { Router, Response } from 'express';
import Groq from 'groq-sdk';
import pool from '../config/db';
import authMiddleware, { AuthRequest } from '../middleware/auth';

const router = Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are RouteFlow AI — a smart, friendly assistant built into the RouteFlow app. You can help users with:
1. Navigation: when user wants to go somewhere: <action>{"type":"navigate","destination":"Place Name"}</action>
2. Incidents: <action>{"type":"report_incident","incident_type":"accident|hazard|crime|weather|other","title":"Short title","severity":"low|medium|high|critical"}</action>
3. Music: <action>{"type":"music","action":"play"}</action>
4. Ads: <action>{"type":"place_ad","business_name":"name"}</action>
Keep responses under 150 words.`;

interface ChatMessage {
  role: string;
  content: string;
}

router.post('/chat', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { message, history = [] }: { message: string; history: ChatMessage[] } = req.body;
  try {
    await pool.query(
      'INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)',
      [req.user!.id, 'user', message]
    );

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...history.slice(-10).map((m: ChatMessage) => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 512,
    });

    const assistantContent = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    await pool.query(
      'INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)',
      [req.user!.id, 'assistant', assistantContent]
    );

    const actionMatch = assistantContent.match(/<action>(.*?)<\/action>/s);
    let action = null;
    const displayText = assistantContent.replace(/<action>.*?<\/action>/s, '').trim();
    if (actionMatch) {
      try {
        action = JSON.parse(actionMatch[1]);
      } catch (_e) { }
    }

    res.json({ text: displayText, action });
  } catch (err) {
    console.error('AI error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/history', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT role, content, created_at FROM chat_messages WHERE user_id=$1 ORDER BY created_at ASC LIMIT 50',
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete('/history', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await pool.query('DELETE FROM chat_messages WHERE user_id=$1', [req.user!.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;