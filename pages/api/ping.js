export default function handler(req, res) {
  res.status(200).json({ ok: true, app: 'guinda-time-tracking', framework: 'next', timestamp: Date.now() });
}


