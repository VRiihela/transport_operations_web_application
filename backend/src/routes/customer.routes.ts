import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/authenticate';
import { adminOrDispatcher } from '../middleware/requireRole';
import { AuthenticatedRequest } from '../types/auth.types';
import { CustomerService } from '../services/customer.service';
import { createCustomerSchema, customerSearchQuerySchema } from '../types/customer.types';

const router = Router();
const customerService = new CustomerService(new PrismaClient());

function isPrismaUniqueViolation(err: unknown): boolean {
  return err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2002';
}

router.use(authenticateToken, adminOrDispatcher);

router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = customerSearchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query parameters' });
    return;
  }
  try {
    const customers = await customerService.searchByPhone(parsed.data);
    res.json({ data: customers });
  } catch (err) {
    console.error('Customer search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = createCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request data' });
    return;
  }
  try {
    const customer = await customerService.create(parsed.data);
    res.status(201).json({ data: customer });
  } catch (err) {
    if (isPrismaUniqueViolation(err)) {
      res.status(409).json({ error: 'A customer with this phone number already exists' });
      return;
    }
    console.error('Customer create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const customer = await customerService.getById(req.params['id'] as string);
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    res.json({ data: customer });
  } catch (err) {
    console.error('Customer fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as customerRoutes };
