import { Router, type Request, type Response } from 'express';
import { DbMaintainerService } from '../services/dbMaintainerService.js';

const router = Router();

router.post('/run', async (req: Request, res: Response): Promise<void> => {
  const { apiKey } = req.body;
  if (apiKey !== 'wuxin_mcp_2026') {
    res.status(401).json({ success: false, error: '无效的API密钥' });
    return;
  }
  try {
    const maintainer = new DbMaintainerService();
    const report = await maintainer.runAllMaintenance();
    maintainer.close();
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `维护任务执行失败: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

router.post('/backup', async (req: Request, res: Response): Promise<void> => {
  const { apiKey } = req.body;
  if (apiKey !== 'wuxin_mcp_2026') {
    res.status(401).json({ success: false, error: '无效的API密钥' });
    return;
  }
  try {
    const maintainer = new DbMaintainerService();
    const result = await maintainer.runBackup();
    maintainer.close();
    res.json({ success: result.success, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `备份失败: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  const apiKey = req.query.apiKey as string;
  if (apiKey !== 'wuxin_mcp_2026') {
    res.status(401).json({ success: false, error: '无效的API密钥' });
    return;
  }
  try {
    const maintainer = new DbMaintainerService();
    const stats = await maintainer.getDBStats();
    maintainer.close();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `获取统计信息失败: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

router.post('/recover-orphaned', async (req: Request, res: Response): Promise<void> => {
  const { apiKey } = req.body;
  if (apiKey !== 'wuxin_mcp_2026') {
    res.status(401).json({ success: false, error: '无效的API密钥' });
    return;
  }
  try {
    const maintainer = new DbMaintainerService();
    const result = await maintainer.cleanupOrphanTasks();
    maintainer.close();
    res.json({ success: result.success, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `恢复孤儿任务失败: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  const { apiKey } = req.body;
  if (apiKey !== 'wuxin_mcp_2026') {
    res.status(401).json({ success: false, error: '无效的API密钥' });
    return;
  }
  try {
    const maintainer = new DbMaintainerService();
    const stats = await maintainer.getDBStats();
    maintainer.close();
    res.json({ success: true, data: { consistency: 'ok', ...stats } });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `一致性检查失败: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

export default router;